// Tipos, secciones disponibles y configuración por defecto del dashboard configurable

// Filtros aplicables al visualizador de Calidad
export interface CalidadVizFilters {
  parametro: string;
  fechaInicio: string;
  fechaFin: string;
  turno: string;
  granularidad: string;
}

// Filtros aplicables al visualizador de Balance Hídrico
export interface BalanceVizFilters {
  fechaInicio: string;
  fechaFin: string;
  turno: string;
  granularidad: string;
}

// Filtros aplicables al visualizador de Costos Químicos
export interface CostosVizFilters {
  fechaInicio: string;
  fechaFin: string;
  sistema: string;
  granularidad: string;
}

// Bloque de configuración genérico para un dashboard: habilitado, secciones y filtros
export interface DashboardConfigBlock<F> {
  enabled: boolean;
  sections: string[];
  filters: F;
}

// Secciones (cards) del resumen ejecutivo visibles al Visualizador
export interface ResumenVizFilters {
  fechaInicio: string;
  fechaFin: string;
}

// Configuración completa del dashboard del administrador con metadatos de guardado
export interface DashboardConfig {
  resumen?: DashboardConfigBlock<ResumenVizFilters>;
  calidad: DashboardConfigBlock<CalidadVizFilters>;
  balance: DashboardConfigBlock<BalanceVizFilters>;
  costos: DashboardConfigBlock<CostosVizFilters>;
  savedAt?: string;
  savedBy?: string;
}

// Catálogo de secciones disponibles en el dashboard de Calidad
export const CALIDAD_SECTIONS = [
  { key: 'distribucion',     label: 'Distribución y Comportamiento Multiparámetro' },
  { key: 'remocion_gem',     label: 'Remoción Sistema GEM' },
  { key: 'remocion_costo',   label: '% Remoción vs Costo/m³' },
  { key: 'param_vs_dosis',   label: 'Parámetro vs Dosis de Químico' },
  { key: 'carga_removida',   label: 'Carga Removida KG/DÍA' },
  { key: 'kg_quimico',       label: 'KG Químico / KG Removido' },
] as const;

// Catálogo de secciones disponibles en el dashboard de Balance Hídrico
export const BALANCE_SECTIONS = [
  { key: 'kpis',             label: 'KPIs — Resumen del Período' },
  { key: 'balance_hidrico',  label: 'Balance Hídrico' },
  { key: 'tintoreria',       label: 'Indicador Tintorería' },
  { key: 'lavanderia',       label: 'Indicador Lavandería' },
  { key: 'rotativa',         label: 'Indicador Rotativa' },
  { key: 'tratabilidad_i',   label: 'Balance de Tratabilidad I' },
  { key: 'tratabilidad_ii',  label: 'Balance de Tratabilidad II' },
  { key: 'operacion_ro',     label: 'Operación RO — Eficiencias' },
  { key: 'gem_fq',           label: 'Indicador Tratamiento FQ GEM' },
  { key: 'osmosis_inversa',  label: 'Indicador Osmosis Inversa' },
  { key: 'lodos',            label: 'Balance de Lodos' },
] as const;

// Catálogo de secciones disponibles en el dashboard de Costos Químicos
export const COSTOS_SECTIONS = [
  { key: 'kpis_costos',              label: 'Resumen del Período' },
  { key: 'gem_m3',                   label: 'GEM — $m³ Tratamiento' },
  { key: 'ro_indicador',             label: 'Osmosis Inversa — Indicador RO' },
  { key: 'consumo_charts',           label: 'Consumo PPM / KG / L vs $/m³' },
  { key: 'estadisticas_reactivos',   label: 'Estadísticas por Reactivo' },
  { key: 'estadisticas_detalladas',  label: 'Estadísticas Detalladas' },
  { key: 'remocion_dqo_sst',         label: 'Remoción DQO · SST' },
  { key: 'remocion_gem',             label: 'Remoción GEM — DQO · SST · Color' },
] as const;

// Catálogo de cards disponibles en el Resumen Ejecutivo
export const RESUMEN_SECTIONS = [
  { key: 'balance',  label: '💧 Balance Hídrico' },
  { key: 'calidad',  label: '🧪 Calidad del Agua' },
  { key: 'costos',   label: '💰 Costos Químicos' },
] as const;

// Estado inicial vacío del dashboard configurable (todos los módulos deshabilitados)
export const DEFAULT_CONFIG: DashboardConfig = {
  resumen: {
    enabled: true,
    sections: ['balance', 'calidad', 'costos'],
    filters: { fechaInicio: '', fechaFin: '' },
  },
  calidad: {
    enabled: false,
    sections: [],
    filters: { parametro: 'pH', fechaInicio: '', fechaFin: '', turno: '', granularidad: 'dia' },
  },
  balance: {
    enabled: false,
    sections: [],
    filters: { fechaInicio: '', fechaFin: '', turno: '', granularidad: 'dia' },
  },
  costos: {
    enabled: false,
    sections: [],
    filters: { fechaInicio: '', fechaFin: '', sistema: 'GEM', granularidad: 'dia' },
  },
};
