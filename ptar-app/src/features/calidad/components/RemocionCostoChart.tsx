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

// ─── Colores ───────────────────────────────────────────────────────────────
const COLOR_BAR  = '#ED7D31';   // naranja — costo $/m³
const COLOR_LINE = '#70AD47';   // verde   — % remoción

// ─── Label rotado -90° para las barras (costo $/m³) ───────────────────────
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

// ─── Label rotado -90° para la línea (% remoción) ─────────────────────────
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

// ─── Tooltip personalizado dark ───────────────────────────────────────────
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
  fechaInicio: string;
  fechaFin:    string;
  parametro?:  string;   // parámetro inicial sugerido por el padre
}

function generarFechas(inicio: string, fin: string): string[] {
  const fechas: string[] = [];
  const cur = new Date(inicio + 'T00:00:00');
  const end = new Date(fin   + 'T00:00:00');
  while (cur <= end) { fechas.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
  return fechas;
}

// ─── Componente principal ──────────────────────────────────────────────────
export default function RemocionCostoChart({ fechaInicio, fechaFin, parametro: paramProp }: Props) {
  const [parametros,      setParametros]      = useState<string[]>([]);
  const [parametroLocal,  setParametroLocal]  = useState('');
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

  // Si el padre cambia su parámetro y coincide con uno disponible, sincronizar
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

  const data = useMemo(() => {
    if (!mostrarVacios) return rawData;
    const rows: typeof rawData = [];
    generarFechas(fechaInicio, fechaFin).forEach(f => {
      ['T1','T2','T3'].forEach(t => {
        const real = dataIdx.get(`${f}|${t}`);
        if (real) { rows.push(real); }
        else {
          const [,m,d] = f.split('-');
          rows.push({ label:`${d}/${m} ${t}`, fecha:f, turno:t, costoM3:0, remocion:0 });
        }
      });
    });
    return rows;
  }, [rawData, dataIdx, mostrarVacios, fechaInicio, fechaFin]);

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

    const rems    = data.map(d => d.remocion).filter(v => v !== 0);
    const minRem  = rems.length ? Math.min(...rems) : -0.1;
    const maxRem  = rems.length ? Math.max(...rems) :  0.15;
    const yLMin   = Math.floor((minRem - 0.02) * 20) / 20;
    const yLMax   = Math.ceil ((maxRem + 0.02) * 20) / 20;
    const costos  = data.map(d => d.costoM3).filter(v => v > 0);
    const maxCosto = costos.length ? Math.max(...costos) : 5000;
    const yRMax   = Math.ceil(maxCosto / 500) * 500 + 500;

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
