// Pantalla principal del diagrama de flujo del proceso PTAR PERMODA

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../state/ThemeContext';
import type { EqDef } from './equipment';
import { EQ, SC, SB, SL } from './equipment';
import { useEquipmentStatus } from './hooks/useEquipmentStatus';
import { PhaseModal } from './PhaseModal';
import { EquipmentModal } from './EquipmentModal';
// @ts-ignore — C palette imported for upcoming inline-color refactor (noUnusedLocals bypass)
import { C } from './colors'; // eslint-disable-line @typescript-eslint/no-unused-vars

// Tooltip flotante SVG que muestra label, estado y parámetros de un equipo
function TT({ eq, anchor='center', flipY=false }:
  { eq:EqDef; anchor?:'center'|'left'|'right'; flipY?: boolean }) {
  const { isDark } = useTheme();
  const c=SC[eq.status], bg=SB[eq.status], W=230, H=134;
  const xOff = anchor==='left'?8 : anchor==='right'?-W-8 : -W/2;
  const y0 = flipY ? 20 : -230;
  const ttBg  = isDark ? '#0b1520' : '#FFFFFF';
  const ttKey = isDark ? '#8b949e' : '#4A6070';
  const ttVal = isDark ? '#e6edf3' : '#1C3A4E';
  return (
    <g className="eq-tt">
      <rect x={xOff-3} y={y0-3} width={W+6} height={H+6} rx="10" fill="rgba(0,0,0,.7)"/>
      <rect x={xOff} y={y0} width={W} height={H} rx="8" fill={ttBg} stroke={c} strokeWidth="1.5"/>
      <rect x={xOff} y={y0} width={W} height={30} rx="8" fill={bg}/>
      <rect x={xOff} y={y0+24} width={W} height={6} fill={bg}/>
      <text x={xOff+W/2} y={y0+20} textAnchor="middle" fill={c} fontSize="13" fontWeight="700" fontFamily="monospace">{eq.label}</text>
      <text x={xOff+W/2} y={y0+44} textAnchor="middle" fill={c} fontSize="11" fontFamily="monospace">{SL[eq.status]}</text>
      {eq.params.map(([k,v],i)=>(
        <text key={k} x={xOff+W/2} y={y0+63+i*22} textAnchor="middle" fill={ttKey} fontSize="11" fontFamily="monospace">
          {k}: <tspan fill={ttVal}>{v}</tspan>
        </text>
      ))}
      <polygon points={`${xOff+W/2-6},${y0+H} ${xOff+W/2+6},${y0+H} ${xOff+W/2},${y0+H+8}`} fill={ttBg} stroke={c} strokeWidth="1"/>
    </g>
  );
}

// Indicador de estado del equipo: punto pulsante en alarma/advertencia
function SD({ eq, cx, cy }: { eq:EqDef; cx:number; cy:number }) {
  const c=SC[eq.status], pulse=eq.status!=='operando';
  return <>
    {pulse && <circle cx={cx} cy={cy} r="8" fill={c} opacity=".2" className="s-ring"/>}
    <circle cx={cx} cy={cy} r="4.5" fill={c} stroke="#080f18" strokeWidth="1.5" className={pulse?'s-pulse':''}/>
  </>;
}

// Etiqueta de fase en la franja superior del diagrama
function PhaseLabel({ x, w, label, color }: { x:number; w:number; label:string; color:string }) {
  return <text x={x+w/2} y="30" textAnchor="middle" fill={color} fontSize="12" fontWeight="700" letterSpacing="3" fontFamily="monospace">{label}</text>;
}

/* small arrow label on a pipe */
// Etiqueta de tubería sobre la línea de flujo
function PL({ x, y, label, color='#2a6a7a' }: { x:number; y:number; label:string; color?:string }) {
  return <text x={x} y={y} textAnchor="middle" fill={color} fontSize="7" fontStyle="italic" fontFamily="monospace">{label}</text>;
}



// Definición de las 4 fases del proceso con color y viewBox para el zoom
const PHASES = [
  { key: 'preliminar', label: 'Fase Preliminar',                  color: '#00c5e3', vb: '0 26 498 335'     },
  { key: 'primaria',   label: 'Fase Primaria',                    color: '#d29922', vb: '498 26 1292 335'  },
  { key: 'secundaria', label: 'Fase Secundaria',                  color: '#3fb950', vb: '1175 345 625 333' },
  { key: 'terciaria',  label: 'Fase Terciaria · Recirculación',  color: '#1f6feb', vb: '0 345 1185 333'   },
] as const;
type PhaseKey = typeof PHASES[number]['key'];

// Constantes de posición Y para las tuberías principales de la fase terciaria
const mYA = 505;
const mYB = 615;
const wG = 'url(#waterG)', sG = 'url(#sludgeG)';

// Tanque SVG con llenado de agua y marcador de nivel diferencial
const Tk = ({ w, h, fill = wG, border = '#2a5a70', wp = 0.63 }:
  { w: number; h: number; fill?: string; border?: string; wp?: number }) => {
  const { isDark } = useTheme();
  const bodyG = isDark ? 'url(#tankG)' : 'url(#tankGL)';
  const wh = Math.round(h * wp);
  return <>
    <rect x={-w / 2} y={-h} width={w} height={h} rx="3" fill={bodyG} stroke={border} strokeWidth="1.5" className="eq-b" />
    <rect x={-w / 2 + 2} y={-wh} width={w - 4} height={wh - 2} fill={fill} opacity=".55" />
    <path d={`M${-w / 2 + 2},${-wh} Q0,${-wh - 3} ${w / 2 - 2},${-wh} L${w / 2 - 2},${-wh + 4} Q0,${-wh + 1} ${-w / 2 + 2},${-wh + 4}Z`}
      fill="#00c5e3" opacity=".35" />
  </>;
};

// Indicador de diferencial de nivel Δh en el costado del tanque
const Dh = ({ w, h, pct = 0.63 }: { w: number; h: number; pct?: number }) => {
  const ly = -Math.round(h * pct);
  return <>
    <line x1={w / 2} y1={ly} x2={w / 2 + 8} y2={ly} stroke="#3fb950" strokeWidth="1" strokeDasharray="4 3" opacity=".8" />
    <line x1={w / 2 + 8} y1={-h} x2={w / 2 + 8} y2={ly} stroke="#3fb950" strokeWidth="1" opacity=".6" />
    <polygon points={`${w / 2 + 4},${ly + 4} ${w / 2 + 8},${ly - 2} ${w / 2 + 12},${ly + 4}`} fill="#3fb950" opacity=".7" />
    <text x={w / 2 + 14} y={ly + 3} fill="#3fb950" fontSize="6.5" fontFamily="monospace">Δh</text>
  </>;
};

// Criba vibratoria circular con motor superior y descarga de finos lateral
function VibratoriaStage({ eq, motorLabel, svgLabel, showFinosLabel = false }:
  { eq: EqDef; motorLabel: string; svgLabel: string; showFinosLabel?: boolean }) {
  const { isDark } = useTheme();
  const innerDrum = isDark ? '#0f2535' : '#b0c8e4';
  const ltG = isDark ? 'url(#tankG)' : 'url(#tankGL)';
  return <>
    <SD eq={eq} cx={24} cy={-88}/>
    <circle cx="0" cy="-42" r="38" fill={ltG} stroke="#2a5a70" strokeWidth="1.5" className="eq-b"/>
    <circle cx="0" cy="-88" r="5.5" fill="#1a3040" stroke="#2a5a70" strokeWidth="1"/>
    <text x="0" y="-85" textAnchor="middle" fill="#4a8aaa" fontSize="5" fontWeight="700">{motorLabel}</text>
    <line x1="0" y1="-83" x2="0" y2="-76" stroke="#2a5a70" strokeWidth="1.2"/>
    <g className="vibrato">
      <circle cx="0" cy="-62" r="17" fill={innerDrum} stroke="#00c5e350" strokeWidth="1"/>
      {[-10,-3,4,11].map(bx=><line key={bx} x1={bx} y1="-74" x2={bx} y2="-50" stroke="#00c5e325" strokeWidth="1.2"/>)}
      {[-72,-66,-60,-54].map(by=><line key={by} x1="-15" y1={by} x2="15" y2={by} stroke="#00c5e318" strokeWidth="1"/>)}
    </g>
    <path d="M-32,-22 Q0,-17 32,-22 L32,4 L-32,4 Z" fill={wG} opacity=".4"/>
    <path d="M38,-48 L48,-41 L48,-30 L38,-30" fill="#0d2030" stroke="#2a5a70" strokeWidth="1"/>
    <text y="12" textAnchor="middle" fill="#d29922" fontSize="9" fontWeight="700" fontFamily="monospace">{svgLabel}</text>
    {eq.cost && <text y="22" textAnchor="middle" fill={isDark ? '#7ec8c8' : '#0a6a7a'} fontSize="9" fontFamily="monospace" className="eq-cost-float">{eq.cost}</text>}
    {showFinosLabel && <text x="-34" y="-88" fill="#5a4018" fontSize="5.5" fontFamily="monospace">← RES. FINOS</text>}
  </>;
}

// Tanque MBR con módulos de membrana animados y etiqueta de costo
function MBRTank({ eq, svgLabel, borderColor, labelColor, innerStroke, waterOpacity = '.45', animDelay }:
  { eq: EqDef; svgLabel: string; borderColor: string; labelColor: string; innerStroke: string; waterOpacity?: string; animDelay?: string }) {
  const { isDark } = useTheme();
  const ltG = isDark ? 'url(#tankG)' : 'url(#tankGL)';
  const memFill = isDark ? '#1a3550' : '#a8c0d8';
  return <>
    <SD eq={eq} cx={32} cy={-82}/>
    <rect x="-32" y="-82" width="64" height="82" rx="3" fill={ltG} stroke={borderColor} strokeWidth="1.5" className="eq-b"/>
    <rect x="-30" y="-55" width="60" height="53" fill={wG} opacity={waterOpacity}/>
    {[-24,-8,8,24].map(bx=>(
      <g key={bx} className="mem" style={animDelay ? {animationDelay: animDelay} : undefined}>
        <rect x={bx-6} y="-52" width="12" height="48" rx="2" fill={memFill} stroke={innerStroke} strokeWidth="1"/>
      </g>
    ))}
    <text y="13" textAnchor="middle" fill={labelColor} fontSize="9" fontWeight="700" fontFamily="monospace">{svgLabel}</text>
    {eq.cost && <text y="23" textAnchor="middle" fill={isDark ? '#7ec8c8' : '#0a6a7a'} fontSize="9" fontFamily="monospace" className="eq-cost-float">{eq.cost}</text>}
  </>;
}

// Módulos de ósmosis inversa en formato compacto o estándar con tubos de presión
function ROStage({ eq, svgLabel, animDelayMultiplier, compact = false }:
  { eq: EqDef; svgLabel: string; animDelayMultiplier: number; compact?: boolean }) {
  const { isDark } = useTheme();
  const roBody   = isDark ? '#081420' : '#c0d4ec';
  const roTube   = isDark ? '#0c1d30' : '#aac0e0';
  const roStroke = isDark ? '#1f6feb60' : '#1f6febb0';
  const h    = compact ? 88  : 110;
  const cy   = compact ? -86 : -108;
  const tubes = compact ? [-72,-51,-30,-9] : [-94,-73,-52,-31,-10];
  return <>
    <SD eq={eq} cx={46} cy={cy}/>
    <rect x="-45" y={-h} width="90" height={h} rx="4" fill={roBody} stroke={roStroke} strokeWidth="1.5" className="eq-b"/>
    {tubes.map((ty,i)=>(
      <g key={ty} className="mem" style={{animationDelay:`${i*animDelayMultiplier}s`}}>
        <rect x="-40" y={ty} width="80" height="17" rx="8" fill={roTube} stroke="#1b4a72" strokeWidth="1"/>
        <ellipse cx="-33" cy={ty+8.5} rx="5" ry="7.5" fill="#091525" stroke="#1b4a72" strokeWidth="0.8"/>
        <ellipse cx="33"  cy={ty+8.5} rx="5" ry="7.5" fill="#091525" stroke="#1b4a72" strokeWidth="0.8"/>
        <line x1="-28" y1={ty+8.5} x2="28" y2={ty+8.5} stroke="#3b82f6" strokeWidth="0.5" opacity=".4"/>
        <line x1="-28" y1={ty+5}   x2="28" y2={ty+5}   stroke="#3b82f6" strokeWidth="0.3" opacity=".2"/>
        <line x1="-28" y1={ty+12}  x2="28" y2={ty+12}  stroke="#3b82f6" strokeWidth="0.3" opacity=".2"/>
      </g>
    ))}
    <text y="12" textAnchor="middle" fill="#1f6feb" fontSize="9" fontWeight="700" fontFamily="monospace">{svgLabel}</text>
    {eq.cost && <text y="22" textAnchor="middle" fill={isDark ? '#7ec8c8' : '#0a6a7a'} fontSize="9" fontFamily="monospace" className="eq-cost-float">{eq.cost}</text>}
  </>;
}

export default function SplashScreen() {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  // Estado de la fase activa en el modal de zoom
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
  // Navega cíclicamente entre fases con teclado o botones laterales
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

  // ── Equipment Detail Modal state ──────────────────────────────────
  // Estado del modal de detalle de equipo
  const [activeEquip, setActiveEquip]   = useState<string | null>(null);
  const [equipClosing, setEquipClosing] = useState(false);
  const equipTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Ref estable para usar en el useMemo de svgBody sin añadirlo a deps
  const openEquipRef = useRef<(key: string) => void>(() => {});

  const openEquip = (key: string) => {
    if (equipClosing || activePhase) return;  // no abrir si hay otro modal
    setActiveEquip(key);
  };
  const closeEquip = () => {
    if (equipTimerRef.current) clearTimeout(equipTimerRef.current);
    setEquipClosing(true);
    equipTimerRef.current = setTimeout(() => { setActiveEquip(null); setEquipClosing(false); }, 200);
  };
  openEquipRef.current = openEquip;

  // ── Tooltip overlay state ─────────────────────────────────────────
  type TTState = { eq: EqDef; x: number; y: number; anchor?: 'center'|'left'|'right'; flipY?: boolean };
  // Tooltip activo: equipo + posición SVG
  const [tt, setTt] = useState<TTState|null>(null);
  const hideTt = useCallback(() => setTt(null), []);

  // Listener de teclado para cerrar modales y navegar fases
  useEffect(() => {
    const anyOpen = modalOpen || !!activeEquip;
    if (!anyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activePhase) closeModal();
        else if (activeEquip) closeEquip();
      }
      if (e.key === 'ArrowRight' && activePhase) goPhase(1);
      if (e.key === 'ArrowLeft'  && activePhase) goPhase(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, activeEquip, activePhase]);

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

  // ── Tooltip overlay — rendered last in SVG so it's always on top ──
  // Overlay del tooltip renderizado al final del SVG para quedar siempre encima
  const tooltipOverlay = tt ? (
    <g transform={`translate(${tt.x},${tt.y})`} style={{pointerEvents:'none'}}>
      <TT eq={tt.eq} anchor={tt.anchor} flipY={tt.flipY}/>
    </g>
  ) : null;

  // Cuerpo SVG completo del diagrama de proceso — memoizado para evitar rerenders
  const svgBody = useMemo(() => {
    const cLegendText = isDark ? '#b0c4d0' : '#2D4A5E';
    const cCostLabel  = isDark ? '#7ec8c8' : '#0a6a7a';
    const cShadowPipe = isDark ? '#0c2233' : 'transparent';
    const cIonicLabel = isDark ? '#c084fc' : '#7c3aed';
    const cCyanText   = isDark ? '#00c5e3' : '#006d84';
    const cPhasePreli = isDark ? '#3ab8cc' : '#0a6b7a';
    const tG         = isDark ? 'url(#tankG)' : 'url(#tankGL)';
    const cDrumFill  = isDark ? '#071520' : '#b0c8e4';
    const cRo2Body   = isDark ? '#140808' : '#e8c0c0';
    const cFiltAK    = isDark ? '#0e1a18' : '#b8d4ce';
    const cIonicBody = isDark ? '#120a18' : '#d4c0e8';
    const cCajaVert  = isDark ? '#1e0808' : '#e8c0c0';
    const cProdBody  = isDark ? '#071a10' : '#b8d8c0';
    const cStrkGreen60 = isDark ? '#3fb95060' : '#3fb950b0';
    const cStrkAmber60 = isDark ? '#d2992260' : '#d29922b0';
    const cStrkBlue60  = isDark ? '#1f6feb60' : '#1f6febb0';
    const cStrkBlue50  = isDark ? '#1f6feb50' : '#1f6febb0';
    const cStrkRed60   = isDark ? '#f8514960' : '#f85149c0';
    const cStrkPurp60  = isDark ? '#8b5cf660' : '#8b5cf6b0';
    const cStrkIonic60 = isDark ? '#c084fc60' : '#c084fcb0';
    const cStrkRed80   = isDark ? '#f8514980' : '#f85149d0';
    return (
    <>
          <defs>
            <linearGradient id="tankG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a3d54"/><stop offset="100%" stopColor="#0b2233"/>
            </linearGradient>
            <linearGradient id="tankGL" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4e6f8"/><stop offset="100%" stopColor="#bcd4ee"/>
            </linearGradient>
            <linearGradient id="waterG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00c5e3" stopOpacity=".8"/>
              <stop offset="100%" stopColor="#004a90" stopOpacity=".9"/>
            </linearGradient>
            <linearGradient id="sludgeG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6b4a18"/><stop offset="100%" stopColor="#2c1c08"/>
            </linearGradient>
            {/* Gradiente radial de fondo — modo oscuro */}
            <radialGradient id="bgG" cx="50%" cy="46%" r="72%" fx="50%" fy="40%">
              <stop offset="0%"   stopColor="#0f2035"/>
              <stop offset="60%"  stopColor="#091628"/>
              <stop offset="100%" stopColor="#04090f"/>
            </radialGradient>
            {/* Gradiente radial de fondo — modo claro */}
            <radialGradient id="bgGL" cx="50%" cy="46%" r="72%">
              <stop offset="0%"   stopColor="#f0f6ff"/>
              <stop offset="100%" stopColor="#dde8f4"/>
            </radialGradient>
            {/* Brillo + bloom: los elementos con color saturado emiten un halo */}
            <filter id="fBright" x="-5%" y="-5%" width="110%" height="110%">
              <feComponentTransfer result="bright">
                <feFuncR type="linear" slope="1.22"/>
                <feFuncG type="linear" slope="1.22"/>
                <feFuncB type="linear" slope="1.22"/>
              </feComponentTransfer>
              <feGaussianBlur in="bright" stdDeviation="2" result="bloom"/>
              <feBlend in="bright" in2="bloom" mode="screen" result="bloomed"/>
              <feComponentTransfer in="bloomed">
                <feFuncR type="linear" slope="1.06" intercept="-0.03"/>
                <feFuncG type="linear" slope="1.06" intercept="-0.03"/>
                <feFuncB type="linear" slope="1.06" intercept="-0.03"/>
              </feComponentTransfer>
            </filter>
          </defs>

          <g filter="url(#fBright)">
          <rect width="1800" height="700" fill={isDark ? "url(#bgG)" : "url(#bgGL)"}/>

          {/* ── Fila superior: PRELIMINAR (ampliada) + PRIMARIA ── */}
          <rect x="10"  y="36" width="488"  height="315" rx="6" fill="#00c5e3" fillOpacity=".055" stroke="#00c5e3" strokeOpacity=".28"  strokeWidth="1.2"/>
          <rect x="498" y="36" width="1292" height="315" rx="6" fill="#d29922" fillOpacity=".045" stroke="#d29922" strokeOpacity=".28"  strokeWidth="1.2"/>

          <PhaseLabel x={10}   w={488}  label="FASE PRELIMINAR" color={cPhasePreli}/>
          <PhaseLabel x={498}  w={1292} label="FASE PRIMARIA"   color="#d29922"/>

          {/* ── Fila inferior: TERCIARIA (izq) + SECUNDARIA (der) ── */}
          <rect x="10"   y="355" width="1170" height="313" rx="6" fill="#1f6feb" fillOpacity=".045" stroke="#1f6feb" strokeOpacity=".22" strokeWidth="1.2"/>
          <rect x="1185" y="355" width="605"  height="313" rx="6" fill="#3fb950" fillOpacity=".045" stroke="#3fb950" strokeOpacity=".22" strokeWidth="1.2"/>
          <line x1="1182" y1="355" x2="1182" y2="668" stroke="#ffffff" strokeWidth="1.5" opacity=".35"/>
          <text x="590"  y="375" textAnchor="middle" fill="#1f6feb" fontSize="12" fontWeight="700" letterSpacing="3" fontFamily="monospace">FASE TERCIARIA · RECIRCULACIÓN</text>
          <text x="1487" y="375" textAnchor="middle" fill="#3fb950" fontSize="12" fontWeight="700" letterSpacing="3" fontFamily="monospace">FASE SECUNDARIA</text>
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


          {/* ══════════════ FASE PRELIMINAR ══════════════
              Columna 1 (x=18–112): etiquetas fuentes
              Columna 2 (x=163–217): TK2, TK30, TK15
              Columna 3 (x=343–407): TK60 — buffer principal
          ══════════════════════════════════════════════ */}

          {/* ── Etiquetas de fuentes (w=94, h=22) ── */}
          <g className="eq-h eq-g d1" onDoubleClick={()=>openEquipRef.current('rotativa')} onMouseEnter={()=>setTt({eq:eqLive.rotativa,x:18,y:81,anchor:'left',flipY:true})} onMouseLeave={hideTt}>
            <rect x="18" y="70" width="94" height="22" rx="3" fill={cDrumFill} stroke="#00c5e3" strokeWidth="1.2" className="eq-b"/>
            <text x="65" y="85" textAnchor="middle" fill="#00c5e3" fontSize="7.5" fontWeight="600" fontFamily="monospace">D. ROTATIVA</text>
            {eqLive.rotativa.cost && <text x="112" y="66" textAnchor="end" fill={cCostLabel} fontSize="8" fontFamily="monospace" className="eq-cost-float">{eqLive.rotativa.cost}</text>}
          </g>
          <g className="eq-h eq-g d2" onDoubleClick={()=>openEquipRef.current('funza')} onMouseEnter={()=>setTt({eq:eqLive.funza,x:18,y:115,anchor:'left',flipY:true})} onMouseLeave={hideTt}>
            <rect x="18" y="104" width="94" height="22" rx="3" fill={cDrumFill} stroke="#8b5cf6" strokeWidth="1.2" className="eq-b"/>
            <SD eq={eqLive.funza} cx={112} cy={115}/>
            <text x="65" y="119" textAnchor="middle" fill="#8b5cf6" fontSize="7.5" fontWeight="600" fontFamily="monospace">D. FUNZA</text>
            {eqLive.funza.cost && <text x="112" y="100" textAnchor="end" fill={cCostLabel} fontSize="8" fontFamily="monospace" className="eq-cost-float">{eqLive.funza.cost}</text>}
          </g>
          <g className="eq-h eq-g d3" onDoubleClick={()=>openEquipRef.current('tintoreria')} onMouseEnter={()=>setTt({eq:eqLive.tintoreria,x:18,y:193,anchor:'left',flipY:true})} onMouseLeave={hideTt}>
            <rect x="18" y="182" width="94" height="22" rx="3" fill={cDrumFill} stroke="#f85149" strokeWidth="1.2" className="eq-b"/>
            <text x="65" y="197" textAnchor="middle" fill="#f85149" fontSize="7.5" fontWeight="600" fontFamily="monospace">D. TINTORERÍA</text>
            {eqLive.tintoreria.cost && <text x="112" y="178" textAnchor="end" fill={cCostLabel} fontSize="8" fontFamily="monospace" className="eq-cost-float">{eqLive.tintoreria.cost}</text>}
          </g>
          <g className="eq-h eq-g d4" onDoubleClick={()=>openEquipRef.current('lavanderia')} onMouseEnter={()=>setTt({eq:eqLive.lavanderia,x:18,y:227,anchor:'left',flipY:true})} onMouseLeave={hideTt}>
            <rect x="18" y="216" width="94" height="22" rx="3" fill={cDrumFill} stroke="#d29922" strokeWidth="1.2" className="eq-b"/>
            <text x="65" y="231" textAnchor="middle" fill="#d29922" fontSize="7.5" fontWeight="600" fontFamily="monospace">D. LAVANDERÍA</text>
            {eqLive.lavanderia.cost && <text x="112" y="212" textAnchor="end" fill={cCostLabel} fontSize="8" fontFamily="monospace" className="eq-cost-float">{eqLive.lavanderia.cost}</text>}
          </g>
          <g className="eq-h eq-g d5" onDoubleClick={()=>openEquipRef.current('tk15m3')} onMouseEnter={()=>setTt({eq:eqLive.tk15m3,x:18,y:299,anchor:'left'})} onMouseLeave={hideTt}>
            <rect x="18" y="288" width="94" height="22" rx="3" fill={cDrumFill} stroke="#d29922" strokeWidth="1" strokeDasharray="4 2" className="eq-b"/>
            <text x="65" y="303" textAnchor="middle" fill="#d2992290" fontSize="7.5" fontWeight="600" fontFamily="monospace">LAV. REMOTA</text>
            {eqLive.tk15m3.cost && <text x="112" y="284" textAnchor="end" fill={cCostLabel} fontSize="8" fontFamily="monospace" className="eq-cost-float">{eqLive.tk15m3.cost}</text>}
          </g>

          {/* ── Flechas de entrada A-E ── */}
          {/* A: D.ROTATIVA → TK 2m³ */}
          <line x1="112" y1="81" x2="177" y2="90" stroke="#00c5e3" strokeWidth="1.5" opacity=".8" className="p-raw"/>
          <PL x={140} y={81} label="A"/>
          {/* B: D.FUNZA → TK 2m³ */}
          <line x1="112" y1="115" x2="177" y2="90" stroke="#8b5cf6" strokeWidth="1.5" opacity=".8" className="p-raw"/>
          <PL x={140} y={112} label="B"/>
          {/* C: D.TINTORERÍA → TK 30m³ */}
          <line x1="112" y1="193" x2="163" y2="209" stroke="#f85149" strokeWidth="1.5" opacity=".8" className="p-raw"/>
          <PL x={133} y={196} label="C"/>
          {/* D: D.LAVANDERÍA → TK 30m³ */}
          <line x1="112" y1="227" x2="163" y2="209" stroke="#d29922" strokeWidth="1.5" opacity=".8" className="p-raw"/>
          <PL x={133} y={222} label="D"/>
          {/* E: LAV.REMOTA → TK 15m³ (dashed) */}
          <line x1="112" y1="299" x2="160" y2="299" stroke="#d29922" strokeWidth="1.5" opacity=".6" strokeDasharray="5 3"/>
          <polygon points="156,295 164,299 156,303" fill="#d29922" opacity=".6"/>
          <PL x={132} y={294} label="E"/>

          {/* ── TK 2m³ (recibe A y B) ── */}
          <g className="eq-h eq-g d6" transform="translate(190,112)" onDoubleClick={()=>openEquipRef.current('tk2m3')} onMouseEnter={()=>setTt({eq:eqLive.tk2m3,x:190,y:112,flipY:true})} onMouseLeave={hideTt}>
            <SD eq={eqLive.tk2m3} cx={13} cy={-43}/>
            <Tk w={26} h={45} wp={0.60}/>
            <text y="13" textAnchor="middle" fill={cCyanText} fontSize="7" fontWeight="700" fontFamily="monospace">TK 2 m³</text>
            {eqLive.tk2m3.cost && <text y="22" textAnchor="middle" fill={cCostLabel} fontSize="8" fontFamily="monospace" className="eq-cost-float">{eqLive.tk2m3.cost}</text>}
          </g>

          {/* ── TK 30m³ (recibe C, D, F) ── */}
          <g className="eq-h eq-g d7" transform="translate(190,238)" onDoubleClick={()=>openEquipRef.current('tk30m3')} onMouseEnter={()=>setTt({eq:eqLive.tk30m3,x:190,y:238})} onMouseLeave={hideTt}>
            <SD eq={eqLive.tk30m3} cx={26} cy={-58}/>
            <Tk w={54} h={58} wp={0.62}/>
            <text y="13" textAnchor="middle" fill={cCyanText} fontSize="9" fontWeight="700" fontFamily="monospace">TK 30 m³</text>
            {eqLive.tk30m3.cost && <text y="24" textAnchor="middle" fill={cCostLabel} fontSize="9" fontFamily="monospace" className="eq-cost-float">{eqLive.tk30m3.cost}</text>}
          </g>

          {/* ── TK 15m³ (recibe E, drena a TK30 por F) ── */}
          <g className="eq-h eq-g d8" transform="translate(190,322)" onDoubleClick={()=>openEquipRef.current('tk15m3')} onMouseEnter={()=>setTt({eq:eqLive.tk15m3,x:190,y:322})} onMouseLeave={hideTt}>
            <SD eq={eqLive.tk15m3} cx={20} cy={-42}/>
            <Tk w={44} h={42} wp={0.55}/>
            <text y="13" textAnchor="middle" fill={cCyanText} fontSize="8" fontWeight="700" fontFamily="monospace">TK 15 m³</text>
            {eqLive.tk15m3.cost && <text y="23" textAnchor="middle" fill={cCostLabel} fontSize="8" fontFamily="monospace" className="eq-cost-float">{eqLive.tk15m3.cost}</text>}
          </g>

          {/* F: TK15 → TK30 (vertical, drena hacia arriba) */}
          <line x1="190" y1="280" x2="190" y2="242" stroke="#d29922" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <polygon points="186,244 190,236 194,244" fill="#d29922" opacity=".8"/>
          <PL x={197} y={262} label="F"/>

          {/* G: TK2m³ → unión central */}
          <line x1="203" y1="90" x2="265" y2="90" stroke="#00c5e3" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <line x1="265" y1="90" x2="265" y2="215" stroke="#00c5e3" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <PL x={230} y={85} label="G"/>

          {/* H: TK30m³ → unión central */}
          <line x1="217" y1="215" x2="265" y2="215" stroke="#00c5e3" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <PL x={238} y={211} label="H"/>

          {/* Unión G+H → TK60 */}
          <circle cx="265" cy="215" r="3" fill="#00c5e3" opacity=".9"/>
          <text x="248" y="230" fill="#00c5e360" fontSize="6" fontFamily="monospace">G+H</text>
          <line x1="265" y1="215" x2="343" y2="215" stroke="#00c5e3" strokeWidth="2" opacity=".85" className="p-raw"/>

          {/* ── TK 60m³ — Tanque pulmón principal ── */}
          <g className="eq-h eq-g d9" transform="translate(375,265)" onDoubleClick={()=>openEquipRef.current('tk60m3')} onMouseEnter={()=>setTt({eq:eqLive.tk60m3,x:375,y:265})} onMouseLeave={hideTt}>
            <SD eq={eqLive.tk60m3} cx={28} cy={-112}/>
            <rect x="-32" y="-112" width="64" height="112" rx="3" fill={tG} stroke="#2a5a70" strokeWidth="1.5" className="eq-b"/>
            <rect x="-30" y="-78" width="60" height="76" fill={wG} opacity=".55"/>
            <path d="M-30,-78 Q0,-81 30,-78 L30,-76 Q0,-79 -30,-76Z" fill="#00c5e3" opacity=".4"/>
            <Dh w={64} h={112} pct={0.70}/>
            <text x="0" y="-70" textAnchor="middle" fill="#4a7a8a" fontSize="8" fontFamily="monospace">60 m³</text>
            <text y="14" textAnchor="middle" fill={cCyanText} fontSize="8.5" fontWeight="700" fontFamily="monospace">TK 60 m³</text>
            {eqLive.tk60m3.cost && <text y="25" textAnchor="middle" fill={cCostLabel} fontSize="8" fontFamily="monospace" className="eq-cost-float">{eqLive.tk60m3.cost}</text>}
          </g>

          {/* I: TK60 → CRIBA ROTATIVA */}
          <line x1="407" y1="215" x2="538" y2="215" stroke="#00c5e3" strokeWidth="2.5" opacity=".9" className="p-raw"/>
          <polygon points="530,211 538,215 530,219" fill="#00c5e3" opacity=".9"/>
          <PL x={472} y={210} label="I → J"/>

          {/* ══════════════ FASE PRIMARIA ══════════════
              Zona: x=498–1790 (1292px), y=36–351 (315px)
              Distribución vertical ampliada:
                VIBRAT1 subió a y=158, VIBRAT2 bajó a y=308
                TORRE subió a y=175, CÁRCAMO bajó a y=310
              Distribución horizontal extendida hacia la derecha:
                HOMOGEN→1280, GEM→1500, SWING→1700
          ══════════════════════════════════════════ */}

          {/* ── CRIBA ROTATIVA — anclada en x=498 ── */}
          <g className="eq-h eq-g d10" transform="translate(580,215)" onDoubleClick={()=>openEquipRef.current('cribRot')} onMouseEnter={()=>setTt({eq:eqLive.cribRot,x:580,y:215,flipY:true})} onMouseLeave={hideTt}>
            <SD eq={eqLive.cribRot} cx={28} cy={-82}/>
            <path d="M-42,0 L-42,-22 Q-42,-30 -36,-30 L36,-30 Q42,-30 42,-22 L42,0Z"
              fill={tG} stroke="#2a5a70" strokeWidth="1.5" className="eq-b"/>
            <circle cx="0" cy="-55" r="36" fill={cDrumFill} stroke="#2a5a70" strokeWidth="1.5" className="eq-bc"/>
            <g className="rot-drum">
              <circle cx="0" cy="-55" r="34" fill="none" stroke="#1a3555" strokeWidth="1.5"/>
              {[0,45,90,135,180,225,270,315].map(a=>{
                const r1=(a*Math.PI)/180;
                return <line key={a} x1={10*Math.cos(r1)} y1={-55+10*Math.sin(r1)} x2={31*Math.cos(r1)} y2={-55+31*Math.sin(r1)} stroke="#00c5e330" strokeWidth="1.5"/>;
              })}
              <circle cx="0" cy="-55" r="9" fill="#0f2030" stroke="#00c5e340" strokeWidth="1"/>
            </g>
            <path d="M-40,-14 Q0,-10 40,-14 L40,0 L-40,0Z" fill={wG} opacity=".45"/>
            <text y="16" textAnchor="middle" fill="#d29922" fontSize="9" fontWeight="700" fontFamily="monospace">CRIBA</text>
            <text y="26" textAnchor="middle" fill="#d29922" fontSize="9" fontWeight="700" fontFamily="monospace">ROTATIVA</text>
            {eqLive.cribRot.cost && <text y="37" textAnchor="middle" fill={cCostLabel} fontSize="9" fontFamily="monospace" className="eq-cost-float">{eqLive.cribRot.cost}</text>}
            <text x="42" y="-78" fill="#5a4018" fontSize="6" fontFamily="monospace">→ RES. GRUESOS</text>
          </g>

          {/* K1: Criba → Vibratoria 1 (arriba, y=116) */}
          <line x1="580" y1="165" x2="580" y2="116" stroke="#d29922" strokeWidth="1.5" opacity=".7" className="p-raw"/>
          <line x1="580" y1="116" x2="747" y2="116" stroke="#d29922" strokeWidth="1.5" opacity=".7" className="p-raw"/>
          <PL x={664} y={111} label="K1" color="#8a6a2a"/>
          {/* K2: Criba → Vibratoria 2 (abajo, y=265) */}
          <line x1="580" y1="265" x2="747" y2="265" stroke="#d29922" strokeWidth="1.5" opacity=".7" className="p-raw"/>
          <PL x={664} y={280} label="K2" color="#8a6a2a"/>

          {/* ── VIBRATORIA 1 / M1 ── */}
          <g className="eq-h eq-g d11" transform="translate(785,158)" onDoubleClick={()=>openEquipRef.current('vibrat1')} onMouseEnter={()=>setTt({eq:eqLive.vibrat1,x:785,y:158,flipY:true})} onMouseLeave={hideTt}>
            <VibratoriaStage eq={eqLive.vibrat1} motorLabel="M1" svgLabel="VIBRAT. 1" showFinosLabel={true}/>
          </g>

          {/* ── VIBRATORIA 2 / M2 ── */}
          <g className="eq-h eq-g d12" transform="translate(785,308)" onDoubleClick={()=>openEquipRef.current('vibrat2')} onMouseEnter={()=>setTt({eq:eqLive.vibrat2,x:785,y:308})} onMouseLeave={hideTt}>
            <VibratoriaStage eq={eqLive.vibrat2} motorLabel="M2" svgLabel="VIBRAT. 2"/>
          </g>

          {/* N1: Vibrat1 right → junción */}
          <line x1="823" y1="116" x2="868" y2="116" stroke="#d29922" strokeWidth="1.5" opacity=".75" className="p-raw"/>
          <line x1="868" y1="116" x2="868" y2="215" stroke="#d29922" strokeWidth="1.5" opacity=".75" className="p-raw"/>
          <PL x={845} y={111} label="N1" color="#8a6a2a"/>
          {/* N2: Vibrat2 right → junción */}
          <line x1="823" y1="266" x2="868" y2="266" stroke="#d29922" strokeWidth="1.5" opacity=".75" className="p-raw"/>
          <line x1="868" y1="266" x2="868" y2="215" stroke="#d29922" strokeWidth="1.5" opacity=".75" className="p-raw"/>
          <PL x={845} y={284} label="N2" color="#8a6a2a"/>
          {/* Junción N1+N2 → TK Pulmón */}
          <circle cx="868" cy="215" r="3" fill="#d29922" opacity=".8"/>
          <line x1="868" y1="215" x2="934" y2="215" stroke="#d29922" strokeWidth="2" opacity=".8" className="p-raw"/>
          <text x="900" y="210" fill="#8a6a2a" fontSize="6" fontFamily="monospace">N1+N2</text>

          {/* ── TK PULMÓN ── */}
          <g className="eq-h eq-g d13" transform="translate(960,268)" onDoubleClick={()=>openEquipRef.current('tkPulmon')} onMouseEnter={()=>setTt({eq:eqLive.tkPulmon,x:960,y:268})} onMouseLeave={hideTt}>
            <SD eq={eqLive.tkPulmon} cx={26} cy={-108}/>
            <Tk w={52} h={108} wp={0.65}/>
            <Dh w={52} h={108} pct={0.65}/>
            <text y="13" textAnchor="middle" fill="#d29922" fontSize="8" fontWeight="700" fontFamily="monospace">TK PULMÓN</text>
            {eqLive.tkPulmon.cost && <text y="23" textAnchor="middle" fill={cCostLabel} fontSize="8" fontFamily="monospace" className="eq-cost-float">{eqLive.tkPulmon.cost}</text>}
          </g>

          {/* O: TK Pulmón → Torre Enfriam. (horizontal, y=165) */}
          <line x1="986" y1="165" x2="1064" y2="165" stroke="#00c5e3" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <PL x={1025} y={160} label="O" color="#2a6a7a"/>
          {/* R: TK Pulmón → Cárcamo (horizontal, y=248) */}
          <line x1="986" y1="248" x2="1067" y2="248" stroke="#00c5e3" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <PL x={1026} y={243} label="R" color="#2a6a7a"/>

          {/* ── TORRE DE ENFRIAMIENTO ── */}
          <g className="eq-h eq-g d14" transform="translate(1090,175)" onDoubleClick={()=>openEquipRef.current('torre')} onMouseEnter={()=>setTt({eq:eqLive.torre,x:1090,y:175,flipY:true})} onMouseLeave={hideTt}>
            <SD eq={eqLive.torre} cx={24} cy={-95}/>
            <rect x="-26" y="-98" width="52" height="98" rx="3" fill={tG} stroke={cStrkPurp60} strokeWidth="1.5" className="eq-b"/>
            {[-85,-70,-55,-40,-25].map(y=>(
              <rect key={y} x="-22" y={y} width="44" height="9" rx="1" fill="#1a2535" stroke="#2a3a50" strokeWidth=".5"/>
            ))}
            <circle cx="-10" cy="-78" r="2" fill="#00c5e380" className="t-drop"/>
            <circle cx="2"   cy="-65" r="1.8" fill="#00c5e360" className="t-drop2"/>
            <circle cx="14"  cy="-88" r="2" fill="#00c5e370" className="t-drop3"/>
            <rect x="-24" y="-18" width="48" height="16" fill={wG} opacity=".45"/>
            <line x1="0" y1="-98" x2="0" y2="-112" stroke={cStrkPurp60} strokeWidth="1.2" strokeDasharray="3 2"/>
            <polygon points="-4,-110 0,-118 4,-110" fill="#8b5cf660"/>
            <text x="6" y="-107" fill="#6a4a8a60" fontSize="5.5" fontFamily="monospace">P vapor</text>
            <text y="14" textAnchor="middle" fill="#8b5cf6" fontSize="6.5" fontWeight="700" fontFamily="monospace">TORRE ENFRIAM.</text>
            {eqLive.torre.cost && <text y="23" textAnchor="middle" fill={cCostLabel} fontSize="7.5" fontFamily="monospace" className="eq-cost-float">{eqLive.torre.cost}</text>}
          </g>

          {/* ── CÁRCAMO ── */}
          <g className="eq-h eq-g d15" transform="translate(1090,310)" onDoubleClick={()=>openEquipRef.current('carcamo')} onMouseEnter={()=>setTt({eq:eqLive.carcamo,x:1090,y:310})} onMouseLeave={hideTt}>
            <SD eq={eqLive.carcamo} cx={22} cy={-62}/>
            <Tk w={46} h={65} wp={0.60}/>
            <text y="13" textAnchor="middle" fill="#d29922" fontSize="9" fontWeight="700" fontFamily="monospace">CÁRCAMO</text>
            {eqLive.carcamo.cost && <text y="23" textAnchor="middle" fill={cCostLabel} fontSize="9" fontFamily="monospace" className="eq-cost-float">{eqLive.carcamo.cost}</text>}
            <line x1="-23" y1="-65" x2="-23" y2="-80" stroke={cStrkRed60} strokeWidth="1.2" strokeDasharray="3 2"/>
            <polygon points="-27,-77 -23,-85 -19,-77" fill="#f8514960"/>
            <text x="-28" y="-82" fill="#f8514950" fontSize="5.5" fontFamily="monospace" textAnchor="middle">REBOSE</text>
          </g>

          {/* Q: Torre right → TK Homogen left */}
          <line x1="1116" y1="168" x2="1246" y2="168" stroke="#00c5e3" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <line x1="1246" y1="168" x2="1246" y2="215" stroke="#00c5e3" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <PL x={1181} y={163} label="Q" color="#2a6a7a"/>

          {/* ── TK HOMOGENEIZADOR 800m³ ── */}
          {/* Dosificación: OZONO S y LIXIV. V */}
          <line x1="1262" y1="106" x2="1262" y2="150" stroke="#d29922" strokeWidth="1.2" strokeDasharray="3 2" opacity=".7"/>
          <circle cx="1262" cy="106" r="5" fill="#d29922" opacity=".85"/>
          <text x="1262" y="98" textAnchor="middle" fill="#d29922" fontSize="5.5" fontFamily="monospace">OZONO S</text>
          <line x1="1286" y1="106" x2="1286" y2="150" stroke="#3fb950" strokeWidth="1.2" strokeDasharray="3 2" opacity=".7"/>
          <circle cx="1286" cy="106" r="5" fill="#3fb950" opacity=".85"/>
          <text x="1286" y="98" textAnchor="middle" fill="#3fb950" fontSize="5.5" fontFamily="monospace">LIXIV. V</text>

          <g className="eq-h eq-g d16" transform="translate(1280,268)" onDoubleClick={()=>openEquipRef.current('homogen')} onMouseEnter={()=>setTt({eq:eqLive.homogen,x:1280,y:268})} onMouseLeave={hideTt}>
            <SD eq={eqLive.homogen} cx={32} cy={-115}/>
            <rect x="-34" y="-118" width="68" height="118" rx="4" fill={tG} stroke={cStrkAmber60} strokeWidth="1.8" className="eq-b"/>
            <rect x="-32" y="-78" width="64" height="76" fill={wG} opacity=".52"/>
            <path d="M-32,-78 Q0,-82 32,-78 L32,-75 Q0,-79 -32,-75Z" fill="#00c5e3" opacity=".38"/>
            <text x="0" y="-85" textAnchor="middle" fill="#4a6a80" fontSize="7" fontFamily="monospace">800 m³</text>
            <line x1="0" y1="-118" x2="0" y2="-40" stroke="#1a3555" strokeWidth="1.5"/>
            <g className="mixer">
              <rect x="-22" y="-46" width="44" height="8" rx="3" fill="#1a4060" stroke="#2a5a80" strokeWidth="1"/>
            </g>
            <Dh w={68} h={118} pct={0.66}/>
            <text y="13" textAnchor="middle" fill="#d29922" fontSize="9" fontWeight="700" fontFamily="monospace">TK HOMOGEN.</text>
            <text y="21" textAnchor="middle" fill="#d29922" fontSize="6" fontFamily="monospace">800 m³</text>
            {eqLive.homogen.cost && <text y="30" textAnchor="middle" fill={cCostLabel} fontSize="9" fontFamily="monospace" className="eq-cost-float">{eqLive.homogen.cost}</text>}
          </g>

          {/* AA1: TK Homogen → Equipo GEM */}
          <line x1="1314" y1="215" x2="1468" y2="215" stroke="#d29922" strokeWidth="1.8" opacity=".8" className="p-raw"/>
          <PL x={1391} y={211} label="AA1" color="#8a6a2a"/>

          {/* ── EQUIPO GEM ── */}
          {/* Dosificación química — 5 puntos sobre el reactor */}
          {[
            { x:1474, color:'#f85149', label:'Ácido'  },
            { x:1486, color:'#ff6b35', label:'Decol.' },
            { x:1500, color:'#00c5e3', label:'Coag.'  },
            { x:1514, color:'#3fb950', label:'F.Cat.' },
            { x:1526, color:'#8b5cf6', label:'F.An.'  },
          ].map(d=>(
            <g key={d.label}>
              <line x1={d.x} y1="106" x2={d.x} y2="154" stroke={d.color} strokeWidth="1.2" strokeDasharray="2 2" opacity=".7"/>
              <circle cx={d.x} cy={106} r="4" fill={d.color} opacity=".85"/>
              <text x={d.x} y="98" textAnchor="middle" fill={d.color} fontSize="5" fontFamily="monospace">{d.label}</text>
            </g>
          ))}
          <g className="eq-h eq-g d17" transform="translate(1500,264)" onDoubleClick={()=>openEquipRef.current('eqGem')} onMouseEnter={()=>setTt({eq:eqLive.eqGem,x:1500,y:264})} onMouseLeave={hideTt}>
            <SD eq={eqLive.eqGem} cx={30} cy={-108}/>
            <rect x="-32" y="-110" width="64" height="110" rx="4" fill={tG} stroke={cStrkAmber60} strokeWidth="1.8" className="eq-b"/>
            <rect x="-30" y="-70" width="60" height="68" fill={wG} opacity=".5"/>
            <g className="mixer">
              <circle cx="0" cy="-38" r="16" fill="#0d2535" stroke="#d29922" strokeWidth="1.2"/>
              {[0,60,120,180,240,300].map(a=>{
                const r1=a*Math.PI/180;
                return <rect key={a} x={14*Math.cos(r1)-3} y={-38+14*Math.sin(r1)-3} width="6" height="6"
                  rx="1" fill="#d29922" opacity=".7" transform={`rotate(${a},${14*Math.cos(r1)},${-38+14*Math.sin(r1)})`}/>;
              })}
              <circle cx="0" cy="-38" r="5" fill="#1a3050"/>
            </g>
            <text y="13" textAnchor="middle" fill="#d29922" fontSize="9" fontWeight="700" fontFamily="monospace">EQUIPO GEM</text>
            {eqLive.eqGem.cost && <text y="23" textAnchor="middle" fill={cCostLabel} fontSize="9" fontFamily="monospace" className="eq-cost-float">{eqLive.eqGem.cost}</text>}
          </g>

          {/* U: GEM → Swingmill (lodos) */}
          <line x1="1532" y1="215" x2="1672" y2="215" stroke={sG} strokeWidth="2" opacity=".8" className="p-sludge"/>
          <PL x={1602} y={210} label="U" color="#7a5820"/>

          {/* ── SWINGMILL / ESPESADOR ── */}
          <g className="eq-h eq-g d18" transform="translate(1700,232)" onDoubleClick={()=>openEquipRef.current('swingmill')} onMouseEnter={()=>setTt({eq:eqLive.swingmill,x:1700,y:232,flipY:true})} onMouseLeave={hideTt}>
            <SD eq={eqLive.swingmill} cx={28} cy={-55}/>
            <circle cx="0" cy="-22" r="28" fill={sG} stroke="#5a4018" strokeWidth="1.5" className="eq-bc"/>
            <g className="mixer">
              <line x1="0" y1="-48" x2="0" y2="-20" stroke="#3a2010" strokeWidth="1.5"/>
              <rect x="-14" y="-25" width="28" height="6" rx="3" fill="#2a1808" stroke="#4a3010" strokeWidth="1"/>
            </g>
            <text y="16" textAnchor="middle" fill="#7a5820" fontSize="9" fontWeight="700" fontFamily="monospace">SWIMING</text>
            {eqLive.swingmill.cost && <text y="26" textAnchor="middle" fill={cCostLabel} fontSize="9" fontFamily="monospace" className="eq-cost-float">{eqLive.swingmill.cost}</text>}
            <line x1="0" y1="6" x2="0" y2="35" stroke="#5a3a10" strokeWidth="2" strokeDasharray="4 3" opacity=".7"/>
            <polygon points="-4,32 0,40 4,32" fill="#5a3a10" opacity=".7"/>
            <text x="6" y="40" fill="#5a402060" fontSize="5.5" fontFamily="monospace">W→Lodo</text>
          </g>

          {/* V: Swingmill → TK Homogen (lixiviado · recirc.) */}
          <line x1="1700" y1="182" x2="1700" y2="75"  stroke="#3fb950" strokeWidth="1.5" opacity=".7" className="p-raw"/>
          <line x1="1700" y1="75"  x2="1314" y2="75"  stroke="#3fb950" strokeWidth="1.5" opacity=".7" className="p-raw"/>
          <line x1="1314" y1="75"  x2="1314" y2="150" stroke="#3fb950" strokeWidth="1.5" opacity=".7" className="p-raw"/>
          <polygon points="1310,146 1314,154 1318,146" fill="#3fb950" opacity=".7"/>
          <text x="1507" y="70" textAnchor="middle" fill="#3fb95080" fontSize="5.5" fontStyle="italic" fontFamily="monospace">V (lixiviado)</text>

          {/* X: GEM top-right → techo → borde dcho → ANÓXICO */}
          <line x1="1532" y1="154" x2="1532" y2="46"  stroke="#00c5e3" strokeWidth="2" opacity=".85" className="p-raw"/>
          <line x1="1532" y1="46"  x2="1790" y2="46"  stroke="#00c5e3" strokeWidth="2" opacity=".85" className="p-raw"/>
          <line x1="1790" y1="46"  x2="1790" y2="381" stroke="#00c5e3" strokeWidth="2" opacity=".85" className="p-raw"/>
          <line x1="1790" y1="381" x2="1749" y2="381" stroke="#00c5e3" strokeWidth="2" opacity=".85" className="p-raw"/>
          <line x1="1749" y1="381" x2="1749" y2="488" stroke="#00c5e3" strokeWidth="2" opacity=".85" className="p-raw"/>
          <polygon points="1745,484 1749,492 1753,484" fill="#00c5e3" opacity=".9"/>
          <text x="1745" y="41" textAnchor="middle" fill="#00c5e380" fontSize="6" fontStyle="italic" fontFamily="monospace">X → ANÓXICO</text>

          {/* ══ FASE SECUNDARIA ══
              TK PERMEADO cx=1123 | MBR T/K cx=1329 | MBBR cx=1535 | ANÓXICO cx=1741
          ══════════════════════════════════════════════════════════════ */}

          {/* ── ANÓXICO (cx=1749, bottom=596) ── */}
          <g className="eq-h eq-g d19" transform="translate(1749,596)" onDoubleClick={()=>openEquipRef.current('anoxic')} onMouseEnter={()=>setTt({eq:eqLive.anoxic,x:1749,y:596,anchor:'right'})} onMouseLeave={hideTt}>
            <SD eq={eqLive.anoxic} cx={38} cy={-108}/>
            <rect x="-38" y="-108" width="76" height="108" rx="3" fill={tG} stroke={cStrkGreen60} strokeWidth="1.5" className="eq-b"/>
            <rect x="-36" y="-75" width="72" height="73" fill="#0a2510" opacity=".65"/>
            <circle cx="0" cy="-48" r="13" fill="#0a2510" stroke="#2a5a2a" strokeWidth="1"/>
            <text x="0" y="-51" textAnchor="middle" fill="#3fb950" fontSize="6.5" fontFamily="monospace">NO₃⁻ ↓</text>
            <text y="13" textAnchor="middle" fill="#3fb950" fontSize="9" fontWeight="700" fontFamily="monospace">ANÓXICO</text>
            {eqLive.anoxic.cost && <text y="23" textAnchor="middle" fill={cCostLabel} fontSize="9" fontFamily="monospace" className="eq-cost-float">{eqLive.anoxic.cost}</text>}
          </g>

          {/* Y: ANÓXICO(1711) → MBBR(1622) */}
          <line x1="1711" y1="534" x2="1622" y2="534" stroke="#3fb950" strokeWidth="2" opacity=".85" className="p-bio"/>
          <polygon points="1625,530 1617,534 1625,538" fill="#3fb950" opacity=".9"/>
          <PL x={1666} y={529} label="Y" color="#2a6a3a"/>

          {/* ── MBBR (cx=1576, bottom=606) ── */}
          <g className="eq-h eq-g d19" transform="translate(1576,606)" onDoubleClick={()=>openEquipRef.current('mbbr')} onMouseEnter={()=>setTt({eq:eqLive.mbbr,x:1576,y:606})} onMouseLeave={hideTt}>
            <SD eq={eqLive.mbbr} cx={46} cy={-118}/>
            <rect x="-46" y="-118" width="92" height="118" rx="3" fill={tG} stroke={cStrkGreen60} strokeWidth="1.5" className="eq-b"/>
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
            <text y="35" textAnchor="middle" fill="#3fb950" fontSize="9" fontWeight="700" fontFamily="monospace">MBBR</text>
            {eqLive.mbbr.cost && <text y="-122" textAnchor="middle" fill={cCostLabel} fontSize="9" fontFamily="monospace" className="eq-cost-float">{eqLive.mbbr.cost}</text>}
          </g>

          {/* Recirc: MBR T/K(1403) → ANÓXICO(1749) — path invertido → flowL muestra MBR→ANÓXICO */}
          <path d="M1749,488 C1749,404 1403,404 1403,432" fill="none" stroke="#8b5cf6"
            strokeWidth="1.8" opacity=".6" className="p-recirc"/>
          <polygon points="1745,484 1749,492 1753,484" fill="#8b5cf6" opacity=".6"/>
          <text x="1576" y="400" textAnchor="middle" fill="#8b5cf650" fontSize="5.5" fontFamily="monospace">RECIRC. LODO BIO.</text>

          {/* Sopladores → MBBR */}
          {[1542,1576,1609].map((sx,i)=>(
            <g key={sx} className="eq-g" style={{animationDelay:`${0.6+i*0.1}s`}}>
              <line x1={sx} y1="614" x2={sx} y2="606" stroke="#3fb95040" strokeWidth="1.5" strokeDasharray="3 2"/>
              <circle cx={sx} cy="623" r="9" fill="#0a2010" stroke={cStrkGreen60} strokeWidth="1.2"/>
              <text x={sx} y="627" textAnchor="middle" fill="#3fb95070" fontSize="6.5" fontFamily="monospace">S</text>
            </g>
          ))}
          <text x="1576" y="649" textAnchor="middle" fill="#3fb95040" fontSize="5.5" fontFamily="monospace">SOPLADORES</text>

          {/* Z: MBBR(1530) → junction(1479) */}
          <line x1="1530" y1="534" x2="1479" y2="534" stroke="#3fb950" strokeWidth="2" opacity=".85" className="p-bio"/>
          <PL x={1504} y={529} label="Z" color="#2a6a3a"/>
          <line x1="1479" y1="473" x2="1479" y2="595" stroke="#3fb950" strokeWidth="1.8" opacity=".7" className="p-bio"/>
          {/* Z1: → MBR T right (1403+32=1435, y=473) */}
          <line x1="1479" y1="473" x2="1435" y2="473" stroke="#3fb950" strokeWidth="1.8" opacity=".8" className="p-bio"/>
          <polygon points="1438,469 1430,473 1438,477" fill="#3fb950" opacity=".9"/>
          <PL x={1457} y={469} label="Z1" color="#2a6a3a"/>
          {/* Z2: → MBR K right (1435, y=595) */}
          <line x1="1479" y1="595" x2="1435" y2="595" stroke="#3fb950" strokeWidth="1.8" opacity=".8" className="p-bio"/>
          <polygon points="1438,591 1430,595 1438,599" fill="#3fb950" opacity=".9"/>
          <PL x={1457} y={612} label="Z2" color="#2a6a3a"/>

          {/* ── MBR T (cx=1403, bottom=514) ── */}
          <g className="eq-h eq-g d20" transform="translate(1403,514)" onDoubleClick={()=>openEquipRef.current('mbrT')} onMouseEnter={()=>setTt({eq:eqLive.mbrT,x:1403,y:514,flipY:true})} onMouseLeave={hideTt}>
            <MBRTank eq={eqLive.mbrT} svgLabel="MBR T" borderColor="#3fb95060" labelColor="#3fb950" innerStroke="#2a5575"/>
          </g>

          {/* ── MBR K (cx=1403, bottom=636) ── */}
          <g className="eq-h eq-g d20" transform="translate(1403,636)" onDoubleClick={()=>openEquipRef.current('mbrK')} onMouseEnter={()=>setTt({eq:eqLive.mbrK,x:1403,y:636})} onMouseLeave={hideTt}>
            <MBRTank eq={eqLive.mbrK} svgLabel="MBR K" borderColor="#d2992260" labelColor="#d29922" innerStroke="#3a5040" waterOpacity=".42" animDelay=".4s"/>
          </g>

          {/* MBR T/K left(1371) → merge junction(1291) */}
          <line x1="1371" y1="473" x2="1291" y2="473" stroke="#3fb950" strokeWidth="1.8" opacity=".8" className="p-bio"/>
          <line x1="1291" y1="473" x2="1291" y2="534" stroke="#3fb950" strokeWidth="1.8" opacity=".8" className="p-bio"/>
          <line x1="1371" y1="595" x2="1291" y2="595" stroke="#3fb950" strokeWidth="1.8" opacity=".8" className="p-bio"/>
          <line x1="1291" y1="595" x2="1291" y2="534" stroke="#3fb950" strokeWidth="1.8" opacity=".8" className="p-bio"/>
          <circle cx="1291" cy="534" r="3.5" fill="#3fb950" opacity=".9"/>
          {/* Merge → TK PERMEADO right (1230+30=1260) */}
          <line x1="1291" y1="534" x2="1260" y2="534" stroke="#3fb950" strokeWidth="2" opacity=".9" className="p-bio"/>
          <polygon points="1263,530 1255,534 1263,538" fill="#3fb950" opacity=".9"/>


          {/* ── TK PERMEADO (cx=1230, bottom=576) — izquierda SECUNDARIA ── */}
          <g className="eq-h eq-g d19" transform="translate(1230,576)" onDoubleClick={()=>openEquipRef.current('tkPermeado')} onMouseEnter={()=>setTt({eq:eqLive.tkPermeado,x:1230,y:576})} onMouseLeave={hideTt}>
            <SD eq={eqLive.tkPermeado} cx={30} cy={-110}/>
            <rect x="-30" y="-110" width="60" height="110" rx="3" fill={tG} stroke={cStrkGreen60} strokeWidth="1.5" className="eq-b"/>
            <rect x="-28" y="-72" width="56" height="70" fill={wG} opacity=".52"/>
            <path d="M-28,-72 Q0,-75 28,-72 L28,-70 Q0,-73 -28,-70Z" fill="#00c5e3" opacity=".4"/>
            <Dh w={60} h={110} pct={0.65}/>
            <text y="13" textAnchor="middle" fill="#3fb950" fontSize="8" fontWeight="700" fontFamily="monospace">TK PERMEADO</text>
            {eqLive.tkPermeado.cost && <text y="23" textAnchor="middle" fill={cCostLabel} fontSize="8" fontFamily="monospace" className="eq-cost-float">{eqLive.tkPermeado.cost}</text>}
          </g>

          {/* AE: TK PERMEADO (1230,576) izq → FILT.IÓNICO (1093,480) der — cruza zona en y=470 */}
          <line x1="1200" y1="470" x2="1143" y2="470" stroke="#3fb950" strokeWidth="2" opacity=".85" className="p-bio"/>
          <polygon points="1147,466 1139,470 1147,474" fill="#3fb950" opacity=".9"/>
          <text x="1171" y="464" textAnchor="middle" fill="#3fb95080" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AE</text>

          {/* ══════════════ FASE TERCIARIA — 2 filas (mYA=480 superior · mYB=615 rechazos) — centrado +300 ══════════════ */}

          {/* ── Tubería principal superior y=mYA — FLOW right→left ── */}
          <line x1="1060" y1={mYA} x2="530"  y2={mYA} stroke={cShadowPipe} strokeWidth="7" strokeLinecap="round"/>
          <line x1="1060" y1={mYA} x2="530"  y2={mYA} stroke="#3fb950" strokeWidth="3.5" opacity=".85" className="p-clean"/>
          <circle cx="1060" cy={mYA} r="3" fill="#3fb950" opacity=".8"/>
          {/* Pipe labels upper */}
          <text x="1016" y={mYA-5} textAnchor="middle" fill="#c084fc55" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AF</text>
          <text x="836"  y={mYA-5} textAnchor="middle" fill="#1f6feb55" fontSize="5.5" fontStyle="italic" fontFamily="monospace">→ RO1</text>
          <text x="673"  y={mYA-5} textAnchor="middle" fill="#1f6feb55" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AH</text>

          {/* ── AG: RO1 E1 permeado ↓ collector ── */}
          <line x1="740" y1={mYA} x2="740" y2="522" stroke="#3fb950" strokeWidth="1.5" opacity=".65" className="p-clean"/>
          <circle cx="740" cy="522" r="2.5" fill="#3fb950" opacity=".7"/>
          <text x="751" y="511" fill="#3fb95065" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AG</text>

          {/* ── AL: RO1 E2 permeado ↓ collector ── */}
          <line x1="575" y1={mYA} x2="575" y2="522" stroke="#3fb950" strokeWidth="1.5" opacity=".65" className="p-clean"/>
          <circle cx="575" cy="522" r="2.5" fill="#3fb950" opacity=".7"/>
          <text x="586" y="511" fill="#3fb95065" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AL</text>

          {/* ── AJ: RO1 E2 reject ↓ TK RECH RO1 ── */}
          <line x1="530" y1={mYA} x2="530" y2="547" stroke="#f85149" strokeWidth="1.5" opacity=".6" className="p-reject"/>
          <polygon points="526,543 530,552 534,543" fill="#f85149" opacity=".65"/>
          <text x="514" y="518" fill="#f8514965" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AJ</text>

          {/* ── Permeado collector y=522 — FLOW right→left ── */}
          <line x1="745" y1="522" x2="200"  y2="522" stroke={cShadowPipe} strokeWidth="5" strokeLinecap="round"/>
          <line x1="745" y1="522" x2="200"  y2="522" stroke="#3fb950" strokeWidth="2.5" opacity=".75" className="p-clean"/>
          <polygon points="203,519 195,522 203,525" fill="#3fb950" opacity=".85"/>

          {/* ── AM: RO2 permeado ↑ collector (RO2 x=745) ── */}
          <line x1="745" y1="565" x2="745" y2="522" stroke="#3fb950" strokeWidth="1.5" opacity=".65" className="p-clean"/>
          <circle cx="745" cy="522" r="2.5" fill="#3fb950" opacity=".75"/>
          <text x="757" y="543" fill="#3fb95065" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AM</text>

          {/* ── Collector ↓ TK RECIR (entry x=200) ── */}
          <line x1="200" y1="522" x2="200" y2="533" stroke="#3fb950" strokeWidth="2.5" opacity=".75" className="p-clean"/>
          <polygon points="196,530 200,538 204,530" fill="#3fb950" opacity=".85"/>

          {/* ── FILTRO INTERCAMBIO IÓNICO (x=1093, bottom=mYA) — recibe AE ── */}
          <g className="eq-h eq-g d17" transform={`translate(1093,${mYA})`} onDoubleClick={()=>openEquipRef.current('filtrosII')} onMouseEnter={()=>setTt({eq:eqLive.filtrosII,x:1093,y:mYA,flipY:true})} onMouseLeave={hideTt}>
            <SD eq={eqLive.filtrosII} cx={50} cy={-88}/>
            <rect x="-50" y="-90" width="100" height="90" rx="3" fill={cIonicBody} stroke={cStrkIonic60} strokeWidth="1.5" className="eq-b"/>
            {[[-42,'#1a2a50','#3b82f6'],[-12,'#1a1a2a','#6b7280'],[18,'#1a2a50','#3b82f6']].map(([bx,bg,sc],i)=>(
              <g key={i}>
                <rect x={Number(bx)} y="-84" width="24" height="80" rx="3" fill={bg as string} stroke={sc as string} strokeWidth="1"/>
                {[-76,-60,-44,-28,-12].map(ry=>(<circle key={ry} cx={Number(bx)+12} cy={ry} r="3" fill={sc as string} opacity=".4"/>))}
              </g>
            ))}
            <line x1="-46" y1="-84" x2="46" y2="-6" stroke="#c084fc" strokeWidth="1" opacity=".3"/>
            <line x1="46" y1="-84" x2="-46" y2="-6" stroke="#c084fc" strokeWidth="1" opacity=".3"/>
            <text y="12" textAnchor="middle" fill={cIonicLabel} fontSize="9" fontWeight="700" fontFamily="monospace">FILT. IÓNICO</text>
            {eqLive.filtrosII.cost && <text y="22" textAnchor="middle" fill={cCostLabel} fontSize="9" fontFamily="monospace" className="eq-cost-float">{eqLive.filtrosII.cost}</text>}
          </g>
          {/* Auxiliares a la derecha del filtro iónico (x>1143) */}
          <rect x="1148" y="432" width="44" height="13" rx="2" fill={cIonicBody} stroke="#c084fc40" strokeWidth="1"/>
          <text x="1170" y="441" textAnchor="middle" fill="#c084fc70" fontSize="5" fontFamily="monospace">PREP.RESINAS</text>
          <rect x="1148" y="449" width="44" height="13" rx="2" fill={cIonicBody} stroke="#c084fc40" strokeWidth="1"/>
          <text x="1170" y="458" textAnchor="middle" fill="#c084fc70" fontSize="5" fontFamily="monospace">TK SALMUERA</text>
          <line x1="1143" y1="438" x2="1148" y2="438" stroke="#c084fc" strokeWidth="1" opacity=".4"/>
          <line x1="1143" y1="455" x2="1148" y2="455" stroke="#c084fc" strokeWidth="1" opacity=".4"/>

          {/* ── 2× FILTRO 5µm EN PARALELO (junction x=920) ── */}
          <line x1="920" y1={mYA} x2="920" y2="478" stroke="#3fb950" strokeWidth="1.5" opacity=".7" className="p-clean"/>
          <circle cx="920" cy={mYA} r="3" fill="#3fb950" opacity=".8"/>
          <text x="937" y={mYA-2} fill="#1f6feb50" fontSize="4.8" fontFamily="monospace">∥ PARALELO</text>
          {/* FILTRO A — arriba del pipe (bottom=478) */}
          <g className="eq-h eq-g d18" transform="translate(920,478)" onDoubleClick={()=>openEquipRef.current('filtro5')} onMouseEnter={()=>setTt({eq:eqLive.filtro5,x:920,y:478,flipY:true})} onMouseLeave={hideTt}>
            <SD eq={eqLive.filtro5} cx={22} cy={-76}/>
            <rect x="-22" y="-78" width="44" height="78" rx="3" fill={tG} stroke={cStrkBlue60} strokeWidth="1.5" className="eq-b"/>
            <rect x="-20" y="-74" width="40" height="22" fill={wG} opacity=".3"/>
            {[-6,6].map(bx=>(<g key={bx}><rect x={bx-4} y="-48" width="8" height="46" rx="4" fill="#1a3050" stroke="#2a5070" strokeWidth="1"/><line x1={bx} y1="-46" x2={bx} y2="-4" stroke="#00c5e312" strokeWidth="6"/></g>))}
            <text y="12" textAnchor="middle" fill="#1f6feb" fontSize="8" fontWeight="700" fontFamily="monospace">5µm-A</text>
            {eqLive.filtro5.cost && <text y="22" textAnchor="middle" fill={cCostLabel} fontSize="8" fontFamily="monospace" className="eq-cost-float">{eqLive.filtro5.cost}</text>}
          </g>
          {/* FILTRO B — debajo del pipe (bottom=595) */}
          <line x1="920" y1={mYA} x2="920" y2="517" stroke="#3fb950" strokeWidth="1.5" opacity=".7" className="p-clean"/>
          <g className="eq-h eq-g d18" transform="translate(920,595)" onDoubleClick={()=>openEquipRef.current('filtro5')} onMouseEnter={()=>setTt({eq:eqLive.filtro5,x:920,y:595,flipY:true})} onMouseLeave={hideTt}>
            <SD eq={eqLive.filtro5} cx={22} cy={-76}/>
            <rect x="-22" y="-78" width="44" height="78" rx="3" fill={tG} stroke={cStrkBlue60} strokeWidth="1.5" className="eq-b"/>
            <rect x="-20" y="-74" width="40" height="22" fill={wG} opacity=".3"/>
            {[-6,6].map(bx=>(<g key={bx}><rect x={bx-4} y="-48" width="8" height="46" rx="4" fill="#1a3050" stroke="#2a5070" strokeWidth="1"/><line x1={bx} y1="-46" x2={bx} y2="-4" stroke="#00c5e312" strokeWidth="6"/></g>))}
            <text y="12" textAnchor="middle" fill="#1f6feb" fontSize="8" fontWeight="700" fontFamily="monospace">5µm-B</text>
            {eqLive.filtro5.cost && <text y="22" textAnchor="middle" fill={cCostLabel} fontSize="8" fontFamily="monospace" className="eq-cost-float">{eqLive.filtro5.cost}</text>}
          </g>

          {/* ── RO1 ETAPA 1 (x=740, bottom=mYA) ── */}
          <g className="eq-h eq-g d19" transform={`translate(740,${mYA})`} onDoubleClick={()=>openEquipRef.current('ro1e1')} onMouseEnter={()=>setTt({eq:eqLive.ro1e1,x:740,y:mYA,flipY:true})} onMouseLeave={hideTt}>
            <ROStage eq={eqLive.ro1e1} svgLabel="RO1 E1" animDelayMultiplier={0.18}/>
          </g>

          {/* ── RO1 ETAPA 2 (x=575, bottom=mYA) ── */}
          <g className="eq-h eq-g d19" transform={`translate(575,${mYA})`} onDoubleClick={()=>openEquipRef.current('ro1e2')} onMouseEnter={()=>setTt({eq:eqLive.ro1e2,x:575,y:mYA,flipY:true})} onMouseLeave={hideTt}>
            <ROStage eq={eqLive.ro1e2} svgLabel="RO1 E2" animDelayMultiplier={0.22} compact/>
          </g>

          {/* ── TK RECHAZO RO1 (x=530, bottom=mYB) ── */}
          <g className="eq-h eq-g d22" transform={`translate(530,${mYB})`} onDoubleClick={()=>openEquipRef.current('tkRechazo')} onMouseEnter={()=>setTt({eq:eqLive.tkRechazo,x:530,y:mYB})} onMouseLeave={hideTt}>
            <SD eq={eqLive.tkRechazo} cx={28} cy={-66}/>
            <rect x="-28" y="-68" width="56" height="68" rx="3" fill={tG} stroke={cStrkRed60} strokeWidth="1.5" className="eq-b"/>
            <rect x="-26" y="-52" width="52" height="50" fill={sG} opacity=".55"/>
            <Dh w={56} h={68} pct={0.68}/>
            <text y="12" textAnchor="middle" fill="#f85149" fontSize="7" fontWeight="700" fontFamily="monospace">TK RECH. RO1</text>
            {eqLive.tkRechazo.cost && <text y="22" textAnchor="middle" fill={cCostLabel} fontSize="8" fontFamily="monospace" className="eq-cost-float">{eqLive.tkRechazo.cost}</text>}
          </g>

          {/* ── FILTRO AK (x=630, bottom=mYB) ── */}
          <g className="eq-h eq-g" transform={`translate(630,${mYB})`}>
            <rect x="-18" y="-44" width="36" height="44" rx="3" fill={cFiltAK} stroke={cStrkBlue50} strokeWidth="1.2" className="eq-b"/>
            {[-8,0,8].map(bx=>(<rect key={bx} x={bx-3} y="-38" width="6" height="36" rx="3" fill="#1a3050" stroke="#2a5070" strokeWidth="1"/>))}
            <text y="12" textAnchor="middle" fill="#1f6feb90" fontSize="5" fontFamily="monospace">FILTRO</text>
          </g>

          {/* ── RO2 (x=745, bottom=mYB) ── */}
          <g className="eq-h eq-g d20" transform={`translate(745,${mYB})`} onDoubleClick={()=>openEquipRef.current('ro2')} onMouseEnter={()=>setTt({eq:eqLive.ro2,x:745,y:mYB})} onMouseLeave={hideTt}>
            <SD eq={eqLive.ro2} cx={46} cy={-86}/>
            <rect x="-45" y="-88" width="90" height="88" rx="4" fill={cRo2Body} stroke={cStrkRed60} strokeWidth="2" className="eq-b"/>
            {[-72,-51,-30,-9].map((ty,i)=>(
              <g key={ty} className="mem" style={{animationDelay:`${i*0.4}s`}}>
                <rect x="-40" y={ty} width="80" height="17" rx="8" fill="#1e1010" stroke="#5a2030" strokeWidth="1"/>
                <ellipse cx="-33" cy={ty+8.5} rx="5" ry="7.5" fill="#160808" stroke="#5a2030" strokeWidth="0.8"/>
                <ellipse cx="33"  cy={ty+8.5} rx="5" ry="7.5" fill="#160808" stroke="#5a2030" strokeWidth="0.8"/>
                <line x1="-28" y1={ty+8.5} x2="28" y2={ty+8.5} stroke="#f85149" strokeWidth="0.5" opacity=".35"/>
              </g>
            ))}
            <text y="12" textAnchor="middle" fill="#f85149" fontSize="9" fontWeight="700" fontFamily="monospace">RO2 ⚠</text>
            {eqLive.ro2.cost && <text y="22" textAnchor="middle" fill={cCostLabel} fontSize="9" fontFamily="monospace" className="eq-cost-float">{eqLive.ro2.cost}</text>}
          </g>

          {/* ── TK RECHAZO RO2 (x=850, bottom=mYB) ── */}
          <g className="eq-h eq-g d22" transform={`translate(850,${mYB})`} onDoubleClick={()=>openEquipRef.current('tkRechazoRO2')} onMouseEnter={()=>setTt({eq:eqLive.tkRechazoRO2,x:850,y:mYB})} onMouseLeave={hideTt}>
            <SD eq={eqLive.tkRechazoRO2} cx={26} cy={-66}/>
            <rect x="-26" y="-68" width="52" height="68" rx="3" fill={tG} stroke={cStrkRed60} strokeWidth="1.5" className="eq-b"/>
            <rect x="-24" y="-52" width="48" height="50" fill={sG} opacity=".55"/>
            <Dh w={52} h={68} pct={0.55}/>
            <text y="12" textAnchor="middle" fill="#f85149" fontSize="7" fontWeight="700" fontFamily="monospace">TK RECH. RO2</text>
            {eqLive.tkRechazoRO2.cost && <text y="22" textAnchor="middle" fill={cCostLabel} fontSize="8" fontFamily="monospace" className="eq-cost-float">{eqLive.tkRechazoRO2.cost}</text>}
          </g>

          {/* ── CAJA VERTIMIENTO (x=1060, bottom=mYB) ── */}
          <g className="eq-h eq-g d22" transform={`translate(1060,${mYB})`} onDoubleClick={()=>openEquipRef.current('cajaVert')} onMouseEnter={()=>setTt({eq:eqLive.cajaVert,x:1060,y:mYB})} onMouseLeave={hideTt}>
            <SD eq={eqLive.cajaVert} cx={28} cy={-66}/>
            <rect x="-28" y="-68" width="56" height="68" rx="4" fill={cCajaVert} stroke={cStrkRed80} strokeWidth="1.5" className="eq-b"/>
            <rect x="-26" y="-52" width="52" height="50" fill="#2e1010" opacity=".7"/>
            <text y="12" textAnchor="middle" fill="#f85149" fontSize="6" fontWeight="700" fontFamily="monospace">CAJA VERT.</text>
            {eqLive.cajaVert.cost && <text y="21" textAnchor="middle" fill={cCostLabel} fontSize="7.5" fontFamily="monospace" className="eq-cost-float">{eqLive.cajaVert.cost}</text>}
            <text x="0" y="-20" textAnchor="middle" fill="#f8514960" fontSize="5" fontFamily="monospace">→ AT</text>
          </g>

          {/* ── TK RECIRCULACIÓN (x=200, bottom=mYB) ── */}
          <g className="eq-h eq-g d21" transform={`translate(200,${mYB})`} onDoubleClick={()=>openEquipRef.current('tkRecir')} onMouseEnter={()=>setTt({eq:eqLive.tkRecir,x:200,y:mYB})} onMouseLeave={hideTt}>
            <SD eq={eqLive.tkRecir} cx={40} cy={-93}/>
            <rect x="-40" y="-95" width="80" height="95" rx="3" fill={tG} stroke={cStrkGreen60} strokeWidth="1.5" className="eq-b"/>
            <rect x="-38" y="-72" width="76" height="70" fill={wG} opacity=".48"/>
            <path d="M-38,-72 Q0,-75 38,-72 L38,-70 Q0,-73 -38,-70Z" fill="#00c5e3" opacity=".4"/>
            <Dh w={80} h={95} pct={0.75}/>
            <text y="12" textAnchor="middle" fill="#3fb950" fontSize="9" fontWeight="700" fontFamily="monospace">TK RECIR.</text>
            {eqLive.tkRecir.cost && <text y="22" textAnchor="middle" fill={cCostLabel} fontSize="9" fontFamily="monospace" className="eq-cost-float">{eqLive.tkRecir.cost}</text>}
          </g>

          {/* ── AQ: Acueducto → TK Recirculación ── */}
          <line x1="290" y1={mYB-75} x2="232" y2={mYB-75} stroke="#3fb950" strokeWidth="1.8" opacity=".85" className="p-clean"/>
          <polygon points={`236,${mYB-79} 228,${mYB-75} 236,${mYB-71}`} fill="#3fb950" opacity=".85"/>
          <text x="294" y={mYB-71} fill="#3fb95090" fontSize="9.5" fontFamily="monospace">ACUEDUCTO</text>
          <text x="348" y={mYB-71} fill={cCyanText} fontSize="8" fontWeight="700" fontFamily="monospace">AQ</text>

          {/* ── AR: Carrotanques → TK Recirculación ── */}
          <line x1="290" y1={mYB-55} x2="232" y2={mYB-55} stroke="#3fb950" strokeWidth="1.8" opacity=".85" className="p-clean"/>
          <polygon points={`236,${mYB-59} 228,${mYB-55} 236,${mYB-51}`} fill="#3fb950" opacity=".85"/>
          <text x="294" y={mYB-51} fill="#3fb95090" fontSize="9.5" fontFamily="monospace">CARROTANQUES</text>
          <text x="362" y={mYB-51} fill={cCyanText} fontSize="8" fontWeight="700" fontFamily="monospace">AR</text>

          {/* ── AS: PTAP → TK Recirculación ── */}
          <line x1="290" y1={mYB-35} x2="232" y2={mYB-35} stroke="#3fb950" strokeWidth="1.8" opacity=".85" className="p-clean"/>
          <polygon points={`236,${mYB-39} 228,${mYB-35} 236,${mYB-31}`} fill="#3fb950" opacity=".85"/>
          <text x="294" y={mYB-31} fill="#3fb95090" fontSize="9.5" fontFamily="monospace">PTAP</text>
          <text x="320" y={mYB-31} fill={cCyanText} fontSize="8" fontWeight="700" fontFamily="monospace">AS</text>

          {/* ── PRODUCCIÓN / REÚSO (x=65, top=394) ── */}
          <g className="eq-h eq-g d22" transform="translate(65,482)" onDoubleClick={()=>openEquipRef.current('produccion')} onMouseEnter={()=>setTt({eq:eqLive.produccion,x:65,y:450,flipY:true})} onMouseLeave={hideTt}>
            <rect x="-50" y="-88" width="100" height="88" rx="5" fill={cProdBody} stroke={cStrkGreen60} strokeWidth="2" className="eq-b"/>
            <text x="0" y="-60" textAnchor="middle" fill="#3fb950" fontSize="10" fontWeight="800" fontFamily="monospace">PRODUCCIÓN</text>
            <path d="M-18,-44 L-28,-30 L-18,-26 L-18,-4 L18,-4 L18,-26 L28,-30 L18,-44 L10,-39 Q0,-35 -10,-39Z"
              fill="#3fb95030" stroke="#3fb95070" strokeWidth="1.5"/>
            <text x="0" y="8" textAnchor="middle" fill="#3fb950a0" fontSize="6.5" fontFamily="monospace">PRODUCCIÓN</text>
            {eqLive.produccion.cost && <text x="0" y="19" textAnchor="middle" fill={cCostLabel} fontSize="7.5" fontFamily="monospace" className="eq-cost-float">{eqLive.produccion.cost}</text>}
          </g>

          {/* ── RECIR→PROD: sale izq TK RECIR (160,560) → sube a PROD bottom (65,482) ── */}
          <line x1="172" y1="560" x2="65" y2="560" stroke="#3fb950" strokeWidth="2" opacity=".8" className="p-clean"/>
          <line x1="65" y1="560" x2="65" y2="482" stroke="#3fb950" strokeWidth="2" opacity=".8" className="p-clean"/>
          <circle cx="65" cy="560" r="2.5" fill="#3fb950" opacity=".8"/>
          <polygon points="61,486 65,478 69,486" fill="#3fb950" opacity=".9"/>

          {/* ── Reject row pipes (y=mYB, FLOW left→right) ── */}
          {/* TK RECH RO1(530)→FILTRO AK(630) */}
          <line x1="558" y1={mYB} x2="612" y2={mYB} stroke="#f85149" strokeWidth="2" opacity=".55" className="p-reject"/>
          <text x="585" y={mYB-5} textAnchor="middle" fill="#f8514965" fontSize="5.5" fontStyle="italic" fontFamily="monospace">AK</text>
          {/* FILTRO AK(630)→RO2(745) */}
          <line x1="648" y1={mYB} x2="700" y2={mYB} stroke="#f85149" strokeWidth="2" opacity=".55" className="p-reject"/>
          {/* RO2(745)→TK RECH RO2(850) */}
          <line x1="790" y1={mYB} x2="824" y2={mYB} stroke="#f85149" strokeWidth="2" opacity=".55" className="p-reject"/>
          {/* TK RECH RO2(850)→CAJA VERT(1060) */}
          <line x1="876" y1={mYB} x2="1032" y2={mYB} stroke="#f85149" strokeWidth="2" opacity=".55" className="p-reject"/>

          {/* ── Overflow bypass: TK RECH RO1 → CAJA VERT ── */}
          <path d={`M530,${mYB} C530,${mYB+44} 1060,${mYB+44} 1060,${mYB}`}
            fill="none" stroke="#92400e" strokeWidth="1.5" opacity=".5" strokeDasharray="5 3"/>
          <text x="795" y={mYB+49} textAnchor="middle" fill="#92400e70" fontSize="5" fontStyle="italic" fontFamily="monospace">overflow → CAJA VERT.</text>

          {/* ── Leyenda ── */}
          <g transform="translate(12,693)">
            <text fill="#4a6070" fontSize="12" fontWeight="700" letterSpacing="2" fontFamily="monospace">CONV.:</text>
            {[
              {x:58,  c:'#00c5e3', d:'9 7', l:'AGUA RESIDUAL'},
              {x:218, c:'#3fb950', d:'9 7', l:'AGUA TRATADA'},
              {x:370, c:'#5a3a10', d:'7 5', l:'LODOS'},
              {x:455, c:'#d29922', d:'4 5', l:'QUÍMICOS'},
              {x:565, c:'#8b5cf6', d:'6 6', l:'RECIRCULACIÓN'},
              {x:728, c:'#f85149', d:'5 5', l:'RECHAZO'},
            ].map(l=>(
              <g key={l.l}>
                <line x1={l.x} y1="-5" x2={l.x+40} y2="-5" stroke={l.c} strokeWidth="3.5" strokeDasharray={l.d}/>
                <text x={l.x+46} y="3" fill={cLegendText} fontSize="12" fontFamily="monospace">{l.l}</text>
              </g>
            ))}
            {[
              {x:890,  c:'#3fb950', l:'EN OPERACIÓN'},
              {x:1055, c:'#d29922', l:'ADVERTENCIA'},
              {x:1200, c:'#f85149', l:'ALARMA'},
            ].map(s=>(
              <g key={s.l}>
                <circle cx={s.x} cy="-5" r="6.5" fill={s.c}/>
                <text x={s.x+13} y="3" fill={cLegendText} fontSize="12" fontFamily="monospace">{s.l}</text>
              </g>
            ))}
          </g>
          </g>{/* /fBright */}

    </>
    );
  }, [eqLive, setTt, hideTt, isDark]);

  return (
    <div className="splash-page">

      {/* Toggle tema — esquina superior derecha de splash-page (position:relative) */}
      <button
        onClick={toggle}
        title={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        style={{
          position: 'absolute', top: 14, right: 18, zIndex: 10,
          background: isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)',
          border: isDark ? '1px solid rgba(255,255,255,.18)' : '1px solid rgba(0,0,0,.15)',
          borderRadius: 8, color: isDark ? '#c9d1d9' : '#2D3F52',
          fontSize: 18, lineHeight: 1, padding: '6px 10px',
          cursor: 'pointer', backdropFilter: 'blur(4px)', transition: 'all .2s',
        }}
      >
        {isDark ? '☀' : '☾'}
      </button>

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

        {/* Diagrama SVG principal del proceso */}
        <div className="splash-wrap">
        <svg className="splash-svg" viewBox="0 0 1800 700" preserveAspectRatio="xMidYMid meet" overflow="visible" role="img" aria-label="Diagrama del proceso PTAR PERMODA">
          {svgBody}
          {tooltipOverlay}
        </svg>
        </div>

        {/* Footer con botón de acceso al sistema */}
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
          tooltipOverlay={tooltipOverlay}
        />
      )}

      {/* Equipment Detail Modal */}
      {activeEquip && EQ[activeEquip] && (
        <EquipmentModal
          equipKey={activeEquip}
          eq={{ ...EQ[activeEquip], status: eqLive[activeEquip]?.status ?? EQ[activeEquip].status }}
          closing={equipClosing}
          onClose={closeEquip}
        />
      )}
    </div>
  );
}
