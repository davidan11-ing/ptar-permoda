/**
 * CargaRemovoidaSection — Carga removida Kg/Día
 * Spec: App-Ptar/grafico-carga-removida-sst/CHART_SPEC.md
 *
 * Colores exactos del spec:
 *   Barras:  #7B3611 (café oscuro — accent2 con chart style 102)
 *   Línea:   #ED7D31 (naranja — accent2 directo)
 *
 * Layout:
 *   Fila superior: [Parámetro ▼] [FechaInicio] [FechaFin]  |  KPI total
 *   Gráfico ancho completo (width="100%")
 */
import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import { useCargaRemovida, type CargaRemovPoint } from '../hooks/useCargaRemovida';
import { getCalidadParametros } from '../../../services/ptarClient';
import type { Granularidad } from '../../../hooks/useGranularidad';
import { xLabel, sortKey, generateAllPeriods } from '../../../lib/utils/agruparTemporal';

// ─── Colores ───────────────────────────────────────────────────────────────
const COLOR_BAR  = '#7B3611';   // café oscuro — KG removidos
const COLOR_LINE = '#ED7D31';   // naranja — indicador kg/m³

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
          {p.name === 'kgRemovidos'
            ? `KG removidos: ${p.value?.toLocaleString('es-CO', { maximumFractionDigits: 0 })} kg`
            : `Indicador: ${p.value?.toFixed(2)} kg/m³`}
        </p>
      ))}
    </div>
  );
}

// ─── Reagrupar por granularidad ───────────────────────────────────────────
function reagruparCarga(
  pts: CargaRemovPoint[],
  gran: Granularidad | null,
  mostrarVacios = false,
  fechaInicio = '',
  fechaFin    = '',
): CargaRemovPoint[] {
  if (!gran || gran === 'turno' || gran === 'dia') return pts;
  type B = { sk: string; kgSum: number; indArr: number[]; label: string };
  const map = new Map<string, B>();
  for (const p of pts) {
    if (p.sinDatos) continue;
    const sk    = sortKey(p.fecha, undefined, gran);
    const label = xLabel(p.fecha, undefined, gran);
    if (!map.has(sk)) map.set(sk, { sk, kgSum: 0, indArr: [], label });
    const b = map.get(sk)!;
    b.kgSum += p.kgRemovidos;
    if (p.indicadorKgM3 > 0) b.indArr.push(p.indicadorKgM3);
  }
  // Rellenar períodos vacíos
  if (mostrarVacios && fechaInicio && fechaFin) {
    for (const { sk, label } of generateAllPeriods(fechaInicio, fechaFin, gran)) {
      if (!map.has(sk)) map.set(sk, { sk, kgSum: 0, indArr: [], label });
    }
  }
  const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, v) => a + v, 0) / arr.length).toFixed(4) : 0;
  return Array.from(map.values())
    .sort((a, b) => a.sk.localeCompare(b.sk))
    .map(b => ({
      label:         b.label,
      fecha:         b.sk,
      kgRemovidos:   +b.kgSum.toFixed(2),
      indicadorKgM3: avg(b.indArr),
      sinDatos:      b.kgSum === 0,
    }));
}

// ─── Props ─────────────────────────────────────────────────────────────────
interface Props { fechaInicio: string; fechaFin: string; granularidad?: Granularidad | null }

// ─── Componente ───────────────────────────────────────────────────────────
// Orden preferido: SST primero, DQO segundo, resto alfabético
function ordenarParametros(lista: string[]): string[] {
  const PREF = ['Sólidos suspendidos Totales', 'SST', 'Demanda química de oxígeno (DQO)', 'DQO'];
  const pref  = PREF.filter(p => lista.includes(p));
  const resto = lista.filter(p => !PREF.includes(p)).sort();
  return [...pref, ...resto];
}

export default function CargaRemovoidaSection({ fechaInicio: propFI, fechaFin: propFF, granularidad }: Props) {
  const [parametro,     setParametro]     = useState('');
  const [mostrarVacios, setMostrarVacios] = useState(false);

  // Catálogo: SST primero, DQO segundo, resto alfabético
  const [parametrosRaw, setParametrosRaw] = useState<string[]>([]);
  useEffect(() => {
    getCalidadParametros().then(rows => {
      setParametrosRaw(rows.map((r: any) => r.nombre));
    }).catch(() => {});
  }, []);

  const parametros = useMemo(() => ordenarParametros(parametrosRaw), [parametrosRaw]);
  const param = parametro || parametros[0] || '';

  const { data, allData, totalKg, loading, error } = useCargaRemovida(propFI, propFF, param);
  const rawChart  = mostrarVacios ? allData : data;
  const chartData = useMemo(
    () => reagruparCarga(rawChart, granularidad ?? null, mostrarVacios, propFI, propFF),
    [rawChart, granularidad, mostrarVacios, propFI, propFF],
  );

  // Rango eje derecho
  const inds   = chartData.map(d => d.indicadorKgM3).filter(v => v > 0);
  const maxInd = inds.length ? Math.ceil(Math.max(...inds) * 1.4) : 15;

  return (
    <section className="dash-section">

      {/* ── Título ── */}
      <div style={{
        background: '#1f6feb22', borderLeft: '3px solid #1f6feb',
        padding: '5px 12px', marginBottom: 12, fontSize: 12, fontWeight: 700,
        color: '#58a6ff', letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        CARGA REMOVIDA KG/DÍA DE DQO, SST REMOVIDA
      </div>

      {/* ── Fila superior: filtros + KPI ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        gap: 16, marginBottom: 14, flexWrap: 'wrap',
      }}>

        {/* Filtros izquierda */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          <label className="cal-filter-label" style={{ whiteSpace: 'nowrap' }}>Parámetro</label>
          <select
            className="cal-filter-select"
            value={param}
            onChange={e => setParametro(e.target.value)}
            style={{ minWidth: 220 }}
          >
            {parametros.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Toggle días sin datos */}
          <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer',
            fontSize:11, color:'#8b949e', userSelect:'none', whiteSpace:'nowrap' }}
            onClick={() => setMostrarVacios(v => !v)}>
            <div style={{
              width:30, height:16, borderRadius:8, position:'relative',
              background: mostrarVacios ? '#1f6feb' : '#30363d',
              border: `1px solid ${mostrarVacios ? '#388bfd' : '#484f58'}`,
              transition:'background .2s', flexShrink:0,
            }}>
              <div style={{
                position:'absolute', top:1, width:12, height:12, borderRadius:'50%',
                background: mostrarVacios ? '#fff' : '#8b949e', transition:'left .2s',
                left: mostrarVacios ? 15 : 2,
              }}/>
            </div>
            Días/turnos sin datos
          </label>
        </div>

        {/* KPI card derecha */}
        <div className="dash-card" style={{
          padding: '7px 14px', minWidth: 140, textAlign: 'center', flexShrink: 0,
          borderLeft: `3px solid ${COLOR_BAR}`,
        }}>
          <div style={{
            fontSize: 8, fontWeight: 700, color: '#8b949e',
            letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4,
            lineHeight: 1.3,
          }}>
            TOTAL KG {param ? param.split('(')[0].trim().toUpperCase() : ''} REMOVIDOS
          </div>
          <div style={{
            fontSize: 18, fontWeight: 700,
            color: loading ? '#484f58' : COLOR_LINE,
            fontFamily: 'monospace', lineHeight: 1,
          }}>
            {loading ? '…' : `${totalKg.toLocaleString('es-CO', { maximumFractionDigits: 0 })} kg`}
          </div>
        </div>
      </div>

      {/* ── Gráfico ancho completo ── */}
      {loading ? (
        <div className="cal-loading">Cargando…</div>
      ) : error ? (
        <div className="cal-empty" style={{ color: '#f85149' }}>{error}</div>
      ) : !data.length ? (
        <div className="cal-empty">Sin datos para <strong>{param}</strong></div>
      ) : (
        <div className="dash-card" style={{ padding: '12px 4px 0px' }}>
          <div style={{
            fontSize: 11, color: '#8b949e', textAlign: 'center',
            marginBottom: 4, fontFamily: 'monospace',
          }}>
            Kg removidos Vs Kg removido/m³
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 20, right: 55, left: 10, bottom: 10 }}>

              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />

              {/* Eje X — fechas "DD/MM" rotadas -60° */}
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

              {/* Eje Y izquierdo — KG removidos */}
              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{ fill: '#8b949e', fontSize: 9 }}
                width={60}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                label={{
                  value: 'KG REMOVIDOS',
                  angle: -90, position: 'insideLeft',
                  fill: '#484f58', fontSize: 8, dx: -4,
                }}
              />

              {/* Eje Y derecho — Indicador kg/m³ */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, maxInd]}
                tick={{ fill: COLOR_LINE, fontSize: 9 }}
                width={42}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => v.toFixed(0)}
                label={{
                  value: 'Kg/m³',
                  angle: 90, position: 'insideRight',
                  fill: '#ED7D3180', fontSize: 8, dx: 12,
                }}
              />

              <Tooltip content={<TooltipCustom />} />
              <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10, paddingTop: 4 }} />

              {/* Barras café — KG removidos/día */}
              <Bar
                yAxisId="left"
                dataKey="kgRemovidos"
                name="KG REMOVIDOS"
                fill={COLOR_BAR}
                radius={[2, 2, 0, 0]}
                maxBarSize={30}
              >
                <LabelList
                  dataKey="kgRemovidos"
                  position="top"
                  style={{ fill: '#c9a87c', fontSize: 8, fontFamily: 'monospace' }}
                  formatter={(v: number) =>
                    v > 0 ? v.toLocaleString('es-CO', { maximumFractionDigits: 0 }) : ''
                  }
                />
              </Bar>

              {/* Línea naranja — indicador Kg/m³ */}
              <Line
                yAxisId="right"
                type="linear"
                dataKey="indicadorKgM3"
                name="INDICADOR KG REMOVIDOS/M³"
                stroke={COLOR_LINE}
                strokeWidth={2.25}
                dot={{ r: 5, fill: COLOR_LINE, stroke: COLOR_LINE, strokeWidth: 1 }}
                activeDot={{ r: 7 }}
                connectNulls
              >
                <LabelList
                  dataKey="indicadorKgM3"
                  position="top"
                  style={{ fill: COLOR_LINE, fontSize: 8, fontFamily: 'monospace' }}
                  formatter={(v: number) => v > 0 ? v.toFixed(1) : ''}
                />
              </Line>

            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
