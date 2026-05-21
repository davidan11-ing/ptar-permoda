import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { ROUTES } from '../../lib/routes';
import { createCalidadBatch } from '../../services/ptarClient';
import type { RegistroCalidad } from '../../services/ptarClient';

import { 
  PARAMS_DIARIOS, PARAMS_OCASIONALES, 
  UNIDADES_TRATAMIENTO, METODOS 
} from '../../lib/constants/incidencias';
import type { DiarioId, OcasionalId } from '../../lib/constants/incidencias';
import { TURNO_LABELS, getTurno } from '../../lib/utils/time';

// ─── State types ────────────────────────────────────────────────────────────

interface ParamInput {
  valor: string;
  metodo: string;       // default: 'Sensor / Equipo en línea'
  no_aplica: boolean;
  observaciones: string;
}

interface ExtraRow {
  uid: string;
  id_param: OcasionalId | '';
  valor: string;
  metodo: string;
  no_aplica: boolean;
  observaciones: string;
}

interface FormState {
  unidad_tratamiento: string;
  daily: Record<DiarioId, ParamInput>;
  extras: ExtraRow[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeParamInput = (defaultMetodo = 'Sensor / Equipo en línea'): ParamInput => ({
  valor: '', metodo: defaultMetodo, no_aplica: false, observaciones: '',
});

const INITIAL_DAILY = Object.fromEntries(
  PARAMS_DIARIOS.map(p => [p.id, makeParamInput()])
) as Record<DiarioId, ParamInput>;

let uidCounter = 0;
const newUid = () => `extra-${++uidCounter}`;

// ─── Component ───────────────────────────────────────────────────────────────

export default function FormatoIncidencias() {
  const { currentUser } = useAuth();
  const navigate        = useNavigate();

  const [form, setForm]           = useState<FormState>({
    unidad_tratamiento: '',
    daily: INITIAL_DAILY,
    extras: [],
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitErrors, setSubmitErrors] = useState<Record<string, boolean>>({});
  const savedCountRef = useRef(0);

  const now   = new Date();
  const turno = getTurno();

  // ─── Derived values ────────────────────────────────────────────────────────

  // Active daily: filled OR marked no_aplica
  const activeDailyIds = (PARAMS_DIARIOS as unknown as typeof PARAMS_DIARIOS)
    .filter(p => form.daily[p.id].valor !== '' || form.daily[p.id].no_aplica)
    .map(p => p.id);

  // Active extras: has a param selected AND (valor filled OR no_aplica)
  const activeExtras = form.extras.filter(
    e => e.id_param !== '' && (e.valor !== '' || e.no_aplica)
  );

  const totalActive = activeDailyIds.length + activeExtras.length;
  const canSubmit   = form.unidad_tratamiento !== '' && totalActive > 0;

  // Occasional params not yet added in extras
  const addedExtraIds = new Set(form.extras.map(e => e.id_param).filter(Boolean));
  const availableOcasionales = PARAMS_OCASIONALES.filter(p => !addedExtraIds.has(p.id));

  // ─── Setters ───────────────────────────────────────────────────────────────

  const setDaily = (id: DiarioId, field: keyof ParamInput, value: string | boolean) => {
    setSubmitErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
    setForm(prev => ({
      ...prev,
      daily: { ...prev.daily, [id]: { ...prev.daily[id], [field]: value } },
    }));
  };

  const setExtra = (uid: string, field: keyof Omit<ExtraRow, 'uid'>, value: string | boolean) => {
    setSubmitErrors(prev => { const n = { ...prev }; delete n[uid]; return n; });
    setForm(prev => ({
      ...prev,
      extras: prev.extras.map(e => e.uid === uid ? { ...e, [field]: value } : e),
    }));
  };

  const addExtra = () => {
    if (availableOcasionales.length === 0) return;
    setForm(prev => ({
      ...prev,
      extras: [...prev.extras, {
        uid: newUid(), id_param: '', valor: '',
        metodo: 'Laboratorio externo', no_aplica: false, observaciones: '',
      }],
    }));
  };

  const removeExtra = (uid: string) => {
    setForm(prev => ({ ...prev, extras: prev.extras.filter(e => e.uid !== uid) }));
  };

  // ─── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errors: Record<string, boolean> = {};
    // Daily: if no_aplica without observaciones → flag
    PARAMS_DIARIOS.forEach(p => {
      const inp = form.daily[p.id];
      if (inp.no_aplica && !inp.observaciones.trim()) errors[p.id] = true;
    });
    // Extras: if no_aplica without observaciones → flag
    form.extras.forEach(e => {
      if (e.no_aplica && !e.observaciones.trim()) errors[e.uid] = true;
    });
    setSubmitErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Save ──────────────────────────────────────────────────────────────────

  const doSave = async () => {
    if (!canSubmit) return;
    if (!validate()) return;
    setSaving(true); setSaveError(null);

    const shared = {
      turno,
      usuario:             currentUser?.nombre ?? 'desconocido',
      unidad_tratamiento:  form.unidad_tratamiento,
    };

    // Daily rows
    const dailyRows: Omit<RegistroCalidad, 'id' | 'created_at'>[] =
      activeDailyIds.map(id => {
        const p = PARAMS_DIARIOS.find(x => x.id === id)!;
        const inp = form.daily[id];
        const numVal = inp.no_aplica ? undefined : (inp.valor ? parseFloat(inp.valor) : undefined);
        return {
          ...shared,
          parametro:    p.nombre,
          unidad_medida: p.unidad,
          valor:        numVal && !isNaN(numVal) ? numVal : undefined,
          metodo:       inp.no_aplica ? undefined : (inp.metodo || undefined),
          no_aplica:    inp.no_aplica,
          observaciones: inp.observaciones.trim() || undefined,
        };
      });

    // Extra rows
    const extraRows: Omit<RegistroCalidad, 'id' | 'created_at'>[] =
      activeExtras.map(e => {
        const p = PARAMS_OCASIONALES.find(x => x.id === e.id_param)!;
        const numVal = e.no_aplica ? undefined : (e.valor ? parseFloat(e.valor) : undefined);
        return {
          ...shared,
          parametro:    p.nombre,
          unidad_medida: p.unidad,
          valor:        numVal && !isNaN(numVal) ? numVal : undefined,
          metodo:       e.no_aplica ? undefined : (e.metodo || undefined),
          no_aplica:    e.no_aplica,
          observaciones: e.observaciones.trim() || undefined,
        };
      });

    const rows = [...dailyRows, ...extraRows];
    try {
      await createCalidadBatch(rows);
    } catch (err) {
      setSaving(false);
      setSaveError(`Error al guardar: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      return;
    }
    setSaving(false);
    savedCountRef.current = rows.length;
    setSubmitted(true);
    setTimeout(() => navigate(ROUTES.OPERARIO_HOME), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSave();
  };

  // ─── Success screen ────────────────────────────────────────────────────────

  if (submitted) {
    const n = savedCountRef.current;
    return (
      <div className="form-success">
        <div className="success-icon" style={{ color: '#d29922' }}>✓</div>
        <h2>{n} medición{n !== 1 ? 'es' : ''} guardada{n !== 1 ? 's' : ''} en base de datos</h2>
        <p>Redirigiendo...</p>
      </div>
    );
  }

  // ─── Render helpers ────────────────────────────────────────────────────────

  const submitLabel = (() => {
    if (saving) return 'Guardando...';
    if (totalActive === 0) return 'Completa al menos una medición';
    return `Enviar ${totalActive} Medición${totalActive !== 1 ? 'es' : ''}`;
  })();

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="formato-page">
      <div className="formato-header" style={{ borderColor: '#d29922' }}>
        <h1 className="formato-title">
          <span className="formato-num" style={{ background: '#d29922' }}>F-03</span>
          Calidad del Agua
        </h1>
        <p className="formato-meta">Operario: <strong>{currentUser?.nombre}</strong></p>
      </div>

      <form className="formato-form" onSubmit={handleSubmit}>

        {/* ── Contexto ──────────────────────────────────────────────────── */}
        <div className="form-section-title">Contexto</div>
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Fecha</label>
            <div className="form-readonly">{now.toLocaleDateString('es-CO')}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Turno</label>
            <div className="form-readonly">{TURNO_LABELS[turno]}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Operario</label>
            <div className="form-readonly">{currentUser?.nombre}</div>
          </div>
        </div>

        {/* ── Unidad de Tratamiento ─────────────────────────────────────── */}
        <div className="form-group">
          <label className="form-label">
            Unidad de Tratamiento *
            <span style={{ color: '#484f58', fontWeight: 400, marginLeft: 8 }}>
              ({UNIDADES_TRATAMIENTO.length} puntos disponibles)
            </span>
          </label>
          <select
            className="form-input"
            value={form.unidad_tratamiento}
            onChange={e => setForm(prev => ({ ...prev, unidad_tratamiento: e.target.value }))}
            required
          >
            <option value="">Selecciona la unidad de tratamiento...</option>
            {UNIDADES_TRATAMIENTO.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        {/* ── Parámetros Diarios ────────────────────────────────────────── */}
        <div className="form-section-title">
          Parámetros Diarios
          <span style={{ color: '#484f58', fontWeight: 400, marginLeft: 8 }}>
            — completa los que apliquen en este turno
          </span>
        </div>

        <div className="params-list">
          {PARAMS_DIARIOS.map(p => {
            const inp      = form.daily[p.id];
            const valorNum = parseFloat(inp.valor);
            const fuera    = inp.valor !== '' && !inp.no_aplica && (valorNum < p.min || valorNum > p.max);
            const active   = inp.valor !== '' || inp.no_aplica;
            const hasErr   = submitErrors[p.id];

            const rowClass = `param-row${inp.no_aplica ? ' is-noapl' : active ? ' has-value' : ''}${fuera || hasErr ? ' has-error' : ''}`;

            return (
              <div key={p.id} className={rowClass}>
                <div className="param-row-header">
                  <span className="param-badge-diario">DIARIO</span>
                  <span className="param-nombre-text">{p.nombre}</span>
                  <span className="param-rango">{p.min} – {p.max} {p.unidad}</span>
                  <label className="param-noapl-toggle" title="No aplica / No fue posible medir">
                    <input
                      type="checkbox"
                      checked={inp.no_aplica}
                      onChange={e => {
                        setDaily(p.id, 'no_aplica', e.target.checked);
                        if (e.target.checked) setDaily(p.id, 'valor', '');
                      }}
                    />
                    <span>N/A</span>
                  </label>
                </div>

                {!inp.no_aplica && (
                  <div className="param-row-inputs">
                    <input
                      type="number" step="0.01"
                      className={`form-input${fuera ? ' input-warning' : ''}`}
                      placeholder="Valor medido"
                      value={inp.valor}
                      onChange={e => setDaily(p.id, 'valor', e.target.value)}
                    />
                    <span className="param-unidad-badge">{p.unidad}</span>
                    <select
                      className="form-input"
                      value={inp.metodo}
                      onChange={e => setDaily(p.id, 'metodo', e.target.value)}
                    >
                      <option value="">Método...</option>
                      {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                )}

                {fuera && (
                  <span className="field-warning">
                    Fuera del rango técnico ({p.min} – {p.max} {p.unidad})
                  </span>
                )}

                {inp.no_aplica && (
                  <>
                    <textarea
                      className={`form-textarea${hasErr ? ' input-error' : ''}`}
                      rows={2}
                      placeholder="Explica por qué no fue posible realizar esta medición..."
                      value={inp.observaciones}
                      onChange={e => setDaily(p.id, 'observaciones', e.target.value)}
                    />
                    {hasErr && <span className="field-error">La observación es obligatoria cuando N/A está marcado.</span>}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Mediciones Adicionales ────────────────────────────────────── */}
        <div className="form-section-title">
          Mediciones Adicionales
          <span style={{ color: '#484f58', fontWeight: 400, marginLeft: 8 }}>
            — parámetros de laboratorio o periódicos
          </span>
        </div>

        <div className="extras-section">
          {form.extras.map(extra => {
            const selectedParam = PARAMS_OCASIONALES.find(p => p.id === extra.id_param);
            const valorNum      = parseFloat(extra.valor);
            const fuera         = selectedParam && extra.valor !== '' && !extra.no_aplica
              && (valorNum < selectedParam.min || valorNum > selectedParam.max);
            const hasErr        = submitErrors[extra.uid];

            return (
              <div key={extra.uid} className="extra-row">
                <div className="extra-row-fields">
                  {/* Param selector */}
                  <select
                    className="form-input"
                    value={extra.id_param}
                    onChange={e => setExtra(extra.uid, 'id_param', e.target.value)}
                  >
                    <option value="">Parámetro...</option>
                    {PARAMS_OCASIONALES
                      .filter(p => !addedExtraIds.has(p.id) || p.id === extra.id_param)
                      .map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)
                    }
                  </select>

                  {/* Valor */}
                  <input
                    type="number" step="0.01"
                    className={`form-input${fuera ? ' input-warning' : ''}`}
                    placeholder="Valor"
                    value={extra.valor}
                    disabled={!extra.id_param || extra.no_aplica}
                    onChange={e => setExtra(extra.uid, 'valor', e.target.value)}
                  />

                  {/* Unidad badge */}
                  <span className="param-unidad-badge" style={{ minWidth: 60 }}>
                    {selectedParam?.unidad ?? '—'}
                  </span>

                  {/* Método */}
                  <select
                    className="form-input"
                    value={extra.metodo}
                    disabled={!extra.id_param || extra.no_aplica}
                    onChange={e => setExtra(extra.uid, 'metodo', e.target.value)}
                  >
                    <option value="">Método...</option>
                    {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>

                  {/* Remove */}
                  <button type="button" className="btn-remove-param" onClick={() => removeExtra(extra.uid)}>×</button>
                </div>

                {/* N/A + observaciones */}
                <label className="checkbox-label" style={{ fontSize: 13 }}>
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={extra.no_aplica}
                    onChange={e => {
                      setExtra(extra.uid, 'no_aplica', e.target.checked);
                      if (e.target.checked) setExtra(extra.uid, 'valor', '');
                    }}
                  />
                  <span>No aplica / No fue posible realizar la medición</span>
                </label>

                {extra.no_aplica && (
                  <>
                    <textarea
                      className={`form-textarea${hasErr ? ' input-error' : ''}`}
                      rows={2}
                      placeholder="Explica por qué no fue posible..."
                      value={extra.observaciones}
                      onChange={e => setExtra(extra.uid, 'observaciones', e.target.value)}
                    />
                    {hasErr && <span className="field-error">La observación es obligatoria cuando N/A está marcado.</span>}
                  </>
                )}

                {fuera && (
                  <span className="field-warning">
                    Fuera del rango técnico ({selectedParam?.min} – {selectedParam?.max} {selectedParam?.unidad})
                  </span>
                )}
              </div>
            );
          })}

          {availableOcasionales.length > 0 && (
            <button type="button" className="btn-add-param" onClick={addExtra}>
              + Agregar medición adicional
              <span style={{ color: '#484f58', marginLeft: 8, fontSize: 11 }}>
                ({availableOcasionales.length} parámetros disponibles)
              </span>
            </button>
          )}
        </div>

        {saveError && <div className="form-alert form-alert-error">{saveError}</div>}

        {/* ── Acciones ──────────────────────────────────────────────────── */}
        <div className="form-actions">
          <button type="button" className="btn-secondary"
            onClick={() => navigate(ROUTES.OPERARIO_HOME)} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" style={{ background: '#d29922' }}
            disabled={saving || !canSubmit}>
            {submitLabel}
          </button>
        </div>

      </form>
    </div>
  );
}
