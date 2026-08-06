import { useEffect, useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { getRoEficiencia, RoEficienciaRow } from '../../../services/ptarClient';

interface Props { fechaInicio: string; fechaFin: string; }

interface ChartRow {
  label: string;
  caudal_m3: number;
  pesos_por_m3: number;
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function fmtFecha(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${MESES[parseInt(m, 10) - 1]}`;
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
        // Agrupar por día: sumar caudal, promediar $/m³
        const map = new Map<string, { caudal: number; pesosArr: number[] }>();
        for (const r of rows) {
          const key = r.fecha.slice(0, 10);
          const prev = map.get(key) ?? { caudal: 0, pesosArr: [] };
          map.set(key, {
            caudal:   prev.caudal + (r.caudal_m3 ?? 0),
            pesosArr: r.pesos_por_m3 != null ? [...prev.pesosArr, r.pesos_por_m3] : prev.pesosArr,
          });
        }
        const sorted: ChartRow[] = Array.from(map.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([fecha, v]) => ({
            label:        fmtFecha(fecha),
            caudal_m3:    v.caudal,
            pesos_por_m3: v.pesosArr.length
              ? v.pesosArr.reduce((a, b) => a + b, 0) / v.pesosArr.length
              : 0,
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
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 40, bottom: 40, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#8b949e', fontSize: 9 }}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={55}
        />
        <YAxis yAxisId="left"  tick={{ fill: '#8b949e', fontSize: 10 }} unit=" m³" width={52} />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#8b949e', fontSize: 10 }}
               tickFormatter={(v: number) => `$${v}`} width={52} />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6 }}
          labelStyle={{ color: '#e6edf3' }}
          formatter={(value: number, name: string) => [
            name === 'caudal_m3' ? `${value.toFixed(1)} m³` : `$${value.toFixed(0)}/m³`,
            name === 'caudal_m3' ? 'Caudal' : '$/m³',
          ]}
        />
        <Bar yAxisId="left"  dataKey="caudal_m3"    fill="#8b949e" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Line yAxisId="right" dataKey="pesos_por_m3" stroke="#d2a8ff" strokeWidth={2} dot={false} />
      </ComposedChart>
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
