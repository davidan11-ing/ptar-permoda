/**
 * RemocionCostoChart — % Remoción GEM de cualquier parámetro Vs $Costo/m³ turno a turno
 * Tiene selector de parámetro propio (independiente del dashboard global).
 * El costo/m³ viene de operacion_gem_turno (pesos_por_m3 o costo_quimica/caudal).
 */
import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useRemocionCosto } from '../hooks/useRemocionCosto';
import { getCalidadParametros } from '../../../services/ptarClient';
import type { Granularidad } from '../../../hooks/useGranularidad';
import { xLabel, sortKey, generateAllPeriods } from '../../../lib/utils/agruparTemporal';

// ─── Colores ───────────────────────────────────────────────────────────────
const COLOR_BAR  = '#ED7D31';   // naranja — costo $/m³
const COLOR_LINE = '#70AD47';   // verde   — % remoción

// Label rotado -90° sobre cada barra de costo $/m³
function LabelBarra(props: any) {
  const { x, y, width, value } = props;
  if (!value || value === 0) return null;
  const cx = x + width / 2;
  const cy = y + 6;
  return (
    <text x={cx} y={cy} transform={`rotate(-90,${cx},${cy})`}
      textAnchor="start" fill="#8b949e" fontSize={9} fontFamily="monospace">
      {`$ ${Math.round(value).toLocaleString('es-CO')}`}
    </text>
  );
}

// Label rotado -90° sobre cada punto de la línea de remoción
function LabelLinea(props: any) {
  const { x, y, value } = props;
  if (value === undefined || value === null || value === 0) return null;
  return (
    <text x={x} y={y - 6} transform={`rotate(-90,${x},${y - 6})`}
      textAnchor="start" fill="#8b949e" fontSize={9} fontFamily="monospace">
      {`${(value * 100).toFixed(1)}%`}
    </text>
  );
}

// Tooltip oscuro personalizado con costo y remoción por turno
function TooltipCustom({ active, payload, label, param }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#161b22', border:'1px solid #30363d',
      borderRadius:8, padding:'8px 12px', fontSize:12 }}>
      <p style={{ color:'#8b949e', marginBottom:4, fontWeight:600 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color:p.color, margin:'2px 0' }}>
          {p.dataKey === 'costoM3'
            ? `$/m³: $ ${Math.round(p.value).toLocaleString('es-CO')}`
            : `Remoción ${param}: ${(p.value * 100).toFixed(1)}%`
          }
        </p>
      ))}
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────
interface Props {
  fechaInicio:  string;
  fechaFin:     string;
  parametro?:   string;
  granularidad?: Granularidad | null;
}

// Genera array de fechas ISO diarias entre inicio y fin (inclusive)
function generarFechas(inicio: string, fin: string): string[] {
  const fechas: string[] = [];
  const cur = new Date(inicio + 'T00:00:00');
  const end = new Date(fin   + 'T00:00:00');
  while (cur <= end) { fechas.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
  return fechas;
}

// Gráfica combinada barras (costo $/m³) + línea (% remoción GEM) con selector propio
export default function RemocionCostoChart({ fechaInicio, fechaFin, parametro: paramProp, granularidad }: Props) {
  // Lista de parámetros disponibles y selección local independiente del padre
  const [parametros,      setParametros]      = useState<string[]>([]);
  const [parametroLocal,  setParametroLocal]  = useState('');
  // Toggle para mostrar turnos sin datos como ceros
  const [mostrarVacios,   setMostrarVacios]   = useState(false);

  // Cargar lista de parámetros disponibles desde la BD
  useEffect(() => {
    getCalidadParametros().then(data => {
      const uniq = [...new Set(data.map((r: any) => r.nombre))].sort() as string[];
      setParametros(uniq);
      // Si el padre sugirió uno y está disponible, usarlo; sino usar pH por defecto
      const inicial = paramProp && uniq.includes(paramProp)
        ? paramProp
        : (uniq.find(p => p === 'pH') ?? uniq[0] ?? '');
      setParametroLocal(inicial);
    }).catch(() => {});
  }, []);

  // Sincronizar parámetro local cuando el padre cambia su selección
  useEffect(() => {
    if (paramProp && parametros.includes(paramProp)) {
      setParametroLocal(paramProp);
    }
  }, [paramProp, parametros]);

  const paramActivo = parametroLocal || paramProp || 'pH';
  const { data: rawData, loading, error } = useRemocionCosto(fechaInicio, fechaFin, paramActivo);

  // Índice para días sin datos
  const dataIdx = useMemo(() => {
    const m = new Map<string, typeof rawData[0]>();
    rawData.forEach(r => m.set(`${r.fecha}|${r.turno}`, r));
    return m;
  }, [rawData]);

  // Agrupa y promedia según granularidad; rellena vacíos si el toggle está activo
  const data = useMemo(() => {
    const gran = granularidad;
    // Para día/semana/mes → agrupar y promediar
    if (gran && gran !== 'turno') {
      type B = { sk: string; label: string; rem: number[]; costo: number[] };
      const map = new Map<string, B>();
      for (const r of rawData) {
        if (r.remocion === 0 && r.costoM3 === 0) continue;
        const sk    = sortKey(r.fecha, undefined, gran);
        const label = xLabel(r.fecha, undefined, gran);
        if (!map.has(sk)) map.set(sk, { sk, label, rem: [], costo: [] });
        const b = map.get(sk)!;
        if (r.remocion !== 0) b.rem.push(r.remocion);
        if (r.costoM3  >  0) b.costo.push(r.costoM3);
      }
      // Rellenar períodos vacíos si mostrarVacios está activo
      if (mostrarVacios) {
        for (const { sk, label } of generateAllPeriods(fechaInicio, fechaFin, gran)) {
          if (!map.has(sk)) map.set(sk, { sk, label, rem: [], costo: [] });
        }
      }
      const avg = (arr: number[]) =>
        arr.length ? arr.reduce((a, v) => a + v, 0) / arr.length : 0;
      return Array.from(map.values())
        .sort((a, b) => a.sk.localeCompare(b.sk))
        .map(b => ({
          label:    b.label,
          fecha:    b.sk,
          turno:    '',
          costoM3:  +avg(b.costo).toFixed(0),
          remocion: +avg(b.rem).toFixed(4),
        }));
    }
    // Turno a turno (comportamiento original)
    if (!mostrarVacios) {
      return rawData.filter(r => r.remocion !== 0 || r.costoM3 > 0);
    }
    const rows: typeof rawData = [];
    generarFechas(fechaInicio, fechaFin).forEach(f => {
      ['T1','T2','T3'].forEach(t => {
        const real = dataIdx.get(`${f}|${t}`);
        if (real) { rows.push(real); }
        else {
          const [,m,d] = f.slice(0, 10).split('-');
          rows.push({ label:`${d}/${m} ${t}`, fecha:f, turno:t, costoM3:0, remocion:0 });
        }
      });
    });
    return rows;
  }, [rawData, dataIdx, mostrarVacios, fechaInicio, fechaFin, granularidad]);

  // Estados de carga, error o sin datos
  const renderBody = () => {
    if (loading) return (
      <div style={{ height:280, display:'flex', alignItems:'center',
        justifyContent:'center', color:'#484f58', fontSize:13 }}>
        Cargando datos…
      </div>
    );
    if (error) return (
      <div style={{ height:280, display:'flex', alignItems:'center',
        justifyContent:'center', color:'#f85149', fontSize:13 }}>
        {error}
      </div>
    );
    if (!data.length) return (
      <div style={{ height:280, display:'flex', alignItems:'center',
        justifyContent:'center', color:'#484f58', fontSize:13 }}>
        Sin datos para <strong style={{marginLeft:4}}>{paramActivo}</strong>
      </div>
    );

    // Dominio Y izquierdo (remoción) y derecho (costo) calculados dinámicamente
    const rems    = data.map(d => d.remocion).filter(v => v !== 0);
    const minRem  = rems.length ? Math.min(...rems) : -0.1;
    const maxRem  = rems.length ? Math.max(...rems) :  0.15;
    const yLMin   = Math.floor((minRem - 0.02) * 20) / 20;
    const yLMax   = Math.ceil ((maxRem + 0.02) * 20) / 20;
    const costos  = data.map(d => d.costoM3).filter(v => v > 0);
    const maxCosto = costos.length ? Math.max(...costos) : 5000;
    const yRMax   = Math.ceil(maxCosto / 500) * 500 + 500;

    // Gráfica combinada con barra de costo (eje der.) y línea de remoción (eje izq.)
    return (
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top:40, right:0, left:5, bottom:20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
          <XAxis dataKey="label"
            tick={{ fill:'#8b949e', fontSize:9, fontFamily:'monospace' }}
            angle={-60} textAnchor="end" interval={0} height={50}
            tickLine={false} axisLine={{ stroke:'#30363d' }} />
          <YAxis yAxisId="left" orientation="left" domain={[yLMin, yLMax]}
            tickFormatter={v => `${(v * 100).toFixed(0)}%`}
            tick={{ fill:'#8b949e', fontSize:9, fontFamily:'monospace' }}
            tickLine={false} axisLine={false} width={44} />
          <YAxis yAxisId="right" orientation="right" domain={[0, yRMax]}
            tickFormatter={v => `$ ${Math.round(v).toLocaleString('es-CO')}`}
            tick={{ fill:'#8b949e', fontSize:9, fontFamily:'monospace' }}
            tickLine={{ stroke:'#30363d' }} axisLine={false} width={70} />
          <Tooltip content={<TooltipCustom param={paramActivo} />} />
          <Legend verticalAlign="bottom"
            wrapperStyle={{ paddingTop:12, fontSize:9, color:'#8b949e', fontFamily:'monospace' }}
            formatter={(value) => value === 'costoM3' ? '$ / m³ tratado (GEM)' : `% REMOCIÓN ${paramActivo.toUpperCase()}`} />
          <Bar yAxisId="right" dataKey="costoM3" name="costoM3"
            fill={COLOR_BAR} barSize={8} radius={[2,2,0,0]} label={<LabelBarra />} />
          <Line yAxisId="left" type="linear" dataKey="remocion" name="remocion"
            stroke={COLOR_LINE} strokeWidth={2}
            dot={{ r:3, fill:COLOR_LINE, stroke:COLOR_LINE }}
            activeDot={{ r:5 }} label={<LabelLinea />} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  // Contenedor con selector de parámetro, toggle de vacíos y gráfica
  return (
    <div>
      {/* ── Selector de parámetro propio ── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12, flexWrap:'wrap' }}>
        <label className="cal-filter-label" style={{ whiteSpace:'nowrap' }}>
          Parámetro
        </label>
        <select className="cal-filter-select" value={parametroLocal}
          onChange={e => setParametroLocal(e.target.value)} style={{ minWidth:200 }}>
          {parametros.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <span style={{ fontSize:10, color:'#484f58', fontFamily:'monospace' }}>
          Remoción GEM (Homo→Salida) vs costo $/m³ operación química
        </span>
        {/* Toggle días sin datos */}
        <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer',
          fontSize:11, color:'#8b949e', userSelect:'none', whiteSpace:'nowrap' }}
          onClick={() => setMostrarVacios(v => !v)}>
          <div style={{ width:30, height:16, borderRadius:8, position:'relative',
            background:mostrarVacios?'#1f6feb':'#30363d',
            border:`1px solid ${mostrarVacios?'#388bfd':'#484f58'}`, transition:'background .2s', flexShrink:0 }}>
            <div style={{ position:'absolute', top:1, width:12, height:12, borderRadius:'50%',
              background:mostrarVacios?'#fff':'#8b949e', transition:'left .2s', left:mostrarVacios?15:2 }}/>
          </div>
          Días sin datos
        </label>
      </div>
      {renderBody()}
    </div>
  );
}
