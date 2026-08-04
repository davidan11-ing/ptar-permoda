// Página standalone del informe de costos químicos: se abre por URL directa para impresión/PDF
import { useState, useEffect, useMemo } from 'react';
import { getConsumoQuimicoDiario, getGemEficiencia } from '../../services/ptarClient';
import type { ConsumoQuimicoDiaRow, GemEficienciaRow } from '../../services/ptarClient';

// Formatea número con localización colombiana
const fmt = (v: number | null, dec = 0) =>
  v == null ? '—' : Number(v).toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });
// Formatea valor en COP con símbolo $
const fmtCOP = (v: number | null) =>
  v == null ? '—' : `$${Number(v).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;

// Nombres cortos de meses para etiqueta del período
const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

type SeccionKey = 'portada' | 'resumen' | 'gem' | 'ro';
export type { SeccionKey as CostosSeccionKey };

// Informe de costos imprimible controlado por parámetros de URL (?fi=&ff=&secciones=)
export default function InformeCostosPage() {
  // Parámetros leídos desde la URL
  const p         = new URLSearchParams(window.location.search);
  const fi        = p.get('fi') ?? '';
  const ff        = p.get('ff') ?? '';
  const secsParam = p.get('secciones') ?? 'portada,resumen,gem,ro';
  // Secciones activas derivadas del parámetro URL
  const activas   = useMemo(() => new Set(secsParam.split(',') as SeccionKey[]), [secsParam]);

  // Datos de consumo diario cargados
  const [consumo,  setConsumo]  = useState<ConsumoQuimicoDiaRow[]>([]);
  // Filas de eficiencia GEM cargadas
  const [gemRows,  setGemRows]  = useState<GemEficienciaRow[]>([]);
  // Estado de carga de datos
  const [loading,  setLoading]  = useState(true);

  // Fetch paralelo de consumo y eficiencia GEM al montar la página
  useEffect(() => {
    if (!fi || !ff) return;
    setLoading(true);
    Promise.all([
      getConsumoQuimicoDiario({ fecha_inicio: fi, fecha_fin: ff, limit: 2000 }),
      getGemEficiencia({ fecha_inicio: fi, fecha_fin: ff }),
    ])
      .then(([c, g]) => { setConsumo(c); setGemRows(g); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fi, ff]);

  // KPIs globales del informe
  const kpis = useMemo(() => {
    const costoTotal = consumo.reduce((s, r) => s + (r.costo_dia ?? 0), 0);
    const kgTotal    = consumo.reduce((s, r) => s + (r.kg_dia    ?? 0), 0);
    const caudal     = gemRows.reduce((s, r) => s + (r.caudal_m3 ?? 0), 0);
    const pesos_m3   = caudal > 0 ? costoTotal / caudal : null;
    return { costoTotal, kgTotal, caudal, pesos_m3 };
  }, [consumo, gemRows]);

  // Agrupación de costo y kg por sistema
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

  // Agrupación por reactivo con kg, PPM y costo, ordenado por costo desc
  const porReactivo = useMemo(() => {
    const map = new Map<string, { sistema: string; kg: number; ppm: number[]; costo: number }>();
    for (const r of consumo) {
      const key = r.producto_nombre;
      if (!map.has(key)) map.set(key, { sistema: r.sistema, kg: 0, ppm: [], costo: 0 });
      const g = map.get(key)!;
      g.kg    += r.kg_dia    ?? 0;
      g.costo += r.costo_dia ?? 0;
      if (r.ppm_promedio_dia != null) g.ppm.push(r.ppm_promedio_dia);
    }
    const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
    return Array.from(map.entries())
      .map(([nombre, g]) => ({ nombre, sistema: g.sistema, kg: g.kg, ppm: avg(g.ppm), costo: g.costo }))
      .sort((a, b) => b.costo - a.costo);
  }, [consumo]);

  // Reactivos filtrados por sistema
  const gemReactivos = porReactivo.filter(r => r.sistema === 'GEM');
  const roReactivos  = porReactivo.filter(r => r.sistema === 'RO');

  // Etiqueta legible del período (mes o rango de meses)
  const periodoLabel = useMemo(() => {
    if (!fi || !ff) return '';
    const d1 = new Date(fi + 'T00:00:00'), d2 = new Date(ff + 'T00:00:00');
    const mismo = d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
    return mismo
      ? `${MESES[d1.getMonth() + 1]} ${d1.getFullYear()}`
      : `${MESES[d1.getMonth() + 1]} ${d1.getFullYear()} – ${MESES[d2.getMonth() + 1]} ${d2.getFullYear()}`;
  }, [fi, ff]);

  // Tabla reutilizable de reactivos del informe
  const TablaReactivos = ({ rows }: { rows: typeof porReactivo }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
      <thead>
        <tr style={{ background: '#fdf3e7' }}>
          {['Reactivo','Kg total','PPM prom','Costo total','% del total'].map(h => (
            <th key={h} style={{ padding: '5px 8px', textAlign: h === 'Reactivo' ? 'left' : 'right', fontWeight: 700, fontSize: 10 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.nombre} style={{ background: i % 2 === 0 ? '#fff' : '#fdf9f5' }}>
            <td style={td}>{r.nombre}</td>
            <td style={{ ...td, textAlign: 'right' }}>{fmt(r.kg, 1)}</td>
            <td style={{ ...td, textAlign: 'right' }}>{r.ppm != null ? fmt(r.ppm, 1) : '—'}</td>
            <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmtCOP(r.costo)}</td>
            <td style={{ ...td, textAlign: 'right', color: '#8a4000' }}>
              {kpis.costoTotal > 0 ? `${fmt(r.costo / kpis.costoTotal * 100, 1)}%` : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <>
      {/* Estilos globales y de impresión de la página standalone */}
      <style>{`
        @media print { .informe-topbar { display: none !important; } body { margin: 0; } }
        * { box-sizing: border-box; }
        body { margin: 0; background: #f5f5f5; font-family: Arial, sans-serif; }
      `}</style>

      {/* Barra superior fija con título del período y botón de impresión */}
      <div className="informe-topbar" style={{ background: '#8a4000', color: '#fff', padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, position: 'sticky', top: 0, zIndex: 10 }}>
        <span>COSTOS QUÍMICOS — PERMODA LTDA &nbsp;·&nbsp; {periodoLabel}</span>
        <button onClick={() => window.print()} style={{ background: '#fff', color: '#8a4000', border: 'none', borderRadius: 4, padding: '5px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
          🖨 Imprimir / Guardar PDF
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Cargando informe...</div>
      ) : (
        <div style={{ maxWidth: 860, margin: '32px auto', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#111' }}>

          {/* PORTADA */}
          {activas.has('portada') && (
            <div style={{ padding: '40px 48px 28px', borderBottom: '3px solid #8a4000' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                <div>
                  <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>PERMODA LTDA — Planta de Tratamiento de Aguas Residuales</div>
                  <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#8a4000', lineHeight: 1.2 }}>Informe de Costos Químicos</h1>
                  <div style={{ fontSize: 14, color: '#444', marginTop: 6, fontWeight: 600 }}>{periodoLabel}</div>
                </div>
                <div style={{ background: '#8a4000', color: '#fff', padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>PTAR</div>
              </div>
              {/* Tarjetas KPI de portada */}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Costo total', value: fmtCOP(kpis.costoTotal) + ' COP' },
                  { label: 'Kg total reactivos', value: `${fmt(kpis.kgTotal, 1)} kg` },
                  { label: 'Caudal tratado GEM', value: `${fmt(kpis.caudal, 0)} m³` },
                  { label: 'Indicador $/m³', value: fmtCOP(kpis.pesos_m3) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#fdf3e7', borderRadius: 6, padding: '10px 16px', minWidth: 130 }}>
                    <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#8a4000' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESUMEN POR SISTEMA */}
          {activas.has('resumen') && (
            <div style={{ padding: '28px 48px', borderBottom: '1px solid #e8e8e8' }}>
              <SectionTitle color="#8a4000">Resumen por Sistema</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                  <tr style={{ background: '#fdf3e7' }}>
                    {['Sistema','Kg total','Costo total','% del total'].map(h => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: h === 'Sistema' ? 'left' : 'right', fontWeight: 700, fontSize: 10 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {porSistema.map((r, i) => (
                    <tr key={r.sistema} style={{ background: i % 2 === 0 ? '#fff' : '#fdf9f5' }}>
                      <td style={{ ...td, fontWeight: 600 }}>{r.sistema}</td>
                      <td style={{ ...td, textAlign: 'right' }}>{fmt(r.kg, 1)}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmtCOP(r.costo)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
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
            <div style={{ padding: '28px 48px', borderBottom: '1px solid #e8e8e8' }}>
              <SectionTitle color="#1a478a">Consumo Sistema GEM</SectionTitle>
              {gemReactivos.length === 0
                ? <p style={{ color: '#888' }}>Sin datos GEM para el período.</p>
                : <TablaReactivos rows={gemReactivos} />}
            </div>
          )}

          {/* COSTOS RO */}
          {activas.has('ro') && (
            <div style={{ padding: '28px 48px' }}>
              <SectionTitle color="#1a6b3c">Consumo Sistema Osmosis Inversa (RO)</SectionTitle>
              {roReactivos.length === 0
                ? <p style={{ color: '#888' }}>Sin datos RO para el período.</p>
                : <TablaReactivos rows={roReactivos} />}
            </div>
          )}

          <div style={{ padding: '10px 48px', borderTop: '2px solid #8a4000', background: '#fdf3e7', display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#888' }}>
            <span>PERMODA LTDA — Sistema PTAR</span>
            <span>Generado: {new Date().toLocaleString('es-CO')}</span>
          </div>
        </div>
      )}
    </>
  );
}

// Estilo de celda de tabla del informe
const td: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid #eee' };
// Encabezado de sección con barra de color y título
function SectionTitle({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 4, height: 18, background: color, borderRadius: 2 }} />
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color }}>{children}</h2>
    </div>
  );
}
