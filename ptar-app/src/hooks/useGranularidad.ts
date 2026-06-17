import { useState } from 'react';

// ── Tipos ─────────────────────────────────────────────────────────────────────
export type Granularidad = 'turno' | 'dia' | 'semana' | 'mes';

// ── Días que abarca cada granularidad al hacer clic ───────────────────────────
const DIAS: Record<Granularidad, number> = {
  turno:  7,    // últimos 7 días
  dia:    30,   // último mes
  semana: 84,   // últimas 12 semanas
  mes:    180,  // últimos 6 meses
};

function hoy() { return new Date().toISOString().slice(0, 10); }
function restar(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

// ── Hook ──────────────────────────────────────────────────────────────────────
// fechaInicio / fechaFin → valores COMPROMETIDOS (disparan fetch)
// draftInicio / draftFin → valores del input mientras el usuario escribe
//
// Patrón de uso:
//   <input value={draftInicio}
//          onChange={e => handleFechaInicio(e.target.value)}
//          onBlur={e  => commitFechaInicio(e.target.value)} />
export function useGranularidad() {
  const INIT_FI = restar(30);
  const INIT_FF = hoy();

  const [granularidad, setGran]      = useState<Granularidad | null>(null);
  const [fechaInicio,  setFechaInicio] = useState(INIT_FI);
  const [fechaFin,     setFechaFin]    = useState(INIT_FF);
  const [draftInicio,  setDraftInicio] = useState(INIT_FI);
  const [draftFin,     setDraftFin]    = useState(INIT_FF);

  /** Click en botón preset: actualiza todo de golpe */
  function setGranularidad(g: Granularidad) {
    setGran(g);
    const ni = restar(DIAS[g]);
    const nf = hoy();
    setFechaInicio(ni); setDraftInicio(ni);
    setFechaFin(nf);    setDraftFin(nf);
  }

  /** onChange: actualiza solo el draft (display inmediato).
   *  Compromete el valor cuando la fecha está completa (10 chars YYYY-MM-DD). */
  function handleFechaInicio(v: string) {
    setDraftInicio(v);
    if (v.length === 10) setFechaInicio(v);
  }
  function handleFechaFin(v: string) {
    setDraftFin(v);
    if (v.length === 10) setFechaFin(v);
  }

  /** onBlur: compromete lo que haya en el input al salir del campo */
  function commitFechaInicio(v: string) { if (v.length === 10) setFechaInicio(v); }
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
