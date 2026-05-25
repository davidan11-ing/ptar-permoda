import { useState, useEffect, useRef } from 'react';

export interface ChartPoint { t: number; valor: number; }

/**
 * Devuelve los últimos maxPoints del parámetro principal del equipo.
 *
 * Fase actual: mock data oscilante ±6% alrededor del valor base.
 *
 * PLC Integration Point:
 *   Cuando exista el endpoint REST, reemplazar el bloque TODO con:
 *   fetch(`${API}/api/equipos/${equipKey}/lecturas?limit=20`)
 *     .then(r => r.json())
 *     .then((rows: {ts: number; valor: number}[]) => setData(rows))
 *   El contrato del hook (ChartPoint[]) no cambia.
 */
export function useEquipChart(
  equipKey: string,
  baseValue: number,
  active: boolean,
  intervalMs = 2000,
  maxPoints = 40,
) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const baseRef = useRef(baseValue);
  baseRef.current = baseValue;  // siempre actualizado sin re-trigger del efecto

  useEffect(() => {
    if (!active || !equipKey) return;

    const safeBase = Number.isFinite(baseRef.current) && baseRef.current !== 0
      ? Math.abs(baseRef.current)
      : 50;

    // Semilla inicial: 20 puntos históricos simulados
    const now = Date.now();
    const jitter = () => safeBase + (Math.random() - 0.5) * safeBase * 0.06;
    const seed: ChartPoint[] = Array.from({ length: 20 }, (_, i) => ({
      t: now - (20 - i) * intervalMs,
      valor: +jitter().toFixed(3),
    }));
    setData(seed);

    // TODO PLC: fetch(`${API}/api/equipos/${equipKey}/lecturas?limit=20`)

    const id = setInterval(() => {
      // TODO PLC: reemplazar mock con fetch del endpoint
      const base = Number.isFinite(baseRef.current) && baseRef.current !== 0
        ? Math.abs(baseRef.current)
        : 50;
      const newPoint: ChartPoint = {
        t: Date.now(),
        valor: +(base + (Math.random() - 0.5) * base * 0.06).toFixed(3),
      };
      setData(prev => [...prev.slice(-(maxPoints - 1)), newPoint]);
    }, intervalMs);

    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipKey, active, intervalMs, maxPoints]);

  return data;
}
