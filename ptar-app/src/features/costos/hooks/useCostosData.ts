import { useState, useEffect } from 'react';
import {
  getConsumoQuimicoDiario,
  getProyeccionQuimicos,
  getEstadisticasReactivos,
  getGemEficiencia,
  type ConsumoQuimicoDiaRow,
  type RealVsProyectadoRow,
  type EstadisticasDiaRow,
  type GemEficienciaRow,
} from '../../../services/ptarClient';

export type { ConsumoQuimicoDiaRow, RealVsProyectadoRow, EstadisticasDiaRow, GemEficienciaRow };

interface CostosData {
  consumoDiario:  ConsumoQuimicoDiaRow[];
  proyeccion:     RealVsProyectadoRow[];
  estadisticas:   EstadisticasDiaRow[];
  gemEficiencia:  GemEficienciaRow[];
  loading: boolean;
  error:   string | null;
}

export function useCostosData(
  fechaInicio: string,
  fechaFin:    string,
  sistema:     string,
): CostosData {
  const [consumoDiario,  setConsumoDiario]  = useState<ConsumoQuimicoDiaRow[]>([]);
  const [proyeccion,     setProyeccion]     = useState<RealVsProyectadoRow[]>([]);
  const [estadisticas,   setEstadisticas]   = useState<EstadisticasDiaRow[]>([]);
  const [gemEficiencia,  setGemEficiencia]  = useState<GemEficienciaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!fechaInicio || !fechaFin) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const anio = new Date(fechaFin).getFullYear();
    const mes  = new Date(fechaFin).getMonth() + 1;
    const sis  = sistema || undefined;

    Promise.all([
      getConsumoQuimicoDiario({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, sistema: sis }),
      getProyeccionQuimicos({ anio, sistema: sis }),
      getEstadisticasReactivos({ anio, mes, sistema: sis }),
      getGemEficiencia({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
    ])
      .then(([diario, proy, stats, gem]) => {
        if (cancelled) return;
        setConsumoDiario(diario);
        setProyeccion(proy);
        setEstadisticas(stats);
        setGemEficiencia(gem);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error al cargar costos químicos');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [fechaInicio, fechaFin, sistema]);

  return { consumoDiario, proyeccion, estadisticas, gemEficiencia, loading, error };
}
