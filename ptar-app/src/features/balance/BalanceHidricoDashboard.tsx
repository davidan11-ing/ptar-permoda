import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ComposedChart, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useBalanceData } from './hooks/useBalanceData';
import { getReporteBalanceHtmlUrl, type BalanceHidricoRow } from '../../services/ptarClient';

// ── Rango de fechas por defecto: últimos 60 días ──────────────────────────────
function defaultFechas() {
  const hoy = new Date();
  const ini = new Date(hoy);
  ini.setDate(ini.getDate() - 60);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: fmt(ini), fin: fmt(hoy) };
}

const TOOLTIP_STYLE = {
  contentStyle: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 },
  labelStyle:   { color: '#e6edf3', marginBottom: 4 },
};
const AXIS_TICK = { fill: '#8b949e', fontSize: 10 };

function fmt(f: string) {
  const p = f.split('-');
  return p.length >= 3 ? `${p[2]}/${p[1]}` : f;
}

function round2(v: number | null | undefined): number {
  return v != null ? +v.toFixed(2) : 0;
}

// ── Agrega filas por fecha (suma volúmenes; promedia % eficiencia e indicadores) ─
function agruparPorFecha(rows: BalanceHidricoRow[]) {
  const map = new Map<string, { count: number; ef: number[]; lav_l: number[]; tin_l: number[]; rot_l: number[]; v: Record<string, number> }>();

  for (const r of rows) {
    if (!map.has(r.fecha)) {
      map.set(r.fecha, { count: 0, ef: [], lav_l: [], tin_l: [], rot_l: [], v: {} });
    }
    const e = map.get(r.fecha)!;
    e.count++;

    const sumFields: (keyof BalanceHidricoRow)[] = [
      'ingreso_ptap', 'potable_ptap', 'carrotanques_m3', 'mulas_funza_m3',
      'entrada_ro1', 'permeado_ro1', 'rechazo_ro1',
      'permeado_mbr1', 'permeado_mbr2', 'envio_th',
      'acueducto_m3', 'total_agua_limpia_m3', 'consumo_gem_m3',
      'lavanderia_m3', 'tintoreria_m3', 'rotativa_m3',
    ];
    for (const k of sumFields) {
      const v = r[k] as number | null;
      if (v != null && v > 0) e.v[k] = (e.v[k] ?? 0) + v;
    }
    if (r.eficiencia_ro_pct != null) e.ef.push(r.eficiencia_ro_pct);
    if (r.indicador_lav_l_und != null) e.lav_l.push(r.indicador_lav_l_und);
    if (r.indicador_tin_l_kg  != null) e.tin_l.push(r.indicador_tin_l_kg);
    if (r.indicador_rot_l_m   != null) e.rot_l.push(r.indicador_rot_l_m);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, e]) => {
      const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null;
      return {
        fecha,
        ...Object.fromEntries(Object.entries(e.v).map(([k, v]) => [k, round2(v)])),
        eficiencia_ro_pct:    avg(e.ef),
        indicador_lav_l_und:  avg(e.lav_l),
        indicador_tin_l_kg:   avg(e.tin_l),
        indicador_rot_l_m:    avg(e.rot_l),
      } as Record<string, number | string | null>;
    });
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

export default function BalanceHidricoDashboard() {
  const { inicio, fin } = defaultFechas();

  const [fechaInicio, setFechaInicio] = useState(inicio);
  const [fechaFin,    setFechaFin]    = useState(fin);
  const [turnoFiltro, setTurnoFiltro] = useState('');

  const turnoNum = turnoFiltro ? Number(turnoFiltro) : undefined;
  const { data, loading, error } = useBalanceData(fechaInicio, fechaFin, turnoNum);

  const agrupado = useMemo(() => agruparPorFecha(data), [data]);

  // ── KPIs globales del período ──────────────────────────────────────────────
  const kpis = useMemo(() => {
    const sum = (k: keyof BalanceHidricoRow) =>
      data.reduce((acc, r) => acc + (Number(r[k]) || 0), 0);
    const avgEf = (() => {
      const vals = data.filter(r => r.eficiencia_ro_pct != null).map(r => r.eficiencia_ro_pct as number);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    })();
    return {
      totalAgua:   sum('total_agua_limpia_m3'),
      totalTH:     sum('envio_th'),
      totalAcu:    sum('acueducto_m3'),
      eficRo:      avgEf,
      totalGem:    sum('consumo_gem_m3'),
      totalRoIn:   sum('entrada_ro1'),
    };
  }, [data]);

  const fmtM3 = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);

  if (loading) {
    return (
      <div className="cal-page">
        <div className="cal-loading"><div className="spinner" /><span>Cargando balance hídrico…</span></div>
      </div>
    );
  }

  return (
    <div className="cal-page">

      {/* ── Encabezado ── */}
      <div className="cal-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="cal-title">Dashboard Balance Hídrico</h1>
          <p className="cal-subtitle">Volúmenes, eficiencia RO e indicadores de consumo por proceso</p>
        </div>
        <a
          href={getReporteBalanceHtmlUrl({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })}
          target="_blank" rel="noopener noreferrer"
          className="btn-primary btn-sm"
          style={{ background: '#1f6feb', textDecoration: 'none', alignSelf: 'center', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#fff' }}
          title="Abre el informe en una nueva pestaña — usa Ctrl+P para guardar como PDF"
        >
          💧 Informe Balance
        </a>
      </div>

      {/* ── Filtros ── */}
      <div className="cal-filters" style={{ marginBottom: 16 }}>
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
          <input type="date" className="cal-filter-input" value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)} />
        </div>
        <div className="cal-filter-group">
          <label className="cal-filter-label">Fecha fin</label>
          <input type="date" className="cal-filter-input" value={fechaFin}
            onChange={e => setFechaFin(e.target.value)} />
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          <KpiCard label="Agua limpia total" value={fmtM3(kpis.totalAgua)} unit="m³" color="#3fb950" />
          <KpiCard label="Enviado a producción" value={fmtM3(kpis.totalTH)} unit="m³" color="#00c5e3" />
          <KpiCard label="Acueducto consumido" value={fmtM3(kpis.totalAcu)} unit="m³" color="#d29922" />
          <KpiCard label="Eficiencia RO prom." value={kpis.eficRo != null ? kpis.eficRo.toFixed(1) + '%' : '—'} unit="% recuperación" color="#9e7aff" />
          <KpiCard label="Caudal GEM tratado" value={fmtM3(kpis.totalGem)} unit="m³" color="#f85149" />
          <KpiCard label="Entrada a RO" value={fmtM3(kpis.totalRoIn)} unit="m³" color="#58a6ff" />
        </div>
      </section>

      {/* ── Flujos principales ── */}
      <section className="dash-section">
        <div className="section-title">Flujos Hídricos Diarios</div>
        <div className="dash-row-2col">
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Agua limpia total y enviada a producción (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={agrupado} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTH" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00c5e3" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00c5e3" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradLimpia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3fb950" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3fb950" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradAcu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d29922" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#d29922" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [`${val.toFixed(1)} m³`, name]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Area type="monotone" dataKey="total_agua_limpia_m3" name="Total agua limpia" stroke="#3fb950" fill="url(#gradLimpia)" strokeWidth={2} connectNulls />
                <Area type="monotone" dataKey="envio_th" name="Enviado TH" stroke="#00c5e3" fill="url(#gradTH)" strokeWidth={2} connectNulls />
                <Area type="monotone" dataKey="acueducto_m3" name="Acueducto" stroke="#d29922" fill="url(#gradAcu)" strokeWidth={1.5} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Ingreso PTAP y agua potable producida (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={agrupado} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [`${val.toFixed(1)} m³`, name]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar dataKey="ingreso_ptap"  name="Ingreso PTAP"    fill="#1f6feb" radius={[3,3,0,0]} />
                <Bar dataKey="potable_ptap"  name="Potable PTAP"    fill="#3fb950" radius={[3,3,0,0]} />
                <Bar dataKey="consumo_gem_m3" name="Caudal GEM"     fill="#f85149" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── Sistema RO ── */}
      <section className="dash-section">
        <div className="section-title">Sistema de Ósmosis Inversa (RO)</div>
        <div className="dash-row-2col">
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Entrada, permeado y rechazo RO1 (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={220}>
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
                <Bar yAxisId="left" dataKey="entrada_ro1"   name="Entrada RO1"   fill="#1f6feb" radius={[3,3,0,0]} />
                <Bar yAxisId="left" dataKey="permeado_ro1"  name="Permeado RO1"  fill="#3fb950" radius={[3,3,0,0]} />
                <Bar yAxisId="left" dataKey="rechazo_ro1"   name="Rechazo RO1"   fill="#f85149" radius={[3,3,0,0]} />
                <Line yAxisId="right" type="monotone" dataKey="eficiencia_ro_pct" name="Eficiencia %"
                  stroke="#9e7aff" strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Tendencia eficiencia RO (%) y permeados MBR (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={agrupado} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis yAxisId="left" tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} width={44}
                  domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar yAxisId="left" dataKey="permeado_mbr1" name="Permeado MBR1" fill="#58a6ff" radius={[3,3,0,0]} />
                <Bar yAxisId="left" dataKey="permeado_mbr2" name="Permeado MBR2" fill="#00c5e3" radius={[3,3,0,0]} />
                <Line yAxisId="right" type="monotone" dataKey="eficiencia_ro_pct" name="Eficiencia RO %"
                  stroke="#9e7aff" strokeWidth={2} dot={{ fill: '#9e7aff', r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── Consumo por proceso ── */}
      <section className="dash-section">
        <div className="section-title">Consumo de Agua por Proceso</div>
        <div className="dash-row-2col">
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Consumo diario por área productiva (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={agrupado} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [`${val.toFixed(1)} m³`, name]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar dataKey="lavanderia_m3"  name="Lavandería"  fill="#3fb950" radius={[3,3,0,0]} stackId="p" />
                <Bar dataKey="tintoreria_m3"  name="Tintorería"  fill="#1f6feb" radius={[0,0,0,0]} stackId="p" />
                <Bar dataKey="rotativa_m3"    name="Rotativa"    fill="#d29922" radius={[3,3,0,0]} stackId="p" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Indicadores de consumo específico por proceso
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={agrupado} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} width={56}
                  label={{ value: 'L/und·kg·m', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 9, dx: -4 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [`${val.toFixed(1)}`, name]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Line type="monotone" dataKey="indicador_lav_l_und" name="Lav. L/und"
                  stroke="#3fb950" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="indicador_tin_l_kg" name="Tin. L/kg tela"
                  stroke="#1f6feb" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="indicador_rot_l_m" name="Rot. L/m tela"
                  stroke="#d29922" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── Distribución del agua ── */}
      <section className="dash-section">
        <div className="section-title">Distribución y Fuentes de Agua</div>
        <div className="dash-row-2col">
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Fuentes de suministro: PTAP + Acueducto + Carrotanques (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agrupado} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [`${val.toFixed(1)} m³`, name]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar dataKey="potable_ptap"     name="Potable PTAP"    fill="#00c5e3" radius={[3,3,0,0]} stackId="f" />
                <Bar dataKey="acueducto_m3"     name="Acueducto"       fill="#d29922" radius={[0,0,0,0]} stackId="f" />
                <Bar dataKey="carrotanques_m3"  name="Carrotanques"    fill="#9e7aff" radius={[0,0,0,0]} stackId="f" />
                <Bar dataKey="mulas_funza_m3"   name="Mulas Funza"     fill="#58a6ff" radius={[3,3,0,0]} stackId="f" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Tendencia acueducto vs agua limpia producida (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={agrupado} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTotalL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3fb950" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3fb950" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradAcuL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d29922" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#d29922" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [`${val.toFixed(1)} m³`, name]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Area type="monotone" dataKey="total_agua_limpia_m3" name="Agua limpia total" stroke="#3fb950" fill="url(#gradTotalL)" strokeWidth={2} connectNulls />
                <Area type="monotone" dataKey="acueducto_m3" name="Acueducto" stroke="#d29922" fill="url(#gradAcuL)" strokeWidth={2} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

    </div>
  );
}
