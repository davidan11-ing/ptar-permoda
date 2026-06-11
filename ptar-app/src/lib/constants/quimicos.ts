export const QUIMICOS = [
  // ── Sistema GEM ──────────────────────────────────────────────────────────────
  { id: 'Q-01', sistema: 'GEM'  as const, nombre: 'Ácido',             unidad: 'L',  capacidad: 6000, densidad: 1.250, nivel_inicial: 2780, precio_kg:  825  },
  { id: 'Q-02', sistema: 'GEM'  as const, nombre: 'Coagulante',         unidad: 'L',  capacidad: 9000, densidad: 1.340, nivel_inicial: 5720, precio_kg: 2830  },
  { id: 'Q-03', sistema: 'GEM'  as const, nombre: 'Decolorante',        unidad: 'L',  capacidad: 7000, densidad: 1.170, nivel_inicial: 4280, precio_kg: 6130  },
  { id: 'Q-04', sistema: 'GEM'  as const, nombre: 'Polímero Aniónico',  unidad: 'kg', capacidad: 500,  densidad: 2.500, nivel_inicial: 275,  precio_kg: 19050 },
  { id: 'Q-05', sistema: 'GEM'  as const, nombre: 'Polímero Catiónico', unidad: 'kg', capacidad: 500,  densidad: 2.500, nivel_inicial: 225,  precio_kg: 22050 },
  // ── Sistema RO — nombres según tabla operacion_ro_turno ─────────────────
  { id: 'Q-06', sistema: 'RO'   as const, nombre: 'HCL 10%',                  unidad: 'L', capacidad: 200, densidad: 1.18, nivel_inicial: 0, precio_kg:  1650  },
  { id: 'Q-07', sistema: 'RO'   as const, nombre: 'Kuriverter IK-220',         unidad: 'L', capacidad: 200, densidad: 1.28, nivel_inicial: 0, precio_kg: 19160  },
  { id: 'Q-08', sistema: 'RO'   as const, nombre: 'Vitec 7000',                unidad: 'L', capacidad: 200, densidad: 1.20, nivel_inicial: 0, precio_kg: 36239  },
  { id: 'Q-14', sistema: 'RO'   as const, nombre: 'Hidróxido de Sodio (NaOH)', unidad: 'L', capacidad: 200, densidad: 1.53, nivel_inicial: 0, precio_kg:  1298  },
  { id: 'Q-15', sistema: 'RO'   as const, nombre: 'Bisulfito de Sodio',        unidad: 'L', capacidad: 200, densidad: 1.20, nivel_inicial: 0, precio_kg:  4200  },
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
