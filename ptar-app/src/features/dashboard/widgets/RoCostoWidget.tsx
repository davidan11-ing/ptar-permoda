import { useEffect, useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { getRoEficiencia, RoEficienciaRow } from '../../../services/ptarClient';

interface Props {
  fechaInicio: string;
  fechaFin: string;
}

interface ChartRow {
  label: string;
  caudal_m3: number;
  pesos_por_m3: number;
}

export default function RoCostoWidget({ fechaInicio, fechaFin }: Props) {
  const [data, setData] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getRoEficiencia({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })
      .then((rows: RoEficienciaRow[]) => {
        const mapped: ChartRow[] = rows.map(r => {
          const [, m, d] = r.fecha.split('-');
          const turnoLabel = r.turno === 'mañana' ? 'M' : r.turno === 'tarde' ? 'T' : 'N';
          return {
            label: `${d}/${m} ${turnoLabel}`,
            caudal_m3: r.caudal_m3 ?? 0,
            pesos_por_m3: r.pesos_por_m3 ?? 0,
          };
        });
        setData(mapped);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [fechaInicio, fechaFin]);

  if (loading) return <div style={styles.center}>Cargando...</div>;
  if (error)   return <div style={styles.center}>Error: {error}</div>;
  if (!data.length) return <div style={styles.center}>Sin datos</div>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 40, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
        <XAxis dataKey="label" tick={{ fill: '#8b949e', fontSize: 10 }} />
        <YAxis yAxisId="left"  tick={{ fill: '#8b949e', fontSize: 11 }} unit=" m³" />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#8b949e', fontSize: 11 }}
               tickFormatter={(v: number) => `$${v}`} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6 }}
          labelStyle={{ color: '#e6edf3' }}
          formatter={(value: number, name: string) => [
            name === 'caudal_m3' ? `${value.toFixed(1)} m³` : `$${value.toFixed(0)}/m³`,
            name === 'caudal_m3' ? 'Caudal' : '$/m³',
          ]}
        />
        <Bar yAxisId="left"  dataKey="caudal_m3"    fill="#8b949e" radius={[3, 3, 0, 0]} maxBarSize={30} />
        <Line yAxisId="right" dataKey="pesos_por_m3" stroke="#d2a8ff" strokeWidth={2} dot={false} />
      </ComposedChart>
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
