import { CONTADORES_MAP, TIPO_AGUA_CLASS } from '../../../lib/constants/contadores';
import type { ContadorId } from '../../../lib/constants/contadores';

interface ContadorCardProps {
  id: ContadorId;
  lectura: string;
  obs: string;
  uid?: string;
  isExtra?: boolean;
  prev: number;
  delta: number | null;
  hasErr: boolean;
  loadingPrev: boolean;
  onLectura: (v: string) => void;
  onObs: (v: string) => void;
  onRemove?: () => void;
}

export function ContadorCard({
  id, lectura, obs, isExtra = false,
  prev, delta, hasErr, loadingPrev,
  onLectura, onObs, onRemove,
}: ContadorCardProps) {
  const c       = CONTADORES_MAP[id];
  const isDecr  = delta !== null && delta < 0;
  const active  = lectura !== '';
  const cardClass = `param-row${active ? (isDecr ? ' has-error' : ' has-value') : ''}`;

  return (
    <div className={cardClass}>
      <div className="param-row-header">
        {isExtra ? (
          <span className="param-badge-extra">{id}</span>
        ) : (
          <span className="param-badge-diario">{id}</span>
        )}
        <span className="param-nombre-text">{c.nombre}</span>
        <span className={`badge-agua ${TIPO_AGUA_CLASS[c.tipo_agua] ?? ''}`} style={{ marginLeft: 'auto' }}>
          {c.tipo_agua}
        </span>
        {onRemove && (
          <button type="button" className="btn-remove-param" onClick={onRemove} style={{ marginLeft: 6 }}>×</button>
        )}
      </div>

      <div className="param-row-inputs">
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>
            Lect. anterior (m³)
            {loadingPrev && <span style={{ color: '#484f58', marginLeft: 6 }}>cargando…</span>}
          </label>
          <div className="form-readonly">{prev.toLocaleString('es-CO', { minimumFractionDigits: 1 })}</div>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Lect. actual (m³)</label>
          <input
            type="number" step="1" min="0"
            className={`form-input${isDecr ? ' input-warning' : ''}`}
            placeholder="m³"
            value={lectura}
            onChange={e => onLectura(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Delta (m³)</label>
          <div className={`form-readonly${delta === null ? '' : delta < 0 ? ' value-alert' : ' value-ok'}`}>
            {delta !== null ? `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}` : '—'}
          </div>
        </div>
      </div>

      {isDecr && (
        <>
          <div className="form-alert form-alert-warn" style={{ padding: '8px 12px', fontSize: 12 }}>
            Lectura menor a la anterior — se requiere observación.
          </div>
          <textarea
            className={`form-textarea${hasErr ? ' input-error' : ''}`}
            rows={2}
            placeholder="Explica el motivo del decremento o corrección..."
            value={obs}
            onChange={e => onObs(e.target.value)}
          />
          {hasErr && <span className="field-error">La observación es obligatoria cuando hay decremento.</span>}
        </>
      )}
    </div>
  );
}
