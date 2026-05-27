import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { ROUTES } from '../../lib/routes';
import {
  createReactivosBatch,
  getUltimoHorometro,
  getUltimoNivel,
} from '../../services/ptarClient';
import type { RegistroCosto, UltimoHorometro, UltimoNivel } from '../../services/ptarClient';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { QUIMICOS_GEM, QUIMICOS_RO, QUIMICOS_PTAP } from '../../lib/constants/quimicos';
import { TURNO_LABELS, BITACORA_TURNO, getTurno } from '../../lib/utils/time';

// ─── Tipos auxiliares ────────────────────────────────────────────────────────
type QuimicoItem = typeof QUIMICOS_GEM[number] | typeof QUIMICOS_RO[number] | typeof QUIMICOS_PTAP[number];

// ─── Schema Zod ──────────────────────────────────────────────────────────────
const productSchema = z.object({
  nivel_inicial:  z.string().optional(),
  nivel_final:    z.string().optional(),
  ingreso_l:      z.string().optional(),
  trasiego_check: z.boolean().optional(),
  trasiego_l:     z.string().optional(),
});

const caudalesROSchema = z.object({
  c12_actual: z.string().optional(),
  c13_actual: z.string().optional(),
});

const formSchema = z.object({
  horometro_actual:        z.string().min(1, 'Ingresa el horómetro actual'),
  caudal_mh:               z.string().default('80'),
  products:                z.record(z.string(), productSchema),
  caudales_ro:             caudalesROSchema.optional(),
  observaciones_generales: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Cálculos por producto ───────────────────────────────────────────────────
interface ProductComputed {
  active:          boolean;
  consumoL:        number | null;
  consumoReal:     number | null;
  kgConsumidos:    number | null;
  ppm:             number | null;
  costoOp:         number | null;
  fueraCapacidad:  boolean;
  esIngreso:       boolean;
}

const NULL_COMPUTED: ProductComputed = {
  active: false, consumoL: null, consumoReal: null,
  kgConsumidos: null, ppm: null, costoOp: null,
  fueraCapacidad: false, esIngreso: false,
};

function computeProduct(
  q: QuimicoItem,
  nivelInicialStr: string | undefined,
  nivelFinalStr: string | undefined,
  trasiegoL: number,
  volM3: number,
): ProductComputed {
  if (!nivelFinalStr || nivelFinalStr === '') return NULL_COMPUTED;
  if (!nivelInicialStr || nivelInicialStr === '') return NULL_COMPUTED;
  const ni = parseFloat(nivelInicialStr);
  const nf = parseFloat(nivelFinalStr);
  if (isNaN(ni) || isNaN(nf)) return NULL_COMPUTED;

  const consumoL   = ni - nf;
  const consumoReal = consumoL - trasiegoL;
  const kg         = q.unidad === 'L' ? consumoReal * q.densidad : consumoReal;
  return {
    active:         true,
    consumoL,
    consumoReal,
    kgConsumidos:   kg,
    ppm:            volM3 > 0 ? (kg / volM3) * 1000 : null,
    costoOp:        kg * q.precio_kg,
    fueraCapacidad: nf > q.capacidad,
    esIngreso:      nf > ni,
  };
}

// ─── Acordeón ────────────────────────────────────────────────────────────────
function AccordionSection({
  title, color, count, children, defaultOpen = false,
}: {
  title: string; color: string; count: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      border: `1px solid ${color}44`, borderRadius: 10, marginBottom: 12, overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: `${color}14`, border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            background: color, color: '#fff', borderRadius: 5, padding: '2px 8px',
            fontSize: 12, fontWeight: 700, letterSpacing: 0.3,
          }}>{count} químicos</span>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
        </span>
        <span style={{
          fontSize: 18, transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s', color,
        }}>▾</span>
      </button>
      {open && <div style={{ padding: '16px 16px 8px' }}>{children}</div>}
    </div>
  );
}

// ─── Componente tarjeta de producto ──────────────────────────────────────────
function ProductCard({
  q, control, watchProducts, computed, confirmCero, setConfirmCero, showTrasiego,
}: {
  q: QuimicoItem;
  control: ReturnType<typeof useForm<FormValues>>['control'];
  watchProducts: FormValues['products'];
  computed: ProductComputed;
  confirmCero: boolean;
  setConfirmCero: React.Dispatch<React.SetStateAction<boolean>>;
  showTrasiego: boolean;
}) {
  const c = computed;
  const p = watchProducts[q.id] ?? {};
  const cardClass = `reactivo-card${c.fueraCapacidad ? ' has-error' : c.active ? ' has-value' : ''}`;

  return (
    <div className={cardClass}>
      <div className="reactivo-card-header">
        <span className="reactivo-badge">{q.id}</span>
        <span className="reactivo-nombre">{q.nombre}</span>
        <span className="reactivo-meta">
          {q.unidad} · ρ {q.densidad} · Cap. {q.capacidad.toLocaleString('es-CO')}
        </span>
      </div>

      <div className="form-row-3">
        {/* Nivel Inicial — editable con pre-carga */}
        <div className="form-group">
          <label className="form-label">Nivel Inicial ({q.unidad})</label>
          <Controller
            name={`products.${q.id}.nivel_inicial`}
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="number" step="0.1" min="0"
                className="form-input"
                placeholder={`0 — ${q.capacidad}`}
              />
            )}
          />
        </div>

        {/* Nivel Final */}
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
                onChange={e => { if (confirmCero) setConfirmCero(false); field.onChange(e); }}
              />
            )}
          />
          {c.fueraCapacidad && (
            <span className="field-error">Supera la capacidad ({q.capacidad} {q.unidad})</span>
          )}
        </div>

        {/* L Consumidos */}
        <div className="form-group">
          <label className="form-label">
            {q.unidad === 'kg' ? 'kg' : 'L'} Consumidos
          </label>
          <div className={`form-readonly${
            c.consumoL === null ? '' :
            c.consumoL > 0 ? ' value-ok' :
            c.consumoL < 0 ? ' value-alert' : ''
          }`}>
            {c.consumoL !== null ? c.consumoL.toFixed(1) : '—'}
          </div>
        </div>
      </div>

      {/* Alerta: nivel final > inicial → ingreso obligatorio */}
      {c.esIngreso && (
        <div className="form-alert form-alert-warn" style={{ padding: '10px 12px', marginTop: 4 }}>
          <strong>⚠ Nivel final mayor al inicial — se realizó ingreso de producto.</strong>
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

      {/* Trasiego a PTAP — solo para quimicos designados (Q-02) */}
      {showTrasiego && c.active && (
        <div style={{
          marginTop: 8, padding: '8px 10px',
          background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <Controller
              name={`products.${q.id}.trasiego_check`}
              control={control}
              render={({ field }) => (
                <input type="checkbox" checked={!!field.value}
                  onChange={e => field.onChange(e.target.checked)} />
              )}
            />
            ¿Se trasegó coagulante a PTAP en este turno?
          </label>
          {p.trasiego_check && (
            <div className="form-group" style={{ marginTop: 8, marginBottom: 0 }}>
              <label className="form-label">Cantidad trasegada ({q.unidad})</label>
              <Controller
                name={`products.${q.id}.trasiego_l`}
                control={control}
                render={({ field }) => (
                  <input {...field} type="number" step="0.1" min="0"
                    className="form-input" placeholder="L trasegados a PTAP" />
                )}
              />
              {p.trasiego_l && parseFloat(p.trasiego_l) > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                  Consumo real para ppms: {(c.consumoReal ?? 0).toFixed(1)} {q.unidad}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {!c.active && (
        <span className="param-hint">
          {(p.nivel_final && p.nivel_final !== '') && (!p.nivel_inicial || p.nivel_inicial === '')
            ? '↑ Falta nivel inicial — ingresa el nivel del tanque al inicio de este turno'
            : (!p.nivel_final || p.nivel_final === '') && (p.nivel_inicial && p.nivel_inicial !== '')
              ? '↑ Ingresa el nivel final al cierre del turno'
              : '↑ Ingresa nivel inicial y final para ver L, Kg, PPM y Costo automáticamente'
          }
        </span>
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
              {c.ppm !== null ? c.ppm.toFixed(2) : '—'}
            </span>
          </div>
          {q.precio_kg > 0 && (
            <div className="reactivo-computed-item">
              <span className="reactivo-computed-label">Costo Operativo</span>
              <span className="reactivo-computed-value value-ok">
                {(c.costoOp ?? 0).toLocaleString('es-CO', {
                  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
                })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────
export default function FormatoReactivos() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [saving, setSaving]           = useState(false);
  const [confirmCero, setConfirmCero] = useState(false);
  const [ultimoHoro, setUltimoHoro]   = useState<UltimoHorometro | null>(null);
  const [loadingHoro, setLoadingHoro] = useState(true);

  // Pre-carga de niveles anteriores: quimico_id → UltimoNivel
  const [ultimosNiveles, setUltimosNiveles] = useState<Record<string, UltimoNivel>>({});

  // ── Modo manual de fecha / turno ──────────────────────────────────────────
  const [autoTurno]   = useState<'mañana' | 'tarde' | 'noche'>(getTurno);
  const [manualMode,  setManualMode]  = useState(false);
  const [manualFecha, setManualFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualTurno, setManualTurno] = useState<'mañana' | 'tarde' | 'noche'>(autoTurno);

  const now         = new Date();
  const today       = now.toISOString().slice(0, 10);
  const activeTurno = manualMode ? manualTurno : autoTurno;
  const activeFecha = manualMode ? manualFecha : today;

  // Todos los químicos en un array
  const TODOS = [...QUIMICOS_GEM, ...QUIMICOS_RO, ...QUIMICOS_PTAP] as QuimicoItem[];

  // ── Fetch último horómetro ─────────────────────────────────────────────────
  useEffect(() => {
    getUltimoHorometro()
      .then(data => setUltimoHoro(data))
      .catch(() => setUltimoHoro(null))
      .finally(() => setLoadingHoro(false));
  }, []);

  // ── Fetch último nivel para cada químico ──────────────────────────────────
  useEffect(() => {
    Promise.allSettled(
      TODOS.map(q =>
        getUltimoNivel(q.id).then(res => [q.id, res] as [string, UltimoNivel])
      )
    ).then(results => {
      const map: Record<string, UltimoNivel> = {};
      results.forEach(r => {
        if (r.status === 'fulfilled') map[r.value[0]] = r.value[1];
      });
      setUltimosNiveles(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Valores por defecto del form ──────────────────────────────────────────
  const defaultProducts = Object.fromEntries(
    TODOS.map(q => [q.id, {
      nivel_inicial: '',
      nivel_final: '',
      ingreso_l: '',
      trasiego_check: false,
      trasiego_l: '',
    }])
  );

  const { control, handleSubmit, watch, register, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      horometro_actual: '',
      caudal_mh: '80',
      products: defaultProducts,
      caudales_ro: { c12_actual: '', c13_actual: '' },
      observaciones_generales: '',
    }
  });

  // ── Pre-cargar nivel_inicial cuando llegan los datos del backend ──────────
  useEffect(() => {
    TODOS.forEach(q => {
      const ultimo = ultimosNiveles[q.id];
      if (ultimo?.nivel_final != null) {
        setValue(`products.${q.id}.nivel_inicial`, String(ultimo.nivel_final), { shouldValidate: false });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ultimosNiveles]);

  const watchHoro     = watch('horometro_actual');
  const watchCaudal   = watch('caudal_mh');
  const watchProducts = watch('products');
  const watchROCauda  = watch('caudales_ro');

  // ── Cálculos derivados ────────────────────────────────────────────────────
  const horoActual   = parseFloat(watchHoro) || 0;
  const horoUltimo   = ultimoHoro?.horometro ?? 0;
  const horasOp      = horoActual > 0 && horoUltimo > 0
    ? Math.max(0, horoActual - horoUltimo) : null;
  const caudal       = parseFloat(watchCaudal) || 80;
  const volGEM       = horasOp !== null ? horasOp * caudal : 0;

  // Caudales RO registrados
  const c12Act       = parseFloat(watchROCauda?.c12_actual ?? '') || 0;
  const c13Act       = parseFloat(watchROCauda?.c13_actual ?? '') || 0;

  // ── Computed por químico ──────────────────────────────────────────────────
  const computed = useMemo(
    () => Object.fromEntries(
      TODOS.map(q => {
        const p = watchProducts[q.id];
        const trasL = q.id === 'Q-02' && p?.trasiego_check && p?.trasiego_l
          ? (parseFloat(p.trasiego_l) || 0) : 0;
        // Para GEM usamos volGEM; para RO y PTAP también (ppms relativas)
        const vol = volGEM;
        return [q.id, computeProduct(q, p?.nivel_inicial, p?.nivel_final, trasL, vol)];
      })
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [watchProducts, volGEM],
  );
  /*adapter funciion{ formularios} computeProduct (q,p?.nivel_inicial*/

  const activeGEM  = QUIMICOS_GEM.filter(q => computed[q.id].active);
  const activeRO   = QUIMICOS_RO.filter(q  => computed[q.id].active);
  const activePTAP = QUIMICOS_PTAP.filter(q => computed[q.id].active);
  const allActive  = [...activeGEM, ...activeRO, ...activePTAP] as QuimicoItem[];

  const zeroProducts = allActive.filter(q => computed[q.id].consumoReal === 0);
  const ingresoRequired = allActive.filter(q => computed[q.id].esIngreso);
  const missingIngreso  = ingresoRequired.filter(q =>
    !watchProducts[q.id]?.ingreso_l || watchProducts[q.id]?.ingreso_l === ''
  );
  const hasCapacityErrors = allActive.some(q => computed[q.id].fueraCapacidad);
  const canSubmit = allActive.length > 0 && !hasCapacityErrors && missingIngreso.length === 0;

  // ── Guardado ───────────────────────────────────────────────────────────────
  const doSave = async (data: FormValues) => {
    if (allActive.length === 0) return;
    if (zeroProducts.length > 0 && !confirmCero) {
      setConfirmCero(true);
      return;
    }

    setSaving(true);

    const fechaPrefix = manualMode && activeFecha !== today
      ? `[Fecha manual: ${activeFecha}] ` : '';
    const obsGen = (data.observaciones_generales ?? '').trim();

    const rows: Omit<RegistroCosto, 'id' | 'created_at' | 'consumo' | 'ppm' | 'costo_operativo'>[] =
      allActive.map(q => {
        const p = data.products[q.id];
        const c = computed[q.id];
        const obsArr: string[] = [];
        if (fechaPrefix) obsArr.push(fechaPrefix.trim());
        if (c.esIngreso && p.ingreso_l) obsArr.push(`Ingreso recibido: ${p.ingreso_l} ${q.unidad}`);
        if (obsGen) obsArr.push(obsGen);

        const trasiegoL = q.id === 'Q-02' && p.trasiego_check && p.trasiego_l
          ? parseFloat(p.trasiego_l) || 0 : 0;
        const ingresoL = c.esIngreso && p.ingreso_l ? parseFloat(p.ingreso_l) || 0 : 0;

        return {
          turno:              activeTurno,
          usuario:            currentUser?.nombre ?? 'desconocido',
          equipo:             currentUser?.equipo ? JSON.stringify(currentUser.equipo) : undefined,
          id_quimico:         q.id,
          nombre_quimico:     q.nombre,
          unidad:             q.unidad,
          densidad_kg:        q.densidad,
          nivel_inicial:      parseFloat(p.nivel_inicial ?? '0') || 0,
          nivel_final:        parseFloat(p.nivel_final ?? '0') || 0,
          kg_consumidos:      parseFloat((c.kgConsumidos ?? 0).toFixed(4)),
          precio_kg:          q.precio_kg,
          horometro_inicial:  horoActual,
          caudal_tratado_gem: volGEM,
          horas_operacion:    horasOp ?? 0,
          observaciones:      obsArr.join(' | ') || undefined,
          ingreso_coagulante_l:         q.id === 'Q-02' ? ingresoL || undefined : undefined,
          trasegado_coagulante_ptap_l:  q.id === 'Q-02' && trasiegoL > 0 ? trasiegoL : undefined,
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
    const n = allActive.length;
    if (n === 0) return 'Completa al menos un producto';
    if (missingIngreso.length > 0) return `Completa los ingresos obligatorios (${missingIngreso.length})`;
    return `Enviar ${n} Registro${n !== 1 ? 's' : ''}`;
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="formato-page">
      <div className="formato-header" style={{ borderColor: '#3fb950' }}>
        <h1 className="formato-title">
          <span className="formato-num" style={{ background: '#3fb950' }}>F-02</span>
          Consumo Químico
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

        {/* ══ ACORDEÓN 1: QUÍMICA GEM ══════════════════════════════════════ */}
        <AccordionSection
          title="Química GEM"
          color="#3fb950"
          count={QUIMICOS_GEM.length}
          defaultOpen={true}
        >
          {/* Horómetro y Volumen — exclusivo GEM */}
          <div style={{
            background: '#3fb95010', border: '1px solid #3fb95033',
            borderRadius: 8, padding: '12px', marginBottom: 14,
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: '#3fb950' }}>
              Horómetro y Volumen Tratado
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Horómetro Actual (horas) *</label>
                <Controller
                  name="horometro_actual"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="number" step="0.001" min="0"
                      className={`form-input${errors.horometro_actual ? ' input-error' : ''}`}
                      placeholder="Ej: 17622.350"
                    />
                  )}
                />
                {errors.horometro_actual && (
                  <span className="field-error">{errors.horometro_actual.message}</span>
                )}
                {loadingHoro ? (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Cargando último registro…
                  </span>
                ) : ultimoHoro?.horometro != null ? (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Último: <strong>{Math.round(ultimoHoro.horometro).toLocaleString('es-CO')} h</strong>
                    {ultimoHoro.fecha && ` — ${ultimoHoro.fecha.slice(5).replace('-', '/')}`}
                    {ultimoHoro.turno && ` turno ${ultimoHoro.turno}`}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Sin registro anterior
                  </span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Horas de Operación (calculado)</label>
                <div className={`form-readonly${horasOp !== null ? (horasOp > 0 ? ' value-ok' : ' value-alert') : ''}`}>
                  {horasOp !== null ? `${horasOp.toFixed(3)} h` : '—'}
                </div>
                {horasOp !== null && horasOp <= 0 && (
                  <span className="field-error">Horómetro actual debe ser mayor al anterior.</span>
                )}
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Caudal de Tratamiento (m³/h)</label>
                <input
                  type="number" step="1" min="0"
                  className="form-input"
                  placeholder="80"
                  {...register('caudal_mh')}
                />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                  Por defecto: 80 m³/h
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Volumen Tratado GEM (m³)</label>
                <div className={`form-readonly${volGEM > 0 ? ' value-ok' : ''}`}>
                  {horasOp !== null ? `${volGEM.toFixed(0)} m³` : '—'}
                </div>
                {horasOp !== null && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                    = {horasOp.toFixed(3)} h × {caudal} m³/h
                  </span>
                )}
              </div>
            </div>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Completa el nivel final de los productos que apliquen en este turno.
          </p>
          <div className="reactivos-list">
            {QUIMICOS_GEM.map(q => (
              <ProductCard
                key={q.id}
                q={q}
                control={control}
                watchProducts={watchProducts}
                computed={computed[q.id]}
                confirmCero={confirmCero}
                setConfirmCero={setConfirmCero}
                showTrasiego={q.id === 'Q-02'}
              />
            ))}
          </div>
        </AccordionSection>

        {/* ══ ACORDEÓN 2: QUÍMICA OSMOSIS (RO) ════════════════════════════ */}
        <AccordionSection
          title="Química Osmosis (RO)"
          color="#1f6feb"
          count={QUIMICOS_RO.length}
        >
          {/* Sección caudales RO */}
          <div style={{
            background: '#1f6feb10', border: '1px solid #1f6feb33',
            borderRadius: 8, padding: '12px', marginBottom: 14,
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: '#1f6feb' }}>
              Caudales RO
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">C-12 Lectura Actual (m³) — Entrada RO</label>
                <input
                  type="number" step="1" min="0"
                  className="form-input"
                  placeholder="Lectura actual"
                  {...register('caudales_ro.c12_actual')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">C-13 Lectura Actual (m³) — Salida RO</label>
                <input
                  type="number" step="1" min="0"
                  className="form-input"
                  placeholder="Lectura actual"
                  {...register('caudales_ro.c13_actual')}
                />
              </div>
            </div>
            {(c12Act > 0 || c13Act > 0) && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                Registradas: C-12 = {c12Act.toLocaleString('es-CO')} m³ · C-13 = {c13Act.toLocaleString('es-CO')} m³
              </div>
            )}
          </div>

          <div className="reactivos-list">
            {QUIMICOS_RO.map(q => (
              <ProductCard
                key={q.id}
                q={q}
                control={control}
                watchProducts={watchProducts}
                computed={computed[q.id]}
                confirmCero={confirmCero}
                setConfirmCero={setConfirmCero}
                showTrasiego={false}
              />
            ))}
          </div>
        </AccordionSection>

        {/* ══ ACORDEÓN 3: QUÍMICA PTAP ═════════════════════════════════════ */}
        <AccordionSection
          title="Química PTAP"
          color="#da7b11"
          count={QUIMICOS_PTAP.length}
        >
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Reactivos de la Planta de Tratamiento de Agua Potable (PTAP).
          </p>
          <div className="reactivos-list">
            {QUIMICOS_PTAP.map(q => (
              <ProductCard
                key={q.id}
                q={q}
                control={control}
                watchProducts={watchProducts}
                computed={computed[q.id]}
                confirmCero={confirmCero}
                setConfirmCero={setConfirmCero}
                showTrasiego={false}
              />
            ))}
          </div>
        </AccordionSection>

        {/* ── Observaciones generales ───────────────────────────────────── */}
        <div className="form-section-title">Observaciones Generales</div>
        <div className="form-group">
          <label className="form-label">Observaciones del turno (opcional)</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Novedades del turno, anomalías, condiciones especiales..."
            {...register('observaciones_generales')}
          />
        </div>

        {/* ── Confirmación consumo cero ─────────────────────────────────── */}
        {confirmCero && (
          <div className="form-alert form-alert-warn">
            <strong>Consumo cero en:</strong>
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
