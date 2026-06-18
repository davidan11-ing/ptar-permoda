import { useState, useEffect, useMemo } from 'react';
import { getResumenBalance, getBalanceHidrico } from '../../services/ptarClient';
import type { ResumenBalanceRow, BalanceHidricoRow } from '../../services/ptarClient';

const fmt  = (v: number | null, dec = 1) =>
  v == null ? '—' : Number(v).toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

type SeccionKey = 'portada' | 'balance' | 'eficiencia' | 'indicadores';
export type { SeccionKey as BalanceSeccionKey };

const SECCIONES: { key: SeccionKey; label: string }[] = [
  { key: 'portada',      label: 'Portada' },
  { key: 'balance',      label: 'Balance General' },
  { key: 'eficiencia',   label: 'Eficiencia del Sistema' },
  { key: 'indicadores',  label: 'Indicadores de Producción' },
];

export default function InformeBalancePage() {
  const p       = new URLSearchParams(window.location.search);
  const fi      = p.get('fi') ?? '';
  const ff      = p.get('ff') ?? '';
  const secsParam = p.get('secciones') ?? 'portada,balance,eficiencia,indicadores';
  const activas = useMemo(() => new Set(secsParam.split(',') as SeccionKey[]), [secsParam]);

  const [resumen, setResumen] = useState<ResumenBalanceRow[]>([]);
  const [filas,   setFilas]   = useState<BalanceHidricoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fi || !ff) return;
    setLoading(true);
    Promise.all([
      getResumenBalance({ fecha_inicio: fi, fecha_fin: ff }),
      getBalanceHidrico({ fecha_inicio: fi, fecha_fin: ff, limit: 500 }),
    ])
      .then(([r, f]) => { setResumen(r); setFilas(f); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fi, ff]);

  const kpis = useMemo(() => {
    const sum = (key: keyof BalanceHidricoRow) =>
      filas.reduce((s, r) => s + ((r[key] as number | null) ?? 0), 0);
    const avg = (key: keyof BalanceHidricoRow) => {
      const vals = filas.map(r => r[key] as number | null).filter((v): v is number => v != null && v > 0);
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    };
    return {
      envio_th:        sum('envio_th'),
      gem_m3:          sum('consumo_gem_m3'),
      entrada_ro1:     sum('entrada_ro1'),
      permeado_ro1:    sum('permeado_ro1'),
      agua_limpia:     sum('total_agua_limpia_m3'),
      eficiencia_ro:   avg('eficiencia_ro_pct'),
      lav_l_und:       avg('indicador_lav_l_und'),
      tin_l_kg:        avg('indicador_tin_l_kg'),
      dias:            new Set(filas.map(r => r.fecha)).size,
    };
  }, [filas]);

  const periodoLabel = useMemo(() => {
    if (!fi || !ff) return '';
    const d1 = new Date(fi + 'T00:00:00'), d2 = new Date(ff + 'T00:00:00');
    const mismo = d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
    return mismo
      ? `${MESES[d1.getMonth() + 1]} ${d1.getFullYear()}`
      : `${MESES[d1.getMonth() + 1]} ${d1.getFullYear()} – ${MESES[d2.getMonth() + 1]} ${d2.getFullYear()}`;
  }, [fi, ff]);

  return (
    <>
      <style>{`
        @media print { .informe-topbar { display: none !important; } body { margin: 0; } }
        * { box-sizing: border-box; }
        body { margin: 0; background: #f5f5f5; font-family: Arial, sans-serif; }
      `}</style>

      <div className="informe-topbar" style={{ background: '#1a6b3c', color: '#fff', padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, position: 'sticky', top: 0, zIndex: 10 }}>
        <span>BALANCE HÍDRICO — PERMODA LTDA &nbsp;·&nbsp; {periodoLabel}</span>
        <button onClick={() => window.print()} style={{ background: '#fff', color: '#1a6b3c', border: 'none', borderRadius: 4, padding: '5px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
          🖨 Imprimir / Guardar PDF
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Cargando informe...</div>
      ) : (
        <div style={{ maxWidth: 860, margin: '32px auto', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#111' }}>

          {activas.has('portada') && (
            <div style={{ padding: '40px 48px 28px', borderBottom: '3px solid #1a6b3c' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                <div>
                  <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>PERMODA LTDA — Planta de Tratamiento de Aguas Residuales</div>
                  <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a6b3c', lineHeight: 1.2 }}>Informe de Balance Hídrico</h1>
                  <div style={{ fontSize: 14, color: '#444', marginTop: 6, fontWeight: 600 }}>{periodoLabel}</div>
                </div>
                <div style={{ background: '#1a6b3c', color: '#fff', padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>PTAR</div>
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Período', value: `${fi} al ${ff}` },
                  { label: 'Días con datos', value: String(kpis.dias) },
                  { label: 'Envío TH total', value: `${fmt(kpis.envio_th, 0)} m³` },
                  { label: 'Agua tratada GEM', value: `${fmt(kpis.gem_m3, 0)} m³` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#f0f9f4', borderRadius: 6, padding: '10px 16px', minWidth: 130 }}>
                    <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1a6b3c' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activas.has('balance') && (
            <div style={{ padding: '28px 48px', borderBottom: '1px solid #e8e8e8' }}>
              <SectionTitle color="#1a6b3c">Balance General — Totales por Medidor</SectionTitle>
              {resumen.length === 0 ? <p style={{ color: '#888' }}>Sin datos para el período.</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr style={{ background: '#e8f5ee' }}>
                      {['Medidor','Descripción','Total m³','N Turnos'].map(h => (
                        <th key={h} style={{ padding: '5px 8px', textAlign: h.includes('Total') || h.includes('N') ? 'right' : 'left', fontWeight: 700, fontSize: 10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.map((r, i) => (
                      <tr key={r.medidor} style={{ background: i % 2 === 0 ? '#fff' : '#f7fbf9' }}>
                        <td style={td}>{r.medidor}</td>
                        <td style={td}>{r.descripcion}</td>
                        <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{fmt(r.total_m3, 1)}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{r.n_turnos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activas.has('eficiencia') && (
            <div style={{ padding: '28px 48px', borderBottom: '1px solid #e8e8e8' }}>
              <SectionTitle color="#1a478a">Eficiencia del Sistema</SectionTitle>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Entrada RO1 total', value: `${fmt(kpis.entrada_ro1, 0)} m³` },
                  { label: 'Permeado RO1 total', value: `${fmt(kpis.permeado_ro1, 0)} m³` },
                  { label: 'Eficiencia RO promedio', value: kpis.eficiencia_ro != null ? `${fmt(kpis.eficiencia_ro, 1)} %` : '—' },
                  { label: 'Agua limpia total', value: `${fmt(kpis.agua_limpia, 0)} m³` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#f0f4fb', borderRadius: 6, padding: '10px 16px', minWidth: 150, flex: 1 }}>
                    <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1a478a' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activas.has('indicadores') && (
            <div style={{ padding: '28px 48px' }}>
              <SectionTitle color="#8a4000">Indicadores de Producción</SectionTitle>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Lavandería (L/und)', value: fmt(kpis.lav_l_und) },
                  { label: 'Tintorería (L/kg)', value: fmt(kpis.tin_l_kg) },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#fdf3e7', borderRadius: 6, padding: '10px 16px', minWidth: 150, flex: 1 }}>
                    <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#8a4000' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: '10px 48px', borderTop: '2px solid #1a6b3c', background: '#f0f9f4', display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#888' }}>
            <span>PERMODA LTDA — Sistema PTAR</span>
            <span>Generado: {new Date().toLocaleString('es-CO')}</span>
          </div>
        </div>
      )}
    </>
  );
}

const td: React.CSSProperties = { padding: '4px 8px', borderBottom: '1px solid #eee' };
function SectionTitle({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 4, height: 18, background: color, borderRadius: 2 }} />
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color }}>{children}</h2>
    </div>
  );
}
