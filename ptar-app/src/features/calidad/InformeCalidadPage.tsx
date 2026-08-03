import { useState, useEffect, useMemo } from 'react';
import { getCalidadResumen, getCalidadRemociones } from '../../services/ptarClient';
import type { CalidadResumenRow, RemocionCalidad } from '../../services/ptarClient';
import type { SeccionKey } from './InformeCalidadModal';

const PARAMS_VERT = ['DQO', 'SST', 'Color', 'pH', 'Conductividad', 'Temperatura'];
const MESES_ES   = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const fmt = (v: number | null, dec = 1) =>
  v == null ? '—' : Number(v).toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });

export default function InformeCalidadPage() {
  const p          = new URLSearchParams(window.location.search);
  const fi         = p.get('fi')        ?? '';
  const ff         = p.get('ff')        ?? '';
  const secsParam  = p.get('secciones') ?? 'portada,estadisticas,remocion,vertimiento';
  const activas    = useMemo(() => new Set(secsParam.split(',') as SeccionKey[]), [secsParam]);

  const [resumen,    setResumen]    = useState<CalidadResumenRow[]>([]);
  const [remociones, setRemociones] = useState<RemocionCalidad[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!fi || !ff) return;
    setLoading(true);
    Promise.all([
      getCalidadResumen({ fecha_inicio: fi, fecha_fin: ff }),
      getCalidadRemociones({ fecha_inicio: fi, fecha_fin: ff }),
    ])
      .then(([r, rem]) => { setResumen(r); setRemociones(rem); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fi, ff]);

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

  const periodoLabel = useMemo(() => {
    if (!fi || !ff) return '';
    const d1 = new Date(fi + 'T00:00:00'), d2 = new Date(ff + 'T00:00:00');
    const mismoMes = d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
    if (mismoMes) return `${MESES_ES[d1.getMonth() + 1]} ${d1.getFullYear()}`;
    return `${MESES_ES[d1.getMonth() + 1]} ${d1.getFullYear()} – ${MESES_ES[d2.getMonth() + 1]} ${d2.getFullYear()}`;
  }, [fi, ff]);

  const colorCumplimiento = (pct: number | null) => {
    if (pct == null) return '#888';
    if (pct <= 5)   return '#1a6b3c';
    if (pct <= 20)  return '#8a6b00';
    return '#8b1c1c';
  };

  return (
    <>
      <style>{`
        @media print {
          .informe-topbar { display: none !important; }
          body { margin: 0; }
        }
        * { box-sizing: border-box; }
        body { margin: 0; background: #f5f5f5; font-family: Arial, sans-serif; }
      `}</style>

      {/* Barra mínima solo visible en pantalla */}
      <div
        className="informe-topbar"
        style={{
          background: '#1a478a', color: '#fff', padding: '8px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12, fontWeight: 600, position: 'sticky', top: 0, zIndex: 10,
          visibility: 'visible',
        }}
      >
        <span>INFORME DE CALIDAD — PERMODA LTDA &nbsp;·&nbsp; {periodoLabel}</span>
        <button
          onClick={() => window.print()}
          style={{
            background: '#fff', color: '#1a478a', border: 'none', borderRadius: 4,
            padding: '5px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}
        >
          🖨 Imprimir / Guardar PDF
        </button>
      </div>

      {/* Contenido del informe */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Cargando informe...</div>
      ) : (
        <div style={{ maxWidth: 860, margin: '32px auto', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#111' }}>

          {/* PORTADA */}
          {activas.has('portada') && (
            <div style={{ padding: '40px 48px 28px', borderBottom: '3px solid #1a478a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                <div>
                  <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                    PERMODA LTDA — Planta de Tratamiento de Aguas Residuales
                  </div>
                  <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a478a', lineHeight: 1.2 }}>
                    Informe de Calidad del Agua
                  </h1>
                  <div style={{ fontSize: 14, color: '#444', marginTop: 6, fontWeight: 600 }}>{periodoLabel}</div>
                </div>
                <div style={{ background: '#1a478a', color: '#fff', padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                  PTAR
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Período', value: `${fi} al ${ff}` },
                  { label: 'Total registros', value: resumen.reduce((s, r) => s + (r.n_mediciones ?? 0), 0).toLocaleString('es-CO') },
                  { label: 'Parámetros', value: String(paramGroups.size) },
                  { label: 'Generado', value: new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#f0f4fb', borderRadius: 6, padding: '10px 16px', minWidth: 130 }}>
                    <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a478a' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ESTADÍSTICAS */}
          {activas.has('estadisticas') && (
            <div style={{ padding: '28px 48px', borderBottom: '1px solid #e8e8e8' }}>
              <SectionTitle color="#1a478a">Estadísticas de Calidad por Parámetro</SectionTitle>
              {paramGroups.size === 0 ? (
                <p style={{ color: '#888' }}>Sin datos para el período.</p>
              ) : (
                Array.from(paramGroups.entries()).map(([param, rows]) => (
                  <div key={param} style={{ marginBottom: 20, breakInside: 'avoid' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#1a478a', marginBottom: 6, borderBottom: '1px solid #ddd', paddingBottom: 3 }}>
                      {param} <span style={{ color: '#888', fontWeight: 400, fontSize: 10 }}>({rows[0]?.parametro_unidad})</span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                      <thead>
                        <tr style={{ background: '#e8f0fb' }}>
                          {['Unidad de Tratamiento','N','Mín','Máx','Promedio','CV%'].map(h => (
                            <th key={h} style={{ padding: '5px 8px', textAlign: h === 'Unidad de Tratamiento' ? 'left' : 'right', fontWeight: 700, fontSize: 10 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.sort((a, b) => a.orden_tren - b.orden_tren).map((r, i) => (
                          <tr key={r.unidad_codigo} style={{ background: i % 2 === 0 ? '#fff' : '#f7f9fc' }}>
                            <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee' }}>{r.unidad}</td>
                            <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{r.n_mediciones}</td>
                            <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmt(r.minimo)}</td>
                            <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmt(r.maximo)}</td>
                            <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', textAlign: 'right', fontWeight: 600 }}>{fmt(r.promedio)}</td>
                            <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', textAlign: 'right', color: (r.cv_pct ?? 0) > 30 ? '#c0392b' : '#333' }}>
                              {r.cv_pct != null ? `${fmt(r.cv_pct, 1)}%` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )}

          {/* REMOCIÓN GEM */}
          {activas.has('remocion') && (
            <div style={{ padding: '28px 48px', borderBottom: '1px solid #e8e8e8' }}>
              <SectionTitle color="#1a6b3c">Remoción Sistema GEM</SectionTitle>
              {remGrouped.length === 0 ? (
                <p style={{ color: '#888' }}>Sin datos de remoción para el período.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr style={{ background: '#e8f5ee' }}>
                      {['Parámetro','Entrada (Pulmón)','Salida GEM','% Remoción','Eficiencia'].map(h => (
                        <th key={h} style={{ padding: '5px 8px', textAlign: h === 'Parámetro' ? 'left' : 'right', fontWeight: 700, fontSize: 10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {remGrouped.map((r, i) => {
                      const pct = r.pct ?? 0;
                      const color = pct >= 70 ? '#1a6b3c' : pct >= 40 ? '#8a6b00' : '#8b1c1c';
                      return (
                        <tr key={r.param} style={{ background: i % 2 === 0 ? '#fff' : '#f7fbf9' }}>
                          <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', fontWeight: 600 }}>{r.param}</td>
                          <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmt(r.ent)}</td>
                          <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmt(r.sal)}</td>
                          <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', textAlign: 'right', fontWeight: 700, color }}>{fmt(r.pct, 1)}%</td>
                          <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>
                            <span style={{ background: color, color: '#fff', padding: '1px 8px', borderRadius: 10, fontSize: 9, fontWeight: 700 }}>
                              {pct >= 70 ? 'Alta' : pct >= 40 ? 'Media' : 'Baja'}
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

          {/* CUMPLIMIENTO VERTIMIENTO */}
          {activas.has('vertimiento') && (
            <div style={{ padding: '28px 48px' }}>
              <SectionTitle color="#8a4000">Cumplimiento Normas de Vertimiento</SectionTitle>
              {vertRows.length === 0 ? (
                <p style={{ color: '#888' }}>Sin datos de vertimiento o sin límites configurados.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr style={{ background: '#fdf3e7' }}>
                      {['Parámetro','Límite Mín','Límite Máx','Promedio Real','% Fuera','Cumplimiento'].map(h => (
                        <th key={h} style={{ padding: '5px 8px', textAlign: h === 'Parámetro' ? 'left' : 'right', fontWeight: 700, fontSize: 10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {vertRows.map((r, i) => {
                      const pctFuera = r.pct_fuera_limite_vert ?? 0;
                      const color = colorCumplimiento(r.pct_fuera_limite_vert);
                      return (
                        <tr key={r.unidad_codigo + r.parametro_codigo} style={{ background: i % 2 === 0 ? '#fff' : '#fdf9f5' }}>
                          <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', fontWeight: 600 }}>
                            {r.parametro} <span style={{ color: '#888', fontWeight: 400 }}>({r.parametro_unidad})</span>
                          </td>
                          <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmt(r.limite_vertimiento_min)}</td>
                          <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{fmt(r.limite_vertimiento_max)}</td>
                          <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', textAlign: 'right', fontWeight: 600 }}>{fmt(r.promedio)}</td>
                          <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', textAlign: 'right', color }}>{pctFuera > 0 ? `${fmt(r.pct_fuera_limite_vert, 1)}%` : '—'}</td>
                          <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', textAlign: 'right' }}>
                            <span style={{ background: color, color: '#fff', padding: '1px 8px', borderRadius: 10, fontSize: 9, fontWeight: 700 }}>
                              {pctFuera <= 5 ? 'Cumple' : pctFuera <= 20 ? 'Riesgo' : 'No Cumple'}
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

          {/* Footer */}
          <div style={{ padding: '10px 48px', borderTop: '2px solid #1a478a', background: '#f0f4fb', display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#888' }}>
            <span>PERMODA LTDA — Sistema PTAR</span>
            <span>Generado: {new Date().toLocaleString('es-CO')}</span>
          </div>
        </div>
      )}
    </>
  );
}

function SectionTitle({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 4, height: 18, background: color, borderRadius: 2 }} />
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color }}>{children}</h2>
    </div>
  );
}
