import { useState, useEffect } from 'react';
import KpiGauge from './KpiGauge';
import { KPI_METRICS } from './mockData';
import { getReportePdfUrl, getReporteDashboardHtmlUrl } from '../../services/ptarClient';
import { useAuth } from '../../state/AuthContext';

interface Props { canEdit: boolean }

const TODAY = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
const CAUDAL_TARGET_M3 = 640; // m³ por turno — meta de diseño de la PTAR

export default function DashboardPage({ canEdit }: Props) {
  const { currentUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [kpis, setKpis] = useState(KPI_METRICS);

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

  const handleTargetChange = (idx: number, val: number) => {
    setKpis(prev => prev.map((k, i) => i === idx ? { ...k, target: val } : k));
  };

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
