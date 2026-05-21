export const CONTADORES = [
  { id: 'C-01', nombre: 'Contador Entrada Agua Potable Principal 6"',             ubicacion: 'Entrada Principal',       tipo_agua: 'Potable'       },
  { id: 'C-02', nombre: 'Contador Entrada Agua Potable Fría Lavandería (4")',      ubicacion: 'Lavandería',              tipo_agua: 'Potable'       },
  { id: 'C-03', nombre: 'Contador Entrada Agua Potable LAB Lavandería',            ubicacion: 'LAB Lavandería',          tipo_agua: 'Potable'       },
  { id: 'C-04', nombre: 'Entrada Agua Medidor Rojo Tintorería (4")',               ubicacion: 'Tintorería',              tipo_agua: 'Industrial'    },
  { id: 'C-05', nombre: 'Entrada Agua Potable Fría Tintorería (4")',               ubicacion: 'Tintorería',              tipo_agua: 'Potable'       },
  { id: 'C-06', nombre: 'Entrada Agua Medidor Rojo Lavandería (4")',               ubicacion: 'Lavandería',              tipo_agua: 'Industrial'    },
  { id: 'C-07', nombre: 'Rama',                                                    ubicacion: 'Distribución',            tipo_agua: 'Potable'       },
  { id: 'C-08', nombre: 'Abridora 1',                                              ubicacion: 'Proceso',                 tipo_agua: 'Industrial'    },
  { id: 'C-09', nombre: 'Abridora 2',                                              ubicacion: 'Proceso',                 tipo_agua: 'Industrial'    },
  { id: 'C-10', nombre: 'Tanque de Reúso (2")',                                   ubicacion: 'Tanque de Reúso',         tipo_agua: 'Reúso'         },
  { id: 'C-11', nombre: 'PTAR',                                                    ubicacion: 'Entrada PTAR',            tipo_agua: 'Residual'      },
  { id: 'C-12', nombre: 'Entrada RO #1',                                           ubicacion: 'Módulo RO #1',            tipo_agua: 'Pretratamiento'},
  { id: 'C-13', nombre: 'Salida RO #1',                                            ubicacion: 'Módulo RO #1',            tipo_agua: 'RO'            },
  { id: 'C-14', nombre: 'Entrada RO #2',                                           ubicacion: 'Módulo RO #2',            tipo_agua: 'Pretratamiento'},
  { id: 'C-15', nombre: 'Salida RO #2',                                            ubicacion: 'Módulo RO #2',            tipo_agua: 'RO'            },
  { id: 'C-16', nombre: 'Entrada Agua Potable Rotativa 3"',                        ubicacion: 'Rotativa',                tipo_agua: 'Potable'       },
  { id: 'C-17', nombre: 'Medidor VERDE DIGITAL Retorno',                           ubicacion: 'Retorno',                 tipo_agua: 'Reúso'         },
  { id: 'C-18', nombre: 'Contador Entrada Agua Potable Tintorería 6"',             ubicacion: 'Tintorería',              tipo_agua: 'Potable'       },
  { id: 'C-19', nombre: 'Envío a TH',                                              ubicacion: 'Torre Enfriamiento',      tipo_agua: 'Tratada'       },
  { id: 'C-20', nombre: 'MBR 1',                                                   ubicacion: 'Reactor MBR 1',           tipo_agua: 'Tratada'       },
  { id: 'C-21', nombre: 'MBR 2',                                                   ubicacion: 'Reactor MBR 2',           tipo_agua: 'Tratada'       },
  { id: 'C-22', nombre: 'Medidor de Ingreso UF PTAP',                              ubicacion: 'UF PTAP',                 tipo_agua: 'Pretratamiento'},
  { id: 'C-23', nombre: 'Medidor Salida UF PTAP',                                  ubicacion: 'UF PTAP',                 tipo_agua: 'Tratada'       },
  { id: 'C-24', nombre: 'Entrada Agua Potable PTAR 2 (½") — Tanque Recirculación', ubicacion: 'PTAR 2 — Acueducto',     tipo_agua: 'Potable'       },
  { id: 'C-25', nombre: 'Entrada Agua Potable Puerta 4 — Acueducto',               ubicacion: 'Puerta 4',                tipo_agua: 'Potable'       },
  { id: 'C-26', nombre: 'Entrada Agua Potable Cuarto Químicos',                     ubicacion: 'Cuarto Químicos',         tipo_agua: 'Potable'       },
  { id: 'C-27', nombre: 'Agua Caliente Tintorería (Digital)',                       ubicacion: 'Tintorería',              tipo_agua: 'Potable'       },
  { id: 'C-28', nombre: 'Medidor Prueba Agua Caliente',                             ubicacion: 'Prueba Caldera',          tipo_agua: 'Potable'       },
  { id: 'C-29', nombre: 'Entrada Agua Potable Puerta 2 — Acueducto',               ubicacion: 'Puerta 2',                tipo_agua: 'Potable'       },
  { id: 'C-30', nombre: 'Entrada Agua Potable Caldera — Acueducto',                ubicacion: 'Caldera',                 tipo_agua: 'Potable'       },
  { id: 'C-31', nombre: 'Entrada Agua Potable Puerta 5 — Acueducto',               ubicacion: 'Puerta 5',                tipo_agua: 'Potable'       },
  { id: 'C-32', nombre: 'Entrada Agua Potable Puerta 6 — Acueducto',               ubicacion: 'Puerta 6',                tipo_agua: 'Potable'       },
  { id: 'C-33', nombre: 'Entrada Agua Potable Puerta 7 — Acueducto',               ubicacion: 'Puerta 7',                tipo_agua: 'Potable'       },
  { id: 'C-34', nombre: 'Entrada Agua Potable ½" Lavandería — Acueducto',          ubicacion: 'Lavandería — Acueducto',  tipo_agua: 'Potable'       },
  { id: 'C-35', nombre: 'Entrada Agua Potable Zona de Lodos ½" (Lava Ojos)',       ubicacion: 'Zona de Lodos',           tipo_agua: 'Potable'       },
  { id: 'C-36', nombre: 'GEM PRUEBA',                                               ubicacion: 'GEM',                     tipo_agua: 'Tratada'       },
] as const;

export type ContadorId = typeof CONTADORES[number]['id'];

// Orden fijo de los 20 contadores principales (aparecen siempre en este orden)
export const DIARIOS_IDS: ContadorId[] = [
  'C-01', 'C-02', 'C-03', 'C-08', 'C-09', 'C-10', 'C-11', 'C-12', 'C-13',
  'C-16', 'C-17', 'C-36', 'C-19', 'C-20', 'C-21', 'C-22', 'C-23', 'C-26', 'C-27', 'C-28',
];

export const CONTADORES_MAP = Object.fromEntries(CONTADORES.map(c => [c.id, c])) as Record<ContadorId, typeof CONTADORES[number]>;
export const CONTADORES_DIARIOS    = DIARIOS_IDS.map(id => CONTADORES_MAP[id]);
export const CONTADORES_OPCIONALES = CONTADORES.filter(c => !DIARIOS_IDS.includes(c.id as ContadorId));

export const TIPO_AGUA_CLASS: Record<string, string> = {
  Potable:        'badge-agua-potable',
  'Reúso':        'badge-agua-reuso',
  RO:             'badge-agua-ro',
  Rechazo:        'badge-agua-rechazo',
  Tratada:        'badge-agua-tratada',
  Industrial:     'badge-agua-industrial',
  Residual:       'badge-agua-residual',
  Pretratamiento: 'badge-agua-pretratamiento',
};


