/**
 * ParamVsDosisSection — PARÁMETRO VS DOSIS DE QUÍMICO
 * Permite seleccionar el parámetro de calidad Y uno o más químicos GEM.
 * Barras: Entrada (Homo) y Salida (GEM) del parámetro.
 * Líneas: PPM de cada químico seleccionado (multi-selección).
 */
import { useState, useMemo } from 'react';
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList,
} from 'recharts';
import { useParamVsDosis } from '../hooks/useParamVsDosis';
import { useRemociónGem }  from '../hooks/useRemociónGem';
import type { Granularidad } from '../../../hooks/useGranularidad';
import { xLabel, sortKey, generateAllPeriods } from '../../../lib/utils/agruparTemporal';

// ─── Catálogo de químicos GEM ─────────────────────────────────────────────
const QUIMICOS = [
  { key: 'ppm_acido',         label: 'Ácido',          color: '#EF4444' },
  { key: 'ppm_coagulante',    label: 'Coagulante',     color: '#F97316' },
  { key: 'ppm_decolorante',   label: 'Decolorante',    color: '#EAB308' },
  { key: 'ppm_pol_anionico',  label: 'Pol. Aniónico',  color: '#22C55E' },
  { key: 'ppm_pol_cationico', label: 'Pol. Catiónico', color: '#4472C4' },
] as const;

type QuimicoKey = typeof QUIMICOS[number]['key'];

// Genera arreglo de fechas YYYY-MM-DD entre inicio y fin (inclusive)
function generarFechas(inicio: string, fin: string): string[] {
  const fechas: string[] = [];
  const cur = new Date(inicio + 'T00:00:00');
  const end = new Date(fin   + 'T00:00:00');
  while (cur <= end) { fechas.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
  return fechas;
}

// ─── Colores barras ───────────────────────────────────────────────────────
const COLOR_ENTRADA = '#7030A0';
const COLOR_SALIDA  = '#00B0F0';

// ─── Tooltip dark ─────────────────────────────────────────────────────────
// Tooltip personalizado con fondo oscuro para el gráfico combinado
function TooltipCustom({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#161b22', border:'1px solid #30363d',
      borderRadius:8, padding:'8px 12px', fontSize:11 }}>
      <p style={{ color:'#8b949e', marginBottom:4, fontWeight:600 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color ?? p.fill, margin:'2px 0' }}>
          {p.name}: {p.value != null && p.value !== 0 ? Number(p.value).toFixed(2) : '—'}
        </p>
      ))}
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────
interface Props { fechaInicio: string; fechaFin: string; granularidad?: Granularidad | null }

// ─── Componente ───────────────────────────────────────────────────────────
// Gráfico combinado barras (parámetro) + líneas (PPM químicos) con multi-selección de reactivos
export default function ParamVsDosisSection({ fechaInicio, fechaFin, granularidad }: Props) {
  // Parámetro de calidad seleccionado
  const [parametro,       setParametro]       = useState('');
  // Químicos activos para mostrar como línea PPM
  const [quimicosActivos, setQuimicosActivos] = useState<QuimicoKey[]>(['ppm_pol_cationico']);
  // Toggle para incluir turnos sin datos en el calendario
  const [mostrarVacios,   setMostrarVacios]   = useState(false);

  // Lista de parámetros disponibles
  const { data: remData } = useRemociónGem('', fechaInicio, fechaFin);
  const parametros = useMemo(() =>
    [...new Set(remData.map(r => r.parametro))].sort(),
  [remData]);

  const param = parametro || parametros[0] || '';

  const { data: rawData, loading, error } = useParamVsDosis(fechaInicio, fechaFin, param);

  // Objeto vacío de PPM para turnos sin registro
  const NULL_PPM = { ppm_acido:null, ppm_coagulante:null, ppm_decolorante:null, ppm_pol_anionico:null, ppm_pol_cationico:null };

  // Índice rápido fecha|turno → fila real para relleno de vacíos
  const realIdx = useMemo(() => {
    const m = new Map<string, typeof rawData[0]>();
    rawData.forEach(r => m.set(`${r.fecha}|${r.turno}`, r));
    return m;
  }, [rawData]);

  const PPM_KEYS = ['ppm_acido','ppm_coagulante','ppm_decolorante','ppm_pol_anionico','ppm_pol_cationico'] as const;

  // Puntos del gráfico: agrupados por granularidad o turno a turno con/sin vacíos
  const chartData = useMemo(() => {
    const gran = granularidad;

    const toRow = (r: typeof rawData[0]) => ({
      label:             r.label,
      entrada:           r.entrada           !== 0 ? r.entrada           : null,
      salida:            r.salida            !== 0 ? r.salida            : null,
      ppm_acido:         r.ppm_acido         !== 0 ? r.ppm_acido         : null,
      ppm_coagulante:    r.ppm_coagulante    !== 0 ? r.ppm_coagulante    : null,
      ppm_decolorante:   r.ppm_decolorante   !== 0 ? r.ppm_decolorante   : null,
      ppm_pol_anionico:  r.ppm_pol_anionico  !== 0 ? r.ppm_pol_anionico  : null,
      ppm_pol_cationico: r.ppm_pol_cationico !== 0 ? r.ppm_pol_cationico : null,
    });

    // Día / semana / mes → agrupar y promediar
    if (gran && gran !== 'turno') {
      type B = {
        sk: string; label: string;
        ent: number[]; sal: number[];
        ppm: Record<string, number[]>;
      };
      const newBucket = (sk: string, label: string): B => ({
        sk, label, ent: [], sal: [], ppm: Object.fromEntries(PPM_KEYS.map(k => [k, []]))
      });
      const map = new Map<string, B>();
      for (const r of rawData) {
        const sk    = sortKey(r.fecha, undefined, gran);
        const label = xLabel(r.fecha, undefined, gran);
        if (!map.has(sk)) map.set(sk, newBucket(sk, label));
        const b = map.get(sk)!;
        if (r.entrada !== 0 && r.entrada != null) b.ent.push(r.entrada);
        if (r.salida  !== 0 && r.salida  != null) b.sal.push(r.salida);
        for (const k of PPM_KEYS) {
          const v = (r as any)[k];
          if (v != null && v !== 0) b.ppm[k].push(v);
        }
      }
      // Rellenar períodos vacíos si mostrarVacios activo
      if (mostrarVacios) {
        for (const { sk, label } of generateAllPeriods(fechaInicio, fechaFin, gran)) {
          if (!map.has(sk)) map.set(sk, newBucket(sk, label));
        }
      }
      const avg = (arr: number[]) =>
        arr.length ? +(arr.reduce((a, v) => a + v, 0) / arr.length).toFixed(2) : null;

      return Array.from(map.values())
        .sort((a, b) => a.sk.localeCompare(b.sk))
        .map(b => ({
          label:   b.label,
          entrada: avg(b.ent),
          salida:  avg(b.sal),
          ...Object.fromEntries(PPM_KEYS.map(k => [k, avg(b.ppm[k])])),
        }));
    }

    // Turno a turno (comportamiento original)
    if (!mostrarVacios) {
      return [...rawData]
        .sort((a,b) => a.fecha.localeCompare(b.fecha) || a.turno.localeCompare(b.turno))
        .map(toRow)
        .filter(r => r.entrada != null || r.salida != null ||
          r.ppm_acido != null || r.ppm_coagulante != null ||
          r.ppm_decolorante != null || r.ppm_pol_anionico != null || r.ppm_pol_cationico != null);
    }
    // Calendario completo con slots vacíos por fecha × turno
    const rows: ReturnType<typeof toRow>[] = [];
    generarFechas(fechaInicio, fechaFin).forEach(f => {
      ['T1','T2','T3'].forEach(t => {
        const real = realIdx.get(`${f}|${t}`);
        if (real) { rows.push(toRow(real)); }
        else {
          const [,m,d] = f.split('-');
          rows.push({ label:`${d}/${m} ${t}`, entrada:null, salida:null, ...NULL_PPM });
        }
      });
    });
    return rows;
  }, [rawData, realIdx, mostrarVacios, fechaInicio, fechaFin, granularidad]);

  // Escala eje PPM (máximo entre todos los químicos activos)
  const maxPpm = useMemo(() => {
    let mx = 0;
    for (const pt of rawData) {
      for (const q of quimicosActivos) {
        const v = (pt as any)[q];
        if (v != null && v > mx) mx = v;
      }
    }
    return mx ? Math.ceil(mx * 1.3) : 40;
  }, [rawData, quimicosActivos]);

  // Toggle de un químico en la lista activa
  const toggleQuimico = (key: QuimicoKey) =>
    setQuimicosActivos(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );

  return (
    <section className="dash-section">

      {/* ── Título ── */}
      <div style={{
        background:'#1f6feb22', borderLeft:'3px solid #1f6feb',
        padding:'5px 12px', marginBottom:12, fontSize:12, fontWeight:700,
        color:'#58a6ff', letterSpacing:'0.06em', textTransform:'uppercase',
      }}>
        PARÁMETRO VS DOSIS DE QUÍMICO
      </div>

      {/* ── Controles: parámetro + selector múltiple de químicos ── */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:20,
        marginBottom:14, flexWrap:'wrap' }}>

        {/* Selector parámetro + toggle días sin datos */}
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <label className="cal-filter-label" style={{ whiteSpace:'nowrap' }}>
            Parámetro
          </label>
          <select className="cal-filter-select" value={param}
            onChange={e => setParametro(e.target.value)} style={{ minWidth:200 }}>
            {parametros.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer',
            fontSize:11, color:'#8b949e', userSelect:'none', whiteSpace:'nowrap' }}
            onClick={() => setMostrarVacios(v => !v)}>
            <div style={{ width:30, height:16, borderRadius:8, position:'relative',
              background: mostrarVacios?'#1f6feb':'#30363d',
              border:`1px solid ${mostrarVacios?'#388bfd':'#484f58'}`, transition:'background .2s', flexShrink:0 }}>
              <div style={{ position:'absolute', top:1, width:12, height:12, borderRadius:'50%',
                background:mostrarVacios?'#fff':'#8b949e', transition:'left .2s', left:mostrarVacios?15:2 }}/>
            </div>
            Días sin datos
          </label>
        </div>

        {/* Pills de químicos — multi-selección */}
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          <span style={{ fontSize:10, color:'#8b949e', textTransform:'uppercase',
            letterSpacing:'0.05em' }}>
            Químicos GEM (selección múltiple)
          </span>
          {/* Botones pill: activo = fondo sólido, inactivo = borde transparente */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {QUIMICOS.map(q => {
              const activo = quimicosActivos.includes(q.key);
              return (
                <button
                  key={q.key}
                  onClick={() => toggleQuimico(q.key)}
                  style={{
                    padding:'3px 10px', borderRadius:12, fontSize:11,
                    cursor:'pointer', transition:'all .15s',
                    border:`1.5px solid ${q.color}`,
                    background: activo ? q.color : 'transparent',
                    color:      activo ? '#fff'   : q.color,
                    fontWeight: activo ? 600 : 400,
                  }}
                >
                  {q.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="cal-loading">Cargando…</div>
      ) : error ? (
        <div className="cal-empty" style={{ color:'#f85149' }}>{error}</div>
      ) : !chartData.length ? (
        <div className="cal-empty">Sin datos para <strong>{param}</strong></div>
      ) : (
        <div className="dash-card" style={{ padding:'12px 4px 0px' }}>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData}
              margin={{ top:20, right:55, left:10, bottom:10 }}>

              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />

              <XAxis dataKey="label"
                tick={{ fill:'#8b949e', fontSize:8 }}
                angle={-60} textAnchor="end" interval={0} height={70}
                tickLine={false} axisLine={{ stroke:'#30363d' }} />

              {/* Eje izquierdo — valor del parámetro */}
              <YAxis yAxisId="left" orientation="left"
                tick={{ fill:'#8b949e', fontSize:9 }} width={52}
                tickLine={false} axisLine={false}
                tickFormatter={(v:number) =>
                  v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(2)
                }
                label={{ value:'PARÁMETRO', angle:-90, position:'insideLeft',
                  fill:'#484f58', fontSize:8, dx:-4 }} />

              {/* Eje derecho — PPM */}
              <YAxis yAxisId="right" orientation="right"
                domain={[0, maxPpm]}
                tick={{ fill:'#8b949e', fontSize:9 }} width={42}
                tickLine={false} axisLine={false}
                tickFormatter={(v:number) => `${v.toFixed(0)}`}
                label={{ value:'PPM', angle:90, position:'insideRight',
                  fill:'#8b949e80', fontSize:8, dx:12 }} />

              <Tooltip content={<TooltipCustom />} />
              <Legend wrapperStyle={{ color:'#8b949e', fontSize:10, paddingTop:4 }} />

              {/* Barra Entrada */}
              <Bar yAxisId="left" dataKey="entrada"
                name="ENTRADA GEM (HOMO)" fill={COLOR_ENTRADA}
                radius={[2,2,0,0]} maxBarSize={16}>
                <LabelList dataKey="entrada" position="top"
                  style={{ fill:'#c084fc', fontSize:7, fontFamily:'monospace' }}
                  formatter={(v:number|null) => v != null && v > 0 ? v.toFixed(1) : ''} />
              </Bar>

              {/* Barra Salida */}
              <Bar yAxisId="left" dataKey="salida"
                name="SALIDA GEM" fill={COLOR_SALIDA}
                radius={[2,2,0,0]} maxBarSize={16}>
                <LabelList dataKey="salida" position="top"
                  style={{ fill:'#7dd3fc', fontSize:7, fontFamily:'monospace' }}
                  formatter={(v:number|null) => v != null && v > 0 ? v.toFixed(1) : ''} />
              </Bar>

              {/* Líneas PPM — una por cada químico activo */}
              {QUIMICOS.filter(q => quimicosActivos.includes(q.key)).map(q => (
                <Line key={q.key}
                  yAxisId="right" type="linear"
                  dataKey={q.key}
                  name={`PPM ${q.label.toUpperCase()}`}
                  stroke={q.color} strokeWidth={2}
                  dot={{ r:4, fill:q.color, stroke:q.color }}
                  activeDot={{ r:6 }}
                  connectNulls>
                  <LabelList dataKey={q.key} position="top"
                    style={{ fill:q.color, fontSize:7, fontFamily:'monospace' }}
                    formatter={(v:number|null) => v != null && v > 0 ? v.toFixed(1) : ''} />
                </Line>
              ))}

            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
