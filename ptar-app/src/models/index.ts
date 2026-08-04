// Modelos de dominio compartidos en toda la aplicación

// Roles disponibles para usuarios de la app
export type Role = 'operario' | 'encargado' | 'administrador';

// Usuario autenticado con su rol activo y equipo asignado
export interface AppUser {
  id: string;
  nombre: string;
  roles: Role[];
  activeRole: Role;
  equipo?: string[];
}

// Métrica KPI con valor actual, meta y configuración visual
export interface KpiMetric {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}

// Punto de serie de tiempo con valor y límites de control opcionales
export interface TimeSeriesPoint {
  hora: string;
  valor: number;
  limite_superior?: number;
  limite_inferior?: number;
}
