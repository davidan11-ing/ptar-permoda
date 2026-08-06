import { useEffect, useState } from 'react';
import {
  getGemEficiencia, getRoEficiencia,
  getBalanceHidrico,
} from '../../services/ptarClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avg(arr: (number | null | undefined)[]): number | null {
  const valid = arr.filter((v): v is number => v != null && !isNaN(v));
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

function fmt(v: number | null, decimals = 1, prefix = '', suffix = ''): string {
  if (v == null) return '—';
  return `${prefix}${v.toFixed(decimals)}${suffix}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}


function costoStatus(v: number | null, goodBelow: number, badAbove: number): Status {
  if (v == null) return 'neutral';
  return v <= goodBelow ? 'good' : v <= badAbove ? 'warn' : 'bad';
}

// ─── Status colors ────────────────────────────────────────────────────────────

type Status = 'good' | 'warn' | 'bad' | 'neutral';

function statusColor(s: Status) {
  return s === 'good' ? '#3fb950' : s === 'warn' ? '#e3b341' : s === 'bad' ? '#f85149' : '#8b949e';
}

// ─── KpiTile ──────────────────────────────────────────────────────────────────

interface TileProps {
  label: string;
  value: string;
  sub?: string;
  hint?: string;
  status: Status;
  icon: string;
  accent?: string;
}

function KpiTile({ label, value, sub, hint, status, icon, accent }: TileProps) {
  const col = accent ?? statusColor(status);
  return (
    <div style={{
      background: '#161b22',
      border: '1px solid #21262d',
      borderLeft: `3px solid ${col}`,
      borderRadius: 10,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          {label}
        </span>
        <span style={{
          marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%',
          background: statusColor(status), flexShrink: 0,
        }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace', color: col, lineHeight: 1 }}>
          {value}
        </span>
        {sub && <span style={{ fontSize: 12, color: '#8b949e' }}>{sub}</span>}
      </div>
      {hint && <span style={{ fontSize: 10, color: '#484f58' }}>{hint}</span>}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface KpiData {
  gemM3:         number | null;
  roM3:          number | null;
  permeadoRO:    number | null;  // m³ totales permeado RO1 en el período
  recoveryPct:   number | null;  // % recuperación RO (promedio eficiencia_ro_pct)
  caudalPeriodo: number | null;
  gemFecha:      string | null;
  roFecha:       string | null;
}

interface Props { fechaInicio: string; fechaFin: string; }

export default function RealKpiSection({ fechaInicio, fechaFin }: Props) {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.allSettled([
      getGemEficiencia({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
      getRoEficiencia({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
      getBalanceHidrico({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: 2000 }),
    ]).then(([gemR, roR, balR]) => {
      // GEM $/m³ — promedio del período
      const gemRows = gemR.status === 'fulfilled' ? gemR.value : [];
      const gemM3   = avg(gemRows.map(r => r.pesos_por_m3));
      const gemFecha = gemRows[gemRows.length - 1]?.fecha ?? null;

      // RO $/m³ — promedio del período
      const roRows = roR.status === 'fulfilled' ? roR.value : [];
      const roM3   = avg(roRows.map(r => r.pesos_por_m3));
      const roFecha = roRows[roRows.length - 1]?.fecha ?? null;

      // Balance — suma permeado RO1, total agua limpia y % recuperación del período
      const balRows = balR.status === 'fulfilled' ? balR.value : [];
      const permeadoRO = balRows.reduce<number | null>((acc, r) => {
        const v = r.permeado_ro1;
        if (v == null) return acc;
        return (acc ?? 0) + v;
      }, null);
      const caudalPeriodo = balRows.reduce<number | null>((acc, r) => {
        const v = r.total_agua_limpia_m3;
        if (v == null) return acc;
        return (acc ?? 0) + v;
      }, null);
      const recoveryPct = avg(balRows.map(r => r.eficiencia_ro_pct));

      if (cancelled) return;
      setData({ gemM3, roM3, permeadoRO, recoveryPct, caudalPeriodo, gemFecha, roFecha });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fechaInicio, fechaFin]);

  if (loading) {
    return (
      <div style={{ padding: '24px 0', color: '#484f58', fontSize: 13, textAlign: 'center' }}>
        Cargando indicadores…
      </div>
    );
  }

  if (!data) return null;

  const periodoHint = `${fmtDate(fechaInicio)} → ${fmtDate(fechaFin)}`;

  const tiles: TileProps[] = [
    // ── Costos ──────────────────────────────────────────────────────────────
    {
      label: 'GEM $/m³',
      icon: '💧',
      value: fmt(data.gemM3, 0, '$'),
      sub: 'por m³ tratado',
      hint: data.gemFecha ? `Promedio período · último: ${fmtDate(data.gemFecha)}` : 'Promedio período',
      status: costoStatus(data.gemM3, 400, 700),
      accent: '#3fb950',
    },
    {
      label: 'RO $/m³',
      icon: '🔵',
      value: fmt(data.roM3, 0, '$'),
      sub: 'por m³ tratado',
      hint: data.roFecha ? `Promedio período · último: ${fmtDate(data.roFecha)}` : 'Promedio período',
      status: costoStatus(data.roM3, 600, 1000),
      accent: '#d2a8ff',
    },
    // ── Proceso ─────────────────────────────────────────────────────────────
    {
      label: 'Permeado RO',
      icon: '♻️',
      value: data.permeadoRO != null ? data.permeadoRO.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : '—',
      sub: data.permeadoRO != null ? 'm³ recuperados' : '',
      hint: `Total permeado RO1 · ${periodoHint}`,
      status: data.permeadoRO != null ? (data.permeadoRO > 500 ? 'good' : data.permeadoRO > 100 ? 'warn' : 'bad') : 'neutral',
      accent: '#58a6ff',
    },
    // ── Recovery RO ─────────────────────────────────────────────────────────
    {
      label: 'Recovery RO',
      icon: '📊',
      value: fmt(data.recoveryPct, 1, '', '%'),
      sub: 'recuperación promedio',
      hint: `Promedio eficiencia_ro_pct · ${periodoHint}`,
      status: data.recoveryPct != null
        ? (data.recoveryPct >= 70 ? 'good' : data.recoveryPct >= 50 ? 'warn' : 'bad')
        : 'neutral',
      accent: '#58a6ff',
    },
    // ── Volumen ─────────────────────────────────────────────────────────────
    {
      label: 'Agua tratada período',
      icon: '📦',
      value: data.caudalPeriodo != null ? (data.caudalPeriodo / 1000).toFixed(1) : '—',
      sub: data.caudalPeriodo != null ? 'miles de m³' : '',
      hint: `Total agua limpia · ${periodoHint}`,
      status: data.caudalPeriodo != null
        ? (data.caudalPeriodo > 3000 ? 'good' : data.caudalPeriodo > 1500 ? 'warn' : 'bad')
        : 'neutral',
      accent: '#58a6ff',
    },
  ];

  return (
    <section className="dash-section">
      <div className="section-title" style={{ marginBottom: 12 }}>
        Indicadores Operacionales en Tiempo Real
        <span style={{ fontSize: 10, color: '#484f58', fontWeight: 400, marginLeft: 10 }}>
          {periodoHint}
        </span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 280px))',
        justifyContent: 'center',
        gap: 12,
      }}>
        {tiles.map(t => <KpiTile key={t.label} {...t} />)}
      </div>

      {/* Leyenda semáforo */}
      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 10, color: '#484f58' }}>
        <span><span style={{ color: '#3fb950' }}>●</span> Normal</span>
        <span><span style={{ color: '#e3b341' }}>●</span> Advertencia</span>
        <span><span style={{ color: '#f85149' }}>●</span> Fuera de rango</span>
        <span><span style={{ color: '#8b949e' }}>●</span> Sin datos</span>
      </div>
    </section>
  );
}
