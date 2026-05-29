/**
 * TablaFrecuencias — Tablas 1 y 2 del spec
 *
 * Exports:
 *   TablaParams   — Tabla 1: MÍNIMO/MÁXIMO/AMPLITUD/#DATOS/#RANGOS/TAMAÑO
 *   TablaRangos   — Tabla 2: 5 rangos con MÍNIMO/MÁXIMO/RANGO/FRECUENCIA/%FREC + TOTAL
 *   default       — Ambas apiladas (compat)
 */

import type React from 'react';

const N_RANGOS = 5;

interface Rango {
  nombre: string;
  min: number;
  max: number;
  etiqueta: string;
  frecuencia: number;
  pct: number;
}

interface DistInfo {
  minimo: number;
  maximo: number;
  amplitud: number;
  nDatos: number;
  tamano: number;
  rangos: Rango[];
}

export function calcDist(values: number[]): DistInfo | null {
  if (values.length === 0) return null;
  const minimo   = Math.min(...values);
  const maximo   = Math.max(...values);
  const amplitud = maximo - minimo;
  const nDatos   = values.length;
  const tamano   = amplitud === 0 ? 1 : amplitud / N_RANGOS;

  const rangos: Rango[] = Array.from({ length: N_RANGOS }, (_, i) => {
    const rMin = minimo + i * tamano;
    const rMax = rMin + tamano;
    const frecuencia = values.filter(
      v => v >= rMin && (i < N_RANGOS - 1 ? v < rMax : v <= rMax)
    ).length;
    return {
      nombre: `RANGO ${i + 1}`,
      min:  +rMin.toFixed(2),
      max:  +rMax.toFixed(2),
      etiqueta: `(${rMin.toFixed(2)} - ${rMax.toFixed(2)})`,
      frecuencia,
      pct: frecuencia / nDatos,
    };
  });

  return { minimo, maximo, amplitud, nDatos, tamano, rangos };
}

// ── Estilos compartidos ────────────────────────────────────────────────────────
const cell: React.CSSProperties = {
  padding: '3px 6px',
  fontSize: 11,
  color: '#c9d1d9',
  borderBottom: '1px solid #21262d',
  whiteSpace: 'nowrap',
};
const head: React.CSSProperties = {
  ...cell,
  fontWeight: 700,
  color: '#8b949e',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  background: '#161b22',
};
const sectionTitle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#8b949e',
  letterSpacing: '0.06em',
  marginBottom: 4,
  textTransform: 'uppercase',
};

interface Props { values: number[]; unidad_medida: string }

// ── Tabla 1: Parámetros estadísticos ──────────────────────────────────────────
export function TablaParams({ values, unidad_medida }: Props) {
  if (values.length === 0) return <div className="cal-empty">Sin datos</div>;
  const d = calcDist(values);
  if (!d) return null;

  return (
    <div>
      <div style={sectionTitle}>Parámetros de la distribución</div>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {[
            ['MÍNIMO',   `${d.minimo.toFixed(2)} ${unidad_medida}`],
            ['MÁXIMO',   `${d.maximo.toFixed(2)} ${unidad_medida}`],
            ['AMPLITUD', `${d.amplitud.toFixed(2)} ${unidad_medida}`],
            ['# DATOS',  String(d.nDatos)],
            ['# RANGOS', String(N_RANGOS)],
            ['TAMAÑO',   d.tamano.toFixed(2)],
          ].map(([k, v]) => (
            <tr key={k}>
              <td style={{ ...cell, color: '#8b949e', width: '60%' }}>{k}</td>
              {/* Sin justify-content extra: ambas celdas comparten el ancho justo */}
              <td style={{ ...cell, fontFamily: 'monospace', textAlign: 'right' }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tabla 2: 5 rangos con frecuencias ─────────────────────────────────────────
export function TablaRangos({ values }: Pick<Props, 'values'>) {
  if (values.length === 0) return <div className="cal-empty">Sin datos</div>;
  const d = calcDist(values);
  if (!d) return null;

  const totalFreq = d.rangos.reduce((s, r) => s + r.frecuencia, 0);

  return (
    <div>
      <div style={sectionTitle}>Distribución de frecuencias</div>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            {['#RANGO', 'MÍN', 'MÁX', 'RANGO', 'FREC.', '%'].map(h => (
              <th key={h} style={{ ...head, textAlign: h === '#RANGO' || h === 'RANGO' ? 'left' : 'right' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {d.rangos.map((r, i) => (
            <tr key={i} style={{ background: i % 2 ? 'rgba(255,255,255,.02)' : 'transparent' }}>
              <td style={cell}>{r.nombre}</td>
              <td style={{ ...cell, textAlign: 'right', fontFamily: 'monospace' }}>{r.min.toFixed(2)}</td>
              <td style={{ ...cell, textAlign: 'right', fontFamily: 'monospace' }}>{r.max.toFixed(2)}</td>
              <td style={{ ...cell, fontFamily: 'monospace', fontSize: 10 }}>{r.etiqueta}</td>
              <td style={{ ...cell, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#e6edf3' }}>
                {r.frecuencia}
              </td>
              <td style={{ ...cell, textAlign: 'right', fontFamily: 'monospace' }}>
                {(r.pct * 100).toFixed(0)}%
              </td>
            </tr>
          ))}
          <tr style={{ borderTop: '1px solid #30363d' }}>
            <td colSpan={4} style={{ ...cell, fontWeight: 700, color: '#8b949e', fontSize: 10 }}>TOTAL</td>
            <td style={{ ...cell, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#e6edf3' }}>
              {totalFreq}
            </td>
            <td style={{ ...cell, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Default: ambas apiladas (compat) ──────────────────────────────────────────
export default function TablaFrecuencias({ values, unidad_medida }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <TablaParams values={values} unidad_medida={unidad_medida} />
      <TablaRangos values={values} />
    </div>
  );
}
