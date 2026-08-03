import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RealKpiSection from './RealKpiSection';
import { getReportePdfUrl, getReporteDashboardHtmlUrl } from '../../services/ptarClient';
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

const TODAY = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
// Fecha rango: últimos 30 días
const FECHA_FIN    = new Date().toISOString().slice(0, 10);
const FECHA_INICIO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

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
            style={{ textDecoration: 'none', background: '#1f6feb', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}
          >
            📊 Informe KPI
          </a>
          <a
            href={getReportePdfUrl({
              fecha_inicio: FECHA_INICIO,
              fecha_fin: FECHA_FIN,
              tipo: 'completo',
            })}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', background: '#1f6feb', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}
          >
            ↓ PDF últimos 30 días
          </a>

          {/* Botón Widgets */}
          <button
            onClick={() => setPickMode(v => !v)}
            style={{
              background: pickMode ? '#21262d' : '#21262d',
              color: pickMode ? '#58a6ff' : '#8b949e',
              border: `1px solid ${pickMode ? '#58a6ff' : '#30363d'}`,
              padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            🧩 Widgets
          </button>

          {canEdit && (
            <button
              onClick={() => navigate(ROUTES.ENCARGADO_REGISTROS)}
              style={{ background: '#21262d', color: '#8b949e', border: '1px solid #30363d',
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
            <span style={{ color: '#e6edf3', fontWeight: 600, fontSize: 13 }}>Selecciona las gráficas a mostrar</span>
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
                    background: active ? `${w.color}22` : '#21262d',
                    border: `1px solid ${active ? w.color : '#30363d'}`,
                    color: active ? w.color : '#8b949e',
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
        <span className="dash-update">Última actualización: {new Date().toLocaleTimeString('es-CO')}</span>
      </div>
    </div>
  );
}

// ── Estilos inline ─────────────────────────────────────────────────────────────

const panelStyle = {
  container: {
    background: '#161b22',
    border: '1px solid #30363d',
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
    color: '#8b949e',
    fontSize: 12,
    cursor: 'pointer',
  } as React.CSSProperties,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 16,
};

const cardStyle: React.CSSProperties = {
  background: '#161b22',
  border: '1px solid #30363d',
  borderRadius: 10,
  overflow: 'hidden',
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 12px',
  background: '#0d1117',
};

const removeBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#8b949e',
  fontSize: 12,
  cursor: 'pointer',
  padding: '2px 4px',
  borderRadius: 4,
};
