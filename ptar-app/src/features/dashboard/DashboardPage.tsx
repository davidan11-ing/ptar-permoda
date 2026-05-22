import { useState, useEffect, useMemo } from 'react';
import KpiGauge from './KpiGauge';
import { KPI_METRICS } from './mockData';
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
const CAUDAL_TARGET_M3 = 640; // m³ por turno — meta de diseño de la PTAR

export default function DashboardPage({ canEdit }: Props) {
  const { currentUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [kpis, setKpis] = useState(KPI_METRICS);

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

  // ── Actualizar KPIs de Eficiencia y Caudal con datos reales ──────────
  useEffect(() => {
    const API = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8001';
    fetch(`${API}/api/reactivos/?limit=500`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: { fecha: string; caudal_m3_dia: number | null }[]) => {
        if (!data?.length) return;
        const byDate = new Map<string, number[]>();
        for (const row of data) {
          if (!row.fecha) continue;
          if (!byDate.has(row.fecha)) byDate.set(row.fecha, []);
          if (row.caudal_m3_dia != null && row.caudal_m3_dia > 0)
            byDate.get(row.fecha)!.push(Number(row.caudal_m3_dia));
        }
        const dates = Array.from(byDate.keys()).sort().reverse().slice(0, 7);
        if (!dates.length) return;
        const vals = dates.map(f => {
          const arr = byDate.get(f)!;
          const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
          return Math.min(100, Math.round(avg / CAUDAL_TARGET_M3 * 100));
        });
        const avgEf   = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        const avgCaud = avgEf;
        setKpis(prev => prev.map(k => {
          if (k.label === 'Eficiencia Tratamiento') return { ...k, value: avgEf };
          if (k.label === 'Caudal Procesado')       return { ...k, value: avgCaud };
          return k;
        }));
      })
      .catch(() => {});
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
