import { useEffect, useState } from 'react';
import {
  getGemEficiencia, getRoEficiencia,
  getUltimaLecturaRO, getUltimaLecturaPTAP,
  getCalidadMediciones,
  getBalanceHidrico,
} from '../../services/ptarClient';
import type { MedicionCalidad } from '../../services/ptarClient';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('en-CA');
}

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

function lastOf(arr: MedicionCalidad[], unidad: string): MedicionCalidad | undefined {
  return arr.filter(r => r.unidad_tratamiento === unidad && r.valor != null)
            .sort((a, b) => `${b.fecha}${b.turno}`.localeCompare(`${a.fecha}${a.turno}`))[0];
}

// ─── Status colors ────────────────────────────────────────────────────────────

type Status = 'good' | 'warn' | 'bad' | 'neutral';

function statusColor(s: Status) {
  return s === 'good' ? '#3fb950' : s === 'warn' ? '#e3b341' : s === 'bad' ? '#f85149' : '#8b949e';
}

function pHStatus(v: number | null): Status {
  if (v == null) return 'neutral';
  if (v < 5.5 || v > 9.5) return 'bad';
  if (v < 6.0 || v > 9.0) return 'warn';
  return 'good';
}

function sstMBRStatus(v: number | null): Status {
  if (v == null) return 'neutral';
  return v > 12 ? 'bad' : v > 5 ? 'warn' : 'good';
}

function recoveryStatus(v: number | null): Status {
  if (v == null) return 'neutral';
  return v >= 75 ? 'good' : v >= 60 ? 'warn' : 'bad';
}

function costoStatus(v: number | null, goodBelow: number, badAbove: number): Status {
  if (v == null) return 'neutral';
  return v <= goodBelow ? 'good' : v <= badAbove ? 'warn' : 'bad';
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
  gemM3:       number | null;
  roM3:        number | null;
  recoveryRO:  number | null;  // % = permeado/entrada * 100
  recoveryPTAP: number | null; // % PTAP
  pHVert:      number | null;
  pHVertFecha: string | null;
  sstMBR1:     number | null;
  sstMBRFecha: string | null;
  tmpMBR:      number | null;  // último TMP promedio de calidad
  caudalSemana: number | null; // m³ total últimos 7 días
  gemFecha:    string | null;
  roFecha:     string | null;
}

export default function RealKpiSection() {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const today = daysAgo(0);
    const d7    = daysAgo(7);

    Promise.allSettled([
      getGemEficiencia({ fecha_inicio: d7, fecha_fin: today }),
      getRoEficiencia({ fecha_inicio: d7, fecha_fin: today }),
      getUltimaLecturaRO(),
      getUltimaLecturaPTAP(),
      getCalidadMediciones({ parametro: 'pH',  fecha_inicio: d7, fecha_fin: today, limit: 100 }),
      getCalidadMediciones({ parametro: 'SST', fecha_inicio: d7, fecha_fin: today, limit: 100 }),
      getBalanceHidrico({ fecha_inicio: d7, fecha_fin: today, limit: 200 }),
    ]).then(([gemR, roR, roLectR, ptapLectR, pHR, sstR, balR]) => {
      // GEM $/m³ — promedio últimos 7 días
      const gemRows = gemR.status === 'fulfilled' ? gemR.value : [];
      const gemM3   = avg(gemRows.map(r => r.pesos_por_m3));
      const gemFecha = gemRows[gemRows.length - 1]?.fecha ?? null;

      // RO $/m³ — promedio últimos 7 días
      const roRows = roR.status === 'fulfilled' ? roR.value : [];
      const roM3   = avg(roRows.map(r => r.pesos_por_m3));
      const roFecha = roRows[roRows.length - 1]?.fecha ?? null;

      // Recovery RO — última lectura caudales RO
      const roLect = roLectR.status === 'fulfilled' ? roLectR.value : { c12: null, c13: null };
      // c12 = entrada, c13 = salida (permeado) — convención del sistema
      const recoveryRO = (roLect.c12 && roLect.c13 && roLect.c12 > 0)
        ? (roLect.c13 / roLect.c12) * 100 : null;

      // Recovery PTAP — última lectura
      const ptapLect = ptapLectR.status === 'fulfilled' ? ptapLectR.value : { entrada: null, permeado: null };
      const recoveryPTAP = (ptapLect.entrada && ptapLect.permeado && ptapLect.entrada > 0)
        ? (ptapLect.permeado / ptapLect.entrada) * 100 : null;

      // pH Vertimiento — último registro
      const pHRows  = pHR.status  === 'fulfilled' ? pHR.value  : [];
      const pHLast  = lastOf(pHRows, 'Vertimiento');
      const pHVert  = pHLast?.valor ?? null;
      const pHVertFecha = pHLast ? `${fmtDate(pHLast.fecha ?? null)} · ${pHLast.turno}` : null;

      // SST permeado MBR1 — último registro
      const sstRows  = sstR.status === 'fulfilled' ? sstR.value : [];
      const sstLast1 = lastOf(sstRows, 'MBR 1 Permeado');
      const sstLast2 = lastOf(sstRows, 'MBR 2 Permeado');
      const sstMBR1  = sstLast1?.valor ?? sstLast2?.valor ?? null;
      const sstFecha = sstLast1
        ? `${fmtDate(sstLast1.fecha ?? null)} · ${sstLast1.turno}`
        : sstLast2 ? `${fmtDate(sstLast2.fecha ?? null)} · ${sstLast2.turno}` : null;

      // Caudal semana — suma total agua limpia
      const balRows = balR.status === 'fulfilled' ? balR.value : [];
      const caudalSemana = balRows.reduce<number | null>((acc, r) => {
        const v = r.total_agua_limpia_m3;
        if (v == null) return acc;
        return (acc ?? 0) + v;
      }, null);

      if (cancelled) return;
      setData({
        gemM3, roM3, recoveryRO, recoveryPTAP,
        pHVert, pHVertFecha,
        sstMBR1, sstMBRFecha: sstFecha,
        tmpMBR: null,
        caudalSemana,
        gemFecha, roFecha,
      });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '24px 0', color: '#484f58', fontSize: 13, textAlign: 'center' }}>
        Cargando indicadores…
      </div>
    );
  }

  if (!data) return null;

  const tiles: TileProps[] = [
    // ── Costos ──────────────────────────────────────────────────────────────
    {
      label: 'GEM $/m³',
      icon: '💧',
      value: fmt(data.gemM3, 0, '$'),
      sub: 'por m³ tratado',
      hint: data.gemFecha ? `Promedio 7 días · último: ${fmtDate(data.gemFecha)}` : 'Promedio 7 días',
      status: costoStatus(data.gemM3, 400, 700),
      accent: '#3fb950',
    },
    {
      label: 'RO $/m³',
      icon: '🔵',
      value: fmt(data.roM3, 0, '$'),
      sub: 'por m³ tratado',
      hint: data.roFecha ? `Promedio 7 días · último: ${fmtDate(data.roFecha)}` : 'Promedio 7 días',
      status: costoStatus(data.roM3, 600, 1000),
      accent: '#d2a8ff',
    },
    // ── Proceso ─────────────────────────────────────────────────────────────
    {
      label: 'Recovery RO',
      icon: '♻️',
      value: fmt(data.recoveryRO, 1, '', '%'),
      sub: 'permeado / entrada',
      hint: 'Última lectura caudales RO',
      status: recoveryStatus(data.recoveryRO),
    },
    {
      label: 'Recovery PTAP',
      icon: '🏭',
      value: fmt(data.recoveryPTAP, 1, '', '%'),
      sub: 'permeado / entrada',
      hint: 'Última lectura caudales PTAP',
      status: recoveryStatus(data.recoveryPTAP),
    },
    // ── Calidad ─────────────────────────────────────────────────────────────
    {
      label: 'pH Vertimiento',
      icon: '🧪',
      value: fmt(data.pHVert, 2),
      sub: 'pH',
      hint: data.pHVertFecha ?? 'Sin datos recientes',
      status: pHStatus(data.pHVert),
    },
    {
      label: 'SST Permeado MBR',
      icon: '🔬',
      value: fmt(data.sstMBR1, 0, '', ' mg/L'),
      sub: 'sólidos suspendidos',
      hint: data.sstMBRFecha ?? 'Sin datos recientes',
      status: sstMBRStatus(data.sstMBR1),
    },
    // ── Volumen ─────────────────────────────────────────────────────────────
    {
      label: 'Agua tratada 7 días',
      icon: '📦',
      value: data.caudalSemana != null ? (data.caudalSemana / 1000).toFixed(1) : '—',
      sub: data.caudalSemana != null ? 'miles de m³' : '',
      hint: 'Total agua limpia últimos 7 días',
      status: data.caudalSemana != null ? (data.caudalSemana > 3000 ? 'good' : data.caudalSemana > 1500 ? 'warn' : 'bad') : 'neutral',
      accent: '#58a6ff',
    },
  ];

  return (
    <section className="dash-section">
      <div className="section-title" style={{ marginBottom: 12 }}>
        Indicadores Operacionales en Tiempo Real
        <span style={{ fontSize: 10, color: '#484f58', fontWeight: 400, marginLeft: 10 }}>
          últimos 7 días
        </span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
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
