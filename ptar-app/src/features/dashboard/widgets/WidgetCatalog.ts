export type WidgetId = 'balance-consumo' | 'gem-costo-m3' | 'ro-costo-m3' | 'calidad-tendencia';

export interface WidgetMeta {
  id: WidgetId;
  label: string;
  description: string;
  section: 'Balance' | 'Costos' | 'Calidad';
  color: string;
}

export const WIDGET_CATALOG: WidgetMeta[] = [
  { id: 'balance-consumo',   label: 'Consumo de Agua',  description: 'Agua limpia total vs. fuentes por fecha', section: 'Balance', color: '#1f6feb' },
  { id: 'gem-costo-m3',      label: 'GEM $/m³',         description: 'Costo por m³ tratado en GEM por turno',   section: 'Costos',  color: '#3fb950' },
  { id: 'ro-costo-m3',       label: 'RO $/m³',          description: 'Costo por m³ tratado en Ósmosis Inversa', section: 'Costos',  color: '#d2a8ff' },
  { id: 'calidad-tendencia', label: 'Calidad — pH/TDS', description: 'Tendencia pH y TDS en puntos clave',      section: 'Calidad', color: '#d29922' },
];

export const DEFAULT_WIDGETS: WidgetId[] = ['balance-consumo', 'gem-costo-m3', 'ro-costo-m3', 'calidad-tendencia'];

export const LS_KEY = 'ptar_dashboard_widgets_v1';
