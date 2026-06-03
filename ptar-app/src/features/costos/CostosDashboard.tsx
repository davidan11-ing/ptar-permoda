import { useState, useMemo } from 'react';
import {
  BarChart, Bar, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
type RechartsValue = string | number | (string | number)[];
import { useCostosData, type ConsumoQuimicoDiaRow } from './hooks/useCostosData';
import { getReporteCostosHtmlUrl, type GemEficienciaRow } from '../../services/ptarClient';
import GranularidadSelector from '../../components/shared/GranularidadSelector';
import { useGranularidad } from '../../hooks/useGranularidad';
import { xLabel, sortKey, TURNO_LABEL } from '../../lib/utils/agruparTemporal';

const TOOLTIP_STYLE = {
  contentStyle: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 },
  labelStyle:   { color: '#e6edf3', marginBottom: 4 },
};
const AXIS_TICK = { fill: '#8b949e', fontSize: 10 };

// Label ya viene formateado desde la función de agregación
const fmtFecha = (v: string) => v;

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Colores por reactivo (mismos que GemEficienciaSection)
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

import type { Granularidad } from '../../hooks/useGranularidad';

// ── Agrupa consumo químico por granularidad (pivota productos como columnas) ──
function byGranularidad(rows: ConsumoQuimicoDiaRow[], gran: Granularidad | null) {
  type Bucket = {
    sk: string;
    label: string;
    productos: Record<string, { kg: number; costo: number; ppm: number[]; caudal: number }>;
  };

  const map = new Map<string, Bucket>();

  for (const r of rows) {
    const sk    = sortKey(r.fecha, undefined, gran);
    const label = xLabel(r.fecha, undefined, gran);

    if (!map.has(sk)) map.set(sk, { sk, label, productos: {} });
    const bucket = map.get(sk)!;
    const p = r.producto_nombre;

    if (!bucket.productos[p]) bucket.productos[p] = { kg: 0, costo: 0, ppm: [], caudal: 0 };
    const pe = bucket.productos[p];

    if (r.kg_dia != null)          pe.kg     += r.kg_dia;
    if (r.costo_dia != null)       pe.costo  += r.costo_dia;
    if (r.ppm_promedio_dia != null) pe.ppm.push(r.ppm_promedio_dia);
    if (r.caudal_m3_dia != null)   pe.caudal += r.caudal_m3_dia;
  }

  const productos = Array.from(new Set(rows.map(r => r.producto_nombre)));
  const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;

  const result = Array.from(map.values())
    .sort((a, b) => a.sk.localeCompare(b.sk))
    .map(bucket => {
      const row: Record<string, number | string | null> = { fecha: bucket.label };
      let costoTotal = 0;
      let caudalTotal = 0;
      for (const p of productos) {
        const pe = bucket.productos[p];
        row[`kg_${p}`]    = pe ? +(pe.kg.toFixed(2)) : 0;
        row[`costo_${p}`] = pe ? +(pe.costo.toFixed(0)) : 0;
        row[`ppm_${p}`]   = pe ? avg(pe.ppm) : null;
        if (pe) { costoTotal += pe.costo; caudalTotal += pe.caudal; }
      }
      row['costo_total'] = +costoTotal.toFixed(0);
      row['caudal_m3']   = +caudalTotal.toFixed(1);
      return row;
    });

  return { result, productos };
}

// ── Agrupa datos GEM eficiencia por granularidad ──────────────────────────────
function gemPorGranularidad(rows: GemEficienciaRow[], gran: Granularidad | null) {
  type Bucket = { sk: string; label: string; pesos: number[]; caudal: number };
  const map = new Map<string, Bucket>();

  for (const r of rows) {
    // GEM turno tiene campo turno en formato string ('mañana'/'tarde'/'noche')
    // Necesitamos el número para el label
    const turnoNum = r.turno === 'noche' ? 1 : r.turno === 'mañana' ? 2 : 3;
    const sk    = sortKey(r.fecha, gran === 'turno' ? turnoNum : undefined, gran);
    const label = xLabel(r.fecha, gran === 'turno' ? turnoNum : undefined, gran);

    if (!map.has(sk)) map.set(sk, { sk, label, pesos: [], caudal: 0 });
    const b = map.get(sk)!;
    if (r.pesos_por_m3 != null) b.pesos.push(r.pesos_por_m3);
    if (r.caudal_m3    != null) b.caudal += r.caudal_m3;
  }

  const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(0) : null;

  return Array.from(map.values())
    .sort((a, b) => a.sk.localeCompare(b.sk))
    .map(b => ({
      fecha:       b.label,
      pesos_por_m3: avg(b.pesos),
      caudal_m3:   +b.caudal.toFixed(1),
    }));
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="dash-card" style={{ padding: '14px 18px', textAlign: 'center', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, color: '#484f58', marginTop: 2 }}>{unit}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CostosDashboard() {
  const anioActual = new Date().getFullYear();

  const {
    granularidad, setGranularidad,
    fechaInicio, fechaFin,
    handleFechaInicio, handleFechaFin,
  } = useGranularidad();

  const [sistema,   setSistema]   = useState('GEM');
  const [mesProyec, setMesProyec] = useState(String(new Date().getMonth() + 1));

  const { consumoDiario, proyeccion, estadisticas, gemEficiencia, loading, error } =
    useCostosData(fechaInicio, fechaFin, sistema);

  // ── Datos agrupados por granularidad ─────────────────────────────────────
  const { result: datosFecha, productos } = useMemo(
    () => byGranularidad(consumoDiario, granularidad),
    [consumoDiario, granularidad],
  );

  // ── KPIs del período ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total_kg    = consumoDiario.reduce((s, r) => s + (r.kg_dia ?? 0), 0);
    const total_costo = consumoDiario.reduce((s, r) => s + (r.costo_dia ?? 0), 0);
    const pesosM3     = gemEficiencia.filter(r => r.pesos_por_m3 != null).map(r => r.pesos_por_m3 as number);
    const promPesosM3 = pesosM3.length ? pesosM3.reduce((a, b) => a + b, 0) / pesosM3.length : null;
    const diasSet     = new Set(consumoDiario.map(r => r.fecha));
    return { total_kg, total_costo, promPesosM3, n_dias: diasSet.size };
  }, [consumoDiario, gemEficiencia]);

  // ── Proyección filtrada por mes ────────────────────────────────────────────
  const proyFiltrada = useMemo(
    () => proyeccion.filter(r => !mesProyec || r.mes === Number(mesProyec)),
    [proyeccion, mesProyec],
  );

  // ── GEM $/m³ agrupado por granularidad ────────────────────────────────────
  const gemAgrupado = useMemo(
    () => gemPorGranularidad(gemEficiencia, granularidad),
    [gemEficiencia, granularidad],
  );

  const fmtCOP = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`;

  if (loading) {
    return (
      <div className="cal-page">
        <div className="cal-loading"><div className="spinner" /><span>Cargando costos químicos…</span></div>
      </div>
    );
  }

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
          className="btn-primary btn-sm"
          style={{ background: '#3fb950', textDecoration: 'none', alignSelf: 'center', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#fff' }}
          title="Abre el informe en una nueva pestaña — usa Ctrl+P para guardar como PDF"
        >
          ⚗️ Informe Costos
        </a>
      </div>

      {/* ── Filtros + granularidad integrada ── */}
      <div className="cal-filters" style={{ marginBottom: 16 }}>
        <GranularidadSelector value={granularidad} onChange={setGranularidad} />
        <div className="cal-filter-group">
          <label className="cal-filter-label">Sistema</label>
          <select className="cal-filter-select" value={sistema}
            onChange={e => setSistema(e.target.value)}>
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
          <select className="cal-filter-select" value={mesProyec}
            onChange={e => setMesProyec(e.target.value)}>
            <option value="">Todos los meses</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{MESES[m]}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, background: '#2d1214', border: '1px solid #f85149', borderRadius: 6, color: '#f85149', marginBottom: 16, fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <section className="dash-section">
        <div className="section-title">Resumen del Período</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <KpiCard label="Costo total químicos" value={fmtCOP(kpis.total_costo)} unit="COP período" color="#f85149" />
          <KpiCard label="Kg consumidos total"  value={kpis.total_kg.toFixed(0)} unit="kg período" color="#3fb950" />
          <KpiCard label="Eficiencia $/m³ prom." value={kpis.promPesosM3 != null ? `$${kpis.promPesosM3.toFixed(0)}` : '—'} unit="COP/m³ tratado" color="#d29922" />
          <KpiCard label="Días con registro"    value={String(kpis.n_dias)} unit="días de operación" color="#58a6ff" />
        </div>
      </section>

      {/* ── Consumo diario ── */}
      <section className="dash-section">
        <div className="section-title">Consumo Diario de Reactivos</div>
        <div className="dash-row-2col">
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Kg consumidos por reactivo (diario)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={datosFecha} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmtFecha} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} width={48}
                  label={{ value: 'kg', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [`${val.toFixed(2)} kg`, name.replace('kg_', '')]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} formatter={(v: string) => v.replace('kg_', '')} />
                {productos.map(p => (
                  <Bar key={p} dataKey={`kg_${p}`} name={`kg_${p}`} stackId="kg"
                    fill={colorFor(p)} radius={productos.indexOf(p) === productos.length - 1 ? [3,3,0,0] : [0,0,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Costo operativo diario por reactivo ($COP)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={datosFecha} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmtFecha} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} width={56}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
                  label={{ value: '$', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [`$${Number(val).toLocaleString('es-CO')}`, name.replace('costo_', '')]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} formatter={(v: string) => v.replace('costo_', '')} />
                {productos.map(p => (
                  <Bar key={p} dataKey={`costo_${p}`} name={`costo_${p}`} stackId="costo"
                    fill={colorFor(p)} radius={productos.indexOf(p) === productos.length - 1 ? [3,3,0,0] : [0,0,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── PPM + $/m³ ── */}
      <section className="dash-section">
        <div className="section-title">Dosis y Eficiencia Económica</div>
        <div className="dash-row-2col">
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Dosis PPM diaria por reactivo (promedio del día)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={datosFecha} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmtFecha} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} width={48}
                  label={{ value: 'PPM', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [`${val} ppm`, name.replace('ppm_', '')]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} formatter={(v: string) => v.replace('ppm_', '')} />
                {productos.map(p => (
                  <Bar key={p} dataKey={`ppm_${p}`} name={`ppm_${p}`}
                    fill={colorFor(p)} radius={[3,3,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Eficiencia económica GEM: $/m³ tratado
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={gemAgrupado} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmtFecha} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis yAxisId="left" tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} width={60}
                  tickFormatter={(v: number) => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`}
                  label={{ value: '$/m³', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 10, dx: 4 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [
                    name === 'Caudal GEM (m³)' ? `${val} m³` : `$${Number(val).toLocaleString('es-CO')}/m³`,
                    name,
                  ]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar yAxisId="left" dataKey="caudal_m3" name="Caudal GEM (m³)" fill="#1f6feb" radius={[3,3,0,0]} opacity={0.6} />
                <Line yAxisId="right" type="monotone" dataKey="pesos_por_m3" name="$/m³ tratado"
                  stroke="#d29922" strokeWidth={2} dot={{ fill: '#d29922', r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── Estadísticas min/max/prom ── */}
      {estadisticas.length > 0 && (
        <section className="dash-section">
          <div className="section-title">Estadísticas del Mes — Min / Prom / Máx</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
              <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
                Consumo kg/día: mínimo, promedio y máximo por reactivo
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={estadisticas}
                  margin={{ top: 4, right: 16, left: 0, bottom: 40 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis type="number" tick={AXIS_TICK}
                    label={{ value: 'kg/día', position: 'insideBottom', fill: '#484f58', fontSize: 10, dy: 16 }} />
                  <YAxis type="category" dataKey="producto_nombre" tick={{ fill: '#8b949e', fontSize: 9 }} width={100} />
                  <Tooltip {...TOOLTIP_STYLE}
                    formatter={(val: number, name: string) => [`${val.toFixed(2)} kg`, name]} />
                  <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                  <Bar dataKey="kg_min" name="Mín" fill="#f85149" radius={[0,3,3,0]} />
                  <Bar dataKey="kg_avg" name="Prom" fill="#d29922" radius={[0,3,3,0]} />
                  <Bar dataKey="kg_max" name="Máx" fill="#3fb950" radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
              <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
                Dosis PPM: mínimo, promedio y máximo por reactivo
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={estadisticas}
                  margin={{ top: 4, right: 16, left: 0, bottom: 40 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis type="number" tick={AXIS_TICK}
                    label={{ value: 'PPM', position: 'insideBottom', fill: '#484f58', fontSize: 10, dy: 16 }} />
                  <YAxis type="category" dataKey="producto_nombre" tick={{ fill: '#8b949e', fontSize: 9 }} width={100} />
                  <Tooltip {...TOOLTIP_STYLE}
                    formatter={(val: number, name: string) => [`${val.toFixed(1)} ppm`, name]} />
                  <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                  <Bar dataKey="ppm_min" name="Mín" fill="#f85149" radius={[0,3,3,0]} />
                  <Bar dataKey="ppm_avg" name="Prom" fill="#d29922" radius={[0,3,3,0]} />
                  <Bar dataKey="ppm_max" name="Máx" fill="#3fb950" radius={[0,3,3,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* ── Real vs Proyectado ── */}
      {proyFiltrada.length > 0 && (
        <section className="dash-section">
          <div className="section-title">Real vs Proyectado — {anioActual} {mesProyec ? MESES[Number(mesProyec)] : '(todos los meses)'}</div>
          <div className="dash-row-2col">
            <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
              <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
                Kg consumidos: real (barras) vs proyectado (línea) por mes
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart
                  data={proyFiltrada.map(r => ({ ...r, mes_label: `${MESES[r.mes]} ${r.anio}` }))}
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="mes_label" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} width={52}
                    label={{ value: 'kg', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                  <Tooltip {...TOOLTIP_STYLE}
                    formatter={(val: RechartsValue, name: string) =>
                      [val != null ? `${Number(val).toFixed(1)} kg` : '—', name]} />
                  <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                  <Bar dataKey="kg_real" name="Real (kg)" fill="#1f6feb" radius={[3,3,0,0]} />
                  <Line type="monotone" dataKey="kg_proyectado" name="Proyectado (kg)"
                    stroke="#d29922" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#d29922', r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
              <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
                Costo real ($) vs proyectado ($) — cumplimiento %
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart
                  data={proyFiltrada.map(r => ({ ...r, mes_label: `${MESES[r.mes]} ${r.anio}` }))}
                  margin={{ top: 4, right: 56, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                  <XAxis dataKey="mes_label" tick={AXIS_TICK} />
                  <YAxis yAxisId="left" tick={AXIS_TICK} width={64}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
                    label={{ value: '$', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                  <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} width={44}
                    domain={[0, 150]} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip {...TOOLTIP_STYLE}
                    formatter={(val: RechartsValue, name: string) => [
                      name.includes('%')
                        ? (val != null ? `${Number(val).toFixed(1)}%` : '—')
                        : (val != null ? `$${Number(val).toLocaleString('es-CO')}` : '—'),
                      name,
                    ]} />
                  <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                  <Bar yAxisId="left" dataKey="costo_real" name="Costo real ($)" fill="#f85149" radius={[3,3,0,0]} />
                  <Line yAxisId="left" type="monotone" dataKey="costo_proyectado" name="Proyectado ($)"
                    stroke="#d29922" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#d29922', r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="cumplimiento_costo_pct" name="Cumplimiento %"
                    stroke="#3fb950" strokeWidth={2} dot={{ fill: '#3fb950', r: 3 }} />
                  <ReferenceLine yAxisId="right" y={100} stroke="#484f58" strokeDasharray="4 4" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
