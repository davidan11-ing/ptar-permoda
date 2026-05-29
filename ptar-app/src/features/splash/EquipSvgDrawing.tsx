/**
 * Ilustraciones SVG standalone para cada equipo del modal de detalle.
 * Cada dibujo es independiente — no usa el svgBody global del diagrama.
 * ViewBox: 0 0 200 200 · Centro visual en (100, 100)
 */

import type { JSX } from 'react';
import type { Status } from './equipment';
import { SC } from './equipment';

interface Props { equipKey: string; status: Status; }

// ── Gradientes compartidos (se incluyen una vez en el SVG padre) ───────
export function EqSvgDefs() {
  return (
    <defs>
      <linearGradient id="eqTankG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#1a3d54"/>
        <stop offset="100%" stopColor="#0b2233"/>
      </linearGradient>
      <linearGradient id="eqWaterG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#00c5e3" stopOpacity=".8"/>
        <stop offset="100%" stopColor="#004a90" stopOpacity=".9"/>
      </linearGradient>
      <linearGradient id="eqSludgeG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#6b4a18"/>
        <stop offset="100%" stopColor="#2c1c08"/>
      </linearGradient>
      <radialGradient id="eqGlowG" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stopColor="#00c5e3" stopOpacity=".12"/>
        <stop offset="100%" stopColor="#00c5e3" stopOpacity="0"/>
      </radialGradient>
    </defs>
  );
}

const tG = 'url(#eqTankG)';
const wG = 'url(#eqWaterG)';
const sG = 'url(#eqSludgeG)';

// ── Helpers de dibujo ──────────────────────────────────────────────────

/** Tanque genérico centrado en (cx,cy), h = altura, w = ancho */
function Tank({ cx=100, cy=130, w=64, h=90, pct=0.65, fill=wG, border='#2a5a70' }:
  { cx?:number; cy?:number; w?:number; h?:number; pct?:number; fill?:string; border?:string }) {
  const wh = Math.round(h * pct);
  const l = cx - w/2, r = cx + w/2;
  return <>
    <rect x={l} y={cy-h} width={w} height={h} rx="4"
      fill={tG} stroke={border} strokeWidth="1.5"/>
    <rect x={l+2} y={cy-wh} width={w-4} height={wh-2} fill={fill} opacity=".55"/>
    <path d={`M${l+2},${cy-wh} Q${cx},${cy-wh-3} ${r-2},${cy-wh}
              L${r-2},${cy-wh+4} Q${cx},${cy-wh+1} ${l+2},${cy-wh+4}Z`}
      fill="#00c5e3" opacity=".4"/>
    {/* nivel marker */}
    <line x1={r} y1={cy-wh} x2={r+8} y2={cy-wh} stroke="#3fb950" strokeWidth="1" strokeDasharray="3 2" opacity=".7"/>
    <polygon points={`${r+5},${cy-wh-3} ${r+9},${cy-wh} ${r+5},${cy-wh+3}`} fill="#3fb950" opacity=".7"/>
  </>;
}


/** Burbujas de aireación */
function Bubbles({ cx=100, cy=130 }:{ cx?:number; cy?:number }) {
  return <>
    <circle cx={cx-18} cy={cy-12} r="3" fill="#00c5e3" opacity=".45" className="b1"/>
    <circle cx={cx}    cy={cy-5}  r="2.5" fill="#00c5e3" opacity=".4" className="b2"/>
    <circle cx={cx+16} cy={cy-18} r="3.5" fill="#00c5e3" opacity=".38" className="b3"/>
    <circle cx={cx-6}  cy={cy-28} r="2" fill="#00c5e3" opacity=".35" className="b4"/>
  </>;
}

/** Flecha de flujo */
function FlowArrow({ x1,y1,x2,y2,color='#00c5e3',dashed=false }:
  {x1:number;y1:number;x2:number;y2:number;color?:string;dashed?:boolean}) {
  const dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy);
  const ux=dx/len, uy=dy/len;
  const px1=x2-ux*8-uy*4, py1=y2-uy*8+ux*4;
  const px2=x2-ux*8+uy*4, py2=y2-uy*8-ux*4;
  return <>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.8"
      opacity=".7" strokeDasharray={dashed?'5 3':undefined}/>
    <polygon points={`${x2},${y2} ${px1},${py1} ${px2},${py2}`} fill={color} opacity=".8"/>
  </>;
}

// ── Dibujos por tipo de equipo ─────────────────────────────────────────

function DrawTankSmall({ s }:{ s:Status }) {
  const c = SC[s];
  return <>
    <Tank cx={100} cy={148} w={72} h={88} pct={0.62} border={`${c}80`}/>
    <text x="100" y="106" textAnchor="middle" fill="#3fb95060" fontSize="11"
      fontWeight="700" fontFamily="monospace">63%</text>
    <text x="100" y="164" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">TANQUE</text>
    <FlowArrow x1={100} y1={52} x2={100} y2={63} color="#00c5e3"/>
    <line x1="80" y1="50" x2="120" y2="50" stroke="#00c5e3" strokeWidth="1.5" opacity=".6"/>
    <FlowArrow x1={100} y1={151} x2={100} y2={172} color={c} dashed/>
  </>;
}

function DrawTankLarge({ s }:{ s:Status }) {
  const c = SC[s];
  return <>
    {/* Outline glow */}
    <rect x="55" y="32" width="90" height="130" rx="30" fill="url(#eqGlowG)"/>
    <Tank cx={100} cy={162} w={80} h={120} pct={0.68} border={`${c}80`}/>
    <text x="100" y="115" textAnchor="middle" fill={c} fillOpacity=".25" fontSize="22"
      fontWeight="800" fontFamily="monospace">m³</text>
    <text x="100" y="176" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">TANQUE</text>
    <FlowArrow x1={100} y1={38} x2={100} y2={50} color="#00c5e3"/>
    <FlowArrow x1={100} y1={165} x2={100} y2={185} color={c} dashed/>
  </>;
}

function DrawInputStream({ s }:{ s:Status }) {
  const c = SC[s];
  return <>
    {/* Pipe input visualization */}
    <rect x="28" y="88" width="100" height="24" rx="12" fill="#071520" stroke={c} strokeWidth="1.5"/>
    {/* flow lines inside pipe */}
    {[0,20,40,60,80].map(dx=>(
      <line key={dx} x1={38+dx} y1="100" x2={38+dx+10} y2="100"
        stroke={c} strokeWidth="1" opacity=".35" strokeDasharray="4 3"
        className="p-raw"/>
    ))}
    <circle cx="144" cy="100" r="14" fill="#071520" stroke={c} strokeWidth="1.5"/>
    <text x="144" y="104" textAnchor="middle" fill={c} fontSize="8" fontWeight="700" fontFamily="monospace">Q</text>
    <FlowArrow x1={158} y1={100} x2={178} y2={100} color={c}/>

    {/* Quality indicators */}
    <rect x="34" y="122" width="132" height="40" rx="4" fill="rgba(0,0,0,.3)" stroke="#1a2d3d" strokeWidth="1"/>
    {[['pH','7-10'],['SST','mg/L'],['T°','°C']].map(([k,u],i)=>(
      <g key={k}>
        <text x={55+i*40} y="137" textAnchor="middle" fill="#484f58" fontSize="7" fontFamily="monospace">{k}</text>
        <text x={55+i*40} y="153" textAnchor="middle" fill="#8b949e" fontSize="8" fontWeight="700" fontFamily="monospace">{u}</text>
      </g>
    ))}

    {/* Connection point to plant */}
    <circle cx="100" cy="60" r="16" fill="#071520" stroke={c} strokeWidth="1.2" opacity=".6"/>
    <text x="100" y="63" textAnchor="middle" fill={c} fontSize="9" fontFamily="monospace" opacity=".7">IN</text>
    <FlowArrow x1={100} y1={76} x2={100} y2={88} color={c}/>
    <text x="100" y="174" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">DESCARGA</text>
  </>;
}

function DrawCribaRotativa({ s }:{ s:Status }) {
  const c = SC[s];
  return <>
    {/* Housing trough */}
    <path d="M44,148 L44,124 Q44,118 50,118 L150,118 Q156,118 156,124 L156,148Z"
      fill={tG} stroke="#2a5a70" strokeWidth="1.5"/>
    {/* Drum */}
    <circle cx="100" cy="90" r="42" fill="#071520" stroke="#2a5a70" strokeWidth="1.5"/>
    <g className="rot-drum">
      <circle cx="100" cy="90" r="40" fill="none" stroke="#1a3555" strokeWidth="1.5"/>
      {[0,45,90,135,180,225,270,315].map(a=>{
        const r=a*Math.PI/180;
        return <line key={a} x1={100+12*Math.cos(r)} y1={90+12*Math.sin(r)}
          x2={100+37*Math.cos(r)} y2={90+37*Math.sin(r)} stroke="#00c5e330" strokeWidth="1.5"/>;
      })}
      <circle cx="100" cy="90" r="10" fill="#0f2030" stroke="#00c5e340" strokeWidth="1"/>
    </g>
    {/* Water pool in trough */}
    <path d="M46,130 Q100,126 154,130 L154,148 L46,148Z" fill={wG} opacity=".45"/>
    {/* Feed arrow */}
    <FlowArrow x1={100} y1={42} x2={100} y2={52} color="#00c5e3"/>
    <line x1="60" y1="40" x2="140" y2="40" stroke="#00c5e3" strokeWidth="1.5" opacity=".5"/>
    {/* Solids discharge */}
    <FlowArrow x1={156} y1={90} x2={178} y2={90} color="#d29922" dashed/>
    <text x="100" y="163" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">CRIBA ROTATIVA</text>
  </>;
}

function DrawCribaVibratoria({ s }:{ s:Status }) {
  const c = SC[s];
  return <>
    {/* Motor housing top */}
    <circle cx="100" cy="42" r="7" fill="#1a3040" stroke="#2a5a70" strokeWidth="1"/>
    <text x="100" y="45" textAnchor="middle" fill="#4a8aaa" fontSize="5" fontWeight="700">M</text>
    <line x1="100" y1="49" x2="100" y2="56" stroke="#2a5a70" strokeWidth="1.2"/>
    {/* Circle housing */}
    <circle cx="100" cy="100" r="52" fill={tG} stroke="#2a5a70" strokeWidth="1.5"/>
    {/* Vibrating screen mesh */}
    <g className="vibrato">
      <circle cx="100" cy="100" r="46" fill="#071520" stroke={`${c}40`} strokeWidth="1"/>
      {[-28,-14,0,14,28].map(bx=>(
        <line key={bx} x1={100+bx} y1="66" x2={100+bx} y2="134" stroke={`${c}25`} strokeWidth="1.4"/>
      ))}
      {[72,84,96,108,120,132].map(by=>(
        <line key={by} x1="60" y1={by} x2="140" y2={by} stroke={`${c}18`} strokeWidth="1"/>
      ))}
    </g>
    {/* Liquid trough at bottom */}
    <path d="M50,114 Q100,118 150,114 L150,136 L50,136Z" fill={wG} opacity=".4"/>
    {/* Oversize discharge right */}
    <path d="M150,100 L166,94 L166,84 L150,84" fill="#0d2030" stroke="#2a5a70" strokeWidth="1"/>
    <FlowArrow x1={166} y1={90} x2={184} y2={85} color="#d29922" dashed/>
    {/* Feed arrow top */}
    <FlowArrow x1={100} y1={155} x2={100} y2={170} color={c} dashed/>
    <text x="100" y="168" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">CRIBA VIBRATORIA</text>
  </>;
}

function DrawTorre({ s }:{ s:Status }) {
  const c = SC[s];
  return <>
    {/* Tower body */}
    <rect x="62" y="42" width="76" height="110" rx="4" fill={tG} stroke="#8b5cf660" strokeWidth="1.5"/>
    {/* Fill levels */}
    {[55,70,85,100,115].map(y=>(
      <rect key={y} x="68" y={y} width="64" height="10" rx="1" fill="#1a2535" stroke="#2a3a50" strokeWidth=".5"/>
    ))}
    {/* Water droplets */}
    <circle cx="84"  cy="66" r="2.5" fill="#00c5e380" className="t-drop"/>
    <circle cx="100" cy="78" r="2"   fill="#00c5e360" className="t-drop2"/>
    <circle cx="118" cy="58" r="2.5" fill="#00c5e370" className="t-drop3"/>
    {/* Water pool at base */}
    <rect x="64" y="136" width="72" height="14" fill={wG} opacity=".45"/>
    {/* Steam escape top */}
    <line x1="100" y1="42" x2="100" y2="28" stroke="#8b5cf660" strokeWidth="1.2" strokeDasharray="3 2"/>
    <polygon points="96,30 100,22 104,30" fill="#8b5cf660"/>
    <text x="110" y="26" fill="#6a4a8a60" fontSize="6" fontFamily="monospace">vapor</text>
    {/* Hot inlet */}
    <FlowArrow x1={38} y1={65} x2={62} y2={65} color="#f85149"/>
    <text x="28" y="61" fill="#f8514960" fontSize="6" fontFamily="monospace">44°C</text>
    {/* Cold outlet */}
    <FlowArrow x1={138} y1={140} x2={165} y2={140} color="#00c5e3"/>
    <text x="168" y="144" fill="#00c5e390" fontSize="6" fontFamily="monospace">28°C</text>
    <text x="100" y="172" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">TORRE ENFRIAM.</text>
  </>;
}

function DrawCarcamo({ s }:{ s:Status }) {
  const c = SC[s];
  return <>
    {/* Pit shape — wider at top */}
    <path d="M42,65 L50,155 L150,155 L158,65Z" fill={tG} stroke="#2a5a70" strokeWidth="1.5"/>
    <path d="M50,112 L50,155 L150,155 L150,112 Q100,108 50,112Z" fill={wG} opacity=".5"/>
    {/* Inlet arrows */}
    <FlowArrow x1={72} y1={38} x2={72} y2={65} color="#00c5e3"/>
    <FlowArrow x1={128} y1={38} x2={128} y2={65} color="#00c5e3"/>
    <text x="72"  y="34" textAnchor="middle" fill="#00c5e370" fontSize="6" fontFamily="monospace">O</text>
    <text x="128" y="34" textAnchor="middle" fill="#00c5e370" fontSize="6" fontFamily="monospace">R</text>
    {/* Pump outlet */}
    <circle cx="100" cy="172" r="10" fill="#0d2030" stroke="#2a5a70" strokeWidth="1.2"/>
    <text x="100" y="176" textAnchor="middle" fill="#3fb95070" fontSize="7" fontFamily="monospace">P</text>
    <FlowArrow x1={100} y1={182} x2={100} y2={195} color={c}/>
    <text x="100" y="190" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">CÁRCAMO</text>
  </>;
}

function DrawHomogenizer({ s }:{ s:Status }) {
  const c = SC[s];
  return <>
    <Tank cx={100} cy={158} w={96} h={118} pct={0.64} border={`${c}60`}/>
    {/* Eje del agitador — estático (solo la cabeza/impulsor gira) */}
    <line x1="100" y1="42" x2="100" y2="148" stroke="#1a3555" strokeWidth="1.5"/>
    {/* Impulsor inferior — solo este grupo rota */}
    <g className="mixer">
      <rect x="78" y="142" width="44" height="7" rx="3"
        fill="#1a4060" stroke="#2a5a80" strokeWidth="1"/>
    </g>
    {/* Dosing inlets top */}
    {[{x:72,col:'#d29922',l:'O₃'},{x:100,col:'#00c5e3',l:'Q'},{x:128,col:'#3fb950',l:'Lixiv'}].map(d=>(
      <g key={d.l}>
        <line x1={d.x} y1={26} x2={d.x} y2={40} stroke={d.col} strokeWidth="1.2" strokeDasharray="2 2" opacity=".7"/>
        <circle cx={d.x} cy={24} r="5" fill={d.col} opacity=".8"/>
        <text x={d.x} y={18} textAnchor="middle" fill={d.col} fontSize="5.5" fontFamily="monospace">{d.l}</text>
      </g>
    ))}
    {/* Volume label */}
    <text x="100" y="120" textAnchor="middle" fill={c} fillOpacity=".18" fontSize="24"
      fontWeight="800" fontFamily="monospace">800</text>
    <text x="100" y="136" textAnchor="middle" fill="#4a6a80" fontSize="8" fontFamily="monospace">m³</text>
    <text x="100" y="174" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">HOMOGENEIZADOR</text>
    <FlowArrow x1={100} y1={178} x2={100} y2={193} color={c} dashed/>
  </>;
}

function DrawGEM({ s }:{ s:Status }) {
  const c = SC[s];
  const dosing = [
    {x:60,  col:'#f85149',  l:'Ácido'},
    {x:80,  col:'#ff6b35',  l:'Decol'},
    {x:100, col:'#00c5e3',  l:'Coag'},
    {x:120, col:'#3fb950',  l:'F.Cat'},
    {x:140, col:'#8b5cf6',  l:'F.An'},
  ];
  return <>
    {/* Reactor body */}
    <rect x="58" y="48" width="84" height="110" rx="5" fill={tG} stroke={`${c}60`} strokeWidth="1.8"/>
    <rect x="60" y="82" width="80" height="74" fill={wG} opacity=".5"/>
    {/* Dosing lines */}
    {dosing.map(d=>(
      <g key={d.l}>
        <line x1={d.x} y1={30} x2={d.x} y2={48} stroke={d.col} strokeWidth="1.2"
          strokeDasharray="2 2" opacity=".7"/>
        <circle cx={d.x} cy={24} r="5.5" fill={d.col} opacity=".85"/>
        <text x={d.x} y={15} textAnchor="middle" fill={d.col} fontSize="5.5"
          fontFamily="monospace">{d.l}</text>
      </g>
    ))}
    {/* Gear mixer */}
    <g className="mixer">
      <circle cx="100" cy="112" r="20" fill="#0d2535" stroke={c} strokeWidth="1.2"/>
      {[0,60,120,180,240,300].map(a=>{
        const r1=a*Math.PI/180;
        return <rect key={a} x={100+17*Math.cos(r1)-3} y={112+17*Math.sin(r1)-3} width="6" height="6"
          rx="1" fill={c} opacity=".65"
          transform={`rotate(${a},${100+17*Math.cos(r1)},${112+17*Math.sin(r1)})`}/>;
      })}
      <circle cx="100" cy="112" r="6" fill="#1a3050"/>
    </g>
    <text x="100" y="174" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">EQUIPO GEM</text>
    <FlowArrow x1={142} y1={105} x2={160} y2={105} color={c}/>
    <FlowArrow x1={100} y1={50} x2={100} y2={34} color="#00c5e3"/>
  </>;
}

function DrawSwingmill({ s }:{ s:Status }) {
  const c = SC[s];
  return <>
    {/* Outer ring */}
    <circle cx="100" cy="100" r="60" fill="rgba(90,64,24,.15)" stroke="#5a4018" strokeWidth="1.5"/>
    {/* Inner zone */}
    <circle cx="100" cy="100" r="42" fill={sG} stroke="#4a3010" strokeWidth="1"/>
    <g className="mixer">
      <line x1="100" y1="46" x2="100" y2="98" stroke="#3a2010" strokeWidth="1.5"/>
      <rect x="76" y="94" width="48" height="8" rx="3" fill="#2a1808" stroke="#4a3010" strokeWidth="1"/>
    </g>
    {/* Sludge level */}
    <text x="100" y="108" textAnchor="middle" fill="#7a5820" fillOpacity=".5"
      fontSize="9" fontFamily="monospace">LODO</text>
    {/* Feed inlet */}
    <FlowArrow x1={36} y1={68} x2={52} y2={78} color="#d29922"/>
    {/* Sludge outlet bottom */}
    <FlowArrow x1={100} y1={162} x2={100} y2={180} color={c} dashed/>
    {/* Overflow */}
    <FlowArrow x1={160} y1={100} x2={178} y2={90} color="#3fb950" dashed/>
    <text x="100" y="194" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">SWINGMILL</text>
  </>;
}

function DrawMBR({ s }:{ s:Status }) {
  const c = SC[s];
  const memColor = s === 'advertencia' ? '#d29922' : '#2a5575';
  return <>
    {/* Tank */}
    <rect x="34" y="42" width="132" height="110" rx="4" fill={tG} stroke={`${c}60`} strokeWidth="1.5"/>
    {/* Water fill */}
    <rect x="36" y="72" width="128" height="78" fill={wG} opacity=".42"/>
    {/* Membrane modules */}
    {[-40,-13,14,41].map(dx=>(
      <g key={dx} className="mem">
        <rect x={100+dx-9} y="58" width="18" height="88" rx="3"
          fill="#1a3550" stroke={memColor} strokeWidth="1.1"/>
        {[62,72,82,92,102,112,118,128].map(ty=>(
          <line key={ty} x1={100+dx-7} y1={ty} x2={100+dx+7} y2={ty}
            stroke="#3b82f6" strokeWidth=".6" opacity=".3"/>
        ))}
      </g>
    ))}
    {/* Permeate collection header */}
    <rect x="36" y="148" width="128" height="8" rx="2" fill="#0a2030" stroke="#1f6feb50" strokeWidth="1"/>
    {/* Permeate outlet */}
    <FlowArrow x1={100} y1={156} x2={100} y2={174} color={c}/>
    {/* Feed */}
    <FlowArrow x1={100} y1={30} x2={100} y2={42} color="#00c5e3"/>
    <text x="100" y="188" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">BIORREACTOR MBR</text>
    {s === 'advertencia' && (
      <text x="100" y="30" textAnchor="middle" fill="#d29922" fontSize="7"
        fontFamily="monospace">⚠ CIP PRÓXIMO</text>
    )}
  </>;
}

function DrawMBBR({ s }:{ s:Status }) {
  const c = SC[s];
  return <>
    {/* Tank */}
    <rect x="28" y="38" width="144" height="122" rx="4" fill={tG} stroke={`${c}60`} strokeWidth="1.5"/>
    {/* Water fill */}
    <rect x="30" y="72" width="140" height="86" fill={wG} opacity=".42"/>
    {/* Plastic carriers grid */}
    {[-42,-22,-2,18,38].map((x,xi)=>
      [78,96,114,132].map((y,yi)=>(
        <rect key={`${xi}-${yi}`} x={100+x-8} y={y} width="14" height="12"
          rx="2" fill="#1a3550" stroke="#2a5575" strokeWidth=".6" opacity=".75"/>
      ))
    )}
    {/* Bubbles from diffusers */}
    <Bubbles cx={80} cy={155}/>
    <Bubbles cx={120} cy={155}/>
    {/* Diffusers bottom */}
    {[60,80,100,120,140].map(bx=>(
      <rect key={bx} x={bx-7} y="156" width="14" height="4" rx="2" fill="#1a4060"/>
    ))}
    {/* Feed + outlet */}
    <FlowArrow x1={28} y1={90} x2={10} y2={90} color={c} dashed/>
    <FlowArrow x1={172} y1={90} x2={190} y2={90} color="#3fb950"/>
    <text x="100" y="30" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">REACTOR MBBR</text>
    <text x="100" y="178" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">65% LLENADO</text>
  </>;
}

function DrawAnoxic({ s }:{ s:Status }) {
  const c = SC[s];
  return <>
    {/* Tank — dark, no aeration */}
    <rect x="34" y="46" width="132" height="112" rx="4"
      fill="#0a1a0a" stroke={`${c}50`} strokeWidth="1.5"/>
    <rect x="36" y="82" width="128" height="74" fill="#0a2510" opacity=".65"/>
    {/* NO3 reduction icon */}
    <circle cx="100" cy="118" r="22" fill="#0a2510" stroke="#2a5a2a" strokeWidth="1"/>
    <text x="100" y="115" textAnchor="middle" fill="#3fb950" fontSize="8"
      fontFamily="monospace">NO₃⁻</text>
    <text x="100" y="127" textAnchor="middle" fill="#3fb950" fontSize="9"
      fontFamily="monospace">→ N₂</text>
    {/* Low OD indicator */}
    <rect x="42" y="54" width="68" height="16" rx="3" fill="rgba(0,0,0,.4)" stroke="#21262d" strokeWidth="1"/>
    <text x="76" y="65" textAnchor="middle" fill="#484f58" fontSize="7.5"
      fontFamily="monospace">OD &lt; 0.2 mg/L</text>
    {/* Feed + recir */}
    <FlowArrow x1={34} y1={100} x2={16} y2={100} color={c} dashed/>
    <FlowArrow x1={166} y1={85} x2={184} y2={85} color="#3fb950"/>
    <text x="100" y="176" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">REACTOR ANÓXICO</text>
  </>;
}

function DrawRO({ s }:{ s:Status }) {
  const c = SC[s];
  return <>
    {/* Pressure vessel array */}
    {[-48,-24,0,24].map((dy,i)=>(
      <g key={dy} className="mem" style={{animationDelay:`${i*0.2}s`}}>
        <rect x="36" y={82+dy} width="128" height="20" rx="10"
          fill={s==='alarma'?'#1e1010':'#0c1d30'} stroke={s==='alarma'?'#5a2030':'#1b4a72'} strokeWidth="1"/>
        <ellipse cx="50"  cy={82+dy+10} rx="7" ry="9" fill={s==='alarma'?'#160808':'#091525'}
          stroke={s==='alarma'?'#5a2030':'#1b4a72'} strokeWidth=".9"/>
        <ellipse cx="150" cy={82+dy+10} rx="7" ry="9" fill={s==='alarma'?'#160808':'#091525'}
          stroke={s==='alarma'?'#5a2030':'#1b4a72'} strokeWidth=".9"/>
        <line x1="57" y1={82+dy+10} x2="143" y2={82+dy+10}
          stroke={s==='alarma'?'#f85149':'#3b82f6'} strokeWidth=".7" opacity=".4"/>
      </g>
    ))}
    {/* Feed */}
    <FlowArrow x1={100} y1={46} x2={100} y2={82} color="#00c5e3"/>
    <text x="100" y="43" textAnchor="middle" fill="#00c5e380" fontSize="6.5" fontFamily="monospace">ALIMENTACIÓN</text>
    {/* Permeate */}
    <FlowArrow x1={100} y1={152} x2={100} y2={170} color="#3fb950"/>
    <text x="100" y="182" textAnchor="middle" fill="#3fb95080" fontSize="6.5" fontFamily="monospace">PERMEADO</text>
    {/* Reject */}
    <FlowArrow x1={164} y1={118} x2={186} y2={118} color="#f85149" dashed/>
    <text x="190" y="116" fill="#f8514960" fontSize="5.5" fontFamily="monospace">Rechazo</text>
    <text x="100" y="195" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">ÓSMOSIS INVERSA</text>
    {s==='alarma' && (
      <text x="100" y="57" textAnchor="middle" fill="#f85149" fontSize="7"
        fontFamily="monospace" className="s-pulse">⚠ FOULING — CIP</text>
    )}
  </>;
}

function DrawCartridgeFilter({ s }:{ s:Status }) {
  const c = SC[s];
  return <>
    {/* Filter housing */}
    <rect x="66" y="42" width="68" height="120" rx="8" fill="#0e1a18" stroke={`${c}60`} strokeWidth="1.5"/>
    {/* Top header */}
    <rect x="56" y="38" width="88" height="14" rx="4" fill="#121a20" stroke="#1f6feb50" strokeWidth="1"/>
    {/* Bottom sump */}
    <rect x="56" y="148" width="88" height="18" rx="4" fill="#121a20" stroke="#1f6feb50" strokeWidth="1"/>
    {/* Cartridge elements — 2 cartuchos simétricos (igual que el diagrama) */}
    {[-12,12].map(dx=>(
      <g key={dx}>
        <rect x={100+dx-7} y="56" width="14" height="88" rx="7"
          fill="#1a3050" stroke="#2a5070" strokeWidth="1"/>
        <line x1={100+dx} y1="58" x2={100+dx} y2="142"
          stroke="#00c5e312" strokeWidth="10"/>
      </g>
    ))}
    {/* ΔP indicator */}
    <rect x="146" y="80" width="36" height="20" rx="3" fill="rgba(0,0,0,.5)" stroke="#21262d" strokeWidth="1"/>
    <text x="164" y="88" textAnchor="middle" fill="#484f58" fontSize="5.5" fontFamily="monospace">ΔP</text>
    <text x="164" y="97" textAnchor="middle" fill={c} fontSize="7" fontFamily="monospace">0.22</text>
    {/* Flow arrows */}
    <FlowArrow x1={100} y1={26} x2={100} y2={38} color="#00c5e3"/>
    <FlowArrow x1={100} y1={166} x2={100} y2={182} color={c}/>
    <text x="100" y="195" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">FILTRO 5µm</text>
  </>;
}

function DrawIonExchange({ s }:{ s:Status }) {
  const c = SC[s];
  return <>
    {/* Three columns */}
    {[-40,0,40].map((dx,ci)=>(
      <g key={dx}>
        <rect x={100+dx-16} y="44" width="32" height="110" rx="5"
          fill={ci%2===0?'#1a2a50':'#1a1a2a'}
          stroke={ci%2===0?'#3b82f6':'#6b7280'} strokeWidth="1"/>
        {[-40,-26,-12,2,16].map(ry=>(
          <circle key={ry} cx={100+dx} cy={99+ry} r="5"
            fill={ci%2===0?'#3b82f6':'#6b7280'} opacity=".38"/>
        ))}
        {/* Inlet/outlet connectors */}
        <rect x={100+dx-8} y="40" width="16" height="8" rx="2" fill="#0c1520" stroke="#21262d" strokeWidth="1"/>
        <rect x={100+dx-8} y="152" width="16" height="8" rx="2" fill="#0c1520" stroke="#21262d" strokeWidth="1"/>
      </g>
    ))}
    {/* Cross exchange lines */}
    <line x1="44" y1="100" x2="156" y2="100" stroke="#c084fc" strokeWidth="1" opacity=".3"/>
    <line x1="44" y1="80"  x2="156" y2="120" stroke="#c084fc" strokeWidth="1" opacity=".2"/>
    {/* Feed + outlet */}
    <FlowArrow x1={100} y1={28} x2={100} y2={40} color="#c084fc"/>
    <FlowArrow x1={100} y1={160} x2={100} y2={178} color={c}/>
    <text x="100" y="192" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">FILT. IÓNICO</text>
  </>;
}

function DrawCarbonFilter({ s }:{ s:Status }) {
  const c = SC[s];
  return <>
    {/* Column body */}
    <rect x="64" y="42" width="72" height="114" rx="6" fill="#0e1a18" stroke={`${c}50`} strokeWidth="1.5"/>
    {/* GAC bed */}
    {[-14,-6,2,10].map(bx=>(
      <rect key={bx} x={100+bx-5} y="56" width="10" height="88" rx="4"
        fill="#1a1e14" stroke="#2a2e18" strokeWidth=".5"/>
    ))}
    {/* UV/Ozone glow */}
    <circle cx="100" cy="100" r="24" fill="#a0e0ff" opacity=".04" className="uv-l"/>
    <circle cx="100" cy="100" r="36" fill="#a0e0ff" opacity=".02" className="uv-l"/>
    {/* Ozone indicator */}
    <rect x="138" y="72" width="38" height="20" rx="3" fill="rgba(0,0,0,.5)" stroke="#3fb95040" strokeWidth="1"/>
    <text x="157" y="80" textAnchor="middle" fill="#3fb95060" fontSize="5.5" fontFamily="monospace">O₃</text>
    <text x="157" y="89" textAnchor="middle" fill="#3fb95080" fontSize="6" fontFamily="monospace">Ozono</text>
    {/* Top/bottom headers */}
    <rect x="56" y="36" width="88" height="10" rx="4" fill="#121a20" stroke="#3fb95030" strokeWidth="1"/>
    <rect x="56" y="152" width="88" height="10" rx="4" fill="#121a20" stroke="#3fb95030" strokeWidth="1"/>
    {/* Arrows */}
    <FlowArrow x1={100} y1={24} x2={100} y2={36} color="#f85149" dashed/>
    <text x="100" y="21" textAnchor="middle" fill="#f8514960" fontSize="6" fontFamily="monospace">RECHAZO</text>
    <FlowArrow x1={100} y1={162} x2={100} y2={180} color={c}/>
    <text x="100" y="194" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">FILT. C+O₃</text>
  </>;
}

function DrawJunctionBox({ s }:{ s:Status }) {
  const c = SC[s];
  return <>
    {/* Box */}
    <rect x="38" y="58" width="124" height="84" rx="5"
      fill="#1e0808" stroke={`${c}80`} strokeWidth="1.5"/>
    {/* Water inside */}
    <rect x="40" y="82" width="120" height="58" fill="#2e1010" opacity=".7"/>
    {/* Flow arrows in */}
    <FlowArrow x1={22} y1={100} x2={38} y2={100} color="#f85149"/>
    <FlowArrow x1={100} y1={40} x2={100} y2={58} color="#f85149" dashed/>
    {/* Flow arrow out */}
    <FlowArrow x1={162} y1={100} x2={180} y2={100} color={c}/>
    <text x="100" y="109" textAnchor="middle" fill={`${c}60`} fontSize="9"
      fontFamily="monospace">→ AT</text>
    {/* Labels */}
    <text x="28"  y="96" textAnchor="middle" fill="#f8514960" fontSize="6" fontFamily="monospace">IN</text>
    <text x="182" y="96" textAnchor="middle" fill={c}          fontSize="6" fontFamily="monospace">OUT</text>
    <text x="100" y="162" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">CAJA VERT.</text>
  </>;
}

function DrawProduccion({ s }:{ s:Status }) {
  const c = SC[s];
  return <>
    {/* Box */}
    <rect x="26" y="36" width="148" height="108" rx="8"
      fill="#071a10" stroke={`${c}60`} strokeWidth="2"/>
    {/* RECIRCULACIÓN label */}
    <text x="100" y="78" textAnchor="middle" fill="#3fb950" fontSize="16"
      fontWeight="800" fontFamily="monospace">RECIRCULACIÓN</text>
    {/* Water drop / flow icon */}
    <path d="M82,88 L72,102 L72,114 L82,118 L82,96 L118,96 L118,118 L128,114 L128,102 L118,88 L110,83 Q100,79 90,83Z"
      fill="#3fb95030" stroke="#3fb95070" strokeWidth="1.5"/>
    {/* Quality check */}
    <text x="100" y="134" textAnchor="middle" fill="#3fb950" fontSize="9"
      fontFamily="monospace">✓ Calidad Textil</text>
    {/* Savings */}
    <rect x="34" y="142" width="132" height="18" rx="3"
      fill="rgba(63,185,80,.08)" stroke="#3fb95025" strokeWidth="1"/>
    <text x="100" y="155" textAnchor="middle" fill="#3fb950" fontSize="8"
      fontFamily="monospace">$53k/mes en agua potable</text>
    {/* Feed arrow */}
    <FlowArrow x1={100} y1={20} x2={100} y2={36} color="#00c5e3"/>
    {/* Output */}
    <FlowArrow x1={100} y1={162} x2={100} y2={180} color={c}/>
    <text x="100" y="194" textAnchor="middle" fill={c} fontSize="8"
      fontWeight="700" fontFamily="monospace" letterSpacing="1">PRODUCCIÓN</text>
  </>;
}

// ── Dispatcher principal ────────────────────────────────────────────────

const TYPE_MAP: Record<string, (p:{s:Status}) => JSX.Element> = {
  rotativa:     p => <DrawInputStream {...p}/>,
  funza:        p => <DrawInputStream {...p}/>,
  tintoreria:   p => <DrawInputStream {...p}/>,
  lavanderia:   p => <DrawInputStream {...p}/>,
  tk2m3:        p => <DrawTankSmall {...p}/>,
  tk30m3:       p => <DrawTankSmall {...p}/>,
  tk15m3:       p => <DrawTankSmall {...p}/>,
  tk60m3:       p => <DrawTankLarge {...p}/>,
  tkPulmon:     p => <DrawTankLarge {...p}/>,
  tkPermeado:   p => <DrawTankLarge {...p}/>,
  tkRecir:      p => <DrawTankLarge {...p}/>,
  tkRechazo:    p => <DrawTankSmall {...p}/>,
  tkRechazoRO2: p => <DrawTankSmall {...p}/>,
  tkVert:       p => <DrawTankSmall {...p}/>,
  cribRot:      p => <DrawCribaRotativa {...p}/>,
  vibrat1:      p => <DrawCribaVibratoria {...p}/>,
  vibrat2:      p => <DrawCribaVibratoria {...p}/>,
  tkPulmon2:    p => <DrawTankLarge {...p}/>,
  torre:        p => <DrawTorre {...p}/>,
  carcamo:      p => <DrawCarcamo {...p}/>,
  homogen:      p => <DrawHomogenizer {...p}/>,
  eqGem:        p => <DrawGEM {...p}/>,
  swingmill:    p => <DrawSwingmill {...p}/>,
  mbrT:         p => <DrawMBR {...p}/>,
  mbrK:         p => <DrawMBR {...p}/>,
  mbbr:         p => <DrawMBBR {...p}/>,
  anoxic:       p => <DrawAnoxic {...p}/>,
  filtro5:      p => <DrawCartridgeFilter {...p}/>,
  filtrosII:    p => <DrawIonExchange {...p}/>,
  filtVert:     p => <DrawCarbonFilter {...p}/>,
  ro1e1:        p => <DrawRO {...p}/>,
  ro1e2:        p => <DrawRO {...p}/>,
  ro2:          p => <DrawRO {...p}/>,
  cajaVert:     p => <DrawJunctionBox {...p}/>,
  produccion:   p => <DrawProduccion {...p}/>,
};

export function EquipSvgDrawing({ equipKey, status }: Props) {
  const DrawFn = TYPE_MAP[equipKey];
  const c = SC[status];
  const content = DrawFn ? <DrawFn s={status}/> : (
    /* Generic fallback */
    <>
      <rect x="50" y="60" width="100" height="80" rx="6" fill={tG} stroke={`${c}60`} strokeWidth="1.5"/>
      <text x="100" y="108" textAnchor="middle" fill={c} fontSize="9" fontFamily="monospace">EQUIPO</text>
    </>
  );

  return (
    <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet"
         style={{ width:'100%', height:'100%', display:'block' }}
         role="img" aria-label={equipKey}>
      <EqSvgDefs/>
      {/* Background grid */}
      <rect width="200" height="200" fill="#060e16"/>
      <path d="M0,0" stroke="none"/>
      {[0,40,80,120,160,200].map(v=>(
        <g key={v}>
          <line x1={v} y1="0" x2={v} y2="200" stroke="#00c5e3" strokeWidth=".4" opacity=".04"/>
          <line x1="0" y1={v} x2="200" y2={v} stroke="#00c5e3" strokeWidth=".4" opacity=".04"/>
        </g>
      ))}
      {/* Ambient glow behind equipment */}
      <rect x="40" y="40" width="120" height="120" rx="60" fill="url(#eqGlowG)"/>
      {content}
    </svg>
  );
}
