import { memo, type ReactNode } from 'react';

interface Phase {
  key: string;
  label: string;
  color: string;
  vb: string;
}

interface Props {
  phase: Phase;
  phaseIdx: number;
  totalPhases: number;
  closing: boolean;
  onClose: () => void;
  onNavigate: (dir: 1 | -1) => void;
  svgBody: ReactNode;
}

function PhaseModalInner({
  phase, phaseIdx, totalPhases, closing,
  onClose, onNavigate, svgBody,
}: Props) {
  return (
    <div
      className={`phase-modal-backdrop${closing ? ' phase-modal-closing-bg' : ''}`}
      onClick={onClose}
    >
      <div
        className={`phase-modal-panel${closing ? ' phase-modal-closing' : ''}`}
        onClick={e => e.stopPropagation()}
        style={{
          borderColor: `${phase.color}55`,
          boxShadow: `0 0 40px ${phase.color}18, 0 24px 80px rgba(0,0,0,.8)`,
        }}
      >
        {/* Header */}
        <div className="phase-modal-header" style={{ borderColor: `${phase.color}40` }}>
          <div className="phase-modal-nav">
            <button className="phase-nav-btn" onClick={() => onNavigate(-1)} aria-label="Fase anterior">‹</button>
            <button className="phase-nav-btn" onClick={() => onNavigate(1)} aria-label="Siguiente fase">›</button>
          </div>
          <div className="phase-modal-title-group">
            <span className="phase-modal-dot" style={{ background: phase.color }} />
            <span className="phase-modal-title" style={{ color: phase.color }}>{phase.label}</span>
          </div>
          <div className="phase-modal-meta">
            <span className="phase-modal-index">
              {String(phaseIdx + 1).padStart(2, '0')} / {String(totalPhases).padStart(2, '0')}
            </span>
            <button className="phase-modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
          </div>
        </div>
        {/* SVG zoomed via viewBox */}
        <div className="phase-modal-svg-wrap">
          <svg
            viewBox={phase.vb}
            preserveAspectRatio="xMidYMid meet"
            className="splash-svg phase-modal-svg"
            role="img"
            aria-label={`Diagrama ${phase.label}`}
          >
            {svgBody}
          </svg>
        </div>
      </div>
    </div>
  );
}

export const PhaseModal = memo(PhaseModalInner);
