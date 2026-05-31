import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useRemocionCosto } from '../hooks/useRemocionCosto';

// ─── Colores ───────────────────────────────────────────────────────────────
const COLOR_BAR  = '#ED7D31';   // naranja — costo $/m³
const COLOR_LINE = '#70AD47';   // verde   — % remoción pH

// ─── Label rotado -90° para las barras (costo $/m³) ───────────────────────
function LabelBarra(props: any) {
  const { x, y, width, value } = props;
  if (!value || value === 0) return null;
  const cx = x + width / 2;
  const cy = y + 6;
  return (
    <text
      x={cx} y={cy}
      transform={`rotate(-90,${cx},${cy})`}
      textAnchor="start"
      fill="#8b949e"
      fontSize={9}
      fontFamily="monospace"
    >
      {`$ ${Math.round(value).toLocaleString('es-CO')}`}
    </text>
  );
}

// ─── Label rotado -90° para la línea (% remoción) ─────────────────────────
function LabelLinea(props: any) {
  const { x, y, value } = props;
  if (value === undefined || value === null || value === 0) return null;
  return (
    <text
      x={x} y={y - 6}
      transform={`rotate(-90,${x},${y - 6})`}
      textAnchor="start"
      fill="#8b949e"
      fontSize={9}
      fontFamily="monospace"
    >
      {`${(value * 100).toFixed(1)}%`}
    </text>
  );
}

// ─── Tooltip personalizado dark ───────────────────────────────────────────
function TooltipCustom({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#161b22', border: '1px solid #30363d',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
    }}>
      <p style={{ color: '#8b949e', marginBottom: 4, fontWeight: 600 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, margin: '2px 0' }}>
          {p.name === 'costoM3'
            ? `$/m³: $ ${Math.round(p.value).toLocaleString('es-CO')}`
            : `Remoción: ${(p.value * 100).toFixed(1)}%`
          }
        </p>
      ))}
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────
interface Props {
  fechaInicio: string;
  fechaFin:    string;
  parametro?:  string;
}

// ─── Componente principal ──────────────────────────────────────────────────
export default function RemocionCostoChart({ fechaInicio, fechaFin, parametro }: Props) {
  const { data, loading, error } = useRemocionCosto(fechaInicio, fechaFin, parametro);

  if (loading) return (
    <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#484f58', fontSize: 13 }}>
      Cargando datos…
    </div>
  );

  if (error) return (
    <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f85149', fontSize: 13 }}>
      {error}
    </div>
  );

  if (!data.length) return (
    <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#484f58', fontSize: 13 }}>
      Sin datos para el período seleccionado
    </div>
  );

  // Rango eje izquierdo: mín/máx redondeado ± margen
  const rems    = data.map(d => d.remocion).filter(v => v !== 0);
  const minRem  = rems.length ? Math.min(...rems) : -0.1;
  const maxRem  = rems.length ? Math.max(...rems) :  0.15;
  const yLMin   = Math.floor((minRem - 0.02) * 20) / 20;   // paso 5%
  const yLMax   = Math.ceil ((maxRem + 0.02) * 20) / 20;

  // Rango eje derecho
  const costos  = data.map(d => d.costoM3).filter(v => v > 0);
  const maxCosto = costos.length ? Math.max(...costos) : 5000;
  const yRMax   = Math.ceil(maxCosto / 500) * 500 + 500;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 40, right: 0, left: 5, bottom:20 }}>

        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />

        {/* Eje X — etiquetas "DD - TX" rotadas */}
        <XAxis
          dataKey="label"
          tick={{ fill: '#8b949e', fontSize: 9, fontFamily: 'monospace' }}
          angle={-60}
          textAnchor="end"
          interval={0}
          height={50}
          tickLine={false}
          axisLine={{ stroke: '#30363d' }}
        />

        {/* Eje Y izquierdo — % Remoción */}
        <YAxis
          yAxisId="left"
          orientation="left"
          domain={[yLMin, yLMax]}
          tickFormatter={v => `${(v * 100).toFixed(0)}%`}
          tick={{ fill: '#8b949e', fontSize: 9, fontFamily: 'monospace' }}
          tickLine={false}
          axisLine={false}
          width={44}
        />

        {/* Eje Y derecho — $/m³ */}
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, yRMax]}
          tickFormatter={v => `$ ${Math.round(v).toLocaleString('es-CO')}`}
          tick={{ fill: '#8b949e', fontSize: 9, fontFamily: 'monospace' }}
          tickLine={{ stroke: '#30363d' }}
          axisLine={false}
          width={70}
        />

        <Tooltip content={<TooltipCustom />} />

        <Legend
          verticalAlign="bottom"
          wrapperStyle={{ paddingTop: 12, fontSize: 9, color: '#8b949e', fontFamily: 'monospace' }}
          formatter={(value) => value === 'costoM3' ? '$ m3' : 'REMOCIÓN POR PARÁMETRO'}
        />

        {/* Barras — $/m³ (eje derecho) */}
        <Bar
          yAxisId="right"
          dataKey="costoM3"
          name="costoM3"
          fill={COLOR_BAR}
          barSize={8}
          radius={[2, 2, 0, 0]}
          label={<LabelBarra />}
        />

        {/* Línea — % Remoción pH (eje izquierdo) */}
        <Line
          yAxisId="left"
          type="linear"
          dataKey="remocion"
          name="remocion"
          stroke={COLOR_LINE}
          strokeWidth={2}
          dot={{ r: 3, fill: COLOR_LINE, stroke: COLOR_LINE }}
          activeDot={{ r: 5 }}
          label={<LabelLinea />}
        />

      </ComposedChart>
    </ResponsiveContainer>
  );
}
