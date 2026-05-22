import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
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
  // Regla de Sturges: k = ceil(log2(n)) + 1, mín 4 bins máx 12
  const k    = Math.min(12, Math.max(4, Math.ceil(Math.log2(n)) + 1));
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const width = vMax === vMin ? 1 : (vMax - vMin) / k;

  const bins = Array.from({ length: k }, (_, i) => ({
    label: `${(vMin + i * width).toFixed(1)}–${(vMin + (i + 1) * width).toFixed(1)}`,
    count: 0,
  }));

  for (const v of values) {
    const idx = Math.min(k - 1, Math.floor((v - vMin) / width));
    bins[idx].count++;
  }
  return bins;
}

export default function HistogramaChart({ values, unidad_medida }: Props) {
  if (values.length === 0) {
    return <div className="cal-empty">Sin datos para calcular histograma</div>;
  }

  const bins = calcBins(values);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={bins} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#8b949e', fontSize: 9 }}
          angle={-40}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tick={{ fill: '#8b949e', fontSize: 11 }}
          width={40}
          allowDecimals={false}
          label={{ value: 'N', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }}
        />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }}
          formatter={(val: number) => [`${val} mediciones`, `Rango (${unidad_medida})`]}
          labelFormatter={(v: string) => v}
        />
        <Bar dataKey="count" name="Frecuencia" radius={[3, 3, 0, 0]}>
          {bins.map((_, i) => (
            <Cell key={i} fill={BIN_COLORS[i % BIN_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
