import { useState, useEffect } from 'react';
import { getCalidadDispersion } from '../../../services/ptarClient';
import type { DispersionRow } from '../../../services/ptarClient';

export type { DispersionRow };

interface Result {
  data: DispersionRow[];
  loading: boolean;
  error: string | null;
}

export function useDispersionData(
  parametro: string,
  fechaInicio: string,
  fechaFin: string,
): Result {
  const [data,    setData]    = useState<DispersionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!parametro || !fechaInicio || !fechaFin) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getCalidadDispersion({ parametro, fecha_inicio: fechaInicio, fecha_fin: fechaFin })
      .then(rows => {
        if (cancelled) return;
        setData(rows);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error al cargar dispersión');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [parametro, fechaInicio, fechaFin]);

  return { data, loading, error };
}
