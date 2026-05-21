import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { ROUTES } from '../../lib/routes';
import { TURNO_LABELS, getTurno } from '../../lib/utils/time';

export default function FormatoCondicionesOp() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const turno = getTurno();
  const now = new Date();

  return (
    <div className="formato-page">
      <div className="formato-header" style={{ borderColor: '#8b949e' }}>
        <h1 className="formato-title">
          <span className="formato-num" style={{ background: '#8b949e' }}>F-05</span>
          Condiciones de Operación
        </h1>
        <p className="formato-meta">Operario: <strong>{currentUser?.nombre}</strong></p>
      </div>

      <div className="formato-form">

        {/* ── Contexto ─────────────────────────────────────────────────── */}
        <div className="form-section-title">Contexto</div>
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Fecha</label>
            <div className="form-readonly">{now.toLocaleDateString('es-CO')}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Turno</label>
            <div className="form-readonly">{TURNO_LABELS[turno]}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Operario</label>
            <div className="form-readonly">{currentUser?.nombre}</div>
          </div>
        </div>

        {/* ── Sección RO ───────────────────────────────────────────────── */}
        <div className="form-section-title">
          Sistema RO — Ósmosis Inversa
        </div>
        <div style={{
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px dashed var(--border)',
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚙️</div>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Próximamente disponible</p>
          <p style={{ fontSize: 13 }}>Los campos de condiciones de operación RO están en definición.</p>
        </div>

        {/* ── Sección MBR ──────────────────────────────────────────────── */}
        <div className="form-section-title">
          Sistema MBR — Biorreactor de Membrana
        </div>
        <div style={{
          padding: '24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px dashed var(--border)',
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔬</div>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Próximamente disponible</p>
          <p style={{ fontSize: 13 }}>Los campos de condiciones de operación MBR están en definición.</p>
        </div>

        {/* ── Acciones ──────────────────────────────────────────────────── */}
        <div className="form-actions">
          <button type="button" className="btn-secondary"
            onClick={() => navigate(ROUTES.OPERARIO_HOME)}>
            Volver al inicio
          </button>
        </div>

      </div>
    </div>
  );
}
