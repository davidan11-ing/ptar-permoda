/**
 * RegistrosPanel — Panel de revisión y edición de formularios del operario
 * Accesible desde el Dashboard del encargado.
 * 4 tabs: Calidad (F-03) | Reactivos GEM (F-02) | Caudales (F-01) | Revisión Técnica (RO)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../state/ThemeContext';
import { ROUTES } from '../../lib/routes';
import TablaCalidad    from './components/TablaCalidad';
import TablaReactivos  from './components/TablaReactivos';
import TablaCaudales   from './components/TablaCaudales';
import PlanosPanel     from './components/PlanosPanel';

type Tab = 'calidad' | 'reactivos' | 'caudales' | 'planos';

function defaultFechas() {
  const hoy = new Date();
  const ini = new Date(hoy); ini.setDate(ini.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: fmt(ini), fin: fmt(hoy) };
}

export default function RegistrosPanel() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { inicio, fin } = defaultFechas();

  const [tab,          setTab]          = useState<Tab>('calidad');
  const [fechaInicio,  setFechaInicio]  = useState(inicio);
  const [fechaFin,     setFechaFin]     = useState(fin);
  const [turno,        setTurno]        = useState('');
  const [buscar,       setBuscar]       = useState(false);

  const tabs: { key: Tab; label: string; badge: string; accent?: string }[] = [
    { key: 'calidad',   label: 'Calidad del Agua',   badge: 'F-03' },
    { key: 'reactivos', label: 'Reactivos Químicos', badge: 'F-02' },
    { key: 'caudales',  label: 'Caudales',           badge: 'F-01' },
    { key: 'planos',    label: 'Revisión Técnica',   badge: 'RO',   accent: '#8b5cf6' },
  ];

  return (
    <div style={{ padding: '20px 24px', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <button
          onClick={() => navigate(ROUTES.ENCARGADO_DASHBOARD)}
          style={{
            background: 'none', border: `1px solid ${theme.border}`, color: theme.muted,
            borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          ← Volver
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: theme.text1, margin: 0 }}>
            📋 Registros de Operarios
          </h1>
          <p style={{ fontSize: 12, color: theme.muted, margin: '2px 0 0' }}>
            Revisa y edita los formularios ingresados por los operarios
          </p>
        </div>
      </div>

      {/* ── Filtros (solo en tabs de registros) ── */}
      {tab !== 'planos' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          marginBottom: 18, flexWrap: 'wrap',
          background: theme.surface, border: `1px solid ${theme.border}`,
          borderRadius: 8, padding: '12px 16px',
        }}>
          <label className="cal-filter-label">Fecha inicio</label>
          <input type="date" className="cal-filter-input" value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)} />

          <label className="cal-filter-label">Fecha fin</label>
          <input type="date" className="cal-filter-input" value={fechaFin}
            onChange={e => setFechaFin(e.target.value)} />

          <label className="cal-filter-label">Turno</label>
          <select className="cal-filter-select" value={turno}
            onChange={e => setTurno(e.target.value)} style={{ minWidth: 120 }}>
            <option value="">Todos</option>
            <option value="1">Noche</option>
            <option value="2">Mañana</option>
            <option value="3">Tarde</option>
          </select>

          <button
            onClick={() => setBuscar(b => !b)}
            style={{
              background: theme.blue, color: '#fff', border: 'none',
              borderRadius: 6, padding: '7px 18px', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
            }}
          >
            🔍 Buscar
          </button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${theme.border2}` }}>
        {tabs.map((t, i) => {
          const isActive  = tab === t.key;
          const color     = t.accent ?? theme.blue;
          const chipBg    = isActive ? color : theme.border;
          const tabBg     = isActive
            ? (t.accent ? `${t.accent}14` : theme.chipBlueBg)
            : 'transparent';
          const textColor = isActive
            ? (t.accent ?? theme.lblue)
            : theme.muted;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: tabBg,
              border: 'none',
              borderLeft: i === tabs.length - 1 ? `1px solid ${theme.border2}` : 'none',
              borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
              color: textColor,
              padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
              marginLeft: i === tabs.length - 1 ? 'auto' : 0,
            }}>
              <span style={{
                background: chipBg,
                color: '#fff', fontSize: 10, fontWeight: 700,
                padding: '1px 6px', borderRadius: 4,
              }}>{t.badge}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Contenido del tab ── */}
      {tab === 'calidad'   && (
        <TablaCalidad
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          turno={turno ? parseInt(turno) : undefined}
          trigger={buscar}
        />
      )}
      {tab === 'reactivos' && (
        <TablaReactivos
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          trigger={buscar}
        />
      )}
      {tab === 'caudales'  && (
        <TablaCaudales
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          trigger={buscar}
        />
      )}
      {tab === 'planos' && <PlanosPanel />}
    </div>
  );
}
