/**
 * RemocionGemWidget — versión compacta para el KPI Dashboard
 * Muestra Entrada/Salida GEM (barras) + % Remoción (línea) por día
 * Tiene selector de parámetro propio (pH por default).
 */
import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import { getCalidadRemociones, type RemocionCalidad } from '../../../services/ptarClient';

interface Props { fechaInicio: string; fechaFin: string; }

const COLOR_ENTRADA = '#1f6feb';
const COLOR_SALIDA  = '#8b5cf6';
const COLOR_PCT     = '#3fb950';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function fmtFecha(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${MESES[parseInt(m, 10) - 1]}`;
}

interface DayRow {
  label: string;
  entrada:    number | null;
  salida:     number | null;
  eficiencia: number | null;
}

function avg(arr: number[]): number | null {
  if (!arr.length) return null;
  return +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
}

export default function RemocionGemWidget({ fechaInicio, fechaFin }: Props) {
  const [rows,    setRows]    = useState<RemocionCalidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [param,   setParam]   = useState('');

  // Cargar todas las remociones del rango
  useEffect(() => {
    setLoading(true);
    setError(null);
    getCalidadRemociones({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })
      .then(data => {
        setRows(data);
        // Seleccionar primer parámetro disponible (pH preferido)
        const params = [...new Set(data.map(r => r.parametro))].sort();
        setParam(prev => {
          if (prev && params.includes(prev)) return prev;
          return params.find(p => p.toLowerCase().includes('ph')) ?? params[0] ?? '';
        });
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [fechaInicio, fechaFin]);

  // Parámetros únicos disponibles
  const parametros = useMemo(() => [...new Set(rows.map(r => r.parametro))].sort(), [rows]);

  // Datos filtrados al parámetro activo, agrupados por día
  const data: DayRow[] = useMemo(() => {
    const filtered = rows.filter(r => r.parametro === param);
    const map = new Map<string, { ent: number[]; sal: number[]; pct: number[] }>();
    for (const r of filtered) {
      const key = r.fecha.slice(0, 10);
      const prev = map.get(key) ?? { ent: [], sal: [], pct: [] };
      if (r.pulmon          != null) prev.ent.push(r.pulmon);
      if (r.gem_salida      != null) prev.sal.push(r.gem_salida);
      if (r.pct_remocion_gem != null) prev.pct.push(r.pct_remocion_gem);
      map.set(key, prev);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, v]) => ({
        label:      fmtFecha(fecha),
        entrada:    avg(v.ent),
        salida:     avg(v.sal),
        eficiencia: avg(v.pct),
      }));
  }, [rows, param]);

  const unit = useMemo(() => rows.find(r => r.parametro === param)?.parametro_unidad ?? '', [rows, param]);

  if (loading) return <div style={styles.center}>Cargando...</div>;
  if (error)   return <div style={styles.center}>Error: {error}</div>;

  return (
    <div>
      {/* Selector de parámetro compacto */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, paddingLeft: 4 }}>
        <span style={{ fontSize: 10, color: '#8b949e', whiteSpace: 'nowrap' }}>Parámetro:</span>
        <select
          value={param}
          onChange={e => setParam(e.target.value)}
          style={{
            background: '#161b22', color: '#c9d1d9', border: '1px solid #30363d',
            borderRadius: 4, fontSize: 10, padding: '2px 6px', cursor: 'pointer',
          }}
        >
          {parametros.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {!data.length ? (
        <div style={styles.center}>Sin datos para <strong style={{ marginLeft: 4 }}>{param}</strong></div>
      ) : (
        <ResponsiveContainer width="100%" height={270}>
          <ComposedChart data={data} margin={{ top: 16, right: 50, bottom: 44, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#8b949e', fontSize: 9 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={58}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#8b949e', fontSize: 10 }}
              width={46}
              tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
              label={{ value: unit, angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 9, dx: -4 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#3fb950', fontSize: 10 }}
              width={44}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              label={{ value: '% Rem.', angle: 90, position: 'insideRight', fill: '#3fb95080', fontSize: 9, dx: 12 }}
            />
            <Tooltip
              contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6, fontSize: 11 }}
              labelStyle={{ color: '#e6edf3', fontWeight: 600 }}
              formatter={(value: number, name: string) => [
                value == null ? '—'
                  : name === 'Remoción %' ? `${value.toFixed(1)}%`
                  : `${value.toFixed(2)} ${unit}`,
                name,
              ]}
            />
            <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />

            <Bar yAxisId="left" dataKey="entrada" name="Entrada GEM"
              fill={COLOR_ENTRADA} radius={[2, 2, 0, 0]} maxBarSize={20}>
              <LabelList dataKey="entrada" position="top"
                style={{ fill: '#58a6ff', fontSize: 7 }}
                formatter={(v: number | null) => v == null ? '' : v.toFixed(1)} />
            </Bar>
            <Bar yAxisId="left" dataKey="salida" name="Salida GEM"
              fill={COLOR_SALIDA} radius={[2, 2, 0, 0]} maxBarSize={20}>
              <LabelList dataKey="salida" position="top"
                style={{ fill: '#a78bfa', fontSize: 7 }}
                formatter={(v: number | null) => v == null ? '' : v.toFixed(1)} />
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="eficiencia"
              name="Remoción %"
              stroke={COLOR_PCT}
              strokeWidth={2}
              dot={{ r: 2, fill: COLOR_PCT }}
              activeDot={{ r: 4 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

const styles = {
  center: {
    height: 270,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8b949e',
    fontSize: 13,
  } as React.CSSProperties,
};
