# SPEC TÉCNICO: Sección "DISTRIBUCIÓN Y COMPORTAMIENTO MULTIPARÁMETRO"
## Fuente: DASHBOARD CALIDAD AGUA ABRIL 2026 (1).xlsm — Filas 271–314

---

## 1. VISIÓN GENERAL DE LA SECCIÓN

Esta sección del dashboard muestra el análisis estadístico de distribución de frecuencias
y percentiles para **un parámetro de calidad de agua seleccionado por el usuario**.

### Componentes visuales (tal como aparecen en el Excel):
1. **Selector de parámetro** — lista desplegable (Slicer)
2. **Selector de fuente de datos** — GEM ENTRADA / GEM SALIDA / Fase 3 (celda B275 del DASHBOARD)
3. **Selector de turno** — celda B96 del DASHBOARD
4. **Gráfico de barras: FRECUENCIA** — histograma con 5 rangos
5. **Gráfico de torta: DISTRIBUCIÓN** — % de cada rango sobre el total
6. **Gráfico de barras horizontales: DISTRIBUCIÓN PERCENTIL** — P10 a P100
7. **Tabla izquierda: PARÁMETROS DE LA DISTRIBUCIÓN DE FRECUENCIAS** — estadísticos base
8. **Tabla central: Rangos con frecuencias** — 5 rangos con min/max/etiqueta/frecuencia/%
9. **Tabla derecha: PERCENTIL** — 10 percentiles con valor calculado y etiqueta

---

## 2. FUENTE DE DATOS: "Tabla datos 1" (filas 271–314)

Esta hoja es el puente entre la BITÁCORA y el DASHBOARD.
Cada fila = un parámetro en una fase específica.

### Estructura de columnas (índices 0-based):
| Col índice | Contenido |
|-----------|-----------|
| 0 (A) | Número de índice secuencial |
| 1 (B) | Auto-referencia al anterior |
| 2 (C) | **Nombre del parámetro** |
| 3 (D) | **Fase** (1=GEM Entrada, 2=GEM Salida, 3=Fase 3/Osmosis) |
| 4–18 (E–S) | Valores por fecha/turno (referenciados desde BITÁCORA) |
| 22 (W) | INDEX/MATCH por turno seleccionado (DASHBOARD.$B$96) |
| 23 (X) | INDEX/MATCH por fuente seleccionada (DASHBOARD.$B$275) |

### Fórmula genérica de columnas W y X:
```
=INDEX('Tabla datos 1'!E{row}:V{row}, MATCH(DASHBOARD!$B$96, 'Tabla datos 1'!$E$1:$V$1, 0))
=INDEX('Tabla datos 1'!E{row}:V{row}, MATCH(DASHBOARD!$B$275, 'Tabla datos 1'!$E$1:$V$1, 0))
```

### Catálogo completo de parámetros por fase:

#### FASE 1 — GEM ENTRADA (filas 271–274, Bitácora cols AY/BB/BE... fila 116–119)
| Fila Excel | Parámetro | Bitácora fila |
|------------|-----------|---------------|
| 271 | CLORO RES (mg/L) | 116 |
| 272 | Conductividad (Us/cm) | 117 |
| 273 | Color (UPTCO) | 118 |
| 274 | Turbidez (NTU) | 119 |

**Columnas de bitácora para Fase 1 (por turno/fecha):**
AY, BB, BE, BH, BK, BN, BQ, BT, BW, BZ, CC, CF, CI, CL, CO

#### FASE 2 — GEM SALIDA (filas 275–295, Bitácora cols AZ/BC/BF... fila 99–119)
| Fila Excel | Parámetro | Bitácora fila |
|------------|-----------|---------------|
| 275 | Temperatura (°C) | 99 |
| 276 | pH (Unidades de pH) | 100 |
| 277 | Demanda química de oxígeno DQO (mg/L) | 101 |
| 278 | SÓLIDOS DISUELTOS TOTALES TDS (mg/L) | 102 |
| 279 | Sólidos suspendidos Totales (mg/L) | 103 |
| 280 | Sólidos Sedimentables (mg/L) | 104 |
| 281 | HIERRO (ml/L) | 105 |
| 282 | Sólidos Suspendidos totales GRAVIMÉTRICO (mg/L) | 106 |
| 283 | Cloruros (mg/L) | 107 |
| 284 | FÓSFORO TOTAL (mg/L) | 108 |
| 285 | Nitrógeno Total (mg/L) | 109 |
| 286 | Sulfatos (mg/L) | 110 |
| 287 | Alcalinidad (mg CaCO3/L) | 111 |
| 288 | Dureza Cálcica (mg CaCO3/L) | 112 |
| 289 | Dureza Total (mg CaCO3/L) | 113 |
| 290 | SILICE (mg/L) | 114 |
| 291 | ORP (-MV) | 115 |
| 292 | CLORO RES (mg/L) | 116 |
| 293 | Conductividad (Us/cm) | 117 |
| 294 | Color (UPTCO) | 118 |
| 295 | Turbidez (NTU) | 119 |

**Columnas de bitácora para Fase 2 (por turno/fecha):**
AZ, BC, BF, BI, BL, BO, BR, BU, BX, CA, CD, CG, CJ, CM, CP

#### FASE 3 — OSMOSIS / Fase 3 (filas 296–314, Bitácora cols BA/BD/BG... fila 99–119)
| Fila Excel | Parámetro | Bitácora fila |
|------------|-----------|---------------|
| 296 | Temperatura (°C) | 99 |
| 297 | pH (Unidades de pH) | 100 |
| 298 | DQO (mg/L) | 101 |
| 299 | TDS (mg/L) | 102 |
| 300 | Sólidos suspendidos Totales (mg/L) | 103 |
| 301 | Sólidos Sedimentables (mg/L) | 104 |
| 302 | HIERRO (ml/L) | 105 |
| 303 | SST GRAVIMÉTRICO (mg/L) | 106 |
| 304 | Cloruros (mg/L) | 107 |
| 305 | FÓSFORO TOTAL (mg/L) | 108 |
| 306 | Nitrógeno Total (mg/L) | 109 |
| 307 | Sulfatos (mg/L) | 110 |
| 308 | Alcalinidad (mg CaCO3/L) | 111 |
| ... | (continúan los mismos parámetros) | ... |

**Columnas de bitácora para Fase 3 (por turno/fecha):**
BA, BD, BG, BJ, BM, BP, [BE1405–BE1417 para turno 7], BV, BY, CB, CE, CH, CK, CN, CQ

> ⚠️ NOTA: El turno 7 en Fase 3 referencia filas inusualmente altas de la bitácora
> (BE1405–BE1417), lo que puede ser un error en el Excel original o datos de otra sección.

---

## 3. LÓGICA DE CÁLCULO: Tabla de Distribución de Frecuencias (DASHBOARD filas 302–313)

El array de datos de entrada es la columna DI del DASHBOARD (DI7:DI120),
que se popula dinámicamente según el parámetro y fase seleccionados.

### 3.1 Estadísticos base (Tabla izquierda)

```javascript
// Equivalente JavaScript de las fórmulas Excel

const datos = values.filter(v => v > 0);  // Solo valores > 0

const MINIMO   = Math.min(...datos);                    // MINIFS(DI7:DI120, ">0")
const MAXIMO   = Math.max(...datos);                    // MAX(DI7:DI120)
const AMPLITUD = MAXIMO - MINIMO;                      // C304 - C303
const N_DATOS  = datos.length;                         // COUNTIF(DI7:DI100, ">0")
const N_RANGOS = 5;                                    // Hardcoded = 5
const TAMANO   = AMPLITUD / N_RANGOS;                  // C305 / C307
```

### 3.2 Tabla de 5 rangos (Tabla central)

```javascript
const rangos = [];
for (let i = 0; i < 5; i++) {
  const rangoMin = MINIMO + (i * TAMANO);
  const rangoMax = rangoMin + TAMANO;
  const etiqueta = `(${round(rangoMin, 2)} - ${round(rangoMax, 2)})`;
  const frecuencia = datos.filter(v => v >= rangoMin && v <= rangoMax).length;
  const pctFrecuencia = frecuencia / N_DATOS;

  rangos.push({
    nombre: `RANGO ${i + 1}`,
    min: rangoMin,
    max: rangoMax,
    etiqueta,         // Formato: "(6.77 - 6.94)"
    frecuencia,       // Conteo absoluto
    pctFrecuencia     // Proporción (0–1), mostrar como %)
  });
}
// Verificación: SUM(frecuencias) === N_DATOS
// Verificación: SUM(pctFrecuencias) === 1 (100%)
```

### 3.3 Tabla de percentiles (Tabla derecha)

```javascript
// Excel usa PERCENTILE() que es PERCENTILE.INC en versiones nuevas
const percentileValues = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.999];
const labels = ["MIN", "P10", "P20", "P30", "P40", "P50", "P60", "P70", "P80", "P90", "P100"];

const percentiles = percentileValues.map((p, i) => ({
  index: i,
  percentil: p,
  valor: percentileInc(datos, p),  // Ver función abajo
  etiqueta: labels[i]
}));

// Función PERCENTILE.INC equivalente:
function percentileInc(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return null;
  const pos = p * (n - 1);
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (pos - lower) * (sorted[upper] - sorted[lower]);
}
// MIN = percentileInc(datos, 0) = MINIMO
// P100 = percentileInc(datos, 0.999) ≈ MAXIMO (el Excel usa 0.999, no 1.0)
```

---

## 4. CONTROLES / SELECTORES

### 4.1 Selector de Parámetro
- Tipo: Dropdown / Slicer
- Opciones: Lista de todos los parámetros únicos del catálogo (columna C de Tabla datos 1)
- Al cambiar: recarga el array DI con los datos del parámetro + fase seleccionados
- En la imagen: la lista visible incluye HIERRO, Nitrógeno Total, ORP, pH, SÓLIDOS DISUELTOS TOTALES, Sólidos Sedimentables, Sólidos Suspendidos totales GRAVIMÉTRICO

### 4.2 Selector de Fuente (Fase)
- Celda: DASHBOARD!B275
- Opciones: GEM (ENTRADA) | GEM (SALIDA) | Fase 3
- Controla qué bloque de columnas de la bitácora se usa

### 4.3 Selector de Turno
- Celda: DASHBOARD!B96
- Controla la columna de fecha/turno dentro de cada bloque de fase

---

## 5. GRÁFICOS — Especificaciones visuales

### 5.1 Gráfico FRECUENCIA (Barras verticales)
- **Tipo:** Columnas/Barras verticales
- **Eje X:** Etiquetas de rango — formato `(min - max)` ej: `(6.77 - 6.94)`
- **Eje Y:** Frecuencia absoluta (número de observaciones)
- **Colores de barras:** Multicolor — una por rango (en el Excel: naranja, verde, morado, azul, amarillo/verde)
- **Datos:** rangos[i].frecuencia
- **Título:** "FRECUENCIA"

### 5.2 Gráfico DISTRIBUCIÓN (Torta/Pie)
- **Tipo:** Pie chart
- **Datos:** rangos[i].pctFrecuencia (porcentaje de cada rango)
- **Etiquetas:** Porcentaje de cada segmento + etiqueta de rango en leyenda
- **Colores:** Mismo esquema multicolor que el histograma
- **Título:** "DISTRIBUCIÓN"
- **Leyenda:** Muestra etiqueta del rango ej: `(6.77-7.11)`, `(7.11-7.28)`, etc.

### 5.3 Gráfico DISTRIBUCIÓN PERCENTIL (Barras horizontales)
- **Tipo:** Barras horizontales
- **Eje Y (categorías):** Etiquetas de percentil — 10%, 20%... 100% (eje de categorías)
- **Eje X (valores):** Valor calculado del percentil
- **Orientación:** Las barras van de izquierda a derecha
- **Color:** Verde uniforme (todas las barras del mismo color)
- **Datos:** percentiles array (P10 a P100, 10 barras)
- **Etiquetas en barras:** Valor numérico al final de cada barra (ej: 7.62, 7.42, 7.28...)
- **Título:** "DISTRIBUCIÓN PERCENTIL"
- **Eje X:** Rango estrecho — desde valor cercano al mínimo hasta el máximo
  (en el ejemplo de la imagen: de ~6.4 a ~7.8)
- **El eje Y está invertido:** P100 arriba, P10 abajo (o la barra más larga arriba)

---

## 6. TABLAS — Especificaciones de layout

### Tabla 1: PARÁMETROS DE LA DISTRIBUCIÓN DE FRECUENCIAS
```
┌─────────────────────────┬──────────┐
│ MINIMO                  │ {valor}  │
│ MAXIMO                  │ {valor}  │
│ AMPLITUD                │ {valor}  │
│ # DATOS                 │ {n}      │
│ #RANGOS                 │ 5        │
│ TAMAÑO                  │ {valor}  │
└─────────────────────────┴──────────┘
```

### Tabla 2: Rangos (5 filas)
```
┌──────────┬────────┬────────┬───────────────────┬───────────┬────────────┐
│ # RANGO  │ MINIMO │ MAXIMO │ RANGO             │ FRECUENCIA│ % FRECUENCIA│
├──────────┼────────┼────────┼───────────────────┼───────────┼────────────┤
│ RANGO 1  │ 6.8    │ 6.94   │ (6.77 - 6.94)     │  4        │  8%        │
│ RANGO 2  │ 6.94   │ 7.11   │ (6.94 - 7.11)     │ 13        │ 22%        │
│ RANGO 3  │ 7.11   │ 7.28   │ (7.11 - 7.28)     │ 23        │ 38% (mayor)│
│ RANGO 4  │ 7.28   │ 7.45   │ (7.28 - 7.45)     │ 17        │ 28%        │
│ RANGO 5  │ 7.45   │ 7.63   │ (7.45 - 7.63)     │  3        │  5%        │
├──────────┴────────┴────────┴───────────────────┼───────────┼────────────┤
│ TOTAL                                           │ 60        │ 100%       │
└─────────────────────────────────────────────────┴───────────┴────────────┘
```
*(Valores de ejemplo de la imagen con pH seleccionado)*

### Tabla 3: PERCENTIL (11 filas: MIN + P10 a P100)
```
┌───────┬───────────┬──────────┬──────────┐
│ índice│ percentil │  valor   │ etiqueta │
├───────┼───────────┼──────────┼──────────┤
│  0    │  0        │  6.77    │ MIN      │
│  1    │  0.1      │  6.81    │ P10      │
│  2    │  0.2      │  6.43    │ P20      │  ← leer de imagen
│  3    │  0.3      │  7.01    │ P30      │
│  4    │  0.4      │  7.07    │ P40      │
│  5    │  0.5      │  7.12    │ P50      │
│  6    │  0.6      │  7.17    │ P60      │
│  7    │  0.7      │  7.23    │ P70      │
│  8    │  0.8      │  7.28    │ P80      │
│  9    │  0.9      │  7.42    │ P90      │
│ 10    │  0.999    │  7.62    │ P100     │
└───────┴───────────┴──────────┴──────────┘
```

---

## 7. ARQUITECTURA PARA LA APP HTML

### Estructura de datos recomendada en JS:

```javascript
// Estado de la aplicación
const state = {
  parametroSeleccionado: "pH (Unidades de pH)",
  faseSeleccionada: 2,          // 1=Entrada, 2=Salida, 3=Osmosis
  turnoSeleccionado: null,      // null = todos los turnos

  // Catálogo de parámetros
  catalogoParametros: [
    { nombre: "Temperatura (°C)",                       fase: 2 },
    { nombre: "pH (Unidades de pH)",                    fase: 2 },
    { nombre: "DQO (mg/L)",                             fase: 2 },
    { nombre: "SÓLIDOS DISUELTOS TOTALES TDS (mg/L)",   fase: 2 },
    { nombre: "Sólidos suspendidos Totales (mg/L)",     fase: 2 },
    { nombre: "Sólidos Sedimentables (mg/L)",           fase: 2 },
    { nombre: "HIERRO (ml/L)",                          fase: 2 },
    { nombre: "SST GRAVIMÉTRICO (mg/L)",                fase: 2 },
    { nombre: "Cloruros (mg/L)",                        fase: 2 },
    { nombre: "FÓSFORO TOTAL (mg/L)",                   fase: 2 },
    { nombre: "Nitrógeno Total (mg/L)",                 fase: 2 },
    { nombre: "Sulfatos (mg/L)",                        fase: 2 },
    { nombre: "Alcalinidad (mg CaCO3/L)",               fase: 2 },
    { nombre: "Dureza Cálcica (mg CaCO3/L)",            fase: 2 },
    { nombre: "Dureza Total (mg CaCO3/L)",              fase: 2 },
    { nombre: "SILICE (mg/L)",                          fase: 2 },
    { nombre: "ORP (-MV)",                              fase: 2 },
    { nombre: "CLORO RES (mg/L)",                       fase: 1 },
    { nombre: "Conductividad (Us/cm)",                  fase: 1 },
    { nombre: "Color (UPTCO)",                          fase: 1 },
    { nombre: "Turbidez (NTU)",                         fase: 1 },
  ]
};

// Función principal de cálculo
function calcularDistribucion(datos) {
  const valores = datos.filter(v => v !== null && v > 0);
  if (valores.length === 0) return null;

  const minimo   = Math.min(...valores);
  const maximo   = Math.max(...valores);
  const amplitud = maximo - minimo;
  const nDatos   = valores.length;
  const nRangos  = 5;
  const tamano   = amplitud / nRangos;

  const rangos = Array.from({ length: nRangos }, (_, i) => {
    const rMin = minimo + i * tamano;
    const rMax = rMin + tamano;
    const freq = valores.filter(v => v >= rMin && v <= rMax).length;
    return {
      label: `(${rMin.toFixed(2)} - ${rMax.toFixed(2)})`,
      min: rMin, max: rMax,
      frecuencia: freq,
      pct: freq / nDatos
    };
  });

  const pctValues = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.999];
  const pctLabels = ["MIN","P10","P20","P30","P40","P50","P60","P70","P80","P90","P100"];
  const percentiles = pctValues.map((p, i) => ({
    label: pctLabels[i],
    valor: percentileInc(valores, p)
  }));

  return { minimo, maximo, amplitud, nDatos, nRangos, tamano, rangos, percentiles };
}
```

---

## 8. NOTAS IMPORTANTES PARA IMPLEMENTACIÓN

1. **Filtro de ceros**: Solo se incluyen valores estrictamente mayores a 0 en todos los cálculos (MINIFS con `>0`).

2. **Rango de datos**: La fuente en Excel es DI7:DI120 — máximo 114 observaciones por parámetro.

3. **Percentil P100**: El Excel usa `0.999` como argumento, no `1.0`. Esto evita desbordamiento en PERCENTILE(). En JS usar `percentileInc(datos, 0.999)`.

4. **Etiquetas de rango**: Formato exacto `(min - max)` con 2 decimales y espaces alrededor del guion.

5. **Gráfico de torta**: Los colores en el Excel son aproximadamente:
   - Rango 1: Naranja
   - Rango 2: Verde oliva
   - Rango 3: Morado
   - Rango 4: Amarillo/verde
   - Rango 5: Azul claro

6. **Gráfico de percentil**: Barras horizontales verdes, el eje X empieza desde un valor cercano al mínimo (no desde 0). El rango del eje X se ajusta automáticamente a los datos.

7. **N_RANGOS = 5**: Está hardcoded en el Excel (celda fija = 5). No es dinámico.

8. **La fila 302 del DASHBOARD** es el encabezado de la tabla estadística.
   **La fila 313** es la fila de totales (SUM de frecuencias).

9. **Selector de parámetro visible en la imagen**: HIERRO, Nitrógeno Total, ORP(-MV), pH (Unidades de pH), SÓLIDOS DISUELTOS TOTALES, Sólidos Sedimentables, Sólidos Suspendidos totales GRAVIMÉTRICO — sugiere que el listado está filtrado por fase activa.
