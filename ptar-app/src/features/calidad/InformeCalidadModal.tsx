import { useState, useEffect, useMemo, useRef } from 'react';
import { getCalidadResumen, getCalidadRemociones, getReporteCalidadHtmlUrl } from '../../services/ptarClient';
import type { CalidadResumenRow, RemocionCalidad } from '../../services/ptarClient';

/* ── Secciones configurables ─────────────────────────────────────────────── */
const SECCIONES = [
  { key: 'portada',      label: 'Portada' },
  { key: 'estadisticas', label: 'Estadísticas de Calidad' },
  { key: 'remocion',     label: 'Remoción Sistema GEM' },
  { key: 'vertimiento',  label: 'Cumplimiento Vertimiento' },
] as const;
export type SeccionKey = (typeof SECCIONES)[number]['key'];

/* ── Parámetros prioritarios para vertimiento ────────────────────────────── */
const PARAMS_VERT = ['DQO', 'SST', 'Color', 'pH', 'Conductividad', 'Temperatura'];

/* ── Utilidades ──────────────────────────────────────────────────────────── */
const fmt = (v: number | null, dec = 1) =>
  v == null ? '—' : Number(v).toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const MESES_ES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

/* ── Componente principal ─────────────────────────────────────────────────── */
interface Props {
  fechaInicio:        string;
  fechaFin:           string;
  onClose:            () => void;
  seccionesIniciales?: Set<SeccionKey>;
}

export default function InformeCalidadModal({ fechaInicio, fechaFin, onClose, seccionesIniciales }: Props) {
  const [activas, setActivas] = useState<Set<SeccionKey>>(
    seccionesIniciales ?? new Set(['portada', 'estadisticas', 'remocion', 'vertimiento'])
  );
  const [resumen,    setResumen]    = useState<CalidadResumenRow[]>([]);
  const [remociones, setRemociones] = useState<RemocionCalidad[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [copied,     setCopied]     = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  /* ── Fetch ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getCalidadResumen({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
      getCalidadRemociones({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
    ])
      .then(([r, rem]) => { setResumen(r); setRemociones(rem); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fechaInicio, fechaFin]);

  /* ── Datos agrupados ───────────────────────────────────────────────────── */
  const paramGroups = useMemo(() => {
    const map = new Map<string, CalidadResumenRow[]>();
    for (const r of resumen) {
      if (!map.has(r.parametro)) map.set(r.parametro, []);
      map.get(r.parametro)!.push(r);
    }
    return map;
  }, [resumen]);

  const vertRows = useMemo(() =>
    resumen.filter(r =>
      r.unidad_codigo === 'VERTIMIENTO' &&
      (r.limite_vertimiento_min != null || r.limite_vertimiento_max != null)
    ).sort((a, b) =>
      (PARAMS_VERT.indexOf(a.parametro) + 1 || 99) - (PARAMS_VERT.indexOf(b.parametro) + 1 || 99)
    ),
  [resumen]);

  /* Remoción — promedios por parámetro */
  const remGrouped = useMemo(() => {
    const map = new Map<string, { pct: number[]; ent: number[]; sal: number[] }>();
    for (const r of remociones) {
      if (!map.has(r.parametro)) map.set(r.parametro, { pct: [], ent: [], sal: [] });
      const g = map.get(r.parametro)!;
      if (r.pct_remocion_gem != null) g.pct.push(r.pct_remocion_gem);
      if (r.pulmon           != null) g.ent.push(r.pulmon);
      if (r.gem_salida       != null) g.sal.push(r.gem_salida);
    }
    const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
    return Array.from(map.entries()).map(([param, g]) => ({
      param, pct: avg(g.pct), ent: avg(g.ent), sal: avg(g.sal),
    })).sort((a, b) => (PARAMS_VERT.indexOf(a.param) + 1 || 99) - (PARAMS_VERT.indexOf(b.param) + 1 || 99));
  }, [remociones]);

  /* ── Período ───────────────────────────────────────────────────────────── */
  const periodoLabel = useMemo(() => {
    if (!fechaInicio || !fechaFin) return '';
    const fi = new Date(fechaInicio + 'T00:00:00');
    const ff = new Date(fechaFin   + 'T00:00:00');
    const mismoMes = fi.getFullYear() === ff.getFullYear() && fi.getMonth() === ff.getMonth();
    if (mismoMes) return `${MESES_ES[fi.getMonth() + 1]} ${fi.getFullYear()}`;
    return `${MESES_ES[fi.getMonth() + 1]} ${fi.getFullYear()} – ${MESES_ES[ff.getMonth() + 1]} ${ff.getFullYear()}`;
  }, [fechaInicio, fechaFin]);

  /* ── Toggle sección ────────────────────────────────────────────────────── */
  const toggle = (key: SeccionKey) =>
    setActivas(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  /* ── PDF via print ──────────────────────────────────────────────────────── */
  const handlePrint = () => window.print();

  /* ── Copiar link ────────────────────────────────────────────────────────── */
  const handleCopyLink = () => {
    const url = new URL('/informe/calidad', window.location.origin);
    url.searchParams.set('fi', fechaInicio);
    url.searchParams.set('ff', fechaFin);
    url.searchParams.set('secciones', Array.from(activas).join(','));
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  /* ── Color cumplimiento ─────────────────────────────────────────────────── */
  const colorCumplimiento = (pct: number | null) => {
    if (pct == null) return '#8b949e';
    if (pct <= 5)   return '#3fb950';
    if (pct <= 20)  return '#d29922';
    return '#f85149';
  };

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Print styles ────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .informe-report, .informe-report * { visibility: visible !important; }
          .informe-report {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          .informe-section { break-inside: avoid; page-break-inside: avoid; }
          .informe-portada { page-break-after: always; }
        }
      `}</style>

      {/* ── Overlay ──────────────────────────────────────────────────────── */}
      <div
        id="informe-print-root"
        className="informe-overlay"
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(1,4,9,0.92)',
          display: 'flex', overflow: 'hidden',
        }}
      >
        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <div
          className="informe-sidebar"
          style={{
            width: 260, minWidth: 260, background: '#0d1117',
            borderRight: '1px solid #21262d',
            display: 'flex', flexDirection: 'column', padding: '20px 16px', gap: 0,
            overflowY: 'auto',
          }}
        >
          {/* Header sidebar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ color: '#e6edf3', fontWeight: 700, fontSize: 13 }}>Informe de Calidad</span>
            <button onClick={onClose} style={btnIconStyle} title="Cerrar">✕</button>
          </div>

          {/* Período */}
          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 16, lineHeight: 1.5 }}>
            <div style={{ color: '#58a6ff', fontWeight: 600, marginBottom: 2 }}>Período</div>
            {fechaInicio} — {fechaFin}
          </div>

          <div style={{ borderTop: '1px solid #21262d', paddingTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#8b949e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Secciones
            </div>
            {SECCIONES.map(s => (
              <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10, color: activas.has(s.key) ? '#e6edf3' : '#484f58', fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={activas.has(s.key)}
                  onChange={() => toggle(s.key)}
                  style={{ accentColor: '#d29922', width: 14, height: 14 }}
                />
                {s.label}
              </label>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Botones de acción */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #21262d', paddingTop: 14 }}>
            <button onClick={handlePrint} style={btnPrimaryStyle}>
              🖨 Generar PDF
            </button>
            <button onClick={handleCopyLink} style={{ ...btnSecondaryStyle, background: copied ? '#1a3a2a' : undefined }}>
              {copied ? '✓ ¡Copiado!' : '🔗 Copiar Link'}
            </button>
          </div>
        </div>

        {/* ── Report area ────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>
          {loading ? (
            <div style={{ color: '#8b949e', alignSelf: 'center', fontSize: 13 }}>Cargando datos...</div>
          ) : (
            <div
              ref={reportRef}
              className="informe-report"
              style={{
                background: '#fff', color: '#111', width: '100%', maxWidth: 820,
                margin: '0 auto',
                borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                fontFamily: 'Arial, sans-serif', fontSize: 11,
                overflow: 'hidden',
              }}
            >
              {/* ── PORTADA ───────────────────────────────────────────────── */}
              {activas.has('portada') && (
                <div className="informe-section informe-portada" style={{ padding: '40px 48px 32px', borderBottom: '3px solid #1a478a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                    <div>
                      <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                        PERMODA LTDA — Planta de Tratamiento de Aguas Residuales
                      </div>
                      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a478a', lineHeight: 1.2 }}>
                        Informe de Calidad del Agua
                      </h1>
                      <div style={{ fontSize: 14, color: '#444', marginTop: 6, fontWeight: 600 }}>{periodoLabel}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ background: '#1a478a', color: '#fff', padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                        PTAR
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <InfoCard label="Período" value={`${fechaInicio} al ${fechaFin}`} />
                    <InfoCard label="Total registros" value={resumen.reduce((s, r) => s + (r.n_mediciones ?? 0), 0).toLocaleString('es-CO')} />
                    <InfoCard label="Parámetros" value={String(paramGroups.size)} />
                    <InfoCard label="Generado" value={new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })} />
                  </div>
                </div>
              )}

              {/* ── ESTADÍSTICAS POR PARÁMETRO ────────────────────────────── */}
              {activas.has('estadisticas') && (
                <div className="informe-section" style={{ padding: '28px 48px' }}>
                  <SectionTitle color="#1a478a">Estadísticas de Calidad por Parámetro</SectionTitle>
                  {paramGroups.size === 0 ? (
                    <p style={{ color: '#888', fontSize: 11 }}>Sin datos para el período seleccionado.</p>
                  ) : (
                    Array.from(paramGroups.entries()).map(([param, rows]) => {
                      const unidad = rows[0]?.parametro_unidad ?? '';
                      return (
                        <div key={param} style={{ marginBottom: 20, breakInside: 'avoid' }}>
                          <div style={{ fontWeight: 700, fontSize: 12, color: '#1a478a', marginBottom: 6, borderBottom: '1px solid #ddd', paddingBottom: 4 }}>
                            {param} <span style={{ color: '#888', fontWeight: 400, fontSize: 10 }}>({unidad})</span>
                          </div>
                          <table style={tableStyle}>
                            <thead>
                              <tr style={{ background: '#e8f0fb' }}>
                                <th style={thStyle}>Unidad de Tratamiento</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>N</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Mín</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Máx</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Promedio</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>CV%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.sort((a, b) => a.orden_tren - b.orden_tren).map((r, i) => (
                                <tr key={r.unidad_codigo} style={{ background: i % 2 === 0 ? '#fff' : '#f7f9fc' }}>
                                  <td style={tdStyle}>{r.unidad}</td>
                                  <td style={{ ...tdStyle, textAlign: 'right' }}>{r.n_mediciones}</td>
                                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(r.minimo)}</td>
                                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(r.maximo)}</td>
                                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(r.promedio)}</td>
                                  <td style={{ ...tdStyle, textAlign: 'right', color: (r.cv_pct ?? 0) > 30 ? '#c0392b' : '#333' }}>
                                    {r.cv_pct != null ? `${fmt(r.cv_pct, 1)}%` : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── REMOCIÓN SISTEMA GEM ──────────────────────────────────── */}
              {activas.has('remocion') && (
                <div className="informe-section" style={{ padding: '28px 48px', borderTop: '1px solid #e8e8e8' }}>
                  <SectionTitle color="#1a6b3c">Remoción Sistema GEM</SectionTitle>
                  {remGrouped.length === 0 ? (
                    <p style={{ color: '#888', fontSize: 11 }}>Sin datos de remoción para el período.</p>
                  ) : (
                    <table style={tableStyle}>
                      <thead>
                        <tr style={{ background: '#e8f5ee' }}>
                          <th style={thStyle}>Parámetro</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Entrada (Pulmón)</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Salida GEM</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>% Remoción</th>
                          <th style={{ ...thStyle, textAlign: 'center' }}>Eficiencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {remGrouped.map((r, i) => {
                          const pct = r.pct ?? 0;
                          const color = pct >= 70 ? '#1a6b3c' : pct >= 40 ? '#8a6b00' : '#8b1c1c';
                          const label = pct >= 70 ? 'Alta' : pct >= 40 ? 'Media' : 'Baja';
                          return (
                            <tr key={r.param} style={{ background: i % 2 === 0 ? '#fff' : '#f7fbf9' }}>
                              <td style={{ ...tdStyle, fontWeight: 600 }}>{r.param}</td>
                              <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(r.ent)}</td>
                              <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(r.sal)}</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color }}>{fmt(r.pct, 1)}%</td>
                              <td style={{ ...tdStyle, textAlign: 'center' }}>
                                <span style={{ background: color, color: '#fff', padding: '1px 8px', borderRadius: 10, fontSize: 9, fontWeight: 700 }}>
                                  {label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* ── CUMPLIMIENTO VERTIMIENTO ──────────────────────────────── */}
              {activas.has('vertimiento') && (
                <div className="informe-section" style={{ padding: '28px 48px', borderTop: '1px solid #e8e8e8' }}>
                  <SectionTitle color="#8a4000">Cumplimiento Normas de Vertimiento</SectionTitle>
                  {vertRows.length === 0 ? (
                    <p style={{ color: '#888', fontSize: 11 }}>Sin datos de vertimiento o sin límites configurados.</p>
                  ) : (
                    <table style={tableStyle}>
                      <thead>
                        <tr style={{ background: '#fdf3e7' }}>
                          <th style={thStyle}>Parámetro</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Límite Mín</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Límite Máx</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Promedio Real</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>% Fuera Límite</th>
                          <th style={{ ...thStyle, textAlign: 'center' }}>Cumplimiento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vertRows.map((r, i) => {
                          const pctFuera = r.pct_fuera_limite_vert ?? 0;
                          const color = colorCumplimiento(r.pct_fuera_limite_vert);
                          const label = pctFuera <= 5 ? 'Cumple' : pctFuera <= 20 ? 'Riesgo' : 'No Cumple';
                          return (
                            <tr key={r.unidad_codigo + r.parametro_codigo} style={{ background: i % 2 === 0 ? '#fff' : '#fdf9f5' }}>
                              <td style={{ ...tdStyle, fontWeight: 600 }}>{r.parametro} <span style={{ color: '#888', fontWeight: 400 }}>({r.parametro_unidad})</span></td>
                              <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(r.limite_vertimiento_min)}</td>
                              <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(r.limite_vertimiento_max)}</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(r.promedio)}</td>
                              <td style={{ ...tdStyle, textAlign: 'right', color }}>{pctFuera > 0 ? `${fmt(r.pct_fuera_limite_vert, 1)}%` : '—'}</td>
                              <td style={{ ...tdStyle, textAlign: 'center' }}>
                                <span style={{ background: color, color: '#fff', padding: '1px 8px', borderRadius: 10, fontSize: 9, fontWeight: 700 }}>
                                  {label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* ── Footer ──────────────────────────────────────────────────── */}
              <div style={{ padding: '12px 48px', borderTop: '2px solid #1a478a', background: '#f0f4fb', display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#888' }}>
                <span>PERMODA LTDA — Sistema PTAR</span>
                <span>Generado: {new Date().toLocaleString('es-CO')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Sub-componentes ──────────────────────────────────────────────────────── */
function SectionTitle({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 4, height: 18, background: color, borderRadius: 2 }} />
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color }}>{children}</h2>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#f0f4fb', borderRadius: 6, padding: '10px 16px', minWidth: 140 }}>
      <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a478a' }}>{value}</div>
    </div>
  );
}

/* ── Estilos inline compartidos ──────────────────────────────────────────── */
const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: 10,
};
const thStyle: React.CSSProperties = {
  padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: 10,
  color: '#333', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '4px 8px', borderBottom: '1px solid #eee', verticalAlign: 'middle',
};
const btnPrimaryStyle: React.CSSProperties = {
  background: '#1a478a', color: '#fff', border: 'none', borderRadius: 6,
  padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%',
};
const btnSecondaryStyle: React.CSSProperties = {
  background: '#21262d', color: '#e6edf3', border: '1px solid #30363d', borderRadius: 6,
  padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%',
};
const btnIconStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer',
  fontSize: 14, padding: 4, lineHeight: 1,
};
