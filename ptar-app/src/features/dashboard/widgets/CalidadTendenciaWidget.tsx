import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { getCalidadMediciones, MedicionCalidad } from '../../../services/ptarClient';

interface Props { fechaInicio: string; fechaFin: string; }

interface ChartRow {
  label: string;
  ph: number | null;
  tds_scaled: number | null;
  tds_real:   number | null;
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function fmtFecha(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${MESES[parseInt(m, 10) - 1]}`;
}

function avg(arr: number[]): number | null {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
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
      limit: 500,
    };

    Promise.all([
      getCalidadMediciones({ ...params, parametro: 'pH' }),
      getCalidadMediciones({ ...params, parametro: 'TDS' }),
    ])
      .then(([phRows, tdsRows]: [MedicionCalidad[], MedicionCalidad[]]) => {
        // Agrupar por día (promedio de turnos)
        const map = new Map<string, { phArr: number[]; tdsArr: number[] }>();

        for (const r of phRows) {
          const key = r.fecha?.slice(0, 10) ?? '';
          if (!key) continue;
          const prev = map.get(key) ?? { phArr: [], tdsArr: [] };
          if (r.valor != null) prev.phArr.push(r.valor);
          map.set(key, prev);
        }
        for (const r of tdsRows) {
          const key = r.fecha?.slice(0, 10) ?? '';
          if (!key) continue;
          const prev = map.get(key) ?? { phArr: [], tdsArr: [] };
          if (r.valor != null) prev.tdsArr.push(r.valor);
          map.set(key, prev);
        }

        const sorted: ChartRow[] = Array.from(map.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([fecha, v]) => {
            const phVal  = avg(v.phArr);
            const tdsVal = avg(v.tdsArr);
            return {
              label:      fmtFecha(fecha),
              ph:         phVal,
              tds_real:   tdsVal,
              tds_scaled: tdsVal != null ? tdsVal / 100 : null,
            };
          });

        setData(sorted);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [fechaInicio, fechaFin]);

  if (loading) return <div style={styles.center}>Cargando...</div>;
  if (error)   return <div style={styles.center}>Error: {error}</div>;
  if (!data.length) return <div style={styles.center}>Sin datos (GEM Salida)</div>;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 40, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#8b949e', fontSize: 9 }}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={55}
        />
        <YAxis
          tick={{ fill: '#8b949e', fontSize: 10 }}
          label={{ value: 'pH / TDS÷100', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 10 }}
        />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6 }}
          labelStyle={{ color: '#e6edf3' }}
          formatter={(value: number, name: string) => {
            if (name === 'ph') return [`${value.toFixed(2)}`, 'pH'];
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
    height: 240,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8b949e',
    fontSize: 13,
  } as React.CSSProperties,
};
