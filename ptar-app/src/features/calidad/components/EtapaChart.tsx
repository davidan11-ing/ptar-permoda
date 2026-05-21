import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from 'recharts';
import type { SummaryRow } from '../hooks/useCalidadData';

interface Props {
  summary: SummaryRow[];
  unidad_medida: string;
}

export default function EtapaChart({ summary, unidad_medida }: Props) {
  if (summary.length === 0) {
    return <div className="cal-empty">Sin datos para el período seleccionado</div>;
  }

  const data = summary.map(s => ({
    unidad: s.unidad.length > 22 ? s.unidad.slice(0, 22) + '…' : s.unidad,
    unidadFull: s.unidad,
    avg: s.avg,
    color: s.color,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 36)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#8b949e', fontSize: 11 }}
          domain={[0, (dataMax: number) => +(dataMax * 1.18).toFixed(2)]}
          tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v % 1 === 0 ? String(v) : v.toFixed(1)}
          label={{ value: unidad_medida, position: 'insideBottom', fill: '#484f58', fontSize: 10, offset: -2 }}
        />
        <YAxis
          type="category"
          dataKey="unidad"
          tick={{ fill: '#8b949e', fontSize: 11 }}
          width={148}
        />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }}
          formatter={(val: number, _: string, item) => [
            `${val} ${unidad_medida}`,
            (item?.payload as { unidadFull?: string })?.unidadFull ?? _,
          ]}
          labelFormatter={() => ''}
        />
        <Bar dataKey="avg" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#8b949e', fontSize: 11, formatter: (v: number) => v }}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
