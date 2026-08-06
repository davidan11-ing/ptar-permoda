import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../state/ThemeContext';
import RealKpiSection from './RealKpiSection';
import { getReporteDashboardHtmlUrl } from '../../services/ptarClient';
import { useAuth } from '../../state/AuthContext';
import { ROUTES } from '../../lib/routes';
import {
  WIDGET_CATALOG, DEFAULT_WIDGETS, LS_KEY,
  type WidgetId,
} from './widgets/WidgetCatalog';
import BalanceConsumoWidget  from './widgets/BalanceConsumoWidget';
import GemCostoWidget        from './widgets/GemCostoWidget';
import RoCostoWidget         from './widgets/RoCostoWidget';
import CalidadTendenciaWidget from './widgets/CalidadTendenciaWidget';

interface Props { canEdit: boolean }

// Calculadas dentro del componente para que reflejen la fecha real del día actual

function renderWidget(id: WidgetId, fechaInicio: string, fechaFin: string): React.ReactNode {
  switch (id) {
    case 'balance-consumo':   return <BalanceConsumoWidget  fechaInicio={fechaInicio} fechaFin={fechaFin} />;
    case 'gem-costo-m3':      return <GemCostoWidget        fechaInicio={fechaInicio} fechaFin={fechaFin} />;
    case 'ro-costo-m3':       return <RoCostoWidget         fechaInicio={fechaInicio} fechaFin={fechaFin} />;
    case 'calidad-tendencia': return <CalidadTendenciaWidget fechaInicio={fechaInicio} fechaFin={fechaFin} />;
  }
}

export default function DashboardPage({ canEdit }: Props) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();

  // Fechas por defecto: marzo 1 → abril 1 del año en curso
  const _dashYear = new Date().getFullYear();
  const [FECHA_FIN,    setFechaFin]    = useState(`${_dashYear}-04-01`);
  const [FECHA_INICIO, setFechaInicio] = useState(`${_dashYear}-03-01`);
  const TODAY        = useMemo(() => new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), []);
  const [ahora, setAhora] = useState(() => new Date().toLocaleTimeString('es-CO'));
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date().toLocaleTimeString('es-CO')), 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Widget selector ───────────────────────────────────────────────────────────
  const [selectedWidgets, setSelectedWidgets] = useState<WidgetId[]>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      return saved ? (JSON.parse(saved) as WidgetId[]) : DEFAULT_WIDGETS;
    } catch { return DEFAULT_WIDGETS; }
  });
  const [pickMode, setPickMode] = useState(false);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(selectedWidgets));
  }, [selectedWidgets]);

  const toggleWidget = (id: WidgetId) => {
    setSelectedWidgets(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id],
    );
  };

  // Widgets activos ordenados según el catálogo
  const activeWidgets = WIDGET_CATALOG.filter(w => selectedWidgets.includes(w.id));

  // ── Estilos con tema ──────────────────────────────────────────────────────────
  const panelStyle = {
    container: {
      background: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: 8,
      padding: '12px 16px',
      margin: '0 0 12px',
    } as React.CSSProperties,
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    } as React.CSSProperties,
    chips: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: 8,
    } as React.CSSProperties,
    chip: {
      padding: '5px 12px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.15s',
    } as React.CSSProperties,
    closeBtn: {
      background: 'none',
      border: 'none',
      color: theme.muted,
      fontSize: 12,
      cursor: 'pointer',
    } as React.CSSProperties,
  };

  const cardStyle: React.CSSProperties = {
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    overflow: 'hidden',
  };

  const cardHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: theme.bg,
  };

  const removeBtn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: theme.muted,
    fontSize: 12,
    cursor: 'pointer',
    padding: '2px 4px',
    borderRadius: 4,
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
              fecha_inicio: FECHA_INICIO,
              fecha_fin: FECHA_FIN,
            })}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', background: theme.blue, color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}
          >
            📊 Informe KPI
          </a>
          {/* Botón Widgets */}
          <button
            onClick={() => setPickMode(v => !v)}
            style={{
              background: theme.surface2,
              color: pickMode ? theme.lblue : theme.muted,
              border: `1px solid ${pickMode ? theme.lblue : theme.border}`,
              padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            🧩 Widgets
          </button>

          {canEdit && (
            <button
              onClick={() => navigate(ROUTES.ENCARGADO_REGISTROS)}
              style={{ background: theme.surface2, color: theme.muted, border: `1px solid ${theme.border}`,
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              📋 Registros Operarios
            </button>
          )}
          {!canEdit && (
            <span className="readonly-badge">Solo lectura</span>
          )}
        </div>
      </div>

      {/* Panel de selección de widgets */}
      {pickMode && (
        <div style={panelStyle.container}>
          <div style={panelStyle.header}>
            <span style={{ color: theme.text1, fontWeight: 600, fontSize: 13 }}>Selecciona las gráficas a mostrar</span>
            <button onClick={() => setPickMode(false)} style={panelStyle.closeBtn}>Cerrar ✕</button>
          </div>
          <div style={panelStyle.chips}>
            {WIDGET_CATALOG.map(w => {
              const active = selectedWidgets.includes(w.id);
              return (
                <button
                  key={w.id}
                  onClick={() => toggleWidget(w.id)}
                  title={w.description}
                  style={{
                    ...panelStyle.chip,
                    background: active ? `${w.color}22` : theme.surface2,
                    border: `1px solid ${active ? w.color : theme.border}`,
                    color: active ? w.color : theme.muted,
                  }}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Indicadores reales */}
      <RealKpiSection />

      {/* Sección de widgets seleccionados */}
      {activeWidgets.length > 0 && (
        <section className="dash-section">
          <div className="section-title">Gráficas seleccionadas</div>
          <div style={gridStyle}>
            {activeWidgets.map(w => (
              <div key={w.id} style={cardStyle}>
                {/* Card header */}
                <div style={{ ...cardHeaderStyle, borderBottom: `2px solid ${w.color}` }}>
                  <span style={{ color: w.color, fontWeight: 600, fontSize: 13 }}>{w.label}</span>
                  <button
                    onClick={() => toggleWidget(w.id)}
                    title="Quitar gráfica"
                    style={removeBtn}
                  >
                    ✕
                  </button>
                </div>
                {/* Card body */}
                <div style={{ padding: '8px 4px 4px' }}>
                  {renderWidget(w.id, FECHA_INICIO, FECHA_FIN)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer info */}
      <div className="dash-footer">
        <span>Usuario: <strong>{currentUser?.nombre}</strong></span>
        <span>Rol: <strong>{currentUser?.activeRole}</strong></span>
        {canEdit ? <span className="can-edit-badge">● Edición habilitada</span> : <span className="no-edit-badge">● Solo visualización</span>}
        <span className="dash-update">Última actualización: {ahora}</span>
      </div>
    </div>
  );
}

// ── Estilos sin color (permanecen fuera del componente) ────────────────────────

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 16,
};
