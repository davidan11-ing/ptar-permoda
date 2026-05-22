import { useState, useEffect } from 'react';
import { getCalidadMbrEficiencia } from '../../../services/ptarClient';
import type { MbrEficienciaRow } from '../../../services/ptarClient';

export type { MbrEficienciaRow };

interface Result {
  data: MbrEficienciaRow[];
  loading: boolean;
  error: string | null;
}

export function useMbrEficiencia(
  fechaInicio: string,
  fechaFin: string,
): Result {
  const [data,    setData]    = useState<MbrEficienciaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!fechaInicio || !fechaFin) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getCalidadMbrEficiencia({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })
      .then(rows => {
        if (cancelled) return;
        setData(rows);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error al cargar eficiencia MBR');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [fechaInicio, fechaFin]);

  return { data, loading, error };
}
