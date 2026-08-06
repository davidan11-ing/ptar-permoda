// Dashboard principal de calidad del agua con filtros, gráficos estadísticos y secciones configurables
import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../state/ThemeContext';
import { getCalidadParametros } from '../../services/ptarClient';
import InformeCalidadModal from './InformeCalidadModal';
import { useCalidadData, PROCESO_ORDEN } from './hooks/useCalidadData';
import GranularidadSelector from '../../components/shared/GranularidadSelector';
import { useGranularidad } from '../../hooks/useGranularidad';
import HistogramaChart          from './components/HistogramaChart';
import PieDistribucionChart     from './components/PieDistribucionChart';
import PercentilChart           from './components/PercentilChart';
import { TablaParams, TablaRangos } from './components/TablaFrecuencias';
import TablaPercentiles              from './components/TablaPercentiles';
import RemociónGemSection            from './components/RemociónGemSection';
import RemocionCostoChart           from './components/RemocionCostoChart';
import ParamVsDosisSection          from './components/ParamVsDosisSection';
import CargaRemovoidaSection        from './components/CargaRemovoidaSection';
import KgQuimicoSection             from './components/KgQuimicoSection';
import type { CalidadVizFilters } from '../../types/dashboardConfig';

// Tipos para el modo visualizador embebido
interface VizConfig { sections: string[]; filters: CalidadVizFilters }
interface Props { vizConfig?: VizConfig }

// Página principal del Dashboard de Calidad del Agua
export default function CalidadDashboardPage({ vizConfig }: Props = {}) {
  const isViz = !!vizConfig;
  const { theme } = useTheme();

  // ── Granularidad + fechas — siempre llamado (reglas de hooks) ─────────────
  const baseHook = useGranularidad({});
  const granularidad  = isViz ? (vizConfig!.filters.granularidad as ReturnType<typeof useGranularidad>['granularidad']) : baseHook.granularidad;
  const fechaInicio   = isViz ? vizConfig!.filters.fechaInicio : baseHook.fechaInicio;
  const fechaFin      = isViz ? vizConfig!.filters.fechaFin    : baseHook.fechaFin;
  const draftInicio   = baseHook.draftInicio;
  const draftFin      = baseHook.draftFin;
  const { handleFechaInicio, handleFechaFin, commitFechaInicio, commitFechaFin, setGranularidad } = baseHook;

  // ── Estado de filtros ─────────────────────────────────────────
  // Lista de parámetros disponibles y unidades cargados desde BD
  const [parametros,      setParametros]      = useState<string[]>([]);
  const [unidadMap,       setUnidadMap]       = useState<Record<string, string>>({});
  // Filtros activos del usuario
  const [parametro,       setParametro]       = useState(isViz ? vizConfig!.filters.parametro : '');
  const [unidadPrincipal, setUnidadPrincipal] = useState('');
  const [turno,           setTurno]           = useState(isViz ? vizConfig!.filters.turno : '');
  const [remGemParam,     setRemGemParam]     = useState('');
  // Control de visibilidad de paneles
  const [informeAbierto,  setInformeAbierto]  = useState(false);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  // Determina si una sección debe renderizarse según la config del visualizador
  const show = (key: string) => !vizConfig || vizConfig.sections.includes(key);

  // ── Cargar parámetros desde la BD ─────────────────────────────
  useEffect(() => {
    getCalidadParametros().then(data => {
      const map: Record<string, string> = {};
      for (const r of data) if (!map[r.nombre]) map[r.nombre] = r.unidad_medida ?? '';
      const uniq = Object.keys(map).sort();
      setUnidadMap(map);
      setParametros(uniq);
      if (!isViz && uniq.length > 0) {
        // Selecciona por defecto un parámetro prioritario si está disponible
        const pref = ['pH', 'DQO', 'SST', 'Color'];
        setParametro(pref.find(p => uniq.includes(p)) ?? uniq[0]);
      }
    }).catch(() => {});
  }, [isViz]);

  // ── Hooks de datos ────────────────────────────────────────────
  // Filas crudas de calidad según filtros activos
  const { rawRows, unidades } = useCalidadData({
    parametro,
    fechaInicio,
    fechaFin,
    turno: turno || undefined,
    unidadTurno: undefined,
  });

  // Unidad de medida del parámetro seleccionado
  const unidadMedida = unidadMap[parametro] ?? 'u';

  // ── Derivados filtrados por unidad ───────────────────────────
  // Filas filtradas por unidad de tratamiento seleccionada
  const filteredRawRows = useMemo(
    () => unidadPrincipal
      ? rawRows.filter(r => r.unidad_tratamiento === unidadPrincipal)
      : rawRows,
    [rawRows, unidadPrincipal]
  );

  // Spec §3.1: solo valores > 0 (MINIFS con ">0") — ceros excluidos de todos los cálculos
  // Array plano de valores válidos para cálculos estadísticos
  const valoresFlat = useMemo(
    () => filteredRawRows.map(r => r.valor).filter((v): v is number => v != null && !isNaN(v) && v > 0),
    [filteredRawRows]
  );

  return (
    <>
    <div className="cal-page">

      {/* ── Encabezado ── */}
      <div className="cal-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="cal-title">Dashboard de Calidad del Agua</h1>
          <p className="cal-subtitle">Análisis de parámetros fisicoquímicos por etapa de tratamiento</p>
        </div>
        {!isViz && (
          <div style={{ display: 'flex', gap: 8, alignSelf: 'center' }}>
            <button
              onClick={() => setFiltrosAbiertos(v => !v)}
              style={{ background: filtrosAbiertos ? theme.surface2 : theme.surface, border: `1px solid ${theme.border}`, padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: theme.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span style={{ fontSize: 13 }}>⚙</span>
              Filtros
              <span style={{ fontSize: 10, opacity: 0.7 }}>{filtrosAbiertos ? '▲' : '▼'}</span>
            </button>
            <button
              onClick={() => setInformeAbierto(true)}
              style={{ background: theme.amber, border: 'none', padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
            >
              📄 Informe
            </button>
          </div>
        )}
      </div>

      {/* ── Filtros (colapsables) ── */}
      {!isViz && filtrosAbiertos && (
        <div className="cal-filters" style={{ marginBottom: 16 }}>
          <GranularidadSelector value={granularidad} onChange={setGranularidad} />
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
            <input type="date" className="cal-filter-input" value={draftInicio}
              onChange={e => handleFechaInicio(e.target.value)}
              onBlur={e  => commitFechaInicio(e.target.value)} />
          </div>
          <div className="cal-filter-group">
            <label className="cal-filter-label">Fecha fin</label>
            <input type="date" className="cal-filter-input" value={draftFin}
              onChange={e => handleFechaFin(e.target.value)}
              onBlur={e  => commitFechaFin(e.target.value)} />
          </div>
        </div>
      )}

      {/* ── Distribución y Comportamiento Multiparámetro ── */}
      {show('distribucion') && <section className="dash-section">
        <div style={{
          background: theme.amber,
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
        {/* ── Gráficos: histograma, torta y percentil ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: theme.muted, marginBottom: 6, paddingLeft: 8, fontWeight: 600, textTransform: 'uppercase' }}>
              Frecuencia
            </div>
            <HistogramaChart values={valoresFlat} unidad_medida={unidadMedida} />
          </div>
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: theme.muted, marginBottom: 6, paddingLeft: 8, fontWeight: 600, textTransform: 'uppercase' }}>
              Distribución
            </div>
            <PieDistribucionChart values={valoresFlat} unidad_medida={unidadMedida} />
          </div>
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 11, color: theme.muted, marginBottom: 6, paddingLeft: 8, fontWeight: 600, textTransform: 'uppercase' }}>
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
      </section>}

      {/* ── Remoción Sistema GEM ── */}
      {show('remocion_gem') && (
        <RemociónGemSection
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          parametro={remGemParam || parametro || undefined}
          onParametroChange={setRemGemParam}
          granularidad={granularidad}
        />
      )}

      {/* ── % Remoción vs Costo/m³ turno a turno ── */}
      {show('remocion_costo') && (
        <section className="dash-section">
          <div style={{
            background: theme.chipBlueBg,
            borderLeft: `3px solid ${theme.blue}`,
            padding: '5px 12px',
            marginBottom: 12,
            fontSize: 12,
            fontWeight: 700,
            color: theme.lblue,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            % REMOCIÓN PARÁMETRO Vs $COSTO/M³ — TURNO A TURNO
          </div>
          <div className="dash-card" style={{ padding: '16px 8px 8px' }}>
            <div style={{ fontSize: 12, color: theme.muted, marginBottom: 8, paddingLeft: 8, fontFamily: 'monospace', textAlign: 'center' }}>
              % REMOCIÓN Vs $COSTO/M3
            </div>
            <RemocionCostoChart
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
              parametro={remGemParam || parametro || undefined}
              granularidad={granularidad}
            />
          </div>
        </section>
      )}

      {/* ── Parámetro vs Dosis de reactivo ── */}
      {show('param_vs_dosis') && (
        <ParamVsDosisSection fechaInicio={fechaInicio} fechaFin={fechaFin} granularidad={granularidad} />
      )}

      {/* ── Carga contaminante removida ── */}
      {show('carga_removida') && (
        <CargaRemovoidaSection fechaInicio={fechaInicio} fechaFin={fechaFin} granularidad={granularidad} />
      )}

      {/* ── Consumo de reactivo en kg por unidad química ── */}
      {show('kg_quimico') && (
        <KgQuimicoSection fechaInicio={fechaInicio} fechaFin={fechaFin} granularidad={granularidad} />
      )}

    </div>

    {/* ── Modal Informe de Calidad ── */}
    {informeAbierto && (
      <InformeCalidadModal
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        onClose={() => setInformeAbierto(false)}
      />
    )}
    </>
  );
}
