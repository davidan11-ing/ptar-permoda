// Modal de detalle de equipo: gráfica en vivo, parámetros, descripción y desglose de costos

import { memo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import type { EqDef, EqCostDetail } from './equipment';
import { SC, SL, EQ_COSTS, PROCESS_ORDER } from './equipment';
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

// Gráfica de área en tiempo real para el parámetro principal del equipo
function EquipChart({ equipKey, baseValue, paramLabel, unit, accentColor }: ChartProps) {
  const data = useEquipChart(equipKey, baseValue, true);

  // ID único de gradiente por equipo para evitar colisiones entre múltiples modales
  const gradId = `eqGrad-${equipKey}`;
  const fmtTime = (t: number) =>
    new Date(t).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Área con gradiente vertical y ejes configurados para la unidad del parámetro
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
// Formatea un número como moneda COP con decimales
function fmt(v: number) {
  return '$' + v.toLocaleString('es-CO', { minimumFractionDigits: 2 });
}

// Fila de desglose de costo con barra proporcional
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

// Categorías de costo con color para el desglose visual
const COST_CATS: { key: keyof EqCostDetail; label: string; hex: string }[] = [
  { key: 'quimicos',      label: 'Insumos químicos',    hex: '#ff8a65' },
  { key: 'residuosLodos', label: 'Residuos y lodos',    hex: '#f06292' },
  { key: 'consumibles',   label: 'Consumibles',          hex: '#ffcc02' },
  { key: 'calibMant',     label: 'Calibración y mant.', hex: '#4db6ac' },
  { key: 'nomina',        label: 'Nómina',              hex: '#81c784' },
  { key: 'energia',       label: 'Energía eléctrica',   hex: '#4fc3f7' },
  { key: 'depreciacion',  label: 'Depreciación',        hex: '#ce93d8' },
];

/* ── Desglose: costo por unidad + acumulado hasta este equipo ─── */
// Sección colapsable de costos unitario y acumulado del proceso
function CostBreakdownSection({ equipKey, label }: { equipKey: string; label: string }) {
  const eqC = EQ_COSTS[equipKey];
  const pos = PROCESS_ORDER.indexOf(equipKey);
  if (!eqC && pos < 0) return null;

  // Filas de costo unitario del equipo actual filtradas a categorías con valor > 0
  const unitRows = COST_CATS
    .map(c => ({ ...c, value: eqC?.[c.key] ?? 0 }))
    .filter(r => r.value > 0);
  const unitTotal = unitRows.reduce((s, r) => s + r.value, 0);

  // Sumatoria acumulada de todas las etapas anteriores en el orden del proceso
  const precedingKeys = pos >= 0 ? PROCESS_ORDER.slice(0, pos + 1) : [equipKey];
  const accumRows = COST_CATS
    .map(c => ({
      ...c,
      value: precedingKeys.reduce((s, k) => s + (EQ_COSTS[k]?.[c.key] ?? 0), 0),
    }))
    .filter(r => r.value > 0);
  const accumTotal = accumRows.reduce((s, r) => s + r.value, 0);

  // Panel colapsable con resumen inline y tablas de desglose
  return (
    <details className="eq-cost-breakdown">
      <summary className="eq-cost-breakdown-summary">
        <span className="eq-cost-bd-chevron">▶</span>
        <span className="eq-modal-section-label" style={{margin:0}}>COSTO POR UNIDAD</span>
        <span className="eq-modal-cost-value" style={{marginLeft:6}}>
          <span className="eq-cost-sign">$</span>
          <span>{unitTotal.toLocaleString('es-CO',{minimumFractionDigits:2})}</span>
        </span>
        {pos >= 0 && (
          <>
            <span style={{margin:'0 8px', opacity:0.3}}>·</span>
            <span className="eq-modal-section-label" style={{margin:0}}>ACUMULADO</span>
            <span className="eq-modal-cost-value" style={{marginLeft:6}}>
              <span className="eq-cost-sign">$</span>
              <span>{accumTotal.toLocaleString('es-CO',{minimumFractionDigits:2})}</span>
            </span>
          </>
        )}
      </summary>

      {/* Tabla de costos por categoría — unidad */}
      <div className="eq-cost-breakdown-body">
        <div className="eq-cost-bd-section-title">COSTO POR UNIDAD</div>
        {unitRows.length > 0
          ? unitRows.map(r => <BdRow key={r.key} label={r.label} value={r.value} total={unitTotal} hex={r.hex} />)
          : <div className="eq-cost-bd-section-title" style={{ opacity: 0.4 }}>Sin costos asignados</div>
        }
        <div className="eq-cost-bd-subtotal">
          <span>Total unidad</span>
          <span>{fmt(unitTotal)}/m³</span>
        </div>
      </div>

      {/* Tabla de costos acumulados hasta este equipo en el proceso */}
      {pos >= 0 && (
        <div className="eq-cost-breakdown-body eq-cost-breakdown-body--shared">
          <div className="eq-cost-bd-section-title">
            COSTO ACUMULADO HASTA {label.toUpperCase()}
          </div>
          {accumRows.map(r => (
            <BdRow key={r.key} label={r.label} value={r.value} total={accumTotal} hex={r.hex} />
          ))}
          <div className="eq-cost-bd-subtotal">
            <span>Subtotal acumulado</span>
            <span>{fmt(accumTotal)}/m³</span>
          </div>
          <div className="eq-cost-bd-total">
            <span>TOTAL ACUMULADO</span>
            <span>{fmt(accumTotal)}/m³</span>
          </div>
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
// Panel de detalle de un equipo: ilustración SVG, parámetros, costos y gráfica
function EquipmentModalInner({ equipKey, eq, closing, onClose }: Props) {
  const statusColor = SC[eq.status];

  // Parámetro a graficar — usa chartParam del equipo o el primero de la lista
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

            {/* Costo operativo del checkpoint PDF */}
            {eq.cost && (
              <div className="eq-modal-cost-row">
                <span className="eq-modal-section-label" style={{ margin: 0 }}>COSTO OPERATIVO</span>
                <div>
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

            {/* Costos + desglose — una sola línea colapsable */}
            <CostBreakdownSection equipKey={equipKey} label={eq.label} />

            {/* Tabla de parámetros de proceso */}
            <div className="eq-modal-section-label" style={{ marginTop: eq.description ? 14 : 6 }}>PARÁMETROS</div>
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

            {/* Sección gráfico en vivo */}
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
