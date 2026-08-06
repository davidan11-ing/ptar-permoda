import { useEffect, useState } from 'react';
import {
  ComposedChart, Bar, Line, LabelList, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { getBalanceHidrico, BalanceHidricoRow } from '../../../services/ptarClient';

interface Props {
  fechaInicio: string;
  fechaFin: string;
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmtFecha(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${MESES[parseInt(m, 10) - 1]}`;
}

interface ChartRow {
  fecha: string;
  carrotanques_m3:    number;
  permeado_ro1:       number;
  acueducto_m3:       number;
  potable_ptap:       number;
  total_agua_limpia:  number;
}

export default function BalanceConsumoWidget({ fechaInicio, fechaFin }: Props) {
  const [data, setData] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getBalanceHidrico({ fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: 1000 })
      .then((rows: BalanceHidricoRow[]) => {
        // Agregar por día (suma de turnos)
        const map = new Map<string, ChartRow>();
        for (const r of rows) {
          const key = r.fecha.slice(0, 10);
          const prev = map.get(key) ?? {
            fecha: fmtFecha(r.fecha),
            carrotanques_m3:   0,
            permeado_ro1:      0,
            acueducto_m3:      0,
            potable_ptap:      0,
            total_agua_limpia: 0,
          };
          map.set(key, {
            ...prev,
            carrotanques_m3:   prev.carrotanques_m3   + (r.carrotanques_m3  ?? 0),
            permeado_ro1:      prev.permeado_ro1      + (r.permeado_ro1     ?? 0),
            acueducto_m3:      prev.acueducto_m3      + (r.acueducto_m3     ?? 0),
            potable_ptap:      prev.potable_ptap      + (r.potable_ptap     ?? 0),
            total_agua_limpia: prev.total_agua_limpia + (r.total_agua_limpia_m3 ?? 0),
          });
        }
        const sorted = Array.from(map.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, v]) => v);
        setData(sorted);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [fechaInicio, fechaFin]);

  if (loading) return <div style={styles.center}>Cargando...</div>;
  if (error)   return <div style={styles.center}>Error: {error}</div>;
  if (!data.length) return <div style={styles.center}>Sin datos</div>;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 44, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
        <XAxis
          dataKey="fecha"
          tick={{ fill: '#8b949e', fontSize: 9 }}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={58}
        />
        <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} width={46} unit=" m³" />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 6 }}
          labelStyle={{ color: '#e6edf3', fontWeight: 600 }}
          formatter={(value: number, name: string) => [`${value.toFixed(1)} m³`, name]}
        />
        <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />

        <Bar dataKey="carrotanques_m3" name="Carrotanques"  fill="#4472C4" stackId="s" maxBarSize={40}>
          <LabelList dataKey="carrotanques_m3" position="insideTop"
            style={{ fill: '#fff', fontSize: 7, fontFamily: 'monospace' }}
            formatter={(v: number) => v > 50 ? v.toFixed(0) : ''} />
        </Bar>
        <Bar dataKey="permeado_ro1" name="Permeado RO"  fill="#5B9BD5" stackId="s" maxBarSize={40}>
          <LabelList dataKey="permeado_ro1" position="insideTop"
            style={{ fill: '#fff', fontSize: 7, fontFamily: 'monospace' }}
            formatter={(v: number) => v > 50 ? v.toFixed(0) : ''} />
        </Bar>
        <Bar dataKey="acueducto_m3" name="Acueducto"  fill="#70AD47" stackId="s" maxBarSize={40}>
          <LabelList dataKey="acueducto_m3" position="insideTop"
            style={{ fill: '#fff', fontSize: 7, fontFamily: 'monospace' }}
            formatter={(v: number) => v > 50 ? v.toFixed(0) : ''} />
        </Bar>
        <Bar dataKey="potable_ptap" name="PTAP Potable" fill="#ED7D31" stackId="s" radius={[3,3,0,0]} maxBarSize={40}>
          <LabelList dataKey="potable_ptap" position="insideTop"
            style={{ fill: '#fff', fontSize: 7, fontFamily: 'monospace' }}
            formatter={(v: number) => v > 50 ? v.toFixed(0) : ''} />
        </Bar>

        <Line
          dataKey="total_agua_limpia"
          name="Total Agua Limpia"
          stroke="#FFFFFF"
          strokeWidth={2}
          dot={{ fill: '#FFFFFF', r: 2 }}
          activeDot={{ r: 5 }}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

const styles = {
  center: {
    height: 230,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8b949e',
    fontSize: 13,
  } as React.CSSProperties,
};
