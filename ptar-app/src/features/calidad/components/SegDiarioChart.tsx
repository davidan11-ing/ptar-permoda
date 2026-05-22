import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { RawRow } from '../hooks/useCalidadData';
import { TURNO_COLORES } from '../hooks/useCalidadData';

interface Props {
  data: RawRow[];
  unidad_medida: string;
}

/**
 * Seguimiento diario agrupado por (fecha × turno).
 * BarChart agrupado: eje X = fecha, 3 barras por fecha (noche/mañana/tarde).
 * Muestra el promedio de todas las unidades en ese turno/fecha.
 */
export default function SegDiarioChart({ data, unidad_medida }: Props) {
  if (data.length === 0) {
    return <div className="cal-empty">Sin datos para el período seleccionado</div>;
  }

  const formatFecha = (f: string) => {
    const [, m, d] = f.split('-');
    return `${d}/${m}`;
  };

  // Agrupar por (fecha, turno) — promedio de todas las unidades
  const map = new Map<string, Map<string, number[]>>();
  for (const r of data) {
    if (!map.has(r.fecha)) map.set(r.fecha, new Map());
    const byTurno = map.get(r.fecha)!;
    if (!byTurno.has(r.turno)) byTurno.set(r.turno, []);
    byTurno.get(r.turno)!.push(r.valor);
  }

  const avg = (arr: number[]) => +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);

  const chartData = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, byTurno]) => {
      const row: Record<string, string | number> = { fecha };
      for (const [turno, vals] of byTurno) {
        row[turno] = avg(vals);
      }
      return row;
    });

  const hasTurno = (t: string) => chartData.some(r => r[t] != null);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
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
        <Legend wrapperStyle={{ color: '#8b949e', fontSize: 12, paddingTop: 8 }} />
        {hasTurno('noche')  && <Bar dataKey="noche"  name="Noche"  fill={TURNO_COLORES.noche}  radius={[3, 3, 0, 0]} />}
        {hasTurno('mañana') && <Bar dataKey="mañana" name="Mañana" fill={TURNO_COLORES.mañana} radius={[3, 3, 0, 0]} />}
        {hasTurno('tarde')  && <Bar dataKey="tarde"  name="Tarde"  fill={TURNO_COLORES.tarde}  radius={[3, 3, 0, 0]} />}
      </BarChart>
    </ResponsiveContainer>
  );
}
