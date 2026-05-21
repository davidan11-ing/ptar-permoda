import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { ROUTES } from '../../lib/routes';
import { getUltimasLecturas, createCaudalesBatch } from '../../services/ptarClient';
import type { RegistroContador } from '../../services/ptarClient';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { 
  CONTADORES_MAP, CONTADORES_OPCIONALES, 
  DIARIOS_IDS 
} from '../../lib/constants/contadores';
import { TURNO_LABELS, getTurno } from '../../lib/utils/time';
import type { ContadorId } from '../../lib/constants/contadores';
import { ContadorCard } from './components/ContadorCard';

// ─── Validaciones Zod ────────────────────────────────────────────────────────
const itemSchema = z.object({
  id_contador: z.string().min(1, 'Obligatorio'),
  lectura_actual: z.string().optional(),
  observaciones: z.string().optional(), // solo para decrementos
});

const formSchema = z.object({
  daily: z.array(itemSchema),
  extras: z.array(itemSchema),
  observaciones_generales: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Componente Principal ────────────────────────────────────────────────────
export default function FormatoCaudales() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [lastReadings, setLastReadings] = useState<Record<string, number>>({});
  const [loadingPrev, setLoadingPrev] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Modo manual de fecha / turno ──────────────────────────────────────────
  // getTurno() se calcula UNA vez al montar (useState lazy init) para que no
  // cambie si el usuario tiene el form abierto justo en el cambio de turno.
  const [autoTurno]   = useState<'mañana' | 'tarde' | 'noche'>(getTurno);
  const [manualMode,  setManualMode]  = useState(false);
  const [manualFecha, setManualFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualTurno, setManualTurno] = useState<'mañana' | 'tarde' | 'noche'>(autoTurno);

  const now         = new Date();
  const today       = now.toISOString().slice(0, 10);
  const activeTurno = manualMode ? manualTurno : autoTurno;
  const activeFecha = manualMode ? manualFecha : today;

  // Configuración de react-hook-form
  const { control, handleSubmit, watch, register } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      daily: DIARIOS_IDS.map(id => ({ id_contador: id, lectura_actual: '', observaciones: '' })),
      extras: [],
      observaciones_generales: '',
    }
  });

  const { fields: extraFields, append: addExtra, remove: removeExtra } = useFieldArray({
    control,
    name: 'extras',
  });

  const dailyValues = watch('daily');
  const extrasValues = watch('extras');

  // ─── Fetch lecturas anteriores ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingPrev(true);
      try {
        const map = await getUltimasLecturas();
        setLastReadings(map);
      } catch {
        // si falla, el formulario sigue funcional con prev = 0
      } finally {
        setLoadingPrev(false);
      }
    })();
  }, []);

  const getPrev = (id: string) => lastReadings[id] ?? 0;
  const getDelta = (id: string, lectura?: string): number | null => {
    if (!lectura) return null;
    return parseFloat(lectura) - getPrev(id);
  };

  // ─── Lógica de UI derivada ────────────────────────────────────────────────
  const addedExtraIds = new Set(extrasValues.map(e => e.id_contador).filter(Boolean));
  const availableOpcionales = CONTADORES_OPCIONALES.filter(c => !addedExtraIds.has(c.id as ContadorId));

  const totalActive = 
    dailyValues.filter(d => !!d.lectura_actual).length + 
    extrasValues.filter(e => !!e.id_contador && !!e.lectura_actual).length;

  const canSubmit = totalActive > 0;

  // ─── Guardado y Envío ─────────────────────────────────────────────────────
  const doSave = async (data: FormValues) => {
    if (!canSubmit) return;

    let hasCustomError = false;
    
    // Validación cruzada manual (el delta negativo requiere observación)
    const validateRow = (row: z.infer<typeof itemSchema>) => {
      if (!row.id_contador || !row.lectura_actual) return true;
      const delta = getDelta(row.id_contador, row.lectura_actual);
      if (delta !== null && delta < 0 && (!row.observaciones || !row.observaciones.trim())) {
        toast.error(`Lectura decreciente en ${row.id_contador} requiere observación.`);
        hasCustomError = true;
        return false;
      }
      return true;
    };

    data.daily.forEach(validateRow);
    data.extras.forEach(validateRow);

    if (hasCustomError) return;

    setSaving(true);

    // `today` ya está definida en el scope del componente
    const fechaPrefix = manualMode && activeFecha !== today
      ? `[Fecha manual: ${activeFecha}] ` : '';

    const obsGenerales = (data.observaciones_generales ?? '').trim();

    const buildRow = (row: z.infer<typeof itemSchema>): Omit<RegistroContador, 'id' | 'created_at' | 'delta_m3'> | null => {
      if (!row.id_contador || !row.lectura_actual) return null;
      const c = CONTADORES_MAP[row.id_contador as ContadorId];
      const obs = (fechaPrefix + (row.observaciones?.trim() ?? '')).trim();
      return {
        turno: activeTurno,
        usuario: currentUser?.nombre ?? 'desconocido',
        equipo: currentUser?.equipo ? JSON.stringify(currentUser.equipo) : undefined,
        id_contador: c.id,
        nombre_contador: c.nombre,
        ubicacion: c.ubicacion,
        tipo_agua: c.tipo_agua,
        lectura_anterior_m3: getPrev(row.id_contador),
        lectura_actual_m3: parseFloat(row.lectura_actual),
        observaciones: [obs, obsGenerales].filter(Boolean).join(' | ') || undefined,
      };
    };

    const rows = [
      ...data.daily.map(buildRow).filter(Boolean),
      ...data.extras.map(buildRow).filter(Boolean)
    ] as Omit<RegistroContador, 'id' | 'created_at' | 'delta_m3'>[];

    try {
      await createCaudalesBatch(rows);
    } catch (err) {
      setSaving(false);
      toast.error(`Error al guardar: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      return;
    }
    setSaving(false);
    
    toast.success(`${rows.length} lectura${rows.length !== 1 ? 's' : ''} guardada${rows.length !== 1 ? 's' : ''} correctamente.`);
    setTimeout(() => navigate(ROUTES.OPERARIO_HOME), 2000);
  };

  const submitLabel = saving ? 'Guardando...'
    : totalActive === 0 ? 'Completa al menos una lectura'
    : `Enviar ${totalActive} Lectura${totalActive !== 1 ? 's' : ''}`;

  return (
    <div className="formato-page">
      <div className="formato-header" style={{ borderColor: '#00c5e3' }}>
        <h1 className="formato-title">
          <span className="formato-num" style={{ background: '#00c5e3' }}>F-01</span>
          Registro de Contadores
        </h1>
        <p className="formato-meta">Operario: <strong>{currentUser?.nombre}</strong></p>
      </div>

      <form className="formato-form" onSubmit={handleSubmit(doSave)}>
        {/* ── Contexto ──────────────────────────────────────────────────── */}
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
            <label className="form-label">Hora</label>
            <div className="form-readonly">{now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
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
        </div>
        {manualMode && (
          <div className="form-alert form-alert-warn" style={{ padding: '8px 12px', fontSize: 12, marginTop: -4 }}>
            ⚠ Modo manual activo — el turno y la fecha se tomarán como ingresados, no del reloj del sistema.
          </div>
        )}

        {/* ── Contadores Diarios ────────────────────────────────────────── */}
        <div className="form-section-title">
          Contadores PTAR — Diarios
          <span style={{ color: '#484f58', fontWeight: 400, marginLeft: 8 }}>
            — completa los que apliquen en este turno
          </span>
        </div>

        <div className="params-list">
          {dailyValues.map((field, index) => {
            const delta = getDelta(field.id_contador, field.lectura_actual);
            const isDecr = delta !== null && delta < 0;
            const hasErr = isDecr && (!field.observaciones || !field.observaciones.trim());

            return (
              <Controller
                key={field.id_contador}
                name={`daily.${index}`}
                control={control}
                render={({ field: { value, onChange } }) => (
                  <ContadorCard
                    id={value.id_contador as ContadorId}
                    lectura={value.lectura_actual || ''}
                    obs={value.observaciones || ''}
                    prev={getPrev(value.id_contador)}
                    delta={delta}
                    hasErr={hasErr}
                    loadingPrev={loadingPrev}
                    onLectura={v => onChange({ ...value, lectura_actual: v })}
                    onObs={v => onChange({ ...value, observaciones: v })}
                  />
                )}
              />
            );
          })}
        </div>

        {/* ── Contadores Opcionales ─────────────────────────────────────── */}
        <div className="form-section-title">
          Contadores Adicionales
          <span style={{ color: '#484f58', fontWeight: 400, marginLeft: 8 }}>
            — producción, acueducto y auxiliares
          </span>
        </div>

        <div className="extras-section">
          {extraFields.map((field, index) => {
            const val = extrasValues[index];
            if (!val || !val.id_contador) {
              return (
                <div key={field.id} className="extra-row">
                  <div className="extra-row-fields">
                    <Controller
                      name={`extras.${index}.id_contador`}
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <select
                          className="form-input"
                          value={value}
                          style={{ gridColumn: '1 / -1' }}
                          onChange={e => onChange(e.target.value)}
                        >
                          <option value="">Selecciona un contador...</option>
                          {CONTADORES_OPCIONALES
                            .filter(c => !addedExtraIds.has(c.id as ContadorId) || c.id === value)
                            .map(c => (
                              <option key={c.id} value={c.id}>
                                {c.id} — {c.nombre} ({c.tipo_agua})
                              </option>
                            ))
                          }
                        </select>
                      )}
                    />
                    <button type="button" className="btn-remove-param" onClick={() => removeExtra(index)}>×</button>
                  </div>
                </div>
              );
            }

            const delta = getDelta(val.id_contador, val.lectura_actual);
            const isDecr = delta !== null && delta < 0;
            const hasErr = isDecr && (!val.observaciones || !val.observaciones.trim());

            return (
              <Controller
                key={field.id}
                name={`extras.${index}`}
                control={control}
                render={({ field: { value, onChange } }) => (
                  <ContadorCard
                    id={value.id_contador as ContadorId}
                    lectura={value.lectura_actual || ''}
                    obs={value.observaciones || ''}
                    isExtra
                    prev={getPrev(value.id_contador)}
                    delta={delta}
                    hasErr={hasErr}
                    loadingPrev={loadingPrev}
                    onLectura={v => onChange({ ...value, lectura_actual: v })}
                    onObs={v => onChange({ ...value, observaciones: v })}
                    onRemove={() => removeExtra(index)}
                  />
                )}
              />
            );
          })}

          {availableOpcionales.length > 0 && (
            <button type="button" className="btn-add-param" onClick={() => addExtra({ id_contador: '', lectura_actual: '', observaciones: '' })}>
              + Agregar contador
              <span style={{ color: '#484f58', marginLeft: 8, fontSize: 11 }}>
                ({availableOpcionales.length} disponibles)
              </span>
            </button>
          )}
        </div>

        {/* ── Observaciones Generales ───────────────────────────────────── */}
        <div className="form-section-title">Observaciones Generales</div>
        <div className="form-group">
          <label className="form-label">Observaciones del turno (opcional)</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Novedades del turno, anomalías generales, condiciones especiales..."
            {...register('observaciones_generales')}
          />
        </div>

        {/* ── Acciones ──────────────────────────────────────────────────── */}
        <div className="form-actions">
          <button type="button" className="btn-secondary"
            onClick={() => navigate(ROUTES.OPERARIO_HOME)} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" style={{ background: '#00c5e3' }}
            disabled={saving || !canSubmit}>
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
