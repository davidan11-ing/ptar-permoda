// Panel Visualizador — dashboard consolidado para roles de solo visualización
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../state/ThemeContext';
import KpiGauge from './KpiGauge';
import { KPI_METRICS } from './mockData';
import { getDashboardConfig } from '../../services/ptarClient';
import { useAuth } from '../../state/AuthContext';
import { ROUTES } from '../../lib/routes';
import type { DashboardConfig } from '../../types/dashboardConfig';
import CalidadDashboardPage from '../calidad/CalidadDashboardPage';
import BalanceHidricoDashboard from '../balance/BalanceHidricoDashboard';
import CostosDashboard from '../costos/CostosDashboard';
import ResumenDashboard from '../analista/ResumenDashboard';
import DashboardPage from './DashboardPage';

// Fecha de hoy formateada en español colombiano
const TODAY = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
// Meta de caudal de diseño en m³ por turno
const CAUDAL_TARGET_M3 = 640;

// Página completa del panel visualizador con KPIs y sub-dashboards configurados
export default function AdminDashboardPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  // Lista de KPIs con valores calculados desde la API
  const [kpis,   setKpis]   = useState(KPI_METRICS);
  // Configuración del visualizador guardada por el Analista
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  // Estado de carga de la configuración
  const [loadingCfg, setLoadingCfg] = useState(true);

  // Carga y calcula el porcentaje de eficiencia desde reactivos de los últimos 7 días
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
        const avgEf = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        setKpis(prev => prev.map(k => {
          if (k.label === 'Eficiencia Tratamiento') return { ...k, value: avgEf };
          if (k.label === 'Caudal Procesado')       return { ...k, value: avgEf };
          return k;
        }));
      })
      .catch(() => {});
  }, []);

  // Carga la configuración del visualizador persistida por el Analista
  useEffect(() => {
    getDashboardConfig()
      .then(cfg => setConfig(cfg))
      .catch(() => setConfig(null))
      .finally(() => setLoadingCfg(false));
  }, []);

  // Sin secciones de Calidad/Balance/Costos configuradas por el Analista → mostrar
  // el mismo dashboard del Analista (solo lectura) en vez de dejar la pantalla vacía
  const hasCustomSections =
    !!(config?.calidad?.enabled && config.calidad.sections.length > 0) ||
    !!(config?.balance?.enabled && config.balance.sections.length > 0) ||
    !!(config?.costos?.enabled  && config.costos.sections.length  > 0);

  if (!loadingCfg && !hasCustomSections) {
    return <DashboardPage canEdit={false} />;
  }

  // Divider visual con color de acento para separar secciones del panel
  const sectionDivider = (label: string, color: string) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, margin: '32px 0 0',
      paddingBottom: 10, borderBottom: `2px solid ${color}22`,
    }}>
      <div style={{ width: 4, height: 24, background: color, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="dashboard">
      {/* Header con título y botón de regreso al dashboard del Analista */}
      <div className="dash-header">
        <div className="dash-header-left">
          <h1 className="dash-title">Panel Visualizador — PTAR</h1>
          <span className="dash-date">{TODAY}</span>
        </div>
        <div className="dash-header-right">
          <div className="dash-plant-badge">Planta: <strong>PTAR-01</strong></div>
          <button
            onClick={() => navigate(ROUTES.ADMIN_DASHBOARD)}
            style={{ background: theme.surface2, color: theme.muted, border: `1px solid ${theme.border}`,
              padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            ↩ Volver
          </button>
        </div>
      </div>

      {/* KPI Gauges */}
      <section className="dash-section">
        <div className="section-title">Indicadores Clave de Desempeño</div>
        <div className="kpi-row">
          {kpis.map(kpi => (
            <div key={kpi.label} className="kpi-card">
              <KpiGauge
                label={kpi.label}
                value={kpi.value}
                target={kpi.target}
                unit={kpi.unit}
                color={kpi.color}
                size={150}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Resumen Ejecutivo (si está habilitado) ── */}
      {!loadingCfg && config?.resumen?.enabled && (
        <>
          {sectionDivider('Resumen Ejecutivo', '#58a6ff')}
          <ResumenDashboard
            sections={config.resumen.sections.length ? config.resumen.sections : undefined}
            fechaInicioFixed={config.resumen.filters?.fechaInicio || undefined}
            fechaFinFixed={config.resumen.filters?.fechaFin || undefined}
          />
        </>
      )}

      {/* Sub-dashboards habilitados por configuración del Analista */}
      {loadingCfg ? (
        <div style={{ textAlign: 'center', color: theme.muted, padding: 40 }}>
          Cargando panel configurado…
        </div>
      ) : !config || (!config.calidad?.enabled && !config.balance?.enabled && !config.costos?.enabled) ? (
        // Mensaje cuando no hay secciones configuradas
        <div style={{
          margin: '32px 0', padding: 32, textAlign: 'center',
          background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8,
          color: theme.muted, fontSize: 13,
        }}>
          No hay secciones configuradas para mostrar.
          El Analista debe configurar el Panel Visualizador desde su dashboard.
        </div>
      ) : (
        <>
          {/* Sección de Calidad del Agua si está habilitada */}
          {config.calidad?.enabled && config.calidad.sections.length > 0 && (
            <>
              {sectionDivider('Calidad del Agua', '#d29922')}
              <CalidadDashboardPage vizConfig={{
                sections: config.calidad.sections,
                filters: config.calidad.filters,
              }} />
            </>
          )}

          {/* Sección de Balance Hídrico si está habilitada */}
          {config.balance?.enabled && config.balance.sections.length > 0 && (
            <>
              {sectionDivider('Balance Hídrico', '#4472C4')}
              <BalanceHidricoDashboard />
            </>
          )}

          {/* Sección de Costos Químicos si está habilitada */}
          {config.costos?.enabled && config.costos.sections.length > 0 && (
            <>
              {sectionDivider('Costos Químicos', '#ED7D31')}
              <CostosDashboard />
            </>
          )}
        </>
      )}

      {/* Footer con datos del usuario — solo visualización */}
      <div className="dash-footer">
        <span>Usuario: <strong>{currentUser?.nombre}</strong></span>
        <span>Rol: <strong>{currentUser?.activeRole}</strong></span>
        <span className="no-edit-badge">● Solo visualización</span>
        <span className="dash-update">Última actualización: {new Date().toLocaleTimeString('es-CO')}</span>
      </div>
    </div>
  );
}
