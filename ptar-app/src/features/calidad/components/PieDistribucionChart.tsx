import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface Props {
  values: number[];
  unidad_medida: string;
}

const BIN_COLORS = [
  '#1f6feb', '#3fb950', '#d29922', '#f0883e', '#9e7aff',
  '#58a6ff', '#e3b341', '#f85149',
];

function calcBins(values: number[]) {
  if (values.length === 0) return [];
  const n    = values.length;
  const k    = Math.min(12, Math.max(4, Math.ceil(Math.log2(n)) + 1));
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const width = vMax === vMin ? 1 : (vMax - vMin) / k;

  const bins = Array.from({ length: k }, (_, i) => ({
    name:  `${(vMin + i * width).toFixed(1)}–${(vMin + (i + 1) * width).toFixed(1)}`,
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
