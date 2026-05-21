import { useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../state/AuthContext';
import { useRegistrosPolling, type RegistroEvent } from '../../hooks/useRegistrosPolling';
import { playPing } from '../../lib/audio';

const TIPO_COLOR = { caudal: '#00c5e3', reactivo: '#3fb950' } as const;
const TIPO_ICON  = { caudal: '📊',      reactivo: '🧪'      } as const;
const TURNO_ICON: Record<string, string> = { mañana: '🌅', tarde: '☀️', noche: '🌙' };
const MAX_VISIBLE = 3;

function NotifToast({
  t: toastObj, evt, onDismiss,
}: {
  t: { id: string; visible: boolean };
  evt: RegistroEvent;
  onDismiss: () => void;
}) {
  const color = TIPO_COLOR[evt.tipo];
  return (
    <div
      style={{
        background: '#161b22',
        border: `1px solid ${color}35`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 10,
        padding: '12px 14px',
        width: 300,
        boxShadow: '0 8px 28px rgba(0,0,0,.45)',
        opacity: toastObj.visible ? 1 : 0,
        transform: toastObj.visible ? 'translateX(0)' : 'translateX(60px)',
        transition: 'opacity .25s, transform .25s',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: 15 }}>{TIPO_ICON[evt.tipo]}</span>
        <span style={{ color: '#e6edf3', fontWeight: 700, fontSize: 12.5, flex: 1 }}>
          Nuevo {evt.formNombre}
        </span>
        <button
          onClick={() => { toast.dismiss(toastObj.id); onDismiss(); }}
          style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}
        >×</button>
      </div>

      {/* Detalle */}
      <div style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.4 }}>
        <strong style={{ color: '#c9d1d9' }}>{evt.usuario}</strong>
        {' · '}
        <span>{TURNO_ICON[evt.turno] ?? ''} Turno {evt.turno}</span>
      </div>

      {/* Barra de progreso */}
      <div style={{ height: 2, background: '#21262d', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: color, animation: 'notif-progress 8s linear forwards' }} />
      </div>
    </div>
  );
}

/**
 * Montado en Layout.tsx — invisible, solo orquesta polling + toasts.
 * Solo activo para roles encargado y administrador.
 * Máximo MAX_VISIBLE toasts simultáneos para no saturar la pantalla.
 */
export function NotificationManager() {
  const { currentUser } = useAuth();
  const enabled  = currentUser?.activeRole === 'encargado' || currentUser?.activeRole === 'administrador';
  const activeRef = useRef(0);   // contador de toasts actualmente visibles

  useRegistrosPolling((evt: RegistroEvent) => {
    if (activeRef.current >= MAX_VISIBLE) return;  // descartar si ya hay 3 visibles

    activeRef.current += 1;
    playPing();

    toast.custom(
      (t) => (
        <NotifToast
          t={t}
          evt={evt}
          onDismiss={() => { activeRef.current = Math.max(0, activeRef.current - 1); }}
        />
      ),
      { duration: 8000 },
    );

    // Decrementar cuando el toast expire automáticamente
    setTimeout(() => {
      activeRef.current = Math.max(0, activeRef.current - 1);
    }, 8200);
  }, enabled);

  return null;
}
