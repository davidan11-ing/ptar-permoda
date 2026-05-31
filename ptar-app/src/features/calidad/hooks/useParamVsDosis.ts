/**
 * useParamVsDosis
 * Carga datos para "PARÁMETRO VS DOSIS DE QUÍMICO":
 *   - Concentración del parámetro en Tanque Homogeneizador (Entrada GEM)
 *   - Concentración del parámetro en GEM Salida
 *   - Dosis PPM del químico asociado (de operacion_gem_turno)
 *
 * TODO: completar lógica de PPM cuando llegue la carpeta de especificaciones.
 */
import { useState, useEffect } from 'react';
import { getCalidadMediciones, getGemEficiencia } from '../../../services/ptarClient';

export interface ParamVsDosisPoint {
  label:    string;   // "DD - TX"
  fecha:    string;
  turno:    string;   // "T1" | "T2" | "T3"
  entrada:  number | null;   // Tanque Homogeneizador
  salida:   number | null;   // GEM Salida
  ppm:      number | null;   // PPM del químico (eje derecho)
}

const TURNO_KEY: Record<string, string> = {
  mañana: 'T1', manana: 'T1',
  tarde:  'T2',
  noche:  'T3',
};

/**
 * ppmKey: columna PPM a leer de GemEficienciaRow.
 * Ej: 'ppm_coagulante' | 'ppm_pol_cationico' | 'ppm_acido' | etc.
 * Se determinará según especificación de la carpeta.
 */
export function useParamVsDosis(
  fechaInicio: string,
  fechaFin:    string,
  parametro:   string,
  ppmKey:      keyof import('../../../services/ptarClient').GemEficienciaRow = 'ppm_pol_cationico',
) {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [data,    setData]    = useState<ParamVsDosisPoint[]>([]);

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

        // Agrupar mediciones por (fecha|turno) → { entrada, salida }
        type Key = string;
        const medMap = new Map<Key, { entrada?: number; salida?: number }>();
        for (const row of medRows) {
          const t   = TURNO_KEY[row.turno.toLowerCase()] ?? 'T1';
          const key = `${row.fecha}|${t}`;
          if (!medMap.has(key)) medMap.set(key, {});
          const e = medMap.get(key)!;
          if (row.unidad_tratamiento === 'Tanque Homogeneizador') e.entrada = row.valor;
          if (row.unidad_tratamiento === 'GEM Salida')            e.salida  = row.valor;
        }

        // Agrupar PPM por (fecha|turno)
        const ppmMap = new Map<Key, number>();
        for (const row of gemRows) {
          const t   = TURNO_KEY[row.turno?.toLowerCase() ?? ''] ?? 'T1';
          const key = `${row.fecha}|${t}`;
          const val = (row as any)[ppmKey];
          if (val != null) ppmMap.set(key, val);
        }

        // Union ordenada
        const allKeys = new Set([...medMap.keys(), ...ppmMap.keys()]);
        const sorted  = Array.from(allKeys).sort();

        const result: ParamVsDosisPoint[] = sorted.map(key => {
          const [fecha, turnoStr] = key.split('|');
          const day  = fecha.slice(8, 10);
          const med  = medMap.get(key);
          return {
            label:   `${day} - ${turnoStr}`,
            fecha,
            turno:   turnoStr,
            entrada: med?.entrada ?? null,
            salida:  med?.salida  ?? null,
            ppm:     ppmMap.get(key) ?? null,
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
  }, [fechaInicio, fechaFin, parametro, ppmKey]);

  return { data, loading, error };
}
