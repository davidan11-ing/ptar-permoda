# DASHBOARD_QUIMICOS_SPEC.md
## Especificaciones Completas — GRaficas de quimicos (1).xlsx
> Generado para consumo por Claude Code. Referencia con `@DASHBOARD_QUIMICOS_SPEC.md`

---

## 1. ESTRUCTURA DEL ARCHIVO

| Hoja | Rol | Tipo de datos |
|------|-----|---------------|
| `DB QUIMICA` | Fuente de datos + 4 gráficas de seguimiento operativo | Pivot tables + raw data |
| `GRAFICAS` | Dashboard de consumo de químicos (4 gráficas principales) | Pivot-linked charts |

- **Formato de gráficas**: NATIVO Excel (chart1.xml–chart8.xml en `/xl/charts/`), NO imágenes embebidas.
- **Mecanismo de filtrado**: Slicer de campo `FECHA` — presente en hoja GRAFICAS (posición cols 21–22, filas 36–49, 0-indexed).
- **Pivot tables**: Múltiples tablas dinámicas en ambas hojas conectadas a las series de las gráficas.

---

## 2. PALETA DE COLORES GLOBAL

Todos los colores están derivados del tema de Office (Office Theme). La fórmula de transformación es:

```
canal_final = canal_base * (lumMod/100000) + 255 * (lumOff/100000)
```

| Token de tema | Color base | Nombre |
|--------------|-----------|--------|
| accent1 | `#4472C4` | Azul Office |
| accent2 | `#ED7D31` | Naranja Office |
| accent3 | `#A5A5A5` | Gris Office |
| accent4 | `#FFC000` | Amarillo Office |
| accent5 | `#5B9BD5` | Azul claro Office |
| accent6 | `#70AD47` | Verde Office |
| lt1/bg1 | `#FFFFFF` | Blanco (fondo) |
| dk1 | `#000000` | Negro |

### Colores derivados usados en gráficas

| Descripción | Cálculo | Hex resultante |
|------------|---------|---------------|
| Barras de volumen/caudal | accent1 lm:40000 lo:60000 | **`#B4C6E7`** (azul claro) |
| Línea indicador $m3 | accent2 lm:100000 | **`#ED7D31`** (naranja) |
| Línea meta / proyección año anterior | accent6 lm:100000 | **`#70AD47`** (verde) |
| Límite indicador (hardcoded) | srgb directo | **`#92D050`** (verde claro) |
| Serie Pol Catiónico (PPM/KG/L) | accent1 lm:100000 | **`#4472C4`** (azul) |
| Serie Pol Aniónico (PPM/KG/L) | accent2 lm:100000 | **`#ED7D31`** (naranja) |
| Serie Ácido — variante clara | accent4 lm:40000 lo:60000 | **`#FFE599`** (amarillo muy claro) |
| Serie Ácido — variante media | accent4 lm:60000 lo:40000 | **`#FFD966`** (amarillo) |
| Serie Coagulante | accent2 lm:60000 lo:40000 | **`#F4B183`** (salmón) |
| Serie Decolorante (gráf. 5) | bg1 lm:75000 | **`#BFBFBF`** (gris claro) |
| Serie Decolorante (gráf. 6/7/8) | accent3 lm:60000 lo:40000 | **`#C9C9C9`** (gris claro) |
| Serie $Pol Catiónico/m3 | accent1 lm:60000 lo:40000 | **`#8EAADB`** (azul medio) |
| Horas de operación | accent2 lm:100000 | **`#ED7D31`** (naranja) |

---

## 3. HOJA: DB QUIMICA

### Estructura de datos visible

- **Filas 1 (encabezados de pivot)**: Slicers y filtros de FECHA en columnas V, AD, AL
- **Fila 3**: Encabezados de columnas de datos (DIA, PPM por químico, INDICADOR $m3, CONSUMO KG/L)
- **Filas 4–30**: Datos diarios del mes

#### Tabla de precios (esquina derecha — AV1:AZ2)
| Campo | Fondo | Contenido |
|-------|-------|-----------|
| AV1 | theme:5 tint:0.80 (naranja claro) | `PRECIO (KG) ACIDO` |
| AW1 | theme:5 tint:0.80 | `PRECIO (KG) COAGULANTE` |
| AX1 | theme:5 tint:0.80 | `PRECIO (KG) DECOLORANTE` |
| AY1 | theme:5 tint:0.80 | `PRECIO (KG) ANIONICO` |
| AZ1 | theme:5 tint:0.80 | `PRECIO (KG) CATIONICO` |
| AV2 | theme:4 tint:0.80 (amarillo claro) | `830` |
| AW2 | theme:4 tint:0.80 | `2900` |
| AX2 | theme:4 tint:0.80 | `6295` |
| AY2 | theme:4 tint:0.80 | `19050` |
| AZ2 | theme:4 tint:0.80 | `22050` |

#### Tabla de estadísticas DECOLORANTE (P4:T8)
- **P4** (bold, sz:14): `COF 255 - DECOLORANTE` — título de sección
- Columnas Q–T encabezadas: PPM | L/DIA | KG/DIA | $
- P6: MINIMO | P7: MAXIMO | P8: PROMEDIO (con fórmulas MINIFS, MAX, AVERAGEIF)

#### Grupos de pivot data
- **V3:AB**: DIA + PPM por 5 químicos + INDICADOR $m3
- **AD3:AJ**: DIA + CONSUMO KG/L por 5 químicos + INDICADOR $m3
- **AL3:AR**: DIA + KG por 5 químicos + INDICADOR $m3
- **AT3:AZ**: DIA + INDICADOR $m3 total + indicadores individuales por químico ($ACIDO/M3, etc.)

---

## 4. GRÁFICAS — HOJA DB QUIMICA (chart1–chart4)

> Posiciones en coordenadas 0-indexed (col/fila). Drawing: `xl/drawings/drawing1.xml`

---

### CHART 1 — "$m3 TRATAMIENTO GEM"
**Archivo XML**: `xl/charts/chart1.xml`  
**Posición**: col 1–15, fila 2–16 (equivale aprox. B3:P17 en notación Excel)  
**Tipo**: Combo — Barras Agrupadas (clustered) + 2 Líneas

#### Series

| # | Nombre | Tipo | Color | Marker | Línea |
|---|--------|------|-------|--------|-------|
| 0 | `  CAUDAL TOTAL TRATADO GEM ` | Barra | `#B4C6E7` | — | — |
| 1 | `  INDICADOR $m3` | Línea | `#ED7D31` | círculo | sólida, 2.25pt |
| 2 | `  2025 $m3 GEM ` | Línea | `#70AD47` | ninguno | **discontinua** (sysDash), 2.25pt |

#### Ejes

| Eje | Posición | Formato | Mínimo | Máximo | Cruces |
|-----|----------|---------|--------|--------|--------|
| Eje Y Izquierdo (barras) | l | `#,##0` | auto | **14000** | autoZero |
| Eje Y Derecho (líneas) | r | `#,##0` | auto | **1800** | max (cruza en la cima) |

**Notas**: La línea de proyección año anterior (verde) usa trazo discontinuo `sysDash`. El eje derecho tiene `crosses=max`, colocándose en el borde derecho del área del gráfico.

---

### CHART 2 — "INDICADOR RO"
**Archivo XML**: `xl/charts/chart2.xml`  
**Posición**: col 1–15, fila 19–40  
**Tipo**: Combo — Barras Agrupadas (clustered) + 2 Líneas

#### Series

| # | Nombre | Tipo | Color | Marker | Línea |
|---|--------|------|-------|--------|-------|
| 0 | ` VOLUMEN ENVIADO A RO (m3)` | Barra | `#B4C6E7` | — | — |
| 1 | ` LIMITE INDICADOR M3` | Línea | `#92D050` (srgb hardcoded) | círculo | discontinua (sysDash), 2.25pt |
| 2 | ` INDICADOR $m3 RO` | Línea | `#ED7D31` | círculo | sólida, 2.25pt |

#### Ejes

| Eje | Posición | Formato | Mínimo | Máximo | Cruces |
|-----|----------|---------|--------|--------|--------|
| Eje Y Izquierdo | l | `_-"$"\ * #,##0_-;\-"$"\ * #,##0_-;_-"$"\ * "-"??_-;_-@_-` (formato moneda) | **0** | auto | autoZero |
| Eje Y Derecho | r | `General` | **0** | auto | max |

**Notas**: El límite indicador usa color hardcoded `#92D050` (no theme, srgb directo). El eje izquierdo usa formato de pesos colombianos/moneda.

---

### CHART 3 — "TIEMPO DE OPERACIÓN - SISTEMA GEM"
**Archivo XML**: `xl/charts/chart3.xml`  
**Posición**: col 15–23, fila 2–16  
**Tipo**: Combo — Barras Agrupadas (clustered) + 1 Línea

#### Series

| # | Nombre | Tipo | Color | Marker | Línea |
|---|--------|------|-------|--------|-------|
| 0 | `VOLUMEN TRATADO GEM  (m3)` | Barra | `#B4C6E7` | — | — |
| 1 | `HORAS DE OPERACIÓN ` | Línea | `#ED7D31` | círculo | sólida, 2.25pt |

#### Ejes

| Eje | Posición | Formato | Mínimo | Máximo | Cruces |
|-----|----------|---------|--------|--------|--------|
| Eje Y Izquierdo | l | `#,##0` | auto | auto | autoZero |
| Eje Y Derecho | r | `#,##0` | auto | auto | max |

**Leyenda**: Posición **bottom** (`b`)

---

### CHART 4 — "TIEMPO DE OPERACIÓN - SISTEMA OSMOSIS INVERSA"
**Archivo XML**: `xl/charts/chart4.xml`  
**Posición**: col 15–23, fila 19–40  
**Tipo**: Combo — Barras **Apiladas** (stacked) + 1 Línea

#### Series

| # | Nombre | Tipo | Color | Marker | Línea |
|---|--------|------|-------|--------|-------|
| 0 | `VOLUMEN ENVIADO A RO (m3) ` | Barra apilada | `#B4C6E7` | — | — |
| 1 | `TIEMPO DE OPERACIÓN` | Línea | `#ED7D31` | círculo | sólida, 2.25pt |

#### Ejes

| Eje | Posición | Formato | Mínimo | Máximo | Cruces |
|-----|----------|---------|--------|--------|--------|
| Eje Y Izquierdo | l | `0.00` | auto | auto | autoZero |
| Eje Y Derecho | r | `General` | auto | auto | max |

**Leyenda**: Posición **bottom** (`b`)

---

## 5. GRÁFICAS — HOJA GRAFICAS (chart5–chart8)

> Esta es la hoja de dashboard principal. Todas las gráficas están en la columna izquierda (cols 0–14), apiladas verticalmente. Drawing: `xl/drawings/drawing3.xml`

### Slicer de Fecha
- **Posición**: col 21–22, fila 36–49 (0-indexed)
- **Campo**: `FECHA`
- **Valor mostrado en header**: `(Varios elementos)` — indica selección múltiple

---

### CHART 5 — "COONSUMO PPM Vs $M3"
**Archivo XML**: `xl/charts/chart5.xml`  
**Posición**: col 0–14, fila 0–20 (parte superior del dashboard)  
**Tipo**: Combo — Barras **Apiladas** (stacked) + 1 Línea  
**Nota**: El título original tiene typo ("COONSUMO" con doble O) — replicar exacto.

#### Series

| # | Nombre (exacto) | Tipo | Color | Marker | Línea |
|---|-----------------|------|-------|--------|-------|
| 0 | `COF 494 - PPM POL CATIONICO ` | Barra | `#4472C4` | — | — |
| 1 | `COF 440 - PPM POL ANIONICO ` | Barra | `#ED7D31` | — | — |
| 2 | `COF 280 - PPM ACIDO ` | Barra | `#FFE599` | — | — |
| 3 | `COF 235 - PPM COAGULANTE  ` | Barra | `#F4B183` | — | — |
| 4 | `COF 255 - PPM DECOLORANTE ` | Barra | `#BFBFBF` | — | — |
| 5 | ` INDICADOR $m3 ` | Línea | `#70AD47` | ninguno | sólida, 2.25pt |

#### Ejes

| Eje | Posición | Formato | Mínimo | Máximo | Cruces |
|-----|----------|---------|--------|--------|--------|
| Eje Y Izquierdo (PPM) | l | `#,##0` | auto | **2000** | autoZero |
| Eje Y Derecho ($m3) | r | `"$"\ #,##0` | auto | auto | max |

**Leyenda**: Posición **bottom** (`b`)

---

### CHART 6 — "CONSUMO (L) Vs $M3"
**Archivo XML**: `xl/charts/chart6.xml`  
**Posición**: col 0–14, fila 20–37  
**Tipo**: Combo — Barras **Apiladas** (stacked) + 1 Línea

#### Series

| # | Nombre (exacto) | Tipo | Color | Marker | Línea |
|---|-----------------|------|-------|--------|-------|
| 0 | `CONSUMO POL CATIONICO (KG) ` | Barra | `#4472C4` | — | — |
| 1 | `CONSUMO POL ANIONICO (KG) ` | Barra | `#ED7D31` | — | — |
| 2 | `CONSUMO LITROS ACIDO (L) ` | Barra | `#FFD966` | — | — |
| 3 | `CONSUMO LITROS COAGULANTE (L) ` | Barra | `#F4B183` | — | — |
| 4 | `CONSUMO LITROS DECOLORANTE (L) ` | Barra | `#C9C9C9` | — | — |
| 5 | ` INDICADOR $m3 ` | Línea | `#70AD47` | círculo | sólida, 2.25pt |

#### Ejes

| Eje | Posición | Formato | Mínimo | Máximo | Cruces |
|-----|----------|---------|--------|--------|--------|
| Eje Y Izquierdo (L) | l | `#,##0` | **0** | **2500** | autoZero |
| Eje Y Derecho ($m3) | r | `"$"\ #,##0` | auto | auto | max |

**Leyenda**: Posición **bottom** (`b`)

---

### CHART 7 — "CONSUMO KG Vs $M3"
**Archivo XML**: `xl/charts/chart7.xml`  
**Posición**: col 0–14, fila 38–57  
**Tipo**: Combo — Barras **Apiladas** (stacked) + 1 Línea

#### Series

| # | Nombre (exacto) | Tipo | Color | Marker | Línea |
|---|-----------------|------|-------|--------|-------|
| 0 | `KG POL CATIONICO  ` | Barra | `#4472C4` | — | — |
| 1 | `KG POL ANIONICO  ` | Barra | `#ED7D31` | — | — |
| 2 | `KG ACIDO ` | Barra | `#FFD966` | — | — |
| 3 | `KG COAGULANTE ` | Barra | `#F4B183` | — | — |
| 4 | `KG DECOLORANTE  ` | Barra | `#C9C9C9` | — | — |
| 5 | ` INDICADOR $m3 ` | Línea | `#70AD47` | círculo | sólida, 2.25pt |

#### Ejes

| Eje | Posición | Formato | Mínimo | Máximo | Cruces |
|-----|----------|---------|--------|--------|--------|
| Eje Y Izquierdo (KG) | l | `#,##0` | auto | **3000** | autoZero |
| Eje Y Derecho ($m3) | r | `"$"\ #,##0` | auto | auto | max |

**Leyenda**: Posición **bottom** (`b`)

---

### CHART 8 — "$ QUIMICO / M3"
**Archivo XML**: `xl/charts/chart8.xml`  
**Posición**: col 0–14, fila 58–78 (parte inferior del dashboard)  
**Tipo**: Combo — Barras **Apiladas** (stacked) + 1 Línea

#### Series

| # (orden XML) | Nombre (exacto) | Tipo | Color | Marker | Línea |
|---------------|-----------------|------|-------|--------|-------|
| 0 | `INDICADOR $m3 ` | Línea | `#70AD47` | círculo | sólida, 2.25pt |
| 1 | `INDICADOR $ACIDO/M3 ` | Barra | `#FFE599` | — | — |
| 2 | ` INDICADOR $COAGULANTE/M3 ` | Barra | `#F4B183` | — | — |
| 3 | `INDICADOR $DECOLORANTE/M3 ` | Barra | `#C9C9C9` | — | — |
| 4 | `INDICADOR $POL ANIONICO/ M3 ` | Barra | `#ED7D31` | — | — |
| 5 | ` INDICADOR $POL CATIONICO / M3 ` | Barra | `#8EAADB` | — | — |

#### Ejes

| Eje | Posición | Formato | Mínimo | Máximo | Cruces |
|-----|----------|---------|--------|--------|--------|
| Eje Y Izquierdo ($/m3) | l | `_-"$"\ * #,##0_-;\-"$"\ * #,##0_-;_-"$"\ * "-"??_-;_-@_-` | auto | auto | autoZero |
| (Sin eje derecho secundario explícito) | — | — | — | — | — |

**Leyenda**: Posición **bottom** (`b`)

**Nota importante**: En el XML la serie de línea `INDICADOR $m3` tiene `idx=0` pero en el archivo está definida al final de la secuencia de series — el orden visual en leyenda coloca la línea primero, las barras después.

---

## 6. RESUMEN DE POSICIONES

### Hoja DB QUIMICA

| Chart | rId | col inicio | fila inicio | col fin | fila fin | Título |
|-------|-----|-----------|------------|---------|---------|--------|
| chart1 | rId1 | 1 | 2 | 15 | 16 | $m3 TRATAMIENTO GEM |
| chart2 | rId2 | 1 | 19 | 15 | 40 | INDICADOR RO |
| chart3 | rId3 | 15 | 2 | 23 | 16 | TIEMPO DE OPERACIÓN - SISTEMA GEM |
| chart4 | rId4 | 15 | 19 | 23 | 40 | TIEMPO DE OPERACIÓN - SISTEMA OSMOSIS INVERSA |
| (imagen pequeña) | — | 2 | 30 | 3 | 31 | Logo/decorativo |

### Hoja GRAFICAS

| Chart | rId | col inicio | fila inicio | col fin | fila fin | Título |
|-------|-----|-----------|------------|---------|---------|--------|
| chart5 | rId1 | 0 | 0 | 14 | 20 | COONSUMO PPM Vs $M3 |
| chart6 | rId2 | 0 | 20 | 14 | 37 | CONSUMO (L) Vs $M3 |
| chart7 | rId3 | 0 | 38 | 14 | 57 | CONSUMO KG Vs $M3 |
| Slicer FECHA | — | 21 | 36 | 22 | 49 | — |
| chart8 | rId4 | 0 | 58 | 14 | 78 | $ QUIMICO / M3 |

---

## 7. PROPIEDADES TÉCNICAS DE LÍNEAS

Todos los elementos de tipo línea en las gráficas tienen:
- **Ancho**: 28575 EMUs = **2.25 puntos** (línea normal en Excel)
- **Trazo sólido** por defecto; excepción: serie "2025 $m3 GEM" en chart1 usa `prstDash=sysDash` (guiones del sistema)
- **Marcadores**: Las líneas de indicador generalmente tienen `marker=circle`. Las líneas de meta/proyección tienen `marker=none`. La excepción es chart2 donde el LIMITE INDICADOR también usa `marker=circle`.

---

## 8. NOTAS PARA REPLICACIÓN

1. **Nombres con espacios al inicio/final**: Los nombres de series tienen espacios intencionales (ej. `' INDICADOR $m3 '` con espacios). Replicar exacto para que coincidan con referencias de datos.

2. **Typo en título chart5**: `COONSUMO` (doble O) — es el texto original. Mantener si se replica.

3. **Diferencia de color para decolorante**: chart5 (PPM) usa `#BFBFBF` mientras charts 6/7/8 usan `#C9C9C9`. Esta variación es intencional en el archivo original.

4. **Eje Y derecho con `crosses=max`**: Hace que el eje derecho aparezca en el lado derecho del área del gráfico, no en el valor 0 del eje izquierdo. Esto es crítico para el layout visual correcto.

5. **Barras apiladas en GRAFICAS**: Los charts 5–8 usan `barChart grouping=stacked`, permitiendo visualizar la composición de químicos acumulada.

6. **Formato moneda chart2 eje izquierdo**: Usa el formato de accounting español: `_-"$"\ * #,##0_-;\-"$"\ * #,##0_-;_-"$"\ * "-"??_-;_-@_-`

7. **Chart8 serie línea al frente**: Aunque `INDICADOR $m3` tiene `idx=0`, visualmente se renderiza sobre las barras apiladas.

---

## 9. USO CON CLAUDE CODE

```bash
# Para replicar dashboard completo:
claude "Lee @DASHBOARD_QUIMICOS_SPEC.md y crea un nuevo archivo Excel replicando
la estructura exacta: 2 hojas (DB QUIMICA y GRAFICAS), 8 gráficas combo con los
colores hex exactos especificados, tipos stacked/clustered según el spec,
ejes configurados con min/max/formato del spec, y slicer FECHA en GRAFICAS"

# Para replicar solo hoja GRAFICAS:
claude "Lee @DASHBOARD_QUIMICOS_SPEC.md, sección 5. Crea los 4 charts del dashboard
GRAFICAS con los colores exactos de la paleta global y las 5+1 series especificadas"
```
