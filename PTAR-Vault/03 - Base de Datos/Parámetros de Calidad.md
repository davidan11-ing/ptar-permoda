# Parámetros de Calidad del Agua

## Resumen

- **Total parámetros:** 22
- **Unidades de tratamiento:** 16
- **Tabla:** `ptar_registro_calidad`
- **Constantes:** `ptar-app/src/lib/constants/`

## Categorías de parámetros

### Físicos
| Parámetro | Unidad | Descripción |
|-----------|--------|-------------|
| Turbidez | NTU | Claridad del agua |
| Color | UC | Color aparente |
| Temperatura | °C | Temperatura del agua |
| pH | — | Acidez/basicidad (0-14) |

### Químicos principales
| Parámetro | Unidad | Descripción |
|-----------|--------|-------------|
| DBO₅ | mg/L O₂ | Demanda Bioquímica de Oxígeno |
| DQO | mg/L O₂ | Demanda Química de Oxígeno |
| SST | mg/L | Sólidos Suspendidos Totales |
| SSV | mg/L | Sólidos Suspendidos Volátiles |
| Conductividad | µS/cm | Conductividad eléctrica |
| ORP | mV | Potencial Redox |

### Nutrientes
| Parámetro | Unidad |
|-----------|--------|
| Nitrógeno Total | mg/L |
| Amonio (NH₄⁺) | mg/L |
| Nitratos (NO₃⁻) | mg/L |
| Fósforo Total | mg/L |

> Los 22 parámetros completos están en `constants/parametros.ts`.

## Unidades de Tratamiento (16)

Puntos de muestreo del sistema GEM PTAR:

| Código | Descripción |
|--------|-------------|
| `ENTRADA` | Agua cruda entrada planta |
| `PULMON` | Tanque pulmón / igualador |
| `PRIMARIA_SAL` | Salida tratamiento primario |
| `MBBR_SAL` | Salida reactor MBBR |
| `ANOX_SAL` | Salida zona anóxica |
| `SEDIM_SAL` | Salida sedimentador |
| `FILT_SAL` | Salida filtros secundarios |
| `GEM_SAL` | Salida sistema GEM completo |
| `RO1_PERM` | Permeado OI línea 1 |
| `RO1_RECH` | Rechazo OI línea 1 |
| `RO2_PERM` | Permeado OI línea 2 |
| `RO2_RECH` | Rechazo OI línea 2 |
| `RECIR` | Tanque recirculación |
| `VERT` | Punto de vertimiento final |
| `REUSO` | Agua de reúso industrial |
| `LODO` | Línea de lodos |

> ⚠️ Verificar códigos exactos en `constants/unidades.ts`.

## Notas de cálculo

- **Filtro de valores:** `v > 0` (se excluyen ceros y negativos, excepto ORP que puede ser negativo)
- **ORP:** usa filtro `v !== 0` (incluye negativos — es un parámetro que puede ser negativo por diseño)
- **CV% > 30%** se muestra en naranja en la tabla de remoción (alta variabilidad)

---

Tags: #calidad #parametros #monitoreo
