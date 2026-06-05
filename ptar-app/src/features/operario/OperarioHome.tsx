import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../state/AuthContext';
import { ROUTES } from '../../lib/routes';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

/* ── helpers ──────────────────────────────────────────────────────── */
function isoWeek(d = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

/* ── tipos ────────────────────────────────────────────────────────── */
interface MttoKpis {
  total: number; completados: number; pendientes: number;
  en_proceso: number; criticos: number; ultima_actualizacion: string;
  por_area: { area: string; n: number; completados: number }[];
}
interface MttoItem {
  id: number; semana: number; area: string; gft: string;
  objeto: string; af: string; tipo_mantenimiento: string;
  criticidad: string; estado: string; dia_programado: string;
  responsable: string; asignado_a: string;
}

/* ── colores ──────────────────────────────────────────────────────── */
const C_COMPLETADO = '#3fb950';
const C_PENDIENTE  = '#f85149';
const C_PROCESO    = '#d29922';
const C_CRITICO    = '#f85149';
const TOOLTIP_STYLE = {
  contentStyle: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 },
  labelStyle:   { color: '#e6edf3' },
};

/* ── KPI Card ──────────────────────────────────────────────────────── */
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

/* ── Panel de Mantenimiento ─────────────────────────────────────────── */
function MttoPanel() {
  const semanaActual = isoWeek();
  const [semana, setSemana]     = useState(semanaActual);
  const [kpis, setKpis]         = useState<MttoKpis | null>(null);
  const [items, setItems]        = useState<MttoItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filtroArea, setFiltroArea] = useState('');

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('ptar_token') || '';
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/api/mantenimientos/kpis?semana=${semana}`, { headers }).then(r => r.json()),
      fetch(`${API}/api/mantenimientos/?semana=${semana}&limit=200`, { headers }).then(r => r.json()),
    ]).then(([k, it]) => {
      setKpis(k); setItems(it);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [semana]);

  /* datos para gráficas */
  const donutData = kpis ? [
    { name: 'Completado', value: kpis.completados, color: C_COMPLETADO },
    { name: 'Pendiente',  value: kpis.pendientes,  color: C_PENDIENTE  },
    { name: 'En proceso', value: kpis.en_proceso,  color: C_PROCESO    },
  ].filter(d => d.value > 0) : [];

  const pct = kpis && kpis.total > 0
    ? Math.round((kpis.completados / kpis.total) * 100) : 0;

  const barData = (kpis?.por_area ?? []).map(a => ({
    area:       a.area?.length > 12 ? a.area.slice(0, 12) + '…' : (a.area || '?'),
    Completado: a.completados,
    Pendiente:  a.n - a.completados,
  }));

  /* tabla filtrada */
  const areas = useMemo(() => [...new Set(items.map(i => i.area).filter(Boolean))].sort(), [items]);
  const tableFiltrada = useMemo(() =>
    items.filter(i => !filtroArea || i.area === filtroArea)
         .sort((a, b) => {
           const crit = { ALTA: 0, MEDIA: 1, BAJA: 2 };
           const ca = crit[a.criticidad?.toUpperCase() as keyof typeof crit] ?? 3;
           const cb = crit[b.criticidad?.toUpperCase() as keyof typeof crit] ?? 3;
           if (ca !== cb) return ca - cb;
           return (a.dia_programado ?? '').localeCompare(b.dia_programado ?? '');
         })
         .slice(0, 20),
  [items, filtroArea]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#484f58', fontSize: 13 }}>
        <div className="spinner" style={{ margin: '0 auto 10px' }} />
        Cargando datos de mantenimiento…
      </div>
    );
  }

  if (!kpis || kpis.total === 0) {
    return (
      <div style={{ padding: '16px 0', color: '#484f58', fontSize: 13, textAlign: 'center' }}>
        Sin datos de mantenimiento para la semana {semana}.{' '}
        {kpis?.ultima_actualizacion
          ? `Última sync: ${kpis.ultima_actualizacion}`
          : 'Configura SP_EMAIL y SP_PASSWORD en el backend para sincronizar desde SharePoint.'}
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Header sección */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#c9d1d9', letterSpacing: '.02em' }}>
            MANTENIMIENTO PREVENTIVO GFT
          </div>
          {kpis.ultima_actualizacion && (
            <div style={{ fontSize: 10, color: '#484f58' }}>
              Última sync SharePoint: {kpis.ultima_actualizacion}
            </div>
          )}
        </div>
        {/* Selector semana */}
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

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <KCard label="Total" value={kpis.total} color="#58a6ff" />
        <KCard label="Completados" value={kpis.completados} color={C_COMPLETADO} sub={`${pct}% cumpl.`} />
        <KCard label="Pendientes"  value={kpis.pendientes}  color={C_PENDIENTE} />
        <KCard label="En proceso"  value={kpis.en_proceso}  color={C_PROCESO} />
        <KCard label="Críticos"    value={kpis.criticos}    color={C_CRITICO} />
      </div>

      {/* Donut + Barras */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 16 }}>

        {/* Donut — cumplimiento */}
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: '14px 8px' }}>
          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4, paddingLeft: 8 }}>% CUMPLIMIENTO</div>
          <div style={{ position: 'relative', height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={42} outerRadius={62}
                  dataKey="value" paddingAngle={2}>
                  {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number, n: string) => [`${v}`, n]} />
              </PieChart>
            </ResponsiveContainer>
            {/* Porcentaje en el centro */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              textAlign: 'center', pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: C_COMPLETADO }}>{pct}%</div>
              <div style={{ fontSize: 9, color: '#6e7681' }}>completado</div>
            </div>
          </div>
          {/* leyenda */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 12, marginTop: 4 }}>
            {donutData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#8b949e' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                {d.name}: <strong style={{ color: d.color }}>{d.value}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Barras — por área */}
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: '14px 8px 8px' }}>
          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4, paddingLeft: 8 }}>ESTADO POR ÁREA</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="area" tick={{ fill: '#6e7681', fontSize: 9 }} />
              <YAxis tick={{ fill: '#6e7681', fontSize: 9 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#8b949e' }} />
              <Bar dataKey="Completado" stackId="a" fill={C_COMPLETADO} radius={[0,0,0,0]} />
              <Bar dataKey="Pendiente"  stackId="a" fill={C_PENDIENTE}  radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla de mantenimientos */}
      <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 8px', borderBottom: '1px solid #21262d' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8b949e', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            Detalle semana {semana}
          </div>
          <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)}
            style={{ background: '#0d1117', border: '1px solid #30363d', color: '#8b949e', borderRadius: 4, fontSize: 10, padding: '2px 6px' }}>
            <option value="">Todas las áreas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#0d1117' }}>
                {['Área','Objeto','Tipo','Criticidad','Estado','Día programado','Responsable'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#6e7681', letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableFiltrada.map((item, i) => {
                const estadoColor = item.estado?.toUpperCase().includes('COMPLET') ? C_COMPLETADO
                  : item.estado?.toUpperCase().includes('PROCESO')  ? C_PROCESO
                  : C_PENDIENTE;
                const critColor = item.criticidad?.toUpperCase() === 'ALTA' ? C_CRITICO
                  : item.criticidad?.toUpperCase() === 'MEDIA' ? C_PROCESO : '#8b949e';
                return (
                  <tr key={item.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)', borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '6px 10px', color: '#c9d1d9', whiteSpace: 'nowrap' }}>{item.area || '—'}</td>
                    <td style={{ padding: '6px 10px', color: '#c9d1d9', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.objeto}>{item.objeto || '—'}</td>
                    <td style={{ padding: '6px 10px', color: '#8b949e', whiteSpace: 'nowrap' }}>{item.tipo_mantenimiento || '—'}</td>
                    <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: critColor, fontWeight: 600, fontSize: 10 }}>{item.criticidad || '—'}</span>
                    </td>
                    <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: estadoColor, fontWeight: 600, fontSize: 10,
                        background: estadoColor + '18', borderRadius: 4, padding: '2px 6px' }}>
                        {item.estado || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', color: '#8b949e', fontFamily: 'monospace', fontSize: 10, whiteSpace: 'nowrap' }}>{item.dia_programado || '—'}</td>
                    <td style={{ padding: '6px 10px', color: '#8b949e', whiteSpace: 'nowrap' }}>{item.asignado_a || item.responsable || '—'}</td>
                  </tr>
                );
              })}
              {tableFiltrada.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 16, textAlign: 'center', color: '#484f58' }}>Sin registros</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Formatos ─────────────────────────────────────────────────────── */
const FORMATOS = [
  {
    to: ROUTES.FORMATO_CAUDALES,
    title: 'Registro de Contadores',
    subtitle: 'Lecturas acumuladas de agua (m³) para balance hidrico.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="19" stroke="#00c5e3" strokeWidth="1.5"/>
        <rect x="12" y="14" width="16" height="12" rx="2" stroke="#00c5e3" strokeWidth="1.5"/>
        <path d="M16 14v-3M24 14v-3" stroke="#00c5e3" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M15 20h4M15 23h6" stroke="#00c5e3" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="26" cy="22" r="2" fill="#00c5e3"/>
      </svg>
    ),
    fields: ['20 contadores fijos en orden', 'Lectura actual (m³)', 'Delta calculado automático', 'Validación de decremento'],
    color: '#00c5e3', num: 'F-01',
  },
  {
    to: ROUTES.FORMATO_REACTIVOS,
    title: 'Consumo Químico',
    subtitle: 'Registro de reactivos GEM, Osmosis (RO) y PTAP.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="19" stroke="#3fb950" strokeWidth="1.5"/>
        <rect x="15" y="8" width="10" height="4" rx="2" stroke="#3fb950" strokeWidth="1.5"/>
        <path d="M15 12l-4 18h18l-4-18" stroke="#3fb950" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M12 24h16" stroke="#3fb950" strokeWidth="1.5"/>
        <path d="M17 27v3M23 27v3" stroke="#3fb950" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
    fields: ['GEM · RO · PTAP en un formulario', 'Horómetro y volumen tratado', 'Nivel inicial → final (L calc)', 'Alerta automática de ingreso'],
    color: '#3fb950', num: 'F-02',
  },
  {
    to: ROUTES.FORMATO_CALIDAD,
    title: 'Calidad de Agua',
    subtitle: 'Parámetros físico-químicos por unidad de tratamiento.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="19" stroke="#d29922" strokeWidth="1.5"/>
        <path d="M20 10c0 0-8 7-8 13a8 8 0 0016 0c0-6-8-13-8-13z" stroke="#d29922" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M16 24a4 4 0 004-4" stroke="#d29922" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    fields: ['pH, TDS, Conductividad…', 'Valor turno anterior', 'Validaciones especiales', 'Obs. generales al inicio'],
    color: '#d29922', num: 'F-03',
  },
  {
    to: ROUTES.FORMATO_INCIDENCIAS,
    title: 'Registro de Incidencias',
    subtitle: 'Eventos y novedades fuera de lo normal en el turno.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="19" stroke="#f0883e" strokeWidth="1.5"/>
        <path d="M20 13v9" stroke="#f0883e" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="20" cy="27" r="1.5" fill="#f0883e"/>
        <path d="M12 8l-3 4h22l-3-4" stroke="#f0883e" strokeWidth="1.2" strokeLinejoin="round"/>
      </svg>
    ),
    fields: ['Incidencias operativas', 'Equipos fuera de servicio', 'Observaciones del turno', 'Registro de novedades'],
    color: '#f0883e', num: 'F-04',
  },
  {
    to: ROUTES.FORMATO_CONDICIONES_OP,
    title: 'Condiciones de Operación',
    subtitle: 'Parámetros operativos de los sistemas RO y MBR.',
    icon: (
      <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="19" stroke="#8b949e" strokeWidth="1.5"/>
        <circle cx="20" cy="20" r="5" stroke="#8b949e" strokeWidth="1.5"/>
        <path d="M20 9v4M20 27v4M9 20h4M27 20h4" stroke="#8b949e" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    fields: ['Condiciones sistema RO', 'Condiciones sistema MBR', 'Próximamente disponible', ''],
    color: '#8b949e', num: 'F-05',
  },
];

/* ── Componente principal ─────────────────────────────────────────── */
export default function OperarioHome() {
  const { currentUser } = useAuth();

  return (
    <div className="operario-home">
      <div className="op-welcome">
        <h1 className="op-title">Hola, <span>{currentUser?.nombre}</span></h1>
        <p className="op-subtitle">Registro · Planta en Tiempo Real</p>
        <div className="op-date">
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {' — '}
          {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Panel de Mantenimiento Preventivo */}
      <MttoPanel />

      {/* Separador */}
      <div style={{ borderTop: '1px solid #21262d', marginBottom: 22, paddingTop: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#8b949e', letterSpacing: '.06em', textTransform: 'uppercase' }}>
          FORMULARIOS DE TURNO
        </div>
      </div>

      {/* Grid de formatos */}
      <div className="formato-grid">
        {FORMATOS.map(f => (
          <Link key={f.to} to={f.to} className="formato-grid-card"
            style={{ '--card-color': f.color } as React.CSSProperties}>
            <div className="fgc-top">
              <div className="fgc-icon">{f.icon}</div>
              <span className="fgc-num" style={{ background: f.color }}>{f.num}</span>
            </div>
            <h2 className="fgc-title">{f.title}</h2>
            <p className="fgc-subtitle">{f.subtitle}</p>
            <ul className="fgc-fields">
              {f.fields.map(field => <li key={field}>{field}</li>)}
            </ul>
            <div className="fgc-footer">
              <span className="fgc-action">Diligenciar</span>
              <span className="fgc-arrow">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
