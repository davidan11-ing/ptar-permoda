// Modal de configuración del Panel Visualizador — secciones y filtros por dashboard
import { useState, useEffect } from 'react';
import {
  type DashboardConfig,
  DEFAULT_CONFIG,
  CALIDAD_SECTIONS,
  BALANCE_SECTIONS,
  COSTOS_SECTIONS,
  RESUMEN_SECTIONS,
} from '../../types/dashboardConfig';
import { getDashboardConfig, saveDashboardConfig } from '../../services/ptarClient';

interface Props { onClose: () => void }

type Tab = 'resumen' | 'calidad' | 'balance' | 'costos';

// Fechas de rango por defecto: hoy y hace 30 días
const hoy = new Date().toISOString().slice(0, 10);
const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

// Selector reutilizable de granularidad temporal
const GranSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
    <option value="turno">Turno</option>
    <option value="dia">Día</option>
    <option value="semana">Semana</option>
    <option value="mes">Mes</option>
  </select>
);

// Estilo base para inputs y selects del modal
const inputStyle: React.CSSProperties = {
  background: '#0d1117',
  border: '1px solid #30363d',
  borderRadius: 5,
  color: '#e6edf3',
  padding: '5px 8px',
  fontSize: 11,
};

// Estilo de etiqueta de campo de filtro
const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#8b949e',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 3,
  display: 'block',
};

// ── Componentes de filtros definidos FUERA del componente principal ──
// Si se definen adentro React los desmonta en cada render y el input pierde foco.
// Las fechas ya NO se configuran aquí — hay un único rango compartido arriba de las pestañas.

const FiltersCalidad = ({ f, onFilter }: { f: { parametro: string; turno: string; granularidad: string }; onFilter: (k: string, v: string) => void }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
    <div>
      <label style={labelStyle}>Parámetro</label>
      <input value={f.parametro} onChange={e => onFilter('parametro', e.target.value)} style={{ ...inputStyle, width: '100%' }} placeholder="pH" />
    </div>
    <div>
      <label style={labelStyle}>Turno</label>
      <select value={f.turno} onChange={e => onFilter('turno', e.target.value)} style={{ ...inputStyle, width: '100%' }}>
        <option value="">Todos</option>
        <option value="noche">Noche</option>
        <option value="mañana">Mañana</option>
        <option value="tarde">Tarde</option>
      </select>
    </div>
    <div>
      <label style={labelStyle}>Granularidad</label>
      <GranSelect value={f.granularidad} onChange={v => onFilter('granularidad', v)} />
    </div>
  </div>
);

const FiltersBalance = ({ f, onFilter }: { f: { turno: string; granularidad: string }; onFilter: (k: string, v: string) => void }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
    <div>
      <label style={labelStyle}>Turno</label>
      <select value={f.turno} onChange={e => onFilter('turno', e.target.value)} style={{ ...inputStyle, width: '100%' }}>
        <option value="">Todos</option>
        <option value="1">Noche</option>
        <option value="2">Mañana</option>
        <option value="3">Tarde</option>
      </select>
    </div>
    <div>
      <label style={labelStyle}>Granularidad</label>
      <GranSelect value={f.granularidad} onChange={v => onFilter('granularidad', v)} />
    </div>
  </div>
);

const FiltersCostos = ({ f, onFilter }: { f: { sistema: string; granularidad: string }; onFilter: (k: string, v: string) => void }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
    <div>
      <label style={labelStyle}>Sistema</label>
      <select value={f.sistema} onChange={e => onFilter('sistema', e.target.value)} style={{ ...inputStyle, width: '100%' }}>
        <option value="">Todos</option>
        <option value="GEM">GEM</option>
        <option value="RO">RO</option>
        <option value="PTAP">PTAP</option>
      </select>
    </div>
    <div>
      <label style={labelStyle}>Granularidad</label>
      <GranSelect value={f.granularidad} onChange={v => onFilter('granularidad', v)} />
    </div>
  </div>
);

// Modal completo de configuración del visualizador con pestanas por módulo
export default function VisualizadorConfigModal({ onClose }: Props) {
  // Configuración activa del visualizador
  const [config, setConfig] = useState<DashboardConfig>(DEFAULT_CONFIG);
  // Pestaña activa del modal
  const [tab,    setTab]    = useState<Tab>('resumen');
  // Estado de guardado en curso
  const [saving, setSaving] = useState(false);
  // Confirmación visual de guardado exitoso
  const [saved,  setSaved]  = useState(false);
  // Carga inicial de la configuración guardada
  const [loading, setLoading] = useState(true);

  // Carga la configuración persistida y aplica valores por defecto donde falten
  useEffect(() => {
    getDashboardConfig()
      .then(cfg => {
        const base = { ...DEFAULT_CONFIG };
        if (cfg.resumen) base.resumen = { ...DEFAULT_CONFIG.resumen!, ...cfg.resumen, filters: { ...DEFAULT_CONFIG.resumen!.filters, ...cfg.resumen.filters } };
        if (cfg.calidad) base.calidad = { ...DEFAULT_CONFIG.calidad, ...cfg.calidad, filters: { ...DEFAULT_CONFIG.calidad.filters, ...cfg.calidad.filters } };
        if (cfg.balance) base.balance = { ...DEFAULT_CONFIG.balance, ...cfg.balance, filters: { ...DEFAULT_CONFIG.balance.filters, ...cfg.balance.filters } };
        if (cfg.costos)  base.costos  = { ...DEFAULT_CONFIG.costos,  ...cfg.costos,  filters: { ...DEFAULT_CONFIG.costos.filters,  ...cfg.costos.filters  } };
        if (!base.resumen!.filters.fechaInicio) { base.resumen!.filters.fechaInicio = hace30; base.resumen!.filters.fechaFin = hoy; }
        if (!base.calidad.filters.fechaInicio) { base.calidad.filters.fechaInicio = hace30; base.calidad.filters.fechaFin = hoy; }
        if (!base.balance.filters.fechaInicio) { base.balance.filters.fechaInicio = hace30; base.balance.filters.fechaFin = hoy; }
        if (!base.costos.filters.fechaInicio)  { base.costos.filters.fechaInicio  = hace30; base.costos.filters.fechaFin  = hoy; }
        setConfig(base);
      })
      .catch(() => {
        setConfig(prev => ({
          ...prev,
          resumen: { ...prev.resumen!, filters: { ...prev.resumen!.filters, fechaInicio: hace30, fechaFin: hoy } },
          calidad: { ...prev.calidad, filters: { ...prev.calidad.filters, fechaInicio: hace30, fechaFin: hoy } },
          balance: { ...prev.balance, filters: { ...prev.balance.filters, fechaInicio: hace30, fechaFin: hoy } },
          costos:  { ...prev.costos,  filters: { ...prev.costos.filters,  fechaInicio: hace30, fechaFin: hoy } },
        }));
      })
      .finally(() => setLoading(false));
  }, []);

  // Activa o desactiva una sección dentro del dashboard activo
  const toggleSection = (dash: Tab, key: string) => {
    setConfig(prev => {
      const block = prev[dash]!;
      const sections = block.sections.includes(key)
        ? block.sections.filter(s => s !== key)
        : [...block.sections, key];
      return { ...prev, [dash]: { ...block, sections } };
    });
  };

  // Habilita o deshabilita un dashboard completo
  const setEnabled = (dash: Tab, v: boolean) =>
    setConfig(prev => ({ ...prev, [dash]: { ...prev[dash]!, enabled: v } }));

  // Actualiza un filtro individual del dashboard activo
  const setFilter = (dash: Tab, key: string, val: string) =>
    setConfig(prev => ({
      ...prev,
      [dash]: { ...prev[dash]!, filters: { ...prev[dash]!.filters, [key]: val } },
    }));

  // Actualiza fechaInicio/fechaFin en las 4 pestañas a la vez — un solo rango compartido
  const setSharedDate = (key: 'fechaInicio' | 'fechaFin', val: string) =>
    setConfig(prev => ({
      ...prev,
      resumen: { ...prev.resumen!, filters: { ...prev.resumen!.filters, [key]: val } },
      calidad: { ...prev.calidad,  filters: { ...prev.calidad.filters,  [key]: val } },
      balance: { ...prev.balance,  filters: { ...prev.balance.filters,  [key]: val } },
      costos:  { ...prev.costos,   filters: { ...prev.costos.filters,   [key]: val } },
    }));

  // Persiste la configuración y cierra el modal tras confirmación visual
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: DashboardConfig = {
        ...config,
        savedAt: new Date().toISOString(),
      };
      await saveDashboardConfig(payload);
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } catch {
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  // Secciones y bloque de configuración correspondientes a la pestaña activa
  const sections = tab === 'resumen' ? RESUMEN_SECTIONS
    : tab === 'calidad' ? CALIDAD_SECTIONS
    : tab === 'balance' ? BALANCE_SECTIONS
    : COSTOS_SECTIONS;
  const block = config[tab]!;

  // Color de acento por pestaña de módulo
  const tabColor: Record<Tab, string> = { resumen: '#58a6ff', calidad: '#d29922', balance: '#4472C4', costos: '#ED7D31' };

  return (
    // Overlay de fondo del modal
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9000, padding: 20,
    }}>
      <div style={{
        background: '#161b22', border: '1px solid #30363d', borderRadius: 10,
        width: '100%', maxWidth: 780, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Header del modal */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e6edf3' }}>⚙ Panel del Visualizador</div>
            <div style={{ fontSize: 11, color: '#8b949e', marginTop: 3 }}>Selecciona secciones y filtros que el Visualizador verá en su dashboard</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8b949e', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {/* Rango de fechas compartido — aplica a las 4 pestañas a la vez */}
        {!loading && (
          <div style={{ padding: '14px 24px', borderBottom: '1px solid #21262d', background: '#0d1117' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#58a6ff', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Rango de fechas — aplica a Resumen, Calidad, Balance y Costos
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 420 }}>
              <div>
                <label style={labelStyle}>Fecha inicio</label>
                <input type="date" value={config.resumen!.filters.fechaInicio} onChange={e => setSharedDate('fechaInicio', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div>
                <label style={labelStyle}>Fecha fin</label>
                <input type="date" value={config.resumen!.filters.fechaFin} onChange={e => setSharedDate('fechaFin', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
              </div>
            </div>
          </div>
        )}

        {/* Pestanas de módulo con color de acento activo */}
        <div style={{ display: 'flex', borderBottom: '1px solid #21262d', padding: '0 24px' }}>
          {(['resumen', 'calidad', 'balance', 'costos'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 18px', background: 'none', cursor: 'pointer',
              border: 'none', borderBottom: tab === t ? `2px solid ${tabColor[t]}` : '2px solid transparent',
              color: tab === t ? tabColor[t] : '#8b949e',
              fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
              transition: 'color .15s',
            }}>
              {t === 'resumen' ? '📊 Resumen' : t === 'calidad' ? '🔬 Calidad' : t === 'balance' ? '💧 Balance' : '⚗ Costos'}
            </button>
          ))}
        </div>

        {/* Cuerpo del modal — toggle, filtros y checklist de secciones */}
        <div style={{ flex: 1, overflow: 'auto', padding: '18px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#8b949e', padding: 40 }}>Cargando configuración…</div>
          ) : (
            <>
              {/* Toggle para habilitar/deshabilitar el módulo completo */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
                <div style={{
                  width: 36, height: 20, borderRadius: 10, position: 'relative',
                  background: block.enabled ? tabColor[tab] : '#30363d',
                  transition: 'background .2s',
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: block.enabled ? 18 : 2,
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    transition: 'left .2s',
                  }} />
                </div>
                <input type="checkbox" checked={block.enabled} onChange={e => setEnabled(tab, e.target.checked)} style={{ display: 'none' }} />
                <span style={{ fontSize: 12, color: block.enabled ? '#e6edf3' : '#8b949e', fontWeight: 600 }}>
                  {block.enabled ? `Mostrar secciones de ${tab} al Visualizador` : `Dashboard ${tab} deshabilitado`}
                </span>
              </label>

              {block.enabled && (
                <>
                  {/* Panel de filtros del módulo activo — resumen ya no tiene filtros propios, solo usa el rango compartido de arriba */}
                  {tab !== 'resumen' && (
                    <div style={{
                      background: '#0d1117', border: '1px solid #21262d', borderRadius: 6,
                      padding: '12px 14px', marginBottom: 16,
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: tabColor[tab], marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Filtros a aplicar
                      </div>
                      {tab === 'calidad' && <FiltersCalidad f={config.calidad.filters} onFilter={(k, v) => setFilter('calidad', k, v)} />}
                      {tab === 'balance' && <FiltersBalance f={config.balance.filters} onFilter={(k, v) => setFilter('balance', k, v)} />}
                      {tab === 'costos'  && <FiltersCostos  f={config.costos.filters}  onFilter={(k, v) => setFilter('costos',  k, v)} />}
                    </div>
                  )}

                  {/* Checklist de secciones visibles para el módulo activo */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#8b949e', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Secciones visibles ({block.sections.length}/{sections.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {sections.map(s => {
                      const active = block.sections.includes(s.key);
                      return (
                        <label key={s.key} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                          background: active ? tabColor[tab] + '18' : '#0d1117',
                          border: `1px solid ${active ? tabColor[tab] + '60' : '#21262d'}`,
                          transition: 'all .15s',
                        }}>
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleSection(tab, s.key)}
                            style={{ accentColor: tabColor[tab] }}
                          />
                          <span style={{ fontSize: 11, color: active ? '#e6edf3' : '#8b949e' }}>{s.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Acciones rápidas de selección masiva de secciones */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, [tab]: { ...prev[tab], sections: sections.map(s => s.key) } }))}
                      style={{ ...inputStyle, cursor: 'pointer', fontSize: 10, padding: '4px 10px' }}
                    >Seleccionar todo</button>
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, [tab]: { ...prev[tab], sections: [] } }))}
                      style={{ ...inputStyle, cursor: 'pointer', fontSize: 10, padding: '4px 10px' }}
                    >Deseleccionar todo</button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer con acciones de cancelar y guardar */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #21262d', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ ...inputStyle, cursor: 'pointer', padding: '8px 18px' }}>Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saved ? '#2ea043' : '#1f6feb',
              border: 'none', borderRadius: 5, color: '#fff',
              padding: '8px 20px', fontSize: 12, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1, transition: 'background .2s',
            }}
          >
            {saved ? '✓ Guardado' : saving ? 'Guardando…' : '💾 Guardar y Publicar'}
          </button>
        </div>
      </div>
    </div>
  );
}
