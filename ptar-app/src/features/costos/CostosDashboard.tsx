import { useState, useMemo, useEffect } from 'react';
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
  getReporteCostosHtmlUrl,
  getCalidadRemociones,
  type RemocionCalidad,
} from '../../services/ptarClient';
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

const PRODUCT_COLORS: Record<string, string> = {
  'Ácido':              '#f85149',
  'Coagulante':         '#3fb950',
  'Decolorante':        '#d29922',
  'Polímero Aniónico':  '#9e7aff',
  'Polímero Catiónico': '#58a6ff',
  'Anti-incrustante':   '#00c5e3',
  'Biocida / Desinfectante': '#ff7d31',
  'Limpiador Químico':  '#e6a829',
};
function colorFor(nombre: string): string {
  for (const [key, col] of Object.entries(PRODUCT_COLORS)) {
    if (nombre.toLowerCase().includes(key.toLowerCase().split(' ')[0])) return col;
  }
  return '#8b949e';
}

/* ── byGranularidad ─────────────────────────────────────────────────── */
function byGranularidad(rows: ConsumoQuimicoDiaRow[], gran: Granularidad | null) {
  type Bucket = {
    sk: string; label: string;
    productos: Record<string, { kg: number; costo: number; ppm: number[]; caudal: number }>;
    caudalTotal: number;
  };
  const map = new Map<string, Bucket>();

  for (const r of rows) {
    const sk    = sortKey(r.fecha, undefined, gran);
    const label = xLabel(r.fecha, undefined, gran);
    if (!map.has(sk)) map.set(sk, { sk, label, productos: {}, caudalTotal: 0 });
    const bucket = map.get(sk)!;
    const p = r.producto_nombre;
    if (!bucket.productos[p]) bucket.productos[p] = { kg: 0, costo: 0, ppm: [], caudal: 0 };
    const pe = bucket.productos[p];
    if (r.kg_dia        != null) pe.kg     += r.kg_dia;
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

/* ── sub-componentes ─────────────────────────────────────────────────── */
function KpiCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="dash-card" style={{ padding: '14px 18px', textAlign: 'center', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: '#484f58', marginTop: 2 }}>{unit}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="dash-card" style={{ padding: '14px 8px 8px' }}>
      <div style={{ paddingLeft: 10, marginBottom: 2 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#c9d1d9', letterSpacing: '.02em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 10, color: '#6e7681', marginTop: 1 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

/* ── componente principal ────────────────────────────────────────────── */
export default function CostosDashboard() {
  const anioActual = new Date().getFullYear();

  const { granularidad, setGranularidad, fechaInicio, fechaFin, handleFechaInicio, handleFechaFin } = useGranularidad();
  const [sistema,        setSistema]        = useState('GEM');
  const [mesProyec,      setMesProyec]      = useState(String(new Date().getMonth() + 1));
  const [reactivosFiltro, setReactivosFiltro] = useState<string[]>([]);
  const [remociones,     setRemociones]     = useState<RemocionCalidad[]>([]);

  const { consumoDiario, proyeccion, estadisticas, gemEficiencia, loading, error } =
    useCostosData(fechaInicio, fechaFin, sistema);

  /* fetch remoción DQO/SST/Color */
  useEffect(() => {
    if (!fechaInicio || !fechaFin) return;
    getCalidadRemociones({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })
      .then(setRemociones)
      .catch(() => setRemociones([]));
  }, [fechaInicio, fechaFin]);

  /* agrupación temporal */
  const { result: datosFecha, productos } = useMemo(
    () => byGranularidad(consumoDiario, granularidad),
    [consumoDiario, granularidad],
  );

  /* reactivos filtrados para gráficas */
  const productosFiltrados = reactivosFiltro.length > 0
    ? productos.filter(p => reactivosFiltro.includes(p))
    : productos;

  /* KPIs */
  const kpis = useMemo(() => {
    const total_kg    = consumoDiario.reduce((s, r) => s + (r.kg_dia ?? 0), 0);
    const total_costo = consumoDiario.reduce((s, r) => s + (r.costo_dia ?? 0), 0);
    const pesosM3     = gemEficiencia.filter(r => r.pesos_por_m3 != null).map(r => r.pesos_por_m3 as number);
    const promPesosM3 = pesosM3.length ? pesosM3.reduce((a, b) => a + b, 0) / pesosM3.length : null;
    const diasSet     = new Set(consumoDiario.map(r => r.fecha));
    return { total_kg, total_costo, promPesosM3, n_dias: diasSet.size };
  }, [consumoDiario, gemEficiencia]);

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
    return PARAMS.map(({ cod, label, unidad }) => {
      const rows = remociones.filter(r =>
        r.parametro_codigo?.toUpperCase().includes(cod) ||
        r.parametro?.toUpperCase().includes(cod),
      );
      if (!rows.length) return { label, unidad, noData: true };

      const ent = rows.map(r => r.pulmon).filter((v): v is number => v != null);
      const sal = rows.map(r => r.gem_salida).filter((v): v is number => v != null);
      const pct = rows.map(r => r.pct_remocion_gem).filter((v): v is number => v != null);

      return {
        label, unidad, noData: false,
        ent_avg:  numAvg(ent),
        sal_avg:  numAvg(sal),
        ent_p90:  numP90(ent),
        sal_p90:  numP90(sal),
        ent_ie:   numIE(ent),
        sal_ie:   numIE(sal),
        pct_rem:  numAvg(pct),
      };
    });
  }, [remociones]);

  if (loading) {
    return (
      <div className="cal-page">
        <div className="cal-loading"><div className="spinner" /><span>Cargando costos químicos…</span></div>
      </div>
    );
  }

  /* ejes compartidos */
  const yLeft  = <YAxis yAxisId="left"  tick={AXIS_TICK_SM} width={46} />;
  const yRight = (
    <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_SM} width={52}
      tickFormatter={fmtM3}
      label={{ value: '$/m³', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 9, dx: 6 }}
    />
  );
  const topRadius = (idx: number): [number, number, number, number] =>
    idx === productosFiltrados.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0];
  const lineM3 = (
    <Line yAxisId="right" type="monotone" dataKey="indicador_m3" name="$/m³ total"
      stroke="#3fb950" strokeWidth={2} dot={false} connectNulls />
  );

  /* estilos de tabla */
  const thStyle: React.CSSProperties = {
    padding: '7px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700,
    color: '#8b949e', letterSpacing: '.06em', textTransform: 'uppercase',
    background: '#161b22', borderBottom: '1px solid #30363d', whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '6px 10px', fontSize: 11, color: '#c9d1d9',
    borderBottom: '1px solid #21262d', whiteSpace: 'nowrap',
  };
  const tdNum: React.CSSProperties = { ...tdStyle, textAlign: 'right', fontFamily: 'monospace' };

  return (
    <div className="cal-page">

      {/* ── Encabezado ── */}
      <div className="cal-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="cal-title">Dashboard Costos Químicos</h1>
          <p className="cal-subtitle">Consumo, PPM, costos operativos y proyección vs real por sistema y reactivo</p>
        </div>
        <a
          href={getReporteCostosHtmlUrl({ anio: anioActual, mes: mesProyec ? Number(mesProyec) : undefined, sistema: sistema || undefined })}
          target="_blank" rel="noopener noreferrer"
          style={{ background: '#3fb950', textDecoration: 'none', alignSelf: 'center', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#fff' }}
        >
          ⚗️ Informe Costos
        </a>
      </div>

      {/* ── Filtros principales ── */}
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
          <input type="date" className="cal-filter-input" value={fechaInicio}
            onChange={e => handleFechaInicio(e.target.value)} />
        </div>
        <div className="cal-filter-group">
          <label className="cal-filter-label">Fecha fin</label>
          <input type="date" className="cal-filter-input" value={fechaFin}
            onChange={e => handleFechaFin(e.target.value)} />
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

      {/* ── Filtro por reactivo (chips) ── */}
      {productos.length > 0 && (
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
                  border: `1px solid ${activo ? colorFor(p) : '#30363d'}`,
                  background: activo ? colorFor(p) + '22' : 'transparent',
                  color: activo ? colorFor(p) : '#484f58',
                  transition: 'all .15s',
                }}
              >
                <span style={{ marginRight: 5, fontSize: 9 }}>●</span>{p}
              </button>
            );
          })}
          {reactivosFiltro.length > 0 && (
            <button onClick={() => setReactivosFiltro([])}
              style={{ fontSize: 10, color: '#8b949e', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}>
              ✕ mostrar todos
            </button>
          )}
        </div>
      )}

      {error && (
        <div style={{ padding: 12, background: '#2d1214', border: '1px solid #f85149', borderRadius: 6, color: '#f85149', marginBottom: 16, fontSize: 12 }}>
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

      {/* ── 4 Gráficas (2 × 2) ── */}
      <section className="dash-section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Chart 1: PPM Vs $/m³ */}
          <ChartCard title="CONSUMO PPM Vs $/m³" subtitle="Dosificación diaria por reactivo (PPM) · línea: $/m³">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={datosFecha} margin={{ top: 6, right: 52, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tick={AXIS_TICK_SM} interval="preserveStartEnd" />
                {yLeft}{yRight}
                <Tooltip {...TOOLTIP_STYLE}
                  formatter={(val: number, name: string) => name === '$/m³ total'
                    ? [`$${Number(val).toLocaleString('es-CO')}/m³`, name]
                    : [`${val} ppm`, name.replace('ppm_', '')]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} formatter={(v: string) => v.replace('ppm_', '')} />
                {productosFiltrados.map((p, i) => (
                  <Bar key={p} yAxisId="left" dataKey={`ppm_${p}`} name={`ppm_${p}`}
                    stackId="ppm" fill={colorFor(p)} radius={topRadius(i)} />
                ))}
                {lineM3}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 2: KG Vs $/m³ */}
          <ChartCard title="CONSUMO KG Vs $/m³" subtitle="Kg consumidos por reactivo · línea: $/m³">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={datosFecha} margin={{ top: 6, right: 52, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tick={AXIS_TICK_SM} interval="preserveStartEnd" />
                {yLeft}{yRight}
                <Tooltip {...TOOLTIP_STYLE}
                  formatter={(val: number, name: string) => name === '$/m³ total'
                    ? [`$${Number(val).toLocaleString('es-CO')}/m³`, name]
                    : [`${Number(val).toFixed(2)} kg`, name.replace('kg_', '')]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} formatter={(v: string) => v.replace('kg_', '')} />
                {productosFiltrados.map((p, i) => (
                  <Bar key={p} yAxisId="left" dataKey={`kg_${p}`} name={`kg_${p}`}
                    stackId="kg" fill={colorFor(p)} radius={topRadius(i)} />
                ))}
                {lineM3}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 3: COSTO $ Vs $/m³ */}
          <ChartCard title="COSTO $ Vs $/m³" subtitle="Costo COP diario por reactivo · línea: $/m³">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={datosFecha} margin={{ top: 6, right: 52, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tick={AXIS_TICK_SM} interval="preserveStartEnd" />
                <YAxis yAxisId="left" tick={AXIS_TICK_SM} width={52}
                  tickFormatter={(v: number) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                {yRight}
                <Tooltip {...TOOLTIP_STYLE}
                  formatter={(val: number, name: string) => name === '$/m³ total'
                    ? [`$${Number(val).toLocaleString('es-CO')}/m³`, name]
                    : [`$${Number(val).toLocaleString('es-CO')}`, name.replace('costo_', '')]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} formatter={(v: string) => v.replace('costo_', '')} />
                {productosFiltrados.map((p, i) => (
                  <Bar key={p} yAxisId="left" dataKey={`costo_${p}`} name={`costo_${p}`}
                    stackId="costo" fill={colorFor(p)} radius={topRadius(i)} />
                ))}
                {lineM3}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 4: $/m³ por reactivo */}
          <ChartCard title="$/m³ POR REACTIVO" subtitle="Composición del costo operativo en $/m³ · línea: total">
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
                    stackId="m3" fill={colorFor(p)} radius={topRadius(i)} />
                ))}
                <Line yAxisId="right" type="monotone" dataKey="indicador_m3" name="$/m³ total"
                  stroke="#3fb950" strokeWidth={2} dot={false} connectNulls />
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
                        <span style={{ color: colorFor(row.nombre), marginRight: 6 }}>●</span>
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

      {/* ── Tabla remoción GEM: DQO · SST · Color ── */}
      <section className="dash-section">
        <div className="section-title">Remoción GEM — DQO · SST · Color</div>
        <div className="dash-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Parámetro</th>
                  <th style={{ ...thStyle, color: '#f85149' }}>Entrada Prom</th>
                  <th style={{ ...thStyle, color: '#3fb950' }}>Salida Prom</th>
                  <th style={{ ...thStyle, color: '#f85149' }}>Entrada P90</th>
                  <th style={{ ...thStyle, color: '#3fb950' }}>Salida P90</th>
                  <th style={{ ...thStyle, color: '#d29922' }}>% Remoción</th>
                  <th style={{ ...thStyle, color: '#9e7aff' }}>IE Entrada</th>
                  <th style={{ ...thStyle, color: '#9e7aff' }}>IE Salida</th>
                </tr>
              </thead>
              <tbody>
                {tablaRemocion.map((row, idx) => (
                  <tr key={row.label}
                    style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)' }}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#c9d1d9' }}>
                      {row.label}
                      <span style={{ fontSize: 9, color: '#484f58', marginLeft: 5 }}>{row.unidad}</span>
                    </td>
                    {row.noData ? (
                      <td colSpan={7} style={{ ...tdStyle, color: '#484f58', fontStyle: 'italic' }}>
                        Sin datos en el período
                      </td>
                    ) : (
                      <>
                        <td style={{ ...tdNum, color: '#f85149' }}>{fmtNum(row.ent_avg, 0)}</td>
                        <td style={{ ...tdNum, color: '#3fb950' }}>{fmtNum(row.sal_avg, 0)}</td>
                        <td style={{ ...tdNum, color: '#f85149' }}>{fmtNum(row.ent_p90, 0)}</td>
                        <td style={{ ...tdNum, color: '#3fb950' }}>{fmtNum(row.sal_p90, 0)}</td>
                        <td style={{ ...tdNum, color: '#d29922', fontWeight: 700 }}>
                          {row.pct_rem != null ? `${row.pct_rem.toFixed(1)}%` : '—'}
                        </td>
                        <td style={{ ...tdNum, color: '#9e7aff' }}>{fmtNum(row.ent_ie, 3)}</td>
                        <td style={{ ...tdNum, color: '#9e7aff' }}>{fmtNum(row.sal_ie, 3)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ fontSize: 10, color: '#484f58', marginTop: 6, paddingLeft: 2 }}>
          IE = Índice de Estabilidad (σ/μ) · P90 = Percentil 90 · Fuente: /api/calidad/remociones
        </div>
      </section>

    </div>
  );
}
