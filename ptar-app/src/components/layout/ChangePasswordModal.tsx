// Modal para cambio de contraseña del usuario autenticado
import { useState } from 'react';
import { changePassword } from '../../services/ptarClient';

interface Props {
  onClose: () => void;
}

// Modal de cambio de contraseña con validación de complejidad
export default function ChangePasswordModal({ onClose }: Props) {
  // Campos del formulario y estado de UI
  const [current, setCurrent] = useState('');
  const [next,    setNext]    = useState('');
  const [confirm, setConfirm] = useState('');
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Valida reglas de complejidad y envía el cambio de contraseña
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (next.length < 8) { setError('La nueva contraseña debe tener al menos 8 caracteres'); return; }
    if (!/[A-Z]/.test(next) || !/[0-9]/.test(next) || !/[^A-Za-z0-9]/.test(next)) {
      setError('Debe incluir mayúsculas, números y un carácter especial (ej: !@#$%)');
      return;
    }
    if (next !== confirm) { setError('Las contraseñas nuevas no coinciden'); return; }
    setLoading(true);
    try {
      await changePassword(current, next);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cambiar la contraseña. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Overlay oscuro que cierra el modal al hacer click fuera
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      {/* Tarjeta del modal */}
      <div
        style={{
          background: '#161b22', border: '1px solid #30363d', borderRadius: 8,
          padding: '24px 28px', width: 360, maxWidth: '90vw',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#e6edf3' }}>Cambiar contraseña</span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#8b949e',
              cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px',
            }}
          >✕</button>
        </div>

        {/* Confirmación de éxito o formulario de cambio */}
        {success ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#3fb950', marginBottom: 16, fontSize: 14 }}>
              Contraseña actualizada correctamente.
            </p>
            <button className="logout-btn" onClick={onClose}>Cerrar</button>
          </div>
        ) : (
          // Formulario con los tres campos de contraseña generados dinámicamente
          <form onSubmit={handleSubmit}>
            {(['Contraseña actual', 'Nueva contraseña', 'Confirmar nueva contraseña'] as const).map((label, i) => {
              const values  = [current, next, confirm];
              const setters = [setCurrent, setNext, setConfirm];
              const autos   = ['current-password', 'new-password', 'new-password'] as const;
              return (
                <div key={label} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#8b949e', marginBottom: 4 }}>{label}</label>
                  <input
                    type="password"
                    value={values[i]}
                    onChange={e => setters[i](e.target.value)}
                    autoComplete={autos[i]}
                    required
                    minLength={i > 0 ? 8 : undefined}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: '#0d1117', border: '1px solid #30363d', borderRadius: 6,
                      color: '#e6edf3', padding: '8px 10px', fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              );
            })}

            {error && (
              <p style={{ color: '#f78166', fontSize: 12, margin: '0 0 12px' }}>{error}</p>
            )}

            {/* Botones de acción del formulario */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  background: 'none', border: '1px solid #30363d', borderRadius: 6,
                  color: '#8b949e', padding: '7px 14px', fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="logout-btn"
              >
                {loading ? 'Guardando…' : 'Actualizar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
