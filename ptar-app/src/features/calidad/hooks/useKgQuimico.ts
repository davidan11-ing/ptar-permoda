// Hook para calcular ratios kg_químico / kg_SST_removido por día (barras apiladas + línea kg removidos)
/**
 * useKgQuimico
 * Calcula ratios: kg_quimico / kg_contaminante_removido por DÍA
 *
 * Ratios (barras apiladas, eje izquierdo):
 *   coagulante_ratio  = kg_coagulante_dia  / kg_removidos_dia
 *   decolorante_ratio = kg_decolorante_dia / kg_removidos_dia
 *   pol_anionico_ratio= kg_pol_anionico_dia/ kg_removidos_dia
 *   cationico_ratio   = kg_pol_cationico_dia/kg_removidos_dia
 *
 * Línea (eje derecho):
 *   kg_removidos_dia — misma fuente que CargaRemovoidaSection
 *
 * Fuentes:
 *   - kg químicos  → getGemEficiencia() (operacion_gem_turno)
 *   - kg_removidos → getCalidadMediciones() + getGemEficiencia() (concentración × caudal)
 *
 * Parámetro de remoción: Tanque Homogeneizador → GEM Salida (igual que useCargaRemovida)
 */
import { useState, useEffect } from 'react';
import { getCalidadMediciones, getGemEficiencia } from '../../../services/ptarClient';

// Forma de cada punto diario: ratios de los 4 químicos + kg removidos para la línea
export interface KgQuimicoPoint {
  label:            string;   // "01/04"
  fecha:            string;
  coagulanteRatio:  number;
  decoloranteRatio: number;
  polAnionicoRatio: number;
  cationicoRatio:   number;
  kgRemovidos:      number;   // para la línea
  sinDatos:         boolean;
}

// Genera arreglo de fechas "YYYY-MM-DD" entre inicio y fin (inclusive)
function generarFechas(inicio: string, fin: string): string[] {
  const fechas: string[] = [];
  const cur = new Date(inicio + 'T00:00:00');
  const end = new Date(fin   + 'T00:00:00');
  while (cur <= end) { fechas.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
  return fechas;
}

// Nomenclatura correcta: T1=Noche, T2=Mañana, T3=Tarde
const TURNO_KEY: Record<string, string> = {
  noche:  'T1',
  mañana: 'T2', manana: 'T2',
  tarde:  'T3',
};

// Parámetro de contaminante removido (Sólidos Suspendidos Totales — igual que Excel)
const PARAM_REMOVIDO = 'SST';

// Fechas excluidas de la gráfica (días con operación atípica o carga química excepcional)
const EXCLUDE_DATES = new Set(['2026-05-19', '2026-05-20']);

// Hook principal — devuelve serie real y serie completa con días vacíos
export function useKgQuimico(fechaInicio: string, fechaFin: string) {
  // Estados de carga, error, serie real y serie completa
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [data,    setData]    = useState<KgQuimicoPoint[]>([]);
  const [allData, setAllData] = useState<KgQuimicoPoint[]>([]);

  // Dispara la carga al cambiar el rango de fechas
  useEffect(() => {
    if (!fechaInicio || !fechaFin) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        // Consultas paralelas: concentraciones SST + datos de operación GEM
        const [medRows, gemRows] = await Promise.all([
          getCalidadMediciones({
            parametro:    PARAM_REMOVIDO,
            fecha_inicio: fechaInicio,
            fecha_fin:    fechaFin,
            limit:        5000,
          }),
          getGemEficiencia({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
        ]);
        if (cancelled) return;

        // Concentraciones por turno para calcular kg_removidos
        // Normalizar fecha a YYYY-MM-DD (la API puede devolver T00:00:00 si el campo es datetime)
        type FT = string;
        const conMap = new Map<FT, { homo?: number; gem?: number }>();
        for (const row of medRows) {
          const t   = TURNO_KEY[row.turno.toLowerCase()] ?? 'T1';
          const key = `${(row.fecha as string).slice(0, 10)}|${t}`;
          if (!conMap.has(key)) conMap.set(key, {});
          const e = conMap.get(key)!;
          if (row.unidad_tratamiento === 'Tanque Homogeneizador') e.homo = row.valor;
          if (row.unidad_tratamiento === 'GEM Salida')            e.gem  = row.valor;
        }

        // Datos GEM por turno → kg químicos + caudal
        type DayGem = {
          caudal:     number;
          coagulante: number;
          decolorante:number;
          polAnionico:number;
          cationico:  number;
        };
        const gemTurnoMap = new Map<FT, DayGem>();
        for (const row of gemRows) {
          const t   = TURNO_KEY[row.turno?.toLowerCase() ?? ''] ?? 'T1';
          const key = `${row.fecha}|${t}`;
          gemTurnoMap.set(key, {
            caudal:      row.caudal_m3      ?? 0,
            coagulante:  row.kg_coagulante  ?? 0,
            decolorante: row.kg_decolorante ?? 0,
            polAnionico: row.kg_pol_anionico?? 0,
            cationico:   row.kg_pol_cationico?? 0,
          });
        }

        // Agrupar kg removidos y kg de cada químico por fecha
        type DayAcc = {
          kgRem:       number;
          coagulante:  number;
          decolorante: number;
          polAnionico: number;
          cationico:   number;
        };
        const dayMap = new Map<string, DayAcc>();

        const allKeys = new Set([...conMap.keys(), ...gemTurnoMap.keys()]);
        for (const key of allKeys) {
          const [fecha] = key.split('|');
          const con = conMap.get(key);
          const gem = gemTurnoMap.get(key);
          const caudal = gem?.caudal ?? 0;

          let kgRem = 0;
          if (con?.homo != null && con?.gem != null && caudal > 0) {
            const delta = con.homo - con.gem;
            if (delta > 0) kgRem = delta * caudal / 1000;
          }

          if (!dayMap.has(fecha)) dayMap.set(fecha, { kgRem: 0, coagulante: 0, decolorante: 0, polAnionico: 0, cationico: 0 });
          const day = dayMap.get(fecha)!;
          day.kgRem       += kgRem;
          day.coagulante  += gem?.coagulante  ?? 0;
          day.decolorante += gem?.decolorante ?? 0;
          day.polAnionico += gem?.polAnionico ?? 0;
          day.cationico   += gem?.cationico   ?? 0;
        }

        // Calcular ratios por fecha
        // Solo incluir fechas con medición de concentración
        // (excluye días donde GEM dosificó pero no se midió SST)
        const conDates = new Set(Array.from(conMap.keys()).map(k => k.split('|')[0]));
        const sorted = Array.from(dayMap.keys()).sort()
          .filter(f => conDates.has(f) && !EXCLUDE_DATES.has(f));

        // Función auxiliar — convierte acumulado diario en punto con ratios
        const toPoint = (fecha: string, day: { kgRem:number; coagulante:number; decolorante:number; polAnionico:number; cationico:number }, sinDatos: boolean): KgQuimicoPoint => {
          const rem = day.kgRem;
          const [, m, d] = fecha.slice(0, 10).split('-');
          return {
            label:            `${d}/${m}`,
            fecha,
            coagulanteRatio:  rem > 0 ? Math.round((day.coagulante  / rem) * 10000) / 10000 : 0,
            decoloranteRatio: rem > 0 ? Math.round((day.decolorante / rem) * 10000) / 10000 : 0,
            polAnionicoRatio: rem > 0 ? Math.round((day.polAnionico / rem) * 10000) / 10000 : 0,
            cationicoRatio:   rem > 0 ? Math.round((day.cationico   / rem) * 10000) / 10000 : 0,
            kgRemovidos:      Math.round(rem * 100) / 100,
            sinDatos,
          };
        };

        // Acumulador vacío para días sin datos en allData
        const EMPTY = { kgRem:0, coagulante:0, decolorante:0, polAnionico:0, cationico:0 };
        const result = sorted.map(f => toPoint(f, dayMap.get(f)!, false));

        // allData: todas las fechas del rango (vacías con sinDatos=true), excluye fechas atípicas
        const realSet = new Set(sorted);
        const allResult = generarFechas(fechaInicio, fechaFin)
          .filter(f => !EXCLUDE_DATES.has(f))
          .map(f =>
          realSet.has(f) ? toPoint(f, dayMap.get(f)!, false) : toPoint(f, EMPTY, true)
        );

        setData(result);
        setAllData(allResult);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [fechaInicio, fechaFin]);

  return { data, allData, loading, error };
}
