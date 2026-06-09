/**
 * RegistrosPanel — Panel de revisión y edición de formularios del operario
 * Accesible desde el Dashboard del encargado.
 * 3 tabs: Calidad (F-03) | Reactivos GEM (F-02) | Caudales (F-01)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../lib/routes';
import TablaCalidad    from './components/TablaCalidad';
import TablaReactivos  from './components/TablaReactivos';
import TablaCaudales   from './components/TablaCaudales';

type Tab = 'calidad' | 'reactivos' | 'caudales';

function defaultFechas() {
  const hoy = new Date();
  const ini = new Date(hoy); ini.setDate(ini.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: fmt(ini), fin: fmt(hoy) };
}

export default function RegistrosPanel() {
  const navigate = useNavigate();
  const { inicio, fin } = defaultFechas();

  const [tab,          setTab]          = useState<Tab>('calidad');
  const [fechaInicio,  setFechaInicio]  = useState(inicio);
  const [fechaFin,     setFechaFin]     = useState(fin);
  const [turno,        setTurno]        = useState('');
  const [buscar,       setBuscar]       = useState(false);

  const tabs: { key: Tab; label: string; badge: string }[] = [
    { key: 'calidad',   label: 'Calidad del Agua',   badge: 'F-03' },
    { key: 'reactivos', label: 'Reactivos Químicos', badge: 'F-02' },
    { key: 'caudales',  label: 'Caudales',           badge: 'F-01' },
  ];

  return (
    <div style={{ padding: '20px 24px', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <button
          onClick={() => navigate(ROUTES.ENCARGADO_DASHBOARD)}
          style={{
            background: 'none', border: '1px solid #30363d', color: '#8b949e',
            borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          ← Volver
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e6edf3', margin: 0 }}>
            📋 Registros de Operarios
          </h1>
          <p style={{ fontSize: 12, color: '#8b949e', margin: '2px 0 0' }}>
            Revisa y edita los formularios ingresados por los operarios
          </p>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 18, flexWrap: 'wrap',
        background: '#161b22', border: '1px solid #30363d',
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
            background: '#1f6feb', color: '#fff', border: 'none',
            borderRadius: 6, padding: '7px 18px', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
          }}
        >
          🔍 Buscar
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #21262d' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: tab === t.key ? '#1f6feb22' : 'transparent',
            border: 'none',
            borderBottom: tab === t.key ? '2px solid #1f6feb' : '2px solid transparent',
            color: tab === t.key ? '#58a6ff' : '#8b949e',
            padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              background: tab === t.key ? '#1f6feb' : '#30363d',
              color: '#fff', fontSize: 10, fontWeight: 700,
              padding: '1px 6px', borderRadius: 4,
            }}>{t.badge}</span>
            {t.label}
          </button>
        ))}
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
    </div>
  );
}
