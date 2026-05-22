import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { RawRow } from '../hooks/useCalidadData';
import { UNIDAD_COLORES } from '../hooks/useCalidadData';

interface Props {
  data: RawRow[];
  unidades: string[];
  unidad_medida: string;
  tipo?: 'line' | 'bar';
}

/**
 * Muestra todos los registros turno a turno (índice secuencial en eje X),
 * una serie por unidad de tratamiento.
 */
export default function TurnoAturnoChart({
  data,
  unidades,
  unidad_medida,
  tipo = 'line',
}: Props) {
  if (data.length === 0 || unidades.length === 0) {
    return <div className="cal-empty">Sin datos para el período seleccionado</div>;
  }

  // Agrupar por (fecha, turno) — orden cronológico
  const ordered = [...data].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
    return a.turno.localeCompare(b.turno);
  });

  // Pivotear: un punto por (fecha+turno), columnas = unidades
  const chartMap = new Map<string, Record<string, number | string>>();
  for (const r of ordered) {
    const key = `${r.fecha}|${r.turno}`;
    if (!chartMap.has(key)) {
      chartMap.set(key, { label: `${r.fecha.slice(5)} ${r.turno.slice(0, 3)}` });
    }
    const row = chartMap.get(key)!;
    if (row[r.unidad_tratamiento] == null) {
      row[r.unidad_tratamiento] = r.valor;
    } else {
      // Promedia si hay múltiples valores por turno
      row[r.unidad_tratamiento] = +((Number(row[r.unidad_tratamiento]) + r.valor) / 2).toFixed(2);
    }
  }
  const chartData = Array.from(chartMap.values());

  const commonProps = {
    data: chartData,
    margin: { top: 8, right: 24, left: 0, bottom: 0 },
  };

  const xAxis = (
    <XAxis
      dataKey="label"
      tick={{ fill: '#8b949e', fontSize: 10 }}
      interval={Math.max(0, Math.floor(chartData.length / 12) - 1)}
    />
  );
  const yAxis = (
    <YAxis
      tick={{ fill: '#8b949e', fontSize: 11 }}
      width={52}
      tickFormatter={(v: number) =>
        v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v % 1 === 0 ? String(v) : v.toFixed(1)
      }
      label={{ value: unidad_medida, angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }}
    />
  );
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />;
  const tooltip = (
    <Tooltip
      contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }}
      labelStyle={{ color: '#e6edf3', marginBottom: 4 }}
      formatter={(val: number, name: string) => [`${val} ${unidad_medida}`, name]}
    />
  );
  const legend = (
    <Legend
      wrapperStyle={{ color: '#8b949e', fontSize: 11, paddingTop: 8 }}
      formatter={(v: string) => (v.length > 24 ? v.slice(0, 24) + '…' : v)}
    />
  );

  if (tipo === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart {...commonProps}>
          {grid}{xAxis}{yAxis}{tooltip}{legend}
          {unidades.map(u => (
            <Bar key={u} dataKey={u} fill={UNIDAD_COLORES[u] ?? '#8b949e'} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart {...commonProps}>
        {grid}{xAxis}{yAxis}{tooltip}{legend}
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
