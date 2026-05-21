import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { TendenciaRow } from '../hooks/useCalidadData';
import { UNIDAD_COLORES } from '../hooks/useCalidadData';

interface Props {
  data: TendenciaRow[];
  unidades: string[];
  unidad_medida: string;
}

export default function TendenciaChart({ data, unidades, unidad_medida }: Props) {
  if (data.length === 0) {
    return <div className="cal-empty">Sin datos para el período seleccionado</div>;
  }

  const formatFecha = (f: string) => {
    if (!f) return '';
    const [, m, d] = f.split('-');
    return `${d}/${m}`;
  };

  // Dominio Y: auto, protegido contra el caso min=max (dato único)
  const allVals: number[] = data.flatMap(row =>
    unidades.map(u => row[u] as number).filter(v => v != null && !isNaN(v))
  );
  const dMin = allVals.length > 0 ? Math.min(...allVals) : 0;
  const dMax = allVals.length > 0 ? Math.max(...allVals) : 1;
  const yDomain: [number | string, number | string] =
    dMin === dMax
      ? [+(dMin * 0.9).toFixed(2), +(dMax * 1.1).toFixed(2)]
      : ['auto', 'auto'];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
        <XAxis
          dataKey="fecha"
          tickFormatter={formatFecha}
          tick={{ fill: '#8b949e', fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#8b949e', fontSize: 11 }}
          width={52}
          domain={yDomain}
          tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v % 1 === 0 ? String(v) : v.toFixed(1)}
          label={{ value: unidad_medida, angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }}
        />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#e6edf3', marginBottom: 4 }}
          labelFormatter={(v: string) => `Fecha: ${v}`}
          formatter={(val: number, name: string) => [`${val} ${unidad_medida}`, name]}
        />
        <Legend
          wrapperStyle={{ color: '#8b949e', fontSize: 11, paddingTop: 8 }}
          formatter={(v: string) => v.length > 28 ? v.slice(0, 28) + '…' : v}
        />
        {unidades.map(u => (
          <Line
            key={u}
            type="monotone"
            dataKey={u}
            stroke={UNIDAD_COLORES[u] ?? '#8b949e'}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
