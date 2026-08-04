// Hook para obtener datos del balance hídrico desde la API
import { useState, useEffect } from 'react';
import { getBalanceHidrico, type BalanceHidricoRow } from '../../../services/ptarClient';

interface Result {
  data: BalanceHidricoRow[];
  loading: boolean;
  error: string | null;
}

// Consulta el balance hídrico filtrado por rango de fechas y turno opcional
export function useBalanceData(
  fechaInicio: string,
  fechaFin: string,
  turno?: number,
): Result {
  // Estado principal: filas de balance, carga y error
  const [data,    setData]    = useState<BalanceHidricoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Dispara la petición cuando cambian fecha inicio, fecha fin o turno
  useEffect(() => {
    if (!fechaInicio || !fechaFin) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getBalanceHidrico({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, turno, limit: 2000 })
      .then(rows => {
        if (cancelled) return;
        setData(rows);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error al cargar balance hídrico');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [fechaInicio, fechaFin, turno]);

  return { data, loading, error };
}
