import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import KpiGauge from './KpiGauge';
import {
  KPI_METRICS, CAUDAL_HORARIO, DBO_HORARIO,
  ROLLING_7DIAS, TIME_AVAILABILITY, ESTADO_EQUIPOS,
} from './mockData';
import { getReportePdfUrl, getReporteDashboardHtmlUrl, getCalidadParametros } from '../../services/ptarClient';
import { useAuth } from '../../state/AuthContext';
import { useCalidadData, PROCESO_ORDEN } from '../calidad/hooks/useCalidadData';
import { useDispersionData } from '../calidad/hooks/useDispersionData';
import { useMbrEficiencia }  from '../calidad/hooks/useMbrEficiencia';
import { useGemEficiencia }  from '../calidad/hooks/useGemEficiencia';
import SegDiarioChart        from '../calidad/components/SegDiarioChart';
import DispersionChart       from '../calidad/components/DispersionChart';
import HistogramaChart       from '../calidad/components/HistogramaChart';
import PieDistribucionChart  from '../calidad/components/PieDistribucionChart';
import PercentilChart        from '../calidad/components/PercentilChart';
import SeccionMultiparametro from '../calidad/components/SeccionMultiparametro';
import MbrEficienciaSection  from '../calidad/components/MbrEficienciaSection';
import GemEficienciaSection  from '../calidad/components/GemEficienciaSection';

interface Props { canEdit: boolean }

const TODAY = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const DIAS_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const CAUDAL_TARGET_M3 = 640; // m³ por turno — meta de diseño de la PTAR

interface DailyMetrics {
  fecha: string;
  eficiencia: number;   // % de horas operadas / 8h
  caudal_pct: number;   // % de caudal vs. meta 640 m³
  horas_activo: number; // horas reales operadas ese día (todos los turnos)
}

export default function DashboardPage({ canEdit }: Props) {
  const { currentUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [kpis, setKpis] = useState(KPI_METRICS);
  const [realMetrics, setRealMetrics] = useState<DailyMetrics[]>([]);

  // ── Estado sección calidad ────────────────────────────────────
  const [calParametros,      setCalParametros]      = useState<string[]>([]);
  const [calUnidadMap,       setCalUnidadMap]        = useState<Record<string, string>>({});
  const [calParametro,       setCalParametro]        = useState('');
  const [calUnidadPrincipal, setCalUnidadPrincipal]  = useState('');
  const [calTurno,           setCalTurno]            = useState('');
  const [calFechaInicio,     setCalFechaInicio]      = useState(
    () => new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [calFechaFin,        setCalFechaFin]         = useState(
    () => new Date().toISOString().slice(0, 10)
  );

  // ── Fetch real data from v_consumo_quimico_diario via FastAPI ─────────
  // Response shape: { fecha: string; caudal_m3_dia: number | null; ... }[]
  useEffect(() => {
    async function fetchDashboardData() {
      const API = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8001';
      let data: { fecha: string; caudal_m3_dia: number | null }[] = [];
      try {
        const res = await fetch(`${API}/api/reactivos/?limit=500`);
        if (!res.ok) return;
        data = await res.json();
      } catch { return; }

      if (!data || data.length === 0) return;

      // Group caudal values by calendar date (fecha ya viene como YYYY-MM-DD)
      const byDate = new Map<string, number[]>();
      for (const row of data) {
        const fecha = row.fecha;
        if (!fecha) continue;
        if (!byDate.has(fecha)) byDate.set(fecha, []);
        if (row.caudal_m3_dia != null && row.caudal_m3_dia > 0)
          byDate.get(fecha)!.push(Number(row.caudal_m3_dia));
      }

      // Last 7 recorded dates, oldest→newest
      const sortedDates = Array.from(byDate.keys()).sort().reverse().slice(0, 7).reverse();

      const dailyMetrics: DailyMetrics[] = sortedDates.map(fecha => {
        const caudales = byDate.get(fecha) ?? [];
        const avgCaudal = caudales.length > 0
          ? caudales.reduce((a, b) => a + b, 0) / caudales.length
          : 0;
        const caudal_pct = Math.min(100, Math.round(avgCaudal / CAUDAL_TARGET_M3 * 100));
        // Eficiencia se toma como proxy del % de caudal hasta que existan datos de horómetro
        const eficiencia = caudal_pct;
        // horas_activo: estimación proporcional (24h × fracción de caudal)
        const horas_activo = +(avgCaudal / CAUDAL_TARGET_M3 * 24).toFixed(1);
        return { fecha, eficiencia, caudal_pct, horas_activo };
      });

      setRealMetrics(dailyMetrics);

      // Update KPIs with real averages (last 7 days)
      if (dailyMetrics.length > 0) {
        const avgEf   = Math.round(dailyMetrics.reduce((a, d) => a + d.eficiencia, 0)  / dailyMetrics.length);
        const avgCaud = Math.round(dailyMetrics.reduce((a, d) => a + d.caudal_pct, 0) / dailyMetrics.length);
        setKpis(prev => prev.map(k => {
          if (k.label === 'Eficiencia Tratamiento') return { ...k, value: avgEf };
          if (k.label === 'Caudal Procesado')       return { ...k, value: avgCaud };
          return k;
        }));
      }
    }

    fetchDashboardData();
  }, []);

  // ── Cargar parámetros de calidad ──────────────────────────────
  useEffect(() => {
    getCalidadParametros().then(data => {
      const map: Record<string, string> = {};
      for (const r of data) if (!map[r.nombre]) map[r.nombre] = r.unidad_medida ?? '';
      const uniq = Object.keys(map).sort();
      setCalUnidadMap(map);
      setCalParametros(uniq);
      if (uniq.length > 0) {
        const pref = ['DQO', 'pH', 'SST', 'Color'];
        setCalParametro(pref.find(p => uniq.includes(p)) ?? uniq[0]);
      }
    }).catch(() => {});
  }, []);

  const handleTargetChange = (idx: number, val: number) => {
    setKpis(prev => prev.map((k, i) => i === idx ? { ...k, target: val } : k));
  };

  // ── Derived: rolling 7-day bar chart data ────────────────────────────
  const rollingData = useMemo(() => {
    if (realMetrics.length === 0) return ROLLING_7DIAS;
    return realMetrics.map((d, i) => ({
      dia: DIAS_SHORT[new Date(d.fecha + 'T12:00:00').getDay()],
      eficiencia: d.eficiencia,
      caudal: d.caudal_pct,
      calidad: ROLLING_7DIAS[i % ROLLING_7DIAS.length].calidad, // sin datos reales aún
    }));
  }, [realMetrics]);

  // ── Derived: time availability for the most recent recorded day ───────
  const availabilityData = useMemo(() => {
    if (realMetrics.length === 0) return TIME_AVAILABILITY;
    const latest = realMetrics[realMetrics.length - 1];
    const h = latest.horas_activo;
    const pct = Math.round(h / 24 * 100);
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    const timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
    return TIME_AVAILABILITY.map(row =>
      row.label === 'Activo' ? { ...row, value: timeStr, pct } : row
    );
  }, [realMetrics]);

  // ── Hooks de calidad ──────────────────────────────────────────
  const {
    rawRows: calRawRows,
    unidades: calUnidades,
  } = useCalidadData({
    parametro: calParametro,
    fechaInicio: calFechaInicio,
    fechaFin: calFechaFin,
    turno: calTurno || undefined,
    unidadTurno: undefined,
  });

  const { data: calDispersion } = useDispersionData(calParametro, calFechaInicio, calFechaFin);
  const { data: mbrData, loading: mbrLoading } = useMbrEficiencia(calFechaInicio, calFechaFin);
  const { data: gemData, loading: gemLoading } = useGemEficiencia(calFechaInicio, calFechaFin);

  const calUnidadMedida = calUnidadMap[calParametro] ?? 'u';

  // ── Derivados filtrados por unidad ───────────────────────────
  const calFilteredRawRows = useMemo(
    () => calUnidadPrincipal
      ? calRawRows.filter(r => r.unidad_tratamiento === calUnidadPrincipal)
      : calRawRows,
    [calRawRows, calUnidadPrincipal]
  );

  const calValoresFlat = useMemo(
    () => calFilteredRawRows.map(r => r.valor).filter((v): v is number => v != null && !isNaN(v)),
    [calFilteredRawRows]
  );

  return (
    <div className="dashboard">
      {/* Header bar */}
      <div className="dash-header">
        <div className="dash-header-left">
          <h1 className="dash-title">KPI Dashboard — PTAR</h1>
          <span className="dash-date">{TODAY}</span>
        </div>
        <div className="dash-header-right">
          <div className="dash-plant-badge">Planta: <strong>PTAR-01</strong></div>
          <a
            href={getReporteDashboardHtmlUrl({
              fecha_inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
              fecha_fin: new Date().toISOString().slice(0, 10),
            })}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', background: '#1f6feb', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}
          >
            📊 Informe KPI
          </a>
          <a
            href={getReportePdfUrl({
              fecha_inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
              fecha_fin: new Date().toISOString().slice(0, 10),
              tipo: 'completo',
            })}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', background: '#1f6feb', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}
          >
            ↓ PDF últimos 30 días
          </a>
          {canEdit && (
            <button
              className={`edit-toggle-btn ${editMode ? 'active' : ''}`}
              onClick={() => setEditMode(v => !v)}
            >
              {editMode ? (
                <><span>✓</span> Guardar</>
              ) : (
                <><span>✎</span> Editar</>
              )}
            </button>
          )}
          {!canEdit && (
            <span className="readonly-badge">Solo lectura</span>
          )}
        </div>
      </div>

      {/* KPI Gauges row */}
      <section className="dash-section">
        <div className="section-title">Indicadores Clave de Desempeño</div>
        <div className="kpi-row">
          {kpis.map((kpi, i) => (
            <div key={kpi.label} className="kpi-card">
              <KpiGauge
                label={kpi.label}
                value={kpi.value}
                target={kpi.target}
                unit={kpi.unit}
                color={kpi.color}
                size={150}
              />
              {editMode && (
                <div className="kpi-edit-row">
                  <label className="kpi-edit-label">Meta:</label>
                  <input
                    type="number"
                    className="kpi-edit-input"
                    value={kpi.target}
                    min={0} max={100}
                    onChange={e => handleTargetChange(i, Number(e.target.value))}
                  />
                  <span>%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Two-column: Rolling bar chart + Time availability */}
      <div className="dash-row-2col">
        <section className="dash-section dash-card">
          <div className="section-title">
            Tendencia Semanal — Promedio Rodante 7 Días
            {realMetrics.length > 0 && (
              <span style={{ fontSize: 11, color: '#3fb950', marginLeft: 8, fontWeight: 400 }}>● datos reales</span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rollingData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d"/>
              <XAxis dataKey="dia" tick={{ fill: '#8b949e', fontSize: 12 }}/>
              <YAxis domain={[0, 100]} tick={{ fill: '#8b949e', fontSize: 11 }}/>
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} labelStyle={{ color: '#e6edf3' }}/>
              <Legend wrapperStyle={{ color: '#8b949e', fontSize: 12 }}/>
              <Bar dataKey="eficiencia" name="Eficiencia" fill="#00c5e3" radius={[3,3,0,0]}/>
              <Bar dataKey="caudal"     name="Caudal"     fill="#3fb950" radius={[3,3,0,0]}/>
              <Bar dataKey="calidad"    name="Calidad"    fill="#d29922" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="dash-section dash-card">
          <div className="section-title">
            Disponibilidad por Estado — Último Día Registrado
            {realMetrics.length > 0 && (
              <span style={{ fontSize: 11, color: '#3fb950', marginLeft: 8, fontWeight: 400 }}>● activo real</span>
            )}
          </div>
          <div className="time-avail-table">
            {availabilityData.map(row => (
              <div key={row.label} className={`time-avail-row ${row.label === 'Total' ? 'total-row' : ''}`}>
                <span className="time-avail-dot" style={{ background: row.color }}/>
                <span className="time-avail-label">{row.label}</span>
                <div className="time-avail-bar-track">
                  <div className="time-avail-bar-fill" style={{ width: `${row.pct}%`, background: row.color }}/>
                </div>
                <span className="time-avail-value">{row.value}</span>
                <span className="time-avail-pct">{row.pct}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Caudal horario - Line chart with limits */}
      <section className="dash-section dash-card">
        <div className="section-title">Caudal de Entrada — Perfil Horario (m³/h)</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={CAUDAL_HORARIO} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d"/>
            <XAxis dataKey="hora" tick={{ fill: '#8b949e', fontSize: 11 }} interval={3}/>
            <YAxis tick={{ fill: '#8b949e', fontSize: 11 }}/>
            <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} labelStyle={{ color: '#e6edf3' }}/>
            <ReferenceLine y={60} stroke="#d29922" strokeDasharray="5 5" label={{ value: 'Límite', fill: '#d29922', fontSize: 11 }}/>
            <ReferenceLine y={20} stroke="#f85149" strokeDasharray="5 5" label={{ value: 'Mínimo', fill: '#f85149', fontSize: 11 }}/>
            <Line type="monotone" dataKey="valor" name="Caudal m³/h" stroke="#00c5e3" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }}/>
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* Two-column: DBO + Escalera equipos */}
      <div className="dash-row-2col">
        <section className="dash-section dash-card">
          <div className="section-title">DBO Efluente — Tendencia (mg/L)</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={DBO_HORARIO} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d"/>
              <XAxis dataKey="hora" tick={{ fill: '#8b949e', fontSize: 11 }}/>
              <YAxis tick={{ fill: '#8b949e', fontSize: 11 }}/>
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} labelStyle={{ color: '#e6edf3' }}/>
              <ReferenceLine y={30} stroke="#f85149" strokeDasharray="5 5" label={{ value: 'Límite', fill: '#f85149', fontSize: 11 }}/>
              <Line type="monotone" dataKey="valor" name="DBO mg/L" stroke="#3fb950" strokeWidth={2.5} dot={{ r: 4, fill: '#3fb950' }}/>
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section className="dash-section dash-card">
          <div className="section-title">Estado Bomba Principal — Gráfica Escalera</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={ESTADO_EQUIPOS} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d"/>
              <XAxis dataKey="hora" tick={{ fill: '#8b949e', fontSize: 11 }} interval={5}/>
              <YAxis domain={[-0.2, 1.5]} ticks={[0, 1]} tickFormatter={v => v === 1 ? 'ON' : 'OFF'} tick={{ fill: '#8b949e', fontSize: 11 }}/>
              <Tooltip
                contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }}
                formatter={(v: number) => [v === 1 ? 'EN OPERACIÓN' : 'PARADO', 'Estado']}
                labelStyle={{ color: '#e6edf3' }}
              />
              <Line
                type="stepAfter"
                dataKey="estado"
                name="Estado"
                stroke="#1f6feb"
                strokeWidth={3}
                dot={false}
              />
              <ReferenceLine y={0.5} stroke="#30363d" strokeDasharray="3 3"/>
            </LineChart>
          </ResponsiveContainer>
          <div className="step-legend">
            <span className="step-legend-on">■ EN OPERACIÓN</span>
            <span className="step-legend-off">■ PARADO</span>
          </div>
        </section>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECCIÓN: CALIDAD DEL AGUA                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="dash-section-divider">
        <span>CALIDAD DEL AGUA</span>
      </div>

      {/* Filtros de calidad */}
      <div className="cal-filters" style={{ marginBottom: 16 }}>
        <div className="cal-filter-group">
          <label className="cal-filter-label">Unidad</label>
          <select className="cal-filter-select" value={calUnidadPrincipal}
            onChange={e => setCalUnidadPrincipal(e.target.value)}>
            <option value="">Todas las unidades</option>
            {PROCESO_ORDEN.filter(u => calUnidades.includes(u)).map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div className="cal-filter-group">
          <label className="cal-filter-label">Parámetro</label>
          <select className="cal-filter-select" value={calParametro}
            onChange={e => setCalParametro(e.target.value)}>
            {calParametros.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="cal-filter-group">
          <label className="cal-filter-label">Turno</label>
          <select className="cal-filter-select" value={calTurno}
            onChange={e => setCalTurno(e.target.value)}>
            <option value="">Todos</option>
            <option value="noche">Noche</option>
            <option value="mañana">Mañana</option>
            <option value="tarde">Tarde</option>
          </select>
        </div>
        <div className="cal-filter-group">
          <label className="cal-filter-label">Fecha inicio</label>
          <input type="date" className="cal-filter-input" value={calFechaInicio}
            onChange={e => setCalFechaInicio(e.target.value)} />
        </div>
        <div className="cal-filter-group">
          <label className="cal-filter-label">Fecha fin</label>
          <input type="date" className="cal-filter-input" value={calFechaFin}
            onChange={e => setCalFechaFin(e.target.value)} />
        </div>
      </div>

      {/* Seguimiento Diario por Turno */}
      <section className="dash-section">
        <div className="section-title">
          Seguimiento Diario por Turno — {calParametro}
          {calUnidadPrincipal && <span style={{ color: '#8b949e', fontWeight: 400, marginLeft: 8 }}>· {calUnidadPrincipal}</span>}
        </div>
        <div className="dash-row-2col">
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Promedio por turno y fecha (todas las unidades)
            </div>
            <SegDiarioChart data={calFilteredRawRows} unidad_medida={calUnidadMedida} />
          </div>
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Dispersión agregada (mín/prom/máx) — todas las unidades
            </div>
            <DispersionChart data={calDispersion} unidadFiltrada={calUnidadPrincipal || 'ALL'} unidad_medida={calUnidadMedida} />
          </div>
        </div>
      </section>

      {/* Multiparámetro por grupos */}
      <SeccionMultiparametro
        rawData={calFilteredRawRows}
        dispersionData={calDispersion}
        unidad_medida={calUnidadMedida}
      />

      {/* Distribución estadística */}
      <section className="dash-section">
        <div className="section-title">Distribución Estadística — {calParametro}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Histograma de frecuencias
            </div>
            <HistogramaChart values={calValoresFlat} unidad_medida={calUnidadMedida} />
          </div>
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Distribución porcentual
            </div>
            <PieDistribucionChart values={calValoresFlat} unidad_medida={calUnidadMedida} />
          </div>
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Percentiles (P10 – P90)
            </div>
            <PercentilChart values={calValoresFlat} unidad_medida={calUnidadMedida} />

          </div>
        </div>
      </section>

      {/* Eficiencia MBR */}
      <MbrEficienciaSection data={mbrData} loading={mbrLoading} />

      {/* Eficiencia GEM */}
      <GemEficienciaSection data={gemData} loading={gemLoading} />

      {/* Footer info */}
      <div className="dash-footer">
        <span>Usuario: <strong>{currentUser?.nombre}</strong></span>
        <span>Rol: <strong>{currentUser?.activeRole}</strong></span>
        {canEdit ? <span className="can-edit-badge">● Edición habilitada</span> : <span className="no-edit-badge">● Solo visualización</span>}
        <span className="dash-update">Última actualización: {new Date().toLocaleTimeString('es-CO')}</span>
      </div>
    </div>
  );
}
