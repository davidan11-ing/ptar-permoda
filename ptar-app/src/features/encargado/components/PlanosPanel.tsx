import { useState } from 'react';
import { useTheme } from '../../../state/ThemeContext';

/* ─── Catálogo de visualizaciones ─────────────────────────────────────────── */
type Categoria = 'proceso' | 'electrico' | 'plc';

interface Viz {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: Categoria;
  icono: string;
  archivo: string;
  badges: string[];
}

const VIZS: Viz[] = [
  {
    id: 'hub',
    titulo: 'Hub Central — P&ID + Secuencias',
    descripcion:
      'Árbol navegable del proceso completo. Secuencias animadas paso a paso para FC3 RO1, FC4 RO2, FC5 CIP, FC6 Carbón Filtro y FC57 Suavizador. Incluye panel de hallazgos de ingeniería.',
    categoria: 'proceso',
    icono: '🔄',
    archivo: '/planos/Diagrama-Arbol-Osmosis.html',
    badges: ['Animado', 'Secuencias', 'Hallazgos'],
  },
  {
    id: 'pid',
    titulo: 'P&ID RO — Permisivos y Setpoints',
    descripcion:
      'Diagrama de flujo animado del tratamiento terciario (Intercambio Iónico + RO1 + RO2). Ladder KOP interactivo, tabla de permisivos de arranque, alineación de válvulas por modo y setpoints con discrepancias documentadas.',
    categoria: 'proceso',
    icono: '⚙️',
    archivo: '/planos/Esquematico_RO_Permoda.html',
    badges: ['Ladder KOP', 'Permisivos', 'Setpoints'],
  },
  {
    id: 'arq',
    titulo: 'Árbol de Control PLC',
    descripcion:
      '406 E/S verificadas organizadas por tablero y equipo. Jerarquía completa HMI → PLC S7-1500 → 7 esclavos Profibus DP → campo. Búsqueda en tiempo real por tag, dirección o bloque de función.',
    categoria: 'proceso',
    icono: '🏗️',
    archivo: '/planos/Arquitectura-Interactiva-Osmosis.html',
    badges: ['406 E/S', 'Profibus DP', 'Buscador'],
  },
  {
    id: 'esq',
    titulo: 'Esquemático Eléctrico LCP 4.1',
    descripcion:
      '5 paneles navegables: distribución de potencia, 17 circuitos de motor con referencias Schneider, todos los canales E/S del ET200SP, red Ethernet/Profibus y cableado a campo por regleta.',
    categoria: 'electrico',
    icono: '⚡',
    archivo: '/planos/Esquematico-Electrico-LCP41.html',
    badges: ['17 Circuitos', '5 Paneles', 'ET200SP'],
  },
  {
    id: 'tablero',
    titulo: 'Tablero Visual LCP 4.1',
    descripcion:
      'Vista física interior del tablero eléctrico. Al clicar cualquier componente se animan los tres circuitos: potencia 440V en rojo, mando 24VDC en verde y señal PLC en azul.',
    categoria: 'electrico',
    icono: '🔌',
    archivo: '/planos/Tablero-Visual-LCP41.html',
    badges: ['Circuito animado', 'Guardamotores', 'Contactores'],
  },
  {
    id: 'rack',
    titulo: 'Rack PLC ET200SP',
    descripcion:
      'Representación visual del rack con 11 módulos (CPU 1512SP-1 PN, CM DP, 5×DI16, 2×DQ, AI8, AQ2). Clicar módulo o terminal muestra el detalle completo con destino de cableado.',
    categoria: 'plc',
    icono: '🖥️',
    archivo: '/planos/PLC-Rack-Visual.html',
    badges: ['11 Módulos', 'Terminales', 'CPU 1512SP'],
  },
  {
    id: 'wiring',
    titulo: 'Cableado por Módulo',
    descripcion:
      'Esquema terminal a terminal para cada módulo del rack. Muestra pin, dirección PLC, señal de proceso, destino en campo, tipo de cable y sección. Complemento directo al Rack Visual.',
    categoria: 'plc',
    icono: '🔧',
    archivo: '/planos/PLC-Wiring-Modulos.html',
    badges: ['Por módulo', 'Tipo cable', 'Destino'],
  },
];

const CAT: Record<Categoria, { label: string; color: string; bg: string }> = {
  proceso:   { label: 'PROCESO',    color: '#0ea5e9', bg: 'rgba(14,165,233,0.10)' },
  electrico: { label: 'ELÉCTRICO',  color: '#d29922', bg: 'rgba(210,153,34,0.10)' },
  plc:       { label: 'PLC',        color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)' },
};

const SECCIONES: { cat: Categoria; titulo: string; sub: string }[] = [
  { cat: 'proceso',   titulo: 'Proceso',   sub: 'P&ID, secuencias y arquitectura de control' },
  { cat: 'electrico', titulo: 'Eléctrico', sub: 'Esquemáticos y tablero LCP 4.1' },
  { cat: 'plc',       titulo: 'PLC',       sub: 'Rack ET200SP y cableado de módulos' },
];

/* ─── Componente principal ─────────────────────────────────────────────────── */
export default function PlanosPanel() {
  const { theme, isDark } = useTheme();
  const [abierto, setAbierto] = useState<Viz | null>(null);

  const cardBg     = isDark ? theme.surface : '#fff';
  const cardBorder = theme.border;
  const cardShadow = isDark
    ? '0 2px 8px rgba(0,0,0,0.4)'
    : '0 2px 8px rgba(0,0,0,0.07)';

  return (
    <div style={{ paddingBottom: 32 }}>

      {/* ── Aviso informativo ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        background: isDark ? 'rgba(14,165,233,0.08)' : 'rgba(14,165,233,0.06)',
        border: `1px solid ${isDark ? 'rgba(14,165,233,0.25)' : 'rgba(14,165,233,0.3)'}`,
        borderRadius: 8, padding: '10px 14px', marginBottom: 24,
      }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>ℹ️</span>
        <p style={{ margin: 0, fontSize: 12, color: theme.muted, lineHeight: 1.5 }}>
          Visualizaciones interactivas del sistema de Ósmosis Inversa. Todas funcionan sin conexión a internet.
          Usa los controles internos de cada visualización para navegar, buscar y animar los diagramas.
        </p>
      </div>

      {/* ── Secciones con cards ── */}
      {SECCIONES.map(sec => {
        const vizs = VIZS.filter(v => v.categoria === sec.cat);
        const cat  = CAT[sec.cat];
        return (
          <div key={sec.cat} style={{ marginBottom: 28 }}>

            {/* Encabezado de sección */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 3, height: 20, borderRadius: 2, background: cat.color }} />
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: theme.text1, letterSpacing: '0.04em' }}>
                  {sec.titulo.toUpperCase()}
                </span>
                <span style={{ fontSize: 12, color: theme.muted, marginLeft: 10 }}>
                  {sec.sub}
                </span>
              </div>
            </div>

            {/* Grid de cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 14,
            }}>
              {vizs.map(viz => (
                <VizCard
                  key={viz.id}
                  viz={viz}
                  cat={cat}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                  cardShadow={cardShadow}
                  theme={theme}
                  isDark={isDark}
                  onAbrir={() => setAbierto(viz)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* ── Modal iframe ── */}
      {abierto && (
        <VizModal viz={abierto} theme={theme} isDark={isDark} onCerrar={() => setAbierto(null)} />
      )}
    </div>
  );
}

/* ─── Card individual ──────────────────────────────────────────────────────── */
function VizCard({
  viz, cat, cardBg, cardBorder, cardShadow, theme, isDark, onAbrir,
}: {
  viz: Viz;
  cat: { label: string; color: string; bg: string };
  cardBg: string; cardBorder: string; cardShadow: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theme: any; isDark: boolean;
  onAbrir: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: cardBg,
        border: `1px solid ${hover ? cat.color + '70' : cardBorder}`,
        borderRadius: 10,
        boxShadow: hover
          ? `0 4px 16px ${cat.color}22`
          : cardShadow,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        cursor: 'default',
      }}
    >
      {/* Franja superior de categoría */}
      <div style={{ height: 3, background: cat.color }} />

      {/* Cuerpo */}
      <div style={{ padding: '14px 16px 12px', flex: 1 }}>

        {/* Icono + badge categoría */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 26, lineHeight: 1 }}>{viz.icono}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            padding: '2px 7px', borderRadius: 4,
            color: cat.color, background: cat.bg,
          }}>
            {cat.label}
          </span>
        </div>

        {/* Título */}
        <h3 style={{
          fontSize: 13.5, fontWeight: 700, color: theme.text1,
          margin: '0 0 7px', lineHeight: 1.3,
        }}>
          {viz.titulo}
        </h3>

        {/* Descripción */}
        <p style={{
          fontSize: 11.5, color: theme.muted, margin: '0 0 12px',
          lineHeight: 1.55,
        }}>
          {viz.descripcion}
        </p>

        {/* Badges de características */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
          {viz.badges.map(b => (
            <span key={b} style={{
              fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
              color: isDark ? theme.muted : '#4a5568',
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            }}>{b}</span>
          ))}
        </div>
      </div>

      {/* Botón abrir */}
      <div style={{ padding: '0 16px 14px' }}>
        <button
          onClick={onAbrir}
          style={{
            width: '100%',
            background: hover ? cat.color : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
            color: hover ? '#fff' : cat.color,
            border: `1.5px solid ${cat.color}`,
            borderRadius: 6, padding: '7px 0',
            cursor: 'pointer', fontSize: 12, fontWeight: 700,
            letterSpacing: '0.03em',
            transition: 'background 0.18s, color 0.18s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <span>Abrir</span>
          <span style={{ fontSize: 14 }}>↗</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Modal con iframe ─────────────────────────────────────────────────────── */
function VizModal({
  viz, theme, isDark, onCerrar,
}: {
  viz: Viz;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theme: any; isDark: boolean;
  onCerrar: () => void;
}) {
  const cat = CAT[viz.categoria];

  const headerBg = isDark ? '#0d1b2a' : '#fff';
  const headerBorder = isDark ? 'rgba(255,255,255,0.08)' : theme.border;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', flexDirection: 'column',
        background: isDark ? '#070e16' : '#f0f4f8',
      }}
      onKeyDown={e => e.key === 'Escape' && onCerrar()}
    >
      {/* ── Barra de título ── */}
      <div style={{
        height: 52,
        background: headerBg,
        borderBottom: `1px solid ${headerBorder}`,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px',
        flexShrink: 0,
        boxShadow: isDark ? '0 1px 8px rgba(0,0,0,0.4)' : '0 1px 4px rgba(0,0,0,0.08)',
      }}>
        {/* Indicador de color */}
        <div style={{ width: 4, height: 28, borderRadius: 2, background: cat.color, flexShrink: 0 }} />

        {/* Icono + título */}
        <span style={{ fontSize: 18 }}>{viz.icono}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13.5, fontWeight: 700, color: theme.text1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {viz.titulo}
          </div>
        </div>

        {/* Badge categoría */}
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
          padding: '3px 8px', borderRadius: 4,
          color: cat.color, background: cat.bg,
          flexShrink: 0,
        }}>
          {cat.label}
        </span>

        {/* Separador */}
        <div style={{ width: 1, height: 24, background: headerBorder, flexShrink: 0 }} />

        {/* Aviso de contexto */}
        <span style={{ fontSize: 11, color: theme.muted, whiteSpace: 'nowrap' }}>
          Visualización técnica
        </span>

        {/* Botón cerrar */}
        <button
          onClick={onCerrar}
          title="Cerrar (Esc)"
          style={{
            background: 'none', border: `1px solid ${headerBorder}`,
            color: theme.muted, borderRadius: 6, width: 30, height: 30,
            cursor: 'pointer', fontSize: 16, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#ef4444';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = theme.muted;
            (e.currentTarget as HTMLButtonElement).style.borderColor = headerBorder;
          }}
        >
          ✕
        </button>
      </div>

      {/* ── iframe ── */}
      <iframe
        src={viz.archivo}
        title={viz.titulo}
        style={{
          flex: 1,
          border: 'none',
          width: '100%',
          display: 'block',
          background: '#070e16',
        }}
        allow="fullscreen"
      />
    </div>
  );
}
