import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from 'recharts';

interface Props {
  values: number[];
  unidad_medida: string;
}

function percentil(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo  = Math.floor(idx);
  const hi  = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return +(sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo])).toFixed(2);
}

const PCT_COLORS: Record<string, string> = {
  P10: '#1f6feb',
  P25: '#3fb950',
  P50: '#d29922',
  P75: '#f0883e',
  P90: '#f85149',
};

export default function PercentilChart({ values, unidad_medida }: Props) {
  if (values.length === 0) {
    return <div className="cal-empty">Sin datos para calcular percentiles</div>;
  }

  const sorted = [...values].sort((a, b) => a - b);

  const chartData = [
    { pct: 'P10', valor: percentil(sorted, 10) },
    { pct: 'P25', valor: percentil(sorted, 25) },
    { pct: 'P50', valor: percentil(sorted, 50) },
    { pct: 'P75', valor: percentil(sorted, 75) },
    { pct: 'P90', valor: percentil(sorted, 90) },
  ];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 8, right: 60, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#8b949e', fontSize: 11 }}
          domain={[0, (dataMax: number) => +(dataMax * 1.15).toFixed(2)]}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v % 1 === 0 ? String(v) : v.toFixed(1)
          }
          label={{ value: unidad_medida, position: 'insideBottom', fill: '#484f58', fontSize: 10, offset: -2 }}
        />
        <YAxis
          type="category"
          dataKey="pct"
          tick={{ fill: '#8b949e', fontSize: 12 }}
          width={40}
        />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }}
          formatter={(val: number, _: string, item) => [
            `${val} ${unidad_medida}`,
            (item?.payload as { pct?: string })?.pct ?? _,
          ]}
          labelFormatter={() => ''}
        />
        <Bar
          dataKey="valor"
          radius={[0, 4, 4, 0]}
          label={{ position: 'right', fill: '#8b949e', fontSize: 11, formatter: (v: number) => v }}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={PCT_COLORS[entry.pct] ?? '#8b949e'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
