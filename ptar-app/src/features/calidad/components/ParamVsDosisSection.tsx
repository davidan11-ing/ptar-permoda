/**
 * ParamVsDosisSection — PARÁMETRO VS DOSIS DE QUÍMICO
 * Spec: grafico-parametro-dosis/CHART_SPEC.md
 *
 * Colores exactos del Excel:
 *   Entrada GEM (barras): #7030A0 (púrpura)
 *   Salida GEM  (barras): #00B0F0 (azul cielo)
 *   PPM Pol Catiónico:    #4472C4 (azul — NO cambia con el filtro)
 *
 * Comportamiento:
 *   - Dropdown parámetro arriba izquierda (igual RemociónGemSection)
 *   - Al cambiar parámetro → solo se actualizan las barras (entrada/salida)
 *   - La línea PPM Pol Catiónico es FIJA, no responde al filtro
 *   - Etiquetas de valores sin rotación (0°)
 *   - Eje X rotado -60°
 *   - Sin tablas debajo
 */
import { useState, useMemo } from 'react';
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import { useParamVsDosis } from '../hooks/useParamVsDosis';
import { useRemociónGem } from '../hooks/useRemociónGem';

// ─── Colores exactos spec ─────────────────────────────────────────────────
const COLOR_ENTRADA = '#7030A0';   // púrpura
const COLOR_SALIDA  = '#00B0F0';   // azul cielo
const COLOR_PPM     = '#4472C4';   // azul — fijo, no cambia

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
          {p.value != null && p.value !== 0
            ? p.dataKey === 'ppm'
              ? p.value.toFixed(2)
              : p.value.toFixed(2)
            : '—'}
        </p>
      ))}
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────
interface Props { fechaInicio: string; fechaFin: string }

// ─── Componente ───────────────────────────────────────────────────────────
export default function ParamVsDosisSection({ fechaInicio, fechaFin }: Props) {
  const [parametro, setParametro] = useState('');

  // Parámetros disponibles desde la BD (misma fuente que RemociónGemSection)
  const { data: remData } = useRemociónGem('', fechaInicio, fechaFin);
  const parametros = useMemo(() =>
    [...new Set(remData.map(r => r.parametro))].sort(),
  [remData]);

  const param = parametro || parametros[0] || '';

  // Hook: barras cambian con el parámetro, PPM siempre ppm_pol_cationico
  const { data: rawData, loading, error } = useParamVsDosis(
    fechaInicio, fechaFin, param, 'ppm_pol_cationico',
  );

  const chartData = [...rawData]
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.turno.localeCompare(b.turno))
    .map(r => ({
      label:   r.label,
      entrada: r.entrada !== 0 ? r.entrada : null,
      salida:  r.salida  !== 0 ? r.salida  : null,
      ppm:     r.ppm     !== 0 ? r.ppm     : null,
    }));

  // Rango eje PPM derecho
  const ppms   = rawData.map(r => r.ppm).filter((v): v is number => v != null && v > 0);
  const maxPpm = ppms.length ? Math.ceil(Math.max(...ppms) * 1.3) : 40;

  return (
    <section className="dash-section">

      {/* ── Título igual a RemociónGemSection ── */}
      <div style={{
        background: '#1f6feb22', borderLeft: '3px solid #1f6feb',
        padding: '5px 12px', marginBottom: 12, fontSize: 12, fontWeight: 700,
        color: '#58a6ff', letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        PARÁMETRO VS DOSIS DE QUÍMICO
      </div>

      {/* ── Dropdown parámetro — arriba izquierda ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <label className="cal-filter-label" style={{ whiteSpace: 'nowrap' }}>Parámetro</label>
        <select
          className="cal-filter-select"
          value={param}
          onChange={e => setParametro(e.target.value)}
          style={{ minWidth: 240 }}
        >
          {parametros.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="cal-loading">Cargando…</div>
      ) : error ? (
        <div className="cal-empty" style={{ color: '#f85149' }}>{error}</div>
      ) : !chartData.length ? (
        <div className="cal-empty">Sin datos para <strong>{param}</strong></div>
      ) : (
        /* ── Gráfico ancho completo — sin tablas ── */
        <div className="dash-card" style={{ padding: '12px 4px 0px' }}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 55, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />

              {/* Eje X — "DD - TX" rotado -60° igual al Excel */}
              <XAxis
                dataKey="label"
                tick={{ fill: '#8b949e', fontSize: 8 }}
                angle={-60}
                textAnchor="end"
                interval={0}
                height={70}
                tickLine={false}
                axisLine={{ stroke: '#30363d' }}
              />

              {/* Eje Y izquierdo — valor del parámetro (escala automática) */}
              <YAxis
                yAxisId="left"
                orientation="left"
                tick={{ fill: '#8b949e', fontSize: 9 }}
                width={52}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(2)
                }
                label={{
                  value: 'PARÁMETRO DE CALIDAD',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#484f58',
                  fontSize: 8,
                  dx: -4,
                }}
              />

              {/* Eje Y derecho — PPM */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, maxPpm]}
                tick={{ fill: '#4472C4', fontSize: 9 }}
                width={42}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v.toFixed(0)}`}
                label={{
                  value: 'PPM',
                  angle: 90,
                  position: 'insideRight',
                  fill: '#4472C480',
                  fontSize: 8,
                  dx: 12,
                }}
              />

              <Tooltip content={<TooltipCustom />} />
              <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10, paddingTop: 4 }} />

              {/* Barras Entrada — Tanque Homogeneizador — #7030A0 */}
              <Bar
                yAxisId="left"
                dataKey="entrada"
                name="TANQUE HOMOGENEIZADOR (ENTRADA GEM)"
                fill={COLOR_ENTRADA}
                radius={[2, 2, 0, 0]}
                maxBarSize={18}
              >
                <LabelList
                  dataKey="entrada"
                  position="top"
                  style={{ fill: '#c084fc', fontSize: 7, fontFamily: 'monospace' }}
                  formatter={(v: number | null) =>
                    v != null && v > 0 ? v.toFixed(2) : ''
                  }
                />
              </Bar>

              {/* Barras Salida — GEM (Salida) — #00B0F0 */}
              <Bar
                yAxisId="left"
                dataKey="salida"
                name="GEM (SALIDA)"
                fill={COLOR_SALIDA}
                radius={[2, 2, 0, 0]}
                maxBarSize={18}
              >
                <LabelList
                  dataKey="salida"
                  position="top"
                  style={{ fill: '#7dd3fc', fontSize: 7, fontFamily: 'monospace' }}
                  formatter={(v: number | null) =>
                    v != null && v > 0 ? v.toFixed(2) : ''
                  }
                />
              </Bar>

              {/* Línea PPM Pol Catiónico — #4472C4 — fija */}
              <Line
                yAxisId="right"
                type="linear"
                dataKey="ppm"
                name="PPM POL CATIÓNICO"
                stroke={COLOR_PPM}
                strokeWidth={2.25}
                dot={{ r: 5, fill: COLOR_PPM, stroke: COLOR_PPM, strokeWidth: 1 }}
                activeDot={{ r: 7 }}
                connectNulls
              >
                <LabelList
                  dataKey="ppm"
                  position="top"
                  style={{ fill: '#4472C4', fontSize: 7, fontFamily: 'monospace' }}
                  formatter={(v: number | null) =>
                    v != null && v > 0 ? v.toFixed(2) : ''
                  }
                />
              </Line>

            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
