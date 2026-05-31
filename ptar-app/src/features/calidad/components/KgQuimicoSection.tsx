/**
 * KgQuimicoSection — KG QUÍMICO / KG REMOVIDO
 * Spec: App-Ptar/grafico-kg-quimico-removido/CHART_SPEC.md
 *
 * Barras APILADAS (stacked) + Línea con marcadores — 2 ejes Y
 *
 * Colores exactos del spec:
 *   Coagulante  → #ED7D31  (naranja, accent2)
 *   Decolorante → #A5A5A5  (gris, accent3)
 *   Pol Aniónico→ #FFC000  (dorado, accent4)
 *   Catiónico   → #5B9BD5  (azul, accent5)
 *   Línea KG    → #ED7D31  (naranja, eje derecho)
 *
 * Filtros: dos date-range independientes (intersecc. aplicada al gráfico)
 */
import { useState, useEffect } from 'react';
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import { useKgQuimico } from '../hooks/useKgQuimico';

// ─── Colores exactos del spec ─────────────────────────────────────────────
const C_COAG = '#ED7D31';
const C_DECO = '#A5A5A5';
const C_POLA = '#FFC000';
const C_CATI = '#5B9BD5';
const C_LINE = '#ED7D31';

// ─── Tooltip dark ─────────────────────────────────────────────────────────
function TooltipCustom({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#161b22', border: '1px solid #30363d',
      borderRadius: 8, padding: '8px 12px', fontSize: 11,
    }}>
      <p style={{ color: '#8b949e', marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color ?? p.fill, margin: '2px 0' }}>
          {p.name}:{' '}
          {p.dataKey === 'kgRemovidos'
            ? `${p.value?.toLocaleString('es-CO', { maximumFractionDigits: 0 })} kg`
            : p.value?.toFixed(4)}
        </p>
      ))}
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────
interface Props { fechaInicio: string; fechaFin: string }

// ─── Componente ───────────────────────────────────────────────────────────
export default function KgQuimicoSection({ fechaInicio: propFI, fechaFin: propFF }: Props) {

  // Slicer 1
  const [fi1, setFi1] = useState(propFI);
  const [ff1, setFf1] = useState(propFF);
  // Slicer 2
  const [fi2, setFi2] = useState(propFI);
  const [ff2, setFf2] = useState(propFF);

  useEffect(() => { setFi1(propFI); setFi2(propFI); }, [propFI]);
  useEffect(() => { setFf1(propFF); setFf2(propFF); }, [propFF]);

  // Rango efectivo = intersección de ambos slicers
  const fechaInicio = fi1 > fi2 ? fi1 : fi2;
  const fechaFin    = ff1 < ff2 ? ff1 : ff2;

  const { data, loading, error } = useKgQuimico(fechaInicio, fechaFin);

  // Rango eje derecho (kg removidos)
  const kgs    = data.map(d => d.kgRemovidos).filter(v => v > 0);
  const maxKg  = kgs.length ? Math.ceil(Math.max(...kgs) * 1.3) : 1400;

  // Rango eje izquierdo (ratios, suma de barras apiladas)
  const sums   = data.map(d => d.coagulanteRatio + d.decoloranteRatio + d.polAnionicoRatio + d.cationicoRatio);
  const maxRatio = sums.length ? Math.ceil(Math.max(...sums) * 1.3 * 10) / 10 : 2;

  return (
    <section className="dash-section">

      {/* ── Título ── */}
      <div style={{
        background: '#1f6feb22', borderLeft: '3px solid #1f6feb',
        padding: '5px 12px', marginBottom: 12, fontSize: 12, fontWeight: 700,
        color: '#58a6ff', letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        KG QUÍMICO / KG REMOVIDO
      </div>

      {/* ── Dos slicers de fecha en fila ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 14, flexWrap: 'wrap' }}>

        {/* Slicer 1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#8b949e',
            textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
            Fecha 1
          </span>
          <input type="date" className="cal-filter-input" value={fi1}
            onChange={e => setFi1(e.target.value)} />
          <span style={{ color: '#484f58', fontSize: 11 }}>–</span>
          <input type="date" className="cal-filter-input" value={ff1}
            onChange={e => setFf1(e.target.value)} />
        </div>

        {/* Slicer 2 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#8b949e',
            textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
            Fecha 2
          </span>
          <input type="date" className="cal-filter-input" value={fi2}
            onChange={e => setFi2(e.target.value)} />
          <span style={{ color: '#484f58', fontSize: 11 }}>–</span>
          <input type="date" className="cal-filter-input" value={ff2}
            onChange={e => setFf2(e.target.value)} />
        </div>

      </div>

      {/* ── Gráfico ancho completo ── */}
      {loading ? (
        <div className="cal-loading">Cargando…</div>
      ) : error ? (
        <div className="cal-empty" style={{ color: '#f85149' }}>{error}</div>
      ) : !data.length ? (
        <div className="cal-empty">Sin datos para el período seleccionado</div>
      ) : (
        <div className="dash-card" style={{ padding: '12px 4px 0px' }}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={data}
              margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
              barCategoryGap="40%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />

              {/* Eje X — fechas "DD/MM" -60° */}
              <XAxis
                dataKey="label"
                tick={{ fill: '#8b949e', fontSize: 9 }}
                angle={-60}
                textAnchor="end"
                interval={0}
                height={65}
                tickLine={false}
                axisLine={{ stroke: '#30363d' }}
              />

              {/* Eje Y izquierdo — ratios kg/kg */}
              <YAxis
                yAxisId="left"
                orientation="left"
                domain={[0, maxRatio]}
                tick={{ fill: '#8b949e', fontSize: 9 }}
                width={48}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => v.toFixed(2)}
                label={{
                  value: 'Kg químico / Kg removido',
                  angle: -90, position: 'insideLeft',
                  fill: '#484f58', fontSize: 8, dx: -4,
                }}
              />

              {/* Eje Y derecho — KG removidos */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, maxKg]}
                tick={{ fill: C_LINE, fontSize: 9 }}
                width={55}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  v >= 1000
                    ? `${(v / 1000).toFixed(1)}k`
                    : v.toLocaleString('es-CO', { maximumFractionDigits: 0 })
                }
                label={{
                  value: 'Kg removidos',
                  angle: 90, position: 'insideRight',
                  fill: '#ED7D3180', fontSize: 10, dx: 0,
                }}
              />

              <Tooltip content={<TooltipCustom />} />
              <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10, paddingTop: 4 }} />

              {/* Barra 1 — Coagulante — base apilada */}
              <Bar yAxisId="left" dataKey="coagulanteRatio"
                name="KG COAGULANTE / KG REMOVIDO"
                stackId="ratios" fill={C_COAG} maxBarSize={30}>
                <LabelList dataKey="coagulanteRatio" position="inside"
                  style={{ fill: '#fff', fontSize: 7, fontFamily: 'monospace' }}
                  formatter={(v: number) => v > 0.05 ? v.toFixed(2) : ''} />
              </Bar>

              {/* Barra 2 — Decolorante */}
              <Bar yAxisId="left" dataKey="decoloranteRatio"
                name="KG DECOLORANTE / KG REMOVIDO"
                stackId="ratios" fill={C_DECO} maxBarSize={30}>
                <LabelList dataKey="decoloranteRatio" position="inside"
                  style={{ fill: '#fff', fontSize: 7, fontFamily: 'monospace' }}
                  formatter={(v: number) => v > 0.05 ? v.toFixed(2) : ''} />
              </Bar>

              {/* Barra 3 — Pol Aniónico */}
              <Bar yAxisId="left" dataKey="polAnionicoRatio"
                name="KG POL ANIÓNICO / KG REMOVIDO"
                stackId="ratios" fill={C_POLA} maxBarSize={30} radius={[2,2,0,0]}>
                <LabelList dataKey="polAnionicoRatio" position="inside"
                  style={{ fill: '#1a1a1a', fontSize: 7, fontFamily: 'monospace' }}
                  formatter={(v: number) => v > 0.005 ? v.toFixed(4) : ''} />
              </Bar>

              {/* Barra 4 — Catiónico — tope */}
              <Bar yAxisId="left" dataKey="cationicoRatio"
                name="KG CATIÓNICO / KG REMOVIDO"
                stackId="ratios" fill={C_CATI} maxBarSize={30} radius={[2,2,0,0]}>
                <LabelList dataKey="cationicoRatio" position="inside"
                  style={{ fill: '#fff', fontSize: 7, fontFamily: 'monospace' }}
                  formatter={(v: number) => v > 0.005 ? v.toFixed(4) : ''} />
              </Bar>

              {/* Línea — KG Removidos (eje derecho) */}
              <Line
                yAxisId="right"
                type="linear"
                dataKey="kgRemovidos"
                name="KG REMOVIDOS"
                stroke={C_LINE}
                strokeWidth={2.25}
                dot={{ r: 5, fill: C_LINE, stroke: C_LINE, strokeWidth: 1 }}
                activeDot={{ r: 7 }}
                connectNulls
              >
                <LabelList dataKey="kgRemovidos" position="top"
                  style={{ fill: C_LINE, fontSize: 7, fontFamily: 'monospace' }}
                  formatter={(v: number) =>
                    v > 0 ? v.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : ''
                  } />
              </Line>

            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
