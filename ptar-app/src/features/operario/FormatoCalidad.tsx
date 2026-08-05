import { memo, useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { ROUTES } from '../../lib/routes';
import { createCalidadBatch, getUltimoValorCalidad } from '../../services/ptarClient';
import type { RegistroCalidad, UltimoValorCalidad } from '../../services/ptarClient';
import { TURNO_LABELS, getTurno } from '../../lib/utils/time';

// ─── Frecuencias de medición por PUNTO (fuente: tabla laboratorio PTAP) ───────
// t=cada turno | d1/d2/d3=diario turno 1/2/3 | j1/j2/j3=jueves turno N
// mj3=mar+jue turno 3 | ls=lunes t1 o sábado t2
// Clave: ptKey = "ZONA|Punto" ej. "TB|MBR1"

type FreqCode = string;
type ZoneId = 'TB' | 'RA' | 'RO' | 'TKR' | 'PT';

interface GridParam {
  id: string;
  nombre: string;
  unidad: string;
  min: number;
  max: number;
  decimales: number;
  freq: Record<string, FreqCode>; // clave = ptKey
}

// Puntos del tablero (abreviado para no repetir)
const TB6 = (f: FreqCode) => ({
  'TB|Pulmon': f, 'TB|EntGEM': f, 'TB|SalGEM': f,
  'TB|MBR1': f,  'TB|MBR2': f,   'TB|Vert': f,
});
const RA4 = (f: FreqCode) => ({
  'RA|Anoxico': f, 'RA|MBBR': f, 'RA|MBR1': f, 'RA|MBR2': f,
});

const GRID_PARAMS: GridParam[] = [
  { id:'Temperatura',     nombre:'Temperatura',     unidad:'°C',        min:15,  max:60,    decimales:1, freq:{
    ...TB6('t'), ...RA4('d1'), 'RO|Perm':'d2','RO|Rechazo':'d2', 'TKR|Recirc':'t',
    'PT|Pozo':'ls','PT|Clari':'t','PT|SalUF':'t' }},
  { id:'pH',              nombre:'pH',              unidad:'pH',         min:0,   max:14,    decimales:2, freq:{
    ...TB6('t'), ...RA4('d1'), 'RO|Perm':'d2','RO|Rechazo':'d2', 'TKR|Recirc':'t',
    'PT|Pozo':'ls','PT|Clari':'t','PT|SalUF':'t' }},
  { id:'TDS',             nombre:'TDS',             unidad:'mg/L',       min:0,   max:5000,  decimales:0, freq:{
    ...TB6('t'),             'RO|Perm':'d2','RO|Rechazo':'d2', 'TKR|Recirc':'t',
    'PT|Pozo':'ls','PT|Clari':'t','PT|SalUF':'t' }},
  { id:'SST',             nombre:'SST',             unidad:'mg/L',       min:0,   max:1000,  decimales:0, freq:{
    ...TB6('t'), ...RA4('d1'), 'RO|Perm':'d2','RO|Rechazo':'d2', 'TKR|Recirc':'d1',
    'PT|Pozo':'ls','PT|Clari':'t','PT|SalUF':'t' }},
  { id:'SolidosSediment', nombre:'Solidos Sedimentables', unidad:'ml/L',  min:0,   max:500,   decimales:1, freq:{
    ...TB6('t'), ...RA4('d1'),
    'PT|Pozo':'ls','PT|Clari':'t' }},
  { id:'Conductividad',   nombre:'Conductividad',   unidad:'µS/cm',      min:0,   max:10000, decimales:0, freq:{
    ...TB6('t'),             'RO|Perm':'d2','RO|Rechazo':'d2', 'TKR|Recirc':'t',
    'PT|Pozo':'ls','PT|Clari':'t','PT|SalUF':'t' }},
  { id:'Color',           nombre:'Color',           unidad:'UPTCO',      min:0,   max:1500,  decimales:0, freq:{
    ...TB6('t'),             'RO|Perm':'d2','RO|Rechazo':'d2', 'TKR|Recirc':'t',
    'PT|Pozo':'ls','PT|Clari':'t','PT|SalUF':'t' }},
  { id:'Hierro',          nombre:'Hierro',          unidad:'mg/L',       min:0,   max:50,    decimales:2, freq:{
    'TKR|Recirc':'t', 'PT|Pozo':'ls','PT|Clari':'d2','PT|SalUF':'t' }},
  { id:'DQO',             nombre:'DQO',             unidad:'mg/L',       min:0,   max:5000,  decimales:0, freq:{
    ...TB6('mj3'),           'RO|Rechazo':'j2' }},
  { id:'SST_Gravimetrico',nombre:'SST Gravimetrico', unidad:'mg/L',       min:0,   max:1000,  decimales:0, freq:{
    ...TB6('j3'), ...RA4('j1') }},
  { id:'Cloruros',        nombre:'Cloruros',        unidad:'mg/L',       min:0,   max:1000,  decimales:0, freq:{
    ...TB6('mj3'),           'RO|Perm':'d2','RO|Rechazo':'d2', 'TKR|Recirc':'d1',
    'PT|SalUF':'ls' }},
  { id:'Sulfatos',        nombre:'Sulfatos',        unidad:'mg/L',       min:0,   max:500,   decimales:0, freq:{
    ...TB6('j3'),            'RO|Rechazo':'j2', 'TKR|Recirc':'t', 'PT|SalUF':'ls' }},
  { id:'Fosforo',         nombre:'Fosforo',          unidad:'mg/L',       min:0,   max:100,   decimales:2, freq:{
    'TB|SalGEM':'j3' }},
  { id:'Nitrogeno',       nombre:'Nitrogeno',        unidad:'mg/L',       min:0,   max:200,   decimales:2, freq:{
    'TB|SalGEM':'j3' }},
  { id:'DurezaTotal',     nombre:'Dureza Total',    unidad:'mg CaCO₃/L', min:0,   max:1500,  decimales:0, freq:{
    'TB|MBR1':'j3','TB|MBR2':'j3', 'RO|Perm':'j2','RO|Rechazo':'j2',
    'TKR|Recirc':'t', 'PT|SalUF':'ls' }},
  { id:'Silice',          nombre:'Silice',           unidad:'mg/L',       min:0,   max:100,   decimales:2, freq:{
    'TB|MBR1':'j3','TB|MBR2':'j3', 'RO|Perm':'j2','RO|Rechazo':'j2',
    'PT|Pozo':'ls','PT|Clari':'ls','PT|SalUF':'ls' }},
  { id:'Aluminio',        nombre:'Aluminio',        unidad:'mg/L',       min:0,   max:10,    decimales:2, freq:{
    'TKR|Recirc':'t', 'PT|SalUF':'ls' }},
  { id:'CloroResidual',   nombre:'Cloro residual',  unidad:'mg/L',       min:0,   max:5,     decimales:2, freq:{
    'TKR|Recirc':'t', 'PT|SalUF':'ls' }},
  { id:'Cobre',           nombre:'Cobre',           unidad:'mg/L',       min:0,   max:5,     decimales:2, freq:{
    'TKR|Recirc':'t', 'PT|Pozo':'ls','PT|Clari':'ls','PT|SalUF':'ls' }},
];

interface GridZone {
  id: ZoneId;
  label: string;
  points: { key: string; label: string; unidad: string }[];
}

const GRID_ZONES: GridZone[] = [
  { id:'TB', label:'Tablero', points:[
    { key:'TB|Pulmon',      label:'Pulmón',        unidad:'Tanque Pulmon' },
    { key:'TB|EntGEM',      label:'Entrada GEM',   unidad:'Tanque Homogeneizador' },
    { key:'TB|SalGEM',      label:'Salida GEM',    unidad:'GEM Salida' },
    { key:'TB|MBR1',        label:'Perm. MBR1',    unidad:'MBR 1 Permeado' },
    { key:'TB|MBR2',        label:'Perm. MBR2',    unidad:'MBR 2 Permeado' },
    { key:'TB|Vert',        label:'Vertimiento',   unidad:'Vertimiento' },
  ]},
  { id:'RA', label:'Reactores', points:[
    { key:'RA|Anoxico',     label:'Anóxico',       unidad:'Reactor Anoxico' },
    { key:'RA|MBBR',        label:'MBBR',          unidad:'Reactor MBBR' },
    { key:'RA|MBR1',        label:'MBR1',          unidad:'MBR 1 Interno' },
    { key:'RA|MBR2',        label:'MBR2',          unidad:'MBR 2 Interno' },
  ]},
  { id:'RO', label:'RO', points:[
    { key:'RO|Perm',        label:'Permeado RO',   unidad:'RO 2 Permeado' },
    { key:'RO|Rechazo',     label:'Rechazo RO',    unidad:'RO Rechazo' },
  ]},
  { id:'TKR', label:'Recirculación', points:[
    { key:'TKR|Recirc',     label:'Recirculación', unidad:'Tanque Recirculacion' },
  ]},
  { id:'PT', label:'PTAP', points:[
    { key:'PT|Pozo',        label:'Pozo',           unidad:'Pozo' },
    { key:'PT|Clari',       label:'Salida Clari.',  unidad:'Salida Clarifloculador / Entrada UF' },
    { key:'PT|SalUF',       label:'Salida UF',      unidad:'Salida UF' },
  ]},
];

// ─── Alarmas operacionales ───────────────────────────────────────────────────

type AlarmLevel = 'warn' | 'error';

interface AlarmRule {
  paramId: string;
  ptKeys?: string[];
  check: (val: number, get: (id: string) => number | null) => AlarmLevel | null;
  message: (val: number) => string;
}

const PARAM_LABEL: Record<string, string> = {
  SolidosSediment: 'Sól. Sed.', SST_Gravimetrico: 'SST Grav.',
  CloroResidual: 'Cl libre', DurezaTotal: 'Dureza T.',
  Fosforo: 'Fósforo', Nitrogeno: 'Nitrógeno',
};

const ALARM_RULES: AlarmRule[] = [
  // ── Temperatura (todos los puntos) ───────────────────────────────────────
  { paramId: 'Temperatura',
    check: v => v > 50 ? 'error' : v < 20 ? 'warn' : null,
    message: v => v > 50 ? 'Temperatura crítica (> 50 °C)' : 'Temperatura baja (< 20 °C)' },

  // ── pH: solo validar rango físico 0–14 ───────────────────────────────────
  { paramId: 'pH',
    check: v => (v < 0 || v > 14) ? 'error' : null,
    message: () => 'Valor de pH imposible (debe estar entre 0 y 14)' },

  // ── TDS no puede superar conductividad (mismo punto) ─────────────────────
  { paramId: 'TDS',
    check: (v, get) => { const c = get('Conductividad'); return c !== null && v > c ? 'warn' : null; },
    message: () => 'TDS supera la conductividad del mismo punto' },

  // ── SST permeado MBR ─────────────────────────────────────────────────────
  { paramId: 'SST', ptKeys: ['TB|MBR1', 'TB|MBR2'],
    check: v => v > 12 ? 'warn' : null,
    message: () => 'SST permeado elevado (> 12 mg/L) — revisar membrana' },

  // ── DQO en permeado MBR ──────────────────────────────────────────────────
  { paramId: 'DQO', ptKeys: ['TB|MBR1', 'TB|MBR2'],
    check: v => v > 100 ? 'warn' : null,
    message: () => 'DQO permeado alto (> 100 mg/L)' },

  // ══ VERTIMIENTO — Res. 631/2015 + Res. 3957/2009 ════════════════════════
  // pH (Res. 631 Art. 8: 6.0–9.0 para sector textil)
  { paramId: 'pH', ptKeys: ['TB|Vert'],
    check: v => (v < 5.5 || v > 9.5) ? 'error' : (v < 6.0 || v > 9.0) ? 'warn' : null,
    message: v => (v < 5.5 || v > 9.5) ? 'pH vertimiento crítico — fuera de norma (Res. 631)' : 'pH vertimiento fuera de rango normativo 6.0–9.0 (Res. 631)' },
  // Temperatura (Res. 631: máx 40 °C)
  { paramId: 'Temperatura', ptKeys: ['TB|Vert'],
    check: v => v > 40 ? 'error' : v > 35 ? 'warn' : null,
    message: v => v > 40 ? 'Temperatura vertimiento crítica — supera 40 °C (Res. 631)' : 'Temperatura vertimiento elevada (> 35 °C, límite 40 °C Res. 631)' },
  // SST (Res. 631 sector textil: 90 mg/L; Res. 3957: 50 mg/L)
  { paramId: 'SST', ptKeys: ['TB|Vert'],
    check: v => v > 90 ? 'error' : v > 50 ? 'warn' : null,
    message: v => v > 90 ? 'SST vertimiento crítico — supera 90 mg/L (Res. 631)' : 'SST vertimiento alto (> 50 mg/L, Res. 3957)' },
  // DQO (Res. 631 sector textil: 400 mg/L)
  { paramId: 'DQO', ptKeys: ['TB|Vert'],
    check: v => v > 400 ? 'error' : v > 250 ? 'warn' : null,
    message: v => v > 400 ? 'DQO vertimiento crítico — supera 400 mg/L (Res. 631)' : 'DQO vertimiento elevado (> 250 mg/L, alerta preventiva)' },
  // Cloruros (Res. 3957: 500 mg/L)
  { paramId: 'Cloruros', ptKeys: ['TB|Vert'],
    check: v => v > 500 ? 'error' : v > 400 ? 'warn' : null,
    message: v => v > 500 ? 'Cloruros vertimiento críticos — supera 500 mg/L (Res. 3957)' : 'Cloruros vertimiento altos (> 400 mg/L, límite 500 Res. 3957)' },
  // Sulfatos (Res. 3957: 500 mg/L)
  { paramId: 'Sulfatos', ptKeys: ['TB|Vert'],
    check: v => v > 500 ? 'error' : v > 400 ? 'warn' : null,
    message: v => v > 500 ? 'Sulfatos vertimiento críticos — supera 500 mg/L (Res. 3957)' : 'Sulfatos vertimiento altos (> 400 mg/L, límite 500 Res. 3957)' },
];

const ACTIVE_ALARM_RULES = ALARM_RULES;

function getAlarm(
  paramId: string,
  ptKey: string,
  val: number,
  gridVals: Record<string, string>,
): { level: AlarmLevel; message: string } | null {
  const get = (id: string) => {
    const v = parseFloat(gridVals[`${ptKey}|${id}`] ?? '');
    return isNaN(v) ? null : v;
  };
  let worst: { level: AlarmLevel; message: string } | null = null;
  for (const rule of ACTIVE_ALARM_RULES) {
    if (rule.paramId !== paramId) continue;
    if (rule.ptKeys && !rule.ptKeys.includes(ptKey)) continue;
    const level = rule.check(val, get);
    if (!level) continue;
    const msg = rule.message(val);
    if (!worst || (level === 'error' && worst.level === 'warn')) {
      worst = { level, message: msg };
    }
  }
  return worst;
}

// ─── Frecuencia helpers ───────────────────────────────────────────────────────

// ct=cada turno (activo) | cd=diario este turno (activo) | ch=solo hoy (activo)
// opt=tiene frecuencia pero no corresponde a este turno/día (disponible, no obligatorio)
type FreqClass = 'ct' | 'cd' | 'ch' | 'opt' | null;

function getTurnoNum(t: string): number {
  return t === 'noche' ? 1 : t === 'mañana' ? 2 : 3;
}

function getDayCode(): string {
  const d = new Date().getDay();
  return ['D','L','M','W','J','V','S'][d] ?? 'L';
}

function freqClass(f: FreqCode | undefined, tNum: number, day: string): FreqClass {
  if (!f) return null;
  if (f === 't') return 'ct';
  if (f === `d${tNum}`) return 'cd';
  if (f === `j${tNum}` && day === 'J') return 'ch';
  if (f === `mj${tNum}` && (day === 'M' || day === 'J')) return 'ch';
  if (f === 'ls' && ((day === 'L' && tNum === 1) || (day === 'S' && tNum === 2))) return 'ch';
  // Tiene frecuencia pero no toca ahora — disponible igualmente
  return 'opt';
}

// ─── State types ─────────────────────────────────────────────────────────────

interface FormState {
  novedad_quimico: boolean;
  novedad_procesos: boolean;
  observaciones_generales: string;
}

// ─── AlarmBanner ─────────────────────────────────────────────────────────────

function AlarmBanner({ alarms }: { alarms: { level: AlarmLevel; message: string; label: string }[] }) {
  if (!alarms.length) return null;
  const errors = alarms.filter(a => a.level === 'error');
  const warns  = alarms.filter(a => a.level === 'warn');
  return (
    <div style={{ marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: `1px solid ${errors.length ? '#f85149' : '#e3b341'}` }}>
      <div style={{
        padding: '8px 14px', fontSize: 12, fontWeight: 600,
        background: errors.length ? '#2d0f0f' : '#1f1500',
        color: errors.length ? '#f85149' : '#e3b341',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span>{errors.length ? '✕' : '!'}</span>
        <span>
          {errors.length > 0 && `${errors.length} alarma${errors.length > 1 ? 's' : ''} crítica${errors.length > 1 ? 's' : ''}`}
          {errors.length > 0 && warns.length > 0 && '  ·  '}
          {warns.length > 0 && `${warns.length} advertencia${warns.length > 1 ? 's' : ''}`}
        </span>
      </div>
      <div style={{ padding: '6px 14px 8px', display: 'flex', flexDirection: 'column', gap: 3, background: '#161b22' }}>
        {alarms.map((a, i) => (
          <div key={i} style={{ fontSize: 11, color: a.level === 'error' ? '#f85149' : '#e3b341', display: 'flex', gap: 8 }}>
            <span style={{ opacity: 0.6, minWidth: 130, flexShrink: 0 }}>{a.label}</span>
            <span>{a.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

const FormatoCalidad = memo(function FormatoCalidad() {
  const { currentUser } = useAuth();
  const navigate        = useNavigate();

  const [turno, setTurno]     = useState<string>(getTurno());
  const turnoNum              = getTurnoNum(turno);
  const [fecha, setFecha]     = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });

  // dayCode se sincroniza con fecha cuando esta cambia
  const [dayCode, setDayCode] = useState<string>(getDayCode);

  const handleFechaChange = (val: string) => {
    setFecha(val);
    if (val) {
      // new Date('YYYY-MM-DD') interpreta como UTC — sumamos offset local
      const d = new Date(val + 'T12:00:00');
      setDayCode(['D','L','M','W','J','V','S'][d.getDay()] ?? 'L');
    }
  };

  const [form, setForm] = useState<FormState>({
    novedad_quimico: false,
    novedad_procesos: false,
    observaciones_generales: '',
  });

  // gridVals: "ptKey|paramId" → valor string
  const [gridVals, setGridVals] = useState<Record<string, string>>({});

  // prevVals: "unidad||paramNombre" → UltimoValorCalidad
  const [prevVals, setPrevVals] = useState<Record<string, UltimoValorCalidad>>({});

  const [optOpen, setOptOpen]     = useState<Set<ZoneId>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedCountRef = useRef(0);

  const now = new Date(); void now;

  // Lista de alarmas activas — recalcula cuando cambian los valores de la grilla
  const activeAlarms = useMemo(() => {
    const result: { level: AlarmLevel; message: string; label: string }[] = [];
    GRID_ZONES.forEach(z => z.points.forEach(pt => {
      GRID_PARAMS.forEach(p => {
        const val = parseFloat(gridVals[`${pt.key}|${p.id}`] ?? '');
        if (isNaN(val)) return;
        const a = getAlarm(p.id, pt.key, val, gridVals);
        if (a) result.push({ ...a, label: `${pt.label} — ${PARAM_LABEL[p.id] ?? p.nombre}` });
      });
    }));
    return result;
  }, [gridVals]);

  // Cargar valores anteriores para todos los puntos/parámetros con frecuencia
  useEffect(() => {
    const allUnidades = new Set<string>();
    const allParams   = new Set<string>();

    GRID_ZONES.forEach(z => {
      const visP = GRID_PARAMS.filter(p => p.freq[z.id]);
      if (!visP.length) return;
      z.points.forEach(pt => {
        allUnidades.add(pt.unidad);
        visP.forEach(p => allParams.add(p.nombre));
      });
    });

    const pairs: [string, string][] = [];
    allUnidades.forEach(u => allParams.forEach(p => pairs.push([u, p])));

    Promise.allSettled(
      pairs.map(([u, p]) =>
        getUltimoValorCalidad(u, p).then(res => [`${u}||${p}`, res] as [string, UltimoValorCalidad])
      )
    ).then(results => {
      const map: Record<string, UltimoValorCalidad> = {};
      results.forEach(r => {
        if (r.status === 'fulfilled') map[r.value[0]] = r.value[1];
      });
      setPrevVals(map);
    });
  }, [turnoNum, dayCode]);

  // ─── Cell helpers ──────────────────────────────────────────────────────────

  const setCellVal = (ptKey: string, paramId: string, val: string) => {
    const k = `${ptKey}|${paramId}`;
    setGridVals(prev => {
      const next = { ...prev };
      if (val === '') delete next[k]; else next[k] = val;
      return next;
    });
  };

  const totalFilled = Object.keys(gridVals).length;

  // ─── Save ──────────────────────────────────────────────────────────────────

  const doSave = useCallback(async () => {
    if (totalFilled === 0) return;
    setSaving(true); setSaveError(null);

    const obsGenerales = [
      form.novedad_quimico   ? '[Novedad consumo químico]'         : '',
      form.novedad_procesos  ? '[Novedad procesos de producción]'  : '',
      form.observaciones_generales.trim(),
    ].filter(Boolean).join(' | ') || undefined;

    const rows: Omit<RegistroCalidad, 'id' | 'created_at'>[] = [];

    GRID_ZONES.forEach(z => {
      z.points.forEach(pt => {
        GRID_PARAMS.forEach(p => {
          const k = `${pt.key}|${p.id}`;
          const val = gridVals[k];
          if (val === undefined || val === '') return;
          rows.push({
            fecha,
            turno:              turno as 'mañana' | 'tarde' | 'noche',
            usuario:            currentUser?.nombre ?? 'desconocido',
            equipo:             currentUser?.equipo ? JSON.stringify(currentUser.equipo) : undefined,
            unidad_tratamiento: pt.unidad,
            parametro:          p.nombre,
            unidad_medida:      p.unidad,
            valor:              parseFloat(val),
            no_aplica:          false,
            observaciones:      obsGenerales,
          });
        });
      });
    });

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
    setTimeout(() => navigate(ROUTES.OPERARIO_HOME, { state: { submitted: 'F-03' } }), 2000);
  }, [totalFilled, gridVals, form, turno, currentUser, navigate]);

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

  const DAY_LABELS: Record<string, string> = { L:'Lun', M:'Mar', W:'Mié', J:'Jue', V:'Vie', S:'Sáb' };

  return (
    <div className="formato-page-wide">
      <div className="formato-header" style={{ borderColor: '#d29922' }}>
        <h1 className="formato-title">
          <span className="formato-num" style={{ background: '#d29922' }}>F-03</span>
          Calidad del Agua
        </h1>
        <p className="formato-meta">Operario: <strong>{currentUser?.nombre}</strong></p>
      </div>

      <form className="formato-form" onSubmit={e => { e.preventDefault(); doSave(); }}>

        {/* ── Contexto ──────────────────────────────────────────────────── */}
        <div className="form-section-title">Contexto</div>
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Fecha</label>
            <input
              type="date"
              className="form-input"
              value={fecha}
              onChange={e => handleFechaChange(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Turno</label>
            <select
              className="form-input"
              value={turno}
              onChange={e => setTurno(e.target.value)}
            >
              {Object.entries(TURNO_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Operario</label>
            <div className="form-readonly">{currentUser?.nombre}</div>
          </div>
        </div>

        {/* ── Día de la semana ──────────────────────────────────────────── */}
        <div className="form-group" style={{ marginBottom: 4 }}>
          <label className="form-label">Día de hoy</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(['L','M','W','J','V','S'] as const).map(d => (
              <button
                key={d} type="button"
                onClick={() => setDayCode(d)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 13,
                  border: dayCode === d ? '1px solid #d29922' : '1px solid #30363d',
                  background: dayCode === d ? '#d2992220' : 'transparent',
                  color: dayCode === d ? '#d29922' : '#8b949e',
                  cursor: 'pointer', fontWeight: dayCode === d ? 600 : 400,
                }}
              >{DAY_LABELS[d]}</button>
            ))}
          </div>
        </div>

        {/* ── Leyenda ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap', fontSize: 11, color: '#8b949e' }}>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#1D9E75', display:'inline-block' }}/>
            Cada turno
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#185FA5', display:'inline-block' }}/>
            Diario (este turno)
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#BA7517', display:'inline-block' }}/>
            Solo hoy
          </span>
        </div>

        {/* ── Banner de alarmas (arriba de la grilla) ───────────────────── */}
        <AlarmBanner alarms={activeAlarms} />

        {/* ── Grilla de mediciones ──────────────────────────────────────── */}
        {GRID_ZONES.map(zone => {
          // Columnas: parámetros que tienen freq en AL MENOS UN punto de esta zona
          const zoneParams = GRID_PARAMS.filter(p =>
            zone.points.some(pt => p.freq[pt.key])
          );
          if (!zoneParams.length) return null;

          // Zona colapsable si ningún punto×param tiene frecuencia activa ahora
          const hasActiveCell = zone.points.some(pt =>
            zoneParams.some(p => {
              const fc = freqClass(p.freq[pt.key], turnoNum, dayCode);
              return fc === 'ct' || fc === 'cd' || fc === 'ch';
            })
          );
          const isCollapsible = !hasActiveCell;
          const isOpen = !isCollapsible || optOpen.has(zone.id);

          // Dot color del encabezado de columna: tomar el "peor caso activo" entre los puntos
          const colFreqClass = (p: GridParam): FreqClass => {
            const classes = zone.points.map(pt => freqClass(p.freq[pt.key], turnoNum, dayCode));
            if (classes.includes('ct')) return 'ct';
            if (classes.includes('cd')) return 'cd';
            if (classes.includes('ch')) return 'ch';
            if (classes.some(c => c === 'opt')) return 'opt';
            return null;
          };


          return (
            <div key={zone.id} style={{ marginBottom: 20 }}>
              {isCollapsible ? (
                <button
                  type="button"
                  onClick={() => setOptOpen(prev => {
                    const next = new Set(prev);
                    next.has(zone.id) ? next.delete(zone.id) : next.add(zone.id);
                    return next;
                  })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                    background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                    width: '100%', textAlign: 'left',
                  }}
                >
                  <span className="form-section-title" style={{ margin: 0, color: '#484f58' }}>{zone.label}</span>
                  <span style={{ fontSize: 11, color: '#484f58' }}>— no aplica este turno</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#484f58', display:'flex', alignItems:'center', gap:4 }}>
                    {isOpen ? 'ocultar' : 'registrar de todas formas'}
                    <span style={{ fontSize:10, transform: isOpen ? 'rotate(90deg)':'rotate(0deg)', transition:'transform 0.15s', display:'inline-block' }}>▶</span>
                  </span>
                </button>
              ) : (
                <div className="form-section-title" style={{ marginBottom: 8 }}>{zone.label}</div>
              )}

              {!isOpen ? null : <div style={{ borderRadius: 8, border: '1px solid #21262d', opacity: isCollapsible ? 0.75 : 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '14%' }} />
                    {zoneParams.map(p => <col key={p.id} />)}
                  </colgroup>
                  <thead>
                    <tr style={{ background: '#161b22', borderBottom: '1px solid #21262d' }}>
                      <th style={{
                        padding: '7px 12px', textAlign: 'left', fontWeight: 500,
                        fontSize: 11, color: '#8b949e',
                      }}>Punto</th>
                      {zoneParams.map(p => {
                        const fc = colFreqClass(p);
                        const dotColor = fc === 'ct' ? '#1D9E75' : fc === 'cd' ? '#185FA5' : fc === 'ch' ? '#BA7517' : '#30363d';
                        return (
                          <th key={p.id} style={{
                            padding: '7px 4px', textAlign: 'center', fontWeight: 500,
                            fontSize: 11, color: fc === 'opt' || !fc ? '#484f58' : '#8b949e',
                          }}>
                            <span style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                              <span style={{ display:'flex', alignItems:'center', gap:3, justifyContent:'center' }}>
                                <span style={{ width:6, height:6, borderRadius:'50%', background:dotColor, display:'inline-block', flexShrink:0 }}/>
                                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                  {PARAM_LABEL[p.id] ?? p.nombre}
                                </span>
                              </span>
                              <span style={{ fontSize:10, color:'#2e3a4a' }}>{p.unidad}</span>
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {zone.points.map((pt, ri) => (
                      <tr key={pt.key} style={{ borderBottom: ri < zone.points.length - 1 ? '1px solid #21262d' : 'none' }}>
                        <td style={{
                          padding: '5px 12px', fontWeight: 500, color: '#e6edf3',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          background: '#0d1117', fontSize: 12,
                        }}>{pt.label}</td>
                        {zoneParams.map(p => {
                          const ptFreq = p.freq[pt.key];
                          const fc = freqClass(ptFreq, turnoNum, dayCode);
                          const k = `${pt.key}|${p.id}`;
                          const val = gridVals[k] ?? '';
                          const prev = prevVals[`${pt.unidad}||${p.nombre}`];
                          const num = parseFloat(val);
                          const hasVal = val !== '' && !isNaN(num);
                          const outOfRange = hasVal && (num < p.min || num > p.max);
                          const alarm = hasVal ? getAlarm(p.id, pt.key, num, gridVals) : null;

                          if (!ptFreq) {
                            return (
                              <td key={p.id} style={{ padding: '5px 4px', background: '#0d1117', textAlign: 'center' }}>
                                <span style={{ color: '#1c2128', fontSize: 14 }}>—</span>
                              </td>
                            );
                          }

                          // Fondo sutil según frecuencia cuando la celda está vacía
                          const freqBg = fc === 'ct' ? '#0d1f18' : fc === 'cd' ? '#0d1526' : fc === 'ch' ? '#1a1505' : '#0d1117';

                          const alarmLevel = outOfRange ? 'error' : alarm?.level ?? null;
                          const alarmMsg   = alarm?.message ?? (outOfRange ? `Fuera de rango (${p.min}–${p.max} ${p.unidad})` : '');

                          const borderColor =
                            alarmLevel === 'error' ? '#f85149' :
                            alarmLevel === 'warn'  ? '#e3b341' :
                            hasVal                 ? '#238636' : '#30363d';

                          const inputBg =
                            alarmLevel === 'error' ? '#2d0f0f' :
                            alarmLevel === 'warn'  ? '#1f1500' :
                            hasVal                 ? '#0a1e0a' : freqBg;

                          return (
                            <td key={p.id} style={{ padding: '4px 3px', background: '#0d1117' }}>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type="number"
                                  step={p.decimales === 0 ? '1' : p.decimales === 1 ? '0.1' : '0.01'}
                                  value={val}
                                  onChange={e => setCellVal(pt.key, p.id, e.target.value)}
                                  placeholder="—"
                                  title={alarmMsg || undefined}
                                  style={{
                                    width: '100%', boxSizing: 'border-box',
                                    padding: '5px 6px',
                                    paddingBottom: prev?.valor != null ? 16 : 5,
                                    borderRadius: 5, fontSize: 13, textAlign: 'right',
                                    border: `1px solid ${borderColor}`,
                                    background: inputBg,
                                    color: alarmLevel === 'error' ? '#ff7b72' : alarmLevel === 'warn' ? '#e3b341' : '#e6edf3',
                                    outline: 'none', minWidth: 0,
                                  }}
                                  onWheel={e => (e.target as HTMLInputElement).blur()}
                                />
                                {/* Ícono de alarma superpuesto arriba izquierda */}
                                {alarmLevel && (
                                  <span style={{
                                    position: 'absolute', top: 3, left: 4,
                                    fontSize: 9, lineHeight: 1, pointerEvents: 'none',
                                    color: alarmLevel === 'error' ? '#f85149' : '#e3b341',
                                  }}>
                                    {alarmLevel === 'error' ? '✕' : '!'}
                                  </span>
                                )}
                                {prev?.valor != null && (
                                  <span style={{
                                    position: 'absolute', bottom: 4, right: 6,
                                    fontSize: 9, color: '#484f58', pointerEvents: 'none',
                                    fontFamily: 'monospace', lineHeight: 1,
                                  }}>
                                    ↑{prev.valor}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
            </div>
          );
        })}

        {/* ── Novedades y Observaciones ─────────────────────────────────── */}
        {/* ── Banner de alarmas (antes de observaciones) ────────────────── */}
        <AlarmBanner alarms={activeAlarms} />

        <div className="form-section-title">Novedades del Turno</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={form.novedad_quimico}
              onChange={e => setForm(prev => ({ ...prev, novedad_quimico: e.target.checked }))}
              style={{ width: 16, height: 16 }}
            />
            <span>Novedad en consumo químico</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={form.novedad_procesos}
              onChange={e => setForm(prev => ({ ...prev, novedad_procesos: e.target.checked }))}
              style={{ width: 16, height: 16 }}
            />
            <span>Novedad en procesos de producción</span>
          </label>
        </div>
        <div className="form-group">
          <label className="form-label">Observaciones Generales del Turno</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Describe novedades, anomalías o condiciones especiales del turno..."
            value={form.observaciones_generales}
            onChange={e => setForm(prev => ({ ...prev, observaciones_generales: e.target.value }))}
          />
        </div>

        {saveError && <div className="form-alert form-alert-error">{saveError}</div>}

        {/* ── Acciones ──────────────────────────────────────────────────── */}
        <div className="form-actions">
          <button type="button" className="btn-secondary"
            onClick={() => navigate(ROUTES.OPERARIO_HOME)} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" style={{ background: '#d29922' }}
            disabled={saving || totalFilled === 0}>
            {saving ? 'Guardando...' : totalFilled === 0
              ? 'Completa al menos una medición'
              : `Enviar ${totalFilled} medición${totalFilled !== 1 ? 'es' : ''}`}
          </button>
        </div>

      </form>
    </div>
  );
});

export default FormatoCalidad;
