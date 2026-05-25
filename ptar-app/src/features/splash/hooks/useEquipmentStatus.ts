import { useState, useEffect, useCallback } from 'react';

// Tipo de estado de equipo (debe coincidir con equipment.ts)
export type EquipStatus = 'operando' | 'advertencia' | 'alarma';
export type StatusMap = Record<string, EquipStatus>;

/**
 * Polling del endpoint /api/equipos/estados-hoy.
 * Devuelve un mapa { equipo_key: estado } con el estado más reciente de cada equipo.
 * Si la API no responde, devuelve {} (sin cambios → se usa estado hardcodeado de equipment.ts).
 */
export function useEquipmentStatus(pollMs = 120_000): StatusMap {
  const [statusMap, setStatusMap] = useState<StatusMap>({});

  const fetch_ = useCallback(() => {
    const API = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8001';
    fetch(`${API}/api/equipos/estados-hoy`)
      .then(r => r.ok ? r.json() : [])
      .then((rows: { equipo_key: string; estado: EquipStatus }[]) => {
        const map: StatusMap = {};
        for (const r of rows) map[r.equipo_key] = r.estado;
        setStatusMap(map);
      })
      .catch(() => { /* API no disponible → mantener estado anterior */ });
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, pollMs);
    return () => clearInterval(id);
  }, [fetch_, pollMs]);

  return statusMap;
}
