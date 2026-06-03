import type { Granularidad } from '../../hooks/useGranularidad';

const LABELS: Record<Granularidad, string> = {
  turno:  'Turno',
  dia:    'Día',
  semana: 'Semana',
  mes:    'Mes',
};

const RANGOS: Record<Granularidad, string> = {
  turno:  'Últ. 7 días',
  dia:    'Últ. 30 d',
  semana: 'Últ. 12 sem',
  mes:    'Últ. 6 meses',
};

const OPCIONES = (['turno', 'dia', 'semana', 'mes'] as Granularidad[]);

interface Props {
  value: Granularidad | null;
  onChange: (g: Granularidad) => void;
}

const BASE: React.CSSProperties = {
  padding: '0 14px',
  height: 34,
  border: '1px solid #30363d',
  borderRadius: 6,
  background: 'transparent',
  color: '#8b949e',
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

const ACTIVE: React.CSSProperties = {
  ...BASE,
  borderColor: '#1f6feb',
  background: '#1f6feb20',
  color: '#58a6ff',
  fontWeight: 600,
};

export default function GranularidadSelector({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
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
            {isActive && (
              <span style={{ fontSize: 10, opacity: 0.7 }}>{RANGOS[g]}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
