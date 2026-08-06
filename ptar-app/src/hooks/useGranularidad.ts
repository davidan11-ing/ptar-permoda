// Hook para gestionar granularidad de tiempo y rango de fechas en dashboards
import { useState, useEffect } from 'react';
import { getUltimaFechaConDatos } from '../services/ptarClient';

// ── Tipos ─────────────────────────────────────────────────────────────────────
export type Granularidad = 'turno' | 'dia' | 'semana' | 'mes';

// Ventana de días que carga cada preset de granularidad
const DIAS: Record<Granularidad, number> = {
  turno:  7,    // últimos 7 días
  dia:    30,   // último mes
  semana: 84,   // últimas 12 semanas
  mes:    180,  // últimos 6 meses
};

// Fecha de hoy en formato YYYY-MM-DD (hora local — evita desfase UTC-5)
function hoy() { return new Date().toLocaleDateString('en-CA'); }
// Fecha N días atrás en formato YYYY-MM-DD (hora local)
function restar(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toLocaleDateString('en-CA');
}
// Fechas por defecto: marzo 1 → abril 30 del año en curso
const _y = new Date().getFullYear();
const DEFAULT_FI = `${_y}-03-01`;
const DEFAULT_FF = `${_y}-04-01`;

// ── Hook ──────────────────────────────────────────────────────────────────────
// fechaInicio / fechaFin → valores COMPROMETIDOS (disparan fetch)
// draftInicio / draftFin → valores del input mientras el usuario escribe
//
// Patrón de uso:
//   <input value={draftInicio}
//          onChange={e => handleFechaInicio(e.target.value)}
//          onBlur={e  => commitFechaInicio(e.target.value)} />
// Hook de selección de granularidad con manejo de draft y commit de fechas
// autoInit: true → al montar consulta la última fecha con datos y ajusta el rango
export function useGranularidad(opts?: { initFi?: string; initFf?: string; autoInit?: boolean }) {
  // Valores iniciales del rango de fechas: enero 1 → abril 1 del año en curso
  const INIT_FI = opts?.initFi ?? DEFAULT_FI;
  const INIT_FF = opts?.initFf ?? DEFAULT_FF;

  // Granularidad activa seleccionada por el usuario
  const [granularidad, setGran]      = useState<Granularidad>('dia');
  // Fechas comprometidas que disparan el fetch de datos
  const [fechaInicio,  setFechaInicio] = useState(INIT_FI);
  const [fechaFin,     setFechaFin]    = useState(INIT_FF);
  // Valores intermedios del input mientras el usuario escribe
  const [draftInicio,  setDraftInicio] = useState(INIT_FI);
  const [draftFin,     setDraftFin]    = useState(INIT_FF);

  // Al montar: consulta última fecha con datos y ajusta rango si está disponible
  useEffect(() => {
    if (!opts?.autoInit) return;
    let cancelled = false;
    getUltimaFechaConDatos()
      .then(ultima => {
        if (cancelled || !ultima) return;
        const ff = ultima;
        const fi = (() => {
          const d = new Date(ultima + 'T00:00:00');
          d.setDate(d.getDate() - 30);
          return d.toLocaleDateString('en-CA');
        })();
        setFechaFin(ff);   setDraftFin(ff);
        setFechaInicio(fi); setDraftInicio(fi);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Click en botón preset: cambia granularidad y ajusta rango de fechas.
   *  - mes  → año completo (enero 1 → diciembre 31)
   *  - resto → rango por defecto (marzo 1 → abril 30) */
  function setGranularidad(g: Granularidad) {
    setGran(g);
    if (g === 'mes') {
      const fi = `${_y}-01-01`;
      const ff = `${_y}-12-31`;
      setFechaInicio(fi); setDraftInicio(fi);
      setFechaFin(ff);    setDraftFin(ff);
    } else {
      setFechaInicio(DEFAULT_FI); setDraftInicio(DEFAULT_FI);
      setFechaFin(DEFAULT_FF);    setDraftFin(DEFAULT_FF);
    }
  }

  /** onChange: actualiza solo el draft (display inmediato).
   *  El commit ocurre en onBlur via commitFechaInicio/commitFechaFin. */
  // Actualiza el draft de fecha inicio sin comprometer aún el fetch
  function handleFechaInicio(v: string) { setDraftInicio(v); }
  // Actualiza el draft de fecha fin sin comprometer aún el fetch
  function handleFechaFin(v: string)    { setDraftFin(v); }

  /** onBlur: compromete lo que haya en el input al salir del campo */
  // Confirma fecha inicio al salir del campo si es una fecha completa
  function commitFechaInicio(v: string) { if (v.length === 10) setFechaInicio(v); }
  // Confirma fecha fin al salir del campo si es una fecha completa
  function commitFechaFin(v: string)    { if (v.length === 10) setFechaFin(v); }

  return {
    granularidad,
    setGranularidad,
    fechaInicio,   // valor committed → usar en hooks de datos
    fechaFin,      // valor committed → usar en hooks de datos
    draftInicio,   // valor display   → usar en <input value={...}>
    draftFin,      // valor display   → usar en <input value={...}>
    handleFechaInicio,   // onChange
    handleFechaFin,      // onChange
    commitFechaInicio,   // onBlur
    commitFechaFin,      // onBlur
  };
}
