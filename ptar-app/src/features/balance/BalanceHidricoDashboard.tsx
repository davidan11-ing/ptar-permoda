import { useState, useMemo, useEffect } from 'react';
import {
  Bar, Line, LabelList,
  ComposedChart, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine,
} from 'recharts';
import { useBalanceData } from './hooks/useBalanceData';
import { getReporteBalanceHtmlUrl, getGemEficiencia, type BalanceHidricoRow, type GemEficienciaRow } from '../../services/ptarClient';
import InformeBalanceModal from './InformeBalanceModal';
import GranularidadSelector from '../../components/shared/GranularidadSelector';
import { useGranularidad } from '../../hooks/useGranularidad';
import { agruparPorGranularidad } from '../../lib/utils/agruparTemporal';

const TOOLTIP_STYLE = {
  contentStyle: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 },
  labelStyle:   { color: '#e6edf3', marginBottom: 4 },
};
const AXIS_TICK = { fill: '#8b949e', fontSize: 10 };
const fmt = (v: string) => v;

const BALANCE_SUM_FIELDS: (keyof BalanceHidricoRow)[] = [
  'ingreso_ptap', 'potable_ptap', 'carrotanques_m3', 'mulas_funza_m3',
  'entrada_ro1', 'permeado_ro1', 'rechazo_ro1',
  'permeado_mbr1', 'permeado_mbr2', 'envio_th',
  'acueducto_m3', 'total_agua_limpia_m3', 'consumo_gem_m3',
  'lavanderia_m3', 'tintoreria_m3', 'rotativa_m3',
  'und_efectivas', 'kg_tela', 'm_tela',
];
const BALANCE_AVG_FIELDS: (keyof BalanceHidricoRow)[] = [
  'eficiencia_ro_pct', 'indicador_lav_l_und', 'indicador_tin_l_kg', 'indicador_rot_l_m',
];

const DATOS_CAMPOS: (keyof BalanceHidricoRow)[] = [
  'total_agua_limpia_m3', 'acueducto_m3', 'entrada_ro1',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtM3     = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);
const fmtFull   = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 0 });
const fmtDec1   = (v: number | null) => v != null ? v.toFixed(1) : '—';

function KpiCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="dash-card" style={{ padding: '14px 18px', textAlign: 'center', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: '#484f58', marginTop: 2 }}>{unit}</div>
    </div>
  );
}

function SeccionHeader({ numero, titulo, color, textColor = '#1c2128' }: {
  numero: number; titulo: string; color: string; textColor?: string;
}) {
  return (
    <div style={{
      background: color, color: textColor,
      fontWeight: 700, fontSize: 13,
      padding: '7px 16px', marginBottom: 16, borderRadius: 4,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ opacity: 0.5, fontSize: 11, fontWeight: 400 }}>S{numero}</span>
      {titulo}
    </div>
  );
}

function ChartPending({ titulo, alto = 200 }: { titulo: string; alto?: number }) {
  return (
    <div className="dash-card" style={{
      padding: '16px', height: alto + 40,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      border: '1px dashed #30363d', opacity: 0.6,
    }}>
      <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 8 }}>{titulo}</div>
      <div style={{ fontSize: 10, color: '#484f58' }}>En construcción</div>
    </div>
  );
}

const TURNO_NUM: Record<string, number> = { noche: 1, 'mañana': 2, tarde: 3 };

// Meta indicador $/m³ tratamiento GEM — actualizar cuando se defina el objetivo 2026
const GEM_META_M3 = 1800;

function SquareDot(props: any) {
  const { cx, cy, fill } = props;
  if (cx == null || cy == null) return null;
  return <rect x={cx - 3} y={cy - 3} width={6} height={6} fill={fill || '#000'} />;
}

function TablaResumen({ titulo, cabeceras, filas, colorHead = '#DAE3F3' }: {
  titulo?: string;
  cabeceras: string[];
  filas: (string | number | null)[][];
  colorHead?: string;
}) {
  return (
    <div className="dash-card" style={{ padding: '8px 12px', overflow: 'auto' }}>
      {titulo && (
        <div style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
          background: colorHead, color: '#1c2128', padding: '3px 8px', marginBottom: 6, borderRadius: 3,
        }}>
          {titulo}
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
        <thead>
          <tr>
            {cabeceras.map((h, i) => (
              <th key={i} style={{
                padding: '3px 8px', textAlign: i === 0 ? 'left' : 'center',
                color: '#8b949e', fontWeight: 600, borderBottom: '1px solid #30363d',
                whiteSpace: 'nowrap',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, ri) => (
            <tr key={ri} style={{ borderBottom: '1px solid #21262d30' }}>
              {fila.map((celda, ci) => (
                <td key={ci} style={{
                  padding: '3px 8px', textAlign: ci === 0 ? 'left' : 'center',
                  color: '#e6edf3', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                }}>
                  {celda ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Benchmark estático Tintorería ─────────────────────────────────────────────

function BenchmarkTintoreria() {
  const rows: { nivel: string; desc: string; rango: string; color: string }[] = [
    { nivel: 'Muy Ineficiente',        desc: 'Práctica obsoleta',  rango: '> 150 L/Kg', color: '#5f1010' },
    { nivel: 'Promedio Industria',     desc: 'Convencional',       rango: '100 – 150',   color: '#3d3010' },
    { nivel: 'Buen Desempeño',         desc: 'Planta Moderna',     rango: '80 – 100',    color: '#2a3a10' },
    { nivel: 'Proceso Optimizado',     desc: 'Best Practice',      rango: '50 – 80',     color: '#1a3a15' },
    { nivel: 'Excelencia Mundial',     desc: 'Top Performers',     rango: '< 50 L/Kg',   color: '#0e3d0e' },
  ];
  return (
    <div className="dash-card" style={{ padding: '10px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#8b949e', marginBottom: 8, textTransform: 'uppercase' }}>
        Benchmark Mundial Tintorería
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '4px 8px', marginBottom: 3, borderRadius: 4, background: r.color,
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#e6edf3' }}>{r.nivel}</div>
            <div style={{ fontSize: 9, color: '#8b949e' }}>{r.desc}</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#70AD47', fontVariantNumeric: 'tabular-nums' }}>
            {r.rango}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function BalanceHidricoDashboard() {
  const {
    granularidad, setGranularidad,
    fechaInicio, fechaFin,
    handleFechaInicio, handleFechaFin,
    draftInicio, draftFin, commitFechaInicio, commitFechaFin,
  } = useGranularidad();

  const [turnoFiltro,    setTurnoFiltro]    = useState('');
  const [quitarSinDatos, setQuitarSinDatos] = useState(true);
  const [informeAbierto,  setInformeAbierto]  = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const turnoNum = turnoFiltro ? Number(turnoFiltro) : undefined;
  const { data, loading, error } = useBalanceData(fechaInicio, fechaFin, turnoNum);

  const agrupado = useMemo(() => {
    const base = agruparPorGranularidad(data, {
      gran: granularidad,
      getFecha:  r => r.fecha,
      getTurno:  r => r.turno,
      sumFields: BALANCE_SUM_FIELDS,
      avgFields: BALANCE_AVG_FIELDS,
    });
    if (!quitarSinDatos) return base;
    return base.filter(r =>
      DATOS_CAMPOS.some(k => (r as Record<string, unknown>)[k as string] as number > 0)
    );
  }, [data, granularidad, quitarSinDatos]);

  // S5 — agrupado extendido con totales calculados
  const agrupadoS5 = useMemo(() => agrupado.map(r => {
    const n = (k: string) => (r as Record<string, unknown>)[k] as number || 0;
    return {
      ...r,
      total_a_tratar:
        n('acueducto_m3') + n('rotativa_m3') + n('tintoreria_m3') + n('lavanderia_m3'),
      total_tratado_osmosis:
        n('permeado_ro1') + n('permeado_mbr1') + n('permeado_mbr2'),
    };
  }), [agrupado]);

  // S6 — agrupado con permeado_mbr combinado
  const agrupadoS6 = useMemo(() => agrupadoS5.map(r => {
    const n = (k: string) => (r as Record<string, unknown>)[k] as number || 0;
    return { ...r, permeado_mbr: n('permeado_mbr1') + n('permeado_mbr2') };
  }), [agrupadoS5]);

  // S6 — pie distribución tratabilidad (totales período)
  const pieS6 = useMemo(() => {
    const sum = (k: keyof BalanceHidricoRow) =>
      data.reduce((acc, r) => acc + (Number(r[k]) || 0), 0);
    return [
      { name: 'Tratado GEM',   value: sum('consumo_gem_m3'),                        color: '#9DC3E6' },
      { name: 'Permeado MBRs', value: sum('permeado_mbr1') + sum('permeado_mbr2'),  color: '#FFE699' },
      { name: 'Salida RO',     value: sum('permeado_ro1')  + sum('rechazo_ro1'),     color: '#A9D18E' },
    ].filter(d => d.value > 0);
  }, [data]);

  // S9 — datos GEM eficiencia (pesos_por_m3)
  const [gemRows, setGemRows] = useState<GemEficienciaRow[]>([]);
  useEffect(() => {
    if (!fechaInicio || !fechaFin) return;
    getGemEficiencia({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })
      .then(setGemRows)
      .catch(() => {});
  }, [fechaInicio, fechaFin]);

  const gemAgrupado = useMemo(() => agruparPorGranularidad(gemRows, {
    gran:      granularidad,
    getFecha:  r => r.fecha,
    getTurno:  r => TURNO_NUM[r.turno ?? ''] ?? 1,
    sumFields: ['caudal_m3'] as (keyof GemEficienciaRow)[],
    avgFields: ['pesos_por_m3'] as (keyof GemEficienciaRow)[],
  }), [gemRows, granularidad]);

  const kpis = useMemo(() => {
    const sum = (k: keyof BalanceHidricoRow) =>
      data.reduce((acc, r) => acc + (Number(r[k]) || 0), 0);
    const avgField = (k: keyof BalanceHidricoRow) => {
      const vals = data.filter(r => r[k] != null).map(r => Number(r[k]));
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };

    const totalAcu   = sum('acueducto_m3');
    const totalRo    = sum('permeado_ro1');
    const totalCarrot = sum('carrotanques_m3') + sum('mulas_funza_m3');
    const totalPtap  = sum('potable_ptap');
    const totalSuministro = totalAcu + totalRo + totalCarrot + totalPtap;

    // Daily stats from agrupado (respeta el filtro "quitar sin datos")
    const dailyAgua = agrupado
      .map(r => (r.total_agua_limpia_m3 as number) || 0)
      .filter(v => v > 0);
    const minAgua = dailyAgua.length ? Math.min(...dailyAgua) : 0;
    const maxAgua = dailyAgua.length ? Math.max(...dailyAgua) : 0;
    const avgAgua = dailyAgua.length
      ? dailyAgua.reduce((a, b) => a + b, 0) / dailyAgua.length : 0;
    const diasEfectivos = dailyAgua.length;

    return {
      totalAgua:  sum('total_agua_limpia_m3'),
      totalTH:    sum('envio_th'),
      totalAcu,
      eficRo:     avgField('eficiencia_ro_pct'),
      totalGem:   sum('consumo_gem_m3'),
      totalRoIn:  sum('entrada_ro1'),
      totalRo, totalCarrot, totalPtap, totalSuministro,
      minAgua, maxAgua, avgAgua, diasEfectivos,
      // Tintorería
      totalTin:    sum('tintoreria_m3'),
      totalKgTela: sum('kg_tela'),
      avgIndTin:   avgField('indicador_tin_l_kg'),
      // Lavandería
      totalLav:    sum('lavanderia_m3'),
      totalUndEf:  sum('und_efectivas'),
      avgIndLav:   avgField('indicador_lav_l_und'),
      // Rotativa
      totalRot:    sum('rotativa_m3'),
      totalMTela:  sum('m_tela'),
      avgIndRot:   avgField('indicador_rot_l_m'),
    };
  }, [data, agrupado]);

  // Pie S1 — distribución de fuentes de suministro
  const pieS1 = useMemo(() => {
    const { totalAcu, totalRo, totalCarrot, totalPtap } = kpis;
    return [
      { name: 'Acueducto H40',  value: totalAcu,   color: '#4472C4' },
      { name: '% Pluvial RO',   value: totalRo,    color: '#5B9BD5' },
      { name: 'Carrotanques',   value: totalCarrot, color: '#A5A5A5' },
      { name: '% PTAP',         value: totalPtap,  color: '#FFC000' },
    ].filter(d => d.value > 0);
  }, [kpis]);

  const pct = (v: number) =>
    kpis.totalSuministro > 0
      ? `${(v / kpis.totalSuministro * 100).toFixed(1)}%`
      : '—';

  if (loading) {
    return (
      <div className="cal-page">
        <div className="cal-loading"><div className="spinner" /><span>Cargando balance hídrico…</span></div>
      </div>
    );
  }

  return (
    <>
    <div className="cal-page">

      {/* ── Encabezado ── */}
      <div className="cal-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="cal-title">Dashboard Balance Hídrico</h1>
          <p className="cal-subtitle">Volúmenes, eficiencia RO e indicadores de consumo por proceso</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignSelf: 'center' }}>
          <button
            onClick={() => setFiltrosAbiertos(v => !v)}
            style={{ background: filtrosAbiertos ? '#21262d' : '#161b22', border: '1px solid #30363d', padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#8b949e', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ fontSize: 13 }}>⚙</span>
            Filtros
            <span style={{ fontSize: 10, opacity: 0.7 }}>{filtrosAbiertos ? '▲' : '▼'}</span>
          </button>
          <button
            onClick={() => setInformeAbierto(true)}
            style={{ background: '#1a6b3c', border: 'none', padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
          >
            💧 Informe
          </button>
        </div>
      </div>

      {/* ── Filtros (colapsables) ── */}
      {filtrosAbiertos && (
        <div className="cal-filters" style={{ marginBottom: 16 }}>
          <GranularidadSelector value={granularidad} onChange={setGranularidad} />
          <div className="cal-filter-group">
            <label className="cal-filter-label">Turno</label>
            <select className="cal-filter-select" value={turnoFiltro}
              onChange={e => setTurnoFiltro(e.target.value)}>
              <option value="">Todos</option>
              <option value="1">Mañana</option>
              <option value="2">Tarde</option>
              <option value="3">Noche</option>
            </select>
          </div>
          <div className="cal-filter-group">
            <label className="cal-filter-label">Fecha inicio</label>
            <input type="date" className="cal-filter-input" value={draftInicio}
              onChange={e => handleFechaInicio(e.target.value)}
              onBlur={e  => commitFechaInicio(e.target.value)} />
          </div>
          <div className="cal-filter-group">
            <label className="cal-filter-label">Fecha fin</label>
            <input type="date" className="cal-filter-input" value={draftFin}
              onChange={e => handleFechaFin(e.target.value)}
              onBlur={e  => commitFechaFin(e.target.value)} />
          </div>
          <div className="cal-filter-group" style={{ alignSelf: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#8b949e' }}>
              <input
                type="checkbox"
                checked={quitarSinDatos}
                onChange={e => setQuitarSinDatos(e.target.checked)}
                style={{ accentColor: '#1f6feb' }}
              />
              Quitar días sin datos
            </label>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: 12, background: '#2d1214', border: '1px solid #f85149', borderRadius: 6, color: '#f85149', marginBottom: 16, fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          S8 — KPIS
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={8} titulo="KPIs — Resumen del Período" color="#DEEBF7" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          <KpiCard label="Agua limpia total"    value={fmtM3(kpis.totalAgua)}  unit="m³"              color="#3fb950" />
          <KpiCard label="Enviado a producción" value={fmtM3(kpis.totalTH)}    unit="m³"              color="#00c5e3" />
          <KpiCard label="Acueducto consumido"  value={fmtM3(kpis.totalAcu)}   unit="m³"              color="#d29922" />
          <KpiCard label="Eficiencia RO prom."  value={kpis.eficRo != null ? kpis.eficRo.toFixed(1) + '%' : '—'} unit="% recuperación" color="#9e7aff" />
          <KpiCard label="Caudal GEM tratado"   value={fmtM3(kpis.totalGem)}   unit="m³"              color="#f85149" />
          <KpiCard label="Entrada a RO"         value={fmtM3(kpis.totalRoIn)}  unit="m³"              color="#58a6ff" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          S1 — BALANCE HÍDRICO
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={1} titulo="BALANCE HÍDRICO" color="#DAE3F3" />

        {/* Gráfica Balance Global + Pie distribución */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 12, marginBottom: 12 }}>

          {/* Combo barras agrupadas + línea total */}
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Balance Hídrico Global — Fuentes de suministro (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={agrupado} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [`${val.toFixed(1)} m³`, name]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar dataKey="carrotanques_m3" name="Carrotanques" fill="#4472C4" stackId="s">
                  <LabelList dataKey="carrotanques_m3" position="insideTop" style={{ fill: '#fff', fontSize: 8, fontFamily: 'monospace' }}
                    formatter={(v: number) => v > 20 ? v.toFixed(0) : ''} />
                </Bar>
                <Bar dataKey="permeado_ro1" name="Permeado RO" fill="#5B9BD5" stackId="s">
                  <LabelList dataKey="permeado_ro1" position="insideTop" style={{ fill: '#fff', fontSize: 8, fontFamily: 'monospace' }}
                    formatter={(v: number) => v > 20 ? v.toFixed(0) : ''} />
                </Bar>
                <Bar dataKey="acueducto_m3" name="Acueducto" fill="#70AD47" stackId="s">
                  <LabelList dataKey="acueducto_m3" position="insideTop" style={{ fill: '#fff', fontSize: 8, fontFamily: 'monospace' }}
                    formatter={(v: number) => v > 20 ? v.toFixed(0) : ''} />
                </Bar>
                <Bar dataKey="potable_ptap" name="PTAP Potable" fill="#ED7D31" stackId="s" radius={[3,3,0,0]}>
                  <LabelList dataKey="potable_ptap" position="insideTop" style={{ fill: '#fff', fontSize: 8, fontFamily: 'monospace' }}
                    formatter={(v: number) => v > 20 ? v.toFixed(0) : ''} />
                </Bar>
                <Line dataKey="total_agua_limpia_m3" name="Total Agua Limpia"
                  stroke="#FFFFFF" strokeWidth={2.5}
                  dot={<SquareDot fill="#FFFFFF" />}
                  activeDot={{ r: 5, fill: '#FFFFFF' }}
                  connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Pie distribución de consumo — fondo azul marino */}
          <div style={{
            background: '#1F3864', borderRadius: 6, padding: '12px 8px',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 11, textAlign: 'center', marginBottom: 2 }}>
              Distribución de Consumo
            </div>
            <div style={{ color: '#9DC3E6', fontSize: 10, textAlign: 'center', marginBottom: 4 }}>
              Total: {fmtFull(kpis.totalSuministro)} m³
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={pieS1}
                  cx="50%"
                  cy="50%"
                  outerRadius={62}
                  dataKey="value"
                  labelLine={false}
                  label={({ percent }: any) =>
                    percent > 0.03 ? `${(percent * 100).toFixed(1)}%` : ''
                  }
                >
                  {pieS1.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0d1117', border: '1px solid #30363d', fontSize: 10 }}
                  formatter={(val: number, name: string) => [`${fmtFull(val)} m³`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Leyenda manual */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, padding: '0 8px' }}>
              {pieS1.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                  <div style={{ fontSize: 9, color: '#e6edf3', flexGrow: 1 }}>{d.name}</div>
                  <div style={{ fontSize: 9, color: '#9DC3E6', fontVariantNumeric: 'tabular-nums' }}>
                    {pct(d.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tablas de resumen S1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <TablaResumen
            titulo="Consumo Diario (m³)"
            colorHead="#DAE3F3"
            cabeceras={['MÍNIMO', 'MÁXIMO', 'PROMEDIO', 'DÍAS EFECTIVOS']}
            filas={[[
              fmtFull(kpis.minAgua),
              fmtFull(kpis.maxAgua),
              fmtDec1(kpis.avgAgua),
              String(kpis.diasEfectivos),
            ]]}
          />
          <TablaResumen
            titulo="Fuentes de Suministro"
            colorHead="#DAE3F3"
            cabeceras={['FUENTE', 'CONSUMO (m³)', '% CONSUMO']}
            filas={[
              ['Acueducto H40',    fmtFull(kpis.totalAcu),    pct(kpis.totalAcu)],
              ['% Pluvial RO',     fmtFull(kpis.totalRo),     pct(kpis.totalRo)],
              ['Suministro Ext.',  fmtFull(kpis.totalCarrot), pct(kpis.totalCarrot)],
              ['PTAP',             fmtFull(kpis.totalPtap),   pct(kpis.totalPtap)],
              ['TOTAL',            fmtFull(kpis.totalSuministro), '100.0%'],
            ]}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          S2 — INDICADOR TINTORERÍA
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={2} titulo="INDICADOR TINTORERÍA" color="#DAE3F3" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

          {/* Panel Izq — m³ consumo vs indicador L/Kg */}
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Tintorería: L/Kg vs Volumen Consumo de Agua (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={agrupado} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis yAxisId="left"  tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} width={44}
                  label={{ value: 'L/Kg', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 10, dx: 6 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar  yAxisId="left"  dataKey="tintoreria_m3"     name="Consumo Tintorería (m³)" fill="#5B9BD5" radius={[3,3,0,0]} />
                <Line yAxisId="right" dataKey="indicador_tin_l_kg" name="Indicador L/Kg"
                  stroke="#000000" strokeWidth={2}
                  dot={<SquareDot fill="#000" />} activeDot={{ r: 5, fill: '#000' }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Panel Der — kg tela vs indicador L/Kg */}
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Tintorería: L/Kg vs Kg Producidos
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={agrupado} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis yAxisId="left"  tick={AXIS_TICK} width={54}
                  label={{ value: 'Kg', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} width={44}
                  label={{ value: 'L/Kg', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 10, dx: 6 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar  yAxisId="left"  dataKey="kg_tela"            name="Kg Tela" fill="#ED7D31" radius={[3,3,0,0]} />
                <Line yAxisId="right" dataKey="indicador_tin_l_kg" name="Indicador L/Kg"
                  stroke="#000000" strokeWidth={2}
                  dot={<SquareDot fill="#000" />} activeDot={{ r: 5, fill: '#000' }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabla consolidado + benchmark */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>
          <TablaResumen
            titulo="Consolidado Tintorería"
            colorHead="#DAE3F3"
            cabeceras={['MÉTRICA', 'VALOR', 'UNIDAD']}
            filas={[
              ['Consumo total período',            fmtFull(kpis.totalTin),    'm³'],
              ['Kg Tela procesados',               fmtFull(kpis.totalKgTela), 'Kg'],
              ['Indicador promedio período',       fmtDec1(kpis.avgIndTin),   'L/Kg'],
            ]}
          />
          <BenchmarkTintoreria />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          S3 — INDICADOR LAVANDERÍA
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={3} titulo="INDICADOR LAVANDERÍA" color="#DAE3F3" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

          {/* Panel Izq — m³ consumo vs indicador L/Und */}
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Lavandería: L/Und vs Volumen Consumo de Agua (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={agrupado} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis yAxisId="left"  tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} width={44}
                  label={{ value: 'L/Und', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 10, dx: 6 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar  yAxisId="left"  dataKey="lavanderia_m3"       name="Consumo Lavandería (m³)" fill="#FFC000" radius={[3,3,0,0]} />
                <Line yAxisId="right" dataKey="indicador_lav_l_und" name="Indicador L/Und"
                  stroke="#000000" strokeWidth={2}
                  dot={<SquareDot fill="#000" />} activeDot={{ r: 5, fill: '#000' }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Panel Der — Unidades efectivas vs indicador */}
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Lavandería: L/Und vs Unidades Efectivas
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={agrupado} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis yAxisId="left"  tick={AXIS_TICK} width={58}
                  label={{ value: 'Und', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} width={44}
                  label={{ value: 'L/Und', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 10, dx: 6 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar  yAxisId="left"  dataKey="und_efectivas"        name="Unidades Efectivas" fill="#FFC000" radius={[3,3,0,0]} />
                <Line yAxisId="right" dataKey="indicador_lav_l_und"  name="Indicador L/Und"
                  stroke="#000000" strokeWidth={2}
                  dot={<SquareDot fill="#000" />} activeDot={{ r: 5, fill: '#000' }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <TablaResumen
          titulo="Consolidado Lavandería"
          colorHead="#DAE3F3"
          cabeceras={['MÉTRICA', 'VALOR', 'UNIDAD']}
          filas={[
            ['Consumo total período',       fmtFull(kpis.totalLav),   'm³'],
            ['Unidades efectivas',          fmtFull(kpis.totalUndEf), 'Und'],
            ['Indicador promedio período',  fmtDec1(kpis.avgIndLav),  'L/Und'],
          ]}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          S4 — INDICADOR ROTATIVA
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={4} titulo="INDICADOR ROTATIVA" color="#DAE3F3" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

          {/* Panel Izq — m³ consumo vs indicador L/m */}
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Rotativa: L/m vs Volumen Consumo de Agua (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={agrupado} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis yAxisId="left"  tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} width={44}
                  label={{ value: 'L/m', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 10, dx: 6 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar  yAxisId="left"  dataKey="rotativa_m3"         name="Consumo Rotativa (m³)" fill="#A5A5A5" radius={[3,3,0,0]} />
                <Line yAxisId="right" dataKey="indicador_rot_l_m"   name="Indicador L/m"
                  stroke="#000000" strokeWidth={2}
                  dot={<SquareDot fill="#000" />} activeDot={{ r: 5, fill: '#000' }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Panel Der — m de tela vs indicador L/m */}
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Rotativa: L/m vs Metros de Tela
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={agrupado} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis yAxisId="left"  tick={AXIS_TICK} width={54}
                  label={{ value: 'm tela', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} width={44}
                  label={{ value: 'L/m', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 10, dx: 6 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar  yAxisId="left"  dataKey="m_tela"              name="m de Tela" fill="#A5A5A5" radius={[3,3,0,0]} />
                <Line yAxisId="right" dataKey="indicador_rot_l_m"   name="Indicador L/m"
                  stroke="#000000" strokeWidth={2}
                  dot={<SquareDot fill="#000" />} activeDot={{ r: 5, fill: '#000' }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <TablaResumen
          titulo="Consolidado Rotativa"
          colorHead="#DAE3F3"
          cabeceras={['MÉTRICA', 'VALOR', 'UNIDAD']}
          filas={[
            ['Consumo total período',       fmtFull(kpis.totalRot),   'm³'],
            ['Metros de tela procesados',   fmtFull(kpis.totalMTela), 'm'],
            ['Indicador promedio período',  fmtDec1(kpis.avgIndRot),  'L/m'],
          ]}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          S5 — BALANCE DE TRATABILIDAD I
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={5} titulo="BALANCE DE TRATABILIDAD I" color="#A9CE91" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

          {/* Barras apiladas por proceso + líneas totales */}
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Balance de Tratabilidad — Consumo por proceso (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={agrupadoS5} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [`${val.toFixed(1)} m³`, name]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar dataKey="acueducto_m3"  name="Acueducto"  fill="#4472C4" stackId="t">
                  <LabelList dataKey="acueducto_m3" position="insideTop" style={{ fill: '#fff', fontSize: 8, fontFamily: 'monospace' }}
                    formatter={(v: number) => v > 20 ? v.toFixed(0) : ''} />
                </Bar>
                <Bar dataKey="rotativa_m3"   name="Rotativa"   fill="#5B9BD5" stackId="t">
                  <LabelList dataKey="rotativa_m3" position="insideTop" style={{ fill: '#fff', fontSize: 8, fontFamily: 'monospace' }}
                    formatter={(v: number) => v > 20 ? v.toFixed(0) : ''} />
                </Bar>
                <Bar dataKey="tintoreria_m3" name="Tintorería" fill="#FFC000" stackId="t">
                  <LabelList dataKey="tintoreria_m3" position="insideTop" style={{ fill: '#1c2128', fontSize: 8, fontFamily: 'monospace' }}
                    formatter={(v: number) => v > 20 ? v.toFixed(0) : ''} />
                </Bar>
                <Bar dataKey="lavanderia_m3" name="Lavandería" fill="#ED7D31" stackId="t" radius={[3,3,0,0]}>
                  <LabelList dataKey="lavanderia_m3" position="insideTop" style={{ fill: '#fff', fontSize: 8, fontFamily: 'monospace' }}
                    formatter={(v: number) => v > 20 ? v.toFixed(0) : ''} />
                </Bar>
                <Line dataKey="total_tratado_osmosis" name="Total Tratado Osmosis"
                  stroke="#375623" strokeWidth={2}
                  dot={<SquareDot fill="#375623" />} activeDot={{ r: 5, fill: '#375623' }} connectNulls />
                <Line dataKey="total_a_tratar" name="Total Vol. a Tratar"
                  stroke="#ED7D31" strokeWidth={2} strokeDasharray="4 2"
                  dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Seguimiento vertimiento — rechazo RO + GEM */}
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Seguimiento y Control de Vertimiento (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={agrupado} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis yAxisId="left"  tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} width={44}
                  domain={[0, 100]} tickFormatter={(v: number) => `${v}%`}
                  label={{ value: '%', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 10, dx: 6 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar  yAxisId="left"  dataKey="rechazo_ro1"      name="Rechazo RO"     fill="#7B3F00" stackId="v" />
                <Bar  yAxisId="left"  dataKey="consumo_gem_m3"   name="Tratado GEM"    fill="#9DC3E6" stackId="v" radius={[3,3,0,0]} />
                <Line yAxisId="left"  dataKey="envio_th"          name="Enviado TH"
                  stroke="#70AD47" strokeWidth={2}
                  dot={<SquareDot fill="#70AD47" />} activeDot={{ r: 5 }} connectNulls />
                <Line yAxisId="right" dataKey="eficiencia_ro_pct" name="% Eficiencia RO"
                  stroke="#FFC000" strokeWidth={1.5} strokeDasharray="4 2" dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <TablaResumen
          titulo="Resumen Tratabilidad I"
          colorHead="#A9CE91"
          cabeceras={['PROCESO', 'CONSUMO (m³)', '% DEL TOTAL']}
          filas={(() => {
            const total = kpis.totalTin + kpis.totalLav + kpis.totalRot + kpis.totalAcu;
            const p = (v: number) => total > 0 ? `${(v / total * 100).toFixed(1)}%` : '—';
            return [
              ['Acueducto',  fmtFull(kpis.totalAcu), p(kpis.totalAcu)],
              ['Rotativa',   fmtFull(kpis.totalRot), p(kpis.totalRot)],
              ['Tintorería', fmtFull(kpis.totalTin), p(kpis.totalTin)],
              ['Lavandería', fmtFull(kpis.totalLav), p(kpis.totalLav)],
              ['TOTAL',      fmtFull(total),          '100.0%'],
            ];
          })()}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          S6 — BALANCE DE TRATABILIDAD II
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={6} titulo="BALANCE DE TRATABILIDAD II" color="#A9CE91" />
        <div className="dash-row-2col">

          {/* Pie — distribución agua tratada por sistema */}
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Tratabilidad Total — Distribución de agua tratada
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieS6}
                  cx="50%" cy="48%"
                  outerRadius={85}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  labelLine
                >
                  {pieS6.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 }}
                  formatter={(val: number) => [`${fmtFull(val)} m³`]}
                />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Barras agrupadas Balance en Planta */}
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Balance en Planta (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={agrupadoS6} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [`${val.toFixed(1)} m³`, name]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar dataKey="total_a_tratar"       name="Total a Tratar"    fill="#1F3864" radius={[3,3,0,0]} maxBarSize={20} />
                <Bar dataKey="total_agua_limpia_m3" name="Agua Limpia"       fill="#4472C4" radius={[3,3,0,0]} maxBarSize={20} />
                <Bar dataKey="envio_th"             name="Envío TH"          fill="#5B9BD5" radius={[3,3,0,0]} maxBarSize={20} />
                <Bar dataKey="consumo_gem_m3"       name="Tratado GEM"       fill="#A9D18E" radius={[3,3,0,0]} maxBarSize={20} />
                <Bar dataKey="permeado_mbr"         name="Permeado MBRs"     fill="#ED7D31" radius={[3,3,0,0]} maxBarSize={20} />
                <Bar dataKey="entrada_ro1"          name="Enviado a RO"      fill="#FFC000" radius={[3,3,0,0]} maxBarSize={20} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          S7 — OPERACIÓN RO — EFICIENCIAS
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={7} titulo="OPERACIÓN RO — EFICIENCIAS" color="#A9CE91" />
        <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
            Balance Global RO — Volúmenes y eficiencia (m³/día)
          </div>
          <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={agrupado} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis yAxisId="left" tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} width={44}
                  domain={[0, 100]} tickFormatter={(v: number) => `${v}%`}
                  label={{ value: '%', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 10, dx: 4 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar  yAxisId="left"  dataKey="permeado_ro1"      name="Permeado RO"  fill="#A9D18E" radius={[3,3,0,0]} stackId="ro" />
                <Bar  yAxisId="left"  dataKey="rechazo_ro1"       name="Rechazo RO"   fill="#7B3F00" stackId="ro" />
                <Line yAxisId="left"  dataKey="entrada_ro1" name="Ingreso total RO"
                  stroke="#ED7D31" strokeWidth={2} dot={{ fill: '#ED7D31', r: 3 }} connectNulls />
                <Line yAxisId="right" dataKey="eficiencia_ro_pct" name="% Eficiencia global"
                  stroke="#FFC000" strokeWidth={2} strokeDasharray="4 2" dot={false} connectNulls />
              </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          S9 — INDICADOR TRATAMIENTO FQ GEM
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={9} titulo="INDICADOR TRATAMIENTO FQ GEM" color="#FFD966" textColor="#1c2128" />
        {/* $m³ GEM — caudal vs indicador costo — ancho completo */}
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              $m³ Tratamiento GEM — Caudal tratado vs indicador costo
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={gemAgrupado} margin={{ top: 4, right: 60, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis yAxisId="left"  tick={AXIS_TICK} width={54}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#ED7D31', fontSize: 10 }} width={56}
                  tickFormatter={(v: number) => `$${fmtM3(v)}`}
                  label={{ value: '$/m³', angle: 90, position: 'insideRight', fill: '#ED7D3180', fontSize: 10, dx: 6 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [
                    name === 'Indicador $/m³' ? `$${(val as number).toFixed(0)}/m³` : `${(val as number).toFixed(1)} m³`, name,
                  ]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <ReferenceLine yAxisId="right" y={GEM_META_M3} stroke="#70AD47" strokeDasharray="4 2"
                  label={{ value: `Meta $${GEM_META_M3}/m³`, fill: '#70AD47', fontSize: 9, position: 'right' }} />
                <Bar  yAxisId="left"  dataKey="caudal_m3"    name="Caudal GEM (m³)" fill="#BDD7EE" radius={[3,3,0,0]} />
                <Line yAxisId="right" dataKey="pesos_por_m3" name="Indicador $/m³"
                  stroke="#ED7D31" strokeWidth={2} dot={{ fill: '#ED7D31', r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          S10 — INDICADOR OSMOSIS INVERSA
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={10} titulo="INDICADOR OSMOSIS INVERSA" color="#FFD966" textColor="#1c2128" />
        <div className="dash-row-2col">
          {/* Volumen RO + eficiencia (proxy hasta tener datos de costo) */}
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Indicador RO — Volumen enviado vs eficiencia (%)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={agrupado} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis yAxisId="left" tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#ED7D31', fontSize: 10 }} width={44}
                  domain={[0, 100]} tickFormatter={(v: number) => `${v}%`}
                  label={{ value: '%', angle: 90, position: 'insideRight', fill: '#ED7D3180', fontSize: 10, dx: 6 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [
                    name.includes('%') ? `${(val as number).toFixed(1)}%` : `${(val as number).toFixed(1)} m³`, name,
                  ]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <ReferenceLine yAxisId="right" y={75} stroke="#70AD47" strokeDasharray="4 2" label={{ value: 'Meta 75%', fill: '#70AD47', fontSize: 9, position: 'right' }} />
                <Bar  yAxisId="left"  dataKey="entrada_ro1"      name="Enviado a RO (m³)"  fill="#BDD7EE" radius={[3,3,0,0]} />
                <Bar  yAxisId="left"  dataKey="permeado_ro1"     name="Permeado RO (m³)"   fill="#A9D18E" radius={[3,3,0,0]} />
                <Line yAxisId="right" dataKey="eficiencia_ro_pct" name="% Eficiencia RO"
                  stroke="#ED7D31" strokeWidth={2} dot={{ fill: '#ED7D31', r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla estática formulación RO */}
          <div className="dash-card" style={{ padding: '12px' }}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              background: '#FFD966', color: '#1c2128', padding: '3px 8px', marginBottom: 10, borderRadius: 3,
            }}>
              Formulación Seguimiento RO
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  {['INDICADOR', 'FÓRMULA', 'UNIDAD'].map((h, i) => (
                    <th key={i} style={{
                      padding: '4px 8px', textAlign: i === 0 ? 'left' : 'center',
                      color: '#8b949e', fontWeight: 600, borderBottom: '1px solid #30363d', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {([
                  ['Recuperación RO',      '(Permeado RO ÷ Entrada RO) × 100',       '%'],
                  ['Factor Concentración', 'Entrada RO ÷ Rechazo RO',                 'FC'],
                  ['Rechazo de Sales',     '(1 − TDS perm ÷ TDS alim) × 100',        '%'],
                  ['Indicador Costo RO',   'Costo Químicos RO ÷ Permeado RO',         '$/m³'],
                ] as [string, string, string][]).map(([ind, formula, unit], i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #21262d50' }}>
                    <td style={{ padding: '6px 8px', color: '#e6edf3', fontWeight: 600 }}>{ind}</td>
                    <td style={{ padding: '6px 8px', color: '#8b949e', textAlign: 'center',
                      fontFamily: 'monospace', fontSize: 10 }}>{formula}</td>
                    <td style={{ padding: '6px 8px', color: '#70AD47', textAlign: 'center' }}>{unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          S11 — BALANCE DE LODOS
      ════════════════════════════════════════════════════════════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={11} titulo="BALANCE DE LODOS" color="#DAE3F3" />
        <div className="dash-row-2col">

          {/* $/m³ Lodos — estructura lista, datos pendientes de endpoint /api/lodos/ */}
          <div className="dash-card" style={{ padding: '16px 8px 8px', position: 'relative' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Indicador $/m³ — Volumen tratado vs costo unitario
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart
                data={[{ fecha: '' }]}
                margin={{ top: 4, right: 60, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tick={AXIS_TICK} />
                <YAxis yAxisId="left"  tick={AXIS_TICK} width={54} domain={[0, 1000]}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#C00000', fontSize: 10 }} width={56}
                  domain={[0, 5000]} tickFormatter={(v: number) => `$${fmtM3(v)}`}
                  label={{ value: '$/m³', angle: 90, position: 'insideRight', fill: '#C0000080', fontSize: 10, dx: 6 }} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <ReferenceLine yAxisId="right" y={2500} stroke="#70AD47" strokeDasharray="4 2"
                  label={{ value: 'Meta', fill: '#70AD47', fontSize: 9, position: 'right' }} />
                <Bar  yAxisId="left"  dataKey="volumen_m3"  name="Volumen tratado (m³)" fill="#BDD7EE" radius={[3,3,0,0]} />
                <Line yAxisId="right" dataKey="costo_m3"   name="Costo $/m³"
                  stroke="#C00000" strokeWidth={2} dot={{ fill: '#C00000', r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 11, color: '#484f58', fontStyle: 'italic' }}>Sin datos — pendiente endpoint</div>
              <code style={{ fontSize: 9, color: '#30363d', marginTop: 4 }}>/api/lodos/</code>
            </div>
          </div>

          {/* $/Kg Lodos — estructura lista, datos pendientes de endpoint /api/lodos/ */}
          <div className="dash-card" style={{ padding: '16px 8px 8px', position: 'relative' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Indicador $/Kg — Kg generados vs costo por kg
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart
                data={[{ fecha: '' }]}
                margin={{ top: 4, right: 60, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tick={AXIS_TICK} />
                <YAxis yAxisId="left"  tick={AXIS_TICK} width={54} domain={[0, 5000]}
                  label={{ value: 'Kg', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#C00000', fontSize: 10 }} width={56}
                  domain={[0, 2000]} tickFormatter={(v: number) => `$${fmtM3(v)}`}
                  label={{ value: '$/Kg', angle: 90, position: 'insideRight', fill: '#C0000080', fontSize: 10, dx: 6 }} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <ReferenceLine yAxisId="right" y={800} stroke="#70AD47" strokeDasharray="4 2"
                  label={{ value: 'Meta', fill: '#70AD47', fontSize: 9, position: 'right' }} />
                <Bar  yAxisId="left"  dataKey="kg_generados" name="Kg generados" fill="#F4B183" radius={[3,3,0,0]} />
                <Line yAxisId="right" dataKey="costo_kg"     name="Costo $/Kg"
                  stroke="#C00000" strokeWidth={2} dot={{ fill: '#C00000', r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 11, color: '#484f58', fontStyle: 'italic' }}>Sin datos — pendiente endpoint</div>
              <code style={{ fontSize: 9, color: '#30363d', marginTop: 4 }}>/api/lodos/</code>
            </div>
          </div>

        </div>
      </section>

    </div>

    {informeAbierto && (
      <InformeBalanceModal
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        onClose={() => setInformeAbierto(false)}
      />
    )}
    </>
  );
}
