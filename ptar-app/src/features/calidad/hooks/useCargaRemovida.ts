/**
 * useCargaRemovida
 * Calcula kg de contaminante removidos por DÍA en el GEM.
 *
 * Fórmula:
 *   kg_turno = (C_pulmon - C_gem) [mg/L] × caudal_m3 [m³] / 1000
 *   Agregado por fecha: Σ kg_turno
 *   indicador_kg_m3 = Σkg_dia / Σm3_dia
 */
import { useState, useEffect } from 'react';
import { getCalidadMediciones, getGemEficiencia } from '../../../services/ptarClient';

export interface CargaRemovPoint {
  label:         string;   // "01/04", "02/04"...
  fecha:         string;   // "YYYY-MM-DD"
  kgRemovidos:   number;
  indicadorKgM3: number;
}

const TURNO_KEY: Record<string, string> = {
  mañana: 'T1', manana: 'T1',
  tarde:  'T2',
  noche:  'T3',
};

export function useCargaRemovida(
  fechaInicio: string,
  fechaFin:    string,
  parametro:   string,
) {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [data,    setData]    = useState<CargaRemovPoint[]>([]);
  const [totalKg, setTotalKg] = useState(0);

  useEffect(() => {
    if (!fechaInicio || !fechaFin || !parametro) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
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
        type FT = string;
        const conMap = new Map<FT, { pulmon?: number; gem?: number }>();
        for (const row of medRows) {
          const t   = TURNO_KEY[row.turno.toLowerCase()] ?? 'T1';
          const key = `${row.fecha}|${t}`;
          if (!conMap.has(key)) conMap.set(key, {});
          const e = conMap.get(key)!;
          // Entrada GEM = Tanque Homogeneizador (spec: EG = Carga Entrada GEM)
          if (row.unidad_tratamiento === 'Tanque Homogeneizador') e.pulmon = row.valor;
          if (row.unidad_tratamiento === 'GEM Salida')            e.gem    = row.valor;
        }

        // 2. Caudal m³ por (fecha|turno)
        const caudalMap = new Map<FT, number>();
        for (const row of gemRows) {
          const t   = TURNO_KEY[row.turno?.toLowerCase() ?? ''] ?? 'T1';
          const key = `${row.fecha}|${t}`;
          if (row.caudal_m3 && row.caudal_m3 > 0) caudalMap.set(key, row.caudal_m3);
        }

        // 3. kg removidos por turno → agrupar por fecha
        const dayMap = new Map<string, { kgSum: number; m3Sum: number }>();

        const allKeys = new Set([...conMap.keys(), ...caudalMap.keys()]);
        for (const key of allKeys) {
          const [fecha] = key.split('|');
          const con    = conMap.get(key);
          const caudal = caudalMap.get(key) ?? 0;

          let kgTurno = 0;
          if (con?.pulmon != null && con?.gem != null && caudal > 0) {
            const delta = con.pulmon - con.gem;
            if (delta > 0) kgTurno = delta * caudal / 1000;
          }

          if (!dayMap.has(fecha)) dayMap.set(fecha, { kgSum: 0, m3Sum: 0 });
          const day = dayMap.get(fecha)!;
          day.kgSum += kgTurno;
          day.m3Sum += caudal;
        }

        // 4. Construir resultado ordenado por fecha
        const sorted = Array.from(dayMap.keys()).sort();
        let total = 0;

        const result: CargaRemovPoint[] = sorted.map(fecha => {
          const day   = dayMap.get(fecha)!;
          const kg    = Math.round(day.kgSum * 100) / 100;
          const ind   = day.m3Sum > 0 ? Math.round((day.kgSum / day.m3Sum) * 100) / 100 : 0;
          total += kg;

          // Label "DD/MM"
          const [, m, d] = fecha.split('-');
          return { label: `${d}/${m}`, fecha, kgRemovidos: kg, indicadorKgM3: ind };
        });

        setData(result);
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

  return { data, totalKg, loading, error };
}
