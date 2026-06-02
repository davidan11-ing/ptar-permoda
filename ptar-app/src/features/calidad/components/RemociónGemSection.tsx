/**
 * RemociónGemSection — Gráfico combinado Entrada/Salida GEM + % Remoción
 * Filtro de parámetro INDEPENDIENTE del dashboard global (dropdown propio).
 * Toggle "Mostrar días sin datos" para ver el calendario completo.
 */
import { useState, useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { useRemociónGem } from '../hooks/useRemociónGem';

const COLOR_ENTRADA = '#1f6feb';
const COLOR_SALIDA  = '#8b5cf6';
const COLOR_PCT     = '#3fb950';

interface Stats { min:number; max:number; promedio:number; desvEst:number; vcPct:number }

function calcStats(arr:(number|null)[]):Stats|null {
  const d = arr.filter((v):v is number => v!==null && v!==0);
  if (!d.length) return null;
  const mean = d.reduce((a,b)=>a+b,0)/d.length;
  const std  = Math.sqrt(d.reduce((s,v)=>s+(v-mean)**2,0)/d.length);
  return { min:Math.min(...d), max:Math.max(...d), promedio:mean,
           desvEst:std, vcPct:mean!==0?(std/mean)*100:0 };
}

function StatsTable({title,stats,unit}:{title:string;stats:Stats|null;unit:string}) {
  const c:React.CSSProperties = {padding:'3px 6px',fontSize:11,color:'#c9d1d9',
    borderBottom:'1px solid #21262d',fontFamily:'monospace',textAlign:'right'};
  const h:React.CSSProperties = {...c,fontWeight:700,color:'#8b949e',fontSize:9,
    textTransform:'uppercase',background:'#161b22'};
  return (
    <div>
      <div style={{fontSize:10,fontWeight:700,color:'#8b949e',letterSpacing:'0.06em',
        marginBottom:4,textTransform:'uppercase'}}>{title}</div>
      {!stats ? <div style={{fontSize:11,color:'#484f58'}}>Sin datos</div> : (
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr>{['MÍN','MÁX','PROM','VC%','DESV'].map(x=><th key={x} style={h}>{x}</th>)}</tr></thead>
          <tbody>
            <tr>
              <td style={c}>{stats.min.toFixed(2)}</td>
              <td style={c}>{stats.max.toFixed(2)}</td>
              <td style={c}>{stats.promedio.toFixed(2)}</td>
              <td style={{...c,color:stats.vcPct>30?'#f0883e':'#c9d1d9'}}>{stats.vcPct.toFixed(1)}%</td>
              <td style={c}>{stats.desvEst.toFixed(2)}</td>
            </tr>
            <tr><td colSpan={5} style={{...c,fontSize:9,color:'#484f58',borderBottom:'none',paddingTop:2}}>{unit}</td></tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

function fmtFecha(raw:string):string {
  try { const [,m,d]=raw.split('-'); return `${d}/${m}`; } catch { return raw; }
}

/** Genera array de todas las fechas entre inicio y fin (inclusive) */
function generarFechas(inicio:string, fin:string): string[] {
  const fechas:string[] = [];
  const cur = new Date(inicio + 'T00:00:00');
  const end = new Date(fin   + 'T00:00:00');
  while (cur <= end) {
    fechas.push(cur.toISOString().slice(0,10));
    cur.setDate(cur.getDate() + 1);
  }
  return fechas;
}

interface Props {
  fechaInicio: string;
  fechaFin: string;
  parametro?: string;
  onParametroChange?: (p: string) => void;
}

export default function RemociónGemSection({fechaInicio,fechaFin,parametro:paramProp,onParametroChange}:Props) {
  const [parametroInterno, setParametroInterno] = useState('');
  const [mostrarVacios, setMostrarVacios] = useState(false);
  const {data:allData, loading} = useRemociónGem('', fechaInicio, fechaFin);

  // Parámetros disponibles extraídos de los datos reales de la BD
  const parametros = useMemo(()=>[...new Set(allData.map(r=>r.parametro))].sort(),[allData]);

  // Usar prop controlada si viene del padre, sino estado interno
  const parametro = paramProp ?? parametroInterno;
  const setParametro = (p: string) => {
    setParametroInterno(p);
    onParametroChange?.(p);
  };

  // Seleccionar el primero disponible si no hay selección
  const param = parametro || parametros[0] || '';

  const data = useMemo(()=>allData.filter(r=>r.parametro===param),[allData,param]);

  // Índice rápido: "YYYY-MM-DD|turno" → registro real
  const dataIdx = useMemo(()=>{
    const m = new Map<string,typeof data[0]>();
    data.forEach(r=>m.set(`${r.fecha}|${r.turno}`,r));
    return m;
  },[data]);

  const chartData = useMemo(()=>{
    if (!mostrarVacios) {
      // Solo días con datos (comportamiento original)
      return [...data]
        .sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.turno-b.turno)
        .map(r=>({
          label:   `${fmtFecha(r.fecha)} T${r.turno}`,
          entrada: r.pulmon,
          salida:  r.gem_salida,
          eficiencia: r.pct_remocion_gem,
          sinDatos: false,
        }));
    }
    // Calendario completo: todas las fechas × 3 turnos
    const fechas = generarFechas(fechaInicio, fechaFin);
    const rows: {label:string;entrada:number|null;salida:number|null;eficiencia:number|null;sinDatos:boolean}[] = [];
    fechas.forEach(f=>{
      [1,2,3].forEach(t=>{
        const real = dataIdx.get(`${f}|${t}`);
        rows.push({
          label:      `${fmtFecha(f)} T${t}`,
          entrada:    real?.pulmon      ?? null,
          salida:     real?.gem_salida ?? null,
          eficiencia: real?.pct_remocion_gem ?? null,
          sinDatos:   !real,
        });
      });
    });
    return rows;
  },[data, dataIdx, mostrarVacios, fechaInicio, fechaFin]);

  const statsE = calcStats(data.map(r=>r.pulmon));
  const statsS = calcStats(data.map(r=>r.gem_salida));
  const statsR = calcStats(data.map(r=>r.pct_remocion_gem));
  const unit   = data[0]?.parametro_unidad ?? '';

  return (
    <section className="dash-section">
      <div style={{background:'#1f6feb22',borderLeft:'3px solid #1f6feb',
        padding:'5px 12px',marginBottom:12,fontSize:12,fontWeight:700,
        color:'#58a6ff',letterSpacing:'0.06em',textTransform:'uppercase'}}>
        REMOCIÓN SISTEMA GEM
      </div>

      {/* ── Controles: parámetro + toggle días sin datos ── */}
      <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:14,flexWrap:'wrap'}}>
        <label className="cal-filter-label" style={{whiteSpace:'nowrap'}}>Parámetro</label>
        <select className="cal-filter-select" value={param}
          onChange={e=>setParametro(e.target.value)} style={{minWidth:240}}>
          {parametros.map(p=><option key={p} value={p}>{p}</option>)}
        </select>

        {/* Toggle "Días sin datos" */}
        <label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',
          fontSize:11,color:'#8b949e',userSelect:'none',whiteSpace:'nowrap'}}
          onClick={()=>setMostrarVacios(v=>!v)}>
          <div style={{
            width:30,height:16,borderRadius:8,position:'relative',
            background:mostrarVacios?'#1f6feb':'#30363d',
            border:`1px solid ${mostrarVacios?'#388bfd':'#484f58'}`,
            transition:'background .2s',flexShrink:0,
          }}>
            <div style={{
              position:'absolute',top:1,width:12,height:12,borderRadius:'50%',
              background:mostrarVacios?'#fff':'#8b949e',transition:'left .2s',
              left:mostrarVacios?15:2,
            }}/>
          </div>
          Días sin datos
          {mostrarVacios && (
            <span style={{fontSize:9,color:'#484f58',marginLeft:2}}>
              (vacíos = sin registro)
            </span>
          )}
        </label>
      </div>

      {loading ? <div className="cal-loading">Cargando…</div>
       : !data.length ? (
        <div className="cal-empty">Sin datos para <strong>{param}</strong></div>
       ) : (
        <div>
          {/* Gráfico ancho completo */}
          <div className="dash-card" style={{padding:'12px 4px 0px',marginBottom:16}}>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{top:20,right:60,left:10,bottom:10}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d"/>
                <XAxis dataKey="label" tick={{fill:'#8b949e',fontSize:8}}
                  angle={-90} textAnchor="end" interval={0} height={80}/>
                <YAxis yAxisId="left" tick={{fill:'#8b949e',fontSize:10}} width={50}
                  tickFormatter={(v:number)=>v>=1000?`${(v/1000).toFixed(1)}k`:String(v)}
                  label={{value:unit,angle:-90,position:'insideLeft',fill:'#484f58',fontSize:9,dx:-4}}/>
                <YAxis yAxisId="right" orientation="right" tick={{fill:'#3fb950',fontSize:10}} width={48}
                  tickFormatter={(v:number)=>`${v.toFixed(0)}%`}
                  label={{value:'% Remoción',angle:90,position:'insideRight',fill:'#3fb95080',fontSize:9,dx:12}}/>
                <Tooltip contentStyle={{background:'#161b22',border:'1px solid #30363d',borderRadius:8,fontSize:11}}
                  formatter={(val:unknown,name:string)=>[
                    val==null?'—':`${(val as number).toFixed(2)}${name==='REMOCIÓN SISTEMA GEM'?'%':` ${unit}`}`,name]}/>
                <Legend wrapperStyle={{color:'#8b949e',fontSize:10,paddingTop:4}}/>
                <Bar yAxisId="left" dataKey="entrada" name="ENTRADA (REAL)"
                  fill={COLOR_ENTRADA} radius={[2,2,0,0]} maxBarSize={18}>
                  <LabelList dataKey="entrada" position="top" style={{fill:'#58a6ff',fontSize:7}}
                    formatter={(v:number|null)=>v==null?'':v.toFixed(1)}/>
                </Bar>
                <Bar yAxisId="left" dataKey="salida" name="GEM (SALIDA)"
                  fill={COLOR_SALIDA} radius={[2,2,0,0]} maxBarSize={18}>
                  <LabelList dataKey="salida" position="top" style={{fill:'#a78bfa',fontSize:7}}
                    formatter={(v:number|null)=>v==null?'':v.toFixed(1)}/>
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="eficiencia"
                  name="REMOCIÓN SISTEMA GEM" stroke={COLOR_PCT} strokeWidth={2}
                  dot={{r:2,fill:COLOR_PCT}} activeDot={{r:4}} connectNulls/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {/* 3 tablas en fila debajo del gráfico */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
            <div className="dash-card" style={{padding:12}}>
              <StatsTable title="Entrada GEM"           stats={statsE} unit={unit}/>
            </div>
            <div className="dash-card" style={{padding:12}}>
              <StatsTable title="Salida GEM"            stats={statsS} unit={unit}/>
            </div>
            <div className="dash-card" style={{padding:12}}>
              <StatsTable title="% Eficiencia remoción" stats={statsR} unit="%"/>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
