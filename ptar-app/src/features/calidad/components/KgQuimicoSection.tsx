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
import { useState, useMemo } from 'react';
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import { useKgQuimico, type KgQuimicoPoint } from '../hooks/useKgQuimico';
import type { Granularidad } from '../../../hooks/useGranularidad';
import { xLabel, sortKey, generateAllPeriods } from '../../../lib/utils/agruparTemporal';

// ─── Colores exactos del spec ─────────────────────────────────────────────
const C_COAG = '#ED7D31';
const C_DECO = '#A5A5A5';
const C_POLA = '#FFC000';
const C_CATI = '#5B9BD5';
const C_LINE = '#ED7D31';

// ─── Tooltip dark ─────────────────────────────────────────────────────────
// Tooltip personalizado oscuro: formatea kg removidos con separador de miles
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

// ─── Reagrupar por granularidad ───────────────────────────────────────────
// Promedia los ratios kg/kg y acumula kg removidos agrupando por semana o mes
function reagruparKgQuimico(
  pts: KgQuimicoPoint[],
  gran: Granularidad | null,
  mostrarVacios = false,
  fechaInicio = '',
  fechaFin    = '',
): KgQuimicoPoint[] {
  if (!gran || gran === 'turno' || gran === 'dia') return pts;
  type B = { sk: string; label: string; coag: number[]; deco: number[]; pola: number[]; cati: number[]; kg: number };
  const map = new Map<string, B>();
  for (const p of pts) {
    if (p.sinDatos) continue;
    const sk    = sortKey(p.fecha, undefined, gran);
    const label = xLabel(p.fecha, undefined, gran);
    if (!map.has(sk)) map.set(sk, { sk, label, coag: [], deco: [], pola: [], cati: [], kg: 0 });
    const b = map.get(sk)!;
    if (p.coagulanteRatio  > 0) b.coag.push(p.coagulanteRatio);
    if (p.decoloranteRatio > 0) b.deco.push(p.decoloranteRatio);
    if (p.polAnionicoRatio > 0) b.pola.push(p.polAnionicoRatio);
    if (p.cationicoRatio   > 0) b.cati.push(p.cationicoRatio);
    b.kg += p.kgRemovidos;
  }
  // Rellenar períodos vacíos
  if (mostrarVacios && fechaInicio && fechaFin) {
    for (const { sk, label } of generateAllPeriods(fechaInicio, fechaFin, gran)) {
      if (!map.has(sk)) map.set(sk, { sk, label, coag: [], deco: [], pola: [], cati: [], kg: 0 });
    }
  }
  const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, v) => a + v, 0) / arr.length).toFixed(4) : 0;
  return Array.from(map.values())
    .sort((a, b) => a.sk.localeCompare(b.sk))
    .map(b => ({
      label:            b.label,
      fecha:            b.sk,
      coagulanteRatio:  avg(b.coag),
      decoloranteRatio: avg(b.deco),
      polAnionicoRatio: avg(b.pola),
      cationicoRatio:   avg(b.cati),
      kgRemovidos:      +b.kg.toFixed(2),
      sinDatos:         b.kg === 0 && b.coag.length === 0,
    }));
}

// ─── Props ─────────────────────────────────────────────────────────────────
interface Props { fechaInicio: string; fechaFin: string; granularidad?: Granularidad | null }

// ─── Componente ───────────────────────────────────────────────────────────
// Barras apiladas de ratios kg-químico/kg-removido + línea de kg removidos totales
export default function KgQuimicoSection({ fechaInicio, fechaFin, granularidad: granProp }: Props) {
  const granularidad = granProp;
  // Toggle para mostrar días sin datos en el calendario
  const [mostrarVacios, setMostrarVacios] = useState(false);

  const { data, allData, loading, error } = useKgQuimico(fechaInicio, fechaFin);
  const rawChart  = mostrarVacios ? allData : data;
  // Puntos finales del gráfico aplicando reagrupación por granularidad
  const chartData = useMemo(
    () => reagruparKgQuimico(rawChart, granularidad ?? null, mostrarVacios, fechaInicio, fechaFin),
    [rawChart, granularidad, mostrarVacios, fechaInicio, fechaFin],
  );

  // Rango eje derecho (kg removidos) con margen del 30%
  const kgs    = chartData.map(d => d.kgRemovidos).filter(v => v > 0);
  const maxKg  = kgs.length ? Math.ceil(Math.max(...kgs) * 1.3) : 1400;

  // Rango eje izquierdo (suma máxima de barras apiladas) con margen del 30%
  const sums   = chartData.map(d => d.coagulanteRatio + d.decoloranteRatio + d.polAnionicoRatio + d.cationicoRatio);
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

      {/* ── Toggle días sin datos ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
        <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer',
          fontSize:11, color:'#8b949e', userSelect:'none' }}
          onClick={() => setMostrarVacios(v => !v)}>
          <div style={{ width:30, height:16, borderRadius:8, position:'relative',
            background: mostrarVacios ? '#1f6feb' : '#30363d',
            border:`1px solid ${mostrarVacios ? '#388bfd' : '#484f58'}`,
            transition:'background .2s', flexShrink:0 }}>
            <div style={{ position:'absolute', top:1, width:12, height:12, borderRadius:'50%',
              background: mostrarVacios ? '#fff' : '#8b949e', transition:'left .2s',
              left: mostrarVacios ? 15 : 2 }}/>
          </div>
          Días sin datos
        </label>
      </div>

      {/* ── Gráfico ancho completo ── */}
      {loading ? (
        <div className="cal-loading">Cargando…</div>
      ) : error ? (
        <div className="cal-empty" style={{ color: '#f85149' }}>{error}</div>
      ) : (mostrarVacios ? !chartData.length : !data.length) ? (
        <div className="cal-empty">Sin datos para el período seleccionado</div>
      ) : (
        <div className="dash-card" style={{ padding: '12px 4px 0px' }}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={chartData}
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
