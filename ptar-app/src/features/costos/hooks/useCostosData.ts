// Hook de datos para el dashboard de costos: consumo diario, proyección, estadísticas y GEM
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

// Contrato de retorno del hook con todos los datos y estados de carga
interface CostosData {
  consumoDiario:  ConsumoQuimicoDiaRow[];
  proyeccion:     RealVsProyectadoRow[];
  estadisticas:   EstadisticasDiaRow[];
  gemEficiencia:  GemEficienciaRow[];
  loading: boolean;
  error:   string | null;
}

// Carga en paralelo los 4 endpoints de costos; cancela si el componente se desmonta
export function useCostosData(
  fechaInicio: string,
  fechaFin:    string,
  sistema:     string,
  mesOverride?: number,
): CostosData {
  // Consumo diario de reactivos por sistema y fecha
  const [consumoDiario,  setConsumoDiario]  = useState<ConsumoQuimicoDiaRow[]>([]);
  // Proyección anual de kg/m³ por reactivo
  const [proyeccion,     setProyeccion]     = useState<RealVsProyectadoRow[]>([]);
  // Estadísticas mensuales de dosificación (min/avg/max/total)
  const [estadisticas,   setEstadisticas]   = useState<EstadisticasDiaRow[]>([]);
  // Eficiencia operacional del sistema GEM por turno
  const [gemEficiencia,  setGemEficiencia]  = useState<GemEficienciaRow[]>([]);
  // Estado de carga activa
  const [loading, setLoading] = useState(false);
  // Mensaje de error si algún endpoint falla
  const [error,   setError]   = useState<string | null>(null);

  // Fetch paralelo de los 4 endpoints al cambiar período o sistema
  useEffect(() => {
    if (!fechaInicio || !fechaFin) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Año y mes derivados de la fecha fin para proyección y estadísticas
    const anio = new Date(fechaFin).getFullYear();
    const mes  = mesOverride ?? (new Date(fechaFin).getMonth() + 1);
    const sis  = sistema || undefined;

    Promise.allSettled([
      getConsumoQuimicoDiario({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, sistema: sis }),
      getProyeccionQuimicos({ anio, sistema: sis }),
      getEstadisticasReactivos({ anio, mes, sistema: sis }),
      getGemEficiencia({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
    ])
      .then(([diario, proy, stats, gem]) => {
        if (cancelled) return;
        if (diario.status  === 'fulfilled') setConsumoDiario(diario.value);
        if (proy.status    === 'fulfilled') setProyeccion(proy.value);
        if (stats.status   === 'fulfilled') setEstadisticas(stats.value);
        if (gem.status     === 'fulfilled') setGemEficiencia(gem.value);
        // Reportar error solo si el endpoint principal (consumo) falló
        const errores = [diario, proy, stats, gem]
          .filter(r => r.status === 'rejected')
          .map(r => (r as PromiseRejectedResult).reason?.message ?? 'Error')
          .join(' | ');
        if (errores && diario.status === 'rejected') setError(errores);
        setLoading(false);
      });

    // Cleanup: cancela actualizaciones de estado si el componente se desmontó
    return () => { cancelled = true; };
  }, [fechaInicio, fechaFin, sistema, mesOverride]);

  return { consumoDiario, proyeccion, estadisticas, gemEficiencia, loading, error };
}
