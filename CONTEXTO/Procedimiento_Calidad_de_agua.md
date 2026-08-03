# Procedimiento: Análisis de comportamiento por parámetro en el tren de tratamiento PTAR 2

## Objetivo
Generar un informe interactivo que analice cada parámetro de calidad de agua a lo largo de todo el tren de tratamiento, incluyendo el sistema biológico, identificación de picos, remociones del sistema GEM y correlación con la dosificación química. El informe debe permitir navegar por parámetro y por vista de análisis.

---

## Parámetros a analizar

| Parámetro | Unidad | Límite vertimiento (Res. 0631/2015 Art. 13) | Químico relacionado |
|---|---|---|---|
| Color | UPTCO | Sin límite numérico | Coagulante + Decolorante |
| SST | mg/L | ≤ 75 mg/L | Coagulante |
| DQO | mg/L | ≤ 600 mg/L | Coagulante + Decolorante |
| pH | Unidades de pH | 5,0 – 9,0 | Ácido (ajuste Pulmón) |
| Conductividad | µS/cm | Sin límite (alto en vertimiento es normal por rechazo RO) | Ninguno — solo la RO remueve sales |

---

## Fuentes de datos requeridas

### Archivo 1: TABLA DATOS 1 (calidad de agua)
Formato plano con estas columnas exactas:
```
DATO | FECHA | PARÁMETRO | TURNO | TANQUE PULMÓN | TANQUE HOMOGENEIZADOR (ENTRADA GEM) | GEM (SALIDA) | REACTOR ANÓXICO (INTERNO) | REACTOR MBBR (INTERNO) | REACTOR MBR 1 (INTERNO) | REACTOR MBR 2 (INTERNO) | REACTOR MBR 1 (PERMEADO) | REACTOR MBR 2 (PERMEADO) | VERTIMIENTO | ...
```

**Datos a extraer por parámetro:**

| Parámetro | Columnas relevantes |
|---|---|
| Color | Pulmón, Homo., GEM sal., MBR1 perm., Vertimiento |
| SST | Pulmón, Homo., GEM sal., MBR1 perm., MBR2 perm., Vertimiento |
| SST sistema biológico | Anóxico, MBBR, MBR1 interno, MBR2 interno, MBR1 perm., MBR2 perm. |
| DQO | Homo. (entrada GEM), GEM sal., Vertimiento |
| pH | Pulmón, Homo., GEM sal., MBR1 perm., Vertimiento |
| Conductividad | Pulmón, Homo., GEM sal., Vertimiento |

> **Importante:** Los valores nulos, celdas vacías o "#¡DIV/0!" deben tratarse como `null` y excluirse de los cálculos estadísticos.

### Archivo 2: Datos de consumo químico (costos por turno)
Columnas relevantes a extraer:
```
FECHA | # TURNO | CAUDAL TOTAL TRATADO GEM | PPM ACIDO | PPM COAGULANTE | PPM DECOLORANTE | PPM POL ANIONICO | PPM POL CATIONICO | $ m3
```
> Solo incluir registros donde `CAUDAL TOTAL TRATADO GEM > 0`.

---

## Estructura del informe

El informe tiene **dos niveles de navegación**:

### Nivel 1 — Selector de parámetro
Botones o tabs para seleccionar: `Color | SST | DQO | pH | Conductividad`

### Nivel 2 — Selector de vista
Para cada parámetro, 5 vistas:

```
Tren de tratamiento | Sistema biológico | Picos y eventos | Remociones GEM | Correlación con dosis
```

---

## Vista 1: Tren de tratamiento

**Qué muestra:** estadísticos completos de cada unidad de muestreo para el parámetro seleccionado.

**Por cada unidad con datos calcular:**
- N (número de registros válidos)
- Mínimo, Máximo
- P10, P25, P50 (mediana), P75, P90
- Promedio, Desviación estándar, CV%
- Clasificación de variabilidad: Baja (CV < 20%), Moderada (CV 20–40%), Alta (CV > 40%)

**Visualización por unidad:**
- Barra de distribución mostrando el rango mínimo–máximo con caja IQR (P25–P75) sombreada y línea vertical en la mediana
- Si la unidad es **Vertimiento** y el parámetro tiene límite normativo: mostrar línea roja vertical en el límite
- Grid de estadísticos debajo de la barra
- Interpretación textual específica por unidad y parámetro (ver sección de interpretaciones)

**Alerta normativa:** si el máximo del Vertimiento supera el límite, resaltar la card en rojo con badge "revisar límite".

**Banner de cumplimiento:** mostrar arriba el % de registros del Vertimiento que cumplen el límite normativo.

---

## Vista 2: Sistema biológico

**Solo aplica para SST.** Para otros parámetros mostrar mensaje: *"Los datos de sistema biológico interno están disponibles principalmente para SST."*

**Qué muestra:** comportamiento de SST dentro de los reactores biológicos.

**Unidades a mostrar:**
1. Reactor Anóxico (INTERNO)
2. Reactor MBBR (INTERNO)
3. Reactor MBR 1 (INTERNO)
4. Reactor MBR 2 (INTERNO)
5. Reactor MBR 1 (PERMEADO)
6. Reactor MBR 2 (PERMEADO)

**Interpretaciones fijas por unidad:**

| Unidad | Interpretación |
|---|---|
| Anóxico | SST elevado es biomasa activa. Rango típico 1.000–4.000 mg/L. No se esperan remociones aquí sino transformaciones biológicas. |
| MBBR | Biomasa en soportes. Pocos datos disponibles habitualmente. |
| MBR1/MBR2 interno | Licor mezcla con alta concentración (> 9.000 mg/L es normal en sistemas MBR de alta carga). El criterio de control no es la concentración interna sino la calidad del permeado. |
| MBR1/MBR2 permeado | Debe ser muy bajo (< 10 mg/L). Confirma integridad de membrana. Valores altos indican posible rotura o bypass. |

**Interpretación consolidada obligatoria al final:**
> Las concentraciones internas del MBR (9.000–15.000 mg/L SST) son completamente normales. El criterio de control es la calidad del permeado hacia la RO. Permeados consistentemente < 10 mg/L confirman integridad de membranas.

---

## Vista 3: Picos y eventos

**Qué muestra:** los turnos con valores más extremos del mes, con los datos de dosificación química del mismo turno.

**Algoritmo de selección:**
1. Calcular el máximo global de cada unidad (Pulmón, Homo., GEM sal., Vertimiento)
2. Filtrar registros donde algún valor supere el 55% del máximo global
3. Ordenar de mayor a menor por el valor máximo del registro
4. Mostrar los top 12–15 registros

**Tabla de picos:**
- Columnas: Fecha, Turno, + una columna por cada unidad del parámetro + Coag PPM + Decol PPM + $/m³
- Resaltar en naranja/bold el valor máximo absoluto por unidad
- Resaltar en bold los valores en el 80% superior
- Resaltar en rojo los valores del Vertimiento que superen el límite normativo

**Análisis narrativo por parámetro:** debajo de la tabla, cards de análisis para los eventos más críticos identificados (ver sección de eventos críticos predefinidos).

---

## Vista 4: Remociones GEM

**Qué muestra:** eficiencia de remoción del sistema GEM turno a turno.

**Cálculo:**
```
% Remoción = ((Entrada Homo. - Salida GEM) / Entrada Homo.) × 100
```
Solo calcular cuando ambos valores son no nulos y entrada > 0.

**Estadísticos resumen (cards arriba):**
- Remoción promedio
- Remoción mínima
- Remoción máxima
- CV de la remoción

**Tabla turno a turno:**
- Columnas: Fecha, Turno, Entrada (Homo.), Salida (GEM), % Remoción, Coag PPM, Decol PPM, $/m³
- Badge de color por % remoción:
  - Verde: ≥ 80%
  - Amarillo: 60–79%
  - Rojo: < 60%
- Color en PPM coagulante: rojo si > 800, amarillo si > 500
- Color en PPM decolorante: rojo si > 400, amarillo si > 200
- Color en $/m³: rojo si > 5.000, amarillo si > 3.500

---

## Vista 5: Correlación con dosis

**Qué muestra:** relaciones causa-efecto entre la calidad del influente, la dosificación química y la eficiencia de remoción.

### Para pH:
- **Correlación 1:** pH Pulmón vs PPM Ácido (coeficiente de Pearson)
- **Correlación 2:** pH Homo. vs PPM Ácido
- Tabla de turnos con pH Pulmón > 10,5 (alta alcalinidad → alta dosis ácido)
- Tabla de turnos con pH Pulmón < 8,5 (baja alcalinidad → poca dosis ácido)
- Tabla completa con pH Pulmón, pH Homo., pH GEM, pH Vertimiento, PPM Ácido, PPM Coag., $/m³
- Filas con pH Pulmón > 10,5 resaltadas en rojo claro; filas con pH < 8,5 en verde claro
- Interpretación: confirmar o negar si el operador responde al pH de entrada con la dosis de ácido

### Para Color y SST:
- **Correlación 1:** Entrada Homo. vs PPM Químico principal (Decolorante para Color, Coagulante para SST) — Pearson
- **Correlación 2:** Entrada Homo. vs % Remoción GEM — Pearson
- **Sobredosificación:** turnos con PPM > 600 pero remoción < 70% (alta dosis, bajo resultado)
- **Operación óptima:** turnos con remoción > 85% y PPM < 500 (alta remoción, dosis moderada)
- Tabla completa: Fecha, Turno, Entrada, Salida GEM, % Rem., Coag PPM, Decol PPM, Ácido PPM, $/m³, Etiqueta de eficiencia
- Etiquetas de eficiencia química:
  - "Óptima": remoción ≥ 85% y costo ≤ $3.000/m³
  - "Buena": remoción ≥ 75% y costo ≤ $4.500/m³
  - "Aceptable": remoción ≥ 65%
  - "Regular": resto
  - "Ineficiente": remoción < 55% y costo > $5.000/m³

### Para DQO:
- Tabla con los pares disponibles: DQO entrada, DQO GEM sal., % Remoción GEM, DQO Vertimiento, Coag PPM, Decol PPM, $/m³
- Resaltar en rojo si DQO GEM sal. > 600 o si DQO Vertimiento > 600

### Para Conductividad:
- No hay correlación con dosis química
- Mostrar texto explicativo: *"Ningún químico del proceso GEM actúa sobre la conductividad. La única etapa diseñada para remover sales es la RO. El rechazo de la RO se descarga al vertimiento, explicando la conductividad alta en ese punto. Esto es operación normal y no es incumplimiento normativo."*

---

## Cálculo del coeficiente de Pearson

```javascript
function pearson(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = xs.reduce((a,b)=>a+b,0)/n;
  const my = ys.reduce((a,b)=>a+b,0)/n;
  const num = xs.reduce((a,x,i)=>a+(x-mx)*(ys[i]-my),0);
  const dx = Math.sqrt(xs.reduce((a,x)=>a+(x-mx)**2,0));
  const dy = Math.sqrt(ys.reduce((a,y)=>a+(y-my)**2,0));
  if(!dx||!dy) return null;
  return num/(dx*dy);
}
```

**Interpretación del resultado:**
- |r| > 0,7 → Correlación fuerte
- |r| 0,4–0,7 → Correlación moderada
- |r| < 0,4 → Correlación débil
- r > 0 → positiva (ambas suben juntas)
- r < 0 → negativa (una sube, la otra baja)

---

## Interpretaciones textuales por parámetro y unidad

### pH
- **Pulmón:** "pH altamente variable (CV X%). Rango X–X u.pH, reflejando la carga alcalina variable del influente textil. Requiere dosificación de ácido reactiva."
- **Homo.:** "El homogeneizador amortigua el pH antes de entrar al GEM. Promedio X u.pH."
- **GEM sal.:** "Salida estable. El sistema de coagulación-floculación también contribuye al ajuste de pH."
- **MBR1 perm.:** "El sistema biológico mantiene pH estable en este punto."
- **Vertimiento:** "Punto de descarga. X valores fuera del rango normativo 5–9."

### Color
- **Pulmón:** "Influente con color muy variable (CV X%). Picos corresponden a lotes de tintorería intensiva."
- **Homo.:** "Carga de color entrante al GEM alta y variable."
- **GEM sal.:** "Remoción significativa pero variable según dosificación e influente."
- **MBR1 perm.:** "Valores altos (> 2.000 UPTCO) indican posible bypass o falla puntual de membrana."
- **Vertimiento:** "Sin límite normativo numérico. Monitorear tendencia."

### SST
- **Pulmón:** "SST entrada variable. Refleja variabilidad en la carga del proceso textil."
- **Homo.:** "Entrada al GEM. Picos > 900 mg/L requieren dosificaciones de coagulante > 800 PPM."
- **GEM sal.:** "Salida GEM. Todos los valores deben estar dentro del límite de 75 mg/L."
- **MBR perm.:** "Valores muy bajos (< 10 mg/L), consistentes con eficiencia de filtración de membranas."
- **Vertimiento:** "Límite normativo: 75 mg/L. X incumplimientos de X registros."

### DQO
- Solo medición periódica (no todos los turnos). Indicar n de mediciones disponibles.
- Remoción GEM típica entre 50–66%. Todos los vertimientos deben ser < 600 mg/L.

### Conductividad
- **Pulmón/Homo.:** "Alta carga iónica del influente textil."
- **GEM sal.:** "Sin remoción de sales, como se espera."
- **Vertimiento:** "Alta por rechazo RO. No es incumplimiento normativo."

---

## Notas técnicas importantes

### Sobre el sistema biológico
- Las concentraciones internas de SST en MBR (9.000–15.000 mg/L) son **completamente normales**
- El criterio de control es la calidad del **permeado** que sale hacia la RO, no la concentración interna
- El sistema biológico **no remueve conductividad ni TDS** — eso solo lo hace la RO

### Sobre la conductividad en vertimiento
- La conductividad alta en el vertimiento es **esperada y normal**
- El rechazo de la RO (que concentra todas las sales) va al vertimiento
- No existe límite normativo para conductividad en este tipo de vertimiento textil
- No debe generarse alerta ni señal de incumplimiento por este parámetro en vertimiento

### Sobre días sin operación
- Turno con `CAUDAL TOTAL TRATADO GEM = 0` → excluir de análisis de remoción y correlación con dosis
- Los valores de calidad pueden existir aunque no haya tratamiento (solo monitoreo)

### Sobre valores extremos
- PPM coagulante > 1.000 → verificar si es error de registro o evento real
- PPM acidificante > 800 → correlaciona con pH Pulmón > 10,5
- Conductividad MBR1 interno en 44.440 µS/cm (10/03) → error de digitación probable, excluir del análisis estadístico

---

## Estructura de datos a construir en el artefacto

```javascript
// Por cada parámetro, estructura de registros:
const DATA = {
  color: {
    label: "Color (UPTCO)",
    unidad: "UPTCO",
    limVert: null,  // null = sin límite
    unidades: ["Pulmón", "Homo.", "GEM sal.", "MBR1 perm.", "Vertimiento"],
    // registros: [fecha_label, turno, val_pulmon, val_homo, val_gem, val_mbr1p, val_vert]
    registros: [ ... ],
    // costos: { "DD/MM-turno": { ppm_acid, ppm_coag, ppm_decol, costo_m3 } }
    costos: { ... }
  },
  sst: {
    limVert: 75,
    unidades: ["Pulmón", "Homo.", "GEM sal.", "MBR1 perm.", "MBR2 perm.", "Vertimiento"],
    // SST biológico separado:
    // registros_bio: [fecha, turno, anox, mbbr, mbr1i, mbr2i, mbr1p, mbr2p]
  },
  dqo: {
    limVert: 600,
    unidades: ["Homo.", "GEM sal.", "Vertimiento"],
    // Solo turnos con medición disponible
  },
  ph: {
    limVert: { min: 5.0, max: 9.0 },
    unidades: ["Pulmón", "Homo.", "GEM sal.", "MBR1 perm.", "Vertimiento"],
  },
  conductividad: {
    limVert: null,
    nota: "Alta en vertimiento es esperada por rechazo RO. No es incumplimiento.",
    unidades: ["Pulmón", "Homo.", "GEM sal.", "Vertimiento"],
    costos: {}  // Sin correlación química
  }
};

// Datos del sistema biológico SST (separados):
const SST_BIO = {
  registros: [
    // [fecha, turno, anox, mbbr, mbr1_interno, mbr2_interno, mbr1_perm, mbr2_perm]
  ]
};
```

---

## Cómo construir el artefacto paso a paso

### Paso 1 — Extraer datos de calidad
De la TABLA DATOS 1, filtrar por nombre de parámetro y extraer los valores de cada columna de unidad de tratamiento. Construir arrays por parámetro con formato `[fecha_label, turno, val1, val2, ...]`.

Formato de fecha_label: `"DD/MM"` (ej. `"02/03"`)

### Paso 2 — Extraer datos de costos
De la tabla de consumo químico, para cada turno con caudal > 0 extraer: PPM ácido, PPM coagulante, PPM decolorante, $/m³. Construir objeto con clave `"DD/MM-turno"`.

### Paso 3 — Calcular estadísticos
Función `stats(arr)` que recibe un array con posibles nulls y retorna: n, mean, min, max, std, cv, p10, p25, p50, p75, p90.

### Paso 4 — Construir el artefacto React
El componente tiene:
- Estado `tab` (parámetro seleccionado): `"color" | "sst" | "dqo" | "ph" | "conductividad"`
- Estado `vista`: `"tren" | "bio" | "picos" | "remociones" | "correlacion"`
- Al cambiar `tab`, resetear `vista` a `"tren"`

### Paso 5 — Renderizar cada vista
Cada vista se renderiza condicionalmente según el estado actual. Ver descripciones detalladas en secciones anteriores.

---

## Checklist de validación del informe

Antes de dar por terminado el artefacto, verificar:

- [ ] Los 5 parámetros tienen tabs funcionales
- [ ] Las 5 vistas tienen navegación funcional
- [ ] La vista "Tren de tratamiento" muestra barra de distribución con IQR para cada unidad
- [ ] La línea roja de límite normativo aparece en Vertimiento cuando aplica
- [ ] El banner de cumplimiento normativo aparece cuando hay límite
- [ ] La vista "Sistema biológico" solo muestra contenido útil para SST
- [ ] La vista "Picos y eventos" muestra la tabla con los turnos extremos + columnas de dosis
- [ ] La vista "Remociones GEM" muestra badges de color por % remoción
- [ ] La vista "Correlación con dosis" para pH incluye el coeficiente de Pearson calculado
- [ ] La vista "Correlación con dosis" para conductividad muestra el texto explicativo (sin tabla)
- [ ] Los valores nulos no generan errores en los cálculos
- [ ] Los turnos con caudal = 0 están excluidos de correlaciones
- [ ] La conductividad en vertimiento NO genera alerta de incumplimiento
