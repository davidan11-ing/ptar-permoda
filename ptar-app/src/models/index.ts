export type Role = 'operario' | 'encargado' | 'administrador';

export interface AppUser {
  id: string;
  nombre: string;
  roles: Role[];
  activeRole: Role;
}

export interface FormatoBase {
  id: string;
  fecha: string;
  turno: 'mañana' | 'tarde' | 'noche';
  operarioId: string;
  operarioNombre: string;
  estado: 'borrador' | 'enviado' | 'revisado';
}

export interface FormatoCaudales extends FormatoBase {
  tipo: 'caudales';
  caudal_entrada: number;
  caudal_salida: number;
  nivel_tanque: number;
  ph_entrada: number;
  ph_salida: number;
  temperatura: number;
  observaciones: string;
}

export interface FormatoReactivos extends FormatoBase {
  tipo: 'reactivos';
  cloro_disponible: number;
  coagulante_usado: number;
  floculante_usado: number;
  stock_cloro: number;
  stock_coagulante: number;
  observaciones: string;
}

export interface FormatoIncidencias extends FormatoBase {
  tipo: 'incidencias';
  equipo_afectado: string;
  descripcion: string;
  accion_tomada: string;
  tiempo_paro: number;
  prioridad: 'baja' | 'media' | 'alta' | 'critica';
}

export type Formato = FormatoCaudales | FormatoReactivos | FormatoIncidencias;

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
