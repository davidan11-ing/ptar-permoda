import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EqDef } from './equipment';
import { EQ, SC, SB, SL } from './equipment';
import { useEquipmentStatus } from './hooks/useEquipmentStatus';
import { PhaseModal } from './PhaseModal';
// @ts-ignore — C palette imported for upcoming inline-color refactor (noUnusedLocals bypass)
import { C } from './colors'; // eslint-disable-line @typescript-eslint/no-unused-vars

function TT({ eq, anchor='center', flipY=false }:
  { eq:EqDef; anchor?:'center'|'left'|'right'; flipY?: boolean }) {
  const c=SC[eq.status], bg=SB[eq.status], W=158, H=92;
  const xOff = anchor==='left'?8 : anchor==='right'?-W-8 : -W/2;
  // y0: si flipY, el tooltip va hacia abajo (+20 desde centro); si no, va hacia arriba (-205)
  const y0 = flipY ? 20 : -205;
  return (
    <g className="eq-tt">
      <rect x={xOff-2} y={y0-2} width={W+4} height={H+4} rx="8" fill="rgba(0,0,0,.6)"/>
      <rect x={xOff} y={y0} width={W} height={H} rx="6" fill="#0b1520" stroke={c} strokeWidth="1.2"/>
      <rect x={xOff} y={y0} width={W} height={22} rx="6" fill={bg}/>
      <rect x={xOff} y={y0+16} width={W} height={6} fill={bg}/>
      <text x={xOff+W/2} y={y0+14} textAnchor="middle" fill={c} fontSize="8.5" fontWeight="700" fontFamily="monospace">{eq.label}</text>
      <text x={xOff+W/2} y={y0+32} textAnchor="middle" fill={c} fontSize="7" fontFamily="monospace">{SL[eq.status]}</text>
      {eq.params.map(([k,v],i)=>(
        <text key={k} x={xOff+W/2} y={y0+46+i*14} textAnchor="middle" fill="#8b949e" fontSize="7" fontFamily="monospace">
          {k}: <tspan fill="#e6edf3">{v}</tspan>
        </text>
      ))}
      <polygon points={`${xOff+W/2-5},${y0+H} ${xOff+W/2+5},${y0+H} ${xOff+W/2},${y0+H+7}`} fill="#0b1520" stroke={c} strokeWidth="1"/>
    </g>
  );
}

function SD({ eq, cx, cy }: { eq:EqDef; cx:number; cy:number }) {
  const c=SC[eq.status], pulse=eq.status!=='operando';
  return <>
    {pulse && <circle cx={cx} cy={cy} r="8" fill={c} opacity=".2" className="s-ring"/>}
    <circle cx={cx} cy={cy} r="4.5" fill={c} stroke="#080f18" strokeWidth="1.5" className={pulse?'s-pulse':''}/>
  </>;
}

function PhaseLabel({ x, w, label, color }: { x:number; w:number; label:string; color:string }) {
  return <text x={x+w/2} y="28" textAnchor="middle" fill={color} fontSize="8.5" fontWeight="700" letterSpacing="2" fontFamily="monospace">{label}</text>;
}

/* small arrow label on a pipe */
function PL({ x, y, label, color='#2a6a7a' }: { x:number; y:number; label:string; color?:string }) {
  return <text x={x} y={y} textAnchor="middle" fill={color} fontSize="7" fontStyle="italic" fontFamily="monospace">{label}</text>;
}



const PHASES = [
  { key: 'preliminar',  label: 'Fase Preliminar',      color: '#00c5e3', vb: '0 26 275 335'    },
  { key: 'primaria',    label: 'Fase Primaria',          color: '#d29922', vb: '259 26 820 335'  },
  { key: 'secundaria',  label: 'Fase Secundaria',        color: '#3fb950', vb: '1063 26 737 335' },
  { key: 'terciaria',   label: 'Fase Terciaria · Reúso', color: '#1f6feb', vb: '0 345 1196 333'  },
  { key: 'vertimiento', label: 'Fase Vertimiento',       color: '#f85149', vb: '1180 345 620 333'},
] as const;
type PhaseKey = typeof PHASES[number]['key'];

const mYA = 480;
const mYB = 615;
const tG = 'url(#tankG)', wG = 'url(#waterG)', sG = 'url(#sludgeG)';

const Tk = ({ w, h, fill = wG, border = '#2a5a70', wp = 0.63 }:
  { w: number; h: number; fill?: string; border?: string; wp?: number }) => {
  const wh = Math.round(h * wp);
  return <>
    <rect x={-w / 2} y={-h} width={w} height={h} rx="3" fill={tG} stroke={border} strokeWidth="1.5" className="eq-b" />
    <rect x={-w / 2 + 2} y={-wh} width={w - 4} height={wh - 2} fill={fill} opacity=".55" />
    <path d={`M${-w / 2 + 2},${-wh} Q0,${-wh - 3} ${w / 2 - 2},${-wh} L${w / 2 - 2},${-wh + 4} Q0,${-wh + 1} ${-w / 2 + 2},${-wh + 4}Z`}
      fill="#00c5e3" opacity=".35" />
  </>;
};

const Dh = ({ w, h, pct = 0.63 }: { w: number; h: number; pct?: number }) => {
  const ly = -Math.round(h * pct);
  return <>
    <line x1={w / 2} y1={ly} x2={w / 2 + 8} y2={ly} stroke="#3fb950" strokeWidth="1" strokeDasharray="4 3" opacity=".8" />
    <line x1={w / 2 + 8} y1={-h} x2={w / 2 + 8} y2={ly} stroke="#3fb950" strokeWidth="1" opacity=".6" />
    <polygon points={`${w / 2 + 4},${ly + 4} ${w / 2 + 8},${ly - 2} ${w / 2 + 12},${ly + 4}`} fill="#3fb950" opacity=".7" />
    <text x={w / 2 + 14} y={ly + 3} fill="#3fb950" fontSize="6.5" fontFamily="monospace">Δh</text>
  </>;
};

function VibratoriaStage({ eq, motorLabel, svgLabel, showFinosLabel = false }:
  { eq: EqDef; motorLabel: string; svgLabel: string; showFinosLabel?: boolean }) {
  return <>
    <TT eq={eq}/><SD eq={eq} cx={24} cy={-88}/>
    <circle cx="0" cy="-42" r="38" fill={tG} stroke="#2a5a70" strokeWidth="1.5" className="eq-b"/>
    <circle cx="0" cy="-88" r="5.5" fill="#1a3040" stroke="#2a5a70" strokeWidth="1"/>
    <text x="0" y="-85" textAnchor="middle" fill="#4a8aaa" fontSize="5" fontWeight="700">{motorLabel}</text>
    <line x1="0" y1="-83" x2="0" y2="-76" stroke="#2a5a70" strokeWidth="1.2"/>
    <g className="vibrato">
      <circle cx="0" cy="-62" r="17" fill="#0f2535" stroke="#00c5e350" strokeWidth="1"/>
      {[-10,-3,4,11].map(bx=><line key={bx} x1={bx} y1="-74" x2={bx} y2="-50" stroke="#00c5e325" strokeWidth="1.2"/>)}
      {[-72,-66,-60,-54].map(by=><line key={by} x1="-15" y1={by} x2="15" y2={by} stroke="#00c5e318" strokeWidth="1"/>)}
    </g>
    <path d="M-32,-22 Q0,-17 32,-22 L32,4 L-32,4 Z" fill={wG} opacity=".4"/>
    <path d="M38,-48 L48,-41 L48,-30 L38,-30" fill="#0d2030" stroke="#2a5a70" strokeWidth="1"/>
    <text y="12" textAnchor="middle" fill="#d29922" fontSize="7" fontWeight="700" fontFamily="monospace">{svgLabel}</text>
    {showFinosLabel && <text x="-34" y="-88" fill="#5a4018" fontSize="5.5" fontFamily="monospace">← RES. FINOS</text>}
  </>;
}

function MBRTank({ eq, svgLabel, borderColor, labelColor, innerStroke, waterOpacity = '.45', animDelay }:
  { eq: EqDef; svgLabel: string; borderColor: string; labelColor: string; innerStroke: string; waterOpacity?: string; animDelay?: string }) {
  return <>
    <TT eq={eq}/><SD eq={eq} cx={32} cy={-82}/>
    <rect x="-32" y="-82" width="64" height="82" rx="3" fill={tG} stroke={borderColor} strokeWidth="1.5" className="eq-b"/>
    <rect x="-30" y="-55" width="60" height="53" fill={wG} opacity={waterOpacity}/>
    {[-24,-8,8,24].map(bx=>(
      <g key={bx} className="mem" style={animDelay ? {animationDelay: animDelay} : undefined}>
        <rect x={bx-6} y="-52" width="12" height="48" rx="2" fill="#1a3550" stroke={innerStroke} strokeWidth="1"/>
      </g>
    ))}
    <text y="13" textAnchor="middle" fill={labelColor} fontSize="7" fontWeight="700" fontFamily="monospace">{svgLabel}</text>
  </>;
}

function ROStage({ eq, svgLabel, animDelayMultiplier }:
  { eq: EqDef; svgLabel: string; animDelayMultiplier: number }) {
  return <>
    <TT eq={eq}/><SD eq={eq} cx={46} cy={-86}/>
    <rect x="-45" y="-88" width="90" height="88" rx="4" fill="#081420" stroke="#1f6feb60" strokeWidth="1.5" className="eq-b"/>
    {[-72,-51,-30,-9].map((ty,i)=>(
      <g key={ty} className="mem" style={{animationDelay:`${i*animDelayMultiplier}s`}}>
        <rect x="-40" y={ty} width="80" height="17" rx="8" fill="#0c1d30" stroke="#1b4a72" strokeWidth="1"/>
        <ellipse cx="-33" cy={ty+8.5} rx="5" ry="7.5" fill="#091525" stroke="#1b4a72" strokeWidth="0.8"/>
        <ellipse cx="33"  cy={ty+8.5} rx="5" ry="7.5" fill="#091525" stroke="#1b4a72" strokeWidth="0.8"/>
        <line x1="-28" y1={ty+8.5} x2="28" y2={ty+8.5} stroke="#3b82f6" strokeWidth="0.5" opacity=".4"/>
        <line x1="-28" y1={ty+5}   x2="28" y2={ty+5}   stroke="#3b82f6" strokeWidth="0.3" opacity=".2"/>
        <line x1="-28" y1={ty+12}  x2="28" y2={ty+12}  stroke="#3b82f6" strokeWidth="0.3" opacity=".2"/>
      </g>
    ))}
    <text y="12" textAnchor="middle" fill="#1f6feb" fontSize="7" fontWeight="700" fontFamily="monospace">{svgLabel}</text>
  </>;
}

export default function SplashScreen() {
  const navigate = useNavigate();
  const [activePhase, setActivePhase] = useState<PhaseKey | null>(null);
  const [closing, setClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const modalOpen = activePhase != null;

  const closeModal = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setClosing(true);
    closeTimerRef.current = setTimeout(() => { setActivePhase(null); setClosing(false); }, 200);
  };

  const PHASE_KEYS = PHASES.map(p => p.key);
  const goPhase = (dir: 1 | -1) => {
    setActivePhase(prev => {
      if (!prev) return prev;
      const idx = PHASE_KEYS.indexOf(prev);
      return PHASE_KEYS[(idx + dir + PHASE_KEYS.length) % PHASE_KEYS.length];
    });
  };

  const openPhase = (key: PhaseKey) => {
    if (closing) return;
    setActivePhase(key);
  };

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     closeModal();
      if (e.key === 'ArrowRight') goPhase(1);
      if (e.key === 'ArrowLeft')  goPhase(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  // Estado dinámico de equipos (polling cada 2 min)
  const liveStatus = useEquipmentStatus();

  // Merge: aplica estados de la API sobre los defaults de equipment.ts
  const eqLive = useMemo(() => {
    if (Object.keys(liveStatus).length === 0) return EQ; // fallback
    const merged = { ...EQ } as Record<string, typeof EQ[keyof typeof EQ]>;
    for (const [key, status] of Object.entries(liveStatus)) {
      if (key in merged) {
        merged[key] = { ...merged[key], status: status as 'operando' | 'advertencia' | 'alarma' };
      }
    }
    return merged as typeof EQ;
  }, [liveStatus]);

  const svgBody = useMemo(() => (
    <>
          <defs>
            <linearGradient id="tankG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a3d54"/><stop offset="100%" stopColor="#0b2233"/>
            </linearGradient>
            <linearGradient id="waterG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00c5e3" stopOpacity=".8"/>
              <stop offset="100%" stopColor="#004a90" stopOpacity=".9"/>
            </linearGradient>
            <linearGradient id="sludgeG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6b4a18"/><stop offset="100%" stopColor="#2c1c08"/>
            </linearGradient>
          </defs>

          <rect width="1800" height="700" fill="#070e16"/>

          {/* ── Fila superior: 3 fases compactas (y=36, h=315) ── */}
          <rect x="10"  y="36" width="255" height="315" rx="6" fill="#00c5e3" fillOpacity=".025" stroke="#00c5e3" strokeOpacity=".1"  strokeWidth="1"/>
          <rect x="269" y="36" width="800" height="315" rx="6" fill="#d29922" fillOpacity=".018" stroke="#d29922" strokeOpacity=".1"  strokeWidth="1"/>
          <rect x="1073" y="36" width="717" height="315" rx="6" fill="#3fb950" fillOpacity=".018" stroke="#3fb950" strokeOpacity=".08" strokeWidth="1"/>

          <PhaseLabel x={10}   w={255} label="FASE PRELIMINAR"  color="#2a7a8a"/>
          <PhaseLabel x={269}  w={800} label="FASE PRIMARIA"    color="#8a6a1a"/>
          <PhaseLabel x={1073} w={717} label="FASE SECUNDARIA"  color="#2a6a3a"/>

          {/* ── Fila inferior izquierda: TERCIARIA · REÚSO (x=10, y=355, w=1176) ── */}
          <rect x="10"  y="355" width="1176" height="313" rx="6" fill="#1f6feb" fillOpacity=".018" stroke="#1f6feb" strokeOpacity=".08" strokeWidth="1"/>
          <text x="598" y="373" textAnchor="middle" fill="#1a4a9a" fontSize="8.5" fontWeight="700" letterSpacing="2" fontFamily="monospace">FASE TERCIARIA · REÚSO</text>

          {/* ── Fila inferior derecha: VERTIMIENTO (x=1190, y=355, w=600) ── */}
          <rect x="1190" y="355" width="600" height="313" rx="6"
            fill="#f85149" fillOpacity=".015" stroke="#f85149" strokeOpacity=".08" strokeWidth="1"/>
          <text x="1490" y="373" textAnchor="middle"
            fill="#8a2a2a" fontSize="8.5" fontWeight="700" letterSpacing="2" fontFamily="monospace">FASE VERTIMIENTO</text>
          {/* ── Phase click zones (detrás de los equipos) ── */}
          <g className="phase-click-zones">
            {PHASES.map(ph => {
              const [vx, vy, vw, vh] = ph.vb.split(' ').map(Number);
              return (
                <rect key={ph.key}
                  x={vx} y={vy} width={vw} height={vh}
                  fill="transparent"
                  className="phase-zone"
                  tabIndex={0} role="button"
                  aria-label={`Ampliar ${ph.label}`}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openPhase(ph.key); }}
                  onClick={() => openPhase(ph.key)}
                />
              );
            })}
          </g>

          {/* ── VERTIMIENTO: 3 trenes en x=1190-1790 ── */}
          {/* Tren labels */}
          {[1310, 1490, 1670].map((sx, i) => (
            <text key={sx} x={sx} y="392" textAnchor="middle" fill="#f8514960" fontSize="5.5" fontWeight="700" letterSpacing="1" fontFamily="monospace">TREN {i+1}</text>
          ))}

          {/* Colector horizontal AC2 → 3 trenes (y=430) */}
          <line x1="1190" y1="430" x2="1755" y2="430" stroke="#f85149" strokeWidth="1.5" opacity=".5" className="p-reject"/>
          <circle cx="1195" cy="430" r="2.5" fill="#f85149" opacity=".75"/>
          {[1310, 1490, 1670].map(sx => (
            <circle key={sx} cx={sx} cy="430" r="2" fill="#f85149" opacity=".6"/>
          ))}

          {/* ══ 3 trenes: TK PERMEADO + FILTRO CARBÓN + salida EFLUENTE ══ */}
          {[1310, 1490, 1670].map((sx, i) => (
            <g key={sx}>
              {/* Bajada desde colector → TK PERM top (y=440) */}
              <line x1={sx} y1="430" x2={sx} y2="440"
                stroke="#f85149" strokeWidth="1.5" opacity=".6" className="p-reject"/>

              {/* TK PERMEADO (bottom y=520, h=80) */}
              <g className={`eq-h eq-g d${17+i}`} transform={`translate(${sx},520)`}>
                <TT eq={eqLive.tkVert}/>
                <SD eq={eqLive.tkVert} cx={35} cy={-80}/>
                <rect x="-35" y="-80" width="70" height="80" rx="3"
                  fill={tG} stroke="#f8514950" strokeWidth="1.4" className="eq-b"/>
                <rect x="-33" y="-56" width="66" height="54" fill={wG} opacity=".45"/>
                <path d="M-33,-56 Q0,-60 33,-56 L33,-53 Q0,-57 -33,-53Z" fill="#00c5e3" opacity=".3"/>
                <Dh w={70} h={80} pct={0.68}/>
                <text x="0" y="-28" textAnchor="middle" fill="#3fb95060" fontSize="9" fontWeight="700" fontFamily="monospace">{i+1}</text>
                <text y="13" textAnchor="middle" fill="#f85149" fontSize="6.5" fontWeight="700" fontFamily="monospace">TK PERM.</text>
              </g>

              {/* Conector TK → Filtro */}
              <line x1={sx} y1="520" x2={sx} y2="543"
                stroke="#3fb950" strokeWidth="1.5" opacity=".7" className="p-bio"/>

              {/* FILTRO CARBÓN ACTIVADO (bottom y=630, h=87) */}
              <g className={`eq-h eq-g d${17+i}`} transform={`translate(${sx},630)`}>
                <TT eq={eqLive.filtVert}/>
                <SD eq={eqLive.filtVert} cx={28} cy={-87}/>
                <rect x="-28" y="-87" width="56" height="87" rx="3"
                  fill={tG} stroke="#3fb95050" strokeWidth="1.4" className="eq-b"/>
                {[-18,-6,6,18].map(bx => (
                  <rect key={bx} x={bx-4} y="-83" width="8" height="76"
                    rx="3" fill="#1a1e14" stroke="#2a2e18" strokeWidth=".5"/>
                ))}
                <circle cx="0" cy="-44" r="18" fill="#a0e0ff" opacity=".05" className="uv-l"/>
                <text x="0" y="13" textAnchor="middle" fill="#3fb950" fontSize="6.5" fontWeight="700" fontFamily="monospace">FILT.C+O₃</text>
              </g>

              {/* Salida EFLUENTE */}
              <line x1={sx} y1="630" x2={sx} y2="648"
                stroke="#3fb950" strokeWidth="2" opacity=".75" className="p-clean"/>
              <polygon points={`${sx-4},645 ${sx},653 ${sx+4},645`} fill="#3fb950" opacity=".8"/>
              <text x={sx} y="662" textAnchor="middle"
                fill="#3fb95060" fontSize="5.5" fontFamily="monospace">EFLUENTE</text>
            </g>
          ))}

          {/* ══════════════ FASE PRELIMINAR (unchanged) ══════════════ */}

          {/* Input label boxes */}
          <g className="eq-h eq-g d1"><TT eq={eqLive.rotativa} anchor="left"/>
            <rect x="14" y="95" width="66" height="17" rx="3" fill="#071520" stroke="#00c5e3" strokeWidth="1.2" className="eq-b"/>
            <text x="47" y="107" textAnchor="middle" fill="#00c5e3" fontSize="6.5" fontFamily="monospace">D. ROTATIVA</text>
          </g>
          <g className="eq-h eq-g d2"><TT eq={eqLive.funza} anchor="left"/>
            <rect x="14" y="116" width="66" height="17" rx="3" fill="#071520" stroke="#8b5cf6" strokeWidth="1.2" className="eq-b"/>
            <SD eq={eqLive.funza} cx={80} cy={124}/>
            <text x="47" y="128" textAnchor="middle" fill="#8b5cf6" fontSize="6.5" fontFamily="monospace">D. FUNZA</text>
          </g>
          <g className="eq-h eq-g d3"><TT eq={eqLive.tintoreria} anchor="left"/>
            <rect x="14" y="179" width="66" height="17" rx="3" fill="#071520" stroke="#f85149" strokeWidth="1.2" className="eq-b"/>
            <text x="47" y="191" textAnchor="middle" fill="#f85149" fontSize="6.5" fontFamily="monospace">D. TINTORERÍA</text>
          </g>
          <g className="eq-h eq-g d4"><TT eq={eqLive.lavanderia} anchor="left"/>
            <rect x="14" y="200" width="66" height="17" rx="3" fill="#071520" stroke="#d29922" strokeWidth="1.2" className="eq-b"/>
            <text x="47" y="212" textAnchor="middle" fill="#d29922" fontSize="6.5" fontFamily="monospace">D. LAVANDERÍA</text>
          </g>
          <g className="eq-h eq-g d5"><TT eq={eqLive.tk15m3} anchor="left"/>
            <rect x="14" y="258" width="66" height="17" rx="3" fill="#071520" stroke="#d29922" strokeWidth="1" strokeDasharray="4 2" className="eq-b"/>
            <text x="47" y="270" textAnchor="middle" fill="#d2992290" fontSize="6.5" fontFamily="monospace">LAV. REMOTA</text>
          </g>

          {/* Input arrows A-E */}
          <line x1="80" y1="104" x2="98" y2="120" stroke="#00c5e3" strokeWidth="1.5" opacity=".75" className="p-raw"/>
          <PL x={83} y={110} label="A"/>
          <line x1="80" y1="125" x2="98" y2="128" stroke="#8b5cf6" strokeWidth="1.5" opacity=".75" className="p-raw"/>
          <PL x={83} y={122} label="B"/>
          <line x1="80" y1="188" x2="98" y2="204" stroke="#f85149" strokeWidth="1.5" opacity=".75" className="p-raw"/>
          <PL x={83} y={194} label="C"/>
          <line x1="80" y1="209" x2="98" y2="213" stroke="#d29922" strokeWidth="1.5" opacity=".75" className="p-raw"/>
          <PL x={83} y={206} label="D"/>
          <line x1="80" y1="267" x2="98" y2="267" stroke="#d29922" strokeWidth="1.5" opacity=".55" strokeDasharray="5 3"/>
          <polygon points="95,263 103,267 95,271" fill="#d29922" opacity=".55"/>
          <PL x={83} y={263} label="E"/>

          {/* TK 2m³ */}
          <g className="eq-h eq-g d6" transform="translate(120,143)">
            <TT eq={eqLive.tk2m3}/><SD eq={eqLive.tk2m3} cx={18} cy={-38}/>
            <Tk w={44} h={38} wp={0.60}/>
            <text y="12" textAnchor="middle" fill="#00c5e3" fontSize="7" fontWeight="700" fontFamily="monospace">TK 2 m³</text>
          </g>
          {/* TK 30m³ */}
          <g className="eq-h eq-g d7" transform="translate(120,234)">
            <TT eq={eqLive.tk30m3}/><SD eq={eqLive.tk30m3} cx={22} cy={-50}/>
            <Tk w={48} h={50} wp={0.62}/>
            <text y="12" textAnchor="middle" fill="#00c5e3" fontSize="7" fontWeight="700" fontFamily="monospace">TK 30 m³</text>
          </g>
          {/* TK 15m³ */}
          <g className="eq-h eq-g d8" transform="translate(120,281)">
            <TT eq={eqLive.tk15m3}/><SD eq={eqLive.tk15m3} cx={18} cy={-35}/>
            <Tk w={44} h={35} wp={0.55}/>
            <text y="12" textAnchor="middle" fill="#00c5e3" fontSize="7" fontWeight="700" fontFamily="monospace">TK 15 m³</text>
          </g>
          {/* F: TK15 → TK30 */}
          <line x1="120" y1="246" x2="120" y2="236" stroke="#d29922" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <polygon points="116,239 120,231 124,239" fill="#d29922" opacity=".8"/>
          <PL x={127} y={264} label="F"/>
          {/* G: TK2 → junction x=183,y=215 */}
          <line x1="142" y1="124" x2="183" y2="124" stroke="#00c5e3" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <line x1="183" y1="124" x2="183" y2="215" stroke="#00c5e3" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <PL x={157} y={119} label="G"/>
          {/* H: TK30 → junction */}
          <line x1="144" y1="215" x2="183" y2="215" stroke="#00c5e3" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <PL x={157} y={211} label="H"/>
          <circle cx="183" cy="215" r="3" fill="#00c5e3" opacity=".9"/>
          <text x="168" y="229" fill="#00c5e360" fontSize="6" fontFamily="monospace">G+H</text>
          {/* TK 60m³ */}
          <g className="eq-h eq-g d9" transform="translate(215,257)">
            <TT eq={eqLive.tk60m3}/><SD eq={eqLive.tk60m3} cx={28} cy={-112}/>
            <rect x="-32" y="-112" width="64" height="112" rx="3" fill={tG} stroke="#2a5a70" strokeWidth="1.5" className="eq-b"/>
            <rect x="-30" y="-78" width="60" height="76" fill={wG} opacity=".55"/>
            <path d="M-30,-78 Q0,-81 30,-78 L30,-76 Q0,-79 -30,-76Z" fill="#00c5e3" opacity=".4"/>
            <Dh w={64} h={112} pct={0.70}/>
            <text x="0" y="-55" textAnchor="middle" fill="#4a7a8a" fontSize="7" fontFamily="monospace">60 m³</text>
            <text y="14" textAnchor="middle" fill="#00c5e3" fontSize="7.5" fontWeight="700" fontFamily="monospace">TK 60 m³</text>
          </g>
          {/* I: TK60 → Phase Primaria */}
          <line x1="247" y1="215" x2="306" y2="215" stroke="#00c5e3" strokeWidth="2.5" opacity=".9" className="p-raw"/>
          <polygon points="299,211 308,215 299,219" fill="#00c5e3" opacity=".9"/>
          <PL x={265} y={210} label="I → J"/>

          {/* ══════════════ FASE PRIMARIA ══════════════
              J (from TK60) → Criba Rotativa
              K1/K2 → Vibratoria 1 (above) / 2 (below)
              N1+N2 → TK Pulmón
              O → Torre de Enfriamiento → Q → TK Homogeneizador
              R → Cárcamo → AK1 → Fase Secundaria
              TK Homogeneizador → AA1 → Equipo GEM → U → Swingmill
          ══════════════════════════════════════════ */}

          {/* ── Criba Rotativa (340, 215) ── */}
          <g className="eq-h eq-g d10" transform="translate(340,215)">
            <TT eq={eqLive.cribRot}/><SD eq={eqLive.cribRot} cx={28} cy={-82}/>
            {/* housing trough */}
            <path d="M-42,0 L-42,-22 Q-42,-30 -36,-30 L36,-30 Q42,-30 42,-22 L42,0Z"
              fill={tG} stroke="#2a5a70" strokeWidth="1.5" className="eq-b"/>
            {/* drum */}
            <circle cx="0" cy="-55" r="36" fill="#071520" stroke="#2a5a70" strokeWidth="1.5" className="eq-bc"/>
            <g className="rot-drum">
              <circle cx="0" cy="-55" r="34" fill="none" stroke="#1a3555" strokeWidth="1.5"/>
              {[0,45,90,135,180,225,270,315].map(a=>{
                const r1=(a*Math.PI)/180;
                return <line key={a} x1={10*Math.cos(r1)} y1={-55+10*Math.sin(r1)} x2={31*Math.cos(r1)} y2={-55+31*Math.sin(r1)} stroke="#00c5e330" strokeWidth="1.5"/>;
              })}
              <circle cx="0" cy="-55" r="9" fill="#0f2030" stroke="#00c5e340" strokeWidth="1"/>
            </g>
            <path d="M-40,-14 Q0,-10 40,-14 L40,0 L-40,0Z" fill={wG} opacity=".45"/>
            <text y="16" textAnchor="middle" fill="#d29922" fontSize="7" fontWeight="700" fontFamily="monospace">CRIBA</text>
            <text y="24" textAnchor="middle" fill="#d29922" fontSize="7" fontWeight="700" fontFamily="monospace">ROTATIVA</text>
            {/* residuos gruesos label */}
            <text x="42" y="-78" fill="#5a4018" fontSize="6" fontFamily="monospace">→ RES. GRUESOS</text>
          </g>

          {/* K1: Criba → Vibratoria 1 (above) */}
          <line x1="340" y1="165" x2="340" y2="152" stroke="#d29922" strokeWidth="1.5" opacity=".7" className="p-raw"/>
          <line x1="340" y1="152" x2="429" y2="152" stroke="#d29922" strokeWidth="1.5" opacity=".7" className="p-raw"/>
          <PL x={370} y={147} label="K1" color="#8a6a2a"/>
          {/* K2: Criba → Vibratoria 2 (below) */}
          <line x1="340" y1="265" x2="340" y2="283" stroke="#d29922" strokeWidth="1.5" opacity=".7" className="p-raw"/>
          <line x1="340" y1="283" x2="429" y2="283" stroke="#d29922" strokeWidth="1.5" opacity=".7" className="p-raw"/>
          <PL x={370} y={300} label="K2" color="#8a6a2a"/>

          {/* ── Criba Vibratoria 1 / M1 — circular (center 455, 191) ── */}
          <g className="eq-h eq-g d11" transform="translate(455,191)">
            <VibratoriaStage eq={eqLive.vibrat1} motorLabel="M1" svgLabel="VIBRAT. 1" showFinosLabel={true}/>
          </g>

          {/* ── Criba Vibratoria 2 / M2 — circular (center 455, 283) ── */}
          <g className="eq-h eq-g d12" transform="translate(455,283)">
            <VibratoriaStage eq={eqLive.vibrat2} motorLabel="M2" svgLabel="VIBRAT. 2"/>
          </g>

          {/* N1: Vibrat1 right → vertical down → mainY → TK Pulmón */}
          <line x1="481" y1="151" x2="505" y2="151" stroke="#d29922" strokeWidth="1.5" opacity=".75" className="p-raw"/>
          <line x1="505" y1="151" x2="505" y2="215" stroke="#d29922" strokeWidth="1.5" opacity=".75" className="p-raw"/>
          <PL x={490} y={147} label="N1" color="#8a6a2a"/>
          {/* N2: Vibrat2 right → vertical up → mainY → TK Pulmón */}
          <line x1="481" y1="263" x2="505" y2="263" stroke="#d29922" strokeWidth="1.5" opacity=".75" className="p-raw"/>
          <line x1="505" y1="263" x2="505" y2="215" stroke="#d29922" strokeWidth="1.5" opacity=".75" className="p-raw"/>
          <PL x={490} y={303} label="N2" color="#8a6a2a"/>
          {/* N1+N2 merge → TK Pulmón */}
          <circle cx="505" cy="215" r="3" fill="#d29922" opacity=".8"/>
          <line x1="505" y1="215" x2="544" y2="215" stroke="#d29922" strokeWidth="2" opacity=".8" className="p-raw"/>
          <text x="520" y="210" fill="#8a6a2a" fontSize="6" fontFamily="monospace">N1+N2</text>

          {/* ── TK PULMÓN (bottom at y=272, center x=570) ── */}
          <g className="eq-h eq-g d13" transform="translate(570,272)">
            <TT eq={eqLive.tkPulmon}/><SD eq={eqLive.tkPulmon} cx={26} cy={-108}/>
            <Tk w={52} h={108} wp={0.65}/>
            <Dh w={52} h={108} pct={0.65}/>
            <text y="13" textAnchor="middle" fill="#d29922" fontSize="7" fontWeight="700" fontFamily="monospace">TK PULMÓN</text>
          </g>

          {/* O: TK Pulmón right-top → Torre */}
          <line x1="596" y1="192" x2="659" y2="192" stroke="#00c5e3" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <PL x={622} y={187} label="O" color="#2a6a7a"/>
          {/* R: TK Pulmón right-bottom → Cárcamo */}
          <line x1="596" y1="247" x2="662" y2="247" stroke="#00c5e3" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <PL x={622} y={243} label="R" color="#2a6a7a"/>

          {/* ── TORRE DE ENFRIAMIENTO (bottom y=202, center x=685) ── */}
          <g className="eq-h eq-g d14" transform="translate(685,202)">
            <TT eq={eqLive.torre}/><SD eq={eqLive.torre} cx={24} cy={-95}/>
            <rect x="-26" y="-98" width="52" height="98" rx="3" fill={tG} stroke="#8b5cf660" strokeWidth="1.5" className="eq-b"/>
            {[-85,-70,-55,-40,-25].map(y=>(
              <rect key={y} x="-22" y={y} width="44" height="9" rx="1" fill="#1a2535" stroke="#2a3a50" strokeWidth=".5"/>
            ))}
            <circle cx="-10" cy="-78" r="2" fill="#00c5e380" className="t-drop"/>
            <circle cx="2"   cy="-65" r="1.8" fill="#00c5e360" className="t-drop2"/>
            <circle cx="14"  cy="-88" r="2" fill="#00c5e370" className="t-drop3"/>
            <rect x="-24" y="-18" width="48" height="16" fill={wG} opacity=".45"/>
            {/* P: Pérdida vapor arrow up */}
            <line x1="0" y1="-98" x2="0" y2="-112" stroke="#8b5cf660" strokeWidth="1.2" strokeDasharray="3 2"/>
            <polygon points="-4,-110 0,-118 4,-110" fill="#8b5cf660"/>
            <text x="6" y="-107" fill="#6a4a8a60" fontSize="5.5" fontFamily="monospace">P vapor</text>
            <text y="14" textAnchor="middle" fill="#8b5cf6" fontSize="6.5" fontWeight="700" fontFamily="monospace">TORRE ENFRIAM.</text>
          </g>

          {/* ── CÁRCAMO (bottom y=285, center x=685) ── */}
          <g className="eq-h eq-g d15" transform="translate(685,285)">
            <TT eq={eqLive.carcamo}/><SD eq={eqLive.carcamo} cx={22} cy={-62}/>
            <Tk w={46} h={65} wp={0.60}/>
            <text y="13" textAnchor="middle" fill="#d29922" fontSize="7" fontWeight="700" fontFamily="monospace">CÁRCAMO</text>
            {/* REBOSE up-left */}
            <line x1="-23" y1="-65" x2="-23" y2="-80" stroke="#f8514960" strokeWidth="1.2" strokeDasharray="3 2"/>
            <polygon points="-27,-77 -23,-85 -19,-77" fill="#f8514960"/>
            <text x="-28" y="-82" fill="#f8514950" fontSize="5.5" fontFamily="monospace" textAnchor="middle">REBOSE</text>
          </g>

          {/* Q: Torre right → TK Homogen feed */}
          <line x1="711" y1="192" x2="730" y2="192" stroke="#00c5e3" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <line x1="730" y1="192" x2="730" y2="215" stroke="#00c5e3" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <line x1="730" y1="215" x2="766" y2="215" stroke="#00c5e3" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <PL x={719} y={188} label="Q" color="#2a6a7a"/>

          {/* (AK1 hacia Secundaria eliminado — flujo principal ahora va por X: GEM→Anóxico) */}

          {/* ── TK HOMOGENEIZADOR 800m³ (bottom y=272, center x=800) ── */}
          {/* Chemical dosing from top */}
          <line x1="790" y1="99" x2="790" y2="119" stroke="#d29922" strokeWidth="1.2" strokeDasharray="3 2" opacity=".7"/>
          <circle cx="790" cy="99" r="5" fill="#d29922" opacity=".85"/>
          <text x="790" y="91" textAnchor="middle" fill="#d29922" fontSize="5.5" fontFamily="monospace">OZONO S</text>
          <line x1="810" y1="99" x2="810" y2="119" stroke="#3fb950" strokeWidth="1.2" strokeDasharray="3 2" opacity=".7"/>
          <circle cx="810" cy="99" r="5" fill="#3fb950" opacity=".85"/>
          <text x="810" y="91" textAnchor="middle" fill="#3fb950" fontSize="5.5" fontFamily="monospace">LIXIV. V</text>

          <g className="eq-h eq-g d16" transform="translate(800,272)">
            <TT eq={eqLive.homogen}/><SD eq={eqLive.homogen} cx={32} cy={-115}/>
            <rect x="-34" y="-118" width="68" height="118" rx="4" fill={tG} stroke="#d2992260" strokeWidth="1.8" className="eq-b"/>
            <rect x="-32" y="-78" width="64" height="76" fill={wG} opacity=".52"/>
            <path d="M-32,-78 Q0,-82 32,-78 L32,-75 Q0,-79 -32,-75Z" fill="#00c5e3" opacity=".38"/>
            <text x="0" y="-85" textAnchor="middle" fill="#4a6a80" fontSize="7" fontFamily="monospace">800 m³</text>
            {/* mixer */}
            <line x1="0" y1="-118" x2="0" y2="-40" stroke="#1a3555" strokeWidth="1.5"/>
            <g className="mixer">
              <rect x="-22" y="-46" width="44" height="8" rx="3" fill="#1a4060" stroke="#2a5a80" strokeWidth="1"/>
            </g>
            <Dh w={68} h={118} pct={0.66}/>
            <text y="13" textAnchor="middle" fill="#d29922" fontSize="7" fontWeight="700" fontFamily="monospace">TK HOMOGEN.</text>
            <text y="21" textAnchor="middle" fill="#d29922" fontSize="6" fontFamily="monospace">800 m³</text>
          </g>

          {/* AA1: TK Homogen → Equipo GEM */}
          <line x1="834" y1="215" x2="883" y2="215" stroke="#d29922" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <PL x={852} y={211} label="AA1" color="#8a6a2a"/>

          {/* ── EQUIPO GEM (bottom y=267, center x=915) ── */}
          {/* Chemical dosing lines from top */}
          {[
            { x:899, color:'#f85149',  label:'Ácido' },
            { x:907, color:'#ff6b35',  label:'Decol.' },
            { x:915, color:'#00c5e3',  label:'Coag.' },
            { x:923, color:'#3fb950',  label:'F.Cat.' },
            { x:931, color:'#8b5cf6',  label:'F.An.' },
          ].map(d=>(
            <g key={d.label}>
              <line x1={d.x} y1="102" x2={d.x} y2="119" stroke={d.color} strokeWidth="1.2" strokeDasharray="2 2" opacity=".7"/>
              <circle cx={d.x} cy={102} r="4" fill={d.color} opacity=".85"/>
              <text x={d.x} y="94" textAnchor="middle" fill={d.color} fontSize="5" fontFamily="monospace">{d.label}</text>
            </g>
          ))}
          <g className="eq-h eq-g d17" transform="translate(915,267)">
            <TT eq={eqLive.eqGem}/><SD eq={eqLive.eqGem} cx={30} cy={-108}/>
            <rect x="-32" y="-110" width="64" height="110" rx="4" fill={tG} stroke="#d2992260" strokeWidth="1.8" className="eq-b"/>
            <rect x="-30" y="-70" width="60" height="68" fill={wG} opacity=".5"/>
            {/* gear icon */}
            <g className="mixer">
              <circle cx="0" cy="-38" r="16" fill="#0d2535" stroke="#d29922" strokeWidth="1.2"/>
              {[0,60,120,180,240,300].map(a=>{
                const r1=a*Math.PI/180;
                return <rect key={a} x={14*Math.cos(r1)-3} y={-38+14*Math.sin(r1)-3} width="6" height="6"
                  rx="1" fill="#d29922" opacity=".7" transform={`rotate(${a},${14*Math.cos(r1)},${-38+14*Math.sin(r1)})`}/>;
              })}
              <circle cx="0" cy="-38" r="5" fill="#1a3050"/>
            </g>
            <text y="13" textAnchor="middle" fill="#d29922" fontSize="7" fontWeight="700" fontFamily="monospace">EQUIPO GEM</text>
          </g>

          {/* U: GEM → Swingmill (lodos) */}
          <line x1="947" y1="215" x2="997" y2="215" stroke={sG} strokeWidth="2" opacity=".8" className="p-sludge"/>
          <PL x={967} y={210} label="U" color="#7a5820"/>

          {/* ── SWINGMILL / ESPESADOR (cx=1025) ── */}
          <g className="eq-h eq-g d18" transform="translate(1025,237)">
            <TT eq={eqLive.swingmill}/><SD eq={eqLive.swingmill} cx={28} cy={-55}/>
            <circle cx="0" cy="-22" r="28" fill={sG} stroke="#5a4018" strokeWidth="1.5" className="eq-bc"/>
            <g className="mixer">
              <line x1="0" y1="-48" x2="0" y2="-20" stroke="#3a2010" strokeWidth="1.5"/>
              <rect x="-14" y="-25" width="28" height="6" rx="3" fill="#2a1808" stroke="#4a3010" strokeWidth="1"/>
            </g>
            <text y="16" textAnchor="middle" fill="#7a5820" fontSize="7" fontWeight="700" fontFamily="monospace">SWINGMILL</text>
            {/* W: Lodo deshidratado — salida sin conexión posterior */}
            <line x1="0" y1="6" x2="0" y2="35" stroke="#5a3a10" strokeWidth="2" strokeDasharray="4 3" opacity=".7"/>
            <polygon points="-4,32 0,40 4,32" fill="#5a3a10" opacity=".7"/>
            <text x="6" y="40" fill="#5a402060" fontSize="5.5" fontFamily="monospace">W→Lodo</text>
          </g>

          {/* V: Swingmill → TK Homogeneizador (Lixiviado — recirculación) */}
          <line x1="1025" y1="187" x2="1025" y2="140" stroke="#3fb950" strokeWidth="1.5" opacity=".7" className="p-raw"/>
          <line x1="1025" y1="140" x2="834"  y2="140" stroke="#3fb950" strokeWidth="1.5" opacity=".7" className="p-raw"/>
          <line x1="834"  y1="140" x2="834"  y2="154" stroke="#3fb950" strokeWidth="1.5" opacity=".7" className="p-raw"/>
          <polygon points="830,151 834,159 838,151" fill="#3fb950" opacity=".7"/>
          <text x="929" y="136" textAnchor="middle" fill="#3fb95080" fontSize="5.5" fontStyle="italic" fontFamily="monospace">V (lixiviado)</text>

          {/* X: GEM (947) → canal superior y=62 → ANÓXICO (cx=1741) */}
          <line x1="947" y1="157" x2="947" y2="62"   stroke="#00c5e3" strokeWidth="2" opacity=".85" className="p-raw"/>
          <line x1="947" y1="62"  x2="1741" y2="62"  stroke="#00c5e3" strokeWidth="2" opacity=".85" className="p-raw"/>
          <line x1="1741" y1="62" x2="1741" y2="169" stroke="#00c5e3" strokeWidth="2" opacity=".85" className="p-raw"/>
          <polygon points="1737,166 1741,174 1745,166" fill="#00c5e3" opacity=".9"/>
          <text x="1344" y="57" textAnchor="middle" fill="#00c5e380" fontSize="6" fontStyle="italic" fontFamily="monospace">X → ANÓXICO</text>

          {/* ══ FASE SECUNDARIA ══
              TK PERMEADO cx=1123 | MBR T/K cx=1329 | MBBR cx=1535 | ANÓXICO cx=1741
          ══════════════════════════════════════════════════════════════ */}

          {/* ── ANÓXICO (cx=1741, bottom=277) ── */}
          <g className="eq-h eq-g d19" transform="translate(1741,277)">
            <TT eq={eqLive.anoxic} anchor="right"/><SD eq={eqLive.anoxic} cx={38} cy={-108}/>
            <rect x="-38" y="-108" width="76" height="108" rx="3" fill={tG} stroke="#3fb95060" strokeWidth="1.5" className="eq-b"/>
            <rect x="-36" y="-75" width="72" height="73" fill="#0a2510" opacity=".65"/>
            <circle cx="0" cy="-48" r="13" fill="#0a2510" stroke="#2a5a2a" strokeWidth="1"/>
            <text x="0" y="-51" textAnchor="middle" fill="#3fb950" fontSize="6.5" fontFamily="monospace">NO₃⁻ ↓</text>
            <text y="13" textAnchor="middle" fill="#3fb950" fontSize="7.5" fontWeight="700" fontFamily="monospace">ANÓXICO</text>
          </g>

          {/* Y: ANÓXICO(1703) → MBBR(1581) */}
          <line x1="1703" y1="215" x2="1581" y2="215" stroke="#3fb950" strokeWidth="2" opacity=".85" className="p-bio"/>
          <polygon points="1584,211 1576,215 1584,219" fill="#3fb950" opacity=".9"/>
          <PL x={1642} y={210} label="Y" color="#2a6a3a"/>

          {/* ── MBBR (cx=1535, bottom=287) ── */}
          <g className="eq-h eq-g d19" transform="translate(1535,287)">
            <TT eq={eqLive.mbbr}/><SD eq={eqLive.mbbr} cx={46} cy={-118}/>
            <rect x="-46" y="-118" width="92" height="118" rx="3" fill={tG} stroke="#3fb95060" strokeWidth="1.5" className="eq-b"/>
            <rect x="-44" y="-88" width="88" height="86" fill={wG} opacity=".48"/>
            {[-32,-14,4,22].map((x,i)=>
              [-78,-62,-46].map((y,j)=>(
                <rect key={`${i}-${j}`} x={x} y={y} width="11" height="9" rx="2" fill="#1a3550" stroke="#2a5575" strokeWidth=".5" opacity=".8"/>
              ))
            )}
            <circle cx="-24" cy="-18" r="3" fill="#00c5e3" opacity=".4" className="b1"/>
            <circle cx="0"   cy="-10" r="2.5" fill="#00c5e3" opacity=".4" className="b2"/>
            <circle cx="20"  cy="-22" r="3.5" fill="#00c5e3" opacity=".35" className="b3"/>
            {[-30,-10,10,30].map(bx=>(
              <rect key={bx} x={bx-6} y="-4" width="12" height="4" rx="2" fill="#1a4060"/>
            ))}
            <text y="13" textAnchor="middle" fill="#3fb950" fontSize="7.5" fontWeight="700" fontFamily="monospace">MBBR</text>
          </g>

          {/* Recirc: MBR T/K(1329) → ANÓXICO(1749) — path invertido → flowL muestra MBR→ANÓXICO */}
          <path d="M1749,169 C1749,85 1329,85 1329,113" fill="none" stroke="#8b5cf6"
            strokeWidth="1.8" opacity=".6" className="p-recirc"/>
          <polygon points="1745,165 1749,173 1753,165" fill="#8b5cf6" opacity=".6"/>
          <text x="1539" y="80" textAnchor="middle" fill="#8b5cf650" fontSize="5.5" fontFamily="monospace">RECIRC. LODO BIO.</text>

          {/* Sopladores → MBBR */}
          {[1495,1535,1575].map((sx,i)=>(
            <g key={sx} className="eq-g" style={{animationDelay:`${0.6+i*0.1}s`}}>
              <line x1={sx} y1="295" x2={sx} y2="287" stroke="#3fb95040" strokeWidth="1.5" strokeDasharray="3 2"/>
              <circle cx={sx} cy="304" r="9" fill="#0a2010" stroke="#3fb95060" strokeWidth="1.2"/>
              <text x={sx} y="308" textAnchor="middle" fill="#3fb95070" fontSize="6.5" fontFamily="monospace">S</text>
            </g>
          ))}
          <text x="1535" y="320" textAnchor="middle" fill="#3fb95040" fontSize="5.5" fontFamily="monospace">SOPLADORES</text>

          {/* Z: MBBR(1489) → junction(1420) */}
          <line x1="1489" y1="215" x2="1420" y2="215" stroke="#3fb950" strokeWidth="2" opacity=".85" className="p-bio"/>
          <PL x={1454} y={210} label="Z" color="#2a6a3a"/>
          <line x1="1420" y1="154" x2="1420" y2="276" stroke="#3fb950" strokeWidth="1.8" opacity=".7" className="p-bio"/>
          {/* Z1: → MBR T right (1329+32=1361, y=154) */}
          <line x1="1420" y1="154" x2="1361" y2="154" stroke="#3fb950" strokeWidth="1.8" opacity=".8" className="p-bio"/>
          <polygon points="1364,150 1356,154 1364,158" fill="#3fb950" opacity=".9"/>
          <PL x={1390} y={150} label="Z1" color="#2a6a3a"/>
          {/* Z2: → MBR K right (1361, y=276) */}
          <line x1="1420" y1="276" x2="1361" y2="276" stroke="#3fb950" strokeWidth="1.8" opacity=".8" className="p-bio"/>
          <polygon points="1364,272 1356,276 1364,280" fill="#3fb950" opacity=".9"/>
          <PL x={1390} y={293} label="Z2" color="#2a6a3a"/>

          {/* ── MBR T (cx=1329, bottom=195) ── */}
          <g className="eq-h eq-g d20" transform="translate(1329,195)">
            <MBRTank eq={eqLive.mbrT} svgLabel="MBR T" borderColor="#3fb95060" labelColor="#3fb950" innerStroke="#2a5575"/>
          </g>

          {/* ── MBR K (cx=1329, bottom=317) ── */}
          <g className="eq-h eq-g d20" transform="translate(1329,317)">
            <MBRTank eq={eqLive.mbrK} svgLabel="MBR K" borderColor="#d2992260" labelColor="#d29922" innerStroke="#3a5040" waterOpacity=".42" animDelay=".4s"/>
          </g>

          {/* MBR T/K left(1297) → merge junction(1195) */}
          <line x1="1297" y1="154" x2="1195" y2="154" stroke="#3fb950" strokeWidth="1.8" opacity=".8" className="p-bio"/>
          <line x1="1195" y1="154" x2="1195" y2="215" stroke="#3fb950" strokeWidth="1.8" opacity=".8" className="p-bio"/>
          <line x1="1297" y1="276" x2="1195" y2="276" stroke="#3fb950" strokeWidth="1.8" opacity=".8" className="p-bio"/>
          <line x1="1195" y1="276" x2="1195" y2="215" stroke="#3fb950" strokeWidth="1.8" opacity=".8" className="p-bio"/>
          <circle cx="1195" cy="215" r="3.5" fill="#3fb950" opacity=".9"/>
          {/* Merge → TK PERMEADO right (1123+30=1153) */}
          <line x1="1195" y1="215" x2="1153" y2="215" stroke="#3fb950" strokeWidth="2" opacity=".9" className="p-bio"/>
          <polygon points="1156,211 1148,215 1156,219" fill="#3fb950" opacity=".9"/>

          {/* AC2: merge(1195,215) → VERTIMIENTO colector (y=430) */}
          <line x1="1195" y1="215" x2="1195" y2="430" stroke="#f85149" strokeWidth="1.8" opacity=".65" className="p-reject"/>
          <polygon points="1191,425 1195,433 1199,425" fill="#f85149" opacity=".65"/>
          <text x="1206" y="300" fill="#f8514950" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AC2</text>
          <text x="1206" y="310" fill="#f8514950" fontSize="5.5" fontFamily="monospace">→ VERT.</text>

          {/* ── TK PERMEADO (cx=1123, bottom=257) — izquierda SECUNDARIA ── */}
          <g className="eq-h eq-g d19" transform="translate(1123,257)">
            <TT eq={eqLive.tkPermeado}/><SD eq={eqLive.tkPermeado} cx={30} cy={-110}/>
            <rect x="-30" y="-110" width="60" height="110" rx="3" fill={tG} stroke="#3fb95060" strokeWidth="1.5" className="eq-b"/>
            <rect x="-28" y="-72" width="56" height="70" fill={wG} opacity=".52"/>
            <path d="M-28,-72 Q0,-75 28,-72 L28,-70 Q0,-73 -28,-70Z" fill="#00c5e3" opacity=".4"/>
            <Dh w={60} h={110} pct={0.65}/>
            <text y="13" textAnchor="middle" fill="#3fb950" fontSize="6.5" fontWeight="700" fontFamily="monospace">TK PERMEADO</text>
          </g>

          {/* AD: TK Permeado der → ruta inferior → Cárcamo (línea secundaria) */}
          <line x1="1153" y1="215" x2="1153" y2="345" stroke="#d29922" strokeWidth="1.5" opacity=".5" strokeDasharray="6 3"/>
          <line x1="1153" y1="345" x2="685"  y2="345" stroke="#d29922" strokeWidth="1.5" opacity=".5" strokeDasharray="6 3"/>
          <line x1="685"  y1="345" x2="685"  y2="285" stroke="#d29922" strokeWidth="1.5" opacity=".5" strokeDasharray="6 3"/>
          <polygon points="681,288 685,280 689,288" fill="#d29922" opacity=".5"/>
          <text x="921" y="340" textAnchor="middle" fill="#d2992250" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AD → CÁRCAMO</text>

          {/* AE: TK Permeado izq (1093,257) → baja a FILT.IÓNICO HORIZ (top=426) */}
          <line x1="1093" y1="257" x2="1093" y2="426" stroke="#3fb950" strokeWidth="2" opacity=".85" className="p-bio"/>
          <polygon points="1089,422 1093,430 1097,422" fill="#3fb950" opacity=".9"/>
          <text x="1107" y="330" fill="#3fb95080" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AE→TERC.</text>

          {/* ══════════════ FASE TERCIARIA — 2 filas (mYA=480 superior · mYB=615 rechazos) ══════════════ */}

          {/* ── Tubería principal superior y=mYA — FLOW right→left (x1>x2 para flowR correcto) ── */}
          <line x1="1060" y1={mYA} x2="530"  y2={mYA} stroke="#0c2233" strokeWidth="7" strokeLinecap="round"/>
          <line x1="1060" y1={mYA} x2="530"  y2={mYA} stroke="#3fb950" strokeWidth="3.5" opacity=".85" className="p-clean"/>
          <circle cx="1060" cy={mYA} r="3" fill="#3fb950" opacity=".8"/>
          {/* Pipe labels upper */}
          <text x="1016" y={mYA-5} textAnchor="middle" fill="#c084fc55" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AF</text>
          <text x="836"  y={mYA-5} textAnchor="middle" fill="#1f6feb55" fontSize="5.5" fontStyle="italic" fontFamily="monospace">→ RO1</text>
          <text x="673"  y={mYA-5} textAnchor="middle" fill="#1f6feb55" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AH</text>

          {/* ── AG: RO1 E1 permeado ↓ collector ── */}
          <line x1="740" y1={mYA} x2="740" y2="510" stroke="#3fb950" strokeWidth="1.5" opacity=".65" className="p-clean"/>
          <circle cx="740" cy="510" r="2.5" fill="#3fb950" opacity=".7"/>
          <text x="751" y="499" fill="#3fb95065" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AG</text>

          {/* ── AL: RO1 E2 permeado ↓ collector ── */}
          <line x1="575" y1={mYA} x2="575" y2="510" stroke="#3fb950" strokeWidth="1.5" opacity=".65" className="p-clean"/>
          <circle cx="575" cy="510" r="2.5" fill="#3fb950" opacity=".7"/>
          <text x="586" y="499" fill="#3fb95065" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AL</text>

          {/* ── AJ: RO1 E2 reject ↓ TK RECH RO1 ── */}
          <line x1="530" y1={mYA} x2="530" y2="547" stroke="#f85149" strokeWidth="1.5" opacity=".6" className="p-reject"/>
          <polygon points="526,543 530,552 534,543" fill="#f85149" opacity=".65"/>
          <text x="514" y="518" fill="#f8514965" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AJ</text>

          {/* ── Permeado collector y=510 — FLOW right→left (x1>x2) ── */}
          <line x1="840" y1="510" x2="200"  y2="510" stroke="#0c2233" strokeWidth="5" strokeLinecap="round"/>
          <line x1="840" y1="510" x2="200"  y2="510" stroke="#3fb950" strokeWidth="2.5" opacity=".75" className="p-clean"/>
          <polygon points="203,507 195,510 203,513" fill="#3fb950" opacity=".85"/>

          {/* ── AM: RO2 permeado ↑ collector (RO2 nuevo x=745) ── */}
          <line x1="745" y1="565" x2="745" y2="510" stroke="#3fb950" strokeWidth="1.5" opacity=".65" className="p-clean"/>
          <circle cx="745" cy="510" r="2.5" fill="#3fb950" opacity=".75"/>
          <text x="757" y="537" fill="#3fb95065" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AM</text>

          {/* ── Collector ↓ TK RECIR (entry x=200) ── */}
          <line x1="200" y1="510" x2="200" y2="521" stroke="#3fb950" strokeWidth="2.5" opacity=".75" className="p-clean"/>
          <polygon points="196,518 200,526 204,518" fill="#3fb950" opacity=".85"/>

          {/* ── FILTRO INTERCAMBIO IÓNICO HORIZONTAL 90° (x=1093, bottom=mYA) — recibe AE ── */}
          {/* w=100 h=54 → top=426 (53px bajo título y=373 ✓, era top=390 que cubría título) */}
          <g className="eq-h eq-g d17" transform={`translate(1093,${mYA})`}>
            <TT eq={eqLive.filtrosII}/><SD eq={eqLive.filtrosII} cx={50} cy={-52}/>
            <rect x="-50" y="-54" width="100" height="54" rx="3" fill="#120a18" stroke="#c084fc60" strokeWidth="1.5" className="eq-b"/>
            {/* 3 columnas de lecho de resina — dentro de ±42 para no desbordar el outer rect ±50 */}
            {[[-42,'#1a2a50','#3b82f6'],[-12,'#1a1a2a','#6b7280'],[18,'#1a2a50','#3b82f6']].map(([bx,bg,sc],i)=>(
              <g key={i}>
                <rect x={Number(bx)} y="-48" width="24" height="44" rx="3" fill={bg as string} stroke={sc as string} strokeWidth="1"/>
                {[-40,-28,-16,-4].map(ry=>(<circle key={ry} cx={Number(bx)+12} cy={ry} r="3" fill={sc as string} opacity=".4"/>))}
              </g>
            ))}
            <line x1="-46" y1="-48" x2="46" y2="-4" stroke="#c084fc" strokeWidth="1" opacity=".3"/>
            <line x1="46" y1="-48" x2="-46" y2="-4" stroke="#c084fc" strokeWidth="1" opacity=".3"/>
            <text y="12" textAnchor="middle" fill="#c084fc" fontSize="6" fontWeight="700" fontFamily="monospace">FILT. IÓNICO</text>
          </g>
          {/* Auxiliares a la derecha del filtro horizontal (x>1143) */}
          <rect x="1148" y="432" width="44" height="13" rx="2" fill="#120a18" stroke="#c084fc40" strokeWidth="1"/>
          <text x="1170" y="441" textAnchor="middle" fill="#c084fc70" fontSize="5" fontFamily="monospace">PREP.RESINAS</text>
          <rect x="1148" y="449" width="44" height="13" rx="2" fill="#120a18" stroke="#c084fc40" strokeWidth="1"/>
          <text x="1170" y="458" textAnchor="middle" fill="#c084fc70" fontSize="5" fontFamily="monospace">TK SALMUERA</text>
          <line x1="1143" y1="438" x2="1148" y2="438" stroke="#c084fc" strokeWidth="1" opacity=".4"/>
          <line x1="1143" y1="455" x2="1148" y2="455" stroke="#c084fc" strokeWidth="1" opacity=".4"/>

          {/* ── 2× FILTRO 5µm EN PARALELO — estilo vibratoria ── */}
          {/* FILTRO A: arriba del pipe principal (junction x=920, bottom=453, top=375) */}
          <line x1="920" y1={mYA} x2="920" y2="453" stroke="#3fb950" strokeWidth="1.5" opacity=".7" className="p-clean"/>
          <circle cx="920" cy={mYA} r="3" fill="#3fb950" opacity=".8"/>
          <text x="937" y={mYA-2} fill="#1f6feb50" fontSize="4.8" fontFamily="monospace">∥ PARALELO</text>
          {/* FILTRO A — arriba del pipe (bottom=453, top=375) */}
          <g className="eq-h eq-g d18" transform="translate(920,453)">
            <TT eq={eqLive.filtro5}/><SD eq={eqLive.filtro5} cx={22} cy={-76}/>
            <rect x="-22" y="-78" width="44" height="78" rx="3" fill={tG} stroke="#1f6feb60" strokeWidth="1.5" className="eq-b"/>
            <rect x="-20" y="-74" width="40" height="22" fill={wG} opacity=".3"/>
            {[-6,6].map(bx=>(<g key={bx}><rect x={bx-4} y="-48" width="8" height="46" rx="4" fill="#1a3050" stroke="#2a5070" strokeWidth="1"/><line x1={bx} y1="-46" x2={bx} y2="-4" stroke="#00c5e312" strokeWidth="6"/></g>))}
            <text y="12" textAnchor="middle" fill="#1f6feb" fontSize="5.5" fontWeight="700" fontFamily="monospace">5µm-A</text>
          </g>
          {/* FILTRO B — debajo del pipe (vibratoria real), top=485 bottom=563 */}
          {/* CAJA VERT movida a x=1060 → deja x=942-1032 libre para FILTRO B sin solapamiento */}
          <line x1="920" y1={mYA} x2="920" y2="485" stroke="#3fb950" strokeWidth="1.5" opacity=".7" className="p-clean"/>
          <g className="eq-h eq-g d18" transform="translate(920,563)">
            <TT eq={eqLive.filtro5}/><SD eq={eqLive.filtro5} cx={22} cy={-76}/>
            <rect x="-22" y="-78" width="44" height="78" rx="3" fill={tG} stroke="#1f6feb60" strokeWidth="1.5" className="eq-b"/>
            <rect x="-20" y="-74" width="40" height="22" fill={wG} opacity=".3"/>
            {[-6,6].map(bx=>(<g key={bx}><rect x={bx-4} y="-48" width="8" height="46" rx="4" fill="#1a3050" stroke="#2a5070" strokeWidth="1"/><line x1={bx} y1="-46" x2={bx} y2="-4" stroke="#00c5e312" strokeWidth="6"/></g>))}
            <text y="12" textAnchor="middle" fill="#1f6feb" fontSize="5.5" fontWeight="700" fontFamily="monospace">5µm-B</text>
          </g>

          {/* ── RO1 ETAPA 1 — tubos de presión (x=740, w=90, h=88, bottom=mYA) ── */}
          {/* top=392 — 19px bajo título y=373 ✓ (era x=755 h=110, top=370 cubría título) */}
          <g className="eq-h eq-g d19" transform={`translate(740,${mYA})`}>
            <ROStage eq={eqLive.ro1e1} svgLabel="RO1 E1" animDelayMultiplier={0.18}/>
          </g>

          {/* ── RO1 ETAPA 2 — tubos de presión (x=575, w=90, h=88, bottom=mYA) ── */}
          {/* top=392 — 19px bajo título y=373 ✓ (era x=590 h=110, top=370 cubría título) */}
          <g className="eq-h eq-g d19" transform={`translate(575,${mYA})`}>
            <ROStage eq={eqLive.ro1e2} svgLabel="RO1 E2" animDelayMultiplier={0.22}/>
          </g>

          {/* ── TK RECHAZO RO1 (x=530, bottom=mYB) — recibe AJ en center ── */}
          <g className="eq-h eq-g d22" transform={`translate(530,${mYB})`}>
            <TT eq={eqLive.tkRechazo}/><SD eq={eqLive.tkRechazo} cx={28} cy={-66}/>
            <rect x="-28" y="-68" width="56" height="68" rx="3" fill={tG} stroke="#f8514960" strokeWidth="1.5" className="eq-b"/>
            <rect x="-26" y="-52" width="52" height="50" fill={sG} opacity=".55"/>
            <Dh w={56} h={68} pct={0.68}/>
            <text y="12" textAnchor="middle" fill="#f85149" fontSize="5.5" fontWeight="700" fontFamily="monospace">TK RECH. RO1</text>
          </g>

          {/* ── FILTRO AK (x=630, bottom=mYB) ── */}
          <g className="eq-h eq-g" transform={`translate(630,${mYB})`}>
            <rect x="-18" y="-44" width="36" height="44" rx="3" fill="#0e1a18" stroke="#1f6feb50" strokeWidth="1.2" className="eq-b"/>
            {[-8,0,8].map(bx=>(<rect key={bx} x={bx-3} y="-38" width="6" height="36" rx="3" fill="#1a3050" stroke="#2a5070" strokeWidth="1"/>))}
            <text y="12" textAnchor="middle" fill="#1f6feb90" fontSize="5" fontFamily="monospace">FILTRO</text>
          </g>

          {/* ── RO2 — tubos de presión (x=745, w=90, bottom=mYB) ── */}
          <g className="eq-h eq-g d20" transform={`translate(745,${mYB})`}>
            <TT eq={eqLive.ro2}/><SD eq={eqLive.ro2} cx={46} cy={-108}/>
            <rect x="-45" y="-110" width="90" height="110" rx="4" fill="#140808" stroke="#f8514960" strokeWidth="2" className="eq-b"/>
            {[-94,-73,-52,-31,-10].map((ty,i)=>(
              <g key={ty} className="mem" style={{animationDelay:`${i*0.4}s`}}>
                <rect x="-40" y={ty} width="80" height="17" rx="8" fill="#1e1010" stroke="#5a2030" strokeWidth="1"/>
                <ellipse cx="-33" cy={ty+8.5} rx="5" ry="7.5" fill="#160808" stroke="#5a2030" strokeWidth="0.8"/>
                <ellipse cx="33"  cy={ty+8.5} rx="5" ry="7.5" fill="#160808" stroke="#5a2030" strokeWidth="0.8"/>
                <line x1="-28" y1={ty+8.5} x2="28" y2={ty+8.5} stroke="#f85149" strokeWidth="0.5" opacity=".35"/>
              </g>
            ))}
            <text y="12" textAnchor="middle" fill="#f85149" fontSize="7" fontWeight="700" fontFamily="monospace">RO2 ⚠</text>
          </g>

          {/* ── TK RECHAZO RO2 (x=850, bottom=mYB) — claro de FILTRO B en x=898-942 ── */}
          <g className="eq-h eq-g d22" transform={`translate(850,${mYB})`}>
            <TT eq={eqLive.tkRechazoRO2}/><SD eq={eqLive.tkRechazoRO2} cx={26} cy={-66}/>
            <rect x="-26" y="-68" width="52" height="68" rx="3" fill={tG} stroke="#f8514960" strokeWidth="1.5" className="eq-b"/>
            <rect x="-24" y="-52" width="48" height="50" fill={sG} opacity=".55"/>
            <Dh w={52} h={68} pct={0.55}/>
            <text y="12" textAnchor="middle" fill="#f85149" fontSize="5.5" fontWeight="700" fontFamily="monospace">TK RECH. RO2</text>
          </g>

          {/* ── CAJA VERTIMIENTO (x=1060, bottom=mYB) — desplazada derecha, claro para FILTRO B ── */}
          <g className="eq-h eq-g d22" transform={`translate(1060,${mYB})`}>
            <TT eq={eqLive.cajaVert}/><SD eq={eqLive.cajaVert} cx={28} cy={-66}/>
            <rect x="-28" y="-68" width="56" height="68" rx="4" fill="#1e0808" stroke="#f8514980" strokeWidth="1.5" className="eq-b"/>
            <rect x="-26" y="-52" width="52" height="50" fill="#2e1010" opacity=".7"/>
            <text y="12" textAnchor="middle" fill="#f85149" fontSize="6" fontWeight="700" fontFamily="monospace">CAJA VERT.</text>
            <text x="0" y="-20" textAnchor="middle" fill="#f8514960" fontSize="5" fontFamily="monospace">→ AT</text>
          </g>

          {/* ── TK RECIRCULACIÓN — x=200 (movido a la izquierda) ── */}
          <g className="eq-h eq-g d21" transform={`translate(200,${mYB})`}>
            <TT eq={eqLive.tkRecir}/><SD eq={eqLive.tkRecir} cx={40} cy={-93}/>
            <rect x="-40" y="-95" width="80" height="95" rx="3" fill={tG} stroke="#3fb95060" strokeWidth="1.5" className="eq-b"/>
            <rect x="-38" y="-72" width="76" height="70" fill={wG} opacity=".48"/>
            <path d="M-38,-72 Q0,-75 38,-72 L38,-70 Q0,-73 -38,-70Z" fill="#00c5e3" opacity=".4"/>
            <Dh w={80} h={95} pct={0.75}/>
            <text x="0" y="-38" textAnchor="middle" fill="#3fb95055" fontSize="5.5" fontFamily="monospace">AQ · AR · AS</text>
            <text y="12" textAnchor="middle" fill="#3fb950" fontSize="7" fontWeight="700" fontFamily="monospace">TK RECIR.</text>
          </g>

          {/* ── PRODUCCIÓN / REÚSO — superior izquierda zona TERCIARIA (x=65, top=362) ── */}
          <g className="eq-h eq-g d22" transform="translate(65,450)">
            <TT eq={eqLive.produccion}/>
            <rect x="-50" y="-88" width="100" height="88" rx="5" fill="#071a10" stroke="#3fb95060" strokeWidth="2" className="eq-b"/>
            <text x="0" y="-60" textAnchor="middle" fill="#3fb950" fontSize="10" fontWeight="800" fontFamily="monospace">REÚSO</text>
            <path d="M-18,-44 L-28,-30 L-18,-26 L-18,-4 L18,-4 L18,-26 L28,-30 L18,-44 L10,-39 Q0,-35 -10,-39Z"
              fill="#3fb95030" stroke="#3fb95070" strokeWidth="1.5"/>
            <text x="0" y="8" textAnchor="middle" fill="#3fb950a0" fontSize="6.5" fontFamily="monospace">PRODUCCIÓN</text>
          </g>

          {/* ── RECIR→PROD: sale izq TK RECIR (160,560) → sube a PROD bottom (65,450) ── */}
          <line x1="160" y1="560" x2="65" y2="560" stroke="#3fb950" strokeWidth="2" opacity=".8" className="p-clean"/>
          <line x1="65" y1="560" x2="65" y2="450" stroke="#3fb950" strokeWidth="2" opacity=".8" className="p-clean"/>
          <circle cx="65" cy="560" r="2.5" fill="#3fb950" opacity=".8"/>
          <polygon points="61,454 65,446 69,454" fill="#3fb950" opacity=".9"/>

          {/* ── Reject row pipes (y=mYB, FLOW left→right) ── */}
          {/* TK RECH RO1(530)→FILTRO AK(630) */}
          <line x1="558" y1={mYB} x2="612" y2={mYB} stroke="#f85149" strokeWidth="2" opacity=".55" className="p-reject"/>
          <text x="585" y={mYB-5} textAnchor="middle" fill="#f8514965" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AK</text>
          {/* FILTRO AK(630)→RO2(745) */}
          <line x1="648" y1={mYB} x2="700" y2={mYB} stroke="#f85149" strokeWidth="2" opacity=".55" className="p-reject"/>
          {/* RO2(745)→TK RECH RO2(850) */}
          <line x1="790" y1={mYB} x2="824" y2={mYB} stroke="#f85149" strokeWidth="2" opacity=".55" className="p-reject"/>
          {/* TK RECH RO2(850)→CAJA VERT(1060): 876→1032 — FILTRO B ocupa x=898-942 en capa superior */}
          <line x1="876" y1={mYB} x2="1032" y2={mYB} stroke="#f85149" strokeWidth="2" opacity=".55" className="p-reject"/>

          {/* ── AT: CAJA VERT(1060) → VERTIMIENTO ── */}
          <line x1="1088" y1={mYB} x2="1190" y2={mYB} stroke="#f85149" strokeWidth="1.8" opacity=".5" strokeDasharray="5 4" className="p-reject"/>
          <polygon points={`1186,${mYB-4} 1194,${mYB} 1186,${mYB+4}`} fill="#f85149" opacity=".6"/>
          <text x="1139" y={mYB-5} textAnchor="middle" fill="#f8514950" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AT → VERT.</text>

          {/* ── Overflow bypass: TK RECH RO1 → CAJA VERT ── */}
          <path d={`M530,${mYB} C530,${mYB+44} 1060,${mYB+44} 1060,${mYB}`}
            fill="none" stroke="#92400e" strokeWidth="1.5" opacity=".5" strokeDasharray="5 3"/>
          <text x="795" y={mYB+49} textAnchor="middle" fill="#92400e70" fontSize="5" fontStyle="italic" fontFamily="monospace">overflow → CAJA VERT.</text>

          {/* ── Leyenda ── */}
          <g transform="translate(12,682)">
            <text fill="#2a4050" fontSize="7" fontWeight="700" letterSpacing="2" fontFamily="monospace">CONV.:</text>
            {[
              {x:50,  c:'#00c5e3', d:'9 7', l:'AGUA RESIDUAL'},
              {x:185, c:'#3fb950', d:'9 7', l:'AGUA TRATADA'},
              {x:315, c:'#5a3a10', d:'7 5', l:'LODOS'},
              {x:400, c:'#d29922', d:'4 5', l:'QUÍMICOS'},
              {x:486, c:'#8b5cf6', d:'6 6', l:'RECIRCULACIÓN'},
              {x:600, c:'#f85149', d:'5 5', l:'RECHAZO'},
            ].map(l=>(
              <g key={l.l}>
                <line x1={l.x} y1="-3" x2={l.x+28} y2="-3" stroke={l.c} strokeWidth="2.5" strokeDasharray={l.d}/>
                <text x={l.x+32} y="1" fill="#8b949e" fontSize="7" fontFamily="monospace">{l.l}</text>
              </g>
            ))}
            {[
              {x:800, c:'#3fb950', l:'EN OPERACIÓN'},
              {x:900, c:'#d29922', l:'ADVERTENCIA'},
              {x:990, c:'#f85149', l:'ALARMA'},
            ].map(s=>(
              <g key={s.l}>
                <circle cx={s.x} cy="-3" r="4" fill={s.c}/>
                <text x={s.x+8} y="1" fill="#8b949e" fontSize="7" fontFamily="monospace">{s.l}</text>
              </g>
            ))}
          </g>

    </>
  ), [eqLive]);

  return (
    <div className="splash-page">

      <div className="splash-bg-grid"/><div className="splash-bg-glow"/>
      <div className="splash-inner">

        {/* Header */}
        <div className="splash-hdr">
          <svg className="s-logo" width="46" height="46" viewBox="0 0 50 50" fill="none">
            <circle cx="25" cy="25" r="24" stroke="#00c5e3" strokeWidth="1.5"/>
            <path d="M10 29c4.5-12 10-15 15-15s10.5 3 15 15" stroke="#00c5e3" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M25 14v10" stroke="#00c5e3" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="25" cy="30" r="4" fill="#00c5e3"/>
          </svg>
          <div className="s-tg">
            <h1 className="s-title">PTAR <span>PERMODA</span></h1>
            <p className="s-sub">PLANTA DE TRATAMIENTO DE AGUAS RESIDUALES INDUSTRIALES · SISTEMA DE GESTIÓN INTEGRADO</p>
          </div>
        </div>

        {/* Diagram */}
        <div className="splash-wrap">
        <svg className="splash-svg" viewBox="0 0 1800 700" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Diagrama del proceso PTAR PERMODA">
          {svgBody}
        </svg>
        </div>

        {/* Footer */}
        <div className="splash-foot">
          <button className="s-btn" onClick={() => navigate('/login')}>Ingresar al Sistema</button>
          <p className="s-ver">PTAR PERMODA · Sistema de Gestión v1.0 · {new Date().getFullYear()}</p>
        </div>
      </div>

      {/* Phase Zoom Modal */}
      {activePhase && (
        <PhaseModal
          phase={PHASES.find(p => p.key === activePhase)!}
          phaseIdx={PHASES.findIndex(p => p.key === activePhase)}
          totalPhases={PHASES.length}
          closing={closing}
          onClose={closeModal}
          onNavigate={goPhase}
          svgBody={svgBody}
        />
      )}
    </div>
  );
}
