import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, LabelList, ResponsiveContainer,
} from 'recharts';

interface Props {
  values: number[];
  unidad_medida: string;
}

function percentil(sorted: number[], p: number): number {
  if (p === 0)   return sorted[0];
  if (p === 100) return sorted[sorted.length - 1];
  const idx = (p / 100) * (sorted.length - 1);
  const lo  = Math.floor(idx);
  const hi  = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return +(sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo])).toFixed(2);
}

// Spec §3.3: P100 usa 0.999 (no 1.0) igual que PERCENTILE() del Excel
// Spec §5.3: P100 arriba, P10 abajo → array en orden descendente
const PCTS = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];

export default function PercentilChart({ values, unidad_medida }: Props) {
  if (values.length === 0) {
    return <div className="cal-empty">Sin datos para calcular percentiles</div>;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const vMin = sorted[0];
  const vMax = sorted[sorted.length - 1];

  // Dominio X: ligeramente por debajo del mínimo para que las barras sean visibles
  const padding = (vMax - vMin) * 0.08 || 0.5;
  const xMin    = +(vMin - padding).toFixed(2);

  const chartData = PCTS.map(p => ({
    pct:      p === 0 ? 'MIN' : p === 100 ? 'P100' : `P${p}`,
    pctLabel: p === 0 ? '0%'  : p === 100 ? '100%' : `${p}%`,
    // Spec §8.3: P100 usa 0.999 como argumento (no 1.0), igual que PERCENTILE() de Excel
    valor:    percentil(sorted, p === 100 ? 99.9 : p),
  }));

  return (
    <ResponsiveContainer width="100%" height={290}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ top: 4, right: 56, left: 8, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#8b949e', fontSize: 10 }}
          domain={[xMin, (dataMax: number) => +(dataMax * 1.01).toFixed(2)]}
          tickFormatter={(v: number) => v.toFixed(2)}
          label={{ value: unidad_medida, position: 'insideBottom', fill: '#484f58', fontSize: 10, offset: -4 }}
        />
        <YAxis
          type="category"
          dataKey="pctLabel"
          tick={{ fill: '#8b949e', fontSize: 10 }}
          width={38}
        />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }}
          formatter={(val: number, _: string, item) => [
            `${val} ${unidad_medida}`,
            (item?.payload as { pct?: string })?.pct ?? _,
          ]}
          labelFormatter={() => ''}
        />
        <Bar dataKey="valor" fill="#3fb950" radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="valor"
            position="right"
            style={{ fill: '#8b949e', fontSize: 10 }}
            formatter={(v: number) => v.toFixed(2)}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
