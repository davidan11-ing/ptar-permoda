import { useState, useEffect } from 'react';
import { getGemEficiencia } from '../../../services/ptarClient';
import type { GemEficienciaRow } from '../../../services/ptarClient';

export type { GemEficienciaRow };

interface Result {
  data: GemEficienciaRow[];
  loading: boolean;
  error: string | null;
}

export function useGemEficiencia(
  fechaInicio: string,
  fechaFin: string,
): Result {
  const [data,    setData]    = useState<GemEficienciaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!fechaInicio || !fechaFin) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getGemEficiencia({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })
      .then(rows => {
        if (cancelled) return;
        setData(rows);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error al cargar eficiencia GEM');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [fechaInicio, fechaFin]);

  return { data, loading, error };
}
