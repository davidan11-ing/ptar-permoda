import { useState, useEffect, useMemo } from 'react';
import { getCalidadParametros, getReporteCalidadHtmlUrl } from '../../services/ptarClient';
import { useCalidadData, PROCESO_ORDEN } from './hooks/useCalidadData';
import { useCalidadKpis }   from './hooks/useCalidadKpis';
import { useDispersionData } from './hooks/useDispersionData';
import { useMbrEficiencia }  from './hooks/useMbrEficiencia';
import { useGemEficiencia }  from './hooks/useGemEficiencia';
import KpiCompliancePanel    from './components/KpiCompliancePanel';
import TendenciaChart        from './components/TendenciaChart';
import EtapaChart            from './components/EtapaChart';
import TurnoChart            from './components/TurnoChart';
import EficienciaPanel       from './components/EficienciaPanel';
import TablaEstadistica      from './components/TablaEstadistica';
import SegDiarioChart        from './components/SegDiarioChart';
import DispersionChart       from './components/DispersionChart';
import HistogramaChart       from './components/HistogramaChart';
import PieDistribucionChart  from './components/PieDistribucionChart';
import PercentilChart        from './components/PercentilChart';
import SeccionMultiparametro from './components/SeccionMultiparametro';
import MbrEficienciaSection  from './components/MbrEficienciaSection';
import GemEficienciaSection  from './components/GemEficienciaSection';

// Rango de fechas por defecto: últimos 60 días
function defaultFechas() {
  const hoy  = new Date();
  const ini  = new Date(hoy);
  ini.setDate(ini.getDate() - 60);
  const fmt  = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: fmt(ini), fin: fmt(hoy) };
}

const TURNOS = [
  { value: '',       label: 'Todos los turnos' },
  { value: 'noche',  label: 'Noche' },
  { value: 'mañana', label: 'Mañana' },
  { value: 'tarde',  label: 'Tarde' },
];

export default function CalidadDashboardPage() {
  const { inicio, fin } = defaultFechas();

  // ── Estado de filtros ─────────────────────────────────────────
  const [parametros,   setParametros]   = useState<string[]>([]);
  const [unidadMap,    setUnidadMap]    = useState<Record<string, string>>({});
  const [parametro,    setParametro]    = useState('');
  const [fechaInicio,  setFechaInicio]  = useState(inicio);
  const [fechaFin,     setFechaFin]     = useState(fin);
  const [turno,        setTurno]        = useState('');
  const [unidadTurno,  setUnidadTurno]  = useState<string | undefined>(undefined);

  // ── Cargar parámetros y sus unidades desde la BD ─────────────
  useEffect(() => {
    getCalidadParametros().then(data => {
      const map: Record<string, string> = {};
      for (const r of data) {
        if (!map[r.nombre]) map[r.nombre] = r.unidad_medida ?? '';
      }
      const uniq = Object.keys(map).sort();
      setUnidadMap(map);
      setParametros(uniq);
      if (uniq.length > 0 && !parametro) {
        const preferred = ['DQO', 'pH', 'SST', 'Color'];
        const defaultParam = preferred.find(p => uniq.includes(p)) ?? uniq[0];
        setParametro(defaultParam);
      }
    }).catch(() => {/* si falla, los selectores quedan vacíos */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Hook KPIs de cumplimiento (siempre carga, independiente del filtro) ──
  const {
    loading: kpiLoading,
    kpis,
    remociones,
  } = useCalidadKpis(fechaInicio, fechaFin);

  // ── Hook de datos del parámetro seleccionado ─────────────────
  const {
    loading, error,
    rawRows,
    unidades, tendencia, summary, turnoRows, eficiencia, tieneRemocion,
  } = useCalidadData({
    parametro,
    fechaInicio,
    fechaFin,
    turno: turno || undefined,
    unidadTurno,
  });

  // ── Hooks de datos adicionales ────────────────────────────────
  const { data: dispersionData } = useDispersionData(parametro, fechaInicio, fechaFin);
  const { data: mbrData, loading: mbrLoading } = useMbrEficiencia(fechaInicio, fechaFin);
  const { data: gemData, loading: gemLoading } = useGemEficiencia(fechaInicio, fechaFin);

  // Unidad de medida real desde la BD
  const unidadMedida = unidadMap[parametro] ?? 'u';

  // Selector de unidad para TurnoChart
  const unidadTurnoFinal = unidadTurno ?? unidades[0] ?? '';

  // Valores planos para histograma / pie / percentiles (todas las unidades)
  const valoresFlat = useMemo((): number[] => {
    return rawRows.map(r => r.valor).filter(v => v != null && !isNaN(v));
  }, [rawRows]);

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

      {/* ── Sección 1: KPIs de cumplimiento normativo (siempre visible) ── */}
      <div className="dash-card" style={{ padding: '20px' }}>
        <KpiCompliancePanel
          kpis={kpis}
          remociones={remociones}
          loading={kpiLoading}
        />
      </div>

      {/* ── Panel de filtros ── */}
      <div className="cal-filters">
        <div className="cal-filter-group">
          <label className="cal-filter-label">Parámetro</label>
          <select
            className="cal-filter-select"
            value={parametro}
            onChange={e => { setParametro(e.target.value); setUnidadTurno(undefined); }}
          >
            {parametros.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="cal-filter-group">
          <label className="cal-filter-label">Fecha inicio</label>
          <input
            type="date"
            className="cal-filter-input"
            value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
          />
        </div>

        <div className="cal-filter-group">
          <label className="cal-filter-label">Fecha fin</label>
          <input
            type="date"
            className="cal-filter-input"
            value={fechaFin}
            onChange={e => setFechaFin(e.target.value)}
          />
        </div>

        <div className="cal-filter-group">
          <label className="cal-filter-label">Turno</label>
          <select
            className="cal-filter-select"
            value={turno}
            onChange={e => setTurno(e.target.value)}
          >
            {TURNOS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Estado de carga / error ── */}
      {loading && (
        <div className="cal-loading">
          <div className="spinner" />
          <span>Cargando datos de {parametro}…</span>
        </div>
      )}
      {error && (
        <div className="cal-error">Error al cargar datos: {error}</div>
      )}

      {!loading && !error && (
        <>
          {/* ── Sección 2: Tendencia por fecha ── */}
          <section className="cal-section">
            <div className="cal-section-header">
              <h2 className="cal-section-title">Tendencia por fecha</h2>
              <span className="cal-section-meta">{parametro} · {unidadMedida}</span>
            </div>
            <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
              <TendenciaChart
                data={tendencia}
                unidades={unidades}
                unidad_medida={unidadMedida}
              />
            </div>
          </section>

          {/* ── Sección 3: Comparativo por etapa ── */}
          <section className="cal-section">
            <div className="cal-section-header">
              <h2 className="cal-section-title">Comparativo por etapa de tratamiento</h2>
              <span className="cal-section-meta">Promedio del período · {unidadMedida}</span>
            </div>
            <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
              <EtapaChart summary={summary} unidad_medida={unidadMedida} />
            </div>
          </section>

          {/* ── Secciones 4 + 5 lado a lado (si hay remoción) ── */}
          <div className={tieneRemocion ? 'cal-row-2col' : ''}>
            {/* ── Sección 4: Comparativo por turno ── */}
            <section className="cal-section">
              <div className="cal-section-header">
                <h2 className="cal-section-title">Comparativo por turno</h2>
                <div className="cal-turno-selector">
                  <label className="cal-filter-label" style={{ marginBottom: 0 }}>Unidad:</label>
                  <select
                    className="cal-filter-select cal-filter-select-sm"
                    value={unidadTurnoFinal}
                    onChange={e => setUnidadTurno(e.target.value)}
                  >
                    {PROCESO_ORDEN.filter(u => unidades.includes(u)).map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
                <TurnoChart
                  data={turnoRows}
                  unidad_medida={unidadMedida}
                  unidad={unidadTurnoFinal}
                />
              </div>
            </section>

            {/* ── Sección 5: Eficiencia de remoción (solo si aplica) ── */}
            {tieneRemocion && (
              <section className="cal-section">
                <div className="cal-section-header">
                  <h2 className="cal-section-title">Eficiencia de remoción</h2>
                  <span className="cal-section-meta">% de reducción entre etapas · {parametro}</span>
                </div>
                <div className="dash-card" style={{ padding: '20px' }}>
                  <EficienciaPanel eficiencia={eficiencia} />
                </div>
              </section>
            )}
          </div>

          {/* ── Sección 6: Tabla estadística ── */}
          <section className="cal-section">
            <div className="cal-section-header">
              <h2 className="cal-section-title">Estadística por unidad de tratamiento</h2>
              <span className="cal-section-meta">Mín / Prom / Máx del período seleccionado · {parametro}</span>
            </div>
            <div className="dash-card" style={{ padding: '0' }}>
              <TablaEstadistica summary={summary} unidad_medida={unidadMedida} />
            </div>
          </section>

          {/* ── Sección 7: Seguimiento Diario por Turno ── */}
          <section className="cal-section">
            <div className="cal-section-header">
              <h2 className="cal-section-title">Seguimiento Diario por Turno</h2>
              <span className="cal-section-meta">{parametro} · {unidadMedida}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
                <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
                  Promedio por turno y fecha (todas las unidades)
                </div>
                <SegDiarioChart data={rawRows} unidad_medida={unidadMedida} />
              </div>
              <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
                <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, paddingLeft: 8 }}>
                  Dispersión agregada (mín/prom/máx) — todas las unidades
                </div>
                <DispersionChart data={dispersionData} unidadFiltrada="ALL" unidad_medida={unidadMedida} />
              </div>
            </div>
          </section>

          {/* ── Sección 8: Multiparámetro por grupos ── */}
          <SeccionMultiparametro
            rawData={rawRows}
            dispersionData={dispersionData}
            unidad_medida={unidadMedida}
          />

          {/* ── Sección 9: Distribución estadística ── */}
          <section className="cal-section">
            <div className="cal-section-header">
              <h2 className="cal-section-title">Distribución estadística — {parametro}</h2>
              <span className="cal-section-meta">Basado en {valoresFlat.length} mediciones del período · {unidadMedida}</span>
            </div>
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
        </>
      )}

      {/* ── Sección 10: Eficiencia MBR (independiente del parámetro seleccionado) ── */}
      <MbrEficienciaSection data={mbrData} loading={mbrLoading} />

      {/* ── Sección 11: Eficiencia GEM (independiente del parámetro seleccionado) ── */}
      <GemEficienciaSection data={gemData} loading={gemLoading} />
    </div>
  );
}
