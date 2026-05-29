import { useState, useEffect } from 'react';
import { getCalidadRemociones } from '../../../services/ptarClient';
import type { RemocionCalidad } from '../../../services/ptarClient';

interface UseRemociónGemResult {
  data:    RemocionCalidad[];
  loading: boolean;
}

export function useRemociónGem(
  parametro: string,
  fechaInicio: string,
  fechaFin: string,
): UseRemociónGemResult {
  const [data,    setData]    = useState<RemocionCalidad[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fechaInicio || !fechaFin) return;
    setLoading(true);
    getCalidadRemociones({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })
      .then(rows => {
        // Sin filtro por parámetro — el componente filtra con los nombres reales de la BD
        setData(rows);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [parametro, fechaInicio, fechaFin]);

  return { data, loading };
}
