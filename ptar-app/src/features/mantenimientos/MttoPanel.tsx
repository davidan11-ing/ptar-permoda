// Panel de mantenimientos: KPIs, donut de cumplimiento y tabla paginada por semana ISO
import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// Calcula el número de semana ISO de una fecha dada
function isoWeek(d = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// URL base del API
const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

interface MttoKpis {
  total: number; completados: number; pendientes: number;
  en_proceso: number; por_aprobacion: number; criticos: number;
  ultima_actualizacion: string;
  por_criticidad: { criticidad: string; n: number; completados: number; por_aprobacion: number; pendientes: number }[];
}
interface MttoItem {
  id: number; semana: number; area: string; gft: string;
  objeto: string; af: string; tipo_mantenimiento: string;
  criticidad: string; estado: string; dia_programado: string;
  responsable: string; asignado_a: string;
}

// Paleta de colores por estado y criticidad
const C_COMPLETADO = '#3fb950';
const C_PENDIENTE  = '#f85149';
const C_PROCESO    = '#d29922';
const C_APROBACION = '#58a6ff';
const C_CRITICO    = '#f85149';
// Estilo compartido para tooltips de Recharts
const TOOLTIP_STYLE = {
  contentStyle: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 },
  labelStyle:   { color: '#e6edf3' },
};

// Tarjeta de KPI individual con borde de color y valor destacado
function KCard({ label, value, color, sub }: { label: string; value: number | string; color: string; sub?: string }) {
  return (
    <div style={{
      background: '#161b22', border: `1px solid ${color}44`,
      borderTop: `3px solid ${color}`, borderRadius: 8,
      padding: '12px 16px', textAlign: 'center', flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: '#484f58', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// Panel principal de mantenimientos con navegación por semana, KPIs, donut y tabla
export default function MttoPanel() {
  // Semana ISO actual como referencia
  const semanaActual = isoWeek();
  const [semana, setSemana]   = useState(semanaActual);

  // Al montar: busca la semana más reciente con datos y la selecciona
  useEffect(() => {
    fetch(`${API}/api/mantenimientos/?limit=1${AC}`, { credentials: 'include' })
      .then(r => r.json())
      .then((items: MttoItem[]) => {
        if (items.length > 0 && items[0].semana) setSemana(items[0].semana);
      })
      .catch(() => {});
  }, []);
  // KPIs y listado de ítems de la semana seleccionada
  const [kpis, setKpis]       = useState<MttoKpis | null>(null);
  const [items, setItems]     = useState<MttoItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Control de paginación de la tabla
  const [pagina, setPagina]   = useState(0);
  const POR_PAGINA = 8;
  // Filtro fijo de área para este panel
  const AC = '&area_code=PTAR_PT';

  // Carga paralela de KPIs e ítems al cambiar la semana
  useEffect(() => {
    setLoading(true);
    const opts = { credentials: 'include' as const };
    Promise.all([
      fetch(`${API}/api/mantenimientos/kpis?semana=${semana}${AC}`, opts).then(r => r.json()),
      fetch(`${API}/api/mantenimientos/?semana=${semana}&limit=200${AC}`, opts).then(r => r.json()),
    ]).then(([k, it]) => {
      setKpis(k); setItems(it); setPagina(0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [semana]);

  // Datos del donut agrupados por estado (excluye valores cero)
  const donutData = kpis ? [
    { name: 'Completado',     value: kpis.completados,    color: C_COMPLETADO  },
    { name: 'Por Aprobación', value: kpis.por_aprobacion, color: C_APROBACION  },
    { name: 'Pendiente',      value: kpis.pendientes,     color: C_PENDIENTE   },
    { name: 'En proceso',     value: kpis.en_proceso,     color: C_PROCESO     },
  ].filter(d => d.value > 0) : [];

  // Porcentaje de cumplimiento de la semana
  const pct = kpis && kpis.total > 0 ? Math.round((kpis.completados / kpis.total) * 100) : 0;

  // Tabla ordenada por criticidad (ALTA > MEDIA > BAJA) y luego por día programado
  const tablaOrdenada = useMemo(() =>
    [...items].sort((a, b) => {
      const crit = { ALTA: 0, MEDIA: 1, BAJA: 2 };
      const ca = crit[a.criticidad?.toUpperCase() as keyof typeof crit] ?? 3;
      const cb = crit[b.criticidad?.toUpperCase() as keyof typeof crit] ?? 3;
      if (ca !== cb) return ca - cb;
      return (a.dia_programado ?? '').localeCompare(b.dia_programado ?? '');
    }),
  [items]);

  // Slice de registros visibles según la página activa
  const totalPaginas  = Math.max(1, Math.ceil(tablaOrdenada.length / POR_PAGINA));
  const paginaActual  = Math.min(pagina, totalPaginas - 1);
  const tablaVisible  = tablaOrdenada.slice(paginaActual * POR_PAGINA, (paginaActual + 1) * POR_PAGINA);

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Encabezado con título, fecha de sync y navegador de semana — siempre visible */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#c9d1d9', letterSpacing: '.02em' }}>
            MANTENIMIENTO PREVENTIVO GFT
          </div>
          {kpis?.ultima_actualizacion && (
            <div style={{ fontSize: 10, color: '#484f58' }}>
              Última sync SharePoint: {kpis.ultima_actualizacion}
            </div>
          )}
        </div>
        {/* Controles de navegación de semana ISO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#6e7681' }}>Semana:</span>
          <button onClick={() => setSemana(s => Math.max(1, s - 1))}
            style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#c9d1d9', minWidth: 24, textAlign: 'center' }}>{semana}</span>
          <button onClick={() => setSemana(s => Math.min(53, s + 1))}
            style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>›</button>
          <button onClick={() => setSemana(semanaActual)}
            style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 }}>HOY</button>
        </div>
      </div>

      {/* Badge indicador de semana activa */}
      <div style={{ marginBottom: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#58a6ff', letterSpacing: '.1em', textTransform: 'uppercase',
          background: '#58a6ff18', border: '1px solid #58a6ff44', borderRadius: 4, padding: '2px 8px',
        }}>
          SEMANA {semana}
        </span>
        {semana !== semanaActual && (
          <span style={{ fontSize: 10, color: '#6e7681', marginLeft: 8 }}>(semana actual: {semanaActual})</span>
        )}
      </div>

      {/* Estado de carga o sin datos — muestra mensaje pero mantiene la navegación */}
      {loading && (
        <div style={{ padding: 24, textAlign: 'center', color: '#484f58', fontSize: 13 }}>
          <div className="spinner" style={{ margin: '0 auto 10px' }} />
          Cargando datos de mantenimiento…
        </div>
      )}
      {!loading && (!kpis || kpis.total === 0) && (
        <div style={{ padding: '32px 0', color: '#484f58', fontSize: 13, textAlign: 'center' }}>
          Sin datos de mantenimiento para la semana {semana}.{' '}
          {kpis?.ultima_actualizacion
            ? `Última sync: ${kpis.ultima_actualizacion}`
            : 'Sin plan de mantenimiento registrado en SharePoint para esta semana.'}
          <div style={{ marginTop: 10, fontSize: 12, color: '#30363d' }}>
            Usa ‹ para navegar a una semana anterior con datos.
          </div>
        </div>
      )}

      {/* Contenido principal — solo se muestra cuando hay datos */}
      {!loading && kpis && kpis.total > 0 && <>

      {/* Fila de tarjetas KPI */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <KCard label="Total semana"   value={kpis.total}          color="#8b949e" />
        <KCard label="Completados"    value={kpis.completados}    color={C_COMPLETADO} sub={`${pct}% cumpl.`} />
        <KCard label="Por Aprobación" value={kpis.por_aprobacion} color={C_APROBACION} />
        <KCard label="Pendientes"     value={kpis.pendientes}     color={C_PENDIENTE} />
        <KCard label="Críticos"       value={kpis.criticos}       color={C_CRITICO} />
      </div>

      {/* Layout de dos columnas: donut a la izquierda, tabla paginada a la derecha */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 12, marginBottom: 16, alignItems: 'start' }}>
        {/* Donut de cumplimiento con leyenda de estados */}
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: '14px 8px' }}>
          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4, paddingLeft: 8 }}>% CUMPLIMIENTO</div>
          <div style={{ position: 'relative', height: 140 }}>
            {donutData.length > 0 && (
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} dataKey="value" paddingAngle={2}>
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number, n: string) => [`${v}`, n]} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {/* Porcentaje central superpuesto sobre el donut */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C_COMPLETADO }}>{pct}%</div>
              <div style={{ fontSize: 9, color: '#6e7681' }}>completado</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 12, marginTop: 4 }}>
            {donutData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#8b949e' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                {d.name}: <strong style={{ color: d.color }}>{d.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Tabla paginada de ítems con color por criticidad y estado */}
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#8b949e', letterSpacing: '.06em', textTransform: 'uppercase' }}>
              Detalle semana {semana}
              <span style={{ marginLeft: 8, fontSize: 10, color: '#484f58', fontWeight: 400 }}>({tablaOrdenada.length} registros)</span>
            </div>
            {/* Controles de paginación de la tabla */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <button onClick={() => setPagina(p => Math.max(0, p - 1))} disabled={paginaActual === 0}
                style={{ background: '#21262d', border: '1px solid #30363d', color: paginaActual === 0 ? '#484f58' : '#8b949e', borderRadius: 4, padding: '2px 8px', cursor: paginaActual === 0 ? 'default' : 'pointer', fontSize: 13, lineHeight: 1 }}>&#8249;</button>
              <span style={{ fontSize: 10, color: '#6e7681', minWidth: 56, textAlign: 'center' }}>{paginaActual + 1} / {totalPaginas}</span>
              <button onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))} disabled={paginaActual >= totalPaginas - 1}
                style={{ background: '#21262d', border: '1px solid #30363d', color: paginaActual >= totalPaginas - 1 ? '#484f58' : '#8b949e', borderRadius: 4, padding: '2px 8px', cursor: paginaActual >= totalPaginas - 1 ? 'default' : 'pointer', fontSize: 13, lineHeight: 1 }}>&#8250;</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: '#0d1117' }}>
                  {['Objeto','Tipo','Criticidad','Estado','Responsable'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#6e7681', letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tablaVisible.map((item, i) => {
                  // Color del estado según texto normalizado
                  const estadoColor = item.estado?.toUpperCase().includes('COMPLET') ? C_COMPLETADO
                    : item.estado?.toUpperCase().includes('APROBAC') ? C_APROBACION
                    : item.estado?.toUpperCase().includes('PROCESO') ? C_PROCESO : C_PENDIENTE;
                  // Color de criticidad: rojo=ALTA, amarillo=MEDIA, gris=BAJA
                  const critColor = item.criticidad?.toUpperCase() === 'ALTA' ? C_CRITICO
                    : item.criticidad?.toUpperCase() === 'MEDIA' ? C_PROCESO : '#8b949e';
                  return (
                    <tr key={item.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)', borderBottom: '1px solid #21262d' }}>
                      <td style={{ padding: '6px 10px', color: '#c9d1d9', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.objeto}>{item.objeto || '—'}</td>
                      <td style={{ padding: '6px 10px', color: '#8b949e', whiteSpace: 'nowrap' }}>{item.tipo_mantenimiento || '—'}</td>
                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: critColor, fontWeight: 600, fontSize: 10 }}>{item.criticidad || '—'}</span>
                      </td>
                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: estadoColor, fontWeight: 600, fontSize: 10, background: estadoColor + '18', borderRadius: 4, padding: '2px 6px' }}>
                          {item.estado || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px', color: '#8b949e', whiteSpace: 'nowrap' }}>{item.asignado_a || item.responsable || '—'}</td>
                    </tr>
                  );
                })}
                {tablaVisible.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#484f58' }}>Sin registros</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      </>}
    </div>
  );
}
