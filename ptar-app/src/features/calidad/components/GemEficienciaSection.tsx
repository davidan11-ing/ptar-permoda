import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart,
} from 'recharts';
import type { GemEficienciaRow } from '../hooks/useGemEficiencia';

interface Props {
  data: GemEficienciaRow[];
  loading: boolean;
}

const TOOLTIP_STYLE = {
  contentStyle: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 },
  labelStyle:   { color: '#e6edf3', marginBottom: 4 },
};

const AXIS_TICK = { fill: '#8b949e', fontSize: 10 };

function formatFecha(f: string) {
  const parts = f.split('-');
  return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : f;
}

/** Agrupa por fecha sumando/promediando reactivos del día (varios turnos) */
function byFecha(data: GemEficienciaRow[]) {
  const map = new Map<string, { count: number; row: Partial<GemEficienciaRow> }>();
  for (const r of data) {
    if (!map.has(r.fecha)) map.set(r.fecha, { count: 0, row: { fecha: r.fecha } });
    const entry = map.get(r.fecha)!;
    entry.count++;
    // Sumar campos numéricos (por día)
    const keys: (keyof GemEficienciaRow)[] = [
      'caudal_m3',
      'consumo_acido_l', 'consumo_coagulante_l', 'consumo_decolorante_l',
      'consumo_pol_anionico_kg', 'consumo_pol_cationico_kg',
      'costo_op_acido', 'costo_op_coagulante', 'costo_op_decolorante',
      'costo_op_anionico', 'costo_op_cationico', 'costo_quimica_turno',
      'kg_acido', 'kg_coagulante', 'kg_decolorante', 'kg_pol_anionico', 'kg_pol_cationico',
    ];
    for (const k of keys) {
      const v = r[k] as number | null;
      if (v != null) {
        (entry.row as Record<string, number>)[k] = ((entry.row as Record<string, number>)[k] ?? 0) + v;
      }
    }
    // Promedio para PPM y pesos_por_m3
    const avgKeys: (keyof GemEficienciaRow)[] = [
      'ppm_acido', 'ppm_coagulante', 'ppm_decolorante', 'ppm_pol_anionico', 'ppm_pol_cationico',
      'pesos_por_m3',
    ];
    for (const k of avgKeys) {
      const v = r[k] as number | null;
      if (v != null) {
        const rec = entry.row as Record<string, number[]>;
        if (!rec[`_${k}`]) rec[`_${k}`] = [];
        rec[`_${k}`].push(v);
      }
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, { row }]) => {
      const result: Record<string, number | string | null> = { fecha };
      const rec = row as Record<string, unknown>;
      for (const k of Object.keys(rec)) {
        if (k === 'fecha') continue;
        if (k.startsWith('_')) {
          const arr = rec[k] as number[];
          const realKey = k.slice(1);
          result[realKey] = arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null;
        } else {
          result[k] = +(Number(rec[k])).toFixed(2);
        }
      }
      return result;
    });
}

export default function GemEficienciaSection({ data, loading }: Props) {
  if (loading) {
    return (
      <section className="cal-section">
        <h2 className="cal-section-title">Eficiencia Operación GEM</h2>
        <div className="cal-loading"><div className="spinner" /><span>Cargando datos GEM…</span></div>
      </section>
    );
  }

  if (data.length === 0) {
    return (
      <section className="cal-section">
        <div className="cal-section-header">
          <h2 className="cal-section-title">Eficiencia Operación GEM</h2>
        </div>
        <div className="dash-card" style={{ padding: 24, textAlign: 'center', color: '#8b949e' }}>
          Sin datos de operación GEM para el período seleccionado
        </div>
      </section>
    );
  }

  const agrupado = byFecha(data);

  return (
    <section className="cal-section">
      <div className="cal-section-header">
        <h2 className="cal-section-title">Eficiencia Operación GEM</h2>
        <span className="cal-section-meta">Reactivos, costos y caudal tratado</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Gráfica 1: Caudal diario y costo total */}
        <div className="dash-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 6 }}>Caudal tratado y costo químico diario</div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={agrupado} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="fecha" tickFormatter={formatFecha} tick={AXIS_TICK} interval="preserveStartEnd" />
              <YAxis yAxisId="left"  tick={AXIS_TICK} width={52}
                label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
              <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} width={64}
                label={{ value: '$', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 10, dx: 4 }} />
              <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`} />
              <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
              <Bar yAxisId="left"  dataKey="caudal_m3"          name="Caudal (m³)"     fill="#1f6feb" radius={[3,3,0,0]} />
              <Line yAxisId="right" type="monotone" dataKey="costo_quimica_turno" name="Costo ($)" stroke="#d29922" strokeWidth={2} dot={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfica 2: PPM por reactivo */}
        <div className="dash-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 6 }}>Dosis PPM por reactivo (promedio diario)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={agrupado} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="fecha" tickFormatter={formatFecha} tick={AXIS_TICK} interval="preserveStartEnd" />
              <YAxis tick={AXIS_TICK} width={48}
                label={{ value: 'PPM', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
              <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                formatter={(val: number, name: string) => [`${val} ppm`, name]} />
              <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
              <Bar dataKey="ppm_acido"        name="Ácido"     fill="#f85149" radius={[3,3,0,0]} />
              <Bar dataKey="ppm_coagulante"   name="Coagulante" fill="#3fb950" radius={[3,3,0,0]} />
              <Bar dataKey="ppm_decolorante"  name="Decolorante" fill="#d29922" radius={[3,3,0,0]} />
              <Bar dataKey="ppm_pol_anionico" name="Pol. Aniónico" fill="#9e7aff" radius={[3,3,0,0]} />
              <Bar dataKey="ppm_pol_cationico" name="Pol. Catiónico" fill="#58a6ff" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfica 3: Kg de cada reactivo consumido */}
        <div className="dash-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 6 }}>Kg de reactivo consumido por día</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={agrupado} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="fecha" tickFormatter={formatFecha} tick={AXIS_TICK} interval="preserveStartEnd" />
              <YAxis tick={AXIS_TICK} width={48}
                label={{ value: 'kg', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
              <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                formatter={(val: number, name: string) => [`${val} kg`, name]} />
              <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
              <Bar dataKey="kg_acido"        name="Ácido"     fill="#f85149" radius={[3,3,0,0]} />
              <Bar dataKey="kg_coagulante"   name="Coagulante" fill="#3fb950" radius={[3,3,0,0]} />
              <Bar dataKey="kg_decolorante"  name="Decolorante" fill="#d29922" radius={[3,3,0,0]} />
              <Bar dataKey="kg_pol_anionico" name="Pol. Aniónico" fill="#9e7aff" radius={[3,3,0,0]} />
              <Bar dataKey="kg_pol_cationico" name="Pol. Catiónico" fill="#58a6ff" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfica 4: Costo por reactivo */}
        <div className="dash-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 6 }}>Costo operativo por reactivo ($COP/día)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={agrupado} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="fecha" tickFormatter={formatFecha} tick={AXIS_TICK} interval="preserveStartEnd" />
              <YAxis tick={AXIS_TICK} width={56}
                tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)}
                label={{ value: '$', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
              <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                formatter={(val: number, name: string) => [`$${val.toLocaleString('es-CO')}`, name]} />
              <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
              <Bar dataKey="costo_op_acido"      name="Ácido"       fill="#f85149" radius={[3,3,0,0]} stackId="s" />
              <Bar dataKey="costo_op_coagulante" name="Coagulante"  fill="#3fb950" radius={[0,0,0,0]} stackId="s" />
              <Bar dataKey="costo_op_decolorante" name="Decolorante" fill="#d29922" radius={[0,0,0,0]} stackId="s" />
              <Bar dataKey="costo_op_anionico"   name="Pol. Aniónico"  fill="#9e7aff" radius={[0,0,0,0]} stackId="s" />
              <Bar dataKey="costo_op_cationico"  name="Pol. Catiónico" fill="#58a6ff" radius={[3,3,0,0]} stackId="s" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfica 5: Pesos por m³ (eficiencia económica) */}
        <div className="dash-card" style={{ padding: 16, gridColumn: '1 / -1' }}>
          <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 6 }}>Eficiencia económica: $/m³ tratado</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={agrupado} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="fecha" tickFormatter={formatFecha} tick={AXIS_TICK} interval="preserveStartEnd" />
              <YAxis tick={AXIS_TICK} width={56}
                tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)}
                label={{ value: '$/m³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
              <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                formatter={(val: number) => [`$${val.toLocaleString('es-CO')}/m³`, '$/m³']} />
              <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
              <Line type="monotone" dataKey="pesos_por_m3" name="$/m³ tratado"
                stroke="#d29922" strokeWidth={2} dot={{ fill: '#d29922', r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>
    </section>
  );
}
