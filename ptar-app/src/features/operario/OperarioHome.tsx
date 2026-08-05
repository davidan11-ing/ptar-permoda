// Pantalla de inicio del operario: accesos a formatos de turno, mantenimiento y revisión técnica RO
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import PlanosPanel from '../encargado/components/PlanosPanel';
import ResumenTurnoModal from './ResumenTurnoModal';
import { useAuth } from '../../state/AuthContext';
import { useTheme } from '../../state/ThemeContext';
import { ROUTES } from '../../lib/routes';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';

/* ── helpers ──────────────────────────────────────────────────────── */
// Calcula el número de semana ISO a partir de una fecha
function isoWeek(d = new Date()): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// URL base de la API según entorno
const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

/* ── tipos ────────────────────────────────────────────────────────── */
// KPIs de mantenimiento preventivo para la semana seleccionada
interface MttoKpis {
  total: number; completados: number; pendientes: number;
  en_proceso: number; por_aprobacion: number; criticos: number;
  ultima_actualizacion: string;
  por_criticidad: { criticidad: string; n: number; completados: number; por_aprobacion: number; pendientes: number }[];
}
// Fila individual de una orden de mantenimiento
interface MttoItem {
  id: number; semana: number; area: string; gft: string;
  objeto: string; af: string; tipo_mantenimiento: string;
  criticidad: string; estado: string; dia_programado: string;
  responsable: string; asignado_a: string;
}

/* ── colores ──────────────────────────────────────────────────────── */
// Paleta de colores por estado de mantenimiento
const C_COMPLETADO   = '#3fb950';
const C_PENDIENTE    = '#f85149';
const C_PROCESO      = '#d29922';
const C_APROBACION   = '#58a6ff';   // azul — "Por Aprobación"
const C_CRITICO      = '#f85149';
// TOOLTIP_STYLE se computa dentro de MttoPanel para acceder al tema

/* ── KPI Card ──────────────────────────────────────────────────────── */
// Tarjeta de indicador numérico con color de acento y etiqueta
function KCard({ label, value, color, sub }: { label: string; value: number | string; color: string; sub?: string }) {
  const { theme } = useTheme();
  return (
    <div style={{
      background: theme.surface, border: `1px solid ${color}44`,
      borderTop: `3px solid ${color}`, borderRadius: 8,
      padding: '12px 16px', textAlign: 'center', flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 10, color: theme.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: theme.dim, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

/* ── Panel de Mantenimiento ─────────────────────────────────────────── */
// Panel que muestra KPIs, donut de cumplimiento y tabla paginada de órdenes GFT
function MttoPanel() {
  const { theme } = useTheme();
  const semanaActual = isoWeek();
  // Semana actualmente visualizada (navegable con flechas)
  const [semana, setSemana]     = useState(semanaActual);
  const [kpis, setKpis]     = useState<MttoKpis | null>(null);
  const [items, setItems]   = useState<MttoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(0);
  const POR_PAGINA = 8;

  // Siempre filtra por PTAR BOG (gft = 'PTAR BOG') — panel exclusivo PTAR
  const AC = '&area_code=PTAR_PT';

  const TOOLTIP_STYLE = {
    contentStyle: { background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 11 },
    labelStyle:   { color: theme.text1 },
  };

  // Al montar: busca la semana más reciente con datos y la selecciona
  useEffect(() => {
    fetch(`${API}/api/mantenimientos/?limit=1${AC}`, { credentials: 'include' })
      .then(r => r.json())
      .then((it: MttoItem[]) => { if (it.length > 0 && it[0].semana) setSemana(it[0].semana); })
      .catch(() => {});
  }, []);

  // Carga KPIs y lista de órdenes al cambiar la semana seleccionada
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

  /* datos para gráficas */
  // Series del donut de cumplimiento, filtradas para omitir valores en cero
  const donutData = kpis ? [
    { name: 'Completado',     value: kpis.completados,    color: C_COMPLETADO  },
    { name: 'Por Aprobación', value: kpis.por_aprobacion, color: C_APROBACION  },
    { name: 'Pendiente',      value: kpis.pendientes,     color: C_PENDIENTE   },
    { name: 'En proceso',     value: kpis.en_proceso,     color: C_PROCESO     },
  ].filter(d => d.value > 0) : [];

  // Porcentaje de cumplimiento de la semana
  const pct = kpis && kpis.total > 0
    ? Math.round((kpis.completados / kpis.total) * 100) : 0;

  /* tabla ordenada — sin límite, paginada en el render */
  // Ordena por criticidad (ALTA → MEDIA → BAJA) y luego por día programado
  const tablaOrdenada = useMemo(() =>
    [...items].sort((a, b) => {
      const crit = { ALTA: 0, MEDIA: 1, BAJA: 2 };
      const ca = crit[a.criticidad?.toUpperCase() as keyof typeof crit] ?? 3;
      const cb = crit[b.criticidad?.toUpperCase() as keyof typeof crit] ?? 3;
      if (ca !== cb) return ca - cb;
      return (a.dia_programado ?? '').localeCompare(b.dia_programado ?? '');
    }),
  [items]);

  const totalPaginas = Math.max(1, Math.ceil(tablaOrdenada.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const tablaVisible = tablaOrdenada.slice(paginaActual * POR_PAGINA, (paginaActual + 1) * POR_PAGINA);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: theme.dim, fontSize: 13 }}>
        <div className="spinner" style={{ margin: '0 auto 10px' }} />
        Cargando datos de mantenimiento…
      </div>
    );
  }

  if (!kpis || kpis.total === 0) {
    return (
      <div style={{ padding: '16px 0', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: '#6e7681' }}>Semana:</span>
          <button onClick={() => setSemana(s => Math.max(1, s - 1))} style={{ background: theme.surface2, border: `1px solid ${theme.border}`, color: theme.muted, borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: theme.text2, minWidth: 24 }}>{semana}</span>
          <button onClick={() => setSemana(s => Math.min(53, s + 1))} style={{ background: theme.surface2, border: `1px solid ${theme.border}`, color: theme.muted, borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>›</button>
          <button onClick={() => setSemana(semanaActual)} style={{ background: theme.surface2, border: `1px solid ${theme.border}`, color: theme.muted, borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 }}>HOY</button>
        </div>
        <div style={{ color: theme.dim, fontSize: 13 }}>
          Sin plan de mantenimiento para la semana {semana}.
          <div style={{ fontSize: 11, color: theme.border, marginTop: 4 }}>Usa ‹ › para navegar a otra semana.</div>
        </div>
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
            style={{ background: theme.surface2, border: `1px solid ${theme.border}`, color: theme.muted, borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: theme.text2, minWidth: 24, textAlign: 'center' }}>{semana}</span>
          <button onClick={() => setSemana(s => Math.min(53, s + 1))}
            style={{ background: theme.surface2, border: `1px solid ${theme.border}`, color: theme.muted, borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>›</button>
          <button onClick={() => setSemana(semanaActual)}
            style={{ background: theme.surface2, border: `1px solid ${theme.border}`, color: theme.muted, borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10 }}>HOY</button>
        </div>
      </div>

      {/* KPI Cards — etiqueta explícita de la semana activa */}
      <div style={{ marginBottom: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#58a6ff',
          letterSpacing: '.1em', textTransform: 'uppercase',
          background: '#58a6ff18', border: '1px solid #58a6ff44',
          borderRadius: 4, padding: '2px 8px',
        }}>
          SEMANA {semana}
        </span>
        {semana !== semanaActual && (
          <span style={{ fontSize: 10, color: '#6e7681', marginLeft: 8 }}>
            (semana actual: {semanaActual})
          </span>
        )}
      </div>
      {/* Tarjetas de KPI: total, completados, por aprobación, pendientes y críticos */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <KCard label="Total semana"    value={kpis.total}            color="#8b949e" />
        <KCard label="Completados"     value={kpis.completados}      color={C_COMPLETADO} sub={`${pct}% cumpl.`} />
        <KCard label="Por Aprobación"  value={kpis.por_aprobacion}   color={C_APROBACION} />
        <KCard label="Pendientes"      value={kpis.pendientes}        color={C_PENDIENTE} />
        <KCard label="Críticos"        value={kpis.criticos}          color={C_CRITICO} />
      </div>

      {/* Donut + Tabla paginada */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 12, marginBottom: 16, alignItems: 'start' }}>

        {/* Donut — cumplimiento */}
        <div style={{ background: theme.surface, border: `1px solid ${theme.border2}`, borderRadius: 8, padding: '14px 8px' }}>
          <div style={{ fontSize: 11, color: theme.muted, marginBottom: 4, paddingLeft: 8 }}>% CUMPLIMIENTO</div>
          <div style={{ position: 'relative', height: 140 }}>
            {donutData.length > 0 && (
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={42} outerRadius={62}
                    dataKey="value" paddingAngle={2}>
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number, n: string) => [`${v}`, n]} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              textAlign: 'center', pointerEvents: 'none',
            }}>
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

        {/* Tabla paginada de órdenes de mantenimiento */}
        <div style={{ background: theme.surface, border: `1px solid ${theme.border2}`, borderRadius: 8, overflow: 'hidden' }}>
          {/* Header + slicer */}
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, letterSpacing: '.06em', textTransform: 'uppercase' }}>
              Detalle semana {semana}
              <span style={{ marginLeft: 8, fontSize: 10, color: '#484f58', fontWeight: 400 }}>
                ({tablaOrdenada.length} registros)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <button
                onClick={() => setPagina(p => Math.max(0, p - 1))}
                disabled={paginaActual === 0}
                style={{ background: theme.surface2, border: `1px solid ${theme.border}`, color: paginaActual === 0 ? theme.dim : theme.muted, borderRadius: 4, padding: '2px 8px', cursor: paginaActual === 0 ? 'default' : 'pointer', fontSize: 13, lineHeight: 1 }}>
                &#8249;
              </button>
              <span style={{ fontSize: 10, color: '#6e7681', minWidth: 56, textAlign: 'center' }}>
                {paginaActual + 1} / {totalPaginas}
              </span>
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))}
                disabled={paginaActual >= totalPaginas - 1}
                style={{ background: theme.surface2, border: `1px solid ${theme.border}`, color: paginaActual >= totalPaginas - 1 ? theme.dim : theme.muted, borderRadius: 4, padding: '2px 8px', cursor: paginaActual >= totalPaginas - 1 ? 'default' : 'pointer', fontSize: 13, lineHeight: 1 }}>
                &#8250;
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: theme.bg }}>
                  {['Objeto','Tipo','Criticidad','Estado','Responsable'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#6e7681', letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tablaVisible.map((item, i) => {
                  // Color de la pastilla de estado según texto del campo
                  const estadoColor = item.estado?.toUpperCase().includes('COMPLET') ? C_COMPLETADO
                    : item.estado?.toUpperCase().includes('APROBAC') ? C_APROBACION
                    : item.estado?.toUpperCase().includes('PROCESO') ? C_PROCESO
                    : C_PENDIENTE;
                  // Color del texto de criticidad: rojo/amarillo/gris
                  const critColor = item.criticidad?.toUpperCase() === 'ALTA' ? C_CRITICO
                    : item.criticidad?.toUpperCase() === 'MEDIA' ? C_PROCESO : theme.muted;
                  return (
                    <tr key={item.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)', borderBottom: `1px solid ${theme.border2}` }}>
                      <td style={{ padding: '6px 10px', color: theme.text2, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.objeto}>{item.objeto || '—'}</td>
                      <td style={{ padding: '6px 10px', color: theme.muted, whiteSpace: 'nowrap' }}>{item.tipo_mantenimiento || '—'}</td>
                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: critColor, fontWeight: 600, fontSize: 10 }}>{item.criticidad || '—'}</span>
                      </td>
                      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: estadoColor, fontWeight: 600, fontSize: 10,
                          background: estadoColor + '18', borderRadius: 4, padding: '2px 6px' }}>
                          {item.estado || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px', color: theme.muted, whiteSpace: 'nowrap' }}>{item.asignado_a || item.responsable || '—'}</td>
                    </tr>
                  );
                })}
                {tablaVisible.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 16, textAlign: 'center', color: theme.dim }}>Sin registros</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Formatos ─────────────────────────────────────────────────────── */
// Definición de los formatos de turno disponibles: ruta, título, ícono y campos clave
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
    fields: ['Presiones y caudales RO', 'Nivel TMP reactores MBR', 'Indicadores calculados E1/E2', 'Filtros y purgas PTAP'],
    color: '#8b949e', num: 'F-05',
  },
];

/* ── Componente principal ─────────────────────────────────────────── */
// Vista principal del operario: bienvenida, grid de formatos y panel de mantenimiento
export default function OperarioHome() {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();

  // Banner post-envío de formulario
  const [submittedForm, setSubmittedForm] = useState<string | null>(null);
  // Modal de cierre de turno
  const [showResumen, setShowResumen] = useState(false);

  // Al volver de un formulario con state.submitted, mostrar banner 6s
  useEffect(() => {
    const loc = location as { state?: { submitted?: string } };
    if (loc.state?.submitted) {
      setSubmittedForm(loc.state.submitted);
      window.history.replaceState({}, '');
      const t = setTimeout(() => setSubmittedForm(null), 6000);
      return () => clearTimeout(t);
    }
  }, [location]);

  return (
    <div className="operario-home">
      {/* Banner post-envío */}
      {submittedForm && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 8000, background: theme.surface2,
          border: `1px solid ${theme.amber ?? '#d29922'}`,
          borderLeft: `4px solid ${theme.amber ?? '#d29922'}`,
          borderRadius: 8, padding: '10px 18px',
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: theme.shadowMd, maxWidth: 460,
          animation: 'fadeInUp .25s ease',
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.text1 }}>
              {submittedForm} guardado correctamente
            </div>
            <div style={{ fontSize: 11, color: theme.muted }}>
              No olvide cerrar registro, para que sus datos queden guardados
            </div>
          </div>
          <button onClick={() => setSubmittedForm(null)}
            style={{ background: 'none', border: 'none', color: theme.dim, fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}>
            ✕
          </button>
        </div>
      )}

      {/* Modal de resumen de turno */}
      {showResumen && <ResumenTurnoModal onClose={() => setShowResumen(false)} />}

      <div style={{ position: 'relative' }}>
        <div className="op-welcome">
          <h1 className="op-title">Hola, <span>{currentUser?.nombre}</span></h1>
          <p className="op-subtitle">Registro · Planta en Tiempo Real</p>
          <div className="op-date">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' — '}
            {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <button
          onClick={() => setShowResumen(true)}
          style={{
            position: 'absolute', top: 0, right: 0,
            background: '#1f6feb22', border: `1px solid #1f6feb88`,
            borderRadius: 7, color: '#58a6ff',
            padding: '8px 16px', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
          Cerrar Turno
        </button>
      </div>

      {/* Separador */}
      <div style={{ borderTop: `1px solid ${theme.border2}`, marginBottom: 22, paddingTop: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, letterSpacing: '.06em', textTransform: 'uppercase' }}>
          FORMULARIOS DE TURNO
        </div>
      </div>

      {/* Grid de formatos de turno disponibles */}
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

      {/* Panel de Mantenimiento Preventivo */}
      <div style={{ borderTop: `1px solid ${theme.border2}`, marginTop: 28, paddingTop: 22 }}>
        <MttoPanel />
      </div>

      {/* Revisión Técnica — Ósmosis Inversa */}
      <div style={{ borderTop: `1px solid ${theme.border2}`, marginTop: 28, paddingTop: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 18 }}>
          REVISIÓN TÉCNICA — ÓSMOSIS INVERSA
        </div>
        <PlanosPanel />
      </div>
    </div>
  );
}
