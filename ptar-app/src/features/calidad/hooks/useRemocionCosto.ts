import { useState, useEffect } from 'react';
import { getCalidadMediciones, getGemEficiencia } from '../../../services/ptarClient';

export interface RemocionCostoPunto {
  label: string;    // "06 - T2"
  fecha: string;
  turno: string;    // "T1" | "T2" | "T3"
  costoM3: number;  // pesos/m³ tratado
  remocion: number; // decimal: 0.073 = 7.3%
}

// Turno string → T1/T2/T3
// Nomenclatura correcta: T1=Noche, T2=Mañana, T3=Tarde
const TURNO_KEY: Record<string, string> = {
  noche:  'T1',
  mañana: 'T2', manana: 'T2',
  tarde:  'T3',
};

export function useRemocionCosto(fechaInicio: string, fechaFin: string, parametro = 'pH') {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [data,    setData]    = useState<RemocionCostoPunto[]>([]);

  useEffect(() => {
    if (!fechaInicio || !fechaFin) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        // 1. Mediciones del parámetro seleccionado (Tanque Homogeneizador + GEM Salida)
        const [pHRows, gemRows] = await Promise.all([
          getCalidadMediciones({
            parametro:    parametro || 'pH',
            fecha_inicio: fechaInicio,
            fecha_fin:    fechaFin,
            limit:        5000,
          }),
          getGemEficiencia({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
        ]);

        if (cancelled) return;

        // 2. Agrupar pH por (fecha|T1/T2/T3) → { homo, gem }
        type PhKey = string;
        const phMap = new Map<PhKey, { homo?: number; gem?: number }>();

        for (const row of pHRows) {
          const t   = TURNO_KEY[row.turno.toLowerCase()] ?? 'T1';
          const key = `${row.fecha}|${t}`;
          if (!phMap.has(key)) phMap.set(key, {});
          const e = phMap.get(key)!;
          if (row.unidad_tratamiento === 'Tanque Homogeneizador') e.homo = row.valor;
          if (row.unidad_tratamiento === 'GEM Salida')            e.gem  = row.valor;
        }

        // 3. Agrupar costo/m³ por (fecha|T1/T2/T3)
        // pesos_por_m3 puede ser NULL si no fue calculado en DB —
        // fallback: costo_quimica_turno / caudal_m3 calculado aquí
        const costoMap = new Map<string, number>();
        for (const row of gemRows) {
          const t   = TURNO_KEY[row.turno?.toLowerCase() ?? ''] ?? 'T1';
          const key = `${row.fecha}|${t}`;
          let costo = row.pesos_por_m3 ?? 0;
          if (!costo && row.caudal_m3 && row.caudal_m3 > 0 && row.costo_quimica_turno) {
            costo = row.costo_quimica_turno / row.caudal_m3;
          }
          costoMap.set(key, costo);
        }

        // 4. Union de claves, ordenadas
        const allKeys = new Set([...phMap.keys(), ...costoMap.keys()]);
        const sorted  = Array.from(allKeys).sort();

        const result: RemocionCostoPunto[] = sorted.map(key => {
          const [fecha, turnoStr] = key.split('|');
          const day   = fecha.slice(8, 10);
          const ph    = phMap.get(key);
          const costo = costoMap.get(key) ?? 0;

          let remocion = 0;
          if (ph?.homo != null && ph?.gem != null && ph.homo > 0) {
            remocion = (ph.homo - ph.gem) / ph.homo;
          }

          return { label: `${day} - ${turnoStr}`, fecha, turno: turnoStr, costoM3: costo, remocion };
        });

        setData(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [fechaInicio, fechaFin, parametro]);

  return { data, loading, error };
}
