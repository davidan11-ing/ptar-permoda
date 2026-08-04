// Datos de prueba para los KPI del dashboard principal
import type { KpiMetric } from '../../models';

// KPIs de ejemplo con valor actual, objetivo y color por indicador
export const KPI_METRICS: KpiMetric[] = [
  { label: 'Eficiencia Tratamiento', value: 92, target: 90, unit: '%', color: '#00c5e3' },
  { label: 'Caudal Procesado',       value: 87, target: 85, unit: '%', color: '#3fb950' },
  { label: 'Calidad Efluente',       value: 78, target: 80, unit: '%', color: '#d29922' },
  { label: 'Disponibilidad Equipos', value: 95, target: 90, unit: '%', color: '#1f6feb' },
];
