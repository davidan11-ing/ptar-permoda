import type { KpiMetric, TimeSeriesPoint } from '../../models';

export const KPI_METRICS: KpiMetric[] = [
  { label: 'Eficiencia Tratamiento', value: 92, target: 90, unit: '%', color: '#00c5e3' },
  { label: 'Caudal Procesado',       value: 87, target: 85, unit: '%', color: '#3fb950' },
  { label: 'Calidad Efluente',       value: 78, target: 80, unit: '%', color: '#d29922' },
  { label: 'Disponibilidad Equipos', value: 95, target: 90, unit: '%', color: '#1f6feb' },
];

export const CAUDAL_HORARIO: TimeSeriesPoint[] = [
  { hora: '00:00', valor: 42, limite_superior: 60, limite_inferior: 20 },
  { hora: '01:00', valor: 38, limite_superior: 60, limite_inferior: 20 },
  { hora: '02:00', valor: 35, limite_superior: 60, limite_inferior: 20 },
  { hora: '03:00', valor: 33, limite_superior: 60, limite_inferior: 20 },
  { hora: '04:00', valor: 36, limite_superior: 60, limite_inferior: 20 },
  { hora: '05:00', valor: 44, limite_superior: 60, limite_inferior: 20 },
  { hora: '06:00', valor: 58, limite_superior: 60, limite_inferior: 20 },
  { hora: '07:00', valor: 65, limite_superior: 60, limite_inferior: 20 },
  { hora: '08:00', valor: 72, limite_superior: 60, limite_inferior: 20 },
  { hora: '09:00', valor: 68, limite_superior: 60, limite_inferior: 20 },
  { hora: '10:00', valor: 70, limite_superior: 60, limite_inferior: 20 },
  { hora: '11:00', valor: 74, limite_superior: 60, limite_inferior: 20 },
  { hora: '12:00', valor: 76, limite_superior: 60, limite_inferior: 20 },
  { hora: '13:00', valor: 71, limite_superior: 60, limite_inferior: 20 },
  { hora: '14:00', valor: 69, limite_superior: 60, limite_inferior: 20 },
  { hora: '15:00', valor: 73, limite_superior: 60, limite_inferior: 20 },
  { hora: '16:00', valor: 78, limite_superior: 60, limite_inferior: 20 },
  { hora: '17:00', valor: 80, limite_superior: 60, limite_inferior: 20 },
  { hora: '18:00', valor: 75, limite_superior: 60, limite_inferior: 20 },
  { hora: '19:00', valor: 66, limite_superior: 60, limite_inferior: 20 },
  { hora: '20:00', valor: 60, limite_superior: 60, limite_inferior: 20 },
  { hora: '21:00', valor: 55, limite_superior: 60, limite_inferior: 20 },
  { hora: '22:00', valor: 50, limite_superior: 60, limite_inferior: 20 },
  { hora: '23:00', valor: 45, limite_superior: 60, limite_inferior: 20 },
];

export const DBO_HORARIO: TimeSeriesPoint[] = [
  { hora: '00:00', valor: 18 }, { hora: '02:00', valor: 15 },
  { hora: '04:00', valor: 12 }, { hora: '06:00', valor: 22 },
  { hora: '08:00', valor: 35 }, { hora: '10:00', valor: 28 },
  { hora: '12:00', valor: 30 }, { hora: '14:00', valor: 25 },
  { hora: '16:00', valor: 32 }, { hora: '18:00', valor: 38 },
  { hora: '20:00', valor: 29 }, { hora: '22:00', valor: 20 },
];

export const ESTADO_EQUIPOS = [
  { hora: '00:00', estado: 1 }, { hora: '01:00', estado: 1 },
  { hora: '02:00', estado: 1 }, { hora: '03:00', estado: 0 },
  { hora: '04:00', estado: 0 }, { hora: '05:00', estado: 1 },
  { hora: '06:00', estado: 1 }, { hora: '07:00', estado: 1 },
  { hora: '08:00', estado: 1 }, { hora: '09:00', estado: 1 },
  { hora: '10:00', estado: 0 }, { hora: '11:00', estado: 0 },
  { hora: '12:00', estado: 1 }, { hora: '13:00', estado: 1 },
  { hora: '14:00', estado: 1 }, { hora: '15:00', estado: 1 },
  { hora: '16:00', estado: 1 }, { hora: '17:00', estado: 1 },
  { hora: '18:00', estado: 1 }, { hora: '19:00', estado: 0 },
  { hora: '20:00', estado: 1 }, { hora: '21:00', estado: 1 },
  { hora: '22:00', estado: 1 }, { hora: '23:00', estado: 1 },
];

export const ROLLING_7DIAS = [
  { dia: 'L', eficiencia: 88, caudal: 82, calidad: 75 },
  { dia: 'M', eficiencia: 91, caudal: 85, calidad: 80 },
  { dia: 'X', eficiencia: 89, caudal: 87, calidad: 78 },
  { dia: 'J', eficiencia: 94, caudal: 90, calidad: 82 },
  { dia: 'V', eficiencia: 92, caudal: 88, calidad: 79 },
  { dia: 'S', eficiencia: 90, caudal: 84, calidad: 77 },
  { dia: 'D', eficiencia: 87, caudal: 80, calidad: 76 },
];

export const TIME_AVAILABILITY = [
  { label: 'Activo',        value: '18:22:14', color: '#3fb950', pct: 76 },
  { label: 'Inactivo',      value: '02:15:00', color: '#8b949e', pct: 9 },
  { label: 'Paro Técnico',  value: '01:30:00', color: '#d29922', pct: 6 },
  { label: 'Mantenimiento', value: '01:52:46', color: '#f85149', pct: 8 },
  { label: 'Forzado',       value: '00:00:00', color: '#1f6feb', pct: 0 },
  { label: 'Total',         value: '24:00:00', color: '#e6edf3', pct: 100 },
];
