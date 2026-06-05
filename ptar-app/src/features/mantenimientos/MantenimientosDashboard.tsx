/**
 * MantenimientosDashboard
 * Visualización de mantenimientos preventivos sincronizados desde SharePoint
 * via Power Automate cada 5 minutos → tabla ptar_permoda.mantenimientos_preventivos
 */
import { useState, useEffect, useMemo } from 'react';

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Mantenimiento {
  id: number;
  sharepoint_id: number;
  semana: number | null;
  gerencia: string | null;
  area: string | null;
  gft: string | null;
  objeto: string | null;
  af: string | null;
  descripcion: string | null;
  tipo_mantenimiento: string | null;
  frecuencia: string | null;
  responsable: string | null;
  pedido_de_trabajo: string | null;
  criticidad: string | null;
  estado: string | null;
  dia_programado: string | null;
  asignado_a: string | null;
  ultima_sync: string | null;
}

interface Kpis {
  total: number;
  completados: number;
  pendientes: number;
  en_proceso: number;
  criticos: number;
  ultima_actualizacion: string;
  por_area: { area: string; n: number; completados: number }[];
}

// ── Colores por estado ────────────────────────────────────────────────────────
function estadoColor(estado: string | null): string {
  if (!estado) return '#8b949e';
  const e = estado.toUpperCase();
  if (e.includes('COMPLET'))  return '#3fb950';
  if (e.includes('PENDIENTE')) return '#d29922';
  if (e.includes('PROCESO') || e.includes('PROGRESO')) return '#1f6feb';
  if (e.includes('CANCEL'))   return '#f85149';
  return '#8b949e';
}

function criticidadColor(crit: string | null): string {
  if (!crit) return '#8b949e';
  const c = crit.toUpperCase();
  if (c === 'ALTA')   return '#f85149';
  if (c === 'MEDIA')  return '#d29922';
  if (c === 'BAJA')   return '#3fb950';
  return '#8b949e';
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color, sub }: { label: string; value: number | string; color: string; sub?: string }) {
  return (
    <div className="dash-card" style={{ padding: '14px 18px', textAlign: 'center', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#484f58', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MantenimientosDashboard() {
  const [data,    setData]    = useState<Mantenimiento[]>([]);
  const [kpis,    setKpis]    = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // ── Filtros ──────────────────────────────────────────────────────────────
  const [busqueda,    setBusqueda]    = useState('');
  const [filtroArea,  setFiltroArea]  = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCrit,  setFiltroCrit]  = useState('');
  const [filtroTipo,  setFiltroTipo]  = useState('');
  const semanaActual = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const [semana, setSemana] = useState<string>(String(semanaActual));

  // ── Carga de datos ────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: '2000' });
    if (semana) params.set('semana', semana);

    Promise.all([
      fetch(`${API}/api/mantenimientos/?${params}`).then(r => r.json()),
      fetch(`${API}/api/mantenimientos/kpis${semana ? `?semana=${semana}` : ''}`).then(r => r.json()),
    ])
      .then(([rows, k]) => { setData(rows); setKpis(k); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [semana]);

  // ── Opciones únicas para filtros ──────────────────────────────────────────
  const areas   = useMemo(() => [...new Set(data.map(r => r.area).filter(Boolean))].sort() as string[], [data]);
  const estados = useMemo(() => [...new Set(data.map(r => r.estado).filter(Boolean))].sort() as string[], [data]);
  const tipos   = useMemo(() => [...new Set(data.map(r => r.tipo_mantenimiento).filter(Boolean))].sort() as string[], [data]);

  // ── Datos filtrados ───────────────────────────────────────────────────────
  const filtrados = useMemo(() => {
    return data.filter(r => {
      const txt = busqueda.toLowerCase();
      const matchBusq = !txt ||
        r.objeto?.toLowerCase().includes(txt) ||
        r.descripcion?.toLowerCase().includes(txt) ||
        r.responsable?.toLowerCase().includes(txt) ||
        r.pedido_de_trabajo?.toLowerCase().includes(txt) ||
        r.af?.toLowerCase().includes(txt);
      return (
        matchBusq &&
        (!filtroArea   || r.area   === filtroArea) &&
        (!filtroEstado || r.estado === filtroEstado) &&
        (!filtroCrit   || r.criticidad?.toUpperCase() === filtroCrit.toUpperCase()) &&
        (!filtroTipo   || r.tipo_mantenimiento === filtroTipo)
      );
    });
  }, [data, busqueda, filtroArea, filtroEstado, filtroCrit, filtroTipo]);

  if (loading) return (
    <div className="cal-page">
      <div className="cal-loading"><div className="spinner" /><span>Cargando mantenimientos…</span></div>
    </div>
  );

  if (error) return (
    <div className="cal-page">
      <div style={{ padding: 20, color: '#f85149' }}>
        Error: {error}<br />
        <small>Verifica que el backend esté corriendo y la tabla mantenimientos_preventivos exista.</small>
      </div>
    </div>
  );

  return (
    <div className="cal-page">

      {/* ── Header ── */}
      <div className="cal-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="cal-title">Mantenimientos Preventivos</h1>
          <p className="cal-subtitle">
            Sincronizado desde SharePoint · {kpis?.ultima_actualizacion ? `Última sync: ${kpis.ultima_actualizacion}` : 'Sin datos aún'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label className="cal-filter-label" style={{ whiteSpace: 'nowrap' }}>Semana</label>
          <input
            type="number" min={1} max={53}
            className="cal-filter-input"
            value={semana}
            onChange={e => setSemana(e.target.value)}
            style={{ width: 70 }}
          />
          <button
            onClick={() => setSemana(String(semanaActual))}
            style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #30363d',
              background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: 12 }}
          >
            Semana actual
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {kpis && (
        <section className="dash-section">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            <KpiCard label="Total" value={kpis.total} color="#58a6ff" />
            <KpiCard label="Completados" value={kpis.completados} color="#3fb950"
              sub={kpis.total ? `${Math.round(kpis.completados / kpis.total * 100)}%` : ''} />
            <KpiCard label="Pendientes" value={kpis.pendientes} color="#d29922" />
            <KpiCard label="En proceso" value={kpis.en_proceso} color="#1f6feb" />
            <KpiCard label="Criticidad Alta" value={kpis.criticos} color="#f85149" />
          </div>
        </section>
      )}

      {/* ── Filtros ── */}
      <div className="cal-filters" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="cal-filter-group" style={{ flex: '1 1 200px' }}>
          <label className="cal-filter-label">Buscar</label>
          <input
            type="text" placeholder="Objeto, descripción, responsable, AF…"
            className="cal-filter-input"
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            style={{ minWidth: 220 }}
          />
        </div>
        <div className="cal-filter-group">
          <label className="cal-filter-label">Área</label>
          <select className="cal-filter-select" value={filtroArea} onChange={e => setFiltroArea(e.target.value)}>
            <option value="">Todas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="cal-filter-group">
          <label className="cal-filter-label">Estado</label>
          <select className="cal-filter-select" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            {estados.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className="cal-filter-group">
          <label className="cal-filter-label">Criticidad</label>
          <select className="cal-filter-select" value={filtroCrit} onChange={e => setFiltroCrit(e.target.value)}>
            <option value="">Todas</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Media</option>
            <option value="BAJA">Baja</option>
          </select>
        </div>
        <div className="cal-filter-group">
          <label className="cal-filter-label">Tipo</label>
          <select className="cal-filter-select" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="">Todos</option>
            {tipos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <span style={{ fontSize: 12, color: '#8b949e', whiteSpace: 'nowrap' }}>
            {filtrados.length} registro{filtrados.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Tabla ── */}
      <section className="dash-section">
        {filtrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#484f58' }}>
            Sin registros para los filtros seleccionados.{' '}
            {kpis?.total === 0 && <span>La tabla está vacía — configura el flujo de Power Automate para sincronizar datos.</span>}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#161b22', borderBottom: '2px solid #30363d' }}>
                  {['Sem','Área','GFT','Objeto','AF','Descripción','Tipo','Frecuencia',
                    'Responsable','Pedido','Criticidad','Estado','Día prog.','Asignado a'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#8b949e',
                      fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r, i) => (
                  <tr key={r.id}
                    style={{ background: i % 2 === 0 ? '#0d1117' : '#0a0f14',
                      borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '7px 10px', color: '#8b949e', whiteSpace: 'nowrap' }}>{r.semana ?? '—'}</td>
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{r.area ?? '—'}</td>
                    <td style={{ padding: '7px 10px', color: '#8b949e' }}>{r.gft ?? '—'}</td>
                    <td style={{ padding: '7px 10px', maxWidth: 200 }}>
                      <span title={r.objeto ?? ''}>{r.objeto ?? '—'}</span>
                    </td>
                    <td style={{ padding: '7px 10px', color: '#58a6ff', whiteSpace: 'nowrap' }}>{r.af ?? '—'}</td>
                    <td style={{ padding: '7px 10px', maxWidth: 220, color: '#8b949e' }}>
                      <span title={r.descripcion ?? ''}>
                        {r.descripcion ? (r.descripcion.length > 60 ? r.descripcion.slice(0, 60) + '…' : r.descripcion) : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      {r.tipo_mantenimiento ? (
                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                          background: '#1f6feb22', color: '#58a6ff', border: '1px solid #1f6feb44' }}>
                          {r.tipo_mantenimiento}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '7px 10px', color: '#8b949e', whiteSpace: 'nowrap' }}>{r.frecuencia ?? '—'}</td>
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{r.responsable ?? '—'}</td>
                    <td style={{ padding: '7px 10px', color: '#8b949e', whiteSpace: 'nowrap' }}>{r.pedido_de_trabajo ?? '—'}</td>
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      {r.criticidad ? (
                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                          color: criticidadColor(r.criticidad),
                          border: `1px solid ${criticidadColor(r.criticidad)}44` }}>
                          {r.criticidad}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                      {r.estado ? (
                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                          background: `${estadoColor(r.estado)}22`, color: estadoColor(r.estado),
                          border: `1px solid ${estadoColor(r.estado)}44` }}>
                          {r.estado}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '7px 10px', color: '#8b949e', whiteSpace: 'nowrap' }}>
                      {r.dia_programado ?? '—'}
                    </td>
                    <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{r.asignado_a ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Distribución por área ── */}
      {kpis && kpis.por_area.length > 0 && (
        <section className="dash-section">
          <div className="section-title">Distribución por Área</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {kpis.por_area.map(a => {
              const pct = a.n > 0 ? Math.round((a.completados / a.n) * 100) : 0;
              return (
                <div key={a.area} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 130, fontSize: 12, color: '#c9d1d9', flexShrink: 0 }}>{a.area || '(sin área)'}</span>
                  <div style={{ flex: 1, background: '#21262d', borderRadius: 4, height: 14, position: 'relative' }}>
                    <div style={{ width: `${pct}%`, background: '#3fb950', borderRadius: 4,
                      height: '100%', transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#8b949e', whiteSpace: 'nowrap', width: 80, textAlign: 'right' }}>
                    {a.completados}/{a.n} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
