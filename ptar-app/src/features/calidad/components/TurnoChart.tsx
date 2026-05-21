import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { TurnoRow } from '../hooks/useCalidadData';
import { TURNO_COLORES } from '../hooks/useCalidadData';

interface Props {
  data: TurnoRow[];
  unidad_medida: string;
  unidad: string;
}

export default function TurnoChart({ data, unidad_medida, unidad }: Props) {
  if (data.length === 0) {
    return <div className="cal-empty">Sin datos para el período / unidad seleccionada</div>;
  }

  const formatFecha = (f: string) => {
    if (!f) return '';
    const [, m, d] = f.split('-');
    return `${d}/${m}`;
  };

  const hasTurno = (t: string) => data.some(r => (r as unknown as Record<string, unknown>)[t] != null);

  // Calcular dominio Y: auto, pero proteger el caso min=max (1 solo dato)
  const allVals: number[] = [];
  for (const r of data) {
    for (const t of ['noche', 'mañana', 'tarde'] as const) {
      if (r[t] != null) allVals.push(r[t] as number);
    }
  }
  const dMin = allVals.length > 0 ? Math.min(...allVals) : 0;
  const dMax = allVals.length > 0 ? Math.max(...allVals) : 1;
  const yDomain: [number | string, number | string] =
    dMin === dMax
      ? [+(dMin * 0.9).toFixed(2), +(dMax * 1.1).toFixed(2)]
      : ['auto', 'auto'];

  return (
    <div>
      <div style={{ fontSize: 11, color: '#484f58', marginBottom: 6 }}>
        Unidad: <span style={{ color: '#8b949e' }}>{unidad}</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
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
          />
          <Tooltip
            contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#e6edf3', marginBottom: 4 }}
            labelFormatter={(v: string) => `Fecha: ${v}`}
            formatter={(val: number, name: string) => [`${val} ${unidad_medida}`, name]}
          />
          <Legend wrapperStyle={{ color: '#8b949e', fontSize: 12, paddingTop: 8 }} />
          {hasTurno('noche')  && <Bar dataKey="noche"  name="Noche"  fill={TURNO_COLORES.noche}  radius={[3,3,0,0]} />}
          {hasTurno('mañana') && <Bar dataKey="mañana" name="Mañana" fill={TURNO_COLORES.mañana} radius={[3,3,0,0]} />}
          {hasTurno('tarde')  && <Bar dataKey="tarde"  name="Tarde"  fill={TURNO_COLORES.tarde}  radius={[3,3,0,0]} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
