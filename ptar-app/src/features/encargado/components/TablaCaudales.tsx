/**
 * TablaCaudales — Tabla editable de contadores_lectura (F-01)
 * Scroll horizontal — muchas columnas de contadores
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

interface Registro {
  id: number;
  fecha: string;
  turno: string;
  turno_int: number;
  hora_lectura: string | null;
  tanque_reuso_2in: number | null;
  ptar: number | null;
  envio_th: number | null;
  entrada_ro1: number | null;
  salida_ro1: number | null;
  entrada_ro2: number | null;
  salida_ro2: number | null;
  mbr1: number | null;
  mbr2: number | null;
  ingreso_uf_ptap: number | null;
  salida_uf_ptap: number | null;
  medidor_verde_retorno: number | null;
}

type EditableKey = keyof Omit<Registro, 'id' | 'fecha' | 'turno' | 'turno_int' | 'hora_lectura' | 'usuario'>;

const COLS: { key: EditableKey; label: string }[] = [
  { key: 'tanque_reuso_2in',     label: 'TK Reuso 2"'   },
  { key: 'ptar',                 label: 'PTAR'           },
  { key: 'envio_th',             label: 'Envío TH'       },
  { key: 'entrada_ro1',          label: 'Ent. RO1'       },
  { key: 'salida_ro1',           label: 'Sal. RO1'       },
  { key: 'entrada_ro2',          label: 'Ent. RO2'       },
  { key: 'salida_ro2',           label: 'Sal. RO2'       },
  { key: 'mbr1',                 label: 'MBR 1'          },
  { key: 'mbr2',                 label: 'MBR 2'          },
  { key: 'ingreso_uf_ptap',      label: 'Ing. UF PTAP'  },
  { key: 'salida_uf_ptap',       label: 'Sal. UF PTAP'  },
  { key: 'medidor_verde_retorno','label': 'Med. Verde'   },
];

interface Props { fechaInicio: string; fechaFin: string; trigger: boolean }

const TURNO_LABEL: Record<string, string> = { mañana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };
const tdBase: React.CSSProperties = {
  padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #21262d',
  color: '#c9d1d9', whiteSpace: 'nowrap', fontFamily: 'monospace', textAlign: 'right',
};
const thBase: React.CSSProperties = {
  ...tdBase, fontWeight: 700, color: '#8b949e', fontSize: 11,
  textTransform: 'uppercase', background: '#161b22', position: 'sticky', top: 0,
};

export default function TablaCaudales({ fechaInicio, fechaFin, trigger }: Props) {
  const [rows,    setRows]    = useState<Registro[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId,  setEditId]  = useState<number | null>(null);
  const [edit,    setEdit]    = useState<Partial<Record<EditableKey, number>>>({});
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: '200' });
      const res = await fetch(`${API}/api/caudales/edicion?${q}`);
      if (!res.ok) throw new Error(await res.text());
      setRows(await res.json());
    } catch {
      toast.error('Error al cargar caudales');
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => { load(); }, [load, trigger]);

  const startEdit = (r: Registro) => {
    setEditId(r.id);
    const e: Partial<Record<EditableKey, number>> = {};
    COLS.forEach(c => { if (r[c.key] != null) e[c.key] = r[c.key] as number; });
    setEdit(e);
  };

  const saveEdit = async (r: Registro) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/caudales/edicion/${r.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edit),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Registro actualizado');
      setEditId(null);
      setRows(prev => prev.map(row => row.id === r.id ? { ...row, ...edit } : row));
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ color: '#484f58', padding: 20 }}>Cargando…</div>;
  if (!rows.length) return <div style={{ color: '#484f58', padding: 20 }}>Sin registros para el período seleccionado</div>;

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #21262d', borderRadius: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...thBase, textAlign: 'left' }}>Fecha</th>
            <th style={{ ...thBase, textAlign: 'left' }}>Turno</th>
            <th style={{ ...thBase, textAlign: 'left' }}>Hora</th>
            {COLS.map(c => <th key={c.key} style={thBase}>{c.label}</th>)}
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
                <td style={{ ...tdBase, textAlign: 'left', color: '#484f58' }}>{r.hora_lectura ?? '—'}</td>
                {COLS.map(c => (
                  <td key={c.key} style={tdBase}>
                    {isEditing
                      ? <input type="number" step="1"
                          value={edit[c.key] ?? ''}
                          onChange={e => setEdit(p => ({ ...p, [c.key]: parseInt(e.target.value) || 0 }))}
                          style={{ width: 80, background: '#0d1117', border: '1px solid #1f6feb',
                            color: '#e6edf3', borderRadius: 4, padding: '3px 6px', fontSize: 12, textAlign: 'right' }} />
                      : (r[c.key] != null ? (r[c.key] as number).toLocaleString('es-CO') : <span style={{ color: '#484f58' }}>—</span>)
                    }
                  </td>
                ))}
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
