import { memo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import type { EqDef } from './equipment';
import { SC, SL } from './equipment';
import { useEquipChart } from './hooks/useEquipChart';
import { EquipSvgDrawing } from './EquipSvgDrawing';

/* ── helpers ─────────────────────────────────────────────────────── */

/** Extrae el número y la unidad de una cadena como "65 %", "18 L/m²/h", "7.2", "-0.38 bar" */
function parseParam(raw: string): { num: number; unit: string } {
  const m = raw.match(/^([+-]?\d*\.?\d+)\s*(.*)/);
  if (m) return { num: parseFloat(m[1]), unit: m[2].trim() };
  return { num: 50, unit: '' };
}

/* ── sub-componente AreaChart (inline) ───────────────────────────── */
interface ChartProps {
  equipKey: string;
  baseValue: number;
  paramLabel: string;
  unit: string;
  accentColor: string;
}

function EquipChart({ equipKey, baseValue, paramLabel, unit, accentColor }: ChartProps) {
  const data = useEquipChart(equipKey, baseValue, true);

  const gradId = `eqGrad-${equipKey}`;
  const fmtTime = (t: number) =>
    new Date(t).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <ResponsiveContainer width="100%" height={130}>
      <AreaChart data={data} margin={{ top: 6, right: 10, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={accentColor} stopOpacity={0.35} />
            <stop offset="95%" stopColor={accentColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1c2535" />
        <XAxis
          dataKey="t"
          tickFormatter={fmtTime}
          tick={{ fill: '#484f58', fontSize: 8 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#8b949e', fontSize: 10 }}
          tickFormatter={v => `${v}`}
          unit={unit ? ` ${unit}` : ''}
          width={46}
        />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: '#8b949e', marginBottom: 4, fontSize: 10 }}
          labelFormatter={fmtTime}
          formatter={(v: number) => [`${v}${unit ? ' ' + unit : ''}`, paramLabel]}
          itemStyle={{ color: accentColor }}
        />
        <Area
          type="monotone"
          dataKey="valor"
          stroke={accentColor}
          strokeWidth={1.5}
          fill={`url(#${gradId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── props principales ───────────────────────────────────────────── */
interface Props {
  equipKey: string;
  eq: EqDef;
  closing: boolean;
  onClose: () => void;
}

/* ── componente principal ────────────────────────────────────────── */
function EquipmentModalInner({ equipKey, eq, closing, onClose }: Props) {
  const statusColor = SC[eq.status];

  // Parámetro a graficar
  const chartIdx   = eq.chartParam ?? 0;
  const chartEntry = eq.params[chartIdx] ?? eq.params[0] ?? ['Variable', '50'];
  const [chartLabel, chartRaw] = chartEntry;
  const { num: baseValue, unit: chartUnit } = parseParam(chartRaw);

  return (
    <div
      className={`eq-modal-backdrop${closing ? ' eq-modal-closing-bg' : ''}`}
      onClick={onClose}
    >
      <div
        className={`eq-modal-panel${closing ? ' eq-modal-closing' : ''}`}
        onClick={e => e.stopPropagation()}
        style={{
          borderColor: `${statusColor}44`,
          boxShadow: `0 0 45px ${statusColor}12, 0 24px 80px rgba(0,0,0,.78)`,
        }}
      >
        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div className="eq-modal-header" style={{ borderColor: `${statusColor}30` }}>
          <div className="eq-modal-identity">
            <span className="eq-modal-dot" style={{ background: statusColor }} />
            <span className="eq-modal-name">{eq.label}</span>
            <span className={`eq-modal-badge eq-modal-badge--${eq.status}`}>
              {SL[eq.status]}
            </span>
          </div>
          <span className="eq-modal-key-chip">{equipKey}</span>
          <button className="eq-modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {/* ── BODY ───────────────────────────────────────────────── */}
        <div className="eq-modal-body">

          {/* Columna SVG — ilustración standalone */}
          <div className="eq-modal-svg-col">
            <EquipSvgDrawing equipKey={equipKey} status={eq.status} />
          </div>

          {/* Columna datos */}
          <div className="eq-modal-data-col">

            {/* Sección descripción */}
            {eq.description && (
              <>
                <div className="eq-modal-section-label">DESCRIPCIÓN</div>
                <p className="eq-modal-description">{eq.description}</p>
              </>
            )}

            {/* Costo operativo */}
            {eq.cost && (
              <div className="eq-modal-cost-row">
                <span className="eq-modal-section-label" style={{margin:0}}>COSTO OPERATIVO</span>
                <div style={{display:'flex',alignItems:'center'}}>
                  <span className="eq-modal-cost-value">
                    <span className="eq-cost-sign">$</span>
                    <span>{eq.cost.replace(/^\$/, '')}</span>
                  </span>
                  {eq.costRange && (
                    <span className="eq-modal-cost-range">{eq.costRange}</span>
                  )}
                </div>
              </div>
            )}

            {/* Sección parámetros */}
            <div className="eq-modal-section-label" style={{ marginTop: eq.cost ? 14 : (eq.description ? 14 : 6) }}>PARÁMETROS</div>
            <table className="eq-params-table">
              <tbody>
                {eq.params.map(([lbl, val], i) => (
                  <tr key={lbl} className={`eq-param-row${i === chartIdx ? ' eq-param-row--active' : ''}`}>
                    <td className="eq-param-label">{lbl}</td>
                    <td className="eq-param-value" style={i === chartIdx ? { color: statusColor } : undefined}>
                      {val}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Sección gráfico */}
            <div className="eq-modal-section-label eq-modal-section-chart">
              <span>{chartLabel}</span>
              <span className="eq-chart-live-dot" style={{ background: '#3fb950' }} />
              <span className="eq-chart-live-label">EN VIVO</span>
            </div>
            <EquipChart
              equipKey={equipKey}
              baseValue={baseValue}
              paramLabel={chartLabel}
              unit={chartUnit}
              accentColor={statusColor}
            />

          </div>
        </div>
      </div>
    </div>
  );
}

export const EquipmentModal = memo(EquipmentModalInner);
