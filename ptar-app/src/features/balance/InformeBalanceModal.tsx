import { useState } from 'react';

const SECCIONES = [
  { key: 'portada',     label: 'Portada' },
  { key: 'balance',     label: 'Balance General' },
  { key: 'eficiencia',  label: 'Eficiencia del Sistema' },
  { key: 'indicadores', label: 'Indicadores de Producción' },
] as const;
type SeccionKey = (typeof SECCIONES)[number]['key'];
export type { SeccionKey as BalanceSeccionKey };

interface Props {
  fechaInicio: string;
  fechaFin:    string;
  onClose:     () => void;
}

export default function InformeBalanceModal({ fechaInicio, fechaFin, onClose }: Props) {
  const [activas, setActivas] = useState<Set<SeccionKey>>(
    new Set(['portada', 'balance', 'eficiencia', 'indicadores'])
  );
  const [copied, setCopied] = useState(false);

  const toggle = (key: SeccionKey) =>
    setActivas(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const handleCopyLink = () => {
    const url = new URL('/informe/balance', window.location.origin);
    url.searchParams.set('fi', fechaInicio);
    url.searchParams.set('ff', fechaFin);
    url.searchParams.set('secciones', Array.from(activas).join(','));
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleOpenPreview = () => {
    const url = new URL('/informe/balance', window.location.origin);
    url.searchParams.set('fi', fechaInicio);
    url.searchParams.set('ff', fechaFin);
    url.searchParams.set('secciones', Array.from(activas).join(','));
    window.open(url.toString(), '_blank');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(1,4,9,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 10, width: 320, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#e6edf3', fontWeight: 700, fontSize: 13 }}>Informe de Balance Hídrico</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 15 }}>✕</button>
        </div>

        <div style={{ fontSize: 11, color: '#8b949e' }}>
          <span style={{ color: '#58a6ff', fontWeight: 600 }}>Período:</span> {fechaInicio} — {fechaFin}
        </div>

        <div style={{ borderTop: '1px solid #21262d', paddingTop: 12 }}>
          <div style={{ fontSize: 11, color: '#8b949e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Secciones</div>
          {SECCIONES.map(s => (
            <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10, color: activas.has(s.key) ? '#e6edf3' : '#484f58', fontSize: 12 }}>
              <input type="checkbox" checked={activas.has(s.key)} onChange={() => toggle(s.key)} style={{ accentColor: '#3fb950', width: 14, height: 14 }} />
              {s.label}
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #21262d', paddingTop: 12 }}>
          <button onClick={handleOpenPreview} style={{ background: '#1a6b3c', color: '#fff', border: 'none', borderRadius: 6, padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            📄 Ver Informe
          </button>
          <button onClick={handleCopyLink} style={{ background: copied ? '#1a3a2a' : '#21262d', color: '#e6edf3', border: '1px solid #30363d', borderRadius: 6, padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {copied ? '✓ ¡Copiado!' : '🔗 Copiar Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
