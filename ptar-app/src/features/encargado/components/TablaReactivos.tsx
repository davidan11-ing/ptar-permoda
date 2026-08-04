// Tabla editable de consumo de reactivos químicos por turno (F-02)
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

// URL base de la API tomada desde variables de entorno
const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

// Fila de operacion_gem_turno devuelta por la API
interface Registro {
  id: number;
  fecha: string;
  turno: string;
  turno_int: number;
  caudal_m3: number;
  kg_acido: number;
  kg_coagulante: number;
  kg_decolorante: number;
  kg_pol_anionico: number;
  kg_pol_cationico: number;
  costo_quimica_turno: number;
  pesos_por_m3: number | null;
}

// Campos del formulario de edición (excluye metadatos y calculados)
type EditState = Omit<Registro, 'id' | 'fecha' | 'turno' | 'turno_int' | 'pesos_por_m3'>;

// Props del componente: rango de fechas y señal de recarga
interface Props { fechaInicio: string; fechaFin: string; trigger: boolean }

// Mapa de claves de turno a etiquetas legibles
const TURNO_LABEL: Record<string, string> = { mañana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };
// Estilos base reutilizables para celdas de datos (alineadas a la derecha)
const tdBase: React.CSSProperties = {
  padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #21262d',
  color: '#c9d1d9', whiteSpace: 'nowrap', fontFamily: 'monospace', textAlign: 'right',
};
// Estilos base para encabezados de columna fijos
const thBase: React.CSSProperties = {
  ...tdBase, fontWeight: 700, color: '#8b949e', fontSize: 11,
  textTransform: 'uppercase', background: '#161b22', position: 'sticky', top: 0,
};

// Definición de columnas editables: clave del campo y etiqueta de encabezado
const COLS: { key: keyof EditState; label: string }[] = [
  { key: 'caudal_m3',       label: 'Caudal m³'   },
  { key: 'kg_acido',        label: 'Ácido kg'     },
  { key: 'kg_coagulante',   label: 'Coag kg'      },
  { key: 'kg_decolorante',  label: 'Decol kg'     },
  { key: 'kg_pol_anionico', label: 'Pol.An kg'    },
  { key: 'kg_pol_cationico','label': 'Pol.Cat kg' },
  { key: 'costo_quimica_turno', label: 'Costo $' },
];

// Componente principal: tabla de reactivos con edición inline por fila
export default function TablaReactivos({ fechaInicio, fechaFin, trigger }: Props) {
  // Filas de registros cargadas desde la API
  const [rows,    setRows]    = useState<Registro[]>([]);
  const [loading, setLoading] = useState(false);
  // ID del registro actualmente en modo edición
  const [editId,  setEditId]  = useState<number | null>(null);
  // Valores del formulario de edición activo
  const [edit,    setEdit]    = useState<EditState>({} as EditState);
  const [saving,  setSaving]  = useState(false);

  // Carga registros del endpoint de edición GEM con filtro de fechas
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: '200' });
      const res = await fetch(`${API}/api/reactivos/edicion-gem?${q}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      setRows(await res.json());
    } catch {
      toast.error('Error al cargar reactivos');
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin]);

  // Recarga al cambiar filtros o cuando el padre emite trigger
  useEffect(() => { load(); }, [load, trigger]);

  // Auto-refresh cada 30 s para ver nuevos registros del operario sin recargar
  useEffect(() => {
    const id = setInterval(() => load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  // Activa el modo edición para la fila seleccionada y precarga sus valores
  const startEdit = (r: Registro) => {
    setEditId(r.id);
    setEdit({
      caudal_m3: r.caudal_m3, kg_acido: r.kg_acido, kg_coagulante: r.kg_coagulante,
      kg_decolorante: r.kg_decolorante, kg_pol_anionico: r.kg_pol_anionico,
      kg_pol_cationico: r.kg_pol_cationico, costo_quimica_turno: r.costo_quimica_turno,
    });
  };

  // Envía el PUT a la API y actualiza la fila localmente sin recargar toda la tabla
  const saveEdit = async (r: Registro) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/reactivos/edicion-gem/${r.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(edit),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Registro actualizado');
      setEditId(null);
      // Actualización optimista: fusiona cambios solo en la fila modificada
      setRows(prev => prev.map(row => row.id === r.id ? { ...row, ...edit } : row));
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ color: '#484f58', padding: 20 }}>Cargando…</div>;
  if (!rows.length) return <div style={{ color: '#484f58', padding: 20 }}>Sin registros para el período seleccionado</div>;

  // Tabla de reactivos con columna calculada $/m³ (solo lectura) y edición inline
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #21262d', borderRadius: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...thBase, textAlign: 'left' }}>Fecha</th>
            <th style={{ ...thBase, textAlign: 'left' }}>Turno</th>
            {COLS.map(c => <th key={c.key} style={thBase}>{c.label}</th>)}
            <th style={thBase}>$/m³</th>
            <th style={thBase}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const isEditing = editId === r.id;
            return (
              <tr key={r.id} style={{ background: isEditing ? '#1f6feb11' : 'transparent' }}>
                <td style={{ ...tdBase, textAlign: 'left' }}>{r.fecha}</td>
                <td style={{ ...tdBase, textAlign: 'left' }}>{TURNO_LABEL[r.turno] ?? r.turno}</td>
                {/* Celda por cada reactivo: input en edición, valor formateado en lectura */}
                {COLS.map(c => (
                  <td key={c.key} style={tdBase}>
                    {isEditing
                      ? <input type="number" step="any"
                          value={edit[c.key] as number}
                          onChange={e => setEdit(p => ({ ...p, [c.key]: parseFloat(e.target.value) || 0 }))}
                          style={{ width: 80, background: '#0d1117', border: '1px solid #1f6feb',
                            color: '#e6edf3', borderRadius: 4, padding: '3px 6px', fontSize: 12, textAlign: 'right' }} />
                      : (r[c.key] as number)?.toLocaleString('es-CO', { maximumFractionDigits: 2 }) ?? '—'
                    }
                  </td>
                ))}
                {/* Columna calculada pesos/m³: solo lectura, resaltada en naranja */}
                <td style={{ ...tdBase, color: '#ED7D31' }}>
                  {r.pesos_por_m3 != null ? `$${r.pesos_por_m3.toLocaleString('es-CO', { maximumFractionDigits: 0 })}` : '—'}
                </td>
                {/* Acciones: guardar / cancelar o botón de editar */}
                <td style={{ ...tdBase, whiteSpace: 'nowrap' }}>
                  {isEditing ? (
                    <>
                      <button onClick={() => saveEdit(r)} disabled={saving}
                        style={{ background: '#238636', color: '#fff', border: 'none', borderRadius: 4,
                          padding: '3px 10px', cursor: 'pointer', fontSize: 12, marginRight: 4 }}>
                        {saving ? '…' : '✅'}
                      </button>
                      <button onClick={() => setEditId(null)}
                        style={{ background: '#21262d', color: '#e6edf3', border: 'none', borderRadius: 4,
                          padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(r)}
                      style={{ background: 'none', color: '#8b949e', border: '1px solid #30363d',
                        borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontSize: 12 }}>✏️</button>
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
