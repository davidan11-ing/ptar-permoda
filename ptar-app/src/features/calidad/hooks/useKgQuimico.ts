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

export interface KgQuimicoPoint {
  label:            string;   // "01/04"
  fecha:            string;
  coagulanteRatio:  number;
  decoloranteRatio: number;
  polAnionicoRatio: number;
  cationicoRatio:   number;
  kgRemovidos:      number;   // para la línea
}

const TURNO_KEY: Record<string, string> = {
  mañana: 'T1', manana: 'T1',
  tarde:  'T2',
  noche:  'T3',
};

// Parámetro de contaminante removido (Sólidos Suspendidos Totales — igual que Excel)
const PARAM_REMOVIDO = 'SST';

export function useKgQuimico(fechaInicio: string, fechaFin: string) {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [data,    setData]    = useState<KgQuimicoPoint[]>([]);

  useEffect(() => {
    if (!fechaInicio || !fechaFin) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
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
        type FT = string;
        const conMap = new Map<FT, { homo?: number; gem?: number }>();
        for (const row of medRows) {
          const t   = TURNO_KEY[row.turno.toLowerCase()] ?? 'T1';
          const key = `${row.fecha}|${t}`;
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

        // Agrupar por fecha
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
        const sorted = Array.from(dayMap.keys()).sort();
        const result: KgQuimicoPoint[] = sorted.map(fecha => {
          const day = dayMap.get(fecha)!;
          const rem = day.kgRem;
          const [, m, d] = fecha.split('-');
          return {
            label:            `${d}/${m}`,
            fecha,
            coagulanteRatio:  rem > 0 ? Math.round((day.coagulante  / rem) * 10000) / 10000 : 0,
            decoloranteRatio: rem > 0 ? Math.round((day.decolorante / rem) * 10000) / 10000 : 0,
            polAnionicoRatio: rem > 0 ? Math.round((day.polAnionico / rem) * 10000) / 10000 : 0,
            cationicoRatio:   rem > 0 ? Math.round((day.cationico   / rem) * 10000) / 10000 : 0,
            kgRemovidos:      Math.round(rem * 100) / 100,
          };
        });

        setData(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [fechaInicio, fechaFin]);

  return { data, loading, error };
}
