export const TURNO_LABELS: Record<string, string> = {
  mañana: 'Mañana (6:00 – 14:00)',
  tarde:  'Tarde (14:00 – 22:00)',
  noche:  'Noche (22:00 – 6:00)',
};

export const BITACORA_TURNO: Record<string, string> = {
  mañana: 'Final Turno 1',
  tarde:  'Final Turno 2',
  noche:  'Final Turno 3',
};

// Turnos según instructivo BD: 1=Noche(22-6h), 2=Mañana(6-14h), 3=Tarde(14-22h)
export function getTurno(): 'mañana' | 'tarde' | 'noche' {
  const h = new Date().getHours();
  if (h >= 6  && h < 14) return 'mañana';  // turno 2
  if (h >= 14 && h < 22) return 'tarde';   // turno 3
  return 'noche';                            // turno 1
}
