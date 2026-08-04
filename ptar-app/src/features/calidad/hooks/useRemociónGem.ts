// Hook para cargar remociones de calidad GEM en un rango de fechas
import { useState, useEffect } from 'react';
import { getCalidadRemociones } from '../../../services/ptarClient';
import type { RemocionCalidad } from '../../../services/ptarClient';

interface UseRemociónGemResult {
  data:    RemocionCalidad[];
  loading: boolean;
}

// Hook principal — consulta todas las remociones sin filtrar por parámetro
export function useRemociónGem(
  parametro: string,
  fechaInicio: string,
  fechaFin: string,
): UseRemociónGemResult {
  // Estado de datos y carga
  const [data,    setData]    = useState<RemocionCalidad[]>([]);
  const [loading, setLoading] = useState(false);

  // Dispara la consulta al cambiar fechas o parámetro
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
