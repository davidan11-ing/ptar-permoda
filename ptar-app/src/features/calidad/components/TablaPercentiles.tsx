/**
 * TablaPercentiles — Tabla 3 del spec
 * 11 filas: MIN + P10…P90 + P100 (p=0.999 como Excel)
 * Thead sticky + tbody scrollable para igualar altura a TablaRangos (≈160px)
 */

const PCT_DEF = [
  { p: 0,     label: 'MIN'  },
  { p: 0.10,  label: 'P10'  },
  { p: 0.20,  label: 'P20'  },
  { p: 0.30,  label: 'P30'  },
  { p: 0.40,  label: 'P40'  },
  { p: 0.50,  label: 'P50'  },
  { p: 0.60,  label: 'P60'  },
  { p: 0.70,  label: 'P70'  },
  { p: 0.80,  label: 'P80'  },
  { p: 0.90,  label: 'P90'  },
  { p: 0.999, label: 'P100' },
];

function percentileInc(sorted: number[], p: number): number {
  const n = sorted.length;
  if (p === 0)   return sorted[0];
  if (p >= 0.999) return sorted[n - 1];
  const pos   = p * (n - 1);
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) return sorted[lower];
  return +(sorted[lower] + (pos - lower) * (sorted[upper] - sorted[lower])).toFixed(4);
}

const cell: React.CSSProperties = {
  padding: '3px 8px',
  fontSize: 11,
  color: '#c9d1d9',
  borderBottom: '1px solid #21262d',
  fontFamily: 'monospace',
};
const head: React.CSSProperties = {
  ...cell,
  fontWeight: 700,
  color: '#8b949e',
  fontSize: 10,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  background: '#161b22',
  // sticky dentro del div scrollable
  position: 'sticky',
  top: 0,
  zIndex: 1,
};

interface Props { values: number[]; unidad_medida: string }

export default function TablaPercentiles({ values, unidad_medida }: Props) {
  if (values.length === 0) return <div className="cal-empty">Sin datos</div>;

  const sorted = [...values].sort((a, b) => a - b);
  const filas = PCT_DEF.map((d, i) => ({
    index:    i,
    pctLabel: d.p === 0 ? '0%' : d.p >= 0.999 ? '100%' : `${Math.round(d.p * 100)}%`,
    valor:    percentileInc(sorted, d.p),
    etiqueta: d.label,
  }));

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#8b949e', letterSpacing: '0.06em', marginBottom: 4, textTransform: 'uppercase' }}>
        Tabla de percentiles
      </div>

      {/* Scroll container — altura aproximada a TablaRangos (título+head+6 filas) */}
      <div style={{ overflowY: 'auto', maxHeight: 162 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ ...head, textAlign: 'right'  }}>#</th>
              <th style={{ ...head, textAlign: 'right'  }}>%</th>
              <th style={{ ...head, textAlign: 'right'  }}>Valor ({unidad_medida})</th>
              <th style={{ ...head, textAlign: 'left'   }}>Etiqueta</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr key={i} style={{ background: i % 2 ? 'rgba(255,255,255,.02)' : 'transparent' }}>
                <td style={{ ...cell, textAlign: 'right', color: '#8b949e' }}>{f.index}</td>
                <td style={{ ...cell, textAlign: 'right' }}>{f.pctLabel}</td>
                <td style={{ ...cell, textAlign: 'right', fontWeight: 700, color: '#e6edf3' }}>
                  {f.valor.toFixed(2)}
                </td>
                <td style={{ ...cell, color: '#3fb950', fontWeight: 600 }}>{f.etiqueta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
