import { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../../state/ThemeContext';
import {
  Bar, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  useCostosData,
  type ConsumoQuimicoDiaRow,
} from './hooks/useCostosData';
import {
  getCalidadRemociones,
  getRoEficiencia,
  type RemocionCalidad,
  type RoEficienciaRow,
} from '../../services/ptarClient';
import InformeCostosModal from './InformeCostosModal';
import GranularidadSelector from '../../components/shared/GranularidadSelector';
import { useGranularidad } from '../../hooks/useGranularidad';
import { xLabel, sortKey } from '../../lib/utils/agruparTemporal';
import type { Granularidad } from '../../hooks/useGranularidad';

/* ── constantes ─────────────────────────────────────────────────────── */
const TOOLTIP_STYLE = {
  contentStyle: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 },
  labelStyle:   { color: '#e6edf3', marginBottom: 4 },
};
const AXIS_TICK_SM = { fill: '#6e7681', fontSize: 9 };
const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/* Días excluidos de TODAS las vistas de costos (operación atípica / datos incompletos) */
const COSTOS_EXCLUIR = new Set(['2026-05-31']);

const PRECIOS_COP_KG: Record<string, number> = {
  'Ácido / Acidificante': 830,
  'Coagulante':           2900,
  'Decolorante':          6295,
  'Pol. Aniónico':        19050,
  'Pol. Catiónico':       22050,
}; void PRECIOS_COP_KG;

function _mq(n: string, f: string) { return n.toLowerCase().includes(f); }
function colorPPM(nombre: string): string {
  const n = nombre.toLowerCase();
  if (_mq(n, 'cati'))                    return '#4472C4';
  if (_mq(n, 'anio') || _mq(n, 'anió')) return '#ED7D31';
  if (_mq(n, 'acid') || _mq(n, 'ácid')) return '#FFE599';
  if (_mq(n, 'coag'))                    return '#F4B183';
  if (_mq(n, 'decol'))                   return '#BFBFBF';
  return '#8b949e';
}
function colorKG(nombre: string): string {
  const n = nombre.toLowerCase();
  if (_mq(n, 'cati'))                    return '#4472C4';
  if (_mq(n, 'anio') || _mq(n, 'anió')) return '#ED7D31';
  if (_mq(n, 'acid') || _mq(n, 'ácid')) return '#FFD966';
  if (_mq(n, 'coag'))                    return '#F4B183';
  if (_mq(n, 'decol'))                   return '#C9C9C9';
  return '#8b949e';
}
function colorM3(nombre: string): string {
  const n = nombre.toLowerCase();
  if (_mq(n, 'cati'))                    return '#8EAADB';
  if (_mq(n, 'anio') || _mq(n, 'anió')) return '#ED7D31';
  if (_mq(n, 'acid') || _mq(n, 'ácid')) return '#FFE599';
  if (_mq(n, 'coag'))                    return '#F4B183';
  if (_mq(n, 'decol'))                   return '#C9C9C9';
  return '#8b949e';
}

/* ── byGranularidad ─────────────────────────────────────────────────── */
function byGranularidad(rows: ConsumoQuimicoDiaRow[], gran: Granularidad | null) {
  type Bucket = {
    sk: string; label: string;
    productos: Record<string, { kg: number; L: number; costo: number; ppm: number[]; caudal: number }>;
    caudalTotal: number;
  };
  const map = new Map<string, Bucket>();

  for (const r of rows) {
    const sk    = sortKey(r.fecha, undefined, gran);
    const label = xLabel(r.fecha, undefined, gran);
    if (!map.has(sk)) map.set(sk, { sk, label, productos: {}, caudalTotal: 0 });
    const bucket = map.get(sk)!;
    const p = r.producto_nombre;
    if (!bucket.productos[p]) bucket.productos[p] = { kg: 0, L: 0, costo: 0, ppm: [], caudal: 0 };
    const pe = bucket.productos[p];
    if (r.kg_dia        != null) pe.kg     += r.kg_dia;
    if (r.L_dia         != null) pe.L      += r.L_dia;
    if (r.costo_dia     != null) pe.costo  += r.costo_dia;
    if (r.ppm_promedio_dia != null) pe.ppm.push(r.ppm_promedio_dia);
    if (r.caudal_m3_dia != null) { pe.caudal += r.caudal_m3_dia; bucket.caudalTotal += r.caudal_m3_dia; }
  }

  const productos = Array.from(new Set(rows.map(r => r.producto_nombre)));
  const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;

  const result = Array.from(map.values())
    .sort((a, b) => a.sk.localeCompare(b.sk))
    .map(bucket => {
      const row: Record<string, number | string | null> = { fecha: bucket.label };
      let costoTotal = 0;
      const caudalTotal = bucket.caudalTotal / Math.max(productos.length, 1);
      for (const p of productos) {
        const pe = bucket.productos[p];
        row[`kg_${p}`]       = pe ? +(pe.kg.toFixed(2))    : 0;
        row[`L_${p}`]        = pe && pe.L > 0 ? +(pe.L.toFixed(1)) : null;
        row[`costo_${p}`]    = pe ? +(pe.costo.toFixed(0))  : 0;
        row[`ppm_${p}`]      = pe ? avg(pe.ppm)             : null;
        row[`costo_m3_${p}`] = (pe && caudalTotal > 0)
          ? +(pe.costo / caudalTotal).toFixed(0) : 0;
        if (pe) costoTotal += pe.costo;
      }
      row['costo_total']  = +costoTotal.toFixed(0);
      row['caudal_m3']    = +caudalTotal.toFixed(1);
      row['indicador_m3'] = caudalTotal > 0 ? +(costoTotal / caudalTotal).toFixed(0) : null;
      return row;
    });

  return { result, productos };
}

/* ── helpers estadísticos ────────────────────────────────────────────── */
const numAvg  = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
const numP90  = (arr: number[]) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(s.length * 0.9) - 1)];
};
const numIE   = (arr: number[]) => {  // índice de estabilidad = stddev/media
  if (arr.length < 2) return null;
  const m = numAvg(arr) as number;
  if (!m) return null;
  const std = Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
  return std / m;
};
const fmtCOP  = (v: number) =>
  v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`;
const fmtM3   = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
const fmtNum  = (v: number | null | undefined, dec = 1) =>
  v != null ? v.toFixed(dec) : '—';

// Ejes compartidos como constantes de módulo — evitan recreación en cada render (flicker Recharts)
const Y_LEFT  = <YAxis yAxisId="left"  tick={AXIS_TICK_SM} width={46} />;
const Y_RIGHT = (
  <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_SM} width={52}
    tickFormatter={fmtM3}
    label={{ value: '$/m³', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 9, dx: 6 }}
  />
);
const LINE_M3 = (
  <Line yAxisId="right" type="monotone" dataKey="indicador_m3" name="$/m³ total"
    stroke="#70AD47" strokeWidth={2.25} dot={false} connectNulls />
);

/* ── sub-componentes ─────────────────────────────────────────────────── */
function KpiCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  const { theme } = useTheme();
  return (
    <div className="dash-card" style={{ padding: '14px 18px', textAlign: 'center', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, color: theme.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: theme.dim, marginTop: 2 }}>{unit}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <div className="dash-card" style={{ padding: '14px 8px 8px' }}>
      <div style={{ paddingLeft: 10, marginBottom: 2 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: theme.text2, letterSpacing: '.02em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 10, color: '#6e7681', marginTop: 1 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

/* ── componente principal ────────────────────────────────────────────── */
export default function CostosDashboard() {
  const { theme } = useTheme();
  const anioActual = new Date().getFullYear(); void anioActual;

  const { granularidad, setGranularidad, fechaInicio, fechaFin, draftInicio, draftFin, handleFechaInicio, handleFechaFin, commitFechaInicio, commitFechaFin } = useGranularidad({});
  const [sistema,        setSistema]        = useState('GEM');
  const [mesProyec,      setMesProyec]      = useState(String(new Date().getMonth() + 1));
  const [reactivosFiltro, setReactivosFiltro] = useState<string[]>([]);
  const [remociones,    setRemociones]    = useState<RemocionCalidad[]>([]);
  const [roEficiencia,  setRoEficiencia]  = useState<RoEficienciaRow[]>([]);
  const [informeAbierto,  setInformeAbierto]  = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const { consumoDiario, proyeccion, estadisticas, gemEficiencia, loading, error } =
    useCostosData(fechaInicio, fechaFin, sistema, mesProyec ? Number(mesProyec) : undefined);

  /* fetch remoción DQO/SST/Color */
  useEffect(() => {
    if (!fechaInicio || !fechaFin) return;
    getCalidadRemociones({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })
      .then(setRemociones)
      .catch(() => setRemociones([]));
  }, [fechaInicio, fechaFin]);

  /* fetch RO eficiencia operacional */
  useEffect(() => {
    if (!fechaInicio || !fechaFin) return;
    getRoEficiencia({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })
      .then(setRoEficiencia)
      .catch(() => setRoEficiencia([]));
  }, [fechaInicio, fechaFin]);

  /* ── Excluir fechas atípicas de todas las fuentes ── */
  const consumoDiarioFilt = useMemo(
    () => consumoDiario.filter(r => !COSTOS_EXCLUIR.has((r.fecha ?? '').slice(0, 10))),
    [consumoDiario],
  );
  const gemEficienciaFilt = useMemo(
    () => gemEficiencia.filter(r => !COSTOS_EXCLUIR.has((r.fecha ?? '').slice(0, 10))),
    [gemEficiencia],
  );
  const roEficienciaFilt = useMemo(
    () => roEficiencia.filter(r => !COSTOS_EXCLUIR.has((r.fecha ?? '').slice(0, 10))),
    [roEficiencia],
  );

  /* agrupación temporal */
  const { result: datosFecha, productos } = useMemo(
    () => byGranularidad(consumoDiarioFilt, granularidad),
    [consumoDiarioFilt, granularidad],
  );

  /* GEM — caudal + indicador $m³ + horas de operación acumuladas */
  const gemAgrupado = useMemo(() => {
    type B = { sk: string; label: string; caudal: number; pesos: number[]; mh: number[]; horasTotal: number };
    const map = new Map<string, B>();
    const TURNO_N: Record<string, number> = { noche: 1, 'mañana': 2, tarde: 3 };
    for (const r of gemEficienciaFilt) {
      const t     = TURNO_N[r.turno ?? ''];
      const sk    = sortKey(r.fecha, t, granularidad);
      const label = xLabel(r.fecha, t, granularidad);
      if (!map.has(sk)) map.set(sk, { sk, label, caudal: 0, pesos: [], mh: [], horasTotal: 0 });
      const b = map.get(sk)!;
      if (r.caudal_m3    != null) b.caudal += r.caudal_m3;
      if (r.pesos_por_m3 != null) b.pesos.push(r.pesos_por_m3);
      if (r.caudal_mh    != null) b.mh.push(r.caudal_mh);
      // horas de operación por turno = volumen tratado / caudal
      if (r.caudal_m3 != null && r.caudal_mh != null && r.caudal_mh > 0)
        b.horasTotal += r.caudal_m3 / r.caudal_mh;
    }
    const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, v) => a + v, 0) / arr.length).toFixed(1) : null;
    return Array.from(map.values())
      .sort((a, b) => a.sk.localeCompare(b.sk))
      .filter(b => b.caudal > 0)          // excluir días sin operación GEM
      .map(b => ({
        fecha:        b.label,
        caudal_m3:    +b.caudal.toFixed(1),
        pesos_por_m3: avg(b.pesos),
        caudal_mh:    avg(b.mh),
        horas_op:     b.horasTotal > 0 ? +b.horasTotal.toFixed(1) : null,
      }));
  }, [gemEficienciaFilt, granularidad]);

  /* RO — agrupado desde operacion_ro_turno */
  const roAgrupado = useMemo(() => {
    if (!roEficiencia.length) return [];
    type B = { sk: string; label: string; caudal: number; pesos: number[]; horas: number[]; costo: number };
    const map = new Map<string, B>();
    const TURNO_N: Record<string, number> = { noche: 1, 'mañana': 2, tarde: 3 };
    for (const r of roEficienciaFilt) {
      const t     = TURNO_N[r.turno ?? ''];
      const sk    = sortKey(r.fecha, t, granularidad);
      const label = xLabel(r.fecha, t, granularidad);
      if (!map.has(sk)) map.set(sk, { sk, label, caudal: 0, pesos: [], horas: [], costo: 0 });
      const b = map.get(sk)!;
      if (r.caudal_m3          != null) b.caudal += r.caudal_m3;
      if (r.pesos_por_m3       != null) b.pesos.push(r.pesos_por_m3);
      if (r.horas_operacion    != null) b.horas.push(r.horas_operacion);
      if (r.costo_quimica_turno != null) b.costo += r.costo_quimica_turno;
    }
    const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, v) => a + v, 0) / arr.length).toFixed(1) : null;
    return Array.from(map.values())
      .sort((a, b) => a.sk.localeCompare(b.sk))
      .filter(b => b.caudal > 0)          // excluir días sin operación RO
      .map(b => ({
        fecha:        b.label,
        caudal_m3:    +b.caudal.toFixed(1),
        pesos_por_m3: avg(b.pesos),
        horas_op:     avg(b.horas),
        costo_total:  +b.costo.toFixed(0),
      }));
  }, [roEficienciaFilt, granularidad]);

  /* estadísticas L/día por producto */
  const lDiaStats = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const r of consumoDiarioFilt) {
      if (r.L_dia != null && r.L_dia > 0) {
        if (!map.has(r.producto_nombre)) map.set(r.producto_nombre, []);
        map.get(r.producto_nombre)!.push(r.L_dia);
      }
    }
    const result: Record<string, { min: number; max: number; avg: number; total: number }> = {};
    for (const [p, vals] of map) {
      const sum = vals.reduce((a, b) => a + b, 0);
      result[p] = {
        min:   Math.min(...vals),
        max:   Math.max(...vals),
        avg:   sum / vals.length,
        total: sum,
      };
    }
    return result;
  }, [consumoDiarioFilt]);

  /* reactivos filtrados para gráficas */
  const productosFiltrados = reactivosFiltro.length > 0
    ? productos.filter(p => reactivosFiltro.includes(p))
    : productos;

  /* KPIs */
  const kpis = useMemo(() => {
    const total_kg    = consumoDiarioFilt.reduce((s, r) => s + (r.kg_dia ?? 0), 0);
    const total_costo = consumoDiarioFilt.reduce((s, r) => s + (r.costo_dia ?? 0), 0);
    const pesosM3     = gemEficienciaFilt.filter(r => r.pesos_por_m3 != null).map(r => r.pesos_por_m3 as number);
    const promPesosM3 = pesosM3.length ? pesosM3.reduce((a, b) => a + b, 0) / pesosM3.length : null;
    const diasSet     = new Set(consumoDiarioFilt.map(r => r.fecha));
    return { total_kg, total_costo, promPesosM3, n_dias: diasSet.size };
  }, [consumoDiarioFilt, gemEficienciaFilt]);

  /* tabla resumen por reactivo: estadisticas + proyeccion */
  const tablaReactivos = useMemo(() => {
    if (!estadisticas.length) return [];
    return estadisticas.map(est => {
      const proy = proyeccion.find(p =>
        p.producto?.toLowerCase() === est.producto_nombre?.toLowerCase(),
      );
      return {
        nombre:       est.producto_nombre,
        ppm_min:      est.ppm_min,
        ppm_avg:      est.ppm_avg,
        ppm_max:      est.ppm_max,
        kg_min:       est.kg_min,
        kg_avg:       est.kg_avg,
        kg_max:       est.kg_max,
        kg_total:     est.kg_total,
        costo_total:  est.costo_total,
        real_kg_m3:   proy?.kg_por_m3_real,
        proy_kg_m3:   proy?.kg_por_m3_proyectado,
        cumpl_pct:    proy?.cumplimiento_pct,
      };
    });
  }, [estadisticas, proyeccion]);

  /* tabla remoción GEM: DQO, SST, Color */
  const tablaRemocion = useMemo(() => {
    const PARAMS = [
      { cod: 'DQO',   label: 'DQO',   unidad: 'mg/L' },
      { cod: 'SST',   label: 'SST',   unidad: 'mg/L' },
      { cod: 'COLOR', label: 'Color', unidad: 'UC'   },
    ];
    const m3_total  = gemEficiencia.reduce((s, r) => s + (r.caudal_m3 ?? 0), 0);
    const costoTotal = kpis.total_costo;
    return PARAMS.map(({ cod, label, unidad }) => {
      const rows = remociones.filter(r =>
        r.parametro_codigo?.toUpperCase().includes(cod) ||
        r.parametro?.toUpperCase().includes(cod),
      );
      if (!rows.length) return { label, unidad, noData: true, m3_total: null, removida: null, kg_m3: null, total_kg: null, costo_kg: null };

      const ent = rows.map(r => r.pulmon).filter((v): v is number => v != null);
      const sal = rows.map(r => r.gem_salida).filter((v): v is number => v != null);
      const pct = rows.map(r => r.pct_remocion_gem).filter((v): v is number => v != null);

      const avg_ent_val = numAvg(ent);
      const avg_sal_val = numAvg(sal);
      const removida = (avg_ent_val != null && avg_sal_val != null) ? avg_ent_val - avg_sal_val : null;
      const kg_m3    = removida != null ? removida / 1000 : null;
      const total_kg = (kg_m3 != null && m3_total > 0) ? +(kg_m3 * m3_total).toFixed(1) : null;
      const costo_kg = (total_kg != null && total_kg > 0) ? Math.round(costoTotal / total_kg) : null;

      return {
        label, unidad, noData: false,
        ent_avg:  avg_ent_val,
        sal_avg:  avg_sal_val,
        ent_p90:  numP90(ent),
        sal_p90:  numP90(sal),
        ent_ie:   numIE(ent),
        sal_ie:   numIE(sal),
        pct_rem:  numAvg(pct),
        m3_total,
        removida,
        kg_m3,
        total_kg,
        costo_kg,
      };
    });
  }, [remociones, gemEficiencia, kpis]);

  if (loading) {
    return (
      <div className="cal-page">
        <div className="cal-loading"><div className="spinner" /><span>Cargando costos químicos…</span></div>
      </div>
    );
  }

  const topRadius = (idx: number): [number, number, number, number] =>
    idx === productosFiltrados.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0];

  /* estilos de tabla */
  const thStyle: React.CSSProperties = {
    padding: '7px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700,
    color: theme.muted, letterSpacing: '.06em', textTransform: 'uppercase',
    background: theme.surface, borderBottom: `1px solid ${theme.border}`, whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '6px 10px', fontSize: 11, color: theme.text2,
    borderBottom: `1px solid ${theme.border2}`, whiteSpace: 'nowrap',
  };
  const tdNum: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontFamily: 'monospace' };

  return (
    <>
    <div className="cal-page">

      {/* ── Encabezado ── */}
      <div className="cal-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="cal-title">Dashboard Costos Químicos</h1>
          <p className="cal-subtitle">Consumo, PPM, costos operativos y proyección vs real por sistema y reactivo</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignSelf: 'center' }}>
          <button
            onClick={() => setFiltrosAbiertos(v => !v)}
            style={{ background: filtrosAbiertos ? theme.surface2 : theme.surface, border: `1px solid ${theme.border}`, padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: theme.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ fontSize: 13 }}>⚙</span>
            Filtros
            <span style={{ fontSize: 10, opacity: 0.7 }}>{filtrosAbiertos ? '▲' : '▼'}</span>
          </button>
          <button
            onClick={() => setInformeAbierto(true)}
            style={{ background: '#8a4000', border: 'none', padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
          >
            ⚗️ Informe
          </button>
        </div>
      </div>

      {/* ── Filtros principales (colapsables) ── */}
      {filtrosAbiertos && (
        <div className="cal-filters" style={{ marginBottom: 8 }}>
          <GranularidadSelector value={granularidad} onChange={setGranularidad} />
          <div className="cal-filter-group">
            <label className="cal-filter-label">Sistema</label>
            <select className="cal-filter-select" value={sistema} onChange={e => setSistema(e.target.value)}>
              <option value="">Todos</option>
              <option value="GEM">GEM</option>
              <option value="RO">RO</option>
              <option value="PTAP">PTAP</option>
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
          <div className="cal-filter-group">
            <label className="cal-filter-label">Mes proyección</label>
            <select className="cal-filter-select" value={mesProyec} onChange={e => setMesProyec(e.target.value)}>
              <option value="">Todos</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{MESES[m]}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ── Filtro por reactivo (chips) — visible solo cuando filtros están abiertos ── */}
      {filtrosAbiertos && productos.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 16, padding: '8px 0' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#6e7681', letterSpacing: '.08em', textTransform: 'uppercase', marginRight: 4 }}>
            Reactivos:
          </span>
          {productos.map(p => {
            const activo = reactivosFiltro.length === 0 || reactivosFiltro.includes(p);
            return (
              <button key={p}
                onClick={() => setReactivosFiltro(prev =>
                  prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p],
                )}
                style={{
                  padding: '4px 12px', borderRadius: 14, cursor: 'pointer', fontSize: 11,
                  border: `1px solid ${activo ? colorKG(p) : theme.border}`,
                  background: activo ? colorKG(p) + '22' : 'transparent',
                  color: activo ? colorKG(p) : theme.dim,
                  transition: 'all .15s',
                }}
              >
                <span style={{ marginRight: 5, fontSize: 9 }}>●</span>{p}
              </button>
            );
          })}
          {reactivosFiltro.length > 0 && (
            <button onClick={() => setReactivosFiltro([])}
              style={{ fontSize: 10, color: theme.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}>
              ✕ mostrar todos
            </button>
          )}
        </div>
      )}

      {error && (
        <div style={{ padding: 12, background: '#2d1214', border: `1px solid ${theme.red}`, borderRadius: 6, color: theme.red, marginBottom: 16, fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* ── KPIs ── */}
      <section className="dash-section">
        <div className="section-title">Resumen del Período</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <KpiCard label="Costo total químicos"  value={fmtCOP(kpis.total_costo)} unit="COP período"       color="#f85149" />
          <KpiCard label="Kg consumidos total"   value={kpis.total_kg.toFixed(0)} unit="kg período"        color="#3fb950" />
          <KpiCard label="Eficiencia $/m³ prom." value={kpis.promPesosM3 != null ? `$${kpis.promPesosM3.toFixed(0)}` : '—'} unit="COP/m³ tratado" color="#d29922" />
          <KpiCard label="Días con registro"     value={String(kpis.n_dias)}      unit="días de operación" color="#58a6ff" />
        </div>
      </section>

      {/* ── Sección GEM — 2 gráficos ── */}
      {gemAgrupado.length > 0 && (
        <section className="dash-section">
          <div className="section-title">GEM — $m³ TRATAMIENTO</div>
          <div className="dash-row-2col">
            <ChartCard title="$m³ TRATAMIENTO GEM" subtitle="Barras: m³ tratados · Línea: COP/m³">
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={gemAgrupado} margin={{ top: 6, right: 52, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="fecha" tick={AXIS_TICK_SM} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" tick={AXIS_TICK_SM} width={46} domain={[0, 'auto']}
                    label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 9, dx: -4 }} />
                  <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_SM} width={52}
                    tickFormatter={fmtM3}
                    label={{ value: '$/m³', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 9, dx: 6 }} />
                  <Tooltip {...TOOLTIP_STYLE}
                    formatter={(val: number, name: string) =>
                      name === 'INDICADOR $m³'
                        ? [`$${Number(val).toLocaleString('es-CO')}/m³`, name]
                        : [`${Number(val).toFixed(0)} m³`, name]} />
                  <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                  <Bar yAxisId="left" dataKey="caudal_m3" name="CAUDAL TOTAL TRATADO GEM"
                    fill="#B4C6E7" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="pesos_por_m3" name="INDICADOR $m³"
                    stroke="#ED7D31" strokeWidth={2.25} dot={{ r: 3, fill: '#ED7D31' }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="TIEMPO DE OPERACIÓN — SISTEMA GEM" subtitle="Barras: horas de operación · Línea: INDICADOR $/m³">
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={gemAgrupado} margin={{ top: 6, right: 52, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="fecha" tick={AXIS_TICK_SM} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" tick={AXIS_TICK_SM} width={46} domain={[0, 'auto']}
                    label={{ value: 'h', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 9, dx: -4 }} />
                  <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_SM} width={52}
                    tickFormatter={fmtM3}
                    label={{ value: '$/m³', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 9, dx: 10 }} />
                  <Tooltip {...TOOLTIP_STYLE}
                    formatter={(val: number, name: string) =>
                      name === 'INDICADOR $/m³'
                        ? [`$${Number(val).toLocaleString('es-CO')}/m³`, name]
                        : [`${Number(val).toFixed(1)} h`, name]} />
                  <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                  <Bar yAxisId="left" dataKey="horas_op" name="HORAS DE OPERACIÓN GEM"
                    fill="#B4C6E7" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="pesos_por_m3" name="INDICADOR $/m³"
                    stroke="#ED7D31" strokeWidth={2.25} dot={{ r: 3, fill: '#ED7D31' }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </section>
      )}

      {/* ── Sección RO — 2 gráficos ── */}
      <section className="dash-section">
          <div className="section-title">OSMOSIS INVERSA — INDICADOR RO</div>
          <div className="dash-row-2col">
            <ChartCard title="INDICADOR RO" subtitle="Barras: m³ enviados a RO · Línea verde: límite · Línea naranja: $/m³">
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={roAgrupado} margin={{ top: 6, right: 52, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="fecha" tick={AXIS_TICK_SM} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" tick={AXIS_TICK_SM} width={46} domain={[0, 'auto']}
                    label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 9, dx: -4 }} />
                  <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_SM} width={52}
                    tickFormatter={fmtM3}
                    label={{ value: '$/m³', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 9, dx: 6 }} />
                  <Tooltip {...TOOLTIP_STYLE}
                    formatter={(val: number, name: string) =>
                      name === 'INDICADOR $m³ RO'
                        ? [`$${Number(val).toLocaleString('es-CO')}/m³`, name]
                        : name === 'LIMITE INDICADOR M3'
                        ? [`$${Number(val).toLocaleString('es-CO')}/m³`, name]
                        : [`${Number(val).toFixed(0)} m³`, name]} />
                  <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                  <Bar yAxisId="left" dataKey="caudal_m3" name="VOLUMEN ENVIADO A RO (m³)"
                    fill="#B4C6E7" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="pesos_por_m3" name="INDICADOR $m³ RO"
                    stroke="#ED7D31" strokeWidth={2.25} dot={{ r: 3, fill: '#ED7D31' }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="TIEMPO DE OPERACIÓN — SISTEMA OSMOSIS INVERSA" subtitle="Barras: horas de operación · Línea: INDICADOR $/m³">
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={roAgrupado} margin={{ top: 6, right: 52, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="fecha" tick={AXIS_TICK_SM} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" tick={AXIS_TICK_SM} width={46} domain={[0, 'auto']}
                    label={{ value: 'h', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 9, dx: -4 }} />
                  <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_SM} width={52}
                    tickFormatter={fmtM3}
                    label={{ value: '$/m³', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 9, dx: 10 }} />
                  <Tooltip {...TOOLTIP_STYLE}
                    formatter={(val: number, name: string) =>
                      name === 'INDICADOR $/m³'
                        ? [`$${Number(val).toLocaleString('es-CO')}/m³`, name]
                        : [`${Number(val).toFixed(1)} h`, name]} />
                  <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                  <Bar yAxisId="left" dataKey="horas_op" name="HORAS DE OPERACIÓN RO"
                    fill="#B4C6E7" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="pesos_por_m3" name="INDICADOR $/m³"
                    stroke="#ED7D31" strokeWidth={2.25} dot={{ r: 3, fill: '#ED7D31' }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </section>

      {/* ── 4 Gráficas (2 × 2) ── */}
      <section className="dash-section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Chart 1: PPM Vs $/m³ */}
          <ChartCard title="CONSUMO PPM Vs $M3" subtitle="Dosificación diaria por reactivo (PPM) · línea: $/m³">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={datosFecha} margin={{ top: 6, right: 52, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tick={AXIS_TICK_SM} interval="preserveStartEnd" />
                {Y_LEFT}{Y_RIGHT}
                <Tooltip {...TOOLTIP_STYLE}
                  formatter={(val: number, name: string) => name === '$/m³ total'
                    ? [`$${Number(val).toLocaleString('es-CO')}/m³`, name]
                    : [`${val} ppm`, name.replace('ppm_', '')]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} formatter={(v: string) => v.replace('ppm_', '')} />
                {productosFiltrados.map((p, i) => (
                  <Bar key={p} yAxisId="left" dataKey={`ppm_${p}`} name={`ppm_${p}`}
                    stackId="ppm" fill={colorPPM(p)} radius={topRadius(i)} />
                ))}
                {LINE_M3}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 2: KG Vs $/m³ */}
          <ChartCard title="CONSUMO KG Vs $M3" subtitle="Kg consumidos por reactivo · línea: $/m³">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={datosFecha} margin={{ top: 6, right: 52, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tick={AXIS_TICK_SM} interval="preserveStartEnd" />
                {Y_LEFT}{Y_RIGHT}
                <Tooltip {...TOOLTIP_STYLE}
                  formatter={(val: number, name: string) => name === '$/m³ total'
                    ? [`$${Number(val).toLocaleString('es-CO')}/m³`, name]
                    : [`${Number(val).toFixed(2)} kg`, name.replace('kg_', '')]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} formatter={(v: string) => v.replace('kg_', '')} />
                {productosFiltrados.map((p, i) => (
                  <Bar key={p} yAxisId="left" dataKey={`kg_${p}`} name={`kg_${p}`}
                    stackId="kg" fill={colorKG(p)} radius={topRadius(i)} />
                ))}
                {LINE_M3}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 3: Consumo Litros Vs $/m³ — PT-02 TablaDinámica6 */}
          <ChartCard title="CONSUMO (L) Vs $M3" subtitle="Litros consumidos por reactivo · línea: $/m³ (polímeros sólidos muestran null)">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={datosFecha} margin={{ top: 6, right: 52, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tick={AXIS_TICK_SM} interval="preserveStartEnd" />
                <YAxis yAxisId="left" tick={AXIS_TICK_SM} width={52}
                  label={{ value: 'L', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 9, dx: -4 }} />
                {Y_RIGHT}
                <Tooltip {...TOOLTIP_STYLE}
                  formatter={(val: number, name: string) => name === '$/m³ total'
                    ? [`$${Number(val).toLocaleString('es-CO')}/m³`, name]
                    : [`${Number(val).toFixed(1)} L`, name.replace('L_', '')]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} formatter={(v: string) => v.replace('L_', '')} />
                {productosFiltrados.map((p, i) => (
                  <Bar key={p} yAxisId="left" dataKey={`L_${p}`} name={`L_${p}`}
                    stackId="L" fill={colorKG(p)} radius={topRadius(i)} />
                ))}
                {LINE_M3}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 4: $/m³ por reactivo */}
          <ChartCard title="$ QUIMICO / M3" subtitle="Composición del costo operativo en $/m³ · línea: total">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={datosFecha} margin={{ top: 6, right: 52, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tick={AXIS_TICK_SM} interval="preserveStartEnd" />
                <YAxis yAxisId="left" tick={AXIS_TICK_SM} width={52} tickFormatter={fmtM3}
                  label={{ value: '$/m³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 9, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_SM} width={52} tickFormatter={fmtM3} />
                <Tooltip {...TOOLTIP_STYLE}
                  formatter={(val: number, name: string) =>
                    [`$${Number(val).toLocaleString('es-CO')}/m³`, name === '$/m³ total' ? name : name.replace('costo_m3_', '')]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} formatter={(v: string) => v.replace('costo_m3_', '')} />
                {productosFiltrados.map((p, i) => (
                  <Bar key={p} yAxisId="left" dataKey={`costo_m3_${p}`} name={`costo_m3_${p}`}
                    stackId="m3" fill={colorM3(p)} radius={topRadius(i)} />
                ))}
                <Line yAxisId="right" type="monotone" dataKey="indicador_m3" name="$/m³ total"
                  stroke="#70AD47" strokeWidth={2.25} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>
      </section>

      {/* ── Tabla resumen por reactivo ── */}
      {tablaReactivos.length > 0 && (
        <section className="dash-section">
          <div className="section-title">Estadísticas por Reactivo</div>
          <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Reactivo</th>
                    <th style={{ ...thStyle, color: '#9e7aff' }}>PPM Mín</th>
                    <th style={{ ...thStyle, color: '#9e7aff' }}>PPM Prom</th>
                    <th style={{ ...thStyle, color: '#9e7aff' }}>PPM Máx</th>
                    <th style={{ ...thStyle, color: '#58a6ff' }}>KG Mín/día</th>
                    <th style={{ ...thStyle, color: '#58a6ff' }}>KG Prom/día</th>
                    <th style={{ ...thStyle, color: '#58a6ff' }}>KG Máx/día</th>
                    <th style={{ ...thStyle, color: '#58a6ff' }}>KG Total</th>
                    <th style={{ ...thStyle, color: '#f85149' }}>Costo Total</th>
                    <th style={{ ...thStyle, color: '#3fb950' }}>Real kg/m³</th>
                    <th style={{ ...thStyle, color: '#d29922' }}>Proy kg/m³</th>
                    <th style={{ ...thStyle, color: '#d29922' }}>Cumpl. %</th>
                  </tr>
                </thead>
                <tbody>
                  {tablaReactivos.map((row, idx) => (
                    <tr key={row.nombre}
                      style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)' }}>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>
                        <span style={{ color: colorKG(row.nombre), marginRight: 6 }}>●</span>
                        {row.nombre}
                      </td>
                      <td style={tdNum}>{fmtNum(row.ppm_min)}</td>
                      <td style={{ ...tdNum, color: '#c9d1d9', fontWeight: 600 }}>{fmtNum(row.ppm_avg)}</td>
                      <td style={tdNum}>{fmtNum(row.ppm_max)}</td>
                      <td style={tdNum}>{fmtNum(row.kg_min, 2)}</td>
                      <td style={{ ...tdNum, color: '#c9d1d9', fontWeight: 600 }}>{fmtNum(row.kg_avg, 2)}</td>
                      <td style={tdNum}>{fmtNum(row.kg_max, 2)}</td>
                      <td style={{ ...tdNum, color: '#58a6ff' }}>
                        {row.kg_total != null ? row.kg_total.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : '—'}
                      </td>
                      <td style={{ ...tdNum, color: '#f85149' }}>
                        {row.costo_total != null ? fmtCOP(row.costo_total) : '—'}
                      </td>
                      <td style={{ ...tdNum, color: '#3fb950' }}>{fmtNum(row.real_kg_m3, 4)}</td>
                      <td style={{ ...tdNum, color: '#d29922' }}>{fmtNum(row.proy_kg_m3, 4)}</td>
                      <td style={{ ...tdNum, color: row.cumpl_pct != null && row.cumpl_pct > 100 ? '#f85149' : '#3fb950' }}>
                        {row.cumpl_pct != null ? `${row.cumpl_pct.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── Estadísticas detalladas por reactivo PPM · L/Día · KG/Día · $ ── */}
      {tablaReactivos.length > 0 && (
        <section className="dash-section">
          <div className="section-title">ESTADÍSTICAS DETALLADAS POR REACTIVO — PPM · L/Día · KG/Día · $</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {tablaReactivos.map(row => {
              const lStat = lDiaStats[row.nombre];
              const color = colorKG(row.nombre);
              return (
                <div key={row.nombre} className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ background: color + '22', borderBottom: `2px solid ${color}`, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color, fontSize: 14 }}>●</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: theme.text2 }}>{row.nombre}</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['', 'PPM', 'L/Día', 'KG/Día', '$'].map(h => (
                          <th key={h} style={{ ...thStyle, fontSize: 9, padding: '5px 8px', textAlign: h === '' ? 'left' : 'right' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'MÍNIMO',   ppm: row.ppm_min, l: lStat?.min,   kg: row.kg_min,   costo: null },
                        { label: 'MÁXIMO',   ppm: row.ppm_max, l: lStat?.max,   kg: row.kg_max,   costo: null },
                        { label: 'PROMEDIO', ppm: row.ppm_avg, l: lStat?.avg,   kg: row.kg_avg,   costo: null },
                        { label: 'TOTAL',    ppm: null,        l: lStat?.total, kg: row.kg_total, costo: row.costo_total },
                      ].map((r, i) => (
                        <tr key={r.label} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)' }}>
                          <td style={{ ...tdStyle, fontSize: 10, fontWeight: 600, color: '#6e7681', padding: '5px 8px' }}>{r.label}</td>
                          <td style={{ ...tdNum, fontSize: 10, padding: '5px 8px' }}>{r.ppm != null ? r.ppm.toFixed(1) : '—'}</td>
                          <td style={{ ...tdNum, fontSize: 10, padding: '5px 8px' }}>{r.l != null ? r.l.toFixed(0) : '—'}</td>
                          <td style={{ ...tdNum, fontSize: 10, padding: '5px 8px', color }}>{r.kg != null ? r.kg.toFixed(1) : '—'}</td>
                          <td style={{ ...tdNum, fontSize: 10, padding: '5px 8px', color: theme.red }}>{r.costo != null ? fmtCOP(r.costo) : '—'}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'rgba(255,255,255,.04)' }}>
                        <td style={{ ...tdStyle, fontSize: 10, fontWeight: 600, color: '#6e7681', padding: '5px 8px' }}>REAL Kg/m³</td>
                        <td style={{ ...tdNum, fontSize: 10, padding: '5px 8px' }} colSpan={2}>—</td>
                        <td style={{ ...tdNum, fontSize: 10, padding: '5px 8px', color: '#70AD47' }}>{row.real_kg_m3 != null ? row.real_kg_m3.toFixed(4) : '—'}</td>
                        <td style={{ ...tdNum, fontSize: 10, padding: '5px 8px' }}>—</td>
                      </tr>
                      <tr>
                        <td style={{ ...tdStyle, fontSize: 10, fontWeight: 600, color: '#6e7681', padding: '5px 8px' }}>PROY Kg/m³</td>
                        <td style={{ ...tdNum, fontSize: 10, padding: '5px 8px' }} colSpan={2}>—</td>
                        <td style={{ ...tdNum, fontSize: 10, padding: '5px 8px', color: '#FFC000' }}>{row.proy_kg_m3 != null ? row.proy_kg_m3.toFixed(4) : '—'}</td>
                        <td style={{ ...tdNum, fontSize: 10, padding: '5px 8px' }}>—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Tabla Remoción DQO/SST con Costos ── */}
      {tablaRemocion.some(r => !r.noData) && (
        <section className="dash-section">
          <div className="section-title">REMOCIÓN DQO · SST — Carga Removida y Costo</div>
          <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Parámetro', 'Inicial (mg/L)', 'Salida (mg/L)', 'Removida (mg/L)', 'KG Rem./m³', 'M³ Tratados', 'Total KG Rem.', '$/KG Removido'].map(h => (
                      <th key={h} style={{ ...thStyle, textAlign: h === 'Parámetro' ? 'left' : 'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tablaRemocion.filter(r => !r.noData && r.removida != null).map((row, idx) => (
                    <tr key={row.label} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)' }}>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{row.label} <span style={{ fontSize: 9, color: '#484f58' }}>{row.unidad}</span></td>
                      <td style={tdNum}>{row.ent_avg != null ? row.ent_avg.toFixed(0) : '—'}</td>
                      <td style={tdNum}>{row.sal_avg != null ? row.sal_avg.toFixed(0) : '—'}</td>
                      <td style={{ ...tdNum, color: '#70AD47' }}>{row.removida != null ? row.removida.toFixed(0) : '—'}</td>
                      <td style={tdNum}>{row.kg_m3 != null ? row.kg_m3.toFixed(4) : '—'}</td>
                      <td style={tdNum}>{row.m3_total != null ? row.m3_total.toFixed(0) : '—'}</td>
                      <td style={{ ...tdNum, color: '#4472C4' }}>{row.total_kg != null ? row.total_kg.toFixed(0) : '—'}</td>
                      <td style={{ ...tdNum, color: '#ED7D31', fontWeight: 700 }}>{row.costo_kg != null ? fmtCOP(row.costo_kg) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

    </div>

    {informeAbierto && (
      <InformeCostosModal
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        onClose={() => setInformeAbierto(false)}
      />
    )}
    </>
  );
}
