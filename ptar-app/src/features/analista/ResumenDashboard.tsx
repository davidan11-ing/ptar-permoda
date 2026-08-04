import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGranularidad } from '../../hooks/useGranularidad';
import {
  getGemEficiencia,
  getRoEficiencia,
  getBalanceHidrico,
  getCalidadMediciones,
  getConsumoQuimicoDiario,
  type GemEficienciaRow,
  type RoEficienciaRow,
  type BalanceHidricoRow,
  type MedicionCalidad,
  type ConsumoQuimicoDiaRow,
} from '../../services/ptarClient';
import { ROUTES } from '../../lib/routes';

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(arr: (number | null | undefined)[]): number | null {
  const v = arr.filter((x): x is number => x != null && !isNaN(x) && x > 0);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function sum(arr: (number | null | undefined)[]): number {
  return arr.reduce<number>((a, b) => a + (b ?? 0), 0);
}

function fmt(v: number | null, dec = 0, pre = '', suf = '') {
  return v == null ? '—' : `${pre}${v.toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec })}${suf}`;
}

function fmtCOP(v: number | null) {
  if (v == null) return '—';
  return '$' + v.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

type Semaforo = 'ok' | 'warn' | 'bad' | 'nd';
const SEMColor: Record<Semaforo, string> = { ok: '#3fb950', warn: '#e3b341', bad: '#f85149', nd: '#484f58' };

// ── Tipos internos ────────────────────────────────────────────────────────────

interface KPIs {
  // Balance
  aguaLimpiaTotal: number | null;
  avgDiarioM3:     number | null;
  diasConDatos:    number;
  caudalGemAvg:    number | null;
  // Costos
  gemPorM3:    number | null;
  roPorM3:     number | null;
  costoTotal:  number | null;
  topReactivo: { nombre: string; costo: number } | null;
  // Calidad
  pHVert:      number | null;
  pHFecha:     string | null;
  dqoRemPct:   number | null;
  sstMBR:      number | null;
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricRow({ label, value, sem, hint }: {
  label: string; value: string; sem?: Semaforo; hint?: string;
}) {
  const col = sem ? SEMColor[sem] : '#e6edf3';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '7px 0', borderBottom: '1px solid #21262d' }}>
      <span style={{ fontSize: 12, color: '#8b949e' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: col }}>{value}</span>
        {hint && <div style={{ fontSize: 10, color: '#484f58', marginTop: 1 }}>{hint}</div>}
      </div>
    </div>
  );
}

function SectionCard({ title, color, icon, href, children }: {
  title: string; color: string; icon: string; href: string; children: React.ReactNode;
}) {
  const nav = useNavigate();
  return (
    <div style={{ background: '#161b22', border: `1px solid ${color}44`,
      borderTop: `3px solid ${color}`, borderRadius: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px', background: '#0d1117' }}>
        <span style={{ color, fontWeight: 700, fontSize: 13, letterSpacing: '0.06em' }}>
          {icon} {title}
        </span>
        <button onClick={() => nav(href)} style={{ background: 'none', border: `1px solid ${color}66`,
          color, fontSize: 10, padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>
          Ver dashboard →
        </button>
      </div>
      <div style={{ padding: '8px 16px 12px', flex: 1 }}>
        {children}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  // Si se pasa, solo se muestran las cards indicadas ('balance' | 'calidad' | 'costos')
  sections?: string[];
  // Si se pasa, usa estas fechas fijas (modo Visualizador); si no, usa selector interactivo
  fechaInicioFixed?: string;
  fechaFinFixed?: string;
}

export default function ResumenDashboard({ sections, fechaInicioFixed, fechaFinFixed }: Props = {}) {
  const hook = useGranularidad({ autoInit: !fechaInicioFixed });
  const fechaInicio = fechaInicioFixed ?? hook.fechaInicio;
  const fechaFin    = fechaFinFixed    ?? hook.fechaFin;
  const { draftInicio, draftFin, handleFechaInicio, handleFechaFin, commitFechaInicio, commitFechaFin } = hook;
  const isFixed = !!fechaInicioFixed;
  const show = (s: string) => !sections || sections.includes(s);

  const [kpis,    setKpis]    = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!fechaInicio || !fechaFin) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.allSettled([
      getGemEficiencia({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
      getRoEficiencia({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
      getBalanceHidrico({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: 2000 }),
      getCalidadMediciones({ parametro: 'pH',  fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: 300 }),
      getCalidadMediciones({ parametro: 'DQO', fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: 300 }),
      getCalidadMediciones({ parametro: 'SST', fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: 300 }),
      getConsumoQuimicoDiario({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
    ]).then(([gemR, roR, balR, pHR, dqoR, sstR, costoR]) => {
      if (cancelled) return;

      const gemRows  = gemR.status  === 'fulfilled' ? (gemR.value  as GemEficienciaRow[])    : [];
      const roRows   = roR.status   === 'fulfilled' ? (roR.value   as RoEficienciaRow[])      : [];
      const balRows  = balR.status  === 'fulfilled' ? (balR.value  as BalanceHidricoRow[])    : [];
      const pHRows   = pHR.status   === 'fulfilled' ? (pHR.value   as MedicionCalidad[])      : [];
      const dqoRows  = dqoR.status  === 'fulfilled' ? (dqoR.value  as MedicionCalidad[])      : [];
      const sstRows  = sstR.status  === 'fulfilled' ? (sstR.value  as MedicionCalidad[])      : [];
      const costoRows = costoR.status === 'fulfilled' ? (costoR.value as ConsumoQuimicoDiaRow[]) : [];

      // ── Balance ──
      const aguaLimpiaTotal = sum(balRows.map(r => r.total_agua_limpia_m3)) || null;
      const fechasUnicas    = new Set(balRows.map(r => r.fecha)).size;
      const avgDiarioM3     = aguaLimpiaTotal && fechasUnicas ? aguaLimpiaTotal / fechasUnicas : null;
      const caudalGemAvg    = avg(gemRows.map(r => r.caudal_m3));

      // ── Costos ──
      const gemPorM3   = avg(gemRows.map(r => r.pesos_por_m3));
      const roPorM3    = avg(roRows.map(r => r.pesos_por_m3));
      const costoTotal = sum(costoRows.map(r => r.costo_dia)) || null;

      // Reactivo con mayor costo
      const costoMap: Record<string, number> = {};
      for (const r of costoRows) {
        if (r.costo_dia) costoMap[r.producto_nombre] = (costoMap[r.producto_nombre] ?? 0) + r.costo_dia;
      }
      const topEntry = Object.entries(costoMap).sort((a, b) => b[1] - a[1])[0];
      const topReactivo = topEntry ? { nombre: topEntry[0], costo: topEntry[1] } : null;

      // ── Calidad ──
      const pHVert  = pHRows
        .filter(r => r.unidad_tratamiento?.toLowerCase().includes('vertimiento'))
        .sort((a, b) => `${b.fecha}${b.turno}`.localeCompare(`${a.fecha}${a.turno}`))[0];

      const dqoEntrada = avg(
        dqoRows.filter(r => r.unidad_tratamiento?.toLowerCase().includes('afluente') ||
                            r.unidad_tratamiento?.toLowerCase().includes('entrada'))
                .map(r => r.valor)
      );
      const dqoSalida  = avg(
        dqoRows.filter(r => r.unidad_tratamiento?.toLowerCase().includes('vertimiento') ||
                            r.unidad_tratamiento?.toLowerCase().includes('efluente'))
                .map(r => r.valor)
      );
      const dqoRemPct = (dqoEntrada && dqoSalida && dqoEntrada > 0)
        ? ((dqoEntrada - dqoSalida) / dqoEntrada) * 100 : null;

      const sstMBR = sstRows
        .filter(r => r.unidad_tratamiento?.toLowerCase().includes('mbr'))
        .sort((a, b) => `${b.fecha}${b.turno}`.localeCompare(`${a.fecha}${a.turno}`))[0]?.valor ?? null;

      setKpis({
        aguaLimpiaTotal, avgDiarioM3, diasConDatos: fechasUnicas, caudalGemAvg,
        gemPorM3, roPorM3, costoTotal, topReactivo,
        pHVert: pHVert?.valor ?? null,
        pHFecha: pHVert ? `${pHVert.fecha} · ${pHVert.turno}` : null,
        dqoRemPct, sstMBR,
      });
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [fechaInicio, fechaFin]);

  // Semáforos
  const semPH  = useMemo((): Semaforo => {
    if (kpis?.pHVert == null) return 'nd';
    if (kpis.pHVert < 5.5 || kpis.pHVert > 9.5) return 'bad';
    if (kpis.pHVert < 6.0 || kpis.pHVert > 9.0) return 'warn';
    return 'ok';
  }, [kpis?.pHVert]);

  const semDQO = useMemo((): Semaforo => {
    if (kpis?.dqoRemPct == null) return 'nd';
    return kpis.dqoRemPct >= 80 ? 'ok' : kpis.dqoRemPct >= 60 ? 'warn' : 'bad';
  }, [kpis?.dqoRemPct]);

  const semSST = useMemo((): Semaforo => {
    if (kpis?.sstMBR == null) return 'nd';
    return kpis.sstMBR <= 5 ? 'ok' : kpis.sstMBR <= 12 ? 'warn' : 'bad';
  }, [kpis?.sstMBR]);

  const semGEM = useMemo((): Semaforo => {
    if (kpis?.gemPorM3 == null) return 'nd';
    return kpis.gemPorM3 <= 400 ? 'ok' : kpis.gemPorM3 <= 700 ? 'warn' : 'bad';
  }, [kpis?.gemPorM3]);

  const semRO = useMemo((): Semaforo => {
    if (kpis?.roPorM3 == null) return 'nd';
    return kpis.roPorM3 <= 600 ? 'ok' : kpis.roPorM3 <= 1000 ? 'warn' : 'bad';
  }, [kpis?.roPorM3]);

  return (
    <div style={{ padding: '0 0 32px' }}>

      {/* ── Cabecera ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e6edf3' }}>
            Resumen Ejecutivo
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8b949e' }}>
            Consolidado Balance · Calidad · Costos
          </p>
        </div>

        {/* Selector de fechas — solo en modo interactivo (Analista) */}
        {!isFixed && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <label style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase' }}>Desde</label>
              <input type="date" value={draftInicio}
                onChange={e => handleFechaInicio(e.target.value)}
                onBlur={e  => commitFechaInicio(e.target.value)}
                style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <label style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase' }}>Hasta</label>
              <input type="date" value={draftFin}
                onChange={e => handleFechaFin(e.target.value)}
                onBlur={e  => commitFechaFin(e.target.value)}
                style={inputStyle} />
            </div>
          </div>
        )}
        {isFixed && (
          <span style={{ fontSize: 11, color: '#484f58' }}>{fechaInicio} → {fechaFin}</span>
        )}
      </div>

      {/* ── Leyenda semáforo ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 16, fontSize: 10, color: '#484f58' }}>
        <span><span style={{ color: '#3fb950' }}>●</span> Normal</span>
        <span><span style={{ color: '#e3b341' }}>●</span> Atención</span>
        <span><span style={{ color: '#f85149' }}>●</span> Fuera de rango</span>
        <span><span style={{ color: '#484f58' }}>●</span> Sin datos</span>
      </div>

      {error && (
        <div style={{ color: '#f85149', fontSize: 12, marginBottom: 12 }}>{error}</div>
      )}

      {loading ? (
        <div style={{ color: '#484f58', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
          Cargando resumen…
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${[show('balance'),show('calidad'),show('costos')].filter(Boolean).length || 1}, 1fr)`, gap: 16 }}>

          {/* ── Balance Hídrico ── */}
          {show('balance') && <SectionCard title="BALANCE HÍDRICO" color="#58a6ff" icon="💧" href={ROUTES.ENCARGADO_BALANCE}>
            <MetricRow
              label="Agua limpia total"
              value={fmt(kpis?.aguaLimpiaTotal, 0, '', ' m³')}
            />
            <MetricRow
              label="Promedio diario"
              value={fmt(kpis?.avgDiarioM3, 1, '', ' m³/día')}
              hint={kpis?.diasConDatos ? `${kpis.diasConDatos} días con registros` : undefined}
            />
            <MetricRow
              label="Caudal GEM prom."
              value={fmt(kpis?.caudalGemAvg, 1, '', ' m³/turno')}
            />
            <MetricRow
              label="Periodo analizado"
              value={`${fechaInicio} → ${fechaFin}`}
            />
          </SectionCard>}

          {/* ── Calidad del Agua ── */}
          {show('calidad') && <SectionCard title="CALIDAD DEL AGUA" color="#d29922" icon="🧪" href={ROUTES.ENCARGADO_CALIDAD}>
            <MetricRow
              label="pH Vertimiento"
              value={fmt(kpis?.pHVert, 2)}
              sem={semPH}
              hint={kpis?.pHFecha ?? undefined}
            />
            <MetricRow
              label="Remoción DQO"
              value={fmt(kpis?.dqoRemPct, 1, '', ' %')}
              sem={semDQO}
              hint="Afluente → Vertimiento"
            />
            <MetricRow
              label="SST Permeado MBR"
              value={fmt(kpis?.sstMBR, 0, '', ' mg/L')}
              sem={semSST}
            />
          </SectionCard>}

          {/* ── Costos Químicos ── */}
          {show('costos') && <SectionCard title="COSTOS QUÍMICOS" color="#3fb950" icon="💰" href={ROUTES.ENCARGADO_COSTOS}>
            <MetricRow
              label="GEM $/m³ prom."
              value={fmt(kpis?.gemPorM3, 0, '$')}
              sem={semGEM}
              hint="Pesos colombianos"
            />
            <MetricRow
              label="RO $/m³ prom."
              value={fmt(kpis?.roPorM3, 0, '$')}
              sem={semRO}
            />
            <MetricRow
              label="Costo total periodo"
              value={fmtCOP(kpis?.costoTotal)}
            />
            {kpis?.topReactivo && (
              <MetricRow
                label="Mayor consumo"
                value={fmtCOP(kpis.topReactivo.costo)}
                hint={kpis.topReactivo.nombre}
              />
            )}
          </SectionCard>}

        </div>
      )}
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: '#0d1117',
  border: '1px solid #30363d',
  borderRadius: 6,
  color: '#e6edf3',
  fontSize: 12,
  padding: '5px 8px',
  outline: 'none',
};
