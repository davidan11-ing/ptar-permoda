import { useState, useEffect, useCallback, useMemo } from 'react';
import './analisis.css';

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
const PAGE_SIZE = 100;

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('en-CA');
}
const DEFAULT_FI = daysAgo(60);
const DEFAULT_FF = new Date().toLocaleDateString('en-CA');

interface ColInfo  { columnName: string; dataType: string; isPk: boolean; }
interface TablaData { columnas: ColInfo[]; filas: Record<string, unknown>[]; total: number; isView: boolean; }

const TEXT_TYPES = new Set(['text', 'mediumtext', 'longtext', 'tinytext']);
const DATE_TYPES = new Set(['date', 'datetime', 'timestamp']);

interface TablasResponse { tablas: string[]; vistas: string[]; }

export default function AnalisSheet() {
  const [tablasList,  setTablasList]  = useState<string[]>([]);
  const [vistasList,  setVistasList]  = useState<string[]>([]);
  const [tabla,       setTabla]       = useState('');
  const [data,        setData]        = useState<TablaData | null>(null);
  const [pagina,      setPagina]      = useState(1);
  const [fi,          setFi]          = useState(DEFAULT_FI);
  const [ff,          setFf]          = useState(DEFAULT_FF);
  const [loading,     setLoading]     = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [status,      setStatus]      = useState('');
  const [tablasError, setTablasError] = useState('');
  const [editFila,    setEditFila]    = useState<Record<string, unknown> | null>(null);
  const [editVals,    setEditVals]    = useState<Record<string, string>>({});
  const [saving,      setSaving]      = useState(false);

  /* ── Cargar lista de tablas al montar ─────────────────── */
  useEffect(() => {
    fetch(`${API}/api/analisis/tablas`, { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res: TablasResponse) => {
        const all = [...res.tablas, ...res.vistas];
        if (!all.length) { setTablasError('El backend no devolvió tablas'); return; }
        setTablasList(res.tablas);
        setVistasList(res.vistas);
        setTabla(res.tablas[0] ?? res.vistas[0]);
      })
      .catch(e => setTablasError(`No se pudo conectar: ${e instanceof Error ? e.message : String(e)}`));
  }, []);

  /* ── Cargar datos de la tabla seleccionada ─────────────── */
  const cargar = useCallback(async (pag: number, tbl: string) => {
    if (!tbl) return;
    if (data) setRefreshing(true); else setLoading(true);
    try {
      const q = new URLSearchParams({ pagina: String(pag), limite: String(PAGE_SIZE) });
      if (fi) q.set('fi', fi);
      if (ff) q.set('ff', ff);
      const res = await fetch(`${API}/api/analisis/tabla/${encodeURIComponent(tbl)}?${q}`, { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      const d = await res.json() as TablaData;
      setData(d);
      setPagina(pag);
      const total = d.total.toLocaleString('es-CO');
      const pags  = Math.max(1, Math.ceil(d.total / PAGE_SIZE));
      setStatus(`${total} registros · pág. ${pag}/${pags}`);
    } catch (e) {
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fi, ff, data]);

  /* Al cambiar tabla carga automáticamente */
  useEffect(() => { if (tabla) cargar(1, tabla); }, [tabla]); // eslint-disable-line

  /* ── Abrir drawer de edición ──────────────────────────── */
  const openEdit = (fila: Record<string, unknown>) => {
    setEditFila(fila);
    const vals: Record<string, string> = {};
    for (const [k, v] of Object.entries(fila)) vals[k] = v == null ? '' : String(v);
    setEditVals(vals);
  };

  // Escape cierra el drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditFila(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const pkCol     = useMemo(() => data?.columnas.find(c => c.isPk), [data]);
  const totalPags = useMemo(() => data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1, [data]);

  /* ── Guardar cambios ──────────────────────────────────── */
  const saveEdit = async () => {
    if (!editFila || !data || !pkCol) return;
    const pkVal = editFila[pkCol.columnName];
    setSaving(true);
    try {
      const cambios: Record<string, string | null> = {};
      for (const col of data.columnas.filter(c => !c.isPk))
        cambios[col.columnName] = editVals[col.columnName] === '' ? null : editVals[col.columnName];

      const res = await fetch(`${API}/api/analisis/tabla/${encodeURIComponent(tabla)}/${pkVal}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditFila(null);
      cargar(pagina, tabla);
    } catch (e) {
      alert(`Error al guardar: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="analis-shell">

      {/* ── Toolbar ── */}
      <div className="analis-toolbar">
        <div className="analis-toolbar-group">
          <label className="analis-label">
            Tabla
            {data?.isView && (
              <span style={{ marginLeft: 6, fontSize: 9, background: '#2d4739', color: '#56d364', borderRadius: 3, padding: '1px 5px', fontWeight: 700, letterSpacing: '.04em' }}>
                VISTA · solo lectura
              </span>
            )}
          </label>
          <select
            className="analis-select"
            value={tabla}
            onChange={e => setTabla(e.target.value)}
            style={{ minWidth: 260 }}
          >
            {tablasList.length > 0 && (
              <optgroup label="Tablas">
                {tablasList.map(t => <option key={t}>{t}</option>)}
              </optgroup>
            )}
            {vistasList.length > 0 && (
              <optgroup label="Vistas">
                {vistasList.map(t => <option key={t}>{t}</option>)}
              </optgroup>
            )}
          </select>
        </div>
        <div className="analis-toolbar-group">
          <label className="analis-label">Fecha inicio</label>
          <input type="date" className="analis-input" value={fi} onChange={e => setFi(e.target.value)} />
        </div>
        <div className="analis-toolbar-group">
          <label className="analis-label">Fecha fin</label>
          <input type="date" className="analis-input" value={ff} onChange={e => setFf(e.target.value)} />
        </div>
        <button className="analis-btn analis-btn-primary" onClick={() => cargar(1, tabla)} disabled={loading || refreshing || !tabla}>
          {(loading || refreshing)
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="analis-spinner" />Cargando…</span>
            : '⬇ Cargar'}
        </button>
        {status      && <span className="analis-status">{status}</span>}
        {tablasError && <span className="analis-status" style={{ color: '#f85149' }}>⚠ {tablasError}</span>}
      </div>

      {/* ── Grid ── */}
      <div className="analis-grid-wrap">
        {loading && <div className="analis-loading">Cargando datos…</div>}

        {!loading && !data && (
          <div className="analis-empty">Selecciona una tabla y pulsa ⬇ Cargar</div>
        )}

        {!loading && data && data.filas.length === 0 && (
          <div className="analis-empty">Sin registros para el período seleccionado</div>
        )}

        {refreshing && <div className="analis-refresh-overlay"><span className="analis-spinner-lg" />Actualizando…</div>}

        {data && data.filas.length > 0 && (
          <table className="analis-grid">
            <thead>
              <tr>
                {data.columnas.map(col => (
                  <th key={col.columnName}>
                    {col.columnName}
                    {col.isPk && <span className="pk-badge">PK</span>}
                    <span className="type-badge">{col.dataType}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.filas.map((fila, i) => {
                const pkVal = pkCol ? String(fila[pkCol.columnName] ?? i) : String(i);
                return (
                  <tr
                    key={pkVal}
                    className={i % 2 === 0 ? '' : 'analis-row-alt'}
                    onClick={() => !data.isView && openEdit(fila)}
                    title={data.isView ? '' : 'Clic para editar'}
                    style={{ cursor: data.isView ? 'default' : 'pointer' }}
                  >
                    {data.columnas.map(col => {
                      const v = fila[col.columnName];
                      const str = v == null ? null : String(v);
                      return (
                        <td key={col.columnName} className={col.isPk ? 'td-pk' : ''}>
                          {str == null
                            ? <span className="null-val">NULL</span>
                            : str.length > 55 ? str.slice(0, 55) + '…' : str}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Paginación ── */}
      {data && data.total > PAGE_SIZE && (
        <div className="analis-pagination">
          <button className="analis-btn" disabled={pagina <= 1} onClick={() => cargar(pagina - 1, tabla)}>← Anterior</button>
          <span style={{ fontSize: 12, color: '#8b949e' }}>Página {pagina} de {totalPags}</span>
          <button className="analis-btn" disabled={pagina >= totalPags} onClick={() => cargar(pagina + 1, tabla)}>Siguiente →</button>
        </div>
      )}

      {/* ── Drawer de edición (solo tablas, no vistas) ── */}
      {editFila && data && !data.isView && (
        <div className="analis-drawer-bg" onClick={() => setEditFila(null)}>
          <div className="analis-drawer" onClick={e => e.stopPropagation()}>

            <div className="analis-drawer-header">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontWeight: 700, color: '#e6edf3', fontSize: 13 }}>Editar registro</span>
                <span style={{ fontSize: 11, color: '#58a6ff' }}>
                  {tabla}
                  {pkCol && (
                    <span style={{ color: '#8b949e', marginLeft: 8 }}>
                      · {pkCol.columnName}: <b style={{ color: '#e6edf3' }}>{String(editFila[pkCol.columnName])}</b>
                    </span>
                  )}
                </span>
              </div>
              <button
                onClick={() => setEditFila(null)}
                style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 16 }}
              >✕</button>
            </div>

            <div className="analis-drawer-body">
              {data.columnas.map(col => {
                const isTextArea = TEXT_TYPES.has(col.dataType);
                const inputType  = DATE_TYPES.has(col.dataType) ? 'date' : col.dataType.includes('int') ? 'number' : 'text';
                return (
                  <div key={col.columnName} className="analis-field">
                    <label className="analis-field-label">
                      {col.columnName}
                      {col.isPk && <span className="pk-badge">PK</span>}
                      <span className="type-badge">{col.dataType}</span>
                    </label>
                    {isTextArea ? (
                      <textarea
                        disabled={col.isPk}
                        className="analis-field-textarea"
                        value={editVals[col.columnName] ?? ''}
                        onChange={e => setEditVals(v => ({ ...v, [col.columnName]: e.target.value }))}
                        rows={3}
                      />
                    ) : (
                      <input
                        type={col.isPk ? 'text' : inputType}
                        disabled={col.isPk}
                        className="analis-field-input"
                        value={editVals[col.columnName] ?? ''}
                        onChange={e => setEditVals(v => ({ ...v, [col.columnName]: e.target.value }))}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="analis-drawer-footer">
              <button className="analis-btn" onClick={() => setEditFila(null)}>Cancelar</button>
              <button
                className="analis-btn analis-btn-primary"
                onClick={saveEdit}
                disabled={saving || !pkCol}
              >
                {saving ? 'Guardando…' : '💾 Guardar cambios'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
