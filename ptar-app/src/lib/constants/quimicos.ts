export const QUIMICOS = [
  // ── Sistema GEM ──────────────────────────────────────────────────────────────
  { id: 'Q-01', sistema: 'GEM'  as const, nombre: 'Ácido',             unidad: 'L',  capacidad: 6000, densidad: 1.300, nivel_inicial: 2780, precio_kg:  830  },
  { id: 'Q-02', sistema: 'GEM'  as const, nombre: 'Coagulante',         unidad: 'L',  capacidad: 9000, densidad: 1.325, nivel_inicial: 5720, precio_kg: 2818  },
  { id: 'Q-03', sistema: 'GEM'  as const, nombre: 'Decolorante',        unidad: 'L',  capacidad: 7000, densidad: 1.250, nivel_inicial: 4280, precio_kg: 6295  },
  { id: 'Q-04', sistema: 'GEM'  as const, nombre: 'Polímero Aniónico',  unidad: 'kg', capacidad: 500,  densidad: 1.000, nivel_inicial: 275,  precio_kg: 19050 },
  { id: 'Q-05', sistema: 'GEM'  as const, nombre: 'Polímero Catiónico', unidad: 'kg', capacidad: 500,  densidad: 1.000, nivel_inicial: 225,  precio_kg: 22050 },
  // ── Sistema RO (datos pendientes de confirmar) ────────────────────────────
  { id: 'Q-06', sistema: 'RO'   as const, nombre: 'Anti-incrustante',        unidad: 'L', capacidad: 200, densidad: 1.000, nivel_inicial: 0, precio_kg: 0 },
  { id: 'Q-07', sistema: 'RO'   as const, nombre: 'Biocida / Desinfectante',  unidad: 'L', capacidad: 200, densidad: 1.000, nivel_inicial: 0, precio_kg: 0 },
  { id: 'Q-08', sistema: 'RO'   as const, nombre: 'Limpiador Químico',        unidad: 'L', capacidad: 200, densidad: 1.000, nivel_inicial: 0, precio_kg: 0 },
  // ── Sistema PTAP ─────────────────────────────────────────────────────────
  { id: 'Q-09', sistema: 'PTAP' as const, nombre: 'Polímero Aniónico',  unidad: 'L', capacidad: 500,  densidad: 1.000, nivel_inicial: 0, precio_kg: 0 },
  { id: 'Q-10', sistema: 'PTAP' as const, nombre: 'Coagulante',         unidad: 'L', capacidad: 9000, densidad: 1.325, nivel_inicial: 0, precio_kg: 0 },
  { id: 'Q-11', sistema: 'PTAP' as const, nombre: 'Ácido',              unidad: 'L', capacidad: 6000, densidad: 1.300, nivel_inicial: 0, precio_kg: 0 },
  { id: 'Q-12', sistema: 'PTAP' as const, nombre: 'Soda',               unidad: 'L', capacidad: 1000, densidad: 1.300, nivel_inicial: 0, precio_kg: 0 },
  { id: 'Q-13', sistema: 'PTAP' as const, nombre: 'Peróxido',           unidad: 'L', capacidad: 1000, densidad: 1.100, nivel_inicial: 0, precio_kg: 0 },
] as const;

export type QuimicoId = typeof QUIMICOS[number]['id'];
export const QUIMICOS_GEM  = QUIMICOS.filter(q => q.sistema === 'GEM');
export const QUIMICOS_RO   = QUIMICOS.filter(q => q.sistema === 'RO');
export const QUIMICOS_PTAP = QUIMICOS.filter(q => q.sistema === 'PTAP');
