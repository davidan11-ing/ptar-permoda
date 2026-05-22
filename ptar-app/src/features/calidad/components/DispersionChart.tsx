import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { DispersionRow } from '../hooks/useDispersionData';

interface Props {
  data: DispersionRow[];
  unidadFiltrada: string; // nombre exacto de unidad, o 'ALL' para todas
  unidad_medida: string;
}

/**
 * Muestra mínimo, máximo y promedio a lo largo del tiempo para una unidad dada.
 * Si unidadFiltrada='ALL' muestra el promedio agregado de todas las unidades.
 */
export default function DispersionChart({ data, unidadFiltrada, unidad_medida }: Props) {
  if (data.length === 0) {
    return <div className="cal-empty">Sin datos de dispersión para el período</div>;
  }

  // Filtrar por unidad o agregar todas
  let filtered = data;
  if (unidadFiltrada !== 'ALL') {
    filtered = data.filter(r => r.unidad_tratamiento === unidadFiltrada);
  }

  // Agrupar por fecha (puede haber múltiples unidades por fecha)
  const byFecha = new Map<string, { minimos: number[]; maximos: number[]; promedios: number[] }>();
  for (const r of filtered) {
    if (!byFecha.has(r.fecha)) byFecha.set(r.fecha, { minimos: [], maximos: [], promedios: [] });
    const entry = byFecha.get(r.fecha)!;
    entry.minimos.push(r.minimo);
    entry.maximos.push(r.maximo);
    entry.promedios.push(r.promedio);
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const chartData = Array.from(byFecha.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, { minimos, maximos, promedios }]) => ({
      fecha: fecha.slice(5), // MM-DD
      fechaFull: fecha,
      minimo:   +avg(minimos).toFixed(2),
      maximo:   +avg(maximos).toFixed(2),
      promedio: +avg(promedios).toFixed(2),
    }));

  if (chartData.length === 0) {
    return <div className="cal-empty">Sin datos para la unidad seleccionada</div>;
  }

  const formatFecha = (f: string) => {
    const parts = f.split('-');
    return parts.length === 2 ? `${parts[1]}/${parts[0]}` : f;
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
        <XAxis
          dataKey="fecha"
          tickFormatter={formatFecha}
          tick={{ fill: '#8b949e', fontSize: 10 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#8b949e', fontSize: 11 }}
          width={52}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v % 1 === 0 ? String(v) : v.toFixed(1)
          }
          label={{ value: unidad_medida, angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }}
        />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#e6edf3', marginBottom: 4 }}
          labelFormatter={(v: string) => `Fecha: ${v}`}
          formatter={(val: number, name: string) => [`${val} ${unidad_medida}`, name]}
        />
        <Legend wrapperStyle={{ color: '#8b949e', fontSize: 11, paddingTop: 8 }} />
        <Line type="monotone" dataKey="minimo"   name="Mínimo"   stroke="#f85149" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="maximo"   name="Máximo"   stroke="#3fb950" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="promedio" name="Promedio" stroke="#d29922" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
