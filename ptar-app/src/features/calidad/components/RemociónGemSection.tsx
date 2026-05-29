/**
 * RemociónGemSection — Gráfico combinado Entrada/Salida GEM + % Remoción
 * Filtro de parámetro INDEPENDIENTE del dashboard global (dropdown propio).
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

interface Props { fechaInicio:string; fechaFin:string }

export default function RemociónGemSection({fechaInicio,fechaFin}:Props) {
  const [parametro, setParametro] = useState('');
  const {data:allData, loading} = useRemociónGem('', fechaInicio, fechaFin);

  // Parámetros disponibles extraídos de los datos reales de la BD
  const parametros = useMemo(()=>[...new Set(allData.map(r=>r.parametro))].sort(),[allData]);

  // Seleccionar el primero disponible si no hay selección
  const param = parametro || parametros[0] || '';

  const data = useMemo(()=>allData.filter(r=>r.parametro===param),[allData,param]);

  const chartData = [...data]
    .sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.turno-b.turno)
    .map(r=>({label:`${fmtFecha(r.fecha)} T${r.turno}`,
              entrada:r.pulmon, salida:r.gem_salida, eficiencia:r.pct_remocion_gem}));

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

      {/* ── Dropdown de parámetro — independiente del dashboard ── */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
        <label className="cal-filter-label" style={{whiteSpace:'nowrap'}}>Parámetro</label>
        <select className="cal-filter-select" value={param}
          onChange={e=>setParametro(e.target.value)} style={{minWidth:240}}>
          {parametros.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
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
                  formatter={(val:number|null,name:string)=>[
                    val==null?'—':`${val.toFixed(2)}${name==='REMOCIÓN POR ECUACIÓN'?'%':` ${unit}`}`,name]}/>
                <Legend wrapperStyle={{color:'#8b949e',fontSize:10,paddingTop:4}}/>
                <Bar yAxisId="left" dataKey="entrada" name="CANTIDAD PROMEDIO ENTRADA (REAL)"
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
                  name="REMOCIÓN POR ECUACIÓN" stroke={COLOR_PCT} strokeWidth={2}
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
