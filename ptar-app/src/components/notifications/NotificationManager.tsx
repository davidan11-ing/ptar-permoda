// Gestor de notificaciones en tiempo real para nuevos registros de planta
import { useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../state/AuthContext';
import { useTheme } from '../../state/ThemeContext';
import { useRegistrosPolling, type RegistroEvent } from '../../hooks/useRegistrosPolling';
import { playPing } from '../../lib/audio';

// Colores e iconos por tipo de registro notificado
const TIPO_COLOR = { caudal: '#00c5e3', reactivo: '#3fb950' } as const;
const TIPO_ICON  = { caudal: '📊',      reactivo: '🧪'      } as const;
// Iconos de turno para la notificación
const TURNO_ICON: Record<string, string> = { mañana: '🌅', tarde: '☀️', noche: '🌙' };
const MAX_VISIBLE = 3;

// Toast individual para una notificación de nuevo registro
function NotifToast({
  t: toastObj, evt, onDismiss,
}: {
  t: { id: string; visible: boolean };
  evt: RegistroEvent;
  onDismiss: () => void;
}) {
  const { theme } = useTheme();
  const color = TIPO_COLOR[evt.tipo];
  return (
    <div
      style={{
        background: theme.surface,
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
        <span style={{ color: theme.text1, fontWeight: 700, fontSize: 12.5, flex: 1 }}>
          Nuevo {evt.formNombre}
        </span>
        <button
          onClick={() => { toast.dismiss(toastObj.id); onDismiss(); }}
          style={{ background: 'none', border: 'none', color: theme.dim, cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}
        >×</button>
      </div>

      {/* Detalle */}
      <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.4 }}>
        <strong style={{ color: theme.text2 }}>{evt.usuario}</strong>
        {' · '}
        <span>{TURNO_ICON[evt.turno] ?? ''} Turno {evt.turno}</span>
      </div>

      {/* Barra de progreso */}
      <div style={{ height: 2, background: theme.surface2, borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
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
// Componente invisible que escucha polling y dispara toasts de notificación
export function NotificationManager() {
  const { currentUser } = useAuth();
  // Solo activo para roles con acceso a datos de planta
  const enabled  = currentUser?.activeRole === 'encargado' || currentUser?.activeRole === 'administrador';
  // Contador de toasts actualmente visibles para respetar el límite MAX_VISIBLE
  const activeRef = useRef(0);

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
