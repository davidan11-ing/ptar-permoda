import { useEffect, useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { getBalanceHidrico, BalanceHidricoRow } from '../../../services/ptarClient';

interface Props {
  fechaInicio: string;
  fechaFin: string;
}

interface ChartRow {
  fecha: string;
  total_agua_limpia_m3: number;
  acueducto_m3: number;
}

function fmtFecha(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');   // slice evita "T00:00:00" en el día
  return `${d}/${m}`;
}

export default function BalanceConsumoWidget({ fechaInicio, fechaFin }: Props) {
  const [data, setData] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getBalanceHidrico({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: 500 })
      .then((rows: BalanceHidricoRow[]) => {
        // Aggregate by date (sum across turnos)
        const map = new Map<string, { total: number; acueducto: number }>();
        for (const r of rows) {
          const prev = map.get(r.fecha) ?? { total: 0, acueducto: 0 };
          map.set(r.fecha, {
            total:     prev.total     + (r.total_agua_limpia_m3 ?? 0),
            acueducto: prev.acueducto + (r.acueducto_m3 ?? 0),
          });
        }
        const sorted: ChartRow[] = Array.from(map.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([fecha, v]) => ({
            fecha: fmtFecha(fecha),
            total_agua_limpia_m3: v.total,
            acueducto_m3: v.acueducto,
          }));
        setData(sorted);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [fechaInicio, fechaFin]);

  if (loading) return <div style={styles.center}>Cargando...</div>;
  if (error)   return <div style={styles.center}>Error: {error}</div>;
  if (!data.length) return <div style={styles.center}>Sin datos</div>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
        <XAxis dataKey="fecha" tick={{ fill: '#8b949e', fontSize: 11 }} />
        <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} unit=" m³" />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6 }}
          labelStyle={{ color: '#e6edf3' }}
          formatter={(value: number, name: string) => [
            `${value.toFixed(1)} m³`,
            name === 'total_agua_limpia_m3' ? 'Agua limpia total' : 'Acueducto',
          ]}
        />
        <Bar dataKey="total_agua_limpia_m3" fill="#58a6ff" radius={[3, 3, 0, 0]} maxBarSize={40} />
        <Line dataKey="acueducto_m3" stroke="#3fb950" strokeWidth={2} dot={false} />
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
