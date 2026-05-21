export const QUIMICOS = [
  { id: 'Q-01', nombre: 'Ácido',             unidad: 'L',  capacidad: 6000, densidad: 1.300, nivel_inicial: 2780, precio_kg:  830  },
  { id: 'Q-02', nombre: 'Coagulante',         unidad: 'L',  capacidad: 9000, densidad: 1.325, nivel_inicial: 5720, precio_kg: 2818  },
  { id: 'Q-03', nombre: 'Decolorante',        unidad: 'L',  capacidad: 7000, densidad: 1.250, nivel_inicial: 4280, precio_kg: 6295  },
  { id: 'Q-04', nombre: 'Polímero Aniónico',  unidad: 'kg', capacidad: 500,  densidad: 1.000, nivel_inicial: 275,  precio_kg: 19050 },
  { id: 'Q-05', nombre: 'Polímero Catiónico', unidad: 'kg', capacidad: 500,  densidad: 1.000, nivel_inicial: 225,  precio_kg: 22050 },
] as const;

export type QuimicoId = typeof QUIMICOS[number]['id'];
