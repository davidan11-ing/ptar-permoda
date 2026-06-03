import { useState } from 'react';

// ── Tipos ─────────────────────────────────────────────────────────────────────
export type Granularidad = 'turno' | 'dia' | 'semana' | 'mes';

// ── Días que abarca cada granularidad al hacer clic ───────────────────────────
const DIAS: Record<Granularidad, number> = {
  turno:  7,    // últimos 7 días — cubre datos aunque no se haya registrado ayer
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
// Sin default activo: los pickers arrancan con últimos 30d pero ningún botón
// queda seleccionado. El usuario elige granularidad o rango manualmente.
export function useGranularidad() {
  const [granularidad, setGran] = useState<Granularidad | null>(null);
  const [fechaInicio,  setFechaInicio] = useState(restar(30));
  const [fechaFin,     setFechaFin]    = useState(hoy);

  /** Click en un botón: activa el preset y actualiza ambas fechas */
  function setGranularidad(g: Granularidad) {
    setGran(g);
    setFechaInicio(restar(DIAS[g]));
    setFechaFin(hoy());
  }

  /** Cambio manual en fecha inicio — mantiene la granularidad activa */
  function handleFechaInicio(v: string) {
    setFechaInicio(v);
  }

  /** Cambio manual en fecha fin — mantiene la granularidad activa */
  function handleFechaFin(v: string) {
    setFechaFin(v);
  }

  return {
    granularidad,
    setGranularidad,
    fechaInicio,
    fechaFin,
    handleFechaInicio,
    handleFechaFin,
  };
}
