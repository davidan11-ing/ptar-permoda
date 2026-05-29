import { memo, useRef, type ReactNode } from 'react';

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
  tooltipOverlay?: ReactNode;
}

function PhaseModalInner({
  phase, phaseIdx, totalPhases, closing,
  onClose, onNavigate, svgBody, tooltipOverlay,
}: Props) {
  const touchX = useRef(0);

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 60) onNavigate(dx > 0 ? -1 : 1);
  };

  return (
    <div
      className={`phase-modal-backdrop${closing ? ' phase-modal-closing-bg' : ''}`}
      onClick={onClose}
    >
      <div
        className={`phase-modal-panel${closing ? ' phase-modal-closing' : ''}`}
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          borderColor: `${phase.color}40`,
          boxShadow: `0 0 0 1px ${phase.color}1a, 0 0 80px ${phase.color}12, 0 36px 120px rgba(0,0,0,.95)`,
          background: `radial-gradient(ellipse 80% 40% at 50% -5%, ${phase.color}0f 0%, #060b14 55%)`,
        }}
      >
        {/* ── Barra de acento superior ── */}
        <div
          className="phase-modal-accent"
          style={{ background: `linear-gradient(90deg, ${phase.color}, ${phase.color}66, transparent)` }}
        />

        {/* ── Header ── */}
        <div className="phase-modal-header" style={{ borderBottomColor: `${phase.color}1e` }}>
          <div className="phase-modal-title-group">
            <span
              className="phase-modal-dot"
              style={{ background: phase.color, color: phase.color }}
            />
            <span
              className="phase-modal-title"
              style={{ color: phase.color }}
            >
              {phase.label}
            </span>
          </div>
          <div className="phase-modal-meta">
            <span className="phase-modal-index">
              {String(phaseIdx + 1).padStart(2, '0')} / {String(totalPhases).padStart(2, '0')}
            </span>
            <button className="phase-modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
          </div>
        </div>

        {/* ── SVG con botones laterales superpuestos ── */}
        <div className="phase-modal-svg-wrap">

          {/* Botón izquierdo */}
          <button
            className="phase-side-btn left"
            onClick={() => onNavigate(-1)}
            aria-label="Fase anterior"
            style={{ borderColor: `${phase.color}22`, color: `${phase.color}99` }}
          >
            ‹
          </button>

          {/* SVG zoomed — clipPath exacto al rectángulo de la fase */}
          <div className="phase-modal-svg-inner">
            {(() => {
              const [vx, vy, vw, vh] = phase.vb.split(' ').map(Number);
              const clipId = `phase-clip-${phase.key}`;

              // Fases SUPERIORES (vy=26): expandir clip 240px hacia arriba (tooltips y0=-230)
              // Fases INFERIORES (vy=345): expandir 120px para tooltips del borde superior
              // de la zona, cubrir el área extra con rect oscuro para ocultar equipos vecinos.
              const isTopPhase  = vy <= 30;
              const clipTopPad  = isTopPhase ? 240 : 120;
              const svgOverflow = 'visible';

              return (
                <svg
                  viewBox={phase.vb}
                  preserveAspectRatio="xMidYMid meet"
                  className="splash-svg phase-modal-svg"
                  role="img"
                  aria-label={`Vista ampliada de ${phase.label}`}
                  style={{ overflow: svgOverflow }}
                >
                  <defs>
                    <clipPath id={clipId}>
                      <rect x={vx} y={vy - clipTopPad} width={vw} height={vh + clipTopPad} />
                    </clipPath>
                  </defs>
                  <g clipPath={`url(#${clipId})`}>
                    {/* Fondo que tapa la zona expandida por clipTopPad (equipos vecinos y
                        texto de fase), va ANTES de svgBody para que tooltips queden encima */}
                    <rect x={vx} y={vy - clipTopPad} width={vw} height={clipTopPad + 4} fill="#070e16" />
                    {svgBody}
                  </g>
                  {tooltipOverlay}
                </svg>
              );
            })()}
          </div>

          {/* Botón derecho */}
          <button
            className="phase-side-btn right"
            onClick={() => onNavigate(1)}
            aria-label="Siguiente fase"
            style={{ borderColor: `${phase.color}22`, color: `${phase.color}99` }}
          >
            ›
          </button>

        </div>

        {/* ── Dots indicadores ── */}
        <div className="phase-modal-dots">
          {Array.from({ length: totalPhases }, (_, i) => (
            <span
              key={i}
              className={`phase-dot${i === phaseIdx ? ' active' : ''}`}
              style={i === phaseIdx ? { background: phase.color } : undefined}
              aria-label={`Fase ${i + 1}`}
            />
          ))}
        </div>

      </div>
    </div>
  );
}

export const PhaseModal = memo(PhaseModalInner);
