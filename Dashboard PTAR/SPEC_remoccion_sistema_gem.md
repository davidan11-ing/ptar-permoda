# SPEC TÉCNICO: Sección "REMOCIÓN SISTEMA GEM"
## Fuente: DASHBOARD CALIDAD AGUA ABRIL 2026 (1).xlsm — Filas 315–348

---

## 1. VISIÓN GENERAL DE LA SECCIÓN

Esta sección muestra el **comportamiento histórico por fecha** de un parámetro
de calidad de agua, comparando los valores de Entrada GEM vs Salida GEM,
más la eficiencia de remoción calculada. A diferencia de la sección anterior
(distribución estadística), aquí el eje X es temporal (fechas/turnos).

### Nombre de la sección en el Excel:
`"REMOCIÓN SISTEMA GEM"` — título dinámico que usa el parámetro activo.

### Componentes visuales (visibles en la imagen):
1. **Gráfico combinado (combo chart)** — barras agrupadas + línea
2. **Tabla de estadísticos ENTRADA GEM** — MIN / MAX / PROMEDIO / VC% / DESV EST
3. **Tabla de estadísticos SALIDA GEM** — MIN / MAX / PROMEDIO / VC% / DESV EST
4. **Tabla de estadísticos % EFICIENCIA REMOCIÓN** — MIN / MAX / PROMEDIO / VC% / DESV EST

---

## 2. COLUMNAS DE DATOS EN EL DASHBOARD

Los datos del gráfico vienen de tres columnas del DASHBOARD (filas 7–99):

| Columna DASHBOARD | Contenido | Descripción |
|-------------------|-----------|-------------|
| **CW** (col 100) | Valor ENTRADA GEM por fecha | Promedio de entrada del parámetro activo |
| **CX** (col 101) | Valor SALIDA GEM por fecha | Promedio de salida del parámetro activo |
| **CY** (col 102) | % EFICIENCIA REMOCIÓN | Eficiencia de remoción calculada |

### Columna dinámica de referencia:
| Celda | Contenido |
|-------|-----------|
| **CV4** | Nombre del parámetro activo (mismo que controla todo el dashboard) |

---

## 3. FÓRMULAS DE LAS TABLAS ESTADÍSTICAS (DASHBOARD filas 330–340)

### 3.1 Tabla ENTRADA GEM (filas 330–332)

```
Fila 330 (Título):  ="ENTRADA GEM " & CV4        → Ej: "ENTRADA GEM pH (Unidades de pH)"
Fila 331 (Headers): MIN | MAX | PROMEDIO | VC % | (vacío) | DESV EST

Fila 332 (Valores):
  MIN      = MINIFS(CW7:CW99, CW7:CW99, "<>0")
  MAX      = MAX(CW7:CW99)
  PROMEDIO = AVERAGEIFS(CW7:CW99, CW7:CW99, "<>0")
  VC%      = DESV_EST / PROMEDIO    → col W332 / col T332   (coeficiente de variación)
  DESV EST = ArrayFormula (DESVEST de CW7:CW99 excluyendo ceros)
```

### 3.2 Tabla SALIDA GEM (filas 334–336)

```
Fila 334 (Título):  ="SALIDA GEM " & CV4
Fila 335 (Headers): MIN | MAX | PROMEDIO | VC % | (vacío) | DESV EST

Fila 336 (Valores):
  MIN      = MINIFS(CX7:CX99, CX7:CX99, "<>0")
  MAX      = MAX(CX7:CX99)
  PROMEDIO = AVERAGEIFS(CX7:CX99, CX7:CX99, "<>0")
  VC%      = W336 / T336
  DESV EST = ArrayFormula (DESVEST de CX7:CX99 excluyendo ceros)
```

### 3.3 Tabla % EFICIENCIA REMOCIÓN (filas 338–340)

```
Fila 338 (Título):  ="% EFICIENCIA REMOCIÓN DE " & CV4
Fila 339 (Headers): MIN | MAX | PROMEDIO | VC % | (vacío) | DESV EST

Fila 340 (Valores):
  MIN      = MINIFS(CY7:CY99, CY7:CY99, "<>0")
  MAX      = MAX(CY7:CY99)
  PROMEDIO = AVERAGEIFS(CY7:CY99, CY7:CY99, "<>0")
  VC%      = W340 / T340
  DESV EST = ArrayFormula (DESVEST de CY7:CY99 excluyendo ceros)
```

### Equivalente JavaScript de las fórmulas:

```javascript
function calcularEstadisticos(valores) {
  const datos = valores.filter(v => v !== null && v !== 0 && v !== "");

  const min      = Math.min(...datos);
  const max      = Math.max(...datos);
  const promedio = datos.reduce((a, b) => a + b, 0) / datos.length;
  const desvEst  = Math.sqrt(
    datos.reduce((sum, v) => sum + Math.pow(v - promedio, 2), 0) / datos.length
  );
  const vcPct    = (desvEst / promedio) * 100;  // Coeficiente de variación en %

  return { min, max, promedio, vcPct, desvEst };
}

// Aplicar a cada columna de datos:
const statsEntrada  = calcularEstadisticos(columnaCW);  // CW7:CW99
const statsSalida   = calcularEstadisticos(columnaCX);  // CX7:CX99
const statsRemoccion = calcularEstadisticos(columnaCY); // CY7:CY99
```

> ⚠️ NOTA: El Excel usa `MINIFS(..., "<>0")` y `AVERAGEIFS(..., "<>0")` —
> excluye CEROS pero **sí** incluye valores negativos (relevante para ORP).
> En JS filtrar con `v !== 0` no `v > 0`.

---

## 4. GRÁFICO COMBINADO — Especificación completa

### 4.1 Tipo de gráfico
- **Tipo base**: Barras verticales agrupadas (clustered column)
- **Serie secundaria**: Línea superpuesta sobre las barras
- **Título**: `"REMOCIÓN SISTEMA GEM"` (puede ser dinámico con el parámetro)

### 4.2 Eje X (categorías)
- **Tipo**: Fechas / Turnos
- **Fuente**: Columna de fechas del DASHBOARD (misma que otras secciones — probablemente columna A o B filas 7–99)
- **Formato**: Fecha abreviada `dd/mm/yyyy`
- **Rotación de etiquetas**: 90° (vertical) — como se ve en la imagen

### 4.3 Series de datos

| Serie | Tipo | Color | Columna | Eje |
|-------|------|-------|---------|-----|
| **CANTIDAD PROMEDIO ENTRADA (REAL)** | Barras | Azul oscuro | CW7:CW99 | Primario (izq) |
| **REMOCIÓN** | Barras | Morado/Azul | CX7:CX99 | Primario (izq) |
| **REMOCIÓN POR ECUACIÓN** | Línea | Verde/amarillo | CY7:CY99 | Secundario (der) |

> Los nombres de las series coinciden con la leyenda visible en la imagen.

### 4.4 Ejes

**Eje Y izquierdo (primario):**
- Valores de concentración del parámetro (unidad varía por parámetro)
- Escala automática desde 0
- Línea de cuadrícula horizontal visible

**Eje Y derecho (secundario):**
- Porcentaje de remoción (0%–100% o puede exceder)
- Aplica solo a la línea "REMOCIÓN POR ECUACIÓN"
- Etiqueta en porcentaje `xx.x%`

### 4.5 Etiquetas de datos
- En la imagen se ven etiquetas encima de cada barra con el valor numérico
- Los valores se muestran con 0–1 decimales
- Las etiquetas de la línea también son visibles

### 4.6 Comportamiento dinámico
- Al cambiar el parámetro seleccionado, las columnas CW/CX/CY se recalculan
  y el gráfico se actualiza automáticamente
- El título de las tablas estadísticas cambia según CV4

---

## 5. FUENTE DE DATOS: "Tabla datos 1" (filas 315–348) — EXTENSIÓN del catálogo

Esta sección de la tabla de datos extiende el catálogo de parámetros con:
- Continuación de **Fase 3** (filas 315–316)
- Un nuevo bloque completo de **Fase 1** (filas 317–337) — Bitácora sección B (filas 123–143)
- Un nuevo bloque parcial de **Fase 2** (filas 338–348) — Bitácora sección B (filas 123–133)

> ⚠️ DIFERENCIA CLAVE vs sección anterior: La sección anterior (filas 271–314)
> apuntaba a la **Bitácora filas 99–119**. Esta sección (315–348) apunta a la
> **Bitácora filas 123–143**. Son datos de un SEGUNDO PERÍODO o SEGUNDA SECCIÓN
> de la bitácora — probablemente datos de un mes o fuente diferente.

### 5.1 Continuación Fase 3 (filas 315–316)

| Fila Excel | Parámetro | Fase | Bitácora fila |
|------------|-----------|------|---------------|
| 315 | Color (UPTCO) | 3 | 118 |
| 316 | Turbidez (NTU) | 3 | 119 |

### 5.2 Bloque Fase 1 — Sección B (filas 317–337, Bitácora cols AY/BB/BE... filas 123–143)

| Fila Excel | Parámetro | Fase | Bitácora fila |
|------------|-----------|------|---------------|
| 317 | Temperatura (°C) | 1 | 123 |
| 318 | pH (Unidades de pH) | 1 | 124 |
| 319 | DQO (mg/L) | 1 | 125 |
| 320 | SÓLIDOS DISUELTOS TOTALES TDS (mg/L) | 1 | 126 |
| 321 | Sólidos suspendidos Totales (mg/L) | 1 | 127 |
| 322 | Sólidos Sedimentables (mg/L) | 1 | 128 |
| 323 | HIERRO (ml/L) | 1 | 129 |
| 324 | SST GRAVIMÉTRICO (mg/L) | 1 | 130 |
| 325 | Cloruros (mg/L) | 1 | 131 |
| 326 | FÓSFORO TOTAL (mg/L) | 1 | 132 |
| 327 | Nitrógeno Total (mg/L) | 1 | 133 |
| 328 | Sulfatos (mg/L) | 1 | 134 |
| 329 | Alcalinidad (mg CaCO3/L) | 1 | 135 |
| 330 | Dureza Cálcica (mg CaCO3/L) | 1 | 136 |
| 331 | Dureza Total (mg CaCO3/L) | 1 | 137 |
| 332 | SILICE (mg/L) | 1 | 138 |
| 333 | ORP (-MV) | 1 | 139 |
| 334 | CLORO RES (mg/L) | 1 | 140 |
| 335 | Conductividad (Us/cm) | 1 | 141 |
| 336 | Color (UPTCO) | 1 | 142 |
| 337 | Turbidez (NTU) | 1 | 143 |

**Columnas Bitácora Fase 1 Sección B:** AY, BB, BE, BH, BK, BN, BQ, BT, BW, BZ, CC, CF, CI, CL, CO

### 5.3 Bloque Fase 2 — Sección B (filas 338–348, Bitácora cols AZ/BC/BF... filas 123–133)

| Fila Excel | Parámetro | Fase | Bitácora fila |
|------------|-----------|------|---------------|
| 338 | Temperatura (°C) | 2 | 123 |
| 339 | pH (Unidades de pH) | 2 | 124 |
| 340 | DQO (mg/L) | 2 | 125 |
| 341 | SÓLIDOS DISUELTOS TOTALES TDS (mg/L) | 2 | 126 |
| 342 | Sólidos suspendidos Totales (mg/L) | 2 | 127 |
| 343 | Sólidos Sedimentables (mg/L) | 2 | 128 |
| 344 | HIERRO (ml/L) | 2 | 129 |
| 345 | SST GRAVIMÉTRICO (mg/L) | 2 | 130 |
| 346 | Cloruros (mg/L) | 2 | 131 |
| 347 | FÓSFORO TOTAL (mg/L) | 2 | 132 |
| 348 | Nitrógeno Total (mg/L) | 2 | 133 |

**Columnas Bitácora Fase 2 Sección B:** AZ, BC, BF, BI, BL, BO, BR, BU, BX, CA, CD, CG, CJ, CM, CP

---

## 6. DATOS REALES — Bitácora filas 315–348

La hoja `BITÁCORA CALIDAD DE AGUA` contiene los valores medidos reales
en estas filas. A diferencia de las filas 271–314 que solo tenían fórmulas,
**aquí hay valores numéricos reales** en columnas A–AU (índices 0–46).

### Ejemplo — Fila 315 (Temperatura °C):
```
Valor real medido: col 2=35.4, col 3=33.8, col 4=33.7, col 7=30.1, col 8=31,
                   col 9=32.4, col 10=31.8, col 11=31.3, col 17=35.2,
                   col 18=31.2, col 19=30.4, col 24=31.7, col 25=32.5,
                   col 26=31.5, col 32=39, col 33=32.8, col 34=25.1,
                   col 39=32.5, col 40=31.5, col 41=31.7
```

### Estructura de columnas en la Bitácora (cols A–AU = índices 0–46):
- Cada columna representa un turno/fecha de medición
- Los valores nulos/vacíos = no se tomó muestra ese turno
- A partir del índice 48 (col AW) la bitácora replica los datos con fórmulas
  para alimentar los bloques de columnas que usa `Tabla datos 1`

### Parámetros con datos reales en filas 315–348:
| Fila Bitácora | Parámetro | Unidad |
|---------------|-----------|--------|
| 315 | Temperatura | °C |
| 316-348 | (continúan los mismos parámetros del catálogo) | varía |

---

## 7. LAYOUT DE LAS TABLAS ESTADÍSTICAS

```
┌─────────────────────────────────────┐
│  ENTRADA GEM {parámetro}            │   ← Fila 330, título dinámico
├────────┬──────┬──────────┬──────┬───┤
│  MIN   │  MAX │ PROMEDIO │ VC % │DSV│   ← Fila 331, encabezados
├────────┼──────┼──────────┼──────┼───┤
│ {val}  │{val} │  {val}   │{val} │{v}│   ← Fila 332, valores calculados
└────────┴──────┴──────────┴──────┴───┘

┌─────────────────────────────────────┐
│  SALIDA GEM {parámetro}             │   ← Fila 334, título dinámico
├────────┬──────┬──────────┬──────┬───┤
│  MIN   │  MAX │ PROMEDIO │ VC % │DSV│   ← Fila 335
├────────┼──────┼──────────┼──────┼───┤
│ {val}  │{val} │  {val}   │{val} │{v}│   ← Fila 336
└────────┴──────┴──────────┴──────┴───┘

┌─────────────────────────────────────┐
│  % EFICIENCIA REMOCIÓN DE {param}   │   ← Fila 338, título dinámico
├────────┬──────┬──────────┬──────┬───┤
│  MIN   │  MAX │ PROMEDIO │ VC % │DSV│   ← Fila 339
├────────┼──────┼──────────┼──────┼───┤
│ {val}  │{val} │  {val}   │{val} │{v}│   ← Fila 340
└────────┴──────┴──────────┴──────┴───┘
```

> En la imagen las tablas aparecen a la **derecha del gráfico**, apiladas
> verticalmente. Las columnas son estrechas. Los valores muestran 1–2 decimales.

---

## 8. ESTRUCTURA DE DATOS PARA LA APP HTML

```javascript
// Estructura de estado para esta sección
const remoccionState = {
  parametroActivo: "pH (Unidades de pH)",    // desde CV4
  datosEntrada: [],    // columna CW: array de {fecha, valor}
  datosSalida: [],     // columna CX: array de {fecha, valor}
  datosEficiencia: [], // columna CY: array de {fecha, pct}
};

// Estructura de dato por fecha
// {
//   fecha: "01/04/2024",    // etiqueta eje X
//   turno: 1,               // número de turno
//   entrada: 7.2,           // valor entrada GEM
//   salida: 7.05,           // valor salida GEM
//   eficiencia: 2.08,       // % eficiencia remoción
// }

// Cálculo de estadísticos (excluir ceros, no excluir negativos)
function statsGEM(arr) {
  const d = arr.filter(v => v !== null && v !== 0);
  if (!d.length) return null;
  const mean = d.reduce((a, b) => a + b, 0) / d.length;
  const std  = Math.sqrt(d.reduce((s, v) => s + (v - mean) ** 2, 0) / d.length);
  return {
    min:      Math.min(...d),
    max:      Math.max(...d),
    promedio: mean,
    desvEst:  std,
    vcPct:    (std / mean) * 100
  };
}

const statsEntrada   = statsGEM(remoccionState.datosEntrada.map(d => d.entrada));
const statsSalida    = statsGEM(remoccionState.datosSalida.map(d => d.salida));
const statsEficiencia = statsGEM(remoccionState.datosEficiencia.map(d => d.eficiencia));
```

---

## 9. NOTAS CRÍTICAS PARA IMPLEMENTACIÓN

1. **Dos secciones de la Bitácora**: Los parámetros están duplicados en dos bloques:
   - Bloque A (Bitácora filas 99–119): Usado por Tabla datos 1 filas 271–314 → sección de distribución
   - Bloque B (Bitácora filas 123–143): Usado por Tabla datos 1 filas 317–348 → sección de remoción
   Ambos bloques contienen los mismos parámetros pero de fuentes/períodos distintos.

2. **Columnas CW/CX/CY son intermedias**: No son directamente la bitácora.
   Son columnas calculadas en el DASHBOARD que agregan/filtran los datos
   según el parámetro y la fecha seleccionados.

3. **Filtro en estadísticos es `<>0`** (diferente a `>0` de la sección anterior):
   - Sección distribución: `>0` → excluye ceros Y negativos
   - Sección remoción: `<>0` → excluye solo ceros, incluye negativos
   Esto importa para parámetros como ORP (-MV) que pueden ser negativos.

4. **La línea "REMOCIÓN POR ECUACIÓN"** va en eje secundario (derecho).
   Su escala puede ser 0–100% o diferente a las barras de concentración.

5. **Etiqueta de datos en el gráfico**: Cada barra muestra su valor encima.
   La densidad de fechas es alta — en la imagen se ven ~25–30 fechas.
   Considerar rotación de etiquetas y posible agrupación para pantallas pequeñas.

6. **Fila 315 del DASHBOARD** tiene el label `"DISTRUBUCIÓN Y COMPORTAMIENTO MULTIPARAMETRO"` —
   es simplemente el encabezado/título de zona, no datos del gráfico de remoción.

7. **Referencia `CV4`**: Esta celda del DASHBOARD contiene el nombre del
   parámetro activo y se usa en los títulos dinámicos de las tres tablas.
   En la APP, reemplazar con la variable de estado del parámetro seleccionado.

8. **Coeficiente de variación (VC%)**: Fórmula `=W{row}/T{row}` — la columna W
   es DESV EST y la columna T es PROMEDIO (posiciones absolutas en el DASHBOARD).
   Calcular como `desvEst / promedio` y mostrar como porcentaje.
