import { useState, useEffect } from 'react';
import { getBalanceHidrico, type BalanceHidricoRow } from '../../../services/ptarClient';

interface Result {
  data: BalanceHidricoRow[];
  loading: boolean;
  error: string | null;
}

export function useBalanceData(
  fechaInicio: string,
  fechaFin: string,
  turno?: number,
): Result {
  const [data,    setData]    = useState<BalanceHidricoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

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
