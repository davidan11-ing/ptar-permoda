// Selector de granularidad temporal (turno / día / semana / mes) para dashboards
import type { Granularidad } from '../../hooks/useGranularidad';
import { useTheme } from '../../state/ThemeContext';

// Etiquetas visibles de cada opción de granularidad
const LABELS: Record<Granularidad, string> = {
  turno:  'Turno',
  dia:    'Día',
  semana: 'Semana',
  mes:    'Mes',
};

// Granularidad de agrupación de cada opción (tooltip)
const RANGOS: Record<Granularidad, string> = {
  turno:  'Agrupar por turno',
  dia:    'Agrupar por día',
  semana: 'Agrupar por semana',
  mes:    'Agrupar por mes',
};

// Orden de renderizado de las opciones
const OPCIONES = (['turno', 'dia', 'semana', 'mes'] as Granularidad[]);

interface Props {
  value: Granularidad | null;
  onChange: (g: Granularidad) => void;
}

// Grupo de botones para seleccionar la granularidad temporal
export default function GranularidadSelector({ value, onChange }: Props) {
  const { theme } = useTheme();

  // Estilo base de cada botón de granularidad
  const BASE: React.CSSProperties = {
    padding: '0 14px',
    height: 34,
    border: `1px solid ${theme.border}`,
    borderRadius: 6,
    background: 'transparent',
    color: theme.muted,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    whiteSpace: 'nowrap',
    transition: 'border-color .15s, background .15s, color .15s',
  };

  // Estilo del botón cuando está activo/seleccionado
  const ACTIVE: React.CSSProperties = {
    ...BASE,
    borderColor: theme.blue,
    background: theme.chipBlueBg,
    color: theme.lblue,
    fontWeight: 600,
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, color: theme.muted, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
        Ver por
      </span>
      {OPCIONES.map(g => {
        const isActive = value === g;
        return (
          <button
            key={g}
            type="button"
            style={isActive ? ACTIVE : BASE}
            onClick={() => onChange(g)}
            title={RANGOS[g]}
          >
            {LABELS[g]}
          </button>
        );
      })}
    </div>
  );
}
