// Modal de informe de balance hídrico con sidebar de secciones y vista previa imprimible
import { useState, useEffect, useMemo } from 'react';
import { getResumenBalance, getBalanceHidrico } from '../../services/ptarClient';
import type { ResumenBalanceRow, BalanceHidricoRow } from '../../services/ptarClient';

// Secciones del informe con sus claves y etiquetas
const SECCIONES = [
  { key: 'portada',      label: 'Portada' },
  { key: 'balance',      label: 'Balance General' },
  { key: 'eficiencia',   label: 'Eficiencia del Sistema' },
  { key: 'indicadores',  label: 'Indicadores de Producción' },
] as const;
type SeccionKey = (typeof SECCIONES)[number]['key'];
export type { SeccionKey as BalanceSeccionKey };

// Nombres cortos de meses para el label del período
const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// Formateador de números con decimales configurables
const fmt = (v: number | null, dec = 1) =>
  v == null ? '—' : Number(v).toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });

// Color corporativo principal del informe
const COLOR = '#1a6b3c';

interface Props { fechaInicio: string; fechaFin: string; onClose: () => void; }

// Modal overlay del informe de balance hídrico
export default function InformeBalanceModal({ fechaInicio, fechaFin, onClose }: Props) {
  // Secciones visibles en el informe (todas activas por defecto)
  const [activas, setActivas] = useState<Set<SeccionKey>>(
    new Set(['portada', 'balance', 'eficiencia', 'indicadores'])
  );
  // Estado de datos: resumen por medidor y filas detalladas
  const [resumen, setResumen] = useState<ResumenBalanceRow[]>([]);
  const [filas,   setFilas]   = useState<BalanceHidricoRow[]>([]);
  const [loading, setLoading] = useState(true);
  // Estado del botón de copiar link
  const [copied,  setCopied]  = useState(false);

  // Carga paralela de resumen y detalle al abrir el modal
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getResumenBalance({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
      getBalanceHidrico({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: 500 }),
    ])
      .then(([r, f]) => { setResumen(r); setFilas(f); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fechaInicio, fechaFin]);

  // KPIs calculados: totales y promedios del período seleccionado
  const kpis = useMemo(() => {
    const sum = (key: keyof BalanceHidricoRow) =>
      filas.reduce((s, r) => s + ((r[key] as number | null) ?? 0), 0);
    const avg = (key: keyof BalanceHidricoRow) => {
      const vals = filas.map(r => r[key] as number | null).filter((v): v is number => v != null && v > 0);
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    };
    return {
      envio_th:     sum('envio_th'),
      gem_m3:       sum('consumo_gem_m3'),
      entrada_ro1:  sum('entrada_ro1'),
      permeado_ro1: sum('permeado_ro1'),
      agua_limpia:  sum('total_agua_limpia_m3'),
      eficiencia_ro: avg('eficiencia_ro_pct'),
      lav_l_und:    avg('indicador_lav_l_und'),
      tin_l_kg:     avg('indicador_tin_l_kg'),
      dias:         new Set(filas.map(r => r.fecha)).size,
    };
  }, [filas]);

  // Label legible del período (ej. "May 2025" o "Abr – May 2025")
  const periodoLabel = useMemo(() => {
    if (!fechaInicio || !fechaFin) return '';
    const d1 = new Date(fechaInicio + 'T00:00:00'), d2 = new Date(fechaFin + 'T00:00:00');
    const mismo = d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
    return mismo
      ? `${MESES[d1.getMonth() + 1]} ${d1.getFullYear()}`
      : `${MESES[d1.getMonth() + 1]} ${d1.getFullYear()} – ${MESES[d2.getMonth() + 1]} ${d2.getFullYear()}`;
  }, [fechaInicio, fechaFin]);

  // Alterna la visibilidad de una sección del informe
  const toggle = (key: SeccionKey) =>
    setActivas(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const handlePrint = () => window.print();

  // Construye la URL compartible con fechas y secciones activas codificadas
  const handleCopyLink = () => {
    const url = new URL('/informe/balance', window.location.origin);
    url.searchParams.set('fi', fechaInicio);
    url.searchParams.set('ff', fechaFin);
    url.searchParams.set('secciones', Array.from(activas).join(','));
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <>
      {/* Estilos de impresión: oculta todo excepto el área del reporte */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .informe-report, .informe-report * { visibility: visible !important; }
          .informe-report {
            position: fixed !important; inset: 0 !important;
            width: 100% !important; max-width: 100% !important;
            margin: 0 !important; box-shadow: none !important;
            border-radius: 0 !important; overflow: visible !important;
          }
          .informe-section { break-inside: avoid; page-break-inside: avoid; }
          .informe-portada { page-break-after: always; }
        }
      `}</style>

      {/* Overlay de fondo oscuro del modal */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(1,4,9,0.92)', display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar de configuración: secciones, período y acciones */}
        <div style={{ width: 260, minWidth: 260, background: '#0d1117', borderRight: '1px solid #21262d', display: 'flex', flexDirection: 'column', padding: '20px 16px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ color: '#e6edf3', fontWeight: 700, fontSize: 13 }}>Informe de Balance Hídrico</span>
            <button onClick={onClose} style={btnIconStyle}>✕</button>
          </div>

          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 16, lineHeight: 1.5 }}>
            <div style={{ color: '#3fb950', fontWeight: 600, marginBottom: 2 }}>Período</div>
            {fechaInicio} — {fechaFin}
          </div>

          {/* Checkboxes de secciones visibles */}
          <div style={{ borderTop: '1px solid #21262d', paddingTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#8b949e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Secciones</div>
            {SECCIONES.map(s => (
              <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10, color: activas.has(s.key) ? '#e6edf3' : '#484f58', fontSize: 12 }}>
                <input type="checkbox" checked={activas.has(s.key)} onChange={() => toggle(s.key)} style={{ accentColor: COLOR, width: 14, height: 14 }} />
                {s.label}
              </label>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Botones de acciones: generar PDF y copiar link */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #21262d', paddingTop: 14 }}>
            <button onClick={handlePrint} style={{ ...btnPrimaryStyle, background: COLOR }}>
              🖨 Generar PDF
            </button>
            <button onClick={handleCopyLink} style={{ ...btnSecondaryStyle, background: copied ? '#1a3a2a' : undefined }}>
              {copied ? '✓ ¡Copiado!' : '🔗 Copiar Link'}
            </button>
          </div>
        </div>

        {/* Área del reporte: vista previa del informe imprimible */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>
          {loading ? (
            <div style={{ color: '#8b949e', fontSize: 13, textAlign: 'center', marginTop: 60 }}>Cargando datos...</div>
          ) : (
            <div className="informe-report" style={{ background: '#fff', color: '#111', width: '100%', maxWidth: 820, margin: '0 auto', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', fontFamily: 'Arial, sans-serif', fontSize: 11, overflow: 'hidden' }}>

              {/* Portada del informe */}
              {activas.has('portada') && (
                <div className="informe-section informe-portada" style={{ padding: '40px 48px 28px', borderBottom: `3px solid ${COLOR}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                    <div>
                      <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>PERMODA LTDA — Planta de Tratamiento de Aguas Residuales</div>
                      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLOR, lineHeight: 1.2 }}>Informe de Balance Hídrico</h1>
                      <div style={{ fontSize: 14, color: '#444', marginTop: 6, fontWeight: 600 }}>{periodoLabel}</div>
                    </div>
                    <div style={{ background: COLOR, color: '#fff', padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>PTAR</div>
                  </div>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Período',          value: `${fechaInicio} al ${fechaFin}` },
                      { label: 'Días con datos',    value: String(kpis.dias) },
                      { label: 'Envío TH total',    value: `${fmt(kpis.envio_th, 0)} m³` },
                      { label: 'Agua tratada GEM',  value: `${fmt(kpis.gem_m3, 0)} m³` },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: '#f0f9f4', borderRadius: 6, padding: '10px 16px', minWidth: 130 }}>
                        <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: COLOR }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabla de totales por medidor */}
              {activas.has('balance') && (
                <div className="informe-section" style={{ padding: '28px 48px', borderBottom: '1px solid #e8e8e8' }}>
                  <SectionTitle color={COLOR}>Balance General — Totales por Medidor</SectionTitle>
                  {resumen.length === 0 ? <p style={{ color: '#888' }}>Sin datos para el período.</p> : (
                    <table style={tableStyle}>
                      <thead>
                        <tr style={{ background: '#e8f5ee' }}>
                          {['Medidor','Descripción','Total m³','N Turnos'].map(h => (
                            <th key={h} style={{ ...thStyle, textAlign: (h.includes('Total') || h.includes('N')) ? 'right' : 'left' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {resumen.map((r, i) => (
                          <tr key={r.medidor} style={{ background: i % 2 === 0 ? '#fff' : '#f7fbf9' }}>
                            <td style={tdStyle}>{r.medidor}</td>
                            <td style={tdStyle}>{r.descripcion}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(r.total_m3, 1)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{r.n_turnos}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* KPIs de eficiencia RO y agua limpia */}
              {activas.has('eficiencia') && (
                <div className="informe-section" style={{ padding: '28px 48px', borderBottom: '1px solid #e8e8e8' }}>
                  <SectionTitle color="#1a478a">Eficiencia del Sistema</SectionTitle>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Entrada RO1 total',     value: `${fmt(kpis.entrada_ro1, 0)} m³` },
                      { label: 'Permeado RO1 total',    value: `${fmt(kpis.permeado_ro1, 0)} m³` },
                      { label: 'Eficiencia RO promedio', value: kpis.eficiencia_ro != null ? `${fmt(kpis.eficiencia_ro, 1)} %` : '—' },
                      { label: 'Agua limpia total',     value: `${fmt(kpis.agua_limpia, 0)} m³` },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: '#f0f4fb', borderRadius: 6, padding: '10px 16px', minWidth: 150, flex: 1 }}>
                        <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a478a' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Indicadores de consumo por proceso productivo */}
              {activas.has('indicadores') && (
                <div className="informe-section" style={{ padding: '28px 48px' }}>
                  <SectionTitle color="#8a4000">Indicadores de Producción</SectionTitle>
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Lavandería (L/und)', value: fmt(kpis.lav_l_und) },
                      { label: 'Tintorería (L/kg)',  value: fmt(kpis.tin_l_kg) },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: '#fdf3e7', borderRadius: 6, padding: '10px 16px', minWidth: 150, flex: 1 }}>
                        <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#8a4000' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pie de página con fecha de generación */}
              <div style={{ padding: '10px 48px', borderTop: `2px solid ${COLOR}`, background: '#f0f9f4', display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#888' }}>
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

// Encabezado de sección con barra de color lateral
function SectionTitle({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 4, height: 18, background: color, borderRadius: 2 }} />
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color }}>{children}</h2>
    </div>
  );
}

// Estilos de tabla, cabecera y celda para el informe
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 10 };
const thStyle: React.CSSProperties = { padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: '#333', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid #eee', verticalAlign: 'middle' };

// Estilos de botones del sidebar
const btnPrimaryStyle: React.CSSProperties = { color: '#fff', border: 'none', borderRadius: 6, padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' };
const btnSecondaryStyle: React.CSSProperties = { background: '#21262d', color: '#e6edf3', border: '1px solid #30363d', borderRadius: 6, padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' };
const btnIconStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 14, padding: 4, lineHeight: 1 };
