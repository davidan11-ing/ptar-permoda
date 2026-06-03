import { useState, useMemo } from 'react';
import {
  Bar, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { useCostosData, type ConsumoQuimicoDiaRow } from './hooks/useCostosData';
import { getReporteCostosHtmlUrl } from '../../services/ptarClient';
import GranularidadSelector from '../../components/shared/GranularidadSelector';
import { useGranularidad } from '../../hooks/useGranularidad';
import { xLabel, sortKey } from '../../lib/utils/agruparTemporal';
import type { Granularidad } from '../../hooks/useGranularidad';

const TOOLTIP_STYLE = {
  contentStyle: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 },
  labelStyle:   { color: '#e6edf3', marginBottom: 4 },
};
const AXIS_TICK    = { fill: '#8b949e', fontSize: 10 };
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

// ── Agrupa consumo químico y calcula indicadores por granularidad ─────────────
function byGranularidad(rows: ConsumoQuimicoDiaRow[], gran: Granularidad | null) {
  type Bucket = {
    sk: string;
    label: string;
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
      // Usar caudalTotal del bucket (evita duplicar por producto)
      const caudalTotal = bucket.caudalTotal / Math.max(productos.length, 1);

      for (const p of productos) {
        const pe = bucket.productos[p];
        row[`kg_${p}`]      = pe ? +(pe.kg.toFixed(2))   : 0;
        row[`costo_${p}`]   = pe ? +(pe.costo.toFixed(0)) : 0;
        row[`ppm_${p}`]     = pe ? avg(pe.ppm)            : null;
        row[`costo_m3_${p}`]= (pe && caudalTotal > 0)
          ? +(pe.costo / caudalTotal).toFixed(0) : 0;
        if (pe) costoTotal += pe.costo;
      }

      row['costo_total']  = +costoTotal.toFixed(0);
      row['caudal_m3']    = +caudalTotal.toFixed(1);
      // INDICADOR $/m³ — línea verde (como en el Excel)
      row['indicador_m3'] = caudalTotal > 0 ? +(costoTotal / caudalTotal).toFixed(0) : null;
      return row;
    });

  return { result, productos };
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

// ── Chart Card wrapper ────────────────────────────────────────────────────────
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

// ── Eje Y derecho — $/m³ ─────────────────────────────────────────────────────
const fmtM3 = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;
const fmtCOP = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
  : v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`;

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

  const { consumoDiario, gemEficiencia, loading, error } =
    useCostosData(fechaInicio, fechaFin, sistema);

  // ── Datos agrupados ───────────────────────────────────────────────────────
  const { result: datosFecha, productos } = useMemo(
    () => byGranularidad(consumoDiario, granularidad),
    [consumoDiario, granularidad],
  );

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total_kg    = consumoDiario.reduce((s, r) => s + (r.kg_dia ?? 0), 0);
    const total_costo = consumoDiario.reduce((s, r) => s + (r.costo_dia ?? 0), 0);
    const pesosM3     = gemEficiencia.filter(r => r.pesos_por_m3 != null).map(r => r.pesos_por_m3 as number);
    const promPesosM3 = pesosM3.length ? pesosM3.reduce((a, b) => a + b, 0) / pesosM3.length : null;
    const diasSet     = new Set(consumoDiario.map(r => r.fecha));
    return { total_kg, total_costo, promPesosM3, n_dias: diasSet.size };
  }, [consumoDiario, gemEficiencia]);

  if (loading) {
    return (
      <div className="cal-page">
        <div className="cal-loading"><div className="spinner" /><span>Cargando costos químicos…</span></div>
      </div>
    );
  }

  // ── Ejes Y compartidos ───────────────────────────────────────────────────
  const yLeft  = <YAxis yAxisId="left"  tick={AXIS_TICK_SM} width={46} />;
  const yRight = (
    <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_SM} width={52}
      tickFormatter={fmtM3}
      label={{ value: '$/m³', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 9, dx: 6 }}
    />
  );

  // Última barra de cada stack recibe bordes redondeados arriba
  const topRadius = (idx: number): [number, number, number, number] =>
    idx === productos.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0];

  const lineM3 = (
    <Line yAxisId="right" type="monotone" dataKey="indicador_m3" name="$/m³ total"
      stroke="#3fb950" strokeWidth={2} dot={false} connectNulls
    />
  );

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
        >
          ⚗️ Informe Costos
        </a>
      </div>

      {/* ── Filtros ── */}
      <div className="cal-filters" style={{ marginBottom: 16 }}>
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

      {error && (
        <div style={{ padding: 12, background: '#2d1214', border: '1px solid #f85149', borderRadius: 6, color: '#f85149', marginBottom: 16, fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* ── KPIs ── */}
      <section className="dash-section">
        <div className="section-title">Resumen del Período</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <KpiCard label="Costo total químicos"  value={fmtCOP(kpis.total_costo)} unit="COP período"    color="#f85149" />
          <KpiCard label="Kg consumidos total"   value={kpis.total_kg.toFixed(0)} unit="kg período"     color="#3fb950" />
          <KpiCard label="Eficiencia $/m³ prom." value={kpis.promPesosM3 != null ? `$${kpis.promPesosM3.toFixed(0)}` : '—'} unit="COP/m³ tratado" color="#d29922" />
          <KpiCard label="Días con registro"     value={String(kpis.n_dias)}      unit="días de operación" color="#58a6ff" />
        </div>
      </section>

      {/* ── 4 Gráficas principales (2 × 2) ── */}
      <section className="dash-section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* ── Chart 1: CONSUMO PPM Vs $/m³ ── */}
          <ChartCard title="CONSUMO PPM Vs $/m³" subtitle="Dosificación diaria por reactivo (PPM) — línea verde: $/m³ tratado">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={datosFecha} margin={{ top: 6, right: 52, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tick={AXIS_TICK_SM} interval="preserveStartEnd" />
                {yLeft}
                {yRight}
                <Tooltip {...TOOLTIP_STYLE}
                  formatter={(val: number, name: string) =>
                    name === '$/m³ total'
                      ? [`$${Number(val).toLocaleString('es-CO')}/m³`, name]
                      : [`${val} ppm`, name.replace('ppm_', '')]
                  }
                />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }}
                  formatter={(v: string) => v.replace('ppm_', '')} />
                {productos.map((p, i) => (
                  <Bar key={p} yAxisId="left" dataKey={`ppm_${p}`} name={`ppm_${p}`}
                    stackId="ppm" fill={colorFor(p)} radius={topRadius(i)} />
                ))}
                {lineM3}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* ── Chart 2: CONSUMO KG Vs $/m³ ── */}
          <ChartCard title="CONSUMO KG Vs $/m³" subtitle="Kilogramos consumidos por reactivo — línea verde: $/m³ tratado">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={datosFecha} margin={{ top: 6, right: 52, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tick={AXIS_TICK_SM} interval="preserveStartEnd" />
                {yLeft}
                {yRight}
                <Tooltip {...TOOLTIP_STYLE}
                  formatter={(val: number, name: string) =>
                    name === '$/m³ total'
                      ? [`$${Number(val).toLocaleString('es-CO')}/m³`, name]
                      : [`${Number(val).toFixed(2)} kg`, name.replace('kg_', '')]
                  }
                />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }}
                  formatter={(v: string) => v.replace('kg_', '')} />
                {productos.map((p, i) => (
                  <Bar key={p} yAxisId="left" dataKey={`kg_${p}`} name={`kg_${p}`}
                    stackId="kg" fill={colorFor(p)} radius={topRadius(i)} />
                ))}
                {lineM3}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* ── Chart 3: COSTO $ Vs $/m³ ── */}
          <ChartCard title="COSTO $ Vs $/m³" subtitle="Costo diario en COP por reactivo — línea verde: $/m³ tratado">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={datosFecha} margin={{ top: 6, right: 52, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tick={AXIS_TICK_SM} interval="preserveStartEnd" />
                <YAxis yAxisId="left" tick={AXIS_TICK_SM} width={52}
                  tickFormatter={(v: number) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                {yRight}
                <Tooltip {...TOOLTIP_STYLE}
                  formatter={(val: number, name: string) =>
                    name === '$/m³ total'
                      ? [`$${Number(val).toLocaleString('es-CO')}/m³`, name]
                      : [`$${Number(val).toLocaleString('es-CO')}`, name.replace('costo_', '')]
                  }
                />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }}
                  formatter={(v: string) => v.replace('costo_', '')} />
                {productos.map((p, i) => (
                  <Bar key={p} yAxisId="left" dataKey={`costo_${p}`} name={`costo_${p}`}
                    stackId="costo" fill={colorFor(p)} radius={topRadius(i)} />
                ))}
                {lineM3}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* ── Chart 4: $/m³ POR REACTIVO ── */}
          <ChartCard title="$/m³ POR REACTIVO" subtitle="Costo operativo en $/m³ descompuesto por reactivo — línea: total acumulado">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={datosFecha} margin={{ top: 6, right: 52, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tick={AXIS_TICK_SM} interval="preserveStartEnd" />
                <YAxis yAxisId="left" tick={AXIS_TICK_SM} width={52} tickFormatter={fmtM3}
                  label={{ value: '$/m³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 9, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK_SM} width={52}
                  tickFormatter={fmtM3} />
                <Tooltip {...TOOLTIP_STYLE}
                  formatter={(val: number, name: string) =>
                    [`$${Number(val).toLocaleString('es-CO')}/m³`,
                      name === '$/m³ total' ? name : name.replace('costo_m3_', '')]
                  }
                />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }}
                  formatter={(v: string) => v.replace('costo_m3_', '')} />
                {productos.map((p, i) => (
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

    </div>
  );
}
