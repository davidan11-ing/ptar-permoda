import type { KpiRow, RemocionResumen } from '../hooks/useCalidadKpis';

interface Props {
  kpis: KpiRow[];
  remociones: RemocionResumen[];
  loading: boolean;
}

/* ── Helpers de color ──────────────────────────────────────────────────────── */
function kpiAccent(row: KpiRow) {
  if (row.enLimite === null) return { color: '#8b949e', bg: '#21262d', bar: '#30363d' };
  return row.enLimite
    ? { color: '#3fb950', bg: '#0d2d1a', bar: '#238636' }
    : { color: '#f85149', bg: '#2d1515', bar: '#da3633' };
}
function pctColor(pct: number | null) {
  if (pct === null) return '#484f58';
  if (pct >= 95) return '#3fb950';
  if (pct >= 80) return '#d29922';
  return '#f85149';
}
function remColor(pct: number) {
  if (pct >= 75) return '#3fb950';
  if (pct >= 40) return '#d29922';
  if (pct >= 0)  return '#f0883e';
  return '#f85149';
}

/* ── Skeleton card ─────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{
      border: '1px solid #30363d', borderRadius: 10,
      padding: '18px 16px', minHeight: 130,
      background: 'linear-gradient(90deg,#161b22 25%,#21262d 50%,#161b22 75%)',
      backgroundSize: '200% 100%',
      animation: 'cal-shimmer 1.4s infinite',
    } as React.CSSProperties} />
  );
}

/* ── Componente principal ──────────────────────────────────────────────────── */
export default function KpiCompliancePanel({ kpis, remociones, loading }: Props) {
  return (
    <div>
      {/* ── Encabezado del panel ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e6edf3', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Cumplimiento Normativo · Vertimiento
        </h2>
        <span style={{ fontSize: 11, color: '#484f58' }}>Res. 0631 / 2015 · promedio del período</span>
      </div>

      {/* ── Grid de 4 KPI cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 14,
      }}>
        {loading
          ? [0, 1, 2, 3].map(i => <SkeletonCard key={i} />)
          : kpis.map(row => {
              const { color, bg, bar } = kpiAccent(row);
              const pct = row.pctCumplimiento;
              return (
                <div key={row.param} style={{
                  background: bg,
                  border: `1px solid ${color}30`,
                  borderRadius: 10,
                  padding: '16px 16px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Nombre parámetro */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {row.label}
                  </div>

                  {/* Valor promedio — número grande */}
                  <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {row.avg !== null ? row.avg : '—'}
                    {row.avg !== null && row.unidad
                      ? <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 4, color: '#8b949e' }}>{row.unidad}</span>
                      : null}
                  </div>

                  {/* Barra de cumplimiento */}
                  <div style={{ height: 4, background: '#21262d', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct ?? 0}%`,
                      background: bar,
                      borderRadius: 3,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>

                  {/* % cumplimiento */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: pctColor(pct), fontVariantNumeric: 'tabular-nums' }}>
                      {pct !== null ? `${pct}%` : '—'}
                    </span>
                    <span style={{ fontSize: 10, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.05em' }}>cumplimiento</span>
                  </div>

                  {/* Metadata */}
                  <div style={{ fontSize: 10, color: '#484f58', lineHeight: 1.4, marginTop: 2 }}>
                    {row.n > 0 ? `${row.n} muestras` : 'sin datos'}<br />
                    límite {row.limiteStr}
                  </div>

                  {/* Badge estado (esquina superior derecha) */}
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    width: 8, height: 8, borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 6px ${color}80`,
                  }} />
                </div>
              );
            })}
      </div>

      {/* ── Fila de eficiencias de remoción global ── */}
      {remociones.length > 0 && (
        <div style={{
          background: '#0d1117',
          border: '1px solid #21262d',
          borderRadius: 8,
          padding: '12px 16px',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Eficiencia de remoción global del período
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {remociones.map(r => {
              const barPct = Math.min(Math.abs(r.pct_global_avg), 100);
              const c = remColor(r.pct_global_avg);
              return (
                <div key={r.parametro} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 52px', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: '#c9d1d9', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.parametro}
                  </span>
                  <div style={{ height: 6, background: '#21262d', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${barPct}%`,
                      background: c, borderRadius: 3,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {r.pct_global_avg > 0 ? '+' : ''}{r.pct_global_avg}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
