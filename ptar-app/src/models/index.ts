export type Role = 'operario' | 'encargado' | 'administrador';

export interface AppUser {
  id: string;
  nombre: string;
  roles: Role[];
  activeRole: Role;
  equipo?: string[];
}

export interface KpiMetric {
  label: string;
  value: number;
  target: number;
  unit: string;
  color: string;
}

export interface TimeSeriesPoint {
  hora: string;
  valor: number;
  limite_superior?: number;
  limite_inferior?: number;
}
