export const PARAMS_DIARIOS = [
  { id: 'Temperatura',      nombre: 'Temperatura',                    unidad: '°C',         min: 15,   max: 60,   decimales: 1 },
  { id: 'pH',               nombre: 'pH',                             unidad: 'Unidades pH', min: 0,    max: 14,   decimales: 2 },
  { id: 'TDS',              nombre: 'TDS',                            unidad: 'mg/L',        min: 0,    max: 5000, decimales: 0 },
  { id: 'SST',              nombre: 'SST',                            unidad: 'mg/L',        min: 0,    max: 1000, decimales: 0 },
  { id: 'SolidosSediment',  nombre: 'Solidos Sedimentables',          unidad: 'mg/L',        min: 0,    max: 500,  decimales: 0 },
  { id: 'Conductividad',    nombre: 'Conductividad',                  unidad: 'µS/cm',       min: 0,    max: 10000,decimales: 0 },
  { id: 'Color',            nombre: 'Color',                          unidad: 'UPTCO',       min: 0,    max: 1500, decimales: 0 },
] as const;
// Turbidez movida a PARAMS_OCASIONALES (no se mide rutinariamente)

export const PARAMS_OCASIONALES = [
  { id: 'Turbidez',        nombre: 'Turbidez',               unidad: 'NTU',         min: 0,    max: 1000  },
  { id: 'DQO',             nombre: 'DQO',                    unidad: 'mg/L',        min: 0,    max: 5000  },
  { id: 'Hierro',          nombre: 'Hierro',                 unidad: 'mg/L',        min: 0,    max: 50    },
  { id: 'SST_Gravimetrico',nombre: 'SST Gravimetrico',       unidad: 'mg/L',        min: 0,    max: 1000  },
  { id: 'Cloruros',        nombre: 'Cloruros',               unidad: 'mg/L',        min: 0,    max: 1000  },
  { id: 'Fosforo',         nombre: 'Fosforo',                unidad: 'mg/L',        min: 0,    max: 100   },
  { id: 'NitrogenoTotal',  nombre: 'Nitrogeno',              unidad: 'mg/L',        min: 0,    max: 200   },
  { id: 'Sulfatos',        nombre: 'Sulfatos',               unidad: 'mg/L',        min: 0,    max: 500   },
  { id: 'Alcalinidad',     nombre: 'Alcalinidad',            unidad: 'mg CaCO3/L',  min: 0,    max: 1000  },
  { id: 'DurezaCalcica',   nombre: 'Dureza Calcica',         unidad: 'mg CaCO3/L',  min: 0,    max: 1000  },
  { id: 'DurezaTotal',     nombre: 'Dureza Total',           unidad: 'mg CaCO3/L',  min: 0,    max: 1500  },
  { id: 'Silice',          nombre: 'Silice',                 unidad: 'mg/L',        min: 0,    max: 100   },
  { id: 'ORP',             nombre: 'ORP',                    unidad: 'mV',          min: -500, max: 500   },
  { id: 'CloroResidual',   nombre: 'Cloro residual',         unidad: 'mg/L',        min: 0,    max: 5     },
] as const;

export type DiarioId   = typeof PARAMS_DIARIOS[number]['id'];
export type OcasionalId = typeof PARAMS_OCASIONALES[number]['id'];

export const UNIDADES_TRATAMIENTO = [
  'Tanque Pulmon',
  'Tanque Homogeneizador',
  'GEM Salida',
  'Reactor Anoxico',
  'Reactor MBBR',
  'MBR 1 Interno',
  'MBR 2 Interno',
  'MBR 1 Permeado',
  'MBR 2 Permeado',
  'Vertimiento',
  'RO 1 Compuesta',
  'RO 1 Etapa 1',
  'RO 1 Etapa 2',
  'RO 2 Permeado',
  'RO Rechazo',
];

export const METODOS = [
  'Sensor / Equipo en línea',
  'Portátil (multiparámetro)',
  'Laboratorio externo',
];
