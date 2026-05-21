import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { ROUTES } from '../../lib/routes';
import { createReactivosBatch } from '../../services/ptarClient';
import type { RegistroCosto } from '../../services/ptarClient';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { QUIMICOS } from '../../lib/constants/quimicos';
import type { QuimicoId } from '../../lib/constants/quimicos';
import { TURNO_LABELS, BITACORA_TURNO, getTurno } from '../../lib/utils/time';

// ─── Validaciones Zod ────────────────────────────────────────────────────────
const productSchema = z.object({
  nivel_final: z.string().optional(),
  observaciones: z.string().optional(),
});

const formSchema = z.object({
  horometro_inicial: z.string().min(1, 'Obligatorio'),
  caudal_tratado_gem: z.string().min(1, 'Obligatorio'),
  horas_operacion: z.string().min(1, 'Obligatorio'),
  products: z.record(z.string(), productSchema),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Lógica Pura (Cálculos) ──────────────────────────────────────────────────
interface ProductComputed {
  active: boolean;
  consumo: number | null;
  kgConsumidos: number | null;
  ppm: number | null;
  costoOperativo: number | null;
  fueraCapacidad: boolean;
  consumoCero: boolean;
}

const NULL_COMPUTED: ProductComputed = {
  active: false, consumo: null, kgConsumidos: null,
  ppm: null, costoOperativo: null, fueraCapacidad: false, consumoCero: false,
};

function computeProduct(
  q: typeof QUIMICOS[number],
  nivelFinal: string | undefined,
  caudal: number,
): ProductComputed {
  if (!nivelFinal || nivelFinal === '') return NULL_COMPUTED;
  const nf = parseFloat(nivelFinal);
  const consumo = q.nivel_inicial - nf;
  const kg = q.unidad === 'L' ? consumo * q.densidad : consumo;
  return {
    active: true,
    consumo,
    kgConsumidos: kg,
    ppm: caudal > 0 ? (kg / caudal) * 1000 : null,
    costoOperativo: kg * q.precio_kg,
    fueraCapacidad: nf > q.capacidad,
    consumoCero: consumo === 0,
  };
}

// ─── Componente Principal ────────────────────────────────────────────────────
export default function FormatoReactivos() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [confirmCero, setConfirmCero] = useState(false);

  // ── Modo manual de fecha / turno ──────────────────────────────────────────
  // getTurno() se calcula UNA vez al montar para que no cambie si el usuario
  // deja el form abierto en el límite de cambio de turno.
  const [autoTurno]   = useState<'mañana' | 'tarde' | 'noche'>(getTurno);
  const [manualMode,  setManualMode]  = useState(false);
  const [manualFecha, setManualFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualTurno, setManualTurno] = useState<'mañana' | 'tarde' | 'noche'>(autoTurno);

  const now         = new Date();
  const today       = now.toISOString().slice(0, 10);
  const activeTurno = manualMode ? manualTurno : autoTurno;
  const activeFecha = manualMode ? manualFecha : today;

  const defaultProducts = Object.fromEntries(
    QUIMICOS.map(q => [q.id, { nivel_final: '', observaciones: '' }])
  );

  const { control, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      horometro_inicial: '',
      caudal_tratado_gem: '',
      horas_operacion: '',
      products: defaultProducts,
    }
  });

  const watchCaudal = watch('caudal_tratado_gem');
  const watchProducts = watch('products');
  const caudal = parseFloat(watchCaudal) || 0;

  // Cálculos reactivos basados en el estado del formulario
  const computed = useMemo(
    () => Object.fromEntries(
      QUIMICOS.map(q => [q.id, computeProduct(q, watchProducts[q.id]?.nivel_final, caudal)])
    ) as Record<QuimicoId, ProductComputed>,
    [watchProducts, caudal],
  );

  const activeProducts = QUIMICOS.filter(q => computed[q.id].active);
  const zeroProducts = activeProducts.filter(q => computed[q.id].consumoCero);
  const hasCapacityErrors = activeProducts.some(q => computed[q.id].fueraCapacidad);
  const canSubmit = activeProducts.length > 0 && !hasCapacityErrors;

  // ─── Guardado y Envío ─────────────────────────────────────────────────────
  const doSave = async (data: FormValues) => {
    if (activeProducts.length === 0) return;
    
    // Verificación manual de consumo cero (requiere doble confirmación de UX)
    if (zeroProducts.length > 0 && !confirmCero) { 
      setConfirmCero(true); 
      return; 
    }

    setSaving(true);

    // `today` y `activeFecha` ya están en el scope del componente
    const fechaPrefix = manualMode && activeFecha !== today
      ? `[Fecha manual: ${activeFecha}] ` : '';

    const rows: Omit<RegistroCosto, 'id' | 'created_at' | 'consumo' | 'ppm' | 'costo_operativo'>[] =
      activeProducts.map(q => ({
        turno: activeTurno,
        usuario: currentUser?.nombre ?? 'desconocido',
        id_quimico: q.id,
        nombre_quimico: q.nombre,
        unidad: q.unidad,
        densidad_kg: q.densidad,
        nivel_inicial: q.nivel_inicial,
        nivel_final: parseFloat(data.products[q.id].nivel_final!),
        kg_consumidos: parseFloat((computed[q.id].kgConsumidos ?? 0).toFixed(4)),
        precio_kg: q.precio_kg,
        horometro_inicial: parseFloat(data.horometro_inicial),
        caudal_tratado_gem: parseFloat(data.caudal_tratado_gem),
        horas_operacion: parseFloat(data.horas_operacion),
        observaciones: (fechaPrefix + (data.products[q.id].observaciones?.trim() ?? '')).trim() || undefined,
      }));

    try {
      await createReactivosBatch(rows);
    } catch (err) {
      setSaving(false);
      toast.error(`Error al guardar: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      return;
    }
    setSaving(false);
    
    toast.success(`${rows.length} registro${rows.length !== 1 ? 's' : ''} guardado${rows.length !== 1 ? 's' : ''} correctamente.`);
    setTimeout(() => navigate(ROUTES.OPERARIO_HOME), 2000);
  };

  const submitLabel = (() => {
    if (saving) return 'Guardando...';
    const n = activeProducts.length;
    if (n === 0) return 'Completa al menos un producto';
    return `Enviar ${n} Registro${n !== 1 ? 's' : ''}`;
  })();

  return (
    <div className="formato-page">
      <div className="formato-header" style={{ borderColor: '#3fb950' }}>
        <h1 className="formato-title">
          <span className="formato-num" style={{ background: '#3fb950' }}>F-02</span>
          Registro de consumo quimico
        </h1>
        <p className="formato-meta">Operario: <strong>{currentUser?.nombre}</strong></p>
      </div>

      <form className="formato-form" onSubmit={handleSubmit(doSave)}>

        {/* ── Contexto ─────────────────────────────────────────────────── */}
        <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Contexto del Registro</span>
          <button
            type="button"
            className={`btn-manual-toggle${manualMode ? ' active' : ''}`}
            onClick={() => setManualMode(v => !v)}
          >
            {manualMode ? '⟵ Usar automático' : '✎ Ajustar fecha / turno'}
          </button>
        </div>

        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Fecha</label>
            {manualMode ? (
              <input
                type="date"
                className="form-input"
                value={manualFecha}
                max={today}
                onChange={e => setManualFecha(e.target.value)}
              />
            ) : (
              <div className="form-readonly">{now.toLocaleDateString('es-CO')}</div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Turno</label>
            {manualMode ? (
              <select
                className="form-input"
                value={manualTurno}
                onChange={e => setManualTurno(e.target.value as 'mañana' | 'tarde' | 'noche')}
              >
                <option value="mañana">Mañana (6:00 – 14:00)</option>
                <option value="tarde">Tarde (14:00 – 22:00)</option>
                <option value="noche">Noche (22:00 – 6:00)</option>
              </select>
            ) : (
              <div className="form-readonly">{TURNO_LABELS[activeTurno]}</div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Diligenciar Bitácora</label>
            <div className="form-readonly value-ok">{BITACORA_TURNO[activeTurno]}</div>
          </div>
        </div>
        {manualMode && (
          <div className="form-alert form-alert-warn" style={{ padding: '8px 12px', fontSize: 12, marginTop: -4 }}>
            ⚠ Modo manual activo — el turno y la fecha se tomarán como ingresados, no del reloj del sistema.
          </div>
        )}

        {/* ── Lecturas Operativas ───────────────────────────────────────── */}
        <div className="form-section-title">Lecturas Operativas del Turno</div>
        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label">Lectura Horómetro Inicial (06:00) *</label>
            <Controller
              name="horometro_inicial"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="number" step="0.1" min="0"
                  className={`form-input${errors.horometro_inicial ? ' input-error' : ''}`}
                  placeholder="Ej: 17622.0 horas"
                />
              )}
            />
            {errors.horometro_inicial && <span className="field-error">{errors.horometro_inicial.message}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Caudal Total Tratado GEM (m³) *</label>
            <Controller
              name="caudal_tratado_gem"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="number" step="1" min="0"
                  className={`form-input${errors.caudal_tratado_gem ? ' input-error' : ''}`}
                  placeholder="Ej: 480 m³"
                />
              )}
            />
            {errors.caudal_tratado_gem && <span className="field-error">{errors.caudal_tratado_gem.message}</span>}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Horas de Operación *</label>
          <Controller
            name="horas_operacion"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="number" step="0.5" min="0" max="8"
                className={`form-input${errors.horas_operacion ? ' input-error' : ''}`}
                placeholder="0 — 8 horas"
              />
            )}
          />
          {errors.horas_operacion && <span className="field-error">{errors.horas_operacion.message}</span>}
        </div>

        {/* ── Productos ─────────────────────────────────────────────────── */}
        <div className="form-section-title">
          Productos Químicos
          <span style={{ color: '#484f58', fontWeight: 400, marginLeft: 8 }}>
            — completa el nivel final de los que apliquen
          </span>
        </div>

        <div className="reactivos-list">
          {QUIMICOS.map(q => {
            const c = computed[q.id];
            const hasError = c.fueraCapacidad;
            const hasValue = c.active;
            const cardClass = `reactivo-card${hasError ? ' has-error' : hasValue ? ' has-value' : ''}`;

            return (
              <div key={q.id} className={cardClass}>
                <div className="reactivo-card-header">
                  <span className="reactivo-badge">{q.id}</span>
                  <span className="reactivo-nombre">{q.nombre}</span>
                  <span className="reactivo-meta">
                    {q.unidad} · ρ {q.densidad} kg/{q.unidad} · Cap. {q.capacidad.toLocaleString('es-CO')}
                  </span>
                </div>

                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Nivel Inicial ({q.unidad})</label>
                    <div className="form-readonly">
                      {q.nivel_inicial.toLocaleString('es-CO', { minimumFractionDigits: 1 })}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nivel Final ({q.unidad})</label>
                    <Controller
                      name={`products.${q.id}.nivel_final`}
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number" step="0.1" min="0"
                          className={`form-input${hasError ? ' input-error' : ''}`}
                          placeholder={`0 — ${q.capacidad}`}
                          onChange={(e) => {
                            if (confirmCero) setConfirmCero(false);
                            field.onChange(e);
                          }}
                        />
                      )}
                    />
                    {hasError && (
                      <span className="field-error">
                        Supera la capacidad ({q.capacidad} {q.unidad})
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Consumo ({q.unidad})</label>
                    <div className={`form-readonly${c.consumo === null ? '' : c.consumo > 0 ? ' value-ok' : c.consumo < 0 ? ' value-alert' : ''}`}>
                      {c.consumo !== null ? c.consumo.toFixed(1) : '—'}
                    </div>
                  </div>
                </div>

                {!c.active && (
                  <span className="param-hint">↑ Ingresa el nivel final para ver Kg, PPM y Costo automáticamente</span>
                )}

                {c.active && (
                  <div className="reactivo-computed">
                    <div className="reactivo-computed-item">
                      <span className="reactivo-computed-label">Kg Consumidos</span>
                      <span className="reactivo-computed-value value-ok">
                        {(c.kgConsumidos ?? 0).toFixed(2)} kg
                      </span>
                    </div>
                    <div className="reactivo-computed-item">
                      <span className="reactivo-computed-label">PPM — mg/L</span>
                      <span className="reactivo-computed-value value-ok">
                        {c.ppm !== null ? c.ppm.toFixed(2) : 'Requiere caudal'}
                      </span>
                    </div>
                    <div className="reactivo-computed-item">
                      <span className="reactivo-computed-label">Costo Operativo</span>
                      <span className="reactivo-computed-value value-ok">
                        {(c.costoOperativo ?? 0).toLocaleString('es-CO', {
                          style: 'currency', currency: 'COP', maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Observaciones (opcional)</label>
                  <Controller
                    name={`products.${q.id}.observaciones`}
                    control={control}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        className="form-textarea" rows={2}
                        placeholder="Anomalías, reposición de stock..."
                      />
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Confirmación consumo cero ─────────────────────────────────── */}
        {confirmCero && (
          <div className="form-alert form-alert-warn">
            <strong>Consumo cero registrado en:</strong>
            <ul style={{ marginTop: 8, paddingLeft: 18 }}>
              {zeroProducts.map(q => (
                <li key={q.id}>{q.id} — {q.nombre}</li>
              ))}
            </ul>
            <p style={{ marginTop: 8 }}>
              ¿Confirmas que no hubo consumo de {zeroProducts.length === 1 ? 'este producto' : 'estos productos'} en este turno?
            </p>
            <div className="form-alert-actions">
              <button type="button" className="btn-secondary btn-sm" onClick={() => setConfirmCero(false)}>
                Corregir
              </button>
              <button type="button" className="btn-primary btn-sm" style={{ background: '#3fb950' }}
                onClick={handleSubmit(doSave)} disabled={saving}>
                {saving ? 'Guardando...' : 'Confirmar y Enviar'}
              </button>
            </div>
          </div>
        )}

        {/* ── Acciones ──────────────────────────────────────────────────── */}
        {!confirmCero && (
          <div className="form-actions">
            <button type="button" className="btn-secondary"
              onClick={() => navigate(ROUTES.OPERARIO_HOME)} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" style={{ background: '#3fb950' }}
              disabled={saving || !canSubmit}>
              {submitLabel}
            </button>
          </div>
        )}

      </form>
    </div>
  );
}
