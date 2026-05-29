import { useState, useEffect, useMemo } from 'react';
import { getCalidadParametros, getReporteCalidadHtmlUrl } from '../../services/ptarClient';
import { useCalidadData, PROCESO_ORDEN } from './hooks/useCalidadData';
import HistogramaChart          from './components/HistogramaChart';
import PieDistribucionChart     from './components/PieDistribucionChart';
import PercentilChart           from './components/PercentilChart';
import { TablaParams, TablaRangos } from './components/TablaFrecuencias';
import TablaPercentiles              from './components/TablaPercentiles';
import RemociónGemSection            from './components/RemociónGemSection';

// Rango de fechas por defecto: últimos 60 días
function defaultFechas() {
  const hoy = new Date();
  const ini = new Date(hoy);
  ini.setDate(ini.getDate() - 60);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: fmt(ini), fin: fmt(hoy) };
}

export default function CalidadDashboardPage() {
  const { inicio, fin } = defaultFechas();

  // ── Estado de filtros ─────────────────────────────────────────
  const [parametros,      setParametros]      = useState<string[]>([]);
  const [unidadMap,       setUnidadMap]       = useState<Record<string, string>>({});
  const [parametro,       setParametro]       = useState('');
  const [unidadPrincipal, setUnidadPrincipal] = useState('');
  const [turno,           setTurno]           = useState('');
  const [fechaInicio,     setFechaInicio]     = useState(inicio);
  const [fechaFin,        setFechaFin]        = useState(fin);

  // ── Cargar parámetros desde la BD ─────────────────────────────
  useEffect(() => {
    getCalidadParametros().then(data => {
      const map: Record<string, string> = {};
      for (const r of data) if (!map[r.nombre]) map[r.nombre] = r.unidad_medida ?? '';
      const uniq = Object.keys(map).sort();
      setUnidadMap(map);
      setParametros(uniq);
      if (uniq.length > 0) {
        const pref = ['DQO', 'pH', 'SST', 'Color'];
        setParametro(pref.find(p => uniq.includes(p)) ?? uniq[0]);
      }
    }).catch(() => {});
  }, []);

  // ── Hooks de datos ────────────────────────────────────────────
  const { rawRows, unidades } = useCalidadData({
    parametro,
    fechaInicio,
    fechaFin,
    turno: turno || undefined,
    unidadTurno: undefined,
  });

  const unidadMedida = unidadMap[parametro] ?? 'u';

  // ── Derivados filtrados por unidad ───────────────────────────
  const filteredRawRows = useMemo(
    () => unidadPrincipal
      ? rawRows.filter(r => r.unidad_tratamiento === unidadPrincipal)
      : rawRows,
    [rawRows, unidadPrincipal]
  );

  // Spec §3.1: solo valores > 0 (MINIFS con ">0") — ceros excluidos de todos los cálculos
  const valoresFlat = useMemo(
    () => filteredRawRows.map(r => r.valor).filter((v): v is number => v != null && !isNaN(v) && v > 0),
    [filteredRawRows]
  );

  return (
    <div className="cal-page">

      {/* ── Encabezado ── */}
      <div className="cal-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="cal-title">Dashboard de Calidad del Agua</h1>
          <p className="cal-subtitle">Análisis de parámetros fisicoquímicos por etapa de tratamiento</p>
        </div>
        <a
          href={getReporteCalidadHtmlUrl({ fecha_inicio: fechaInicio, fecha_fin: fechaFin })}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary btn-sm"
          style={{ background: '#d29922', textDecoration: 'none', alignSelf: 'center', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, color: '#fff' }}
          title="Abre el informe en una nueva pestaña — usa Ctrl+P para guardar como PDF"
        >
          📄 Informe de Calidad
        </a>
      </div>

      {/* ── Panel de filtros ── */}
      <div className="cal-filters" style={{ marginBottom: 16 }}>
        <div className="cal-filter-group">
          <label className="cal-filter-label">Unidad</label>
          <select className="cal-filter-select" value={unidadPrincipal}
            onChange={e => setUnidadPrincipal(e.target.value)}>
            <option value="">Todas las unidades</option>
            {PROCESO_ORDEN.filter(u => unidades.includes(u)).map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div className="cal-filter-group">
          <label className="cal-filter-label">Parámetro</label>
          <select className="cal-filter-select" value={parametro}
            onChange={e => setParametro(e.target.value)}>
            {parametros.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="cal-filter-group">
          <label className="cal-filter-label">Turno</label>
          <select className="cal-filter-select" value={turno}
            onChange={e => setTurno(e.target.value)}>
            <option value="">Todos</option>
            <option value="noche">Noche</option>
            <option value="mañana">Mañana</option>
            <option value="tarde">Tarde</option>
          </select>
        </div>
        <div className="cal-filter-group">
          <label className="cal-filter-label">Fecha inicio</label>
          <input type="date" className="cal-filter-input" value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)} />
        </div>
        <div className="cal-filter-group">
          <label className="cal-filter-label">Fecha fin</label>
          <input type="date" className="cal-filter-input" value={fechaFin}
            onChange={e => setFechaFin(e.target.value)} />
        </div>
      </div>

      {/* ── Distribución y Comportamiento Multiparámetro ── */}
      <section className="dash-section">
        <div style={{
          background: '#d29922',
          color: '#fff',
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: '0.08em',
          padding: '6px 16px',
          marginBottom: 16,
          borderRadius: 4,
          textAlign: 'center',
        }}>
          DISTRIBUCIÓN Y COMPORTAMIENTO MULTIPARÁMETRO
        </div>
        {/* ── Gráficos ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8, fontWeight: 600, textTransform: 'uppercase' }}>
              Frecuencia
            </div>
            <HistogramaChart values={valoresFlat} unidad_medida={unidadMedida} />
          </div>
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8, fontWeight: 600, textTransform: 'uppercase' }}>
              Distribución
            </div>
            <PieDistribucionChart values={valoresFlat} unidad_medida={unidadMedida} />
          </div>
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8, fontWeight: 600, textTransform: 'uppercase' }}>
              Distribución Percentil
            </div>
            <PercentilChart values={valoresFlat} unidad_medida={unidadMedida} />
          </div>
        </div>

        {/* ── Tablas: Parámetros | Distribución frecuencias | Percentiles ── */}
        {/* align-items:start → cada card su altura natural; Percentiles scrollea internamente */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr', gap: 16, marginTop: 16, alignItems: 'start' }}>
          <div className="dash-card" style={{ padding: 14 }}>
            <TablaParams values={valoresFlat} unidad_medida={unidadMedida} />
          </div>
          <div className="dash-card" style={{ padding: 14 }}>
            <TablaRangos values={valoresFlat} />
          </div>
          <div className="dash-card" style={{ padding: 14 }}>
            <TablaPercentiles values={valoresFlat} unidad_medida={unidadMedida} />
          </div>
        </div>
      </section>

      {/* ── Remoción Sistema GEM — filtro independiente interno ── */}
      <RemociónGemSection fechaInicio={fechaInicio} fechaFin={fechaFin} />

    </div>
  );
}
