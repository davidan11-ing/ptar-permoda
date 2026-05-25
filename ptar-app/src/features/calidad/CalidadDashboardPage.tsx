import { useState, useEffect, useMemo } from 'react';
import { getCalidadParametros, getReporteCalidadHtmlUrl } from '../../services/ptarClient';
import { useCalidadData, PROCESO_ORDEN } from './hooks/useCalidadData';
import { useDispersionData }    from './hooks/useDispersionData';
import { useMbrEficiencia }     from './hooks/useMbrEficiencia';
import { useGemEficiencia }     from './hooks/useGemEficiencia';
import SegDiarioChart           from './components/SegDiarioChart';
import DispersionChart          from './components/DispersionChart';
import HistogramaChart          from './components/HistogramaChart';
import PieDistribucionChart     from './components/PieDistribucionChart';
import PercentilChart           from './components/PercentilChart';
import SeccionMultiparametro    from './components/SeccionMultiparametro';
import MbrEficienciaSection     from './components/MbrEficienciaSection';
import GemEficienciaSection     from './components/GemEficienciaSection';

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

  const { data: dispersion }              = useDispersionData(parametro, fechaInicio, fechaFin);
  const { data: mbrData, loading: mbrLoading } = useMbrEficiencia(fechaInicio, fechaFin);
  const { data: gemData, loading: gemLoading } = useGemEficiencia(fechaInicio, fechaFin);

  const unidadMedida = unidadMap[parametro] ?? 'u';

  // ── Derivados filtrados por unidad ───────────────────────────
  const filteredRawRows = useMemo(
    () => unidadPrincipal
      ? rawRows.filter(r => r.unidad_tratamiento === unidadPrincipal)
      : rawRows,
    [rawRows, unidadPrincipal]
  );

  const valoresFlat = useMemo(
    () => filteredRawRows.map(r => r.valor).filter((v): v is number => v != null && !isNaN(v)),
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

      {/* ── Seguimiento Diario por Turno ── */}
      <section className="dash-section">
        <div className="section-title">
          Seguimiento Diario por Turno — {parametro}
          {unidadPrincipal && <span style={{ color: '#8b949e', fontWeight: 400, marginLeft: 8 }}>· {unidadPrincipal}</span>}
        </div>
        <div className="dash-row-2col">
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Promedio por turno y fecha (todas las unidades)
            </div>
            <SegDiarioChart data={filteredRawRows} unidad_medida={unidadMedida} />
          </div>
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Dispersión agregada (mín/prom/máx) — todas las unidades
            </div>
            <DispersionChart data={dispersion} unidadFiltrada={unidadPrincipal || 'ALL'} unidad_medida={unidadMedida} />
          </div>
        </div>
      </section>

      {/* ── Multiparámetro por grupos ── */}
      <SeccionMultiparametro
        rawData={filteredRawRows}
        dispersionData={dispersion}
        unidad_medida={unidadMedida}
      />

      {/* ── Distribución Estadística ── */}
      <section className="dash-section">
        <div className="section-title">Distribución Estadística — {parametro}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Histograma de frecuencias
            </div>
            <HistogramaChart values={valoresFlat} unidad_medida={unidadMedida} />
          </div>
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Distribución porcentual
            </div>
            <PieDistribucionChart values={valoresFlat} unidad_medida={unidadMedida} />
          </div>
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
              Percentiles (P10 – P90)
            </div>
            <PercentilChart values={valoresFlat} unidad_medida={unidadMedida} />
          </div>
        </div>
      </section>

      {/* ── Eficiencia MBR ── */}
      <MbrEficienciaSection data={mbrData} loading={mbrLoading} />

      {/* ── Eficiencia GEM ── */}
      <GemEficienciaSection data={gemData} loading={gemLoading} />

    </div>
  );
}
