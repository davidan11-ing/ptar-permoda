import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { getCalidadMediciones, MedicionCalidad } from '../../../services/ptarClient';

interface Props {
  fechaInicio: string;
  fechaFin: string;
}

interface ChartRow {
  label: string;
  ph: number | null;
  tds_scaled: number | null;  // TDS / 100 para escala compartida
  tds_real: number | null;    // valor real para tooltip
}

function makeLabel(fecha: string, turno: string): string {
  const [, m, d] = fecha.split('-');
  const t = turno === 'mañana' ? 'M' : turno === 'tarde' ? 'T' : 'N';
  return `${d}/${m} ${t}`;
}

export default function CalidadTendenciaWidget({ fechaInicio, fechaFin }: Props) {
  const [data, setData] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = {
      fecha_inicio: fechaInicio,
      fecha_fin:    fechaFin,
      unidad_tratamiento: 'GEM Salida',
      limit: 200,
    };

    Promise.all([
      getCalidadMediciones({ ...params, parametro: 'pH' }),
      getCalidadMediciones({ ...params, parametro: 'TDS' }),
    ])
      .then(([phRows, tdsRows]: [MedicionCalidad[], MedicionCalidad[]]) => {
        // Build map keyed by "fecha|turno"
        const map = new Map<string, { fecha: string; turno: string; ph: number | null; tds: number | null }>();

        for (const r of phRows) {
          const key = `${r.fecha}|${r.turno}`;
          const prev = map.get(key) ?? { fecha: r.fecha, turno: r.turno, ph: null, tds: null };
          map.set(key, { ...prev, ph: r.valor });
        }
        for (const r of tdsRows) {
          const key = `${r.fecha}|${r.turno}`;
          const prev = map.get(key) ?? { fecha: r.fecha, turno: r.turno, ph: null, tds: null };
          map.set(key, { ...prev, tds: r.valor });
        }

        const sorted: ChartRow[] = Array.from(map.values())
          .sort((a, b) => {
            const dateCompare = a.fecha.localeCompare(b.fecha);
            if (dateCompare !== 0) return dateCompare;
            const order: Record<string, number> = { noche: 0, mañana: 1, tarde: 2 };
            return (order[a.turno] ?? 0) - (order[b.turno] ?? 0);
          })
          .map(v => ({
            label: makeLabel(v.fecha, v.turno),
            ph: v.ph,
            tds_scaled: v.tds != null ? v.tds / 100 : null,
            tds_real:   v.tds,
          }));

        setData(sorted);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [fechaInicio, fechaFin]);

  if (loading) return <div style={styles.center}>Cargando...</div>;
  if (error)   return <div style={styles.center}>Error: {error}</div>;
  if (!data.length) return <div style={styles.center}>Sin datos (GEM Salida)</div>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
        <XAxis dataKey="label" tick={{ fill: '#8b949e', fontSize: 10 }} />
        <YAxis
          tick={{ fill: '#8b949e', fontSize: 11 }}
          label={{ value: 'pH / TDS÷100', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 10 }}
        />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6 }}
          labelStyle={{ color: '#e6edf3' }}
          formatter={(value: number, name: string) => {
            if (name === 'ph') return [`${value.toFixed(2)}`, 'pH'];
            // tds_scaled — show real value
            return [`${(value * 100).toFixed(0)} mg/L`, 'TDS'];
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#8b949e' }}
          formatter={(value: string) => value === 'ph' ? 'pH' : 'TDS'}
        />
        <Line dataKey="ph"         stroke="#d29922" strokeWidth={2} dot={false} connectNulls />
        <Line dataKey="tds_scaled" stroke="#58a6ff" strokeWidth={2} dot={false} connectNulls name="TDS" />
      </LineChart>
    </ResponsiveContainer>
  );
}

const styles = {
  center: {
    height: 220,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8b949e',
    fontSize: 13,
  } as React.CSSProperties,
};
