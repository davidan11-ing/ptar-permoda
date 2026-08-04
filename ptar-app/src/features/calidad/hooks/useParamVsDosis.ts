// Hook para cruzar concentración de parámetro (entrada/salida GEM) con dosis de químicos por turno
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

// Forma de cada punto del gráfico (un turno de un día)
export interface ParamVsDosisPoint {
  label:             string;        // "DD - TX"
  fecha:             string;
  turno:             string;        // "T1" | "T2" | "T3"
  entrada:           number | null; // Tanque Homogeneizador
  salida:            number | null; // GEM Salida
  ppm_acido:         number | null;
  ppm_coagulante:    number | null;
  ppm_decolorante:   number | null;
  ppm_pol_anionico:  number | null;
  ppm_pol_cationico: number | null;
}

// Nomenclatura correcta: T1=Noche, T2=Mañana, T3=Tarde
const TURNO_KEY: Record<string, string> = {
  noche:  'T1',
  mañana: 'T2', manana: 'T2',
  tarde:  'T3',
};

// Hook principal — devuelve todos los PPM de los 5 químicos GEM por turno
export function useParamVsDosis(
  fechaInicio: string,
  fechaFin:    string,
  parametro:   string,
) {
  // Estados de carga, error y resultado
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [data,    setData]    = useState<ParamVsDosisPoint[]>([]);

  // Dispara la carga paralela al cambiar el rango o parámetro
  useEffect(() => {
    if (!fechaInicio || !fechaFin || !parametro) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        // Consultas paralelas: mediciones del parámetro + eficiencia GEM
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

        // Agrupar todos los PPM por (fecha|turno)
        type PpmRow = {
          ppm_acido: number | null;
          ppm_coagulante: number | null;
          ppm_decolorante: number | null;
          ppm_pol_anionico: number | null;
          ppm_pol_cationico: number | null;
        };
        const ppmMap = new Map<Key, PpmRow>();
        for (const row of gemRows) {
          const t   = TURNO_KEY[row.turno?.toLowerCase() ?? ''] ?? 'T1';
          const key = `${row.fecha}|${t}`;
          ppmMap.set(key, {
            ppm_acido:         row.ppm_acido         ?? null,
            ppm_coagulante:    row.ppm_coagulante    ?? null,
            ppm_decolorante:   row.ppm_decolorante   ?? null,
            ppm_pol_anionico:  row.ppm_pol_anionico  ?? null,
            ppm_pol_cationico: row.ppm_pol_cationico ?? null,
          });
        }

        // Union ordenada de todas las claves (fecha|turno) disponibles
        const allKeys = new Set([...medMap.keys(), ...ppmMap.keys()]);
        const sorted  = Array.from(allKeys).sort();

        // Construir puntos finales combinando mediciones y PPM
        const result: ParamVsDosisPoint[] = sorted.map(key => {
          const [fecha, turnoStr] = key.split('|');
          const day  = fecha.slice(8, 10);
          const med  = medMap.get(key);
          const ppms = ppmMap.get(key);
          return {
            label:             `${day} - ${turnoStr}`,
            fecha,
            turno:             turnoStr,
            entrada:           med?.entrada ?? null,
            salida:            med?.salida  ?? null,
            ppm_acido:         ppms?.ppm_acido         ?? null,
            ppm_coagulante:    ppms?.ppm_coagulante    ?? null,
            ppm_decolorante:   ppms?.ppm_decolorante   ?? null,
            ppm_pol_anionico:  ppms?.ppm_pol_anionico  ?? null,
            ppm_pol_cationico: ppms?.ppm_pol_cationico ?? null,
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
  }, [fechaInicio, fechaFin, parametro]);

  return { data, loading, error };
}
