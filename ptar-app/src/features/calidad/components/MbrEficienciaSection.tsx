import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { MbrEficienciaRow } from '../hooks/useMbrEficiencia';
import { UNIDAD_COLORES } from '../hooks/useCalidadData';

interface Props {
  data: MbrEficienciaRow[];
  loading: boolean;
}

const TOOLTIP_STYLE = {
  contentStyle: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 12 },
  labelStyle:   { color: '#e6edf3', marginBottom: 4 },
};

const AXIS_TICK = { fill: '#8b949e', fontSize: 11 };

function formatFecha(f: string) {
  const parts = f.split('-');
  return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : f;
}

/** Pivotea MbrEficienciaRow en puntos de chart por fecha, columnas = unidades dadas */
function pivot(
  data: MbrEficienciaRow[],
  parametro: string,
  unidades: string[],
): Record<string, string | number>[] {
  const rows = data.filter(r => r.parametro === parametro);
  const byFecha = new Map<string, Map<string, number[]>>();
  for (const r of rows) {
    if (!unidades.includes(r.unidad_tratamiento)) continue;
    if (!byFecha.has(r.fecha)) byFecha.set(r.fecha, new Map());
    const byU = byFecha.get(r.fecha)!;
    if (!byU.has(r.unidad_tratamiento)) byU.set(r.unidad_tratamiento, []);
    byU.get(r.unidad_tratamiento)!.push(r.valor_promedio);
  }
  return Array.from(byFecha.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, byU]) => {
      const row: Record<string, string | number> = { fecha };
      for (const u of unidades) {
        const vals = byU.get(u);
        if (vals && vals.length > 0) {
          row[u] = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
        }
      }
      return row;
    });
}

interface SubChartProps {
  title: string;
  chartData: Record<string, string | number>[];
  series: { key: string; name: string; color: string }[];
  tipo: 'bar' | 'line';
  unidad_medida?: string;
}

function SubChart({ title, chartData, series, tipo, unidad_medida = '' }: SubChartProps) {
  const empty = chartData.length === 0 || !chartData.some(r => series.some(s => r[s.key] != null));
  return (
    <div>
      <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 6 }}>{title}</div>
      {empty ? (
        <div className="cal-empty" style={{ height: 200 }}>Sin datos</div>
      ) : tipo === 'bar' ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="fecha" tickFormatter={formatFecha} tick={AXIS_TICK} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} width={48}
              label={{ value: unidad_medida, angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }}
            />
            <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
              formatter={(val: number, name: string) => [`${val} ${unidad_medida}`, name]} />
            <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
            {series.map(s => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="fecha" tickFormatter={formatFecha} tick={AXIS_TICK} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} width={48}
              label={{ value: unidad_medida, angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }}
            />
            <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
              formatter={(val: number, name: string) => [`${val} ${unidad_medida}`, name]} />
            <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
            {series.map(s => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.name}
                stroke={s.color} strokeWidth={2} dot={false} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function MbrEficienciaSection({ data, loading }: Props) {
  if (loading) {
    return (
      <section className="cal-section">
        <h2 className="cal-section-title">Eficiencia MBR — DQO y SST</h2>
        <div className="cal-loading"><div className="spinner" /><span>Cargando eficiencia MBR…</span></div>
      </section>
    );
  }

  // ─── DQO: Interno vs Permeado por MBR ─────────────────────────────────────
  const dqoMbr1 = pivot(data, 'DQO', ['MBR 1 Interno', 'MBR 1 Permeado', 'GEM Salida']);
  const dqoMbr2 = pivot(data, 'DQO', ['MBR 2 Interno', 'MBR 2 Permeado', 'GEM Salida']);

  // ─── SST internos por fecha ────────────────────────────────────────────────
  const sstInternos = pivot(data, 'SST', ['GEM Salida', 'MBR 1 Interno', 'MBR 2 Interno']);

  // ─── SST vs DQO Permeado ──────────────────────────────────────────────────
  const sstPermeado = pivot(data, 'SST', ['MBR 1 Permeado', 'MBR 2 Permeado']);
  const dqoPermeado = pivot(data, 'DQO', ['MBR 1 Permeado', 'MBR 2 Permeado']);

  return (
    <section className="cal-section">
      <div className="cal-section-header">
        <h2 className="cal-section-title">Eficiencia MBR — DQO y SST</h2>
        <span className="cal-section-meta">Interno vs Permeado · MBR 1 y MBR 2</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="dash-card" style={{ padding: 16 }}>
          <SubChart
            title="DQO — MBR 1: GEM Salida / Interno / Permeado"
            chartData={dqoMbr1}
            tipo="bar"
            unidad_medida="mg/L"
            series={[
              { key: 'GEM Salida',    name: 'GEM Salida',    color: UNIDAD_COLORES['GEM Salida']    ?? '#58a6ff' },
              { key: 'MBR 1 Interno', name: 'MBR 1 Interno', color: UNIDAD_COLORES['MBR 1 Interno'] ?? '#f0883e' },
              { key: 'MBR 1 Permeado',name: 'MBR 1 Permeado',color: UNIDAD_COLORES['MBR 1 Permeado']?? '#3fb950' },
            ]}
          />
        </div>

        <div className="dash-card" style={{ padding: 16 }}>
          <SubChart
            title="DQO — MBR 2: GEM Salida / Interno / Permeado"
            chartData={dqoMbr2}
            tipo="bar"
            unidad_medida="mg/L"
            series={[
              { key: 'GEM Salida',    name: 'GEM Salida',    color: UNIDAD_COLORES['GEM Salida']    ?? '#58a6ff' },
              { key: 'MBR 2 Interno', name: 'MBR 2 Interno', color: UNIDAD_COLORES['MBR 2 Interno'] ?? '#fd7d3b' },
              { key: 'MBR 2 Permeado',name: 'MBR 2 Permeado',color: UNIDAD_COLORES['MBR 2 Permeado']?? '#2ea043' },
            ]}
          />
        </div>

        <div className="dash-card" style={{ padding: 16 }}>
          <SubChart
            title="SST Internos: GEM Salida → MBR 1 Interno → MBR 2 Interno"
            chartData={sstInternos}
            tipo="line"
            unidad_medida="mg/L"
            series={[
              { key: 'GEM Salida',    name: 'GEM Salida',    color: UNIDAD_COLORES['GEM Salida']    ?? '#58a6ff' },
              { key: 'MBR 1 Interno', name: 'MBR 1 Interno', color: UNIDAD_COLORES['MBR 1 Interno'] ?? '#f0883e' },
              { key: 'MBR 2 Interno', name: 'MBR 2 Interno', color: UNIDAD_COLORES['MBR 2 Interno'] ?? '#fd7d3b' },
            ]}
          />
        </div>

        <div className="dash-card" style={{ padding: 16 }}>
          <SubChart
            title="SST Permeados MBR 1 y MBR 2"
            chartData={sstPermeado}
            tipo="line"
            unidad_medida="mg/L"
            series={[
              { key: 'MBR 1 Permeado', name: 'MBR 1 Permeado', color: UNIDAD_COLORES['MBR 1 Permeado'] ?? '#3fb950' },
              { key: 'MBR 2 Permeado', name: 'MBR 2 Permeado', color: UNIDAD_COLORES['MBR 2 Permeado'] ?? '#2ea043' },
            ]}
          />
        </div>

        <div className="dash-card" style={{ padding: 16 }}>
          <SubChart
            title="DQO Permeados MBR 1 y MBR 2"
            chartData={dqoPermeado}
            tipo="line"
            unidad_medida="mg/L"
            series={[
              { key: 'MBR 1 Permeado', name: 'MBR 1 Permeado', color: UNIDAD_COLORES['MBR 1 Permeado'] ?? '#3fb950' },
              { key: 'MBR 2 Permeado', name: 'MBR 2 Permeado', color: UNIDAD_COLORES['MBR 2 Permeado'] ?? '#2ea043' },
            ]}
          />
        </div>

        <div className="dash-card" style={{ padding: 16 }}>
          {/* Tabla resumen de promedios globales */}
          <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 10 }}>Resumen global MBR (promedio del período)</div>
          {data.length === 0 ? (
            <div className="cal-empty">Sin datos MBR para el período</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Unidad', 'DQO prom (mg/L)', 'SST prom (mg/L)'].map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #21262d', color: '#8b949e' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['GEM Salida', 'MBR 1 Interno', 'MBR 2 Interno', 'MBR 1 Permeado', 'MBR 2 Permeado'].map(u => {
                  const dqoVals = data.filter(r => r.unidad_tratamiento === u && r.parametro === 'DQO').map(r => r.valor_promedio);
                  const sstVals = data.filter(r => r.unidad_tratamiento === u && r.parametro === 'SST').map(r => r.valor_promedio);
                  const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : '—';
                  return (
                    <tr key={u}>
                      <td style={{ padding: '5px 8px', color: UNIDAD_COLORES[u] ?? '#e6edf3', borderBottom: '1px solid #161b22' }}>{u}</td>
                      <td style={{ padding: '5px 8px', color: '#e6edf3', borderBottom: '1px solid #161b22' }}>{avg(dqoVals)}</td>
                      <td style={{ padding: '5px 8px', color: '#e6edf3', borderBottom: '1px solid #161b22' }}>{avg(sstVals)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
