import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface Props {
  values: number[];
  unidad_medida: string;
}

// Mismos colores que el histograma: rojo → amarillo → verde → morado → azul
const BIN_COLORS = [
  '#c0392b', // RANGO1 — rojo ladrillo
  '#d4a017', // RANGO2 — amarillo dorado
  '#27ae60', // RANGO3 — verde
  '#7d3c98', // RANGO4 — morado
  '#2980b9', // RANGO5 — azul
];

const N_RANGOS = 5; // Fijo: exactamente 5 rangos según tabla

function calcBins(values: number[]) {
  if (values.length === 0) return [];
  const n    = values.length;
  const k    = N_RANGOS;
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const width = vMax === vMin ? 1 : (vMax - vMin) / k;

  const bins = Array.from({ length: k }, (_, i) => ({
    name:  `(${(vMin + i * width).toFixed(2)} - ${(vMin + (i + 1) * width).toFixed(2)})`,
    count: 0,
  }));

  for (const v of values) {
    const idx = Math.min(k - 1, Math.floor((v - vMin) / width));
    bins[idx].count++;
  }

  return bins.filter(b => b.count > 0).map(b => ({
    ...b,
    pct: +((b.count / n) * 100).toFixed(1),
  }));
}

const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, pct }: {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number; pct: number;
}) => {
  if (pct < 5) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#e6edf3" textAnchor="middle" dominantBaseline="central" fontSize={11}>
      {`${pct}%`}
    </text>
  );
};

export default function PieDistribucionChart({ values, unidad_medida }: Props) {
  if (values.length === 0) {
    return <div className="cal-empty">Sin datos para calcular distribución</div>;
  }

  const bins = calcBins(values);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={bins}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="45%"
          outerRadius={90}
          labelLine={false}
          label={renderLabel}
        >
          {bins.map((_, i) => (
            <Cell key={i} fill={BIN_COLORS[i % BIN_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }}
          formatter={(val: number, name: string) => [
            `${val} mediciones`,
            `${name} ${unidad_medida}`,
          ]}
        />
        <Legend
          wrapperStyle={{ color: '#8b949e', fontSize: 10, paddingTop: 4 }}
          formatter={(v: string) => (v.length > 20 ? v.slice(0, 20) + '…' : v)}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
