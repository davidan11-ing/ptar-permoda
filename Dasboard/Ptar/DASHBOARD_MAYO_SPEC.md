# ESPECIFICACIONES DASHBOARD — HOJA MAYO
## Archivo: BALANCE HIDRICO BOGOTA 2026.xlsx

> Guía de replicación exacta. 11 secciones, columnas A–N, filas 1–255.

---

## PALETA DE COLORES (Theme Office)

| Uso | Hex | Tema Excel |
|-----|-----|------------|
| Headers: Balance Hídrico, Indicadores, Lodos | `#DAE3F3` | accent1 tint 0.80 |
| Título principal (fila 1) | `#E2EFDA` | accent6 tint 0.80 |
| Headers: Tratabilidad I/II, Operación RO | `#A9CE91` | accent6 tint 0.40 |
| Header: KPIS | `#DEEBF7` | accent5 tint 0.80 |
| Headers: FQ GEM, Osmosis Inversa | `#FFD966` | accent4 tint 0.40 |
| Serie barras acueducto | `#4472C4` | accent1 |
| Serie línea indicador naranja | `#ED7D31` | accent2 |
| Serie permeado/proyección verde | `#70AD47` | accent6 |
| Serie barras lavandería amarillo | `#FFC000` | accent4 |
| Serie barras FQ/RO azul claro | `#5B9BD5` | accent5 |
| Serie rechazo RO marrón | `#7B3F00` | manual |
| Serie agua caliente salmón | `#F4B183` | manual |
| Serie agua fría azul celeste | `#9DC3E6` | manual |
| Barras volumen (muy claro) | `#BDD7EE` | manual |

### Patrón de líneas (consistente en TODO el dashboard)
- **Indicador actual** → Línea negra sólida `#000000`, marcadores cuadrados negros
- **Año anterior (2021/2024)** → Línea azul punteada `#4472C4`, sin marcadores
- **Mínimo / límite** → Línea roja punteada `#FF0000`
- **Proyección / factor / meta** → Línea verde sólida `#70AD47`
- **Indicador costo ($)** → Línea naranja `#ED7D31` o roja `#C00000`, marcadores cuadrados grises

---

## SECCIÓN 1 — BALANCE HÍDRICO
**Filas:** 1–24 | **Header:** `#DAE3F3` bold 22pt

### Encabezados
- `A1:N1` → `"INFORME  - PTAR 2  - MAYO 2026"` | bg `#E2EFDA` | bold 22pt
- `A2:N3` → `"BALANCE HÍDRICO"` | bg `#DAE3F3` | bold 22pt

### Gráfica 1: BALANCE HÍDRICO GLOBAL
- **Tipo:** Combo — Barras agrupadas verticales + Línea
- **Ubicación:** Fila 3, columnas A–L (~filas 3–19)
- **Eje X:** Fechas diarias 01/05–31/05. Etiquetas rotadas 45°.
- **Eje Y izq.:** Volumen m3 (0–300 aprox)
- **Línea:** Negra sólida con marcadores cuadrados. Superpuesta a barras.
- **Tabla de datos:** Sí, debajo de la gráfica, 5 filas de series
- **Fondo:** Blanco. Sin borde de área de trazado.
- **Leyenda:** Parte inferior
- **Etiquetas:** Visibles en cada barra. Fuente ~8pt.

| Serie | Color | Hex |
|-------|-------|-----|
| VOLUMEN DIARIO CARRO-TANQUES (m3) | Azul oscuro | `#4472C4` |
| VOLUMEN ENVIADO PERMEADO RO (m3) | Azul claro | `#5B9BD5` |
| VOLUMEN CONSUMO ACUEDUCTO (m3) | Verde | `#70AD47` |
| VOLUMEN CONSUMO PTAP POTABLE (m3) | Naranja | `#ED7D31` |
| TOTAL CONSUMO AGUA LIMPIA PRODUCCIÓN (m3) | Azul marino | `#203864` |

### Gráfica 2: Distribución de Consumo (Torta)
- **Tipo:** Pie Chart
- **Ubicación:** Columnas M–N, fila 3. Sobre fondo azul oscuro.
- **Título:** `"Distribución de Consumo\nTotal: XX,XXX.XX m³"` — texto blanco, fondo `#1F3864`
- **Leyenda:** Interior derecha, texto blanco sobre fondo azul oscuro
- **Etiquetas:** Nombre + valor m3 + porcentaje

| Sector | % aprox | Color |
|--------|---------|-------|
| Acueducto H40 | ~47% | `#4472C4` |
| % Pluvial RO | ~41% | `#5B9BD5` |
| Cartantones H40 | ~11% | `#A5A5A5` |
| % Consumo PTAP | ~1% | `#FFC000` |

### Tablas de datos
- **CONSUMO DIARIO (m3):** cabecera bg `#DAE3F3` + fila datos. Cols: MINIMO | MAXIMO | PROMEDIO | DIAS DIRECTOS | CARTANTONES H40 | PTAP | ACUEDUCTO | RO
- **FUENTES:** cols: FUENTES | CONSUMO (m3) | %CONSUMO | PROYECCIÓN MES | % PROYECCIÓN. Filas: ACUEDUCTO H40 | % PLUVIAL RO | SUMINISTRO EXTERNO | TOTAL

---

## SECCIÓN 2 — INDICADOR TINTORERIA
**Filas:** 25–44 | **Header:** `#DAE3F3` bold 12pt

### Gráfica 1 (doble panel)
Dos gráficas lado a lado. Izquierda cols A–F, Derecha cols G–M.

#### Panel Izquierdo — vs VOLUMEN CONSUMO AGUA (m3)
- **Título:** `"TINTORERIA: INDICADOR DE CONSUMO Y KG (L/Kg) vs VOLUMEN CONSUMO DE AGUA (m3)"`
- **Tipo:** Combo — Barras agrupadas + 2 Líneas
- **Eje Y izq.:** m3 (0–800 aprox)
- **Eje Y der.:** L/Kg
- **Eje X:** Fechas diarias. Rotadas.

| Serie | Tipo | Color |
|-------|------|-------|
| AGUA TINTORERÍA (m3) | Barra | `#5B9BD5` azul claro |
| AGUA CALIENTE (m3) | Barra | `#A5A5A5` gris |
| CONSUMO TOTAL TINTORERÍA (m3) | Barra | `#4472C4` azul |
| TINTORERÍA INDICADOR | Línea negra sólida, marcadores cuad. | `#000000` |
| 2021 TINTORERÍA | Línea azul punteada, triángulos | `#4472C4` |
| Línea límite | Línea gris punteada horizontal | `#A5A5A5` |

#### Panel Derecho — vs KG PRODUCIDOS
- **Título:** `"TINTORERIA: INDICADOR DE CONSUMO Y KG (L/Kg) vs KG PRODUCIDOS"`
- **Tipo:** Combo — Barras agrupadas + 2 Líneas
- **Eje Y izq.:** KG (0–20.000 aprox)
- **Eje Y der.:** L/Kg con línea roja de referencia

| Serie | Tipo | Color |
|-------|------|-------|
| Kg Tela | Barra | `#ED7D31` naranja |
| MKa Kg producidos 1 Día | Barra | `#C00000` rojo oscuro |
| TINTORERÍA INDICADOR | Línea negra sólida, marcadores | `#000000` |
| 2021 TINTORERÍA | Línea roja punteada | `#FF0000` |

### Tabla Benchmark Mundial Tintorería (imagen PNG)
3 columnas sin bordes visibles, fuente sans-serif gris oscuro:

| NIVEL | Benchmark mundial | L/Kg |
|-------|-------------------|------|
| Muy Ineficiente | Práctica obsoleta | >150 |
| Promedio Industria Mundial | Convencional | 100-150 |
| Buen desempeño | Planta Moderna | 80-100 |
| Proceso Optimizado | Best Practice | 50-80 |
| *(barra verde separadora)* | | |
| Excelencia Mundial | Top Performers | <50 |

### Gráfica 2: Distribución de Consumo por Temperatura (Torta)
- **Tipo:** Pie Chart simple
- **Título:** `"Distribución de Consumo Hídrico por Temperatura"` — negro, fondo blanco
- **Etiquetas:** Externas con línea guía. Formato: `"valor; porcentaje%"` negrita
- **Etiqueta total:** `"total; 100%"` sobre fondo gris claro, centrada

| Sector | % aprox | Color |
|--------|---------|-------|
| AGUA CALIENTE (m3) | ~10–15% | `#F4B183` naranja salmón |
| AGUA FRIA (m3) | ~85–90% | `#9DC3E6` azul celeste |

---

## SECCIÓN 3 — INDICADOR LAVANDERIA
**Filas:** 45–64 | **Header:** `#DAE3F3` bold 12pt

### Gráfica (doble panel) — misma estructura que Tintorería
#### Panel Izquierdo — vs VOLUMEN CONSUMO AGUA (m3)
- **Título:** `"LAVANDERÍA: INDICADOR DE CONSUMO Y UNIDADES (L/Und) vs VOLUMEN CONSUMO DE AGUA (m3)"`
- **Tipo:** Combo — Barras + 3 Líneas
- **Eje Y izq.:** m3 (0–1.000). **Eje Y der.:** L/Und (0–1.000)

| Serie | Tipo | Color |
|-------|------|-------|
| CONSUMO TOTAL LAVANDERÍA (m3) | Barra | `#FFC000` dorado |
| LAVANDERÍA INDICADOR | Línea negra sólida, marcadores cuad. | `#000000` |
| MÍNIMO RANGO DE INDICADOR | Línea roja punteada `- - -` | `#FF0000` |
| 2021 LAVANDERÍA | Línea azul punteada `- - -` | `#4472C4` |

#### Panel Derecho — vs UNIDADES EFECTIVAS
- **Título:** `"LAVANDERÍA: INDICADOR DE CONSUMO Y UNIDADES (L/Und) vs UNIDADES EFECTIVAS"`
- Misma estructura de series. Eje Y izq.: Unidades lavadas.

---

## SECCIÓN 4 — INDICADOR ROTATIVA
**Filas:** 65–80 | **Header:** `#DAE3F3` bold 12pt

### Gráfica (doble panel)
#### Panel Izquierdo — vs VOLUMEN CONSUMO AGUA (m3)
- **Título:** `"ROTATIVA: INDICADOR DE CONSUMO Y METROS (L/m) Vs VOLUMEN CONSUMO DE AGUA (m3)"`
- **Tipo:** Combo — Barras + 3 Líneas
- **Eje Y izq.:** m3 (0–600). **Eje Y der.:** L/m

| Serie | Tipo | Color |
|-------|------|-------|
| CONSUMO TOTAL ROTATIVA (m3) | Barra | `#A5A5A5` gris medio |
| ROTATIVA INDICADOR | Línea negra sólida, marcadores cuad. | `#000000` |
| MÍNIMO RANGO DE INDICADOR ROTATIVA | Línea roja punteada `- - -` | `#FF0000` |
| 2024 ROTATIVA | Línea azul punteada `- - -` | `#4472C4` |

#### Panel Derecho — vs m DE TELA
- **Título:** `"ROTATIVA: INDICADOR DE CONSUMO Y METROS (L/m) Vs m DE TELA"`
- **Eje Y izq.:** m de Tela (0–6.500). **Eje Y der.:** L/m
- Serie barra: `m de Tela` — Gris `#A5A5A5`. Mismas 3 líneas.

---

## SECCIÓN 5 — BALANCE DE TRATABILIDAD I
**Filas:** 85–111 | **Header:** `#A9CE91` bold 12pt

### Gráfica Izquierda: BALANCE DE TRATABILIDAD
- **Tipo:** Combo — Barras APILADAS + 2 Líneas
- **Eje Y izq.:** m3/día (0–1.400 aprox). **Eje X:** Fechas diarias rotadas 45°
- **Tabla de datos:** Sí, completa debajo. **Etiquetas:** Visibles en cada segmento ~8pt.

| Serie | Tipo | Color |
|-------|------|-------|
| AGUA SUMINISTRADA ACUEDUCTO | Barra apilada | `#4472C4` azul |
| TOTAL CONSUMO ROTATIVA | Barra apilada | `#5B9BD5` azul claro |
| TOTAL CONSUMO TINTORERÍA | Barra apilada | `#FFC000` amarillo |
| TOTAL CONSUMO LAVANDERÍA | Barra apilada | `#ED7D31` naranja |
| TOTAL CONSUMO AGUA LIMPIA PROD. | Barra apilada | `#A5A5A5` gris |
| TOTAL VOLUMEN A TRATAR | Barra apilada | `#70AD47` verde |
| TOTAL TRATADO OSMOSIS | Línea verde oscuro sólida, marcadores | `#375623` |
| TOTAL VOLUMEN A TRATAR | Línea naranja sólida, marcadores | `#ED7D31` |

### Gráfica Derecha: SEGUIMIENTO Y CONTROL DE VERTIMIENTO
- **Tipo:** Combo — Barras APILADAS + Líneas
- **Eje Y izq.:** m3 (0–2.000 aprox)
- Series barras apiladas: Azul claro / Azul medio / Gris / Verde / Amarillo / Naranja-Rojo
- Series líneas: línea meta punteada horizontal + línea total

---

## SECCIÓN 6 — BALANCE DE TRATABILIDAD II
**Filas:** 112–134 | **Header:** `#A9CE91` bold 12pt

### Gráfica 1: Tratabilidad Total (Pie of Bar)
- **Tipo:** PIE OF BAR — Excel: "Circular con barra de sectores"
- **Título:** `"Tratabilidad - Total: XXXXX m³"` — fondo `#1F3864` texto blanco negrita
- **Líneas de conexión:** Grises, conectando sector torta con barra de detalle

| Elemento | Valor aprox | Color |
|----------|------------|-------|
| Torta: VOLUMEN VERTIMIENTO GEM | ~44% | `#9DC3E6` azul claro |
| Torta: VOLUMEN VERTIMIENTO MBR'S | ~5% | `#FFE699` amarillo claro |
| Torta: sector desplegado → barra | ~51% | `#A9D18E` verde |
| Barra: VOLUMEN PERMEADO RO | ~37% total | `#A9D18E` verde claro |
| Barra: VOLUMEN RECHAZO RO | ~14% total | `#7B3F00` marrón |

- **Etiquetas:** `"valor; porcentaje%"` negrita, con líneas guía. Fondo blanco semi-transparente.

### Gráfica 2: BALANCE EN PLANTA
- **Tipo:** Barras agrupadas verticales (SIN líneas)
- **Título:** `"BALANCE EN PLANTA"`
- **Eje Y izq.:** m3 (0–1.800). **Eje X:** Días del mes 1–31 (numérico)
- **Tabla de datos:** Sí, 6 filas. **Leyenda:** Parte inferior.

| Serie | Color |
|-------|-------|
| TOTAL VOLUMEN A TRATAR | `#1F3864` azul marino |
| TOTAL CONSUMO AGUA LIMPIA PRODUCCIÓN | `#4472C4` azul |
| ENVIO A TH | `#5B9BD5` azul claro |
| TRATADO GEM (m3) | `#A9D18E` verde claro |
| PERMEADO MBRS (m3) | `#ED7D31` naranja |
| ENVIADO A RO (m3) | `#FFC000` amarillo |

### Tabla: FORMULACIÓN SEGUIMIENTO RO (imagen PNG)
Tabla con bordes, fuente serif (Times New Roman), notación matemática con subíndices:
1. `% de recuperación = Q_Permeado / Q_Alimentación × 100`
2. `Factor de concentración = 1 / (1 - recuperación)`
3. `% de rechazo de sales = 1 - (Conductividad_Permeado / Conductividad_Alimentación) × 100`
4. `Diferencial de presión = P_Alimentación - P_Concentrado`

---

## SECCIÓN 7 — OPERACIÓN RO - EFICIENCIAS
**Filas:** 135–155 | **Header:** `#A9CE91` bold 12pt

### Gráfica: BALANCE GLOBAL RO
- **Tipo:** Combo — 2 Barras APILADAS + 3 Líneas (2 en eje Y der.)
- **Título:** `"BALANCE GLOBAL RO"`
- **Eje Y izq.:** m3 (0–1.200). **Eje Y der.:** % Eficiencia (0–140%). **Eje X:** Días 1–31.
- **Tabla de datos:** Sí, 5 filas. **Etiquetas:** En barras y puntos de línea volumen.

| Serie | Tipo | Color | Eje |
|-------|------|-------|-----|
| VOLUMEN PERMEADO RO (m3) | Barra apilada | `#A9D18E` verde claro | Izq |
| VOLUMEN RECHAZO RO (m3) | Barra apilada | `#7B3F00` marrón | Izq |
| VOLUMEN INGRESO TOTAL RO (m3) | Línea naranja sólida, marcadores | `#ED7D31` | Izq |
| % EFICIENCIA GLOBAL | Línea dorada punteada | `#FFC000` | Der |
| % EFICIENCIA RO 2 | Línea verde punteada | `#70AD47` | Der |

---

## SECCIÓN 8 — KPIS
**Filas:** 160–173 | **Header:** `#DEEBF7` bold **28pt** (el más grande del dashboard)
- Contiene imagen EMF con tarjetas/tabla de indicadores de desempeño clave
- Ocupa aprox. filas 161–172, columnas A–N

---

## SECCIÓN 9 — INDICADOR TRATAMIENTO FQ GEM
**Filas:** 174–191 | **Header:** `#FFD966` bold 12pt

### Gráfica: $ m3 TRATAMIENTO GEM
- **Tipo:** Combo — Barras simples + 2 Líneas
- **Título:** `"$ m3 TRATAMIENTO GEM"`
- **Eje Y izq.:** m3 (0–14.000). **Eje Y der.:** $m3 (0–1.800). **Eje X:** Días 1–31.
- **Tabla de datos:** Sí, 3 filas. **Etiquetas:** Sobre barras + puntos de línea indicador.

| Serie | Tipo | Color | Eje |
|-------|------|-------|-----|
| CAUDAL TOTAL TRATADO GEM | Barra | `#BDD7EE` azul muy claro | Izq |
| INDICADOR $m3 | Línea naranja/roja, marcadores cuad. | `#ED7D31` | Der |
| 2025 $m3 GEM (meta) | Línea verde punteada horizontal | `#70AD47` | Der |

---

## SECCIÓN 10 — INDICADOR TRATAMIENTO OSMOSIS INVERSA
**Filas:** 192–210 | **Header:** `#FFD966` bold 12pt

### Gráfica: INDICADOR RO
- **Tipo:** Combo — Barras simples + 2 Líneas
- **Título:** `"INDICADOR RO"`
- **Eje Y izq.:** $m3 ($0–$1.200). **Eje Y der.:** m3 (0–1.200). **Eje X:** Días 1–31.
- **Tabla de datos:** Sí, 3 filas. **Etiquetas:** En puntos de línea ~10pt.

| Serie | Tipo | Color | Eje |
|-------|------|-------|-----|
| VOLUMEN ENVIADO A RO (m3) | Barra | `#BDD7EE` azul muy claro | Der |
| INDICADOR $m3 RO | Línea naranja, marcadores cuad. | `#ED7D31` | Izq |
| LIMITE INDICADOR M3 (meta) | Línea verde punteada horizontal | `#70AD47` | Izq |

---

## SECCIÓN 11 — BALANCE DE LODOS
**Filas:** 211–245 | **Header:** `#DAE3F3` bold 12pt

### Gráfica Izquierda: Indicador $/m3
- **Tipo:** Combo — Barras simples + 2 Líneas
- **Título:** `"Indicador $/m3"`
- **Eje Y izq.:** m3 (volumen tratado). **Eje Y der.:** $/m3 ($150–$3.650).
- **Eje X:** Solo días con operación de lodos (no todos los días del mes).

| Serie | Tipo | Color |
|-------|------|-------|
| VOLUMEN TRATADO (m3) | Barra | `#BDD7EE` azul celeste |
| $/M3 | Línea roja, marcadores cuad. grises. Etiquetas `"$XXX"` negrita | `#C00000` |
| PROYECCIÓN $/m3 2026 (meta) | Línea verde sólida horizontal | `#70AD47` |

### Gráfica Derecha: Indicador $/Kg
- **Tipo:** Combo — Barras simples + 2 Líneas
- **Título:** `"Indicador $/Kg"`
- **Eje Y izq.:** Kg dia (500–6.500). **Eje Y der.:** $/kg ($150–$290).
- **Eje X:** Mismo esquema que $/m3.

| Serie | Tipo | Color |
|-------|------|-------|
| KG GENERADOS | Barra | `#F4B183` salmón/naranja claro |
| $/KG | Línea roja, marcadores cuad. grises. Etiquetas `"$XXX,XX"` negrita | `#C00000` |
| FACTOR ($/KG) (meta) | Línea verde sólida horizontal | `#70AD47` |

---

## NOTAS GENERALES

### Estructura de celdas
- **Filas comentarios:** Fusionadas A:N, 3–4 filas de alto. Fondo blanco, texto ~9pt. Novedades operativas del mes.
- **Etiqueta "COMENTARIOS:"** en celda fusionada A:N. Fondo blanco, sin bordes.
- Las secciones se distinguen **solo por color de encabezado** — no hay bordes separadores.
- Columnas O–R: datos de soporte ocultos (fórmulas auxiliares).
- Zoom recomendado: **75%** para ver el dashboard completo.

### Tipos de imagen embebida
| Tipo | Descripción |
|------|-------------|
| **PNG** | Gráficas principales. Capturas de alta resolución de gráficas Excel. |
| **EMF** | Formato vectorial Windows. Gráficas secundarias y tablas adicionales de cada sección. Mismo diseño visual que PNGs. |

### Posicionamiento de imágenes
Las imágenes se anclan con `twoCellAnchor` (se ajustan al redimensionar filas/columnas) excepto 3 imágenes con `oneCellAnchor` (posición fija). Cada sección tiene una imagen principal PNG a la izquierda (cols A–K) y una o más imágenes EMF a la derecha (cols L–N) o debajo.
