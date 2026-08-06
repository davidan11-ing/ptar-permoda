// Hook para calcular kg de contaminante removido por día en el GEM (fórmula concentración × caudal)
/**
 * useCargaRemovida
 * Calcula kg de contaminante removidos por DÍA en el GEM.
 *
 * Fórmula (según especificación):
 *   Carga entrada  = (C_Homo  [mg/L] / 1_000_000) * (caudal_m3 * 1000)
 *   Carga salida   = (C_GEM   [mg/L] / 1_000_000) * (caudal_m3 * 1000)
 *   Carga removida = carga_entrada - carga_salida
 *
 *   Simplificado: kg_turno = (C_Homo - C_GEM) * caudal_m3 / 1000
 *   Agregado por fecha: Σ kg_turno
 *   indicador_kg_m3 = Σkg_dia / Σm3_dia
 */
import { useState, useEffect } from 'react';
import { getCalidadMediciones, getGemEficiencia } from '../../../services/ptarClient';

// Forma de cada punto diario del gráfico de carga removida
export interface CargaRemovPoint {
  label:         string;   // "01/04", "02/04"...
  fecha:         string;   // "YYYY-MM-DD"
  kgRemovidos:   number;
  indicadorKgM3: number;
  sinDatos:      boolean;  // true cuando no hay registro para esa fecha
}

// Nomenclatura correcta: T1=Noche, T2=Mañana, T3=Tarde
const TURNO_KEY: Record<string, string> = {
  noche:  'T1',
  mañana: 'T2', manana: 'T2',
  tarde:  'T3',
};

// Hook principal — devuelve serie real, serie completa con vacíos y total acumulado
export function useCargaRemovida(
  fechaInicio: string,
  fechaFin:    string,
  parametro:   string,
) {
  // Estados de carga, error, serie real, serie completa y total kg
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [data,    setData]    = useState<CargaRemovPoint[]>([]);
  const [allData, setAllData] = useState<CargaRemovPoint[]>([]); // incluye días vacíos
  const [totalKg, setTotalKg] = useState(0);

  // Dispara la carga al cambiar fechas o parámetro
  useEffect(() => {
    if (!fechaInicio || !fechaFin || !parametro) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        // Consultas paralelas: concentraciones del parámetro + eficiencia GEM (caudal)
        const [medRows, gemRows] = await Promise.all([
          getCalidadMediciones({
            parametro,
            fecha_inicio: fechaInicio,
            fecha_fin:    fechaFin,
            limit:        5000,
          }),
          getGemEficiencia({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
        ]);
        if (cancelled) return;

        // 1. Concentraciones por (fecha|turno) → {pulmon?, gem?}
        //    Normalizar fecha a YYYY-MM-DD (la API puede devolver T00:00:00 si el campo es datetime)
        type FT = string;
        const conMap = new Map<FT, { pulmon?: number; gem?: number }>();
        for (const row of medRows) {
          const t   = TURNO_KEY[row.turno.toLowerCase()] ?? 'T1';
          const key = `${(row.fecha as string).slice(0, 10)}|${t}`;
          if (!conMap.has(key)) conMap.set(key, {});
          const e = conMap.get(key)!;
          if (row.unidad_tratamiento === 'Tanque Homogeneizador') e.pulmon = row.valor;
          if (row.unidad_tratamiento === 'GEM Salida')            e.gem    = row.valor;
        }

        // 2. Caudal m³ por (fecha|turno) — usa caudal_total_tratado_gem_m3
        const caudalMap = new Map<FT, number>();
        for (const row of gemRows) {
          const t   = TURNO_KEY[row.turno?.toLowerCase() ?? ''] ?? 'T1';
          const key = `${row.fecha}|${t}`;
          if (row.caudal_m3 && row.caudal_m3 > 0) caudalMap.set(key, row.caudal_m3);
        }

        // 3. kg removidos por turno → agrupar por fecha
        //    Fórmula: (C_Homo/1_000_000)*(caudal_m3*1000) - (C_GEM/1_000_000)*(caudal_m3*1000)
        //           = (C_Homo - C_GEM) * caudal_m3 / 1000
        const dayMap = new Map<string, { kgSum: number; m3Sum: number }>();

        const allKeys = new Set([...conMap.keys(), ...caudalMap.keys()]);
        for (const key of allKeys) {
          const [fecha] = key.split('|');
          const con    = conMap.get(key);
          const caudal = caudalMap.get(key) ?? 0;

          let kgTurno = 0;
          if (con?.pulmon != null && con?.gem != null && caudal > 0) {
            // Carga removida por turno en kg
            const cargaEntrada = (con.pulmon / 1_000_000) * (caudal * 1000);
            const cargaSalida  = (con.gem    / 1_000_000) * (caudal * 1000);
            kgTurno = Math.max(0, cargaEntrada - cargaSalida);
          }

          if (!dayMap.has(fecha)) dayMap.set(fecha, { kgSum: 0, m3Sum: 0 });
          const day = dayMap.get(fecha)!;
          day.kgSum += kgTurno;
          day.m3Sum += caudal;
        }

        // 4. Construir resultado solo con datos reales
        // Solo incluir fechas que tuvieron medición de concentración
        // (excluye días donde solo hay caudal GEM pero no se midió DQO/SST etc.)
        const conDates = new Set(Array.from(conMap.keys()).map(k => k.split('|')[0]));
        const sortedDates = Array.from(dayMap.keys()).sort().filter(f => conDates.has(f));
        let total = 0;

        // Serie real: solo fechas con medición confirmada
        const realResult: CargaRemovPoint[] = sortedDates.map(fecha => {
          const day = dayMap.get(fecha)!;
          const kg  = Math.round(day.kgSum * 100) / 100;
          const ind = day.m3Sum > 0 ? Math.round((day.kgSum / day.m3Sum) * 100) / 100 : 0;
          total += kg;
          const [, m, d] = fecha.slice(0, 10).split('-');
          return { label: `${d}/${m}`, fecha, kgRemovidos: kg, indicadorKgM3: ind, sinDatos: false };
        });

        // 5. Construir resultado con TODOS los días (para toggle "días sin datos")
        const fechasCompletas = generarFechas(fechaInicio, fechaFin);
        const realMap = new Map(realResult.map(r => [r.fecha, r]));
        const allResult: CargaRemovPoint[] = fechasCompletas.map(fecha => {
          if (realMap.has(fecha)) return realMap.get(fecha)!;
          const [, m, d] = fecha.slice(0, 10).split('-');
          return { label: `${d}/${m}`, fecha, kgRemovidos: 0, indicadorKgM3: 0, sinDatos: true };
        });

        setData(realResult);
        setAllData(allResult);
        setTotalKg(Math.round(total * 100) / 100);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [fechaInicio, fechaFin, parametro]);

  return { data, allData, totalKg, loading, error };
}

// Genera un arreglo de fechas "YYYY-MM-DD" entre inicio y fin (inclusive)
function generarFechas(inicio: string, fin: string): string[] {
  const fechas: string[] = [];
  const cur = new Date(inicio + 'T00:00:00');
  const end = new Date(fin   + 'T00:00:00');
  while (cur <= end) {
    fechas.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return fechas;
}
