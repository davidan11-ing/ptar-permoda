// Formato F-05: condiciones de operación de MBR, RO y PTAP con cálculos de eficiencia en línea
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { ROUTES } from '../../lib/routes';
import { TURNO_LABELS, BITACORA_TURNO, getTurno } from '../../lib/utils/time';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  getCaudalesROTurno,
  getCaudalesPTAPTurno,
  getUltimaCondicionRO,
  saveCondicionesMbr,
  saveCondicionesRo,
  saveCondicionesPtap,
} from '../../services/ptarClient';
import type { CaudalesROTurno, CaudalesPTAPTurno } from '../../services/ptarClient';

// ─── Schemas ─────────────────────────────────────────────────────────────────

// Schema Zod para una unidad MBR (campos opcionales, purga y recirculación con duración)
const mbrUnitSchema = z.object({
  caudal_permeado:   z.string().optional(),
  tmp:               z.string().optional(),
  nivel_tmp:         z.enum(['bajo', 'medio', 'alto']).optional(),
  purga:             z.boolean().default(false),
  purga_min:         z.string().optional(),
  recirculacion:     z.boolean().default(false),
  recirculacion_min: z.string().optional(),
  observaciones:     z.string().optional(),
});

// Schema completo del formulario: MBR1, MBR2, RO y PTAP
const formSchema = z.object({
  mbr1: mbrUnitSchema,
  mbr2: mbrUnitSchema,
  p_entrada_e1:              z.string().optional(),
  p_salida_e1:               z.string().optional(),
  p_entrada_e2:              z.string().optional(),
  p_salida_e2:               z.string().optional(),
  q_permeado_e1:             z.string().optional(),
  q_permeado_e2:             z.string().optional(),
  q_rechazo_rotametro:       z.string().optional(),
  // caudales RO editables (pre-cargados de F-02)
  q_entrada_ro:              z.string().optional(),
  q_permeado_total_ro:       z.string().optional(),
  p_filtro_cartuchos:        z.string().optional(),
  p_f1:                      z.string().optional(),
  p_f2:                      z.string().optional(),
  p_f3:                      z.string().optional(),
  nueva_fecha_cip:           z.string().optional(),
  obs_ro:                    z.string().optional(),
  // caudal PTAP editable (pre-cargado de F-02)
  caudal_ptap_entrada:       z.string().optional(),
  tmp_pantalla:              z.string().optional(),
  tiempo_filtracion_min:     z.string().optional(),
  tiempo_purga_clarif_min:   z.string().optional(),
  frecuencia_purga_clarif_h: z.string().optional(),
  obs_ptap:                  z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Parsea un string a float; retorna null si está vacío o no es número
function pf(s: string | undefined): number | null {
  if (!s || s.trim() === '') return null;
  const v = parseFloat(s);
  return isNaN(v) ? null : v;
}

// Formatea un número con decimales y sufijo; retorna '—' si es null
function fmtVal(v: number | null, decimals = 2, suffix = ''): string {
  if (v === null) return '—';
  return `${v.toFixed(decimals)}${suffix}`;
}

// Convierte fecha ISO a formato dd/mm/yyyy
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

// ─── Componentes pequeños ─────────────────────────────────────────────────────

// Sección colapsable con título y color de acento configurable
function AccordionSection({
  title, color, children, defaultOpen = false,
}: {
  title: string; color: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: `1px solid ${color}44`, borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: `${color}14`, border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 15 }}>{title}</span>
        <span style={{ fontSize: 18, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', color }}>▾</span>
      </button>
      {open && <div style={{ padding: '16px 16px 8px' }}>{children}</div>}
    </div>
  );
}

// Campo de solo lectura con etiqueta y texto de ayuda opcional
function ReadonlyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="form-readonly">{value}</div>
      {hint && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>{hint}</span>}
    </div>
  );
}

// Campo calculado de solo lectura con color opcional para resaltar el valor
function CalcField({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="form-group">
      <label className="form-label" style={{ fontSize: 11 }}>{label}</label>
      <div className={`form-readonly${value !== '—' ? ' value-ok' : ''}`} style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}

// ─── Sub-sección MBR ─────────────────────────────────────────────────────────

// Sub-formulario de una unidad MBR: caudal, TMP, nivel, purga y recirculación
function MbrUnidad({
  prefix, label, color, control, watch,
}: {
  prefix: 'mbr1' | 'mbr2';
  label:  string;
  color:  string;
  control: ReturnType<typeof useForm<FormValues>>['control'];
  watch: ReturnType<typeof useForm<FormValues>>['watch'];
}) {
  const purga = watch(`${prefix}.purga`);
  const recir  = watch(`${prefix}.recirculacion`);
  // Opciones de nivel de lodo con descripción visual para el operario
  const nivelOpts = [
    { value: 'bajo',  label: 'Bajo',  desc: 'Por debajo o al borde de la canastilla' },
    { value: 'medio', label: 'Medio', desc: 'A la mitad de las canastillas' },
    { value: 'alto',  label: 'Alto',  desc: 'Menos de 60 cm de la altura máxima' },
  ];

  return (
    <div style={{
      background: `${color}08`, border: `1px solid ${color}33`,
      borderRadius: 8, padding: '12px', marginBottom: 12,
    }}>
      <div style={{ fontWeight: 600, fontSize: 13, color, marginBottom: 12 }}>{label}</div>

      {/* Caudal + TMP */}
      <div className="form-row-2" style={{ marginBottom: 12 }}>
        <div className="form-group">
          <label className="form-label">Caudal Permeado (m³/h)</label>
          <Controller name={`${prefix}.caudal_permeado`} control={control}
            render={({ field }) => (
              <input {...field} type="number" step="0.1" min="0" className="form-input" placeholder="Ej: 3.5" />
            )} />
        </div>
        <div className="form-group">
          <label className="form-label">TMP (mbar)</label>
          <Controller name={`${prefix}.tmp`} control={control}
            render={({ field }) => {
              const numVal = parseFloat(field.value ?? '');
              const tmpNum = !isNaN(numVal) ? Math.abs(numVal) * -1 : null;
              const alarmaTMP = tmpNum !== null && tmpNum < -390;
              return (
                <div>
                  <input
                    type="number"
                    step="0.1"
                    className="form-input"
                    placeholder="Ej: 120"
                    value={field.value ?? ''}
                    style={alarmaTMP ? { borderColor: '#e3b341', background: '#1f1500', color: '#e3b341' } : undefined}
                    onChange={e => {
                      const v = e.target.value;
                      if (v === '' || v === '-') { field.onChange(v); return; }
                      const n = parseFloat(v);
                      if (!isNaN(n)) field.onChange(String(Math.abs(n) * -1));
                      else field.onChange(v);
                    }}
                  />
                  {tmpNum !== null && (
                    <span style={{ fontSize: 11, marginTop: 3, display: 'block', color: alarmaTMP ? '#e3b341' : 'var(--text-muted)' }}>
                      {alarmaTMP ? `⚠ TMP = ${tmpNum} mbar — supera límite de -390 mbar` : `TMP: ${tmpNum} mbar`}
                    </span>
                  )}
                </div>
              );
            }} />
        </div>
      </div>

      {/* Nivel TMP */}
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label">Nivel en que se midió la TMP</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          {nivelOpts.map(opt => (
            <Controller key={opt.value} name={`${prefix}.nivel_tmp`} control={control}
              render={({ field }) => (
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 4, cursor: 'pointer', flex: 1, minWidth: 90,
                  padding: '8px 6px',
                  background: field.value === opt.value ? `${color}22` : 'var(--bg-secondary)',
                  border: `1px solid ${field.value === opt.value ? color : 'var(--border)'}`,
                  borderRadius: 6, textAlign: 'center',
                }}>
                  <input
                    type="radio"
                    value={opt.value}
                    checked={field.value === opt.value}
                    onChange={() => field.onChange(opt.value)}
                    style={{ display: 'none' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: 12, color: field.value === opt.value ? color : 'var(--text-primary)' }}>
                    {opt.label}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.3 }}>{opt.desc}</span>
                </label>
              )} />
          ))}
        </div>
      </div>

      {/* Mantenimiento */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: '10px 12px', border: '1px solid var(--border)', marginBottom: 10 }}>
        <div style={{ fontWeight: 600, fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
          Eventos del turno
        </div>

        {/* Purga */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: 6 }}>
          <Controller name={`${prefix}.purga`} control={control}
            render={({ field }) => (
              <input type="checkbox" checked={!!field.value} onChange={e => field.onChange(e.target.checked)} />
            )} />
          ¿Se purgó en este turno?
        </label>
        {purga && (
          <div className="form-group" style={{ marginBottom: 8, paddingLeft: 22 }}>
            <label className="form-label">Duración de la purga (min)</label>
            <Controller name={`${prefix}.purga_min`} control={control}
              render={({ field }) => (
                <input {...field} type="number" step="1" min="1" className="form-input"
                  style={{ maxWidth: 120 }} placeholder="min" />
              )} />
          </div>
        )}

        {/* Recirculación */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <Controller name={`${prefix}.recirculacion`} control={control}
            render={({ field }) => (
              <input type="checkbox" checked={!!field.value} onChange={e => field.onChange(e.target.checked)} />
            )} />
          ¿Se reculó / recirculó en este turno?
        </label>
        {recir && (
          <div className="form-group" style={{ marginTop: 6, paddingLeft: 22 }}>
            <label className="form-label">Duración de la recirculación (min)</label>
            <Controller name={`${prefix}.recirculacion_min`} control={control}
              render={({ field }) => (
                <input {...field} type="number" step="1" min="1" className="form-input"
                  style={{ maxWidth: 120 }} placeholder="min" />
              )} />
          </div>
        )}
      </div>

      {/* Observaciones MBR */}
      <div className="form-group">
        <label className="form-label">Observaciones {label}</label>
        <Controller name={`${prefix}.observaciones`} control={control}
          render={({ field }) => (
            <textarea {...field} className="form-textarea" rows={2} placeholder="Novedades del reactor..." />
          )} />
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

// Componente principal del formato F-05: condiciones operacionales de MBR, RO y PTAP
export default function FormatoCondicionesOp() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  // Caudales pre-cargados desde F-02 para RO y PTAP
  const [caudalesRO,   setCaudalesRO]   = useState<CaudalesROTurno>({ caudal_entrada_mh: null, caudal_salida_mh: null });
  const [caudalesPTAP, setCaudalesPTAP] = useState<CaudalesPTAPTurno>({ caudal_entrada_mh: null, caudal_salida_mh: null, manga_cambiada: null, manga_cantidad: null, cebs_realizados: null, cebs_cantidad: null });
  const [ultimaCIP, setUltimaCIP] = useState<string | null>(null);

  // Turno / fecha manual
  const [autoTurno, setAutoTurno] = useState<'mañana' | 'tarde' | 'noche'>(getTurno);
  // Actualiza el turno automático cada minuto para mantenerlo sincronizado
  useEffect(() => {
    const id = setInterval(() => setAutoTurno(getTurno()), 60_000);
    return () => clearInterval(id);
  }, []);
  const [manualMode,  setManualMode]  = useState(false);
  const [manualFecha, setManualFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualTurno, setManualTurno] = useState<'mañana' | 'tarde' | 'noche'>(autoTurno);

  const today        = new Date().toISOString().slice(0, 10);
  const now          = new Date();
  const activeTurno  = manualMode ? manualTurno : autoTurno;
  const activeFecha  = manualMode ? manualFecha : today;

  // Fetch caudales y último CIP al montar / cambiar fecha o turno
  useEffect(() => {
    getCaudalesROTurno(activeFecha, activeTurno).then(setCaudalesRO).catch(() => {});
    getCaudalesPTAPTurno(activeFecha, activeTurno).then(setCaudalesPTAP).catch(() => {});
    getUltimaCondicionRO().then(d => setUltimaCIP(d.ultima_cip ?? null)).catch(() => {});
  }, [activeFecha, activeTurno]);

  const { control, handleSubmit, watch, register, setValue } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mbr1: { purga: false, recirculacion: false },
      mbr2: { purga: false, recirculacion: false },
    },
  });

  // Pre-poblar campos editables cuando llegan datos de F-02
  useEffect(() => {
    if (caudalesRO.caudal_entrada_mh !== null)
      setValue('q_entrada_ro', String(caudalesRO.caudal_entrada_mh));
    if (caudalesRO.caudal_salida_mh !== null)
      setValue('q_permeado_total_ro', String(caudalesRO.caudal_salida_mh));
  }, [caudalesRO, setValue]);

  // Pre-poblar caudal de entrada PTAP cuando llegan datos de F-02
  useEffect(() => {
    if (caudalesPTAP.caudal_entrada_mh !== null)
      setValue('caudal_ptap_entrada', String(caudalesPTAP.caudal_entrada_mh));
  }, [caudalesPTAP, setValue]);

  const watchAll = watch();

  // ── Cálculos RO — usan los valores del formulario (editables) ────────────────
  const qEntrada   = pf(watchAll.q_entrada_ro)   ?? caudalesRO.caudal_entrada_mh;
  const qPermTotal = pf(watchAll.q_permeado_total_ro) ?? caudalesRO.caudal_salida_mh; void qPermTotal;
  const pE1   = pf(watchAll.p_entrada_e1);
  const pS1   = pf(watchAll.p_salida_e1);
  const pE2   = pf(watchAll.p_entrada_e2);
  const pS2   = pf(watchAll.p_salida_e2);
  const qPE1  = pf(watchAll.q_permeado_e1);
  const qPE2  = pf(watchAll.q_permeado_e2);
  const _qRRot = pf(watchAll.q_rechazo_rotametro); void _qRRot;

  // Indicadores derivados: ΔP, eficiencias y factor de concentración por etapa
  const dpE1      = (pE1 !== null && pS1 !== null) ? pE1 - pS1 : null;
  const dpE2      = (pE2 !== null && pS2 !== null) ? pE2 - pS2 : null;
  const efE1      = (qEntrada && qEntrada > 0 && qPE1 !== null) ? (qPE1 / qEntrada) * 100 : null;
  const fcE1      = (efE1 !== null && efE1 < 100) ? 1 / (1 - efE1 / 100) : null;
  const qEntE2    = (qEntrada !== null && qPE1 !== null) ? qEntrada - qPE1 : null;
  const efE2      = (qEntE2 !== null && qEntE2 > 0 && qPE2 !== null) ? (qPE2 / qEntE2) * 100 : null;
  const fcE2      = (efE2 !== null && efE2 < 100) ? 1 / (1 - efE2 / 100) : null;
  const qRecCalc  = (qEntrada !== null && qPE1 !== null && qPE2 !== null) ? qEntrada - qPE1 - qPE2 : null;
  const efGlobal  = (qEntrada !== null && qEntrada > 0 && qPE1 !== null && qPE2 !== null)
                    ? ((qPE1 + qPE2) / qEntrada) * 100 : null;

  // ── Guardado ──────────────────────────────────────────────────────────────────
  // Guarda MBR, RO y PTAP por separado si tienen datos; reporta errores por sección
  const doSave = async (data: FormValues) => {
    setSaving(true);
    const errors: string[] = [];

    // ── MBR ──
    const mbrHasData = [data.mbr1, data.mbr2].some(m =>
      m.caudal_permeado || m.tmp || m.nivel_tmp || m.purga || m.recirculacion || m.observaciones
    );
    if (mbrHasData) {
      try {
        await saveCondicionesMbr({
          fecha: activeFecha, turno: activeTurno, usuario: currentUser?.nombre ?? 'desconocido',
          mbr1: {
            caudal_permeado:   pf(data.mbr1.caudal_permeado),
            tmp:               pf(data.mbr1.tmp),
            nivel_tmp:         data.mbr1.nivel_tmp ?? null,
            purga:             data.mbr1.purga,
            purga_min:         data.mbr1.purga && data.mbr1.purga_min ? parseInt(data.mbr1.purga_min) : null,
            recirculacion:     data.mbr1.recirculacion,
            recirculacion_min: data.mbr1.recirculacion && data.mbr1.recirculacion_min ? parseInt(data.mbr1.recirculacion_min) : null,
            observaciones:     data.mbr1.observaciones || null,
          },
          mbr2: {
            caudal_permeado:   pf(data.mbr2.caudal_permeado),
            tmp:               pf(data.mbr2.tmp),
            nivel_tmp:         data.mbr2.nivel_tmp ?? null,
            purga:             data.mbr2.purga,
            purga_min:         data.mbr2.purga && data.mbr2.purga_min ? parseInt(data.mbr2.purga_min) : null,
            recirculacion:     data.mbr2.recirculacion,
            recirculacion_min: data.mbr2.recirculacion && data.mbr2.recirculacion_min ? parseInt(data.mbr2.recirculacion_min) : null,
            observaciones:     data.mbr2.observaciones || null,
          },
        });
      } catch { errors.push('MBR'); }
    }

    // ── RO ──
    const roHasData = [data.p_entrada_e1, data.p_salida_e1, data.p_entrada_e2, data.p_salida_e2,
      data.q_permeado_e1, data.q_permeado_e2, data.q_rechazo_rotametro,
      data.p_filtro_cartuchos, data.p_f1, data.p_f2, data.p_f3, data.obs_ro].some(v => v && v.trim() !== '');
    if (roHasData) {
      try {
        await saveCondicionesRo({
          fecha: activeFecha, turno: activeTurno, usuario: currentUser?.nombre ?? 'desconocido',
          p_entrada_e1:         pf(data.p_entrada_e1),
          p_salida_e1:          pf(data.p_salida_e1),
          p_entrada_e2:         pf(data.p_entrada_e2),
          p_salida_e2:          pf(data.p_salida_e2),
          q_permeado_e1:        pf(data.q_permeado_e1),
          q_permeado_e2:        pf(data.q_permeado_e2),
          q_rechazo_rotametro:  pf(data.q_rechazo_rotametro),
          p_filtro_cartuchos:   pf(data.p_filtro_cartuchos),
          p_f1:                 pf(data.p_f1),
          p_f2:                 pf(data.p_f2),
          p_f3:                 pf(data.p_f3),
          fecha_cip:            data.nueva_fecha_cip || null,
          observaciones:        data.obs_ro || null,
        });
      } catch { errors.push('RO'); }
    }

    // ── PTAP ──
    const ptapHasData = [data.tmp_pantalla, data.tiempo_filtracion_min,
      data.tiempo_purga_clarif_min, data.frecuencia_purga_clarif_h, data.obs_ptap].some(v => v && v.trim() !== '');
    if (ptapHasData) {
      try {
        await saveCondicionesPtap({
          fecha: activeFecha, turno: activeTurno, usuario: currentUser?.nombre ?? 'desconocido',
          tmp_pantalla:              pf(data.tmp_pantalla),
          tiempo_filtracion_min:     data.tiempo_filtracion_min ? parseInt(data.tiempo_filtracion_min) : null,
          tiempo_purga_clarif_min:   data.tiempo_purga_clarif_min ? parseInt(data.tiempo_purga_clarif_min) : null,
          frecuencia_purga_clarif_h: pf(data.frecuencia_purga_clarif_h),
          observaciones:             data.obs_ptap || null,
        });
      } catch { errors.push('PTAP'); }
    }

    setSaving(false);

    if (!mbrHasData && !roHasData && !ptapHasData) {
      toast.error('Completa al menos un campo antes de guardar.');
      return;
    }
    if (errors.length > 0) {
      toast.error(`Error al guardar: ${errors.join(', ')}`);
    } else {
      toast.success('Condiciones de operación guardadas correctamente.');
      setTimeout(() => navigate(ROUTES.OPERARIO_HOME), 2000);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="formato-page">
      <div className="formato-header" style={{ borderColor: '#8b949e' }}>
        <h1 className="formato-title">
          <span className="formato-num" style={{ background: '#8b949e' }}>F-05</span>
          Condiciones de Operación
        </h1>
        <p className="formato-meta">Operario: <strong>{currentUser?.nombre}</strong></p>
      </div>

      <form className="formato-form" onSubmit={handleSubmit(doSave)}>

        {/* ── Contexto ──────────────────────────────────────────────────── */}
        <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Contexto del Registro</span>
          <button type="button"
            className={`btn-manual-toggle${manualMode ? ' active' : ''}`}
            onClick={() => setManualMode(v => !v)}>
            {manualMode ? '⟵ Usar automático' : '✎ Ajustar fecha / turno'}
          </button>
        </div>

        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Fecha</label>
            {manualMode
              ? <input type="date" className="form-input" value={manualFecha} max={today}
                  onChange={e => setManualFecha(e.target.value)} />
              : <div className="form-readonly">{now.toLocaleDateString('es-CO')}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Turno</label>
            {manualMode
              ? <select className="form-input" value={manualTurno}
                  onChange={e => setManualTurno(e.target.value as 'mañana' | 'tarde' | 'noche')}>
                  <option value="mañana">Mañana (6:00 – 14:00)</option>
                  <option value="tarde">Tarde (14:00 – 22:00)</option>
                  <option value="noche">Noche (22:00 – 6:00)</option>
                </select>
              : <div className="form-readonly">{TURNO_LABELS[activeTurno]}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Bitácora</label>
            <div className="form-readonly value-ok">{BITACORA_TURNO[activeTurno]}</div>
          </div>
        </div>
        {manualMode && (
          <div className="form-alert form-alert-warn" style={{ padding: '8px 12px', fontSize: 12, marginTop: -4 }}>
            Modo manual activo — el turno y la fecha se tomarán como ingresados.
          </div>
        )}

        {/* ══ ACORDEÓN 1: MBR ══════════════════════════════════════════════ */}
        <AccordionSection title="Sistema MBR — Biorreactor de Membrana" color="#3fb950" defaultOpen>
          <MbrUnidad prefix="mbr1" label="MBR 1" color="#3fb950" control={control} watch={watch} />
          <MbrUnidad prefix="mbr2" label="MBR 2" color="#2ea043" control={control} watch={watch} />
        </AccordionSection>

        {/* ══ ACORDEÓN 2: RO ═══════════════════════════════════════════════ */}
        <AccordionSection title="Sistema RO — Ósmosis Inversa" color="#1f6feb">

          {/* Presiones */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: '#1f6feb', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Presiones (Bar)
            </div>
            <div className="form-row-2" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#8b949e' }}>RO 1 — ETAPA 1</span>
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">P Entrada E1</label>
                    <input type="number" step="0.01" className="form-input" placeholder="Bar"
                      {...register('p_entrada_e1')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">P Salida E1</label>
                    <input type="number" step="0.01" className="form-input" placeholder="Bar"
                      {...register('p_salida_e1')} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#8b949e' }}>RO 1 — ETAPA 2</span>
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">P Entrada E2</label>
                    <input type="number" step="0.01" className="form-input" placeholder="Bar"
                      {...register('p_entrada_e2')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">P Salida E2</label>
                    <input type="number" step="0.01" className="form-input" placeholder="Bar"
                      {...register('p_salida_e2')} />
                  </div>
                </div>
              </div>
            </div>

            {/* ΔP calculados */}
            <div className="form-row-2">
              <CalcField label="ΔP Etapa 1 (Bar)" value={fmtVal(dpE1, 3, ' Bar')} />
              <CalcField label="ΔP Etapa 2 (Bar)" value={fmtVal(dpE2, 3, ' Bar')} />
            </div>
          </div>

          {/* Caudales desde F-02 — editables */}
          <div style={{ background: '#1f6feb08', border: '1px solid #1f6feb22', borderRadius: 6, padding: '10px 12px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
              Caudales del turno (pre-cargados de F-02, editables)
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Q Entrada RO1 (m³/h)</label>
                <input type="number" step="0.01" className="form-input" placeholder="m³/h"
                  {...register('q_entrada_ro')} />
              </div>
              <div className="form-group">
                <label className="form-label">Q Permeado Total (m³/h)</label>
                <input type="number" step="0.01" className="form-input" placeholder="m³/h"
                  {...register('q_permeado_total_ro')} />
              </div>
            </div>
          </div>

          {/* Caudales por etapa */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: '#1f6feb', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Caudales por Etapa (m³/h)
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Q Permeado E1</label>
                <input type="number" step="0.01" className="form-input" placeholder="m³/h"
                  {...register('q_permeado_e1')} />
                {qEntE2 !== null && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'block' }}>
                    Q Entrada E2: {qEntE2.toFixed(2)} m³/h
                  </span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Q Permeado E2</label>
                <input type="number" step="0.01" className="form-input" placeholder="m³/h"
                  {...register('q_permeado_e2')} />
              </div>
              <div className="form-group">
                <label className="form-label">Q Rechazo Rotámetro</label>
                <input type="number" step="0.01" className="form-input" placeholder="m³/h"
                  {...register('q_rechazo_rotametro')} />
              </div>
            </div>
          </div>

          {/* Indicadores calculados */}
          <div style={{ background: '#0d1117', border: '1px solid #1f6feb33', borderRadius: 8, padding: '12px', marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: '#58a6ff', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Indicadores Calculados
            </div>
            <div className="form-row-3" style={{ marginBottom: 8 }}>
              <CalcField label="% Eficiencia E1" value={fmtVal(efE1, 1, '%')} />
              <CalcField label="Factor Concentración E1" value={fmtVal(fcE1, 3)} />
              <CalcField label="Q Rechazo Calculado (m³/h)" value={fmtVal(qRecCalc, 2, ' m³/h')} />
            </div>
            <div className="form-row-3">
              <CalcField label="% Eficiencia E2" value={fmtVal(efE2, 1, '%')} />
              <CalcField label="Factor Concentración E2" value={fmtVal(fcE2, 3)} />
              <CalcField label="Eficiencia Global RO1" value={fmtVal(efGlobal, 1, '%')} color="#58a6ff" />
            </div>
          </div>

          {/* Filtros */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 12, color: '#1f6feb', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Presiones de Filtros (Bar)
            </div>
            <div className="form-row-2" style={{ marginBottom: 8 }}>
              <div className="form-group">
                <label className="form-label">Filtro Cartuchos 5 µm</label>
                <input type="number" step="0.01" className="form-input" placeholder="Bar"
                  {...register('p_filtro_cartuchos')} />
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Presión F1</label>
                <input type="number" step="0.01" className="form-input" placeholder="Bar"
                  {...register('p_f1')} />
              </div>
              <div className="form-group">
                <label className="form-label">Presión F2</label>
                <input type="number" step="0.01" className="form-input" placeholder="Bar"
                  {...register('p_f2')} />
              </div>
              <div className="form-group">
                <label className="form-label">Presión F3</label>
                <input type="number" step="0.01" className="form-input" placeholder="Bar"
                  {...register('p_f3')} />
              </div>
            </div>
          </div>

          {/* CIP */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)', padding: '10px 12px', marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
              Limpieza CIP
            </div>
            <div className="form-row-2">
              <ReadonlyField
                label="Última fecha CIP"
                value={fmtDate(ultimaCIP)}
                hint={ultimaCIP ? undefined : 'Sin registro previo'}
              />
              <div className="form-group">
                <label className="form-label">Registrar / Actualizar fecha CIP</label>
                <input type="date" className="form-input" max={today}
                  {...register('nueva_fecha_cip')} />
              </div>
            </div>
          </div>

          {/* Observaciones RO */}
          <div className="form-group">
            <label className="form-label">Observaciones RO</label>
            <textarea className="form-textarea" rows={2} placeholder="Novedades del sistema RO..."
              {...register('obs_ro')} />
          </div>
        </AccordionSection>

        {/* ══ ACORDEÓN 3: PTAP ═════════════════════════════════════════════ */}
        <AccordionSection title="Sistema PTAP — Planta de Agua Potable" color="#da7b11">

          {/* Datos del turno desde F-02 — editables */}
          <div style={{ background: '#da7b1108', border: '1px solid #da7b1122', borderRadius: 6, padding: '10px 12px', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
              Datos del turno (pre-cargados de F-02, editables)
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Caudal Filtrado Entrada (m³/h)</label>
                <input type="number" step="0.01" className="form-input" placeholder="m³/h"
                  {...register('caudal_ptap_entrada')} />
              </div>
              <ReadonlyField
                label="Manga cambiada"
                value={caudalesPTAP.manga_cambiada
                  ? `Sí${caudalesPTAP.manga_cantidad ? ` (${caudalesPTAP.manga_cantidad} vez)` : ''}`
                  : caudalesPTAP.manga_cambiada === 0 ? 'No' : '—'}
              />
              <ReadonlyField
                label="CEBs realizados"
                value={caudalesPTAP.cebs_realizados
                  ? `Sí${caudalesPTAP.cebs_cantidad ? ` (${caudalesPTAP.cebs_cantidad})` : ''}`
                  : caudalesPTAP.cebs_realizados === 0 ? 'No' : '—'}
              />
            </div>
          </div>

          {/* TMP y filtración */}
          <div className="form-row-2" style={{ marginBottom: 14 }}>
            <div className="form-group">
              <label className="form-label">TMP según pantalla (mbar)</label>
              <input type="number" step="0.1" className="form-input" placeholder="Ej: 85"
                {...register('tmp_pantalla')} />
            </div>
            <div className="form-group">
              <label className="form-label">Tiempo de filtración (min)</label>
              <input type="number" step="1" min="0" className="form-input" placeholder="Ej: 30"
                {...register('tiempo_filtracion_min')} />
            </div>
          </div>

          {/* Purga clarifloculador */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 6, border: '1px solid var(--border)', padding: '10px 12px', marginBottom: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
              Purga Clarifloculador
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Tiempo de purga (min)</label>
                <input type="number" step="1" min="0" className="form-input" placeholder="Ej: 5"
                  {...register('tiempo_purga_clarif_min')} />
              </div>
              <div className="form-group">
                <label className="form-label">Frecuencia de purga (cada X horas)</label>
                <input type="number" step="0.5" min="0" className="form-input" placeholder="Ej: 4"
                  {...register('frecuencia_purga_clarif_h')} />
              </div>
            </div>
          </div>

          {/* Observaciones PTAP */}
          <div className="form-group">
            <label className="form-label">Observaciones PTAP</label>
            <textarea className="form-textarea" rows={2} placeholder="Novedades del sistema PTAP..."
              {...register('obs_ptap')} />
          </div>
        </AccordionSection>

        {/* ── Acciones ──────────────────────────────────────────────────── */}
        <div className="form-actions">
          <button type="button" className="btn-secondary"
            onClick={() => navigate(ROUTES.OPERARIO_HOME)} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" style={{ background: '#8b949e' }} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Condiciones'}
          </button>
        </div>

      </form>
    </div>
  );
}
