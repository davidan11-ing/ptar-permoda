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

import { QUIMICOS_RO } from '../../lib/constants/quimicos';
import { TURNO_LABELS, BITACORA_TURNO, getTurno } from '../../lib/utils/time';

// ─── Constante: volumen por hora RO ─────────────────────────────────────────
const M3_POR_HORA_RO = 80; // placeholder — ajustar con dato real

// ─── Validación Zod ──────────────────────────────────────────────────────────
const productSchema = z.object({
  nivel_final: z.string().optional(),
  ingreso_l:   z.string().optional(),
});

const formSchema = z.object({
  horas_operacion:  z.string().optional(),
  caudal_entrada:   z.string().optional(), // C-12 Entrada RO #1
  caudal_salida:    z.string().optional(), // C-13 Salida RO #1
  products:         z.record(z.string(), productSchema),
  observaciones_generales: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Cálculos por producto ───────────────────────────────────────────────────
interface ProductComputed {
  active:         boolean;
  consumoL:       number | null;
  kgConsumidos:   number | null;
  ppm:            number | null;
  costoOp:        number | null;
  fueraCapacidad: boolean;
  esIngreso:      boolean;
}

const NULL_COMPUTED: ProductComputed = {
  active: false, consumoL: null, kgConsumidos: null,
  ppm: null, costoOp: null, fueraCapacidad: false, esIngreso: false,
};

function computeProduct(
  q: typeof QUIMICOS_RO[number],
  nivelFinal: string | undefined,
  volM3: number,
): ProductComputed {
  if (!nivelFinal || nivelFinal === '') return NULL_COMPUTED;
  const nf = parseFloat(nivelFinal);
  const consumoL = q.nivel_inicial - nf;
  const kg = q.unidad === 'L' ? consumoL * q.densidad : consumoL;
  return {
    active: true,
    consumoL,
    kgConsumidos: kg,
    ppm: volM3 > 0 ? (kg / volM3) * 1000 : null,
    costoOp: kg * q.precio_kg,
    fueraCapacidad: nf > q.capacidad,
    esIngreso: nf > q.nivel_inicial,
  };
}

// ─── Componente Principal ────────────────────────────────────────────────────
export default function FormatoReactivosRO() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);

  const [autoTurno]   = useState<'mañana' | 'tarde' | 'noche'>(getTurno);
  const [manualMode,  setManualMode]  = useState(false);
  const [manualFecha, setManualFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualTurno, setManualTurno] = useState<'mañana' | 'tarde' | 'noche'>(autoTurno);

  const now         = new Date();
  const today       = now.toISOString().slice(0, 10);
  const activeTurno = manualMode ? manualTurno : autoTurno;
  const activeFecha = manualMode ? manualFecha : today;

  const defaultProducts = Object.fromEntries(
    QUIMICOS_RO.map(q => [q.id, { nivel_final: '', ingreso_l: '' }])
  );

  const { control, handleSubmit, watch, register } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      horas_operacion: '',
      caudal_entrada: '',
      caudal_salida: '',
      products: defaultProducts,
      observaciones_generales: '',
    }
  });

  const watchHoras    = watch('horas_operacion');
  const watchEntrada  = watch('caudal_entrada');
  const watchSalida   = watch('caudal_salida');
  const watchProducts = watch('products');

  // Volumen tratado RO
  const horasOp   = parseFloat(watchHoras || '') || 0;
  const volFinal  = horasOp > 0 ? horasOp * M3_POR_HORA_RO : 0;

  // Caudal neto (recuperación RO)
  const caudalEntrada = parseFloat(watchEntrada || '') || null;
  const caudalSalida  = parseFloat(watchSalida || '') || null;
  const recuperacion  = caudalEntrada && caudalSalida && caudalEntrada > 0
    ? ((caudalSalida / caudalEntrada) * 100).toFixed(1) : null;

  const computed = useMemo(
    () => Object.fromEntries(
      QUIMICOS_RO.map(q => [q.id, computeProduct(q, watchProducts[q.id]?.nivel_final, volFinal)])
    ),
    [watchProducts, volFinal],
  );

  const activeProducts = QUIMICOS_RO.filter(q => computed[q.id].active);
  const ingresoRequired = activeProducts.filter(q => computed[q.id].esIngreso);
  const missingIngreso  = ingresoRequired.filter(q =>
    !watchProducts[q.id]?.ingreso_l || watchProducts[q.id]?.ingreso_l === ''
  );
  const hasCapacityErrors = activeProducts.some(q => computed[q.id].fueraCapacidad);
  const canSubmit = activeProducts.length > 0 && !hasCapacityErrors && missingIngreso.length === 0;

  // ─── Guardado ─────────────────────────────────────────────────────────────
  const doSave = async (data: FormValues) => {
    if (activeProducts.length === 0) return;
    setSaving(true);

    const fechaPrefix = manualMode && activeFecha !== today
      ? `[Fecha manual: ${activeFecha}] ` : '';
    const obsGen = (data.observaciones_generales ?? '').trim();

    const caudalesInfo = caudalEntrada && caudalSalida
      ? `C-12: ${caudalEntrada}m³, C-13: ${caudalSalida}m³${recuperacion ? `, Rec: ${recuperacion}%` : ''}`
      : '';

    const rows: Omit<RegistroCosto, 'id' | 'created_at' | 'consumo' | 'ppm' | 'costo_operativo'>[] =
      activeProducts.map(q => {
        const p = data.products[q.id];
        const c = computed[q.id];
        const obsArr: string[] = [];
        if (fechaPrefix) obsArr.push(fechaPrefix.trim());
        if (c.esIngreso && p.ingreso_l) obsArr.push(`Ingreso recibido: ${p.ingreso_l} ${q.unidad}`);
        if (caudalesInfo) obsArr.push(caudalesInfo);
        if (obsGen) obsArr.push(obsGen);

        return {
          turno:              activeTurno,
          usuario:            currentUser?.nombre ?? 'desconocido',
          equipo:             currentUser?.equipo ? JSON.stringify(currentUser.equipo) : undefined,
          id_quimico:         q.id,
          nombre_quimico:     q.nombre,
          unidad:             q.unidad,
          densidad_kg:        q.densidad,
          nivel_inicial:      q.nivel_inicial,
          nivel_final:        parseFloat(p.nivel_final!),
          kg_consumidos:      parseFloat((c.kgConsumidos ?? 0).toFixed(4)),
          precio_kg:          q.precio_kg,
          horometro_inicial:  0,
          caudal_tratado_gem: volFinal,
          horas_operacion:    horasOp,
          observaciones:      obsArr.join(' | ') || undefined,
        };
      });

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
    if (missingIngreso.length > 0) return `Completa los ingresos obligatorios (${missingIngreso.length})`;
    return `Enviar ${n} Registro${n !== 1 ? 's' : ''}`;
  })();

  return (
    <div className="formato-page">
      <div className="formato-header" style={{ borderColor: '#1f6feb' }}>
        <h1 className="formato-title">
          <span className="formato-num" style={{ background: '#1f6feb' }}>F-04</span>
          Reactivos RO
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
              <input type="date" className="form-input" value={manualFecha} max={today}
                onChange={e => setManualFecha(e.target.value)} />
            ) : (
              <div className="form-readonly">{now.toLocaleDateString('es-CO')}</div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Turno</label>
            {manualMode ? (
              <select className="form-input" value={manualTurno}
                onChange={e => setManualTurno(e.target.value as 'mañana' | 'tarde' | 'noche')}>
                <option value="mañana">Mañana (6:00 – 14:00)</option>
                <option value="tarde">Tarde (14:00 – 22:00)</option>
                <option value="noche">Noche (22:00 – 6:00)</option>
              </select>
            ) : (
              <div className="form-readonly">{TURNO_LABELS[activeTurno]}</div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Bitácora</label>
            <div className="form-readonly value-ok">{BITACORA_TURNO[activeTurno]}</div>
          </div>
        </div>
        {manualMode && (
          <div className="form-alert form-alert-warn" style={{ padding: '8px 12px', fontSize: 12, marginTop: -4 }}>
            ⚠ Modo manual activo — el turno y la fecha se tomarán como ingresados.
          </div>
        )}

        {/* ── Caudales RO ──────────────────────────────────────────────── */}
        <div className="form-section-title">Caudales Sistema RO</div>
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">C-12 Entrada RO #1 (m³)</label>
            <input
              type="number" step="1" min="0"
              className="form-input"
              placeholder="Lectura m³"
              {...register('caudal_entrada')}
            />
          </div>
          <div className="form-group">
            <label className="form-label">C-13 Salida RO #1 (m³)</label>
            <input
              type="number" step="1" min="0"
              className="form-input"
              placeholder="Lectura m³"
              {...register('caudal_salida')}
            />
          </div>
          <div className="form-group">
            <label className="form-label">% Recuperación (calc.)</label>
            <div className={`form-readonly${recuperacion ? ' value-ok' : ''}`}>
              {recuperacion ? `${recuperacion}%` : '—'}
            </div>
          </div>
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label">Horas de operación RO</label>
            <input
              type="number" step="0.5" min="0" max="8"
              className="form-input"
              placeholder="0 — 8 horas"
              {...register('horas_operacion')}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Volumen tratado RO (calc. {M3_POR_HORA_RO} m³/h)</label>
            <div className={`form-readonly${volFinal > 0 ? ' value-ok' : ''}`}>
              {volFinal > 0 ? `${volFinal.toFixed(0)} m³` : '—'}
            </div>
          </div>
        </div>

        {/* ── Productos RO ─────────────────────────────────────────────── */}
        <div className="form-section-title">
          Productos Químicos RO
          <span style={{ color: '#484f58', fontWeight: 400, marginLeft: 8 }}>
            — completa el nivel final de los que apliquen
          </span>
        </div>

        <div className="reactivos-list">
          {QUIMICOS_RO.map(q => {
            const c = computed[q.id];
            const p = watchProducts[q.id] ?? {};
            const cardClass = `reactivo-card${c.fueraCapacidad ? ' has-error' : c.active ? ' has-value' : ''}`;

            return (
              <div key={q.id} className={cardClass}>
                <div className="reactivo-card-header">
                  <span className="reactivo-badge" style={{ background: '#1f6feb' }}>{q.id}</span>
                  <span className="reactivo-nombre">{q.nombre}</span>
                  <span className="reactivo-meta">
                    {q.unidad} · ρ {q.densidad} kg/{q.unidad} · Cap. {q.capacidad.toLocaleString('es-CO')}
                  </span>
                </div>

                <div className="form-row-3">
                  <div className="form-group">
                    <label className="form-label">Nivel Inicial ({q.unidad})</label>
                    <div className="form-readonly">
                      {q.nivel_inicial > 0
                        ? q.nivel_inicial.toLocaleString('es-CO', { minimumFractionDigits: 1 })
                        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Pendiente confirmar</span>}
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
                          className={`form-input${c.fueraCapacidad ? ' input-error' : ''}`}
                          placeholder={`0 — ${q.capacidad}`}
                        />
                      )}
                    />
                    {c.fueraCapacidad && (
                      <span className="field-error">Supera la capacidad ({q.capacidad} {q.unidad})</span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">L Consumidos</label>
                    <div className={`form-readonly${c.consumoL === null ? '' : c.consumoL > 0 ? ' value-ok' : c.consumoL < 0 ? ' value-alert' : ''}`}>
                      {c.consumoL !== null ? c.consumoL.toFixed(1) : '—'}
                    </div>
                  </div>
                </div>

                {/* Alerta: ingreso de producto */}
                {c.esIngreso && (
                  <div className="form-alert form-alert-warn" style={{ padding: '10px 12px', marginTop: 4 }}>
                    <strong>Nivel final mayor al inicial — se realizó ingreso de producto.</strong>
                    <div className="form-group" style={{ marginTop: 8, marginBottom: 0 }}>
                      <label className="form-label">¿Cuánto producto se recibió? ({q.unidad}) *</label>
                      <Controller
                        name={`products.${q.id}.ingreso_l`}
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="number" step="0.1" min="0"
                            className="form-input"
                            placeholder={`Cantidad recibida en ${q.unidad}`}
                          />
                        )}
                      />
                      {(!p.ingreso_l || p.ingreso_l === '') && (
                        <span className="field-error">Campo obligatorio cuando hay ingreso de producto.</span>
                      )}
                    </div>
                  </div>
                )}

                {!c.active && (
                  <span className="param-hint">↑ Ingresa el nivel final para ver cálculos automáticos</span>
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
                        {c.ppm !== null ? c.ppm.toFixed(2) : (volFinal === 0 ? 'Sin vol.' : '—')}
                      </span>
                    </div>
                    <div className="reactivo-computed-item">
                      <span className="reactivo-computed-label">Costo Operativo</span>
                      <span className="reactivo-computed-value value-ok">
                        {q.precio_kg > 0
                          ? (c.costoOp ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
                          : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Precio pendiente</span>}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Observaciones Generales ───────────────────────────────────── */}
        <div className="form-section-title">Observaciones Generales</div>
        <div className="form-group">
          <label className="form-label">Observaciones del turno (opcional)</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Novedades del turno, anomalías en el sistema RO, condiciones especiales..."
            {...register('observaciones_generales')}
          />
        </div>

        {/* ── Acciones ──────────────────────────────────────────────────── */}
        <div className="form-actions">
          <button type="button" className="btn-secondary"
            onClick={() => navigate(ROUTES.OPERARIO_HOME)} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" style={{ background: '#1f6feb' }}
            disabled={saving || !canSubmit}>
            {submitLabel}
          </button>
        </div>

      </form>
    </div>
  );
}
