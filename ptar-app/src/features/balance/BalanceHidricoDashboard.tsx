import { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../../state/ThemeContext';
import {
  Bar, Line, LabelList,
  ComposedChart, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine,
} from 'recharts';
import { useBalanceData } from './hooks/useBalanceData';
import { getGemEficiencia, type BalanceHidricoRow, type GemEficienciaRow } from '../../services/ptarClient';
import InformeBalanceModal from './InformeBalanceModal';
import GranularidadSelector from '../../components/shared/GranularidadSelector';
import { useGranularidad } from '../../hooks/useGranularidad';
import { agruparPorGranularidad } from '../../lib/utils/agruparTemporal';

const TOOLTIP_STYLE = {
  contentStyle: { background: '#161b22', border: '1px solid #30363d', borderRadius: 8, fontSize: 11 },
  labelStyle:   { color: '#e6edf3', marginBottom: 4 },
};
const AXIS_TICK = { fill: '#8b949e', fontSize: 10 };
const fmt = (v: string) => v;

const BALANCE_SUM_FIELDS: (keyof BalanceHidricoRow)[] = [
  'ingreso_ptap', 'potable_ptap', 'carrotanques_m3', 'mulas_funza_m3',
  'entrada_ro1', 'permeado_ro1', 'rechazo_ro1',
  'permeado_mbr1', 'permeado_mbr2', 'envio_th',
  'acueducto_m3', 'total_agua_limpia_m3', 'consumo_gem_m3',
  'lavanderia_m3', 'tintoreria_m3', 'rotativa_m3',
  'und_efectivas', 'kg_tela', 'm_tela',
];
const BALANCE_AVG_FIELDS: (keyof BalanceHidricoRow)[] = [
  'eficiencia_ro_pct', 'indicador_lav_l_und', 'indicador_tin_l_kg', 'indicador_rot_l_m',
];
const DATOS_CAMPOS: (keyof BalanceHidricoRow)[] = [
  'total_agua_limpia_m3', 'acueducto_m3', 'entrada_ro1',
];

// ── Paleta unificada ──────────────────────────────────────────────────────────
// Colores aprobados — deben coincidir en TODAS las secciones del balance
const C = {
  acueducto:    '#4472C4',   // azul oscuro — S1/S5 barra Acueducto
  permeadoRO:   '#70AD47',   // verde       — S1 barra Permeado RO / Vertimiento pie
  carrotanques: '#A5A5A5',   // gris        — S1 barra Carrotanques
  ptap:         '#5B9BD5',   // azul claro  — S1 barra PTAP
  tintoreria:   '#ED7D31',   // naranja     — S2/S5 barra Tintorería
  lavanderia:   '#FFC000',   // amarillo    — S3/S5 barra Lavandería
  gem:          '#A9D18E',   // verde claro — Permeado RO tratabilidad / barra GEM
  gemDark:      '#1F3864',   // azul marino — línea Total Procesado
  rechazoRO:    '#7B3F00',   // café        — Rechazo RO
  vertGem:      '#9DC3E6',   // azul pálido — Vertimiento GEM (barras + pie)
  vertMBR:      '#FFE699',   // amarillo pálido — Vertimiento MBRs
  tinInd:       '#FFD966',   // amarillo indicador tintorería
  lavInd:       '#f0883e',   // naranja indicador lavandería
  roEfic:       '#FFC000',   // amarillo eficiencia RO
  white:        '#FFFFFF',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtM3   = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);
const fmtFull = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 0 });
const fmtDec1 = (v: number | null) => v != null ? v.toFixed(1) : '—';

// ── Sub-componentes ───────────────────────────────────────────────────────────

// ── KPI Button Tile — tarjeta con identidad de color estilo botón ─────────────
function KpiButtonTile({ titulo, color, rows }: {
  titulo: string;
  color: string;
  rows: { label: string; value: string; key?: boolean }[];
}) {
  const { theme } = useTheme();
  return (
    <div style={{
      background: theme.surface,
      border: `1px solid ${theme.border}`,
      borderTop: `4px solid ${color}`,
      borderRadius: '0 0 8px 8px',
      overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Cabecera coloreada */}
      <div style={{
        background: `${color}1A`,
        borderBottom: `1px solid ${color}35`,
        padding: '7px 14px 6px',
      }}>
        <span style={{
          fontSize: 9, fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.09em',
          color,
        }}>{titulo}</span>
      </div>
      {/* Filas de datos */}
      <div style={{ padding: '2px 0 4px', flexGrow: 1 }}>
        {rows.map((r, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: r.key ? '6px 14px' : '4px 14px',
            background: r.key ? `${color}12` : 'transparent',
            borderBottom: i < rows.length - 1 ? `1px solid ${theme.border}` : 'none',
          }}>
            <span style={{ fontSize: 10, color: theme.muted, fontWeight: r.key ? 600 : 400 }}>{r.label}</span>
            <span style={{
              fontSize: r.key ? 16 : 13, fontWeight: 700,
              color: r.key ? color : theme.text1,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: r.key ? '-0.01em' : '0',
            }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeccionHeader({ numero, titulo, color, textColor = '#1c2128' }: {
  numero: number; titulo: string; color: string; textColor?: string;
}) {
  return (
    <div style={{
      background: color, color: textColor, fontWeight: 700, fontSize: 13,
      padding: '7px 16px', marginBottom: 16, borderRadius: 4,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ opacity: 0.5, fontSize: 11, fontWeight: 400 }}>S{numero}</span>
      {titulo}
    </div>
  );
}

const TURNO_NUM: Record<string, number> = { noche: 1, 'mañana': 2, tarde: 3 };
const GEM_META_M3 = 1800;

function SquareDot(props: { cx?: number; cy?: number; fill?: string }) {
  const { cx, cy, fill } = props;
  if (cx == null || cy == null) return null;
  return <rect x={cx - 3} y={cy - 3} width={6} height={6} fill={fill ?? '#000'} />;
}

const DOT_WHITE = <SquareDot fill={C.white} />;
const DOT_TIN   = <SquareDot fill={C.tinInd} />;
const DOT_LAV   = <SquareDot fill={C.lavInd} />;
const DOT_GEM_L = <SquareDot fill={C.gemDark} />;
const DOT_GEM   = <SquareDot fill={C.gem} />;

function TablaResumen({ titulo, cabeceras, filas, colorHead = '#DAE3F3' }: {
  titulo?: string;
  cabeceras: string[];
  filas: (string | number | null)[][];
  colorHead?: string;
}) {
  const { theme } = useTheme();
  return (
    <div className="dash-card" style={{ padding: '8px 12px', overflow: 'auto' }}>
      {titulo && (
        <div style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
          background: colorHead, color: '#1c2128', padding: '3px 8px', marginBottom: 6, borderRadius: 3,
        }}>{titulo}</div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
        <thead>
          <tr>
            {cabeceras.map((h, i) => (
              <th key={i} style={{
                padding: '3px 8px', textAlign: i === 0 ? 'left' : 'center',
                color: theme.muted, fontWeight: 600, borderBottom: `1px solid ${theme.border}`,
                whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, ri) => (
            <tr key={ri} style={{ borderBottom: '1px solid #21262d30' }}>
              {fila.map((celda, ci) => (
                <td key={ci} style={{
                  padding: '3px 8px', textAlign: ci === 0 ? 'left' : 'center',
                  color: theme.text1, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                }}>{celda ?? '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BenchmarkTintoreria() {
  const { theme } = useTheme();
  const rows = [
    { nivel: 'Muy Ineficiente',    desc: 'Práctica obsoleta', rango: '> 150 L/Kg', color: '#5f1010' },
    { nivel: 'Promedio Industria', desc: 'Convencional',       rango: '100 – 150',  color: '#3d3010' },
    { nivel: 'Buen Desempeño',     desc: 'Planta Moderna',     rango: '80 – 100',   color: '#2a3a10' },
    { nivel: 'Proceso Optimizado', desc: 'Best Practice',      rango: '50 – 80',    color: '#1a3a15' },
    { nivel: 'Excelencia Mundial', desc: 'Top Performers',     rango: '< 50 L/Kg',  color: '#0e3d0e' },
  ];
  return (
    <div className="dash-card" style={{ padding: '10px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: theme.muted, marginBottom: 8, textTransform: 'uppercase' }}>
        Benchmark Mundial Tintorería
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '4px 8px', marginBottom: 3, borderRadius: 4, background: r.color,
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: theme.text1 }}>{r.nivel}</div>
            <div style={{ fontSize: 9, color: theme.muted }}>{r.desc}</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#70AD47' }}>{r.rango}</div>
        </div>
      ))}
    </div>
  );
}

// ── Tabla expandida Tintorería (Consolidado + Comportamiento) ─────────────────
// Proyecciones y comportamiento hardcoded — pendiente integrar endpoint
function TablasTintoreria({ consumoM3, kgTela, indLKg }: {
  consumoM3: number; kgTela: number; indLKg: number | null;
}) {
  const { theme } = useTheme();
  const red = { color: '#e05252', fontWeight: 700 as const };
  const cell = (style?: React.CSSProperties) => ({
    padding: '3px 8px', textAlign: 'center' as const, color: theme.text1,
    whiteSpace: 'nowrap' as const, fontVariantNumeric: 'tabular-nums' as const,
    ...style,
  });
  const th = { padding: '3px 8px', textAlign: 'center' as const, color: theme.muted, fontWeight: 600 as const,
    borderBottom: `1px solid ${theme.border}`, whiteSpace: 'nowrap' as const };
  const head = (txt: string) => (
    <div style={{
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
      background: '#DAE3F3', color: '#1c2128', padding: '3px 8px', marginBottom: 6, borderRadius: 3,
    }}>{txt}</div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Consolidado + Proyección */}
      <div className="dash-card" style={{ padding: '8px 12px', overflow: 'auto' }}>
        {head('Consolidado Tintorería')}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr>
              {['CONSUMO (m³)', 'Kg Tela', 'INDICADOR L/Kg', 'CONSUMO PROY. (m³)', 'Kg PROY.', 'IND. PROY. L/Kg'].map((h, i) => (
                <th key={i} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cell(red)}>{fmtFull(consumoM3)}</td>
              <td style={cell()}>{fmtFull(kgTela)}</td>
              <td style={cell(red)}>{indLKg != null ? indLKg.toFixed(3) : '—'}</td>
              <td style={cell({ color: theme.muted })}>14.150</td>
              <td style={cell({ color: theme.muted })}>235.827</td>
              <td style={cell({ color: theme.muted })}>60,0</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Comportamiento */}
      <div className="dash-card" style={{ padding: '8px 12px', overflow: 'auto' }}>
        {head('Comportamiento Tintorería')}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr>
              {['m³/DÍA', 'DÍAS', 'Kg/DÍA', 'RETORNO (m³)', 'CALIENTE (m³)', 'REPORTADO (m³)'].map((h, i) => (
                <th key={i} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cell()}>590</td>
              <td style={cell()}>24</td>
              <td style={cell()}>10.785</td>
              <td style={cell({ color: theme.dim, fontStyle: 'italic' })}>Sin medidor</td>
              <td style={cell()}>1.435</td>
              <td style={cell()}>10.624</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tabla expandida Lavandería ────────────────────────────────────────────────
function TablasLavanderia({ undEfectivas, consumoM3, indLUnd }: {
  undEfectivas: number; consumoM3: number; indLUnd: number | null;
}) {
  const { theme } = useTheme();
  const red = { color: '#e05252', fontWeight: 700 as const };
  const cell = (style?: React.CSSProperties) => ({
    padding: '3px 8px', textAlign: 'center' as const, color: theme.text1,
    whiteSpace: 'nowrap' as const, fontVariantNumeric: 'tabular-nums' as const,
    ...style,
  });
  const th = { padding: '3px 8px', textAlign: 'center' as const, color: theme.muted, fontWeight: 600 as const,
    borderBottom: `1px solid ${theme.border}`, whiteSpace: 'nowrap' as const };
  return (
    <div className="dash-card" style={{ padding: '8px 12px', overflow: 'auto' }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
        background: '#DAE3F3', color: '#1c2128', padding: '3px 8px', marginBottom: 6, borderRadius: 3 }}>
        Consolidado Lavandería
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
        <thead>
          <tr>
            {['CONSUMO (m³)', 'Und EFECTIVAS', 'INDICADOR L/Und', 'CONSUMO PROY. (m³)', 'Und PROY.', 'IND. PROY. L/Und'].map((h, i) => (
              <th key={i} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cell(red)}>{fmtFull(consumoM3)}</td>
            <td style={cell()}>{fmtFull(undEfectivas)}</td>
            <td style={cell(red)}>{indLUnd != null ? indLUnd.toFixed(3) : '—'}</td>
            <td style={cell({ color: theme.muted })}>17.272</td>
            <td style={cell({ color: theme.muted })}>508.000</td>
            <td style={cell({ color: theme.muted })}>34,0</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ── Etiqueta SVG para pie — dos líneas: valor + porcentaje ──────────────────
function PieLabel(props: {
  cx?: number; cy?: number; midAngle?: number;
  outerRadius?: number; percent?: number; value?: number;
}) {
  const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, percent = 0, value = 0 } = props;
  if (percent < 0.06) return null;
  const RADIAN = Math.PI / 180;
  const r = outerRadius * 0.67;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <g>
      <text x={x} y={y - 6} textAnchor="middle" dominantBaseline="central"
        fill="#fff" fontSize={9} fontWeight={700}>
        {fmtFull(value)}
      </text>
      <text x={x} y={y + 7} textAnchor="middle" dominantBaseline="central"
        fill="#ffffffcc" fontSize={8}>
        {(percent * 100).toFixed(1)}%
      </text>
    </g>
  );
}

// ── Pie con fondo oscuro ──────────────────────────────────────────────────────
function PieCard({ titulo, total, slices }: {
  titulo: string;
  total: number;
  slices: { name: string; value: number; color: string }[];
}) {
  return (
    <div style={{
      background: '#1F3864', borderRadius: 8, padding: '14px 8px 12px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ color: '#fff', fontWeight: 700, fontSize: 12, textAlign: 'center', marginBottom: 2 }}>
        {titulo}
      </div>
      <div style={{ color: '#9DC3E6', fontSize: 11, textAlign: 'center', marginBottom: 6, fontWeight: 600 }}>
        Total: {fmtFull(total)} m³
      </div>
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie
            data={slices}
            cx="50%" cy="50%"
            outerRadius={68}
            dataKey="value"
            labelLine={false}
            label={PieLabel}
          >
            {slices.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="#1F3864" strokeWidth={1} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#0d1117', border: '1px solid #30363d', fontSize: 10 }}
            formatter={(val: number, name: string) => [`${fmtFull(val)} m³`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 10px' }}>
        {slices.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
            <div style={{ fontSize: 9, color: '#e6edf3', flexGrow: 1 }}>{d.name}</div>
            <div style={{ fontSize: 9, color: '#9DC3E6', fontVariantNumeric: 'tabular-nums' }}>
              {total > 0 ? `${(d.value / total * 100).toFixed(1)}%` : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function BalanceHidricoDashboard() {
  const { theme } = useTheme();
  const {
    granularidad, setGranularidad,
    fechaInicio, fechaFin,
    handleFechaInicio, handleFechaFin,
    draftInicio, draftFin, commitFechaInicio, commitFechaFin,
  } = useGranularidad({});

  const [turnoFiltro,    setTurnoFiltro]    = useState('');
  const [quitarSinDatos, setQuitarSinDatos] = useState(true);
  const [informeAbierto,  setInformeAbierto]  = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  const turnoNum = turnoFiltro ? Number(turnoFiltro) : undefined;
  const { data, loading, error } = useBalanceData(fechaInicio, fechaFin, turnoNum);

  const agrupado = useMemo(() => {
    const base = agruparPorGranularidad(data, {
      gran: granularidad,
      getFecha:  r => r.fecha,
      getTurno:  r => r.turno,
      sumFields: BALANCE_SUM_FIELDS,
      avgFields: BALANCE_AVG_FIELDS,
    });
    if (!quitarSinDatos) return base;
    return base.filter(r =>
      DATOS_CAMPOS.some(k => (r as Record<string, unknown>)[k as string] as number > 0)
    );
  }, [data, granularidad, quitarSinDatos]);

  // S5 — sin rotativa, con total_tratado_osmosis y total_a_tratar
  const agrupadoS5 = useMemo(() => agrupado.map(r => {
    const n = (k: string) => (r as Record<string, unknown>)[k] as number || 0;
    return {
      ...r,
      total_a_tratar:        n('acueducto_m3') + n('tintoreria_m3') + n('lavanderia_m3'),
      total_tratado_osmosis: n('permeado_ro1') + n('permeado_mbr1') + n('permeado_mbr2'),
    };
  }), [agrupado]);

  // S5 Vertimiento — balance: envio_th = permeadoRO + rechazoRO + vertMBR + vertGEM
  // vertMBR = exceso de MBRs que no llega a RO (buffer TK Permeado)
  // vertGEM = lo que sale de la planta que no vuelve a producción ni va a RO
  const agrupadoVert = useMemo(() => agrupado.map(r => {
    const n = (k: string) => (r as Record<string, unknown>)[k] as number || 0;
    const mbr     = n('permeado_mbr1') + n('permeado_mbr2');
    const entRo   = n('entrada_ro1');
    const vertMbr = Math.max(0, mbr - entRo);
    const vertGem = Math.max(0, n('envio_th') - entRo - vertMbr);
    return { ...r, vertimiento_gem_calc: vertGem, vertimiento_mbr_calc: vertMbr };
  }), [agrupado]);

  // S6 — permeado_mbr combinado + última semana
  const agrupadoS6 = useMemo(() => agrupadoS5.map(r => {
    const n = (k: string) => (r as Record<string, unknown>)[k] as number || 0;
    return { ...r, permeado_mbr: n('permeado_mbr1') + n('permeado_mbr2') };
  }), [agrupadoS5]);

  const agrupadoS6semana = useMemo(() => agrupadoS6.slice(-7), [agrupadoS6]);

  // Pie S6 — 4 slices: Permeado RO / Rechazo RO / Vert MBRs / Vert GEM
  // (usando mismo balance que agrupadoVert: envio_th como base)
  const pieS6 = useMemo(() => {
    const sum = (k: string) => agrupado.reduce((acc, r) => acc + (Number((r as Record<string, unknown>)[k]) || 0), 0);
    const mbrTotal  = sum('permeado_mbr1') + sum('permeado_mbr2');
    const entRo     = sum('entrada_ro1');
    const permRo    = sum('permeado_ro1');
    const vertMbr   = Math.max(0, mbrTotal - entRo);
    const vertGem   = Math.max(0, sum('envio_th') - entRo - vertMbr);
    const rechazoRo = Math.max(0, entRo - permRo);
    return [
      { name: 'Permeado RO',      value: permRo,   color: C.permeadoRO },
      { name: 'Rechazo RO',       value: rechazoRo, color: C.rechazoRO },
      { name: 'Vertimiento MBRs', value: vertMbr,   color: C.vertMBR },
      { name: 'Vertimiento GEM',  value: vertGem,   color: C.vertGem },
    ].filter(d => d.value > 0);
  }, [agrupado]);

  // Pie S1 — fuentes de suministro (mismos colores que barras S1)
  const kpis = useMemo(() => {
    const sum = (k: keyof BalanceHidricoRow) =>
      data.reduce((acc, r) => acc + (Number(r[k]) || 0), 0);
    const avgField = (k: keyof BalanceHidricoRow) => {
      const vals = data.filter(r => r[k] != null).map(r => Number(r[k]));
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const totalAcu    = sum('acueducto_m3');
    const totalRo     = sum('permeado_ro1');
    const totalCarrot = sum('carrotanques_m3') + sum('mulas_funza_m3');
    const totalPtap   = sum('potable_ptap');
    const totalSuministro = totalAcu + totalRo + totalCarrot + totalPtap;
    const dailyAgua   = agrupado.map(r => (r.total_agua_limpia_m3 as number) || 0).filter(v => v > 0);
    const diasEfectivos = dailyAgua.length;

    // Vertimiento (mismo balance que agrupadoVert)
    const totalTH     = sum('envio_th');
    const totalRoIn   = sum('entrada_ro1');
    const totalMbr    = sum('permeado_mbr1') + sum('permeado_mbr2');
    const totalVertMbr    = Math.max(0, totalMbr - totalRoIn);
    const totalVertRechazo= Math.max(0, totalRoIn - totalRo);
    const totalVertGem    = Math.max(0, totalTH - totalRoIn - totalVertMbr);
    const totalVertTotal  = Math.max(0, totalTH - totalRo);

    return {
      totalAgua: sum('total_agua_limpia_m3'), totalTH,
      totalAcu, eficRo: avgField('eficiencia_ro_pct'),
      totalGem: sum('consumo_gem_m3'), totalRoIn,
      totalRo, totalCarrot, totalPtap, totalSuministro, totalMbr,
      totalVertMbr, totalVertRechazo, totalVertGem, totalVertTotal,
      minAgua:  dailyAgua.length ? Math.min(...dailyAgua) : 0,
      maxAgua:  dailyAgua.length ? Math.max(...dailyAgua) : 0,
      avgAgua:  dailyAgua.length ? dailyAgua.reduce((a, b) => a + b, 0) / dailyAgua.length : 0,
      diasEfectivos,
      avgCarrot: diasEfectivos ? totalCarrot / diasEfectivos : 0,
      avgPtap:   diasEfectivos ? totalPtap   / diasEfectivos : 0,
      avgAcu:    diasEfectivos ? totalAcu    / diasEfectivos : 0,
      avgRo:     diasEfectivos ? totalRo     / diasEfectivos : 0,
      totalTin: sum('tintoreria_m3'), totalKgTela: sum('kg_tela'), avgIndTin: avgField('indicador_tin_l_kg'),
      totalLav: sum('lavanderia_m3'), totalUndEf:  sum('und_efectivas'), avgIndLav: avgField('indicador_lav_l_und'),
    };
  }, [data, agrupado]);

  const pieS1 = useMemo(() => [
    { name: '% Acueducto (m³)', value: kpis.totalAcu,    color: C.acueducto },
    { name: '% Permeado RO',    value: kpis.totalRo,     color: C.permeadoRO },
    { name: '% Carrotanques',   value: kpis.totalCarrot, color: C.carrotanques },
    { name: '% Consumo PTAP',   value: kpis.totalPtap,   color: C.ptap },
  ].filter(d => d.value > 0), [kpis]);

  const pct = (v: number) =>
    kpis.totalSuministro > 0 ? `${(v / kpis.totalSuministro * 100).toFixed(1)}%` : '—';

  // S9 — GEM $/m³
  const [gemRows, setGemRows] = useState<GemEficienciaRow[]>([]);
  useEffect(() => {
    if (!fechaInicio || !fechaFin) return;
    getGemEficiencia({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }).then(setGemRows).catch(() => {});
  }, [fechaInicio, fechaFin]);

  const gemAgrupado = useMemo(() => agruparPorGranularidad(gemRows, {
    gran: granularidad, getFecha: r => r.fecha,
    getTurno: r => TURNO_NUM[r.turno ?? ''] ?? 1,
    sumFields: ['caudal_m3'] as (keyof GemEficienciaRow)[],
    avgFields: ['pesos_por_m3'] as (keyof GemEficienciaRow)[],
  }), [gemRows, granularidad]);

  if (loading) {
    return (
      <div className="cal-page">
        <div className="cal-loading"><div className="spinner" /><span>Cargando balance hídrico…</span></div>
      </div>
    );
  }

  const totalS6 = pieS6.reduce((a, d) => a + d.value, 0);

  return (
    <>
    <div className="cal-page">

      {/* ── Encabezado ── */}
      <div className="cal-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="cal-title">Dashboard Balance Hídrico</h1>
          <p className="cal-subtitle">Volúmenes, eficiencia RO e indicadores de consumo por proceso</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignSelf: 'center' }}>
          <button onClick={() => setFiltrosAbiertos(v => !v)}
            style={{ background: filtrosAbiertos ? theme.surface2 : theme.surface, border: `1px solid ${theme.border}`,
              padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: theme.muted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13 }}>⚙</span> Filtros <span style={{ fontSize: 10, opacity: 0.7 }}>{filtrosAbiertos ? '▲' : '▼'}</span>
          </button>
          <button onClick={() => setInformeAbierto(true)}
            style={{ background: '#1a6b3c', border: 'none', padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
            💧 Informe
          </button>
        </div>
      </div>

      {/* ── Filtros ── */}
      {filtrosAbiertos && (
        <div className="cal-filters" style={{ marginBottom: 16 }}>
          <GranularidadSelector value={granularidad} onChange={setGranularidad} />
          <div className="cal-filter-group">
            <label className="cal-filter-label">Turno</label>
            <select className="cal-filter-select" value={turnoFiltro} onChange={e => setTurnoFiltro(e.target.value)}>
              <option value="">Todos</option>
              <option value="1">Noche</option>
              <option value="2">Mañana</option>
              <option value="3">Tarde</option>
            </select>
          </div>
          <div className="cal-filter-group">
            <label className="cal-filter-label">Fecha inicio</label>
            <input type="date" className="cal-filter-input" value={draftInicio}
              onChange={e => handleFechaInicio(e.target.value)} onBlur={e => commitFechaInicio(e.target.value)} />
          </div>
          <div className="cal-filter-group">
            <label className="cal-filter-label">Fecha fin</label>
            <input type="date" className="cal-filter-input" value={draftFin}
              onChange={e => handleFechaFin(e.target.value)} onBlur={e => commitFechaFin(e.target.value)} />
          </div>
          <div className="cal-filter-group" style={{ alignSelf: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: theme.muted }}>
              <input type="checkbox" checked={quitarSinDatos} onChange={e => setQuitarSinDatos(e.target.checked)} style={{ accentColor: '#1f6feb' }} />
              Quitar días sin datos
            </label>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: 12, background: '#2d1214', border: `1px solid ${theme.red}`, borderRadius: 6, color: theme.red, marginBottom: 16, fontSize: 12 }}>
          {error}
        </div>
      )}

      {/* ════════════════ S8 — RESUMEN DEL PERÍODO ════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={8} titulo="Resumen del Período" color="#DEEBF7" />
        {(() => {
          const pEnProceso = (v: number) =>
            kpis.totalSuministro > 0 ? `${(v / kpis.totalSuministro * 100).toFixed(1)}%` : '—';
          const pGem = (v: number) =>
            kpis.totalGem > 0 ? `${(v / kpis.totalGem * 100).toFixed(1)}%` : '—';
          const f  = (v: number) => fmtFull(Math.round(v));
          const f1 = (v: number) => v.toFixed(1);
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <KpiButtonTile color={C.acueducto} titulo="Consumo Diario (m³)" rows={[
                { label: 'MÍNIMO',         value: f(kpis.minAgua) },
                { label: 'MÁXIMO',         value: f(kpis.maxAgua) },
                { label: 'PROMEDIO',       value: f1(kpis.avgAgua) },
                { label: 'DÍAS EFECTIVOS', value: String(kpis.diasEfectivos), key: true },
              ]} />
              <KpiButtonTile color={C.ptap} titulo="Abastecimiento Promedio Días Efectivos (m³)" rows={[
                { label: 'CARROTANQUES', value: f1(kpis.avgCarrot) },
                { label: 'PTAP',         value: f1(kpis.avgPtap) },
                { label: 'ACUEDUCTO',    value: f1(kpis.avgAcu) },
                { label: 'RO',           value: f1(kpis.avgRo), key: true },
              ]} />
              <KpiButtonTile color={C.tintoreria} titulo="Salidas" rows={[
                { label: 'VOLUMEN TRATADO (m³)',  value: f(kpis.totalGem) },
                { label: 'VOL RECIRCULADO (m³)',  value: f(kpis.totalRo) },
                { label: 'VERTIMIENTO TOTAL',     value: f(kpis.totalVertTotal), key: true },
                { label: 'VERTIMIENTO RECHAZO',   value: f(kpis.totalVertRechazo) },
                { label: 'VERTIMIENTO MBRS',      value: f(kpis.totalVertMbr) },
                { label: 'VERTIMIENTO GEM',       value: f(kpis.totalVertGem) },
              ]} />
              <KpiButtonTile color={C.permeadoRO} titulo="M³ Ingreso a RO / M³ Tratados PTAR" rows={[
                { label: 'M³ PERMEADO RO',    value: f(kpis.totalRo) },
                { label: 'M³ TRATADOS PTAR',  value: f(kpis.totalGem) },
                { label: '% RECIRCULACIÓN',   value: pGem(kpis.totalRo), key: true },
              ]} />
              <KpiButtonTile color={C.permeadoRO} titulo="% Recirculación Total (Autonomía Hídrica)" rows={[
                { label: 'M³ PERMEADO RO',  value: f(kpis.totalRo) },
                { label: 'M³ EN PROCESO',   value: f(kpis.totalSuministro) },
                { label: '% RECIRCULACIÓN', value: pEnProceso(kpis.totalRo), key: true },
              ]} />
              <KpiButtonTile color={C.lavanderia} titulo="Dependencia de Fuente Externa" rows={[
                { label: 'M³ ACUEDUCTO',       value: f(kpis.totalAcu) },
                { label: 'M³ EN PROCESO',      value: f(kpis.totalSuministro) },
                { label: '% DEPENDENCIA EXT.', value: pEnProceso(kpis.totalAcu), key: true },
              ]} />
            </div>
          );
        })()}
      </section>

      {/* ════════════════ S1 — BALANCE HÍDRICO ════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={1} titulo="BALANCE HÍDRICO" color="#DAE3F3" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12, marginBottom: 12 }}>

          {/* Barras apiladas Fuentes + línea total */}
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: theme.muted, marginBottom: 6, paddingLeft: 8 }}>
              Balance Hídrico Global — Fuentes de suministro (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={agrupado} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [`${val.toFixed(1)} m³`, name]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar dataKey="carrotanques_m3" name="Carrotanques"  fill={C.carrotanques} stackId="s">
                  <LabelList dataKey="carrotanques_m3" position="insideTop" style={{ fill: '#1c2128', fontSize: 8, fontWeight: 700 }} formatter={(v: number) => v > 20 ? v.toFixed(0) : ''} />
                </Bar>
                <Bar dataKey="permeado_ro1"    name="Permeado RO"  fill={C.permeadoRO}  stackId="s">
                  <LabelList dataKey="permeado_ro1" position="insideTop" style={{ fill: '#1c2128', fontSize: 8, fontWeight: 700 }} formatter={(v: number) => v > 20 ? v.toFixed(0) : ''} />
                </Bar>
                <Bar dataKey="acueducto_m3"    name="Acueducto"    fill={C.acueducto}   stackId="s">
                  <LabelList dataKey="acueducto_m3" position="insideTop" style={{ fill: '#fff', fontSize: 8, fontWeight: 700 }} formatter={(v: number) => v > 20 ? v.toFixed(0) : ''} />
                </Bar>
                <Bar dataKey="potable_ptap"    name="PTAP Potable" fill={C.ptap}        stackId="s" radius={[3,3,0,0]}>
                  <LabelList dataKey="potable_ptap" position="insideTop" style={{ fill: '#fff', fontSize: 8, fontWeight: 700 }} formatter={(v: number) => v > 20 ? v.toFixed(0) : ''} />
                </Bar>
                <Line dataKey="total_agua_limpia_m3" name="Total Agua Limpia"
                  stroke={C.white} strokeWidth={2.5}
                  dot={DOT_WHITE} activeDot={{ r: 5, fill: C.white }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Pie distribución suministro */}
          <PieCard
            titulo="Distribución de Consumo"
            total={kpis.totalSuministro}
            slices={pieS1}
          />
        </div>

        {/* Tablas S1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <TablaResumen
            titulo="Consumo Diario (m³)"
            colorHead="#DAE3F3"
            cabeceras={['MÍNIMO', 'MÁXIMO', 'PROMEDIO', 'DÍAS EFECTIVOS']}
            filas={[[ fmtFull(kpis.minAgua), fmtFull(kpis.maxAgua), fmtDec1(kpis.avgAgua), String(kpis.diasEfectivos) ]]}
          />
          <TablaResumen
            titulo="Fuentes de Suministro"
            colorHead="#DAE3F3"
            cabeceras={['FUENTE', 'CONSUMO (m³)', '% CONSUMO']}
            filas={[
              ['Acueducto H40',   fmtFull(kpis.totalAcu),    pct(kpis.totalAcu)],
              ['% Pluvial RO',    fmtFull(kpis.totalRo),     pct(kpis.totalRo)],
              ['Suministro Ext.', fmtFull(kpis.totalCarrot), pct(kpis.totalCarrot)],
              ['PTAP',            fmtFull(kpis.totalPtap),   pct(kpis.totalPtap)],
              ['TOTAL',           fmtFull(kpis.totalSuministro), '100.0%'],
            ]}
          />
        </div>
      </section>

      {/* ════════════════ S2 — TINTORERÍA ════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={2} titulo="INDICADOR TINTORERÍA" color="#DAE3F3" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: theme.muted, marginBottom: 6, paddingLeft: 8 }}>
              Tintorería: Indicador L/Kg vs Volumen de Agua (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={agrupado} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis yAxisId="left"  tick={AXIS_TICK} width={50} label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} width={44} label={{ value: 'L/Kg', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 10, dx: 6 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar  yAxisId="left"  dataKey="tintoreria_m3"      name="Consumo Tintorería (m³)" fill={C.tintoreria} radius={[3,3,0,0]} />
                <Line yAxisId="right" dataKey="indicador_tin_l_kg" name="Indicador L/Kg"
                  stroke={C.tinInd} strokeWidth={2} dot={DOT_TIN} activeDot={{ r: 5, fill: C.tinInd }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: theme.muted, marginBottom: 6, paddingLeft: 8 }}>
              Tintorería: L/Kg vs Kg Producidos
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={agrupado} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis yAxisId="left"  tick={AXIS_TICK} width={54} label={{ value: 'Kg', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} width={44} label={{ value: 'L/Kg', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 10, dx: 6 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar  yAxisId="left"  dataKey="kg_tela"            name="Kg Tela" fill={C.ptap} radius={[3,3,0,0]} />
                <Line yAxisId="right" dataKey="indicador_tin_l_kg" name="Indicador L/Kg"
                  stroke={C.tinInd} strokeWidth={2} dot={DOT_TIN} activeDot={{ r: 5, fill: C.tinInd }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>
          <TablasTintoreria consumoM3={kpis.totalTin} kgTela={kpis.totalKgTela} indLKg={kpis.avgIndTin} />
          <BenchmarkTintoreria />
        </div>
      </section>

      {/* ════════════════ S3 — LAVANDERÍA ════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={3} titulo="INDICADOR LAVANDERÍA" color="#DAE3F3" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: theme.muted, marginBottom: 6, paddingLeft: 8 }}>
              Lavandería: L/Und vs Volumen de Agua (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={agrupado} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis yAxisId="left"  tick={AXIS_TICK} width={50} label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} width={44} label={{ value: 'L/Und', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 10, dx: 6 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar  yAxisId="left"  dataKey="lavanderia_m3"       name="Consumo Lavandería (m³)" fill={C.lavanderia} radius={[3,3,0,0]} />
                <Line yAxisId="right" dataKey="indicador_lav_l_und" name="Indicador L/Und"
                  stroke={C.lavInd} strokeWidth={2} dot={DOT_LAV} activeDot={{ r: 5, fill: C.lavInd }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: theme.muted, marginBottom: 6, paddingLeft: 8 }}>
              Lavandería: L/Und vs Unidades Efectivas
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={agrupado} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis yAxisId="left"  tick={AXIS_TICK} width={58} label={{ value: 'Und', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} width={44} label={{ value: 'L/Und', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 10, dx: 6 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar  yAxisId="left"  dataKey="und_efectivas"       name="Unidades Efectivas" fill={C.lavanderia} radius={[3,3,0,0]} />
                <Line yAxisId="right" dataKey="indicador_lav_l_und" name="Indicador L/Und"
                  stroke={C.lavInd} strokeWidth={2} dot={DOT_LAV} activeDot={{ r: 5, fill: C.lavInd }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <TablasLavanderia undEfectivas={kpis.totalUndEf} consumoM3={kpis.totalLav} indLUnd={kpis.avgIndLav} />
      </section>

      {/* ════════════════ S5 — BALANCE DE TRATABILIDAD ════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={5} titulo="BALANCE DE TRATABILIDAD" color="#A9CE91" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

          {/* Barras apiladas Acueducto + Tintorería + Lavandería (sin Rotativa) */}
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: theme.muted, marginBottom: 6, paddingLeft: 8 }}>
              Balance de Tratabilidad — Consumo por proceso (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={agrupadoS5} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [`${val.toFixed(1)} m³`, name]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar dataKey="acueducto_m3"  name="Acueducto"  fill={C.acueducto}  stackId="t">
                  <LabelList dataKey="acueducto_m3"  position="insideTop" style={{ fill: '#fff', fontSize: 8, fontWeight: 700 }} formatter={(v: number) => v > 20 ? v.toFixed(0) : ''} />
                </Bar>
                <Bar dataKey="tintoreria_m3" name="Tintorería" fill={C.tintoreria} stackId="t">
                  <LabelList dataKey="tintoreria_m3" position="insideTop" style={{ fill: '#fff', fontSize: 8, fontWeight: 700 }} formatter={(v: number) => v > 20 ? v.toFixed(0) : ''} />
                </Bar>
                <Bar dataKey="lavanderia_m3" name="Lavandería" fill={C.lavanderia} stackId="t" radius={[3,3,0,0]}>
                  <LabelList dataKey="lavanderia_m3" position="insideTop" style={{ fill: '#1c2128', fontSize: 8, fontWeight: 700 }} formatter={(v: number) => v > 20 ? v.toFixed(0) : ''} />
                </Bar>
                <Line dataKey="total_tratado_osmosis" name="Total Tratado Osmosis"
                  stroke={C.gem} strokeWidth={2}
                  dot={DOT_GEM} activeDot={{ r: 5, fill: C.gem }} connectNulls />
                <Line dataKey="total_a_tratar" name="Total Vol. a Tratar"
                  stroke={C.ptap} strokeWidth={2} strokeDasharray="4 2" dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Seguimiento y Control de Vertimiento — rediseñado */}
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: theme.muted, marginBottom: 6, paddingLeft: 8 }}>
              Seguimiento y Control de Vertimiento (m³/día)
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={agrupadoVert} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [`${val.toFixed(1)} m³`, name]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar dataKey="permeado_ro1"         name="Permeado RO"      fill={C.permeadoRO} stackId="v">
                  <LabelList dataKey="permeado_ro1"         position="insideTop" style={{ fill: '#1c2128', fontSize: 7, fontWeight: 700 }} formatter={(v: number) => v > 50 ? v.toFixed(0) : ''} />
                </Bar>
                <Bar dataKey="rechazo_ro1"          name="Rechazo RO"       fill={C.rechazoRO}  stackId="v">
                  <LabelList dataKey="rechazo_ro1"          position="insideTop" style={{ fill: '#fff', fontSize: 7, fontWeight: 700 }} formatter={(v: number) => v > 30 ? v.toFixed(0) : ''} />
                </Bar>
                <Bar dataKey="vertimiento_gem_calc" name="Vertimiento GEM"  fill={C.vertGem}    stackId="v">
                  <LabelList dataKey="vertimiento_gem_calc" position="insideTop" style={{ fill: '#1c2128', fontSize: 7, fontWeight: 700 }} formatter={(v: number) => v > 50 ? v.toFixed(0) : ''} />
                </Bar>
                <Bar dataKey="vertimiento_mbr_calc" name="Vertimiento MBRs" fill={C.vertMBR}    stackId="v" radius={[3,3,0,0]}>
                  <LabelList dataKey="vertimiento_mbr_calc" position="insideTop" style={{ fill: '#1c2128', fontSize: 7, fontWeight: 700 }} formatter={(v: number) => v > 30 ? v.toFixed(0) : ''} />
                </Bar>
                <Line dataKey="envio_th" name="Total Procesado"
                  stroke={C.gemDark} strokeWidth={2.5}
                  dot={DOT_GEM_L} activeDot={{ r: 5, fill: C.gemDark }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <TablaResumen
          titulo="Resumen Tratabilidad"
          colorHead="#A9CE91"
          cabeceras={['PROCESO', 'CONSUMO (m³)', '% DEL TOTAL']}
          filas={(() => {
            const total = kpis.totalTin + kpis.totalLav + kpis.totalAcu;
            const p = (v: number) => total > 0 ? `${(v / total * 100).toFixed(1)}%` : '—';
            return [
              ['Acueducto',  fmtFull(kpis.totalAcu), p(kpis.totalAcu)],
              ['Tintorería', fmtFull(kpis.totalTin), p(kpis.totalTin)],
              ['Lavandería', fmtFull(kpis.totalLav), p(kpis.totalLav)],
              ['TOTAL',      fmtFull(total),          '100.0%'],
            ];
          })()}
        />
      </section>

      {/* ════════════════ S6 — BALANCE DE TRATABILIDAD II ════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={6} titulo="BALANCE DE TRATABILIDAD II" color="#A9CE91" />
        <div className="dash-row-2col">

          {/* Pie tratabilidad — 4 slices */}
          <PieCard
            titulo="Tratabilidad Total — Distribución de agua tratada"
            total={totalS6}
            slices={pieS6}
          />

          {/* Balance en Planta — solo última semana */}
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 8, paddingRight: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: theme.muted }}>Balance en Planta (m³/día)</span>
              <span style={{ fontSize: 9, color: theme.dim, background: theme.surface2, padding: '2px 8px', borderRadius: 10, border: `1px solid ${theme.border}` }}>
                Última semana ({agrupadoS6semana.length} días)
              </span>
            </div>
            <ResponsiveContainer width="100%" height={255}>
              <ComposedChart data={agrupadoS6semana} margin={{ top: 4, right: 8, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval={0} angle={-35} textAnchor="end" height={44} />
                <YAxis tick={AXIS_TICK} width={50}
                  label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                  formatter={(val: number, name: string) => [`${val.toFixed(1)} m³`, name]} />
                <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
                <Bar dataKey="envio_th"             name="Enviado TH"      fill="#1F3864"     radius={[3,3,0,0]} maxBarSize={24} />
                <Bar dataKey="consumo_gem_m3"       name="Tratado GEM"     fill={C.ptap}      radius={[3,3,0,0]} maxBarSize={24} />
                <Bar dataKey="permeado_mbr"         name="Permeado MBRs"   fill={C.vertMBR}   radius={[3,3,0,0]} maxBarSize={24} />
                <Bar dataKey="permeado_ro1"         name="Permeado RO"     fill={C.permeadoRO} radius={[3,3,0,0]} maxBarSize={24} />
                <Bar dataKey="rechazo_ro1"          name="Rechazo RO"      fill={C.rechazoRO} radius={[3,3,0,0]} maxBarSize={24} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ════════════════ S7 — OPERACIÓN RO ════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={7} titulo="OPERACIÓN RO — EFICIENCIAS" color="#A9CE91" />
        <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
          <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
            Balance Global RO — Volúmenes y eficiencia (m³/día)
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={agrupado} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
              <YAxis yAxisId="left" tick={AXIS_TICK} width={50}
                label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
              <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} width={44}
                domain={[0, 100]} tickFormatter={(v: number) => `${v}%`}
                label={{ value: '%', angle: 90, position: 'insideRight', fill: '#484f58', fontSize: 10, dx: 4 }} />
              <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`} />
              <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
              <Bar  yAxisId="left"  dataKey="permeado_ro1"     name="Permeado RO"       fill={C.gem}       radius={[3,3,0,0]} stackId="ro" />
              <Bar  yAxisId="left"  dataKey="rechazo_ro1"      name="Rechazo RO"        fill={C.rechazoRO} stackId="ro" />
              <Line yAxisId="left"  dataKey="entrada_ro1"      name="Ingreso total RO"
                stroke={C.ptap} strokeWidth={2} dot={{ fill: C.ptap, r: 3 }} connectNulls />
              <Line yAxisId="right" dataKey="eficiencia_ro_pct" name="% Eficiencia global"
                stroke={C.roEfic} strokeWidth={2} strokeDasharray="4 2" dot={false} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ════════════════ S9 — INDICADOR FQ GEM ════════════════ */}
      <section className="dash-section">
        <SeccionHeader numero={9} titulo="INDICADOR TRATAMIENTO FQ GEM" color="#FFD966" textColor="#1c2128" />
        <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
          <div style={{ fontSize: 11, color: theme.muted, marginBottom: 6, paddingLeft: 8 }}>
            $m³ Tratamiento GEM — Caudal tratado vs indicador costo
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={gemAgrupado} margin={{ top: 4, right: 60, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="fecha" tickFormatter={fmt} tick={AXIS_TICK} interval="preserveStartEnd" />
              <YAxis yAxisId="left"  tick={AXIS_TICK} width={54}
                label={{ value: 'm³', angle: -90, position: 'insideLeft', fill: '#484f58', fontSize: 10, dx: -4 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#ED7D31', fontSize: 10 }} width={56}
                tickFormatter={(v: number) => `$${fmtM3(v)}`}
                label={{ value: '$/m³', angle: 90, position: 'insideRight', fill: '#ED7D3180', fontSize: 10, dx: 6 }} />
              <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v: string) => `Fecha: ${v}`}
                formatter={(val: number, name: string) => [
                  name === 'Indicador $/m³' ? `$${val.toFixed(0)}/m³` : `${val.toFixed(1)} m³`, name,
                ]} />
              <Legend wrapperStyle={{ color: '#8b949e', fontSize: 10 }} />
              <ReferenceLine yAxisId="right" y={GEM_META_M3} stroke="#70AD47" strokeDasharray="4 2"
                label={{ value: `Meta $${GEM_META_M3}/m³`, fill: '#70AD47', fontSize: 9, position: 'right' }} />
              <Bar  yAxisId="left"  dataKey="caudal_m3"    name="Caudal GEM (m³)" fill="#BDD7EE" radius={[3,3,0,0]} />
              <Line yAxisId="right" dataKey="pesos_por_m3" name="Indicador $/m³"
                stroke="#ED7D31" strokeWidth={2} dot={{ fill: '#ED7D31', r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

    </div>

    {informeAbierto && (
      <InformeBalanceModal fechaInicio={fechaInicio} fechaFin={fechaFin} onClose={() => setInformeAbierto(false)} />
    )}
    </>
  );
}
