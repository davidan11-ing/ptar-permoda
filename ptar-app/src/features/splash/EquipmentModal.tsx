import { memo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import type { EqDef } from './equipment';
import { SC, SL, PHASE_BREAKDOWNS, EQ_COSTS } from './equipment';
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

/* ── helpers ─────────────────────────────────────────────────────── */
function fmt(v: number) {
  return '$' + v.toLocaleString('es-CO', { minimumFractionDigits: 2 });
}

function BdRow({ label, value, total, hex }: { label: string; value: number; total: number; hex: string }) {
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
  return (
    <div className="eq-cost-bd-row">
      <span className="eq-cost-bd-dot" style={{ background: hex }} />
      <span className="eq-cost-bd-label">{label}</span>
      <div className="eq-cost-bd-bar-wrap">
        <div className="eq-cost-bd-bar" style={{ width: `${pct}%`, background: hex + '66' }} />
      </div>
      <span className="eq-cost-bd-pct">{pct}%</span>
      <span className="eq-cost-bd-val">{fmt(value)}</span>
    </div>
  );
}

/* ── Desglose de costos: por equipo + compartidos de fase ────────── */
function CostBreakdownSection({ equipKey, costPhase }: { equipKey: string; costPhase?: string }) {
  const eqC  = EQ_COSTS[equipKey];
  const bd   = costPhase ? PHASE_BREAKDOWNS[costPhase] : undefined;
  if (!eqC && !bd) return null;

  // Costos propios del equipo
  const eqRows: { label: string; value: number; hex: string }[] = [];
  if (eqC?.energia)  eqRows.push({ label: 'Energía eléctrica', value: eqC.energia,  hex: '#4fc3f7' });
  if (eqC?.lavTK)    eqRows.push({ label: 'Lav. / M.O. tanques', value: eqC.lavTK,  hex: '#ffb74d' });
  if (eqC?.quimicos) eqRows.push({ label: 'Químicos / Reactivos', value: eqC.quimicos, hex: '#ff8a65' });
  const eqTotal = eqRows.reduce((s, r) => s + r.value, 0);

  return (
    <details className="eq-cost-breakdown">
      <summary className="eq-cost-breakdown-summary">
        <span className="eq-cost-bd-chevron">▶</span>
        <span>DESGLOSE DE COSTOS</span>
        {costPhase && <span className="eq-cost-breakdown-phase">{costPhase}</span>}
      </summary>

      {/* ── Sección 1: costos propios ── */}
      {eqRows.length > 0 && (
        <div className="eq-cost-breakdown-body">
          <div className="eq-cost-bd-section-title">COSTOS DEL EQUIPO</div>
          {eqRows.map(r => <BdRow key={r.label} label={r.label} value={r.value} total={eqTotal} hex={r.hex} />)}
          <div className="eq-cost-bd-subtotal">
            <span>Subtotal equipo</span>
            <span>{fmt(eqTotal)}/m³</span>
          </div>
        </div>
      )}

      {/* ── Sección 2: costos compartidos de fase ── */}
      {bd && (
        <div className="eq-cost-breakdown-body eq-cost-breakdown-body--shared">
          <div className="eq-cost-bd-section-title">
            COSTOS COMPARTIDOS · FASE {bd.phase}
          </div>
          {bd.rows.map(r => {
            const sharedTotal = bd.rows.reduce((s, x) => s + x.value, 0);
            return <BdRow key={r.label} label={r.label} value={r.value} total={sharedTotal} hex={r.hex} />;
          })}
          <div className="eq-cost-bd-subtotal">
            <span>Subtotal compartido</span>
            <span>{fmt(bd.rows.reduce((s, r) => s + r.value, 0))}/m³</span>
          </div>
          <div className="eq-cost-bd-total">
            <span>TOTAL FASE {bd.phase}</span>
            <span>{fmt(bd.total)}/m³</span>
          </div>
          <p className="eq-cost-bd-note">{bd.note}</p>
        </div>
      )}
    </details>
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

            {/* Desglose de costos por equipo + fase — collapsible */}
            <CostBreakdownSection equipKey={equipKey} costPhase={eq.costPhase} />

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
