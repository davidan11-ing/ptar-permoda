// Tabla editable de parámetros de calidad del agua (F-03) por turno
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

// URL base de la API tomada desde variables de entorno
const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

// Fila de medicion_calidad devuelta por la API
interface Registro {
  id: number;
  fecha: string;
  turno: string;
  turno_int: number;
  parametro: string;
  unidad_tratamiento: string;
  valor: number | null;
  no_aplica: number;
  observacion: string | null;
  usuario: string | null;
}

// Estado local del formulario de edición en línea
interface EditState {
  valor: string;
  no_aplica: boolean;
  observacion: string;
}

// Props del componente: rango de fechas, turno opcional y señal de recarga
interface Props {
  fechaInicio: string;
  fechaFin: string;
  turno?: number;
  trigger: boolean;
}

// Mapa de claves de turno a etiquetas legibles
const TURNO_LABEL: Record<string, string> = { mañana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };

// Estilos base reutilizables para celdas de datos
const tdBase: React.CSSProperties = {
  padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #21262d',
  color: '#c9d1d9', whiteSpace: 'nowrap', fontFamily: 'monospace',
};
// Estilos base para encabezados de columna fijos
const thBase: React.CSSProperties = {
  ...tdBase, fontWeight: 700, color: '#8b949e', fontSize: 11,
  textTransform: 'uppercase', background: '#161b22', position: 'sticky', top: 0,
};

// Componente principal: tabla de calidad con edición inline por fila
export default function TablaCalidad({ fechaInicio, fechaFin, turno, trigger }: Props) {
  // Filas de registros cargadas desde la API
  const [rows,    setRows]    = useState<Registro[]>([]);
  const [loading, setLoading] = useState(false);
  // ID del registro actualmente en modo edición
  const [editId,  setEditId]  = useState<number | null>(null);
  // Valores del formulario de edición activo
  const [edit,    setEdit]    = useState<EditState>({ valor: '', no_aplica: false, observacion: '' });
  const [saving,  setSaving]  = useState(false);

  // Carga registros del endpoint de edición aplicando filtros de fecha y turno
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: '500' });
      if (turno) q.set('turno', String(turno));
      const res = await fetch(`${API}/api/calidad/edicion?${q}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      setRows(await res.json());
    } catch (e) {
      toast.error('Error al cargar registros de calidad');
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin, turno]);

  // Recarga al cambiar filtros o cuando el padre emite trigger
  useEffect(() => { load(); }, [load, trigger]);
  // Auto-refresh cada 30 s para reflejar entradas del operario sin recargar página
  useEffect(() => { const id = setInterval(() => load(), 30_000); return () => clearInterval(id); }, [load]);

  // Activa el modo edición para la fila seleccionada y precarga sus valores
  const startEdit = (r: Registro) => {
    setEditId(r.id);
    setEdit({ valor: r.valor != null ? String(r.valor) : '', no_aplica: !!r.no_aplica, observacion: r.observacion ?? '' });
  };

  // Cancela la edición en curso sin persistir cambios
  const cancelEdit = () => setEditId(null);

  // Envía el PUT a la API y actualiza la fila localmente sin recargar toda la tabla
  const saveEdit = async (r: Registro) => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        no_aplica:   edit.no_aplica,
        observacion: edit.observacion || null,
      };
      if (!edit.no_aplica && edit.valor !== '') body.valor = parseFloat(edit.valor);
      else if (edit.no_aplica) body.valor = null;

      const res = await fetch(`${API}/api/calidad/edicion/${r.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Registro actualizado');
      setEditId(null);
      // Actualización optimista: reemplaza solo la fila modificada
      setRows(prev => prev.map(row =>
        row.id === r.id
          ? { ...row, valor: body.valor as number | null, no_aplica: edit.no_aplica ? 1 : 0, observacion: edit.observacion || null }
          : row
      ));
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ color: '#484f58', padding: 20 }}>Cargando…</div>;
  if (!rows.length) return <div style={{ color: '#484f58', padding: 20 }}>Sin registros para el período seleccionado</div>;

  // Tabla con scroll horizontal y edición inline por fila
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #21262d', borderRadius: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
        <thead>
          <tr>
            {['Fecha','Turno','Parámetro','Unidad tratamiento','Valor','N/A','Observación','Usuario',''].map(h => (
              <th key={h} style={thBase}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const isEditing = editId === r.id;
            return (
              <tr key={r.id} style={{ background: isEditing ? '#1f6feb11' : 'transparent' }}>
                <td style={tdBase}>{r.fecha}</td>
                <td style={tdBase}>{TURNO_LABEL[r.turno] ?? r.turno}</td>
                <td style={tdBase}>{r.parametro}</td>
                <td style={tdBase}>{r.unidad_tratamiento}</td>

                {/* Valor */}
                <td style={tdBase}>
                  {isEditing
                    ? <input type="number" step="any" value={edit.valor}
                        onChange={e => setEdit(p => ({ ...p, valor: e.target.value }))}
                        disabled={edit.no_aplica}
                        style={{ width: 80, background: '#0d1117', border: '1px solid #1f6feb',
                          color: '#e6edf3', borderRadius: 4, padding: '3px 6px', fontSize: 12 }} />
                    : <span style={{ color: r.no_aplica ? '#484f58' : '#e6edf3' }}>
                        {r.no_aplica ? '—' : (r.valor ?? '—')}
                      </span>
                  }
                </td>

                {/* N/A */}
                <td style={{ ...tdBase, textAlign: 'center' }}>
                  {isEditing
                    ? <input type="checkbox" checked={edit.no_aplica}
                        onChange={e => setEdit(p => ({ ...p, no_aplica: e.target.checked }))} />
                    : (r.no_aplica ? '✓' : '')
                  }
                </td>

                {/* Observación */}
                <td style={{ ...tdBase, maxWidth: 200 }}>
                  {isEditing
                    ? <input type="text" value={edit.observacion}
                        onChange={e => setEdit(p => ({ ...p, observacion: e.target.value }))}
                        style={{ width: '100%', background: '#0d1117', border: '1px solid #1f6feb',
                          color: '#e6edf3', borderRadius: 4, padding: '3px 6px', fontSize: 12 }} />
                    : <span style={{ color: '#8b949e', fontSize: 11 }}>{r.observacion ?? ''}</span>
                  }
                </td>

                <td style={{ ...tdBase, color: '#484f58' }}>{r.usuario ?? ''}</td>

                {/* Acciones: guardar / cancelar o botón de editar */}
                <td style={{ ...tdBase, whiteSpace: 'nowrap' }}>
                  {isEditing ? (
                    <>
                      <button onClick={() => saveEdit(r)} disabled={saving}
                        style={{ background: '#238636', color: '#fff', border: 'none', borderRadius: 4,
                          padding: '3px 10px', cursor: 'pointer', fontSize: 12, marginRight: 4 }}>
                        {saving ? '…' : '✅'}
                      </button>
                      <button onClick={cancelEdit}
                        style={{ background: '#21262d', color: '#e6edf3', border: 'none', borderRadius: 4,
                          padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>
                        ✕
                      </button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(r)}
                      style={{ background: 'none', color: '#8b949e', border: '1px solid #30363d',
                        borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>
                      ✏️
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ padding: '8px 12px', fontSize: 11, color: '#484f58', borderTop: '1px solid #21262d' }}>
        {rows.length} registros
      </div>
    </div>
  );
}
