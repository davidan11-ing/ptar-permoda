// Modal de informe de costos químicos: portada, resumen por sistema y desglose GEM/RO
import { useState, useEffect, useMemo } from 'react';
import { getConsumoQuimicoDiario, getGemEficiencia } from '../../services/ptarClient';
import type { ConsumoQuimicoDiaRow, GemEficienciaRow } from '../../services/ptarClient';

// Definición de secciones disponibles en el informe
const SECCIONES = [
  { key: 'portada', label: 'Portada' },
  { key: 'resumen', label: 'Resumen por Sistema' },
  { key: 'gem',     label: 'Costos GEM' },
  { key: 'ro',      label: 'Costos Osmosis Inversa' },
] as const;
type SeccionKey = (typeof SECCIONES)[number]['key'];
export type { SeccionKey as CostosSeccionKey };

// Nombres cortos de meses para etiqueta del período
const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
// Formatea número con localización colombiana
const fmt    = (v: number | null, dec = 0) =>
  v == null ? '—' : Number(v).toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });
// Formatea valor en COP con símbolo $
const fmtCOP = (v: number | null) =>
  v == null ? '—' : `$${Number(v).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;

// Color de acento del informe (naranja PTAR)
const COLOR = '#8a4000';

interface Props { fechaInicio: string; fechaFin: string; onClose: () => void; }

// Modal overlay con sidebar de control e informe imprimible
export default function InformeCostosModal({ fechaInicio, fechaFin, onClose }: Props) {
  // Secciones activas seleccionadas por el usuario
  const [activas, setActivas] = useState<Set<SeccionKey>>(
    new Set(['portada', 'resumen', 'gem', 'ro'])
  );
  // Datos de consumo diario cargados
  const [consumo, setConsumo] = useState<ConsumoQuimicoDiaRow[]>([]);
  // Filas de eficiencia GEM cargadas
  const [gemRows, setGemRows] = useState<GemEficienciaRow[]>([]);
  // Estado de carga de datos
  const [loading, setLoading] = useState(true);
  // Confirmación visual de enlace copiado
  const [copied,  setCopied]  = useState(false);

  // Fetch paralelo de consumo y eficiencia GEM al cambiar período
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getConsumoQuimicoDiario({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: 2000 }),
      getGemEficiencia({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
    ])
      .then(([c, g]) => { setConsumo(c); setGemRows(g); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fechaInicio, fechaFin]);

  // KPIs globales del informe: costo total, kg, caudal e indicador $/m³
  const kpis = useMemo(() => {
    const costoTotal = consumo.reduce((s, r) => s + (r.costo_dia ?? 0), 0);
    const kgTotal    = consumo.reduce((s, r) => s + (r.kg_dia    ?? 0), 0);
    const caudal     = gemRows.reduce((s, r) => s + (r.caudal_m3 ?? 0), 0);
    return { costoTotal, kgTotal, caudal, pesos_m3: caudal > 0 ? costoTotal / caudal : null };
  }, [consumo, gemRows]);

  // Agrupación de costo y kg por sistema (GEM, RO, PTAP)
  const porSistema = useMemo(() => {
    const map = new Map<string, { costo: number; kg: number }>();
    for (const r of consumo) {
      if (!map.has(r.sistema)) map.set(r.sistema, { costo: 0, kg: 0 });
      const g = map.get(r.sistema)!;
      g.costo += r.costo_dia ?? 0;
      g.kg    += r.kg_dia    ?? 0;
    }
    return Array.from(map.entries()).map(([sistema, v]) => ({ sistema, ...v }));
  }, [consumo]);

  // Agrupación de costo, kg y PPM por nombre de reactivo, ordenado por costo desc
  const porReactivo = useMemo(() => {
    const map = new Map<string, { sistema: string; kg: number; ppm: number[]; costo: number }>();
    for (const r of consumo) {
      if (!map.has(r.producto_nombre)) map.set(r.producto_nombre, { sistema: r.sistema, kg: 0, ppm: [], costo: 0 });
      const g = map.get(r.producto_nombre)!;
      g.kg    += r.kg_dia    ?? 0;
      g.costo += r.costo_dia ?? 0;
      if (r.ppm_promedio_dia != null) g.ppm.push(r.ppm_promedio_dia);
    }
    const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
    return Array.from(map.entries())
      .map(([nombre, g]) => ({ nombre, sistema: g.sistema, kg: g.kg, ppm: avg(g.ppm), costo: g.costo }))
      .sort((a, b) => b.costo - a.costo);
  }, [consumo]);

  // Filtros por sistema para las secciones del informe
  const gemReactivos = porReactivo.filter(r => r.sistema === 'GEM');
  const roReactivos  = porReactivo.filter(r => r.sistema === 'RO');

  // Etiqueta legible del período (mes o rango de meses)
  const periodoLabel = useMemo(() => {
    if (!fechaInicio || !fechaFin) return '';
    const d1 = new Date(fechaInicio + 'T00:00:00'), d2 = new Date(fechaFin + 'T00:00:00');
    const mismo = d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
    return mismo
      ? `${MESES[d1.getMonth() + 1]} ${d1.getFullYear()}`
      : `${MESES[d1.getMonth() + 1]} ${d1.getFullYear()} – ${MESES[d2.getMonth() + 1]} ${d2.getFullYear()}`;
  }, [fechaInicio, fechaFin]);

  // Activa o desactiva una sección del informe
  const toggle = (key: SeccionKey) =>
    setActivas(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  // Lanza el diálogo de impresión del navegador
  const handlePrint = () => window.print();

  // Copia la URL del informe con parámetros de filtro al portapapeles
  const handleCopyLink = () => {
    const url = new URL('/informe/costos', window.location.origin);
    url.searchParams.set('fi', fechaInicio);
    url.searchParams.set('ff', fechaFin);
    url.searchParams.set('secciones', Array.from(activas).join(','));
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Tabla reutilizable de reactivos con kg, PPM, costo y porcentaje del total
  const TablaReactivos = ({ rows }: { rows: typeof porReactivo }) => (
    <table style={tableStyle}>
      <thead>
        <tr style={{ background: '#fdf3e7' }}>
          {['Reactivo','Kg total','PPM prom','Costo total','% del total'].map(h => (
            <th key={h} style={{ ...thStyle, textAlign: h === 'Reactivo' ? 'left' : 'right' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.nombre} style={{ background: i % 2 === 0 ? '#fff' : '#fdf9f5' }}>
            <td style={tdStyle}>{r.nombre}</td>
            <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(r.kg, 1)}</td>
            <td style={{ ...tdStyle, textAlign: 'right' }}>{r.ppm != null ? fmt(r.ppm, 1) : '—'}</td>
            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtCOP(r.costo)}</td>
            <td style={{ ...tdStyle, textAlign: 'right', color: COLOR }}>
              {kpis.costoTotal > 0 ? `${fmt(r.costo / kpis.costoTotal * 100, 1)}%` : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <>
      {/* Estilos de impresión: oculta todo excepto el área del informe */}
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

      {/* Contenedor overlay fullscreen */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(1,4,9,0.92)', display: 'flex', overflow: 'hidden' }}>

        {/* ── Sidebar de control: secciones, acciones de impresión y enlace ── */}
        <div style={{ width: 260, minWidth: 260, background: '#0d1117', borderRight: '1px solid #21262d', display: 'flex', flexDirection: 'column', padding: '20px 16px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ color: '#e6edf3', fontWeight: 700, fontSize: 13 }}>Informe de Costos Químicos</span>
            <button onClick={onClose} style={btnIconStyle}>✕</button>
          </div>

          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 16, lineHeight: 1.5 }}>
            <div style={{ color: '#e6813a', fontWeight: 600, marginBottom: 2 }}>Período</div>
            {fechaInicio} — {fechaFin}
          </div>

          {/* Lista de checkboxes para activar/desactivar secciones */}
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

          {/* Botones de acción: PDF y copiar enlace */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #21262d', paddingTop: 14 }}>
            <button onClick={handlePrint} style={{ ...btnPrimaryStyle, background: COLOR }}>
              🖨 Generar PDF
            </button>
            <button onClick={handleCopyLink} style={{ ...btnSecondaryStyle, background: copied ? '#2a1a00' : undefined }}>
              {copied ? '✓ ¡Copiado!' : '🔗 Copiar Link'}
            </button>
          </div>
        </div>

        {/* ── Área del informe imprimible ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px' }}>
          {loading ? (
            <div style={{ color: '#8b949e', fontSize: 13, textAlign: 'center', marginTop: 60 }}>Cargando datos...</div>
          ) : (
            <div className="informe-report" style={{ background: '#fff', color: '#111', width: '100%', maxWidth: 820, margin: '0 auto', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', fontFamily: 'Arial, sans-serif', fontSize: 11, overflow: 'hidden' }}>

              {/* PORTADA */}
              {activas.has('portada') && (
                <div className="informe-section informe-portada" style={{ padding: '40px 48px 28px', borderBottom: `3px solid ${COLOR}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                    <div>
                      <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>PERMODA LTDA — Planta de Tratamiento de Aguas Residuales</div>
                      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: COLOR, lineHeight: 1.2 }}>Informe de Costos Químicos</h1>
                      <div style={{ fontSize: 14, color: '#444', marginTop: 6, fontWeight: 600 }}>{periodoLabel}</div>
                    </div>
                    <div style={{ background: COLOR, color: '#fff', padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>PTAR</div>
                  </div>
                  {/* Tarjetas KPI de la portada */}
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Costo total',         value: fmtCOP(kpis.costoTotal) + ' COP' },
                      { label: 'Kg total reactivos',  value: `${fmt(kpis.kgTotal, 1)} kg` },
                      { label: 'Caudal tratado GEM',  value: `${fmt(kpis.caudal, 0)} m³` },
                      { label: 'Indicador $/m³',      value: fmtCOP(kpis.pesos_m3) },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: '#fdf3e7', borderRadius: 6, padding: '10px 16px', minWidth: 130 }}>
                        <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: COLOR }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RESUMEN POR SISTEMA */}
              {activas.has('resumen') && (
                <div className="informe-section" style={{ padding: '28px 48px', borderBottom: '1px solid #e8e8e8' }}>
                  <SectionTitle color={COLOR}>Resumen por Sistema</SectionTitle>
                  <table style={tableStyle}>
                    <thead>
                      <tr style={{ background: '#fdf3e7' }}>
                        {['Sistema','Kg total','Costo total','% del total'].map(h => (
                          <th key={h} style={{ ...thStyle, textAlign: h === 'Sistema' ? 'left' : 'right' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {porSistema.map((r, i) => (
                        <tr key={r.sistema} style={{ background: i % 2 === 0 ? '#fff' : '#fdf9f5' }}>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>{r.sistema}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(r.kg, 1)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtCOP(r.costo)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            {kpis.costoTotal > 0 ? `${fmt(r.costo / kpis.costoTotal * 100, 1)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* COSTOS GEM */}
              {activas.has('gem') && (
                <div className="informe-section" style={{ padding: '28px 48px', borderBottom: '1px solid #e8e8e8' }}>
                  <SectionTitle color="#1a478a">Consumo Sistema GEM</SectionTitle>
                  {gemReactivos.length === 0
                    ? <p style={{ color: '#888' }}>Sin datos GEM para el período.</p>
                    : <TablaReactivos rows={gemReactivos} />}
                </div>
              )}

              {/* COSTOS RO */}
              {activas.has('ro') && (
                <div className="informe-section" style={{ padding: '28px 48px' }}>
                  <SectionTitle color="#1a6b3c">Consumo Sistema Osmosis Inversa (RO)</SectionTitle>
                  {roReactivos.length === 0
                    ? <p style={{ color: '#888' }}>Sin datos RO para el período.</p>
                    : <TablaReactivos rows={roReactivos} />}
                </div>
              )}

              <div style={{ padding: '10px 48px', borderTop: `2px solid ${COLOR}`, background: '#fdf3e7', display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#888' }}>
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

// Encabezado de sección con barra de color y título
function SectionTitle({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 4, height: 18, background: color, borderRadius: 2 }} />
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color }}>{children}</h2>
    </div>
  );
}

// Estilos de tabla, encabezado y celda del informe imprimible
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 10 };
const thStyle: React.CSSProperties = { padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: 10, color: '#333', whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid #eee', verticalAlign: 'middle' };
const btnPrimaryStyle: React.CSSProperties = { color: '#fff', border: 'none', borderRadius: 6, padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' };
const btnSecondaryStyle: React.CSSProperties = { background: '#21262d', color: '#e6edf3', border: '1px solid #30363d', borderRadius: 6, padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' };
const btnIconStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 14, padding: 4, lineHeight: 1 };
