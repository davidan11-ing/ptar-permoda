import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from 'recharts';

interface Props {
  values: number[];
  unidad_medida: string;
}

// Colores en el orden de la imagen: rojo → amarillo → verde → morado → azul
const BIN_COLORS = [
  '#c0392b', // RANGO1 — rojo ladrillo
  '#d4a017', // RANGO2 — amarillo dorado
  '#27ae60', // RANGO3 — verde
  '#7d3c98', // RANGO4 — morado
  '#2980b9', // RANGO5 — azul
];

const N_RANGOS = 5; // Fijo según tabla de distribución de frecuencias

function calcBins(values: number[]) {
  if (values.length === 0) return [];
  const k    = N_RANGOS;
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  // TAMAÑO = AMPLITUD / #RANGOS, igual que la tabla
  const width = vMax === vMin ? 1 : (vMax - vMin) / k;

  // Spec §5.1: formato exacto "(min - max)" con 2 decimales y espacios alrededor del guion
  const bins = Array.from({ length: k }, (_, i) => ({
    label: `(${(vMin + i * width).toFixed(2)} - ${(vMin + (i + 1) * width).toFixed(2)})`,
    count: 0,
  }));

  for (const v of values) {
    const idx = Math.min(k - 1, Math.floor((v - vMin) / width));
    bins[idx].count++;
  }
  return bins;
}

export default function HistogramaChart({ values, unidad_medida }: Props) {
  if (values.length === 0) {
    return <div className="cal-empty">Sin datos para calcular histograma</div>;
  }

  const bins = calcBins(values);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={bins} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#8b949e', fontSize: 9 }}
          angle={-40}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tick={{ fill: '#8b949e', fontSize: 11 }}
          width={40}
          allowDecimals={false}
          label={{ value: 'N', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }}
        />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 }}
          formatter={(val: number) => [`${val} mediciones`, `Rango (${unidad_medida})`]}
          labelFormatter={(v: string) => v}
        />
        <Bar dataKey="count" name="Frecuencia" radius={[3, 3, 0, 0]}>
          {bins.map((_, i) => (
            <Cell key={i} fill={BIN_COLORS[i % BIN_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
