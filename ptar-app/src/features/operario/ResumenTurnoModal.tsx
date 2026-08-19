// Modal de cierre de turno: muestra resumen de formularios, costo y OTs pendientes
import { useState, useEffect } from 'react';
import { useAuth } from '../../state/AuthContext';
import { useTheme } from '../../state/ThemeContext';
import { getTurnoResumen, type TurnoResumen, type FormularioResumen, type OtResumenItem } from '../../services/ptarClient';

interface Props { onClose: () => void }

const CRITICIDAD_COLOR: Record<string, string> = {
  ALTA:  '#f85149',
  MEDIA: '#d29922',
  BAJA:  '#58a6ff',
};

function FormCard({ f }: { f: FormularioResumen }) {
  const { theme } = useTheme();
  const color = f.completado ? '#3fb950' : '#f85149';
  return (
    <div style={{
      background: theme.surface,
      border: `1px solid ${color}44`,
      borderTop: `3px solid ${color}`,
      borderRadius: 8,
      padding: '12px 14px',
      flex: 1,
      minWidth: 0,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{f.completado ? '✅' : '❌'}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 2 }}>{f.codigo}</div>
      <div style={{ fontSize: 10, color: theme.text2, marginBottom: 6, lineHeight: 1.3 }}>{f.nombre}</div>
      {f.completado
        ? <div style={{ fontSize: 10, color: theme.muted }}>{f.registros} registro{f.registros !== 1 ? 's' : ''}</div>
        : <div style={{ fontSize: 10, color: '#f85149' }}>Sin diligenciar</div>}
      {f.codigo === 'F-02' && f.completado && f.costo !== undefined && f.costo > 0 && (
        <div style={{ fontSize: 10, color: '#3fb950', marginTop: 4, fontWeight: 700 }}>
          ${f.costo.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
        </div>
      )}
    </div>
  );
}

function OtRow({ ot, expanded, onToggle }: { ot: OtResumenItem; expanded: boolean; onToggle: () => void }) {
  const { theme } = useTheme();
  const color = CRITICIDAD_COLOR[(ot.criticidad ?? '').toUpperCase()] ?? theme.muted;
  const descripcion = ot.descripcion?.trim() || '';
  const label = descripcion || ot.objeto || 'Sin descripción';

  return (
    <div style={{ marginBottom: 4 }}>
      {/* Fila principal — clic expande/colapsa */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggle()}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '7px 10px', borderRadius: expanded ? '5px 5px 0 0' : 5,
          background: theme.surface,
          border: `1px solid ${expanded ? color + '66' : theme.border}`,
          borderBottom: expanded ? 'none' : undefined,
          cursor: 'pointer', transition: 'border-color .15s',
        }}
        onMouseEnter={e => !expanded && ((e.currentTarget as HTMLDivElement).style.borderColor = theme.border2)}
        onMouseLeave={e => !expanded && ((e.currentTarget as HTMLDivElement).style.borderColor = theme.border)}
      >
        <span style={{
          fontSize: 9, fontWeight: 700, color, background: color + '18',
          border: `1px solid ${color}44`, borderRadius: 3,
          padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0,
        }}>{ot.criticidad ?? '—'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: theme.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </div>
          {ot.objeto && label !== ot.objeto && (
            <div style={{ fontSize: 9, color: theme.dim, marginTop: 1 }}>{ot.objeto}</div>
          )}
        </div>
        <span style={{ fontSize: 10, color: theme.muted, flexShrink: 0, transition: 'transform .15s',
          display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none' }}>
          ▾
        </span>
      </div>

      {/* Panel de detalle — visible solo cuando expanded */}
      {expanded && (
        <div style={{
          background: theme.bg,
          border: `1px solid ${color}66`,
          borderTop: `1px solid ${color}33`,
          borderRadius: '0 0 5px 5px',
          padding: '10px 12px',
        }}>
          {ot.descripcion?.trim() && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>
                Descripción
              </div>
              <div style={{ fontSize: 11, color: theme.text1, lineHeight: 1.5 }}>
                {ot.descripcion}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
            {ot.objeto && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Equipo / Objeto</div>
                <div style={{ fontSize: 11, color: theme.text2 }}>{ot.objeto}</div>
              </div>
            )}
            {ot.pedido_de_trabajo && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Pedido de Trabajo</div>
                <div style={{ fontSize: 11, color: theme.text2 }}>{ot.pedido_de_trabajo}</div>
              </div>
            )}
            {ot.responsable && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Responsable</div>
                <div style={{ fontSize: 11, color: theme.text2 }}>{ot.responsable}</div>
              </div>
            )}
            {ot.estado && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Estado</div>
                <div style={{ fontSize: 11, color: theme.text2 }}>{ot.estado}</div>
              </div>
            )}
            {ot.criticidad && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Criticidad</div>
                <div style={{ fontSize: 11, color }}>{ot.criticidad}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResumenTurnoModal({ onClose }: Props) {
  const { logout } = useAuth();
  const { theme } = useTheme();
  const [data, setData]         = useState<TurnoResumen | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    getTurnoResumen()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleSalir = async () => {
    setSaliendo(true);
    try { await logout(); } catch { /* logout limpia igualmente */ }
  };

  const pendientes = data?.formularios.filter(f => !f.completado).length ?? 0;
  const fecha = data
    ? new Date(data.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9100, padding: 16,
    }}>
      <div style={{
        background: theme.surface, border: `1px solid ${theme.border}`,
        borderRadius: 12, width: '100%', maxWidth: 680,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', boxShadow: theme.shadowMd,
      }}>

        {/* Header */}
        <div style={{
          padding: '18px 24px 14px',
          borderBottom: `1px solid ${theme.border2}`,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          background: theme.bg,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: theme.text1, display: 'flex', alignItems: 'center', gap: 8 }}>
              📋 Resumen del Turno
              {data && (
                <span style={{ fontSize: 12, fontWeight: 400, color: theme.muted }}>
                  · {data.turno_nombre} · {fecha}
                </span>
              )}
            </div>
            {!loading && !error && pendientes > 0 && (
              <div style={{ fontSize: 11, color: '#f85149', marginTop: 4 }}>
                {pendientes} formulario{pendientes !== 1 ? 's' : ''} sin diligenciar en este turno
              </div>
            )}
            {!loading && !error && pendientes === 0 && (
              <div style={{ fontSize: 11, color: '#3fb950', marginTop: 4 }}>
                Todos los formularios del turno completados
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none',
            color: theme.muted, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 0,
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>

          {loading && (
            <div style={{ textAlign: 'center', color: theme.muted, padding: 48, fontSize: 13 }}>
              Cargando resumen del turno…
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', color: '#f85149', padding: 48, fontSize: 13 }}>
              No se pudo cargar el resumen. Verifica la conexión con el servidor.
            </div>
          )}

          {data && (
            <>
              {/* Formularios */}
              <div style={{ fontSize: 10, fontWeight: 700, color: theme.muted, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10 }}>
                Formularios del turno
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {data.formularios.map(f => <FormCard key={f.codigo} f={f} />)}
              </div>

              {/* Costo del turno */}
              <div style={{
                background: theme.bg,
                border: `1px solid ${theme.border2}`,
                borderRadius: 8,
                padding: '14px 20px',
                marginBottom: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: theme.muted, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 2 }}>
                    Costo del Turno
                  </div>
                  <div style={{ fontSize: 9, color: theme.dim }}>Basado en F-02 — Consumo Químico</div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: data.costo_turno > 0 ? '#3fb950' : theme.dim }}>
                  {data.costo_turno > 0
                    ? `$${data.costo_turno.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
                    : 'Sin datos'}
                </div>
              </div>

              {/* OTs */}
              <div style={{ fontSize: 10, fontWeight: 700, color: theme.muted, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10 }}>
                Órdenes de Trabajo — Hoy · PTAR BOG
              </div>

              {/* KPIs OTs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Pendientes', value: data.ots.total_pendientes, color: '#f85149' },
                  { label: 'Completadas', value: data.ots.total_completadas, color: '#3fb950' },
                  { label: 'Críticas pend.', value: data.ots.criticas_pendientes, color: '#d29922' },
                ].map(k => (
                  <div key={k.label} style={{
                    flex: 1, background: theme.bg, border: `1px solid ${k.color}44`,
                    borderTop: `3px solid ${k.color}`, borderRadius: 8,
                    padding: '10px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
                    <div style={{ fontSize: 9, color: theme.muted, marginTop: 3, textTransform: 'uppercase', letterSpacing: '.05em' }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Lista OTs pendientes */}
              {data.ots.items_pendientes.length > 0 ? (
                <div>
                  {data.ots.items_pendientes.map(ot => (
                    <OtRow
                      key={ot.id}
                      ot={ot}
                      expanded={expandedId === ot.id}
                      onToggle={() => setExpandedId(prev => prev === ot.id ? null : ot.id)}
                    />
                  ))}
                  {data.ots.total_pendientes > data.ots.items_pendientes.length && (
                    <div style={{ fontSize: 10, color: theme.dim, textAlign: 'center', marginTop: 6 }}>
                      + {data.ots.total_pendientes - data.ots.items_pendientes.length} más sin mostrar
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: '#3fb950', textAlign: 'center', padding: '10px 0' }}>
                  Sin órdenes de trabajo pendientes para hoy
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: `1px solid ${theme.border2}`,
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          background: theme.bg,
        }}>
          <button onClick={onClose} style={{
            background: theme.surface2, border: `1px solid ${theme.border}`,
            borderRadius: 5, color: theme.text2,
            padding: '8px 20px', fontSize: 12, cursor: 'pointer',
          }}>
            Seguir llenando
          </button>
          <button
            onClick={handleSalir}
            disabled={saliendo}
            style={{
              background: saliendo ? '#30363d' : '#f85149',
              border: 'none', borderRadius: 5, color: '#fff',
              padding: '8px 20px', fontSize: 12, fontWeight: 700,
              cursor: saliendo ? 'not-allowed' : 'pointer',
              opacity: saliendo ? 0.7 : 1,
            }}>
            {saliendo ? 'Cerrando turno…' : 'Cerrar Turno y Salir'}
          </button>
        </div>
      </div>
    </div>
  );
}
