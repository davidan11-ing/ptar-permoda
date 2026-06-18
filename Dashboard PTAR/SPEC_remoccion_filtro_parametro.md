# SPEC TÉCNICO: Filtro de Parámetro — Sección "REMOCIÓN SISTEMA GEM"
## Complemento al SPEC_remoccion_sistema_gem.md
## IMPORTANTE: Este filtro es EXCLUSIVO de esta sección — no afecta otras partes del dashboard

---

## 1. QUÉ ES Y QUÉ CONTROLA

El filtro de parámetro de esta sección es una **Tabla Dinámica (Pivot Table)** del Excel
con un Slicer conectado. Controla **únicamente**:

- El gráfico combinado "REMOCIÓN SISTEMA GEM"
- La tabla estadística de ENTRADA GEM
- La tabla estadística de SALIDA GEM
- La tabla estadística de % EFICIENCIA REMOCIÓN

**NO afecta** ninguna otra sección del dashboard (las secciones de distribución
multiparámetro, osmosis, KG removidos, etc. tienen sus propios controles independientes).

---

## 2. CELDA CLAVE: CV4

```
Celda: DASHBOARD!CV4  (columna CV, fila 4)
Tipo:  Campo de filtro de Pivot Table
Valor actual en el archivo: "pH (Unidades de pH)"
```

Esta celda actúa como el **selector activo** del parámetro. Cuando el usuario
hace clic en un parámetro del slicer, CV4 cambia automáticamente al nombre
del parámetro seleccionado, y toda la tabla dinámica se recalcula.

---

## 3. ESTRUCTURA DE LA TABLA DINÁMICA (Pivot Table)

La tabla dinámica ocupa las columnas **CU–CY** del DASHBOARD, filas **6–99**:

### Encabezados (fila 6):
| Índice col | Columna Excel | Encabezado | Descripción |
|-----------|--------------|------------|-------------|
| 98 | CU | FECHA | Fecha de medición |
| 99 | CV | TURNO | Número de turno (1, 2 o 3) |
| 100 | CW | TANQUE HOMOGENEIZADOR (ENTRADA GEM) | Valor del parámetro en ENTRADA |
| 101 | CX | GEM (SALIDA) | Valor del parámetro en SALIDA |
| 102 | CY | REMOCIÓN POR PARAMETRO | % de eficiencia de remoción |

### Patrón de datos (filas 7–99):
```
Fila 7:  fecha=2026-04-01, turno=1, CW=0,    CX=0,    CY=0
Fila 8:  fecha=null,       turno=2, CW=0,    CX=0,    CY=0
Fila 9:  fecha=null,       turno=3, CW=0,    CX=0,    CY=0
Fila 10: fecha=2026-04-02, turno=1, CW=7.78, CX=7.21, CY=0.0733
Fila 11: fecha=null,       turno=2, CW=0,    CX=0,    CY=0
Fila 12: fecha=null,       turno=3, CW=0,    CX=0,    CY=0
...
```

**Patrón**: Cada fecha ocupa 3 filas (una por turno). La fecha solo aparece
en la primera fila del grupo (turno 1). Los turnos sin medición tienen valor 0.

### Datos reales ejemplo (parámetro pH activo, 02/04/2026 T1):
```
CW (Entrada) = 7.78
CX (Salida)  = 7.21
CY (Remoción)= 0.07326...  →  mostrar como 7.33%
```

---

## 4. LISTA COMPLETA DE PARÁMETROS DEL FILTRO

Estos son los parámetros disponibles en el slicer de esta sección.
Solo se incluyen parámetros que tienen **tanto medición de Entrada como de Salida**
en la BITÁCORA (es decir, que tienen datos en Fase 1 Y Fase 2 de "Tabla datos 1").

| # | Nombre del parámetro (exacto como aparece en el slicer) |
|---|----------------------------------------------------------|
| 1 | Temperatura (°C) |
| 2 | pH (Unidades de pH) |
| 3 | Demanda química de oxígeno (DQO)(mg/L) |
| 4 | SOLIDOS DISUELTOS TOTALES (TDS)(mg/L) |
| 5 | Sólidos suspendidos Totales(mg/L) |
| 6 | Sólidos Sedimentables (mg/L) |
| 7 | HIERRO(ml/L) |
| 8 | Solidos Suspendidos totales GRAVIMETRICO(mg/L) |
| 9 | Cloruros (mg/L) |
| 10 | FOSFORO TOTAL(mg/L) |
| 11 | Nitrógeno Total(mg/L) |
| 12 | Sulfatos (mg/L) |

> Los nombres deben coincidir **exactamente** con los de la columna C de
> "Tabla datos 1" — incluyendo mayúsculas, acentos y unidades entre paréntesis.
> El slicer de la imagen muestra los que empiezan con "S" (SÓLIDOS..., Sulfatos)
> porque la lista estaba scrolleada hacia abajo.

---

## 5. CÓMO FUNCIONA EL FILTRO: FLUJO COMPLETO

```
Usuario selecciona parámetro en el Slicer
         ↓
    CV4 = "nombre_del_parametro"
         ↓
La Pivot Table filtra los datos de su fuente
por el parámetro seleccionado
         ↓
Columnas CW7:CW99 → valores Entrada GEM por turno/fecha
Columnas CX7:CX99 → valores Salida GEM por turno/fecha
Columnas CY7:CY99 → % Eficiencia remoción por turno/fecha
         ↓
Gráfico combinado se actualiza con CW/CX/CY
         ↓
Tablas estadísticas recalculan:
  MIN/MAX/PROMEDIO/VC%/DESV_EST de CW (Entrada)
  MIN/MAX/PROMEDIO/VC%/DESV_EST de CX (Salida)
  MIN/MAX/PROMEDIO/VC%/DESV_EST de CY (Remoción)
         ↓
Títulos de las tablas usan CV4:
  "ENTRADA GEM " + CV4
  "SALIDA GEM " + CV4
  "% EFICIENCIA REMOCIÓN DE " + CV4
```

---

## 6. FUENTE DE DATOS DE LA PIVOT TABLE

La Pivot Table se alimenta de "Tabla datos 1" usando las filas 317–348,
que contienen los pares Entrada/Salida por parámetro y por turno/fecha.

### Mapeo Parámetro → Filas de Tabla datos 1:

| Parámetro | Fila Fase 1 (Entrada) | Fila Fase 2 (Salida) | Bitácora fila |
|-----------|----------------------|---------------------|---------------|
| Temperatura (°C) | 317 | 338 | 123 |
| pH (Unidades de pH) | 318 | 339 | 124 |
| DQO (mg/L) | 319 | 340 | 125 |
| TDS (mg/L) | 320 | 341 | 126 |
| Sólidos suspendidos Totales | 321 | 342 | 127 |
| Sólidos Sedimentables | 322 | 343 | 128 |
| HIERRO | 323 | 344 | 129 |
| SST GRAVIMÉTRICO | 324 | 345 | 130 |
| Cloruros | 325 | 346 | 131 |
| FÓSFORO TOTAL | 326 | 347 | 132 |
| Nitrógeno Total | 327 | 348 | 133 |
| Sulfatos | 328 | — | 134 |

> Para calcular REMOCIÓN: `(entrada - salida) / entrada × 100`
> O si la bitácora ya tiene el valor calculado, tomarlo directamente.

---

## 7. CÁLCULO DE REMOCIÓN (CY)

El valor de CY es la **eficiencia de remoción** del parámetro:

```javascript
// Ejemplo real del Excel: CW=7.78 (entrada pH), CX=7.21 (salida pH)
// CY = 0.07326... = 7.33%

function calcularRemoccion(entrada, salida) {
  if (!entrada || entrada === 0) return 0;
  return (entrada - salida) / entrada;  // Como decimal (0.073...)
}

// Para mostrar en el gráfico: multiplicar × 100 y agregar "%"
// Para el eje secundario: el rango va de 0% a ~100%
// NOTA: si salida > entrada el valor es negativo (remoción negativa = concentración aumentó)
```

---

## 8. IMPLEMENTACIÓN EN LA APP HTML

```javascript
// Estado del filtro — INDEPENDIENTE del resto del dashboard
const remoccionFilter = {
  parametroActivo: "pH (Unidades de pH)",  // valor por defecto
};

// Lista de parámetros disponibles (hardcoded según el catálogo)
const PARAMETROS_REMOCCION = [
  "Temperatura (°C)",
  "pH (Unidades de pH)",
  "Demanda química de oxígeno (DQO)(mg/L)",
  "SOLIDOS DISUELTOS TOTALES (TDS)(mg/L)",
  "Sólidos suspendidos Totales(mg/L)",
  "Sólidos Sedimentables (mg/L)",
  "HIERRO(ml/L)",
  "Solidos Suspendidos totales GRAVIMETRICO(mg/L)",
  "Cloruros (mg/L)",
  "FOSFORO TOTAL(mg/L)",
  "Nitrógeno Total(mg/L)",
  "Sulfatos (mg/L)",
];

// Función que aplica el filtro y recalcula todo
function aplicarFiltroRemoccion(parametroSeleccionado) {
  remoccionFilter.parametroActivo = parametroSeleccionado;

  // 1. Obtener los datos del parámetro seleccionado (Entrada y Salida)
  const datosEntrada = obtenerDatosPorParametroYFase(parametroSeleccionado, 1); // Fase 1
  const datosSalida  = obtenerDatosPorParametroYFase(parametroSeleccionado, 2); // Fase 2

  // 2. Construir array por turno/fecha con CW, CX, CY
  const seriesDatos = combinarEntradaSalida(datosEntrada, datosSalida);
  // Resultado: [{fecha, turno, entrada, salida, remoccion}, ...]

  // 3. Calcular estadísticos para cada tabla
  const statsEntrada   = calcularEstadisticos(seriesDatos.map(d => d.entrada));
  const statsSalida    = calcularEstadisticos(seriesDatos.map(d => d.salida));
  const statsRemoccion = calcularEstadisticos(seriesDatos.map(d => d.remoccion));

  // 4. Actualizar gráfico
  actualizarGraficoRemoccion(seriesDatos);

  // 5. Actualizar tablas estadísticas con títulos dinámicos
  actualizarTablaStats("ENTRADA GEM " + parametroSeleccionado, statsEntrada);
  actualizarTablaStats("SALIDA GEM " + parametroSeleccionado, statsSalida);
  actualizarTablaStats("% EFICIENCIA REMOCIÓN DE " + parametroSeleccionado, statsRemoccion);
}

// Combinar entrada y salida por turno
function combinarEntradaSalida(entrada, salida) {
  // Ambos arrays tienen la misma estructura de fechas/turnos
  // Cruzar por fecha + turno
  return entrada.map((e, i) => ({
    fecha:     e.fecha,
    turno:     e.turno,
    etiqueta:  `${formatFecha(e.fecha)} - T${e.turno}`,  // Ej: "02 - T1"
    entrada:   e.valor,
    salida:    salida[i]?.valor ?? 0,
    remoccion: calcularRemoccion(e.valor, salida[i]?.valor ?? 0)
  }));
}

function calcularRemoccion(entrada, salida) {
  if (!entrada || entrada === 0) return 0;
  return ((entrada - salida) / entrada) * 100; // En porcentaje
}
```

---

## 9. UI DEL SLICER / FILTRO

```
┌─────────────────────────────┐
│ PARÁMETRO           [≡] [▼] │  ← Encabezado del slicer con botones de limpiar/ordenar
├─────────────────────────────┤
│ ▶ Temperatura (°C)          │
│ ▶ pH (Unidades de pH)       │  ← Activo actualmente (resaltado en azul)
│ ▶ DQO (mg/L)                │
│ ▶ TDS (mg/L)                │
│ ▶ Sólidos suspendidos...    │
│ ▶ Sólidos Sedimentables...  │
│ ▶ HIERRO(ml/L)              │
│ ▶ SST GRAVIMÉTRICO...       │
│ ▶ Cloruros (mg/L)           │
│ ▶ FOSFORO TOTAL(mg/L)       │
│ ▶ Nitrógeno Total(mg/L)     │
│ ▶ Sulfatos (mg/L)           │
└─────────────────────────────┘
```

- Solo se puede seleccionar **un parámetro a la vez** (selección única)
- El parámetro activo se resalta (azul en Excel)
- Al seleccionar uno, el gráfico y las 3 tablas se actualizan inmediatamente
- El slicer es **independiente** de los otros filtros del dashboard

---

## 10. NOTAS CRÍTICAS

1. **Alcance del filtro**: Este slicer/filtro aplica SOLO a:
   - Gráfico "REMOCIÓN SISTEMA GEM"
   - 3 tablas estadísticas (Entrada / Salida / % Eficiencia)
   **NO afecta**: sección de distribución multiparámetro, percentiles, osmosis, ni ninguna otra sección.

2. **Nombres exactos**: Los nombres de los parámetros en la lista deben
   coincidir exactamente con los de la columna C de "Tabla datos 1"
   (incluyendo espacios, mayúsculas, acentos y unidades).

3. **Ceros vs nulos**: La pivot table muestra `0` cuando no hay medición
   para ese turno/fecha. En la app HTML filtrar con `<>0` al calcular
   estadísticos (excluir ceros, no excluir negativos).

4. **Formato de etiqueta eje X**: `=TEXT(fecha,"dd") & " - T" & turno`
   → Resultado: `"02 - T1"`, `"02 - T2"`, `"03 - T1"`, etc.

5. **Parámetro por defecto**: Al cargar la sección, mostrar el primero
   de la lista o el último usado. En el Excel el valor guardado era
   `"pH (Unidades de pH)"`.
