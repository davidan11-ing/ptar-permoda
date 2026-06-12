import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { ROUTES } from '../../lib/routes';
import {
  createReactivosBatch,
  getUltimoHorometro,
  getUltimoNivel,
  getUltimaLecturaRO,
  getUltimaLecturaPTAP,
} from '../../services/ptarClient';
import type {
  RegistroCosto, UltimoHorometro, UltimoNivel,
  UltimaLecturaRO, UltimaLecturaPTAP,
} from '../../services/ptarClient';
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
  c12_actual:          z.string().optional(),
  c13_actual:          z.string().optional(),
  caudal_entrada_mh:   z.string().default('5'),
  caudal_salida_mh:    z.string().optional(),
  cartuchos_cambiados: z.boolean().default(false),
});

const caudalesPTAPSchema = z.object({
  entrada_actual:    z.string().optional(),
  salida_actual:     z.string().optional(),
  caudal_entrada_mh: z.string().default('20'),
  caudal_salida_mh:  z.string().optional(),
  cebs_realizados:   z.boolean().default(false),
  cebs_cantidad:     z.string().optional(),
  manga_cambiada:    z.boolean().default(false),
  manga_cantidad:    z.string().optional(),
});

const formSchema = z.object({
  horometro_actual:        z.string().min(1, 'Ingresa el horómetro actual'),
  caudal_mh:               z.string().default('80'),
  products:                z.record(z.string(), productSchema),
  caudales_ro:             caudalesROSchema.optional(),
  caudales_ptap:           caudalesPTAPSchema.optional(),
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
  pesosM3:         number | null;  // $/m³ = costoOp / volGEM
  fueraCapacidad:  boolean;
  esIngreso:       boolean;
}

const NULL_COMPUTED: ProductComputed = {
  active: false, consumoL: null, consumoReal: null,
  kgConsumidos: null, ppm: null, costoOp: null, pesosM3: null,
  fueraCapacidad: false, esIngreso: false,
};

function computeProduct(
  q: QuimicoItem,
  nivelInicialStr: string | undefined,
  nivelFinalStr: string | undefined,
  trasiegoL: number,
  volM3: number,
  ingresoL: number = 0,
): ProductComputed {
  if (!nivelFinalStr || nivelFinalStr === '') return NULL_COMPUTED;
  if (!nivelInicialStr || nivelInicialStr === '') return NULL_COMPUTED;
  const ni = parseFloat(nivelInicialStr);
  const nf = parseFloat(nivelFinalStr);
  if (isNaN(ni) || isNaN(nf)) return NULL_COMPUTED;

  // consumo = lo que había + lo que ingresó - lo que quedó
  const consumoL   = ni + ingresoL - nf;
  const consumoReal = consumoL - trasiegoL;
  const kg         = q.unidad === 'L' ? consumoReal * q.densidad : consumoReal;
  const costo = kg * q.precio_kg;
  return {
      active:         true,
      consumoL,
      consumoReal,
      kgConsumidos:   kg,
      ppm:            volM3 > 0 ? (kg / volM3) * 1000 : null,
      costoOp:        costo,
      pesosM3:        (volM3 > 0 && q.precio_kg > 0) ? costo / volM3 : null,
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
          {c.pesosM3 !== null && (
            <div className="reactivo-computed-item" style={{ gridColumn: '1 / -1' }}>
              <span className="reactivo-computed-label" style={{ color: '#7ec8c8' }}>
                $/m³ tratado
              </span>
              <span className="reactivo-computed-value" style={{ color: '#7ec8c8', fontWeight: 700 }}>
                {c.pesosM3.toLocaleString('es-CO', {
                  style: 'currency', currency: 'COP', maximumFractionDigits: 1,
                })}/m³
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

  // Últimas lecturas de contadores RO y PTAP
  const [ultimaLectRO,   setUltimaLectRO]   = useState<UltimaLecturaRO>({ c12: null, c13: null, fecha: null, turno: null });
  const [ultimaLectPTAP, setUltimaLectPTAP] = useState<UltimaLecturaPTAP>({ entrada: null, permeado: null, fecha: null, turno: null });

  // ── Modo manual de fecha / turno ──────────────────────────────────────────
  // autoTurno se recalcula cada minuto para detectar cambio de turno mientras
  // el formulario está abierto (ej: se abre en Mañana y se envía en Tarde)
  const [autoTurno, setAutoTurno] = useState<'mañana' | 'tarde' | 'noche'>(getTurno);
  useEffect(() => {
    const id = setInterval(() => setAutoTurno(getTurno()), 60_000);
    return () => clearInterval(id);
  }, []);

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

  // ── Fetch últimas lecturas de contadores RO y PTAP ────────────────────────
  useEffect(() => {
    getUltimaLecturaRO().then(setUltimaLectRO).catch(() => {});
    getUltimaLecturaPTAP().then(setUltimaLectPTAP).catch(() => {});
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
      caudales_ro:   { c12_actual: '', c13_actual: '', caudal_entrada_mh: '5', caudal_salida_mh: '', cartuchos_cambiados: false },
      caudales_ptap: {
        entrada_actual: '', salida_actual: '', caudal_entrada_mh: '20', caudal_salida_mh: '',
        cebs_realizados: false, cebs_cantidad: '1',
        manga_cambiada: false, manga_cantidad: '1',
      },
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
  const watchPTAP     = watch('caudales_ptap');

  // ── GEM ───────────────────────────────────────────────────────────────────
  const horoActual = parseFloat(watchHoro) || 0;
  const horoUltimo = ultimoHoro?.horometro ?? 0;
  const horasOp    = horoActual > 0 && horoUltimo > 0
    ? Math.max(0, horoActual - horoUltimo) : null;
  const caudal  = parseFloat(watchCaudal) || 80;
  const volGEM  = horasOp !== null ? horasOp * caudal : 0;

  // ── RO — contadores C-12 (Entrada) y C-13 (Permeado) ─────────────────────
  const roC12Ant    = ultimaLectRO.c12 ?? 0;
  const roC12Act    = parseFloat(watchROCauda?.c12_actual ?? '') || 0;
  const roC13Ant    = ultimaLectRO.c13 ?? 0;
  const roC13Act    = parseFloat(watchROCauda?.c13_actual ?? '') || 0;
  const roCaudalEnt = parseFloat(watchROCauda?.caudal_entrada_mh ?? '') || 5;
  const roCaudalSal = parseFloat(watchROCauda?.caudal_salida_mh  ?? '') || 0;
  // Delta = lectura actual − lectura anterior del contador acumulado
  const volROEntrada  = roC12Act > 0 && roC12Ant > 0 ? Math.max(0, roC12Act - roC12Ant) : 0;
  const volROSalida   = roC13Act > 0 && roC13Ant > 0 ? Math.max(0, roC13Act - roC13Ant) : 0;
  const horasOpRO     = volROEntrada > 0 && roCaudalEnt > 0 ? volROEntrada / roCaudalEnt : null;

  // ── PTAP — contadores Entrada y Permeado ─────────────────────────────────
  const ptapEntAnt      = ultimaLectPTAP.entrada  ?? 0;
  const ptapEntAct      = parseFloat(watchPTAP?.entrada_actual ?? '') || 0;
  const ptapSalAnt      = ultimaLectPTAP.permeado ?? 0;
  const ptapSalAct      = parseFloat(watchPTAP?.salida_actual ?? '') || 0;
  const ptapCaudalEnt   = parseFloat(watchPTAP?.caudal_entrada_mh ?? '') || 20;
  const ptapCaudalSal   = parseFloat(watchPTAP?.caudal_salida_mh  ?? '') || 0;
  // Delta = lectura actual − lectura anterior del contador acumulado
  const volPTAPEntrada  = ptapEntAct > 0 && ptapEntAnt > 0 ? Math.max(0, ptapEntAct - ptapEntAnt) : 0;
  const volPTAPSalida   = ptapSalAct > 0 && ptapSalAnt > 0 ? Math.max(0, ptapSalAct - ptapSalAnt) : 0;
  const horasOpPTAP     = volPTAPEntrada > 0 && ptapCaudalEnt > 0 ? volPTAPEntrada / ptapCaudalEnt : null;

  // ── Computed por químico — usa volumen del sistema correcto ───────────────
  const computed = Object.fromEntries(
    TODOS.map(q => {
      const p = watchProducts[q.id];
      const trasL = q.id === 'Q-02' && p?.trasiego_check && p?.trasiego_l
        ? (parseFloat(p.trasiego_l) || 0) : 0;
      const ingrL = p?.ingreso_l ? (parseFloat(p.ingreso_l) || 0) : 0;
      const vol = q.sistema === 'RO'   ? volROEntrada
                : q.sistema === 'PTAP' ? volPTAPEntrada
                : volGEM;
      return [q.id, computeProduct(q, p?.nivel_inicial, p?.nivel_final, trasL, vol, ingrL)];
    })
  );

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

        // Volumen y horas según sistema
        const volSistema   = q.sistema === 'RO'   ? volROEntrada
                           : q.sistema === 'PTAP' ? volPTAPEntrada
                           : volGEM;
        const horasSistema = q.sistema === 'RO'   ? (horasOpRO  ?? 0)
                           : q.sistema === 'PTAP' ? (horasOpPTAP ?? 0)
                           : (horasOp ?? 0);

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
          caudal_tratado_gem: volSistema,
          horas_operacion:    horasSistema,
          observaciones:      obsArr.join(' | ') || undefined,
          ingreso_coagulante_l:        q.id === 'Q-02' ? ingresoL || undefined : undefined,
          trasegado_coagulante_ptap_l: q.id === 'Q-02' && trasiegoL > 0 ? trasiegoL : undefined,
          // Contadores RO
          ...(q.sistema === 'RO' && {
            lectura_entrada_actual:  roC12Act > 0 ? roC12Act : undefined,
            lectura_permeado_actual: roC13Act > 0 ? roC13Act : undefined,
            caudal_entrada_mh:       roCaudalEnt,
            caudal_salida_mh:        roCaudalSal > 0 ? roCaudalSal : undefined,
            volumen_entrada_m3:      volROEntrada  > 0 ? volROEntrada  : undefined,
            volumen_permeado_m3:     volROSalida   > 0 ? volROSalida   : undefined,
            horas_operacion_sistema: horasOpRO     ?? undefined,
            cartuchos_cambiados:     data.caudales_ro?.cartuchos_cambiados ?? false,
          }),
          // Contadores + mantenimiento PTAP
          ...(q.sistema === 'PTAP' && {
            lectura_entrada_actual:  ptapEntAct > 0 ? ptapEntAct : undefined,
            lectura_permeado_actual: ptapSalAct > 0 ? ptapSalAct : undefined,
            caudal_entrada_mh:       ptapCaudalEnt,
            caudal_salida_mh:        ptapCaudalSal > 0 ? ptapCaudalSal : undefined,
            volumen_entrada_m3:      volPTAPEntrada > 0 ? volPTAPEntrada : undefined,
            volumen_permeado_m3:     volPTAPSalida  > 0 ? volPTAPSalida  : undefined,
            horas_operacion_sistema: horasOpPTAP   ?? undefined,
            cebs_realizados:   data.caudales_ptap?.cebs_realizados ?? false,
            cebs_cantidad:     data.caudales_ptap?.cebs_realizados
                                 ? (parseInt(data.caudales_ptap?.cebs_cantidad ?? '1') || 1) : 0,
            manga_cambiada:    data.caudales_ptap?.manga_cambiada ?? false,
            manga_cantidad:    data.caudales_ptap?.manga_cambiada
                                 ? (parseInt(data.caudales_ptap?.manga_cantidad ?? '1') || 1) : 0,
          }),
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
                  {horasOp !== null ? `${+horasOp.toFixed(2)} h` : '—'}
                </div>
                {horasOp !== null && horasOp <= 0 && (
                  <span className="field-error">Horómetro actual debe ser mayor al anterior.</span>
                )}
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Caudal de Tratamiento (m³/h)</label>
                <Controller
                  name="caudal_mh"
                  control={control}
                  defaultValue="80"
                  render={({ field }) => (
                    <input
                      type="number" step="1" min="0"
                      className="form-input"
                      placeholder="80"
                      value={field.value ?? '80'}
                      onChange={e => field.onChange(e.target.value === '' ? '80' : e.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  )}
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
                    = {+horasOp.toFixed(2)} h × {caudal} m³/h
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
          {/* Contadores y caudal RO */}
          <div style={{
            background: '#1f6feb10', border: '1px solid #1f6feb33',
            borderRadius: 8, padding: '12px', marginBottom: 14,
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#1f6feb' }}>
              Contadores y Caudal
            </div>

            {/* C-12 — Contador Entrada */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 500, fontSize: 11, color: '#1f6feb', marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                C-12 — Contador Entrada RO
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Lectura actual (m³) *</label>
                  <input type="number" step="1" min="0" className="form-input"
                    placeholder="Ej: 4771000"
                    {...register('caudales_ro.c12_actual')} />
                  {ultimaLectRO.c12 != null ? (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                      Último: <strong>{ultimaLectRO.c12.toLocaleString('es-CO')} m³</strong>
                      {ultimaLectRO.fecha && ` — ${ultimaLectRO.fecha.slice(5).replace('-', '/')}`}
                      {ultimaLectRO.turno && ` turno ${ultimaLectRO.turno}`}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#f0883e', marginTop: 4, display: 'block' }}>
                      Sin lectura anterior — ingresa la lectura del contador (m³ acumulados)
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Volumen entrada (m³)</label>
                  <div className={`form-readonly${volROEntrada > 0 ? ' value-ok' : ''}`}>
                    {volROEntrada > 0 ? `${volROEntrada.toLocaleString('es-CO')} m³` : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* C-13 — Contador Permeado */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 500, fontSize: 11, color: '#1f6feb', marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                C-13 — Contador Permeado (Salida)
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Lectura actual (m³) *</label>
                  <input type="number" step="1" min="0" className="form-input"
                    placeholder="Ej: 315500"
                    {...register('caudales_ro.c13_actual')} />
                  {ultimaLectRO.c13 != null ? (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                      Último: <strong>{ultimaLectRO.c13.toLocaleString('es-CO')} m³</strong>
                      {ultimaLectRO.fecha && ` — ${ultimaLectRO.fecha.slice(5).replace('-', '/')}`}
                      {ultimaLectRO.turno && ` turno ${ultimaLectRO.turno}`}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#f0883e', marginTop: 4, display: 'block' }}>
                      Sin lectura anterior — ingresa la lectura del contador (m³ acumulados)
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Volumen permeado (m³)</label>
                  <div className={`form-readonly${volROSalida > 0 ? ' value-ok' : ''}`}>
                    {volROSalida > 0 ? `${volROSalida.toLocaleString('es-CO')} m³` : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Alerta salida > entrada RO */}
            {volROSalida > 0 && volROEntrada > 0 && volROSalida > volROEntrada && (
              <div className="form-alert form-alert-warn" style={{ marginBottom: 12 }}>
                ⚠️ El volumen de salida ({volROSalida.toLocaleString('es-CO')} m³) supera el volumen de entrada ({volROEntrada.toLocaleString('es-CO')} m³). Verifica las lecturas.
              </div>
            )}

            {/* Caudal y horas */}
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Caudal entrada (m³/h)</label>
                <input type="number" step="0.1" min="0" className="form-input"
                  placeholder="Ej: 5"
                  {...register('caudales_ro.caudal_entrada_mh')} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                  Por defecto: 5 m³/h
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Caudal salida / permeado (m³/h)</label>
                <input type="number" step="0.1" min="0" className="form-input"
                  placeholder="Ej: 4"
                  {...register('caudales_ro.caudal_salida_mh')} />
              </div>
              <div className="form-group">
                <label className="form-label">Horas de Operación (calculado)</label>
                <div className={`form-readonly${horasOpRO !== null ? ' value-ok' : ''}`}>
                  {horasOpRO !== null ? `${horasOpRO.toFixed(2)} h` : '—'}
                </div>
                {horasOpRO !== null && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                    = {volROEntrada.toLocaleString('es-CO')} m³ ÷ {roCaudalEnt} m³/h
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mantenimiento RO */}
          <div style={{
            padding: '10px 12px', background: 'var(--bg-secondary)',
            borderRadius: 6, border: '1px solid var(--border)', marginBottom: 14,
          }}>
            <div style={{ fontWeight: 600, fontSize: 11, color: '#8b949e',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Mantenimiento
            </div>
            <Controller name="caudales_ro.cartuchos_cambiados" control={control}
              render={({ field }) => (
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  padding: '10px 14px', borderRadius: 8,
                  border: `2px solid ${field.value ? '#f0883e' : 'var(--border)'}`,
                  background: field.value ? '#2d1a0a' : 'transparent',
                  transition: 'all 0.15s',
                }}>
                  <input type="checkbox" checked={!!field.value}
                    onChange={e => field.onChange(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: '#f0883e', cursor: 'pointer' }} />
                  <span style={{ fontSize: 14, fontWeight: field.value ? 700 : 500,
                    color: field.value ? '#f0883e' : 'var(--text-secondary)' }}>
                    ¿Se cambiaron cartuchos en este turno?
                  </span>
                </label>
              )} />
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
          {/* Contadores y caudal PTAP */}
          <div style={{
            background: '#da7b1110', border: '1px solid #da7b1133',
            borderRadius: 8, padding: '12px', marginBottom: 14,
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#da7b11' }}>
              Contadores y Caudal
            </div>

            {/* Contador Entrada PTAP */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 500, fontSize: 11, color: '#da7b11', marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Contador Entrada PTAP
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Lectura actual (m³) *</label>
                  <input type="number" step="1" min="0" className="form-input"
                    placeholder="Ej: 3750"
                    {...register('caudales_ptap.entrada_actual')} />
                  {ultimaLectPTAP.entrada != null ? (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                      Último: <strong>{ultimaLectPTAP.entrada.toLocaleString('es-CO')} m³</strong>
                      {ultimaLectPTAP.fecha && ` — ${ultimaLectPTAP.fecha.slice(5).replace('-', '/')}`}
                      {ultimaLectPTAP.turno && ` turno ${ultimaLectPTAP.turno}`}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#f0883e', marginTop: 4, display: 'block' }}>
                      Sin lectura anterior — ingresa la lectura del contador (m³ acumulados)
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Volumen entrada (m³)</label>
                  <div className={`form-readonly${volPTAPEntrada > 0 ? ' value-ok' : ''}`}>
                    {volPTAPEntrada > 0 ? `${volPTAPEntrada.toLocaleString('es-CO')} m³` : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Contador Salida PTAP */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 500, fontSize: 11, color: '#da7b11', marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Contador Salida PTAP
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Lectura actual (m³) *</label>
                  <input type="number" step="1" min="0" className="form-input"
                    placeholder="Ej: 3440"
                    {...register('caudales_ptap.salida_actual')} />
                  {ultimaLectPTAP.permeado != null ? (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                      Último: <strong>{ultimaLectPTAP.permeado.toLocaleString('es-CO')} m³</strong>
                      {ultimaLectPTAP.fecha && ` — ${ultimaLectPTAP.fecha.slice(5).replace('-', '/')}`}
                      {ultimaLectPTAP.turno && ` turno ${ultimaLectPTAP.turno}`}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#f0883e', marginTop: 4, display: 'block' }}>
                      Sin lectura anterior — ingresa la lectura del contador (m³ acumulados)
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Volumen Salida (m³)</label>
                  <div className={`form-readonly${volPTAPSalida > 0 ? ' value-ok' : ''}`}>
                    {volPTAPSalida > 0 ? `${volPTAPSalida.toLocaleString('es-CO')} m³` : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Alerta: salida no puede superar entrada */}
            {volPTAPSalida > 0 && volPTAPEntrada > 0 && volPTAPSalida > volPTAPEntrada && (
              <div className="form-alert form-alert-warn" style={{ marginBottom: 12 }}>
                ⚠️ El volumen de salida ({volPTAPSalida.toLocaleString('es-CO')} m³) supera el volumen de entrada ({volPTAPEntrada.toLocaleString('es-CO')} m³). Verifica las lecturas.
              </div>
            )}

            {/* Caudal y horas */}
            <div className="form-row-3" style={{ marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">Caudal entrada (m³/h)</label>
                <input type="number" step="0.1" min="0" className="form-input"
                  placeholder="Ej: 20"
                  {...register('caudales_ptap.caudal_entrada_mh')} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                  Por defecto: 20 m³/h
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Caudal Salida (m³/h)</label>
                <input type="number" step="0.1" min="0" className="form-input"
                  placeholder="Ej: 18"
                  {...register('caudales_ptap.caudal_salida_mh')} />
              </div>
              <div className="form-group">
                <label className="form-label">Horas de Operación (calculado)</label>
                <div className={`form-readonly${horasOpPTAP !== null ? ' value-ok' : ''}`}>
                  {horasOpPTAP !== null ? `${horasOpPTAP.toFixed(2)} h` : '—'}
                </div>
                {horasOpPTAP !== null && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                    = {volPTAPEntrada.toLocaleString('es-CO')} m³ ÷ {ptapCaudalEnt} m³/h
                  </span>
                )}
              </div>
            </div>

            {/* Eventos de mantenimiento */}
            <div style={{
              padding: '10px 12px', background: 'var(--bg-secondary)',
              borderRadius: 6, border: '1px solid var(--border)',
            }}>
              <div style={{ fontWeight: 600, fontSize: 11, color: '#8b949e',
                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Eventos de mantenimiento
              </div>

              {/* CEBs */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', fontSize: 13, marginBottom: 6 }}>
                <Controller name="caudales_ptap.cebs_realizados" control={control}
                  render={({ field }) => (
                    <input type="checkbox" checked={!!field.value}
                      onChange={e => field.onChange(e.target.checked)} />
                  )} />
                ¿Se realizaron CEBs en este turno?
              </label>
              {watchPTAP?.cebs_realizados && (
                <div className="form-group" style={{ marginTop: 4, marginBottom: 10, paddingLeft: 22 }}>
                  <label className="form-label">¿Cuántos CEBs?</label>
                  <input type="number" step="1" min="1" className="form-input"
                    placeholder="1"
                    style={{ maxWidth: 120 }}
                    {...register('caudales_ptap.cebs_cantidad')} />
                </div>
              )}

              {/* Manga */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', fontSize: 13 }}>
                <Controller name="caudales_ptap.manga_cambiada" control={control}
                  render={({ field }) => (
                    <input type="checkbox" checked={!!field.value}
                      onChange={e => field.onChange(e.target.checked)} />
                  )} />
                ¿Se cambió la manga en este turno?
              </label>
              {watchPTAP?.manga_cambiada && (
                <div className="form-group" style={{ marginTop: 4, marginBottom: 0, paddingLeft: 22 }}>
                  <label className="form-label">¿Cuántas veces?</label>
                  <input type="number" step="1" min="1" className="form-input"
                    placeholder="1"
                    style={{ maxWidth: 120 }}
                    {...register('caudales_ptap.manga_cantidad')} />
                </div>
              )}
            </div>
          </div>

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

        {/* ── Banners de costo por sistema + total general ──────────────── */}
        {allActive.length > 0 && (() => {
          const costoGEM  = activeGEM.reduce((s, q)  => s + (computed[q.id].costoOp ?? 0), 0);
          const costoRO   = activeRO.reduce((s, q)   => s + (computed[q.id].costoOp ?? 0), 0);
          const costoPTAP = activePTAP.reduce((s, q) => s + (computed[q.id].costoOp ?? 0), 0);
          const costoTotal = costoGEM + costoRO + costoPTAP; void costoTotal;

          const sistemaRows: { label: string; color: string; bg: string; costo: number; vol: number; count: number }[] = [
            { label: 'GEM',  color: '#7ec8c8', bg: 'linear-gradient(135deg, #0d1a1a 0%, #0a1e14 100%)', costo: costoGEM,  vol: volGEM,       count: activeGEM.length },
            { label: 'RO',   color: '#d2a8ff', bg: 'linear-gradient(135deg, #12101a 0%, #0e0a1a 100%)', costo: costoRO,   vol: volROEntrada,  count: activeRO.length },
            { label: 'PTAP', color: '#ffa657', bg: 'linear-gradient(135deg, #1a1208 0%, #1a1000 100%)', costo: costoPTAP, vol: volPTAPEntrada,count: activePTAP.length },
          ].filter(r => r.count > 0);

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {/* Filas por sistema */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {sistemaRows.map(r => (
                  <div key={r.label} style={{
                    flex: '1 1 140px',
                    background: r.bg,
                    border: `1px solid ${r.color}55`,
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}>
                    <div>
                      <div style={{ fontSize: 10, color: r.color, letterSpacing: '0.08em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 1 }}>
                        {r.label}
                      </div>
                      <div style={{ fontSize: 11, color: '#8b949e' }}>
                        {r.count} reactivo{r.count !== 1 ? 's' : ''}
                        {r.vol > 0 && <> · {r.vol.toFixed(0)} m³</>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: r.color, fontFamily: 'monospace', lineHeight: 1 }}>
                        {r.vol > 0
                          ? `${(r.costo / r.vol).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 1 })}/m³`
                          : r.costo.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                      </div>
                      <div style={{ fontSize: 10, color: '#484f58', marginTop: 1 }}>
                        = {r.costo.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          );
        })()}

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
