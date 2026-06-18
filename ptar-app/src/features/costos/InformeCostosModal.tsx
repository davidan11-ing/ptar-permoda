import { useState } from 'react';

const SECCIONES = [
  { key: 'portada', label: 'Portada' },
  { key: 'resumen', label: 'Resumen por Sistema' },
  { key: 'gem',     label: 'Costos GEM' },
  { key: 'ro',      label: 'Costos Osmosis Inversa' },
] as const;
type SeccionKey = (typeof SECCIONES)[number]['key'];
export type { SeccionKey as CostosSeccionKey };

interface Props {
  fechaInicio: string;
  fechaFin:    string;
  onClose:     () => void;
}

export default function InformeCostosModal({ fechaInicio, fechaFin, onClose }: Props) {
  const [activas, setActivas] = useState<Set<SeccionKey>>(
    new Set(['portada', 'resumen', 'gem', 'ro'])
  );
  const [copied, setCopied] = useState(false);

  const toggle = (key: SeccionKey) =>
    setActivas(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const buildUrl = () => {
    const url = new URL('/informe/costos', window.location.origin);
    url.searchParams.set('fi', fechaInicio);
    url.searchParams.set('ff', fechaFin);
    url.searchParams.set('secciones', Array.from(activas).join(','));
    return url.toString();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(buildUrl()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleOpenPreview = () => {
    window.open(buildUrl(), '_blank');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(1,4,9,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 10, width: 320, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#e6edf3', fontWeight: 700, fontSize: 13 }}>Informe de Costos Químicos</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 15 }}>✕</button>
        </div>

        <div style={{ fontSize: 11, color: '#8b949e' }}>
          <span style={{ color: '#58a6ff', fontWeight: 600 }}>Período:</span> {fechaInicio} — {fechaFin}
        </div>

        <div style={{ borderTop: '1px solid #21262d', paddingTop: 12 }}>
          <div style={{ fontSize: 11, color: '#8b949e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Secciones</div>
          {SECCIONES.map(s => (
            <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10, color: activas.has(s.key) ? '#e6edf3' : '#484f58', fontSize: 12 }}>
              <input type="checkbox" checked={activas.has(s.key)} onChange={() => toggle(s.key)} style={{ accentColor: '#d29922', width: 14, height: 14 }} />
              {s.label}
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #21262d', paddingTop: 12 }}>
          <button onClick={handleOpenPreview} style={{ background: '#8a4000', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            📄 Ver Informe
          </button>
          <button onClick={handleCopyLink} style={{ background: copied ? '#2a1a00' : '#21262d', color: '#e6edf3', border: '1px solid #30363d', borderRadius: 6, padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {copied ? '✓ ¡Copiado!' : '🔗 Copiar Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
