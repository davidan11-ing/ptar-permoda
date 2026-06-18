# GRAFICAS — Mapa de datos: tablas → gráficas
## Dashboard Costos Abril

> **Propósito:** documentación técnica para vincular cada dato visible en el dashboard con su origen exacto en las hojas de cálculo.
>
> **Archivo fuente:** `DASHBOARD COSTOS ABRIL.xlsx`
> **Hoja analizada:** `GRAFICAS` (rango A1:AZ106)

---

## Arquitectura del flujo de datos

```
INVENTARIO Y CONSUMO GEM  (Tabla1)   ← FUENTE GEM  (lectura diaria por turno)
            │ Cache ID 24
            ├──────────────────────────────────────────┐
            ▼                                          ▼
DB QUIMICA (pivots intermedias)           GRAFICAS (4 pivots directas)
  TablaDinámica1  → AJ4:AM35                TablaDinámica5   → V3:AB34
  TablaDinámica5  → BH4:BJ35                TablaDinámica6   → AD3:AJ34
  TablaDinámica9  → AP4:AR35                TablaDinámica7   → AL3:AR34
            │                               TablaDinámica10  → AT3:AZ34
            │ GETPIVOTDATA / referencia directa
            ▼
        Bloque estadístico GRAFICAS (P4:T59)
        Bloque calidad GRAFICAS (B80:I106)

REGISTRO RO (Tabla2)   ← FUENTE RO  (lectura diaria por turno)
            │ Cache ID 23
            ▼
DB QUIMICA (pivots RO)
  TablaDinámica3  → AT4:AW35
  TablaDinámica2  → AY4:BA35
  TablaDinámica4  → BC4:BF35
```

> ⚠️ **Punto crítico:** `GRAFICAS` no lee directamente `INVENTARIO Y CONSUMO GEM` — lo hace a través de las 4 tablas dinámicas (Cache 24). Si el caché no se actualiza, los datos mostrados son del mes anterior.

---

## Hojas del libro y su rol

| Hoja | Rol | Tabla estructurada |
|------|-----|-------------------|
| `INVENTARIO Y CONSUMO GEM` | **Fuente primaria GEM** — registro diario por turno de consumos de química, caudal tratado, horas operación | `Tabla1` (cols A:AU) |
| `REGISTRO RO` | **Fuente primaria RO** — registro diario de consumos químicos del sistema RO, tiempos y caudales | `Tabla2` (cols A:BB) |
| `DB QUIMICA` | Hoja intermedia — consolida pivots de GEM y RO, calcula totales mensuales y KPIs de costo | Sin tabla estructurada — 6 pivots propias |
| `INFORME CALIDAD` | Reporte de calidad del efluente — datos de DQO, SST, Color promedio mensual | Sin tabla — datos manuales |
| `GRAFICAS` | **Dashboard principal** — 4 pivots + bloque estadístico + bloque calidad | Sin tabla propia |
| `PROYECCIÓN INSUMOS QUÍMICO` | Proyecciones de consumo anual por insumo | Manual |
| `CONSUMO QUÍMICA-CAUDALES GEM` | Consolidado cruzado mensual de química vs caudal GEM | 4 pivots propias |
| `INVENTARIO INSUMOS QUÍMICOS GEM` | Kardex de inventario GEM | Manual |
| `INVENTARIO INSUMOS QUÍMICOS RO` | Kardex de inventario RO | Manual |
| `CONSUMO QUÍMICA - CAUDALES RO` | Consolidado mensual RO | Manual/Pivot |
| `Consumos` | Tabla resumen de consumos consolidados | Manual |

---

## Columnas clave de INVENTARIO Y CONSUMO GEM (Tabla1)

Cada fila = 1 turno de operación del sistema GEM.

| Col | Campo | Descripción |
|-----|-------|------------|
| A | FECHA | Fecha del turno |
| B | DÍA | Número de día del mes |
| C | ANÁLISIS TURNO | Identificador del turno |
| D | # TURNO | Número de turno |
| F | FINAL ÁCIDO (L) | Lectura final inventario ácido |
| G | FINAL COAGULANTE (L) | Lectura final inventario coagulante |
| H | FINAL DECOLORANTE (L) | Lectura final inventario decolorante |
| I | FINAL POL ANIÓNICO (KG) | Lectura final inventario polímero aniónico |
| J | FINAL POL CATIÓNICO (KG) | Lectura final inventario polímero catiónico |
| K | Lectura Horómetro INICIAL (06:00) | Hora de inicio del turno |
| L | CAUDAL TOTAL TRATADO GEM (m3) | Volumen tratado en el turno |
| M | CAUDAL DE TRATAMIENTO | Caudal instantáneo (m3/h) |
| N | CONSUMO LITROS ÁCIDO (L) | `= Inventario anterior − Inventario final` |
| O | CONSUMO LITROS COAGULANTE (L) | Diferencia de inventario coagulante |
| P | CONSUMO LITROS DECOLORANTE (L) | Diferencia de inventario decolorante |
| Q | CONSUMO POL ANIÓNICO (KG) | Diferencia de inventario aniónico |
| R | CONSUMO POL CATIÓNICO (KG) | Diferencia de inventario catiónico |
| S | KG ÁCIDO | `= Litros consumidos × Densidad ácido` |
| T | KG COAGULANTE | `= Litros × Densidad coagulante` |
| U | KG DECOLORANTE | `= Litros × Densidad decolorante` |
| V | KG POL ANIÓNICO | directo (se registra en kg) |
| W | KG POL CATIÓNICO | directo (se registra en kg) |
| X | PPM ÁCIDO | `= (KG / Caudal tratado) × 1,000,000` |
| Y | PPM COAGULANTE | igual que ácido |
| Z | PPM DECOLORANTE | igual |
| AA | PPM POL ANIÓNICO | igual |
| AB | PPM POL CATIÓNICO | igual |
| AC-AG | DENSIDADES (Ácido, Coagulante, Decolorante, Aniónico, Catiónico) | constantes por producto |
| AH | PRECIO (KG) ÁCIDO | constante = $830 |
| AI | PRECIO (KG) COAGULANTE | constante = $2,900 |
| AJ | PRECIO (KG) DECOLORANTE | constante = $6,295 |
| AK | PRECIO (KG) ANIÓNICO | constante = $19,050 |
| AL | PRECIO (KG) CATIÓNICO | constante = $22,050 |
| AM | COSTO OPERATIVO ÁCIDO | `= KG Ácido × Precio Ácido` |
| AN | COSTO OPERATIVO COAGULANTE | ídem |
| AO | COSTO OPERATIVO DECOLORANTE | ídem |
| AP | COSTO OPERATIVO ANIÓNICO | ídem |
| AQ | COSTO OPERATIVO CATIÓNICO | ídem |
| AR | COSTO QUÍMICA (total del turno) | `= Suma costos operativos` |
| AS | LÍMITE INDICADOR M3 | meta de costo $/m3 |
| AT | $m3 | `= Costo total / Caudal tratado` |
| AU | HORAS DE OPERACIÓN | duración del turno |

---

## Columnas clave de REGISTRO RO (Tabla2)

Cada fila = 1 turno del sistema RO.

| Col | Campo |
|-----|-------|
| A | FECHA |
| B | DÍA |
| C | TURNO |
| D-H | Inventarios finales: HCl, Biocida, Antiincrustante, NaOH, Bisulfito |
| I | TIEMPO DE OPERACIÓN (minutos) |
| J | VOLUMEN ENVIADO A RO (m3) |
| K | Q DE OPERACIÓN (m3/h) |
| V-Z | CONSUMO (L): HCl, Biocida, Antiincrustante, NaOH, Bisulfito |
| AF-AJ | CONSUMO (Kg): mismos productos |
| AK-AO | PPM: mismos productos |
| AP-AT | PRECIOS por producto |
| AU-AY | COSTOS OPERATIVOS por producto |
| AZ | COSTO QUÍMICA total del turno |
| BA | LÍMITE INDICADOR M3 |
| BB | $m3 ENVIADO A RO |

---

## Precios unitarios hardcodeados en GRAFICAS (AV1:AZ2)

Estos valores se usan para calcular costos en el bloque estadístico. Cambiarlos aquí actualiza todos los cálculos de $ de la hoja.

| Celda | Producto | Precio |
|-------|---------|--------|
| AV2 | ÁCIDO (COF 280) | $830 / kg |
| AW2 | COAGULANTE (COF 235) | $2,900 / kg |
| AX2 | DECOLORANTE (COF 255) | $6,295 / kg |
| AY2 | POL. ANIÓNICO (COF 440) | $19,050 / kg |
| AZ2 | POL. CATIÓNICO (COF 494) | $22,050 / kg |

---

## Tablas dinámicas en GRAFICAS (Cache 24 — fuente: Tabla1 de INVENTARIO Y CONSUMO GEM)

Las 4 pivots agrupan los turnos por **DÍA del mes** (campo B de Tabla1). Filtro activo: **"(Varios elementos)"** en fila 1 = filtro de mes/año controlado por slicer.

---

### PT-01 · `TablaDinámica5`
**Rango:** `V3:AB34`
**Fila:** DÍA (campo B de Tabla1)
**Tema:** PPM (concentración) de cada producto + indicador de costo

| Columna hoja | Campo en Tabla1 | Descripción |
|-------------|----------------|------------|
| V | DÍA | Número de día del mes |
| W | COF 494 - PPM POL CATIÓNICO | col AB — promedio ponderado del turno |
| X | COF 440 - PPM POL ANIÓNICO | col AA |
| Y | COF 280 - PPM ÁCIDO | col X |
| Z | COF 235 - PPM COAGULANTE | col Y |
| AA | COF 255 - PPM DECOLORANTE | col Z |
| AB | INDICADOR $/m3 | col AT (costo total / m3 tratado) |

**Alimenta gráfica:** Gráfica de PPM diarios por producto — muestra la dosis diaria de cada químico en partes por millón.

---

### PT-02 · `TablaDinámica6`
**Rango:** `AD3:AJ34`
**Fila:** DÍA
**Tema:** Consumo en LITROS de cada producto + indicador de costo

| Columna hoja | Campo en Tabla1 | Descripción |
|-------------|----------------|------------|
| AD | DÍA | Número de día del mes |
| AE | CONSUMO POL CATIÓNICO (KG) | col R — consumo del día |
| AF | CONSUMO POL ANIÓNICO (KG) | col Q |
| AG | CONSUMO LITROS ÁCIDO (L) | col N |
| AH | CONSUMO LITROS COAGULANTE (L) | col O |
| AI | CONSUMO LITROS DECOLORANTE (L) | col P |
| AJ | INDICADOR $/m3 | col AT |

**Alimenta gráfica:** Gráfica de consumo diario en litros/kg — útil para seguimiento operativo y comparación con proyecciones.

**Nota:** Las columnas AE y AF muestran KG (no litros) para los polímeros porque estos se dosifican directamente en sólido.

---

### PT-03 · `TablaDinámica7`
**Rango:** `AL3:AR34`
**Fila:** DÍA
**Tema:** Consumo en KILOGRAMOS de cada producto + indicador de costo

| Columna hoja | Campo en Tabla1 | Descripción |
|-------------|----------------|------------|
| AL | DÍA | Número de día del mes |
| AM | KG POL CATIÓNICO | col W |
| AN | KG POL ANIÓNICO | col V |
| AO | KG ÁCIDO | col S |
| AP | KG COAGULANTE | col T |
| AQ | KG DECOLORANTE | col U |
| AR | INDICADOR $/m3 | col AT |

**Alimenta gráfica:** Gráfica de consumo diario en kg — base para calcular costos y comparar con proyección mensual.

---

### PT-04 · `TablaDinámica10`
**Rango:** `AT3:AZ34`
**Fila:** DÍA
**Tema:** INDICADORES DE COSTO por producto ($/m3) + indicador global

| Columna hoja | Campo en Tabla1 | Descripción |
|-------------|----------------|------------|
| AT | DÍA | Número de día del mes |
| AU | INDICADOR $/m3 (global) | col AT |
| AV | INDICADOR $ ÁCIDO/M3 | `= Costo ácido / Caudal` (calculado en Tabla1) |
| AW | INDICADOR $ COAGULANTE/M3 | ídem coagulante |
| AX | INDICADOR $ DECOLORANTE/M3 | ídem decolorante |
| AY | INDICADOR $ POL ANIÓNICO/M3 | ídem aniónico |
| AZ | INDICADOR $ POL CATIÓNICO/M3 | ídem catiónico |

**Alimenta gráfica:** Gráfica de indicadores de costo $/m3 por producto — permite ver qué producto tiene mayor impacto económico por m3 tratado.

---

## Bloque estadístico por insumo (columnas P:T, filas 4–59)

Para cada uno de los 5 insumos GEM, se calcula un resumen estadístico del mes. Los datos se leen directamente de las columnas de las 4 pivots anteriores.

### Estructura por insumo

| Fila | Estadístico | Fórmula (patrón) |
|------|------------|-----------------|
| +2 | MÍNIMO (excluyendo ceros) | `=MINIFS(col_pivot, col_pivot, "<>0")` |
| +3 | MÁXIMO | `=MAX(col_pivot)` |
| +4 | PROMEDIO (excluyendo ceros) | `=AVERAGEIF(col_pivot, "<>0")` |
| +5 | TOTAL CONSUMIDO | `=GETPIVOTDATA("campo", $pivot_ref)` |
| +6 | PROYECCIÓN Kg/M3 | valor fijo (constante actualizable) |
| +7 | REAL Kg/M3 | `= Total_KG / F82` donde F82 = `'DB QUIMICA'!Z8` (m3 tratados totales del mes) |
| +8 | PROYECCIÓN CONSUMO Kg | valor fijo anual |
| +9 | CONSOLIDADO CONSUMO Kg | `= Total consumido` |

### Referencia exacta por insumo

#### COF 255 — DECOLORANTE (filas 4–13)
| Métrica | Col Q (PPM) | Col R (L/día) | Col S (Kg/día) | Col T ($) |
|---------|------------|--------------|--------------|---------|
| MIN | `MINIFS(AA4:AA30,...)` | `MINIFS(AI4:AI30,...)` | `MINIFS(AQ4:AQ30,...)` | `MINIFS(AX4:AX30,...)` |
| MAX | `MAX(AA4:AA30)` | `MAX(AI4:AI30)` | `MAX(AQ4:AQ30)` | `MAX(AX4:AX30)` |
| PROMEDIO | `AVERAGEIF(AA4:AA30,"<>0")` | `AVERAGEIF(AI4:AI30,"<>0")` | `AVERAGEIF(AQ4:AQ30,"<>0")` | `AVERAGEIF(AX4:AX30,"<>0")` |
| TOTAL | — | `GETPIVOTDATA("CONSUMO LITROS DECOLORANTE (L)",$AD$3)` | `GETPIVOTDATA("KG DECOLORANTE",$AL$3)` | `=S9*AX2` |
| REAL Kg/M3 | — | — | `=S9/F82` | `=T9/F82` |

#### COF 235 — COAGULANTE (filas 15–24)
| Métrica | Col Q (PPM) | Col R (L/día) | Col S (Kg/día) | Col T ($) |
|---------|------------|--------------|--------------|---------|
| MIN | `MINIFS(Z4:Z30,...)` | `MINIFS(AH4:AH30,...)` | `MINIFS(AP4:AP30,...)` | `MINIFS(AW4:AW30,...)` |
| MAX | `MAX(Z4:Z30)` | `MAX(AH4:AH30)` | `MAX(AP4:AP30)` | `MAX(AW4:AW30)` |
| TOTAL | — | `GETPIVOTDATA("CONSUMO LITROS COAGULANTE (L)",$AD$3)` | `GETPIVOTDATA("KG COAGULANTE",$AL$3)` | `=S20*AW2` |
| REAL Kg/M3 | — | — | `=S20/F82` | `=T20/F82` |

#### COF 280 — ACIDIFICANTE (filas 27–36)
| Métrica | Col Q (PPM) | Col R (L/día) | Col S (Kg/día) | Col T ($) |
|---------|------------|--------------|--------------|---------|
| MIN | `MINIFS(Y4:Y30,...)` | `MINIFS(AG4:AG30,...)` | `MINIFS(AO4:AO30,...)` | `MINIFS(AV4:AV30,...)` |
| MAX | `MAX(Y4:Y30)` | `MAX(AG4:AG30)` | `MAX(AO4:AO30)` | `MAX(AV4:AV30)` |
| TOTAL | — | `GETPIVOTDATA("CONSUMO LITROS ACIDO (L)",$AD$3)` | `GETPIVOTDATA("KG ACIDO",$AL$3)` | `=AV2*S32` |
| REAL Kg/M3 | — | — | `=S32/F82` | `=T32/F82` |

#### COF 440 — POLÍMERO ANIÓNICO (filas 39–48)
| Métrica | Col Q (PPM) | Col R (Kg/día) | Col S ($) |
|---------|------------|--------------|---------|
| MIN | `MINIFS(X4:X30,...)` | `MINIFS(AN4:AN30,...)` | `MINIFS(AY4:AY30,...)` |
| MAX | `MAX(X4:X30)` | `MAX(AN4:AN30)` | `MAX(AY4:AY30)` |
| TOTAL | — | `GETPIVOTDATA("KG POL ANIONICO",$AL$3)` | `=R44*AY2` |
| REAL Kg/M3 | — | `=R44/F82` | `=S44/F82` |

#### COF 494 — POLÍMERO CATIÓNICO (filas 50–59)
| Métrica | Col Q (PPM) | Col R (Kg/día) | Col S ($) |
|---------|------------|--------------|---------|
| MIN | `MINIFS(W4:W30,...)` | `MINIFS(AM4:AM30,...)` | `MINIFS(AZ4:AZ30,...)` |
| MAX | `MAX(W4:W30)` | `MAX(AM4:AM30)` | `MAX(AZ4:AZ30)` |
| TOTAL | — | `GETPIVOTDATA("KG POL CATIONICO",$AL$3)` | `=R55*AZ2` |
| REAL Kg/M3 | — | `=R55/F82` | `=S55/F82` |

> **`F82`** es la celda ancla de m3 tratados: `='DB QUIMICA'!Z8`, que a su vez es `=GETPIVOTDATA("CAUDAL TOTAL TRATADO GEM",$AJ$4)` sobre Tabla1 de INVENTARIO Y CONSUMO GEM.

---

## Pivots intermedias en DB QUIMICA

Estas pivots no están en GRAFICAS pero son referenciadas por fórmulas en GRAFICAS mediante `GETPIVOTDATA` o referencia directa de celda.

### Cache ID 24 (fuente: Tabla1 INVENTARIO Y CONSUMO GEM)

| Nombre | Rango | Campos valor | Usado en GRAFICAS |
|--------|-------|-------------|-------------------|
| `TablaDinámica1` | AJ4:AM35 | CAUDAL TOTAL TRATADO GEM, INDICADOR $/m3, 2025 $/m3 GEM | `GETPIVOTDATA` desde `Z8` de DB QUIMICA → `F82` de GRAFICAS |
| `TablaDinámica5` | BH4:BJ35 | VOLUMEN TRATADO GEM (m3), COSTO QUÍMICA GEM | `AD8 = GETPIVOTDATA("COSTO QUIMICA GEM",$BH$4)` → `H82` de GRAFICAS |
| `TablaDinámica9` | AP4:AR35 | VOLUMEN TRATADO GEM (m3), HORAS DE OPERACIÓN | uso interno DB QUIMICA |

### Cache ID 23 (fuente: Tabla2 REGISTRO RO)

| Nombre | Rango | Campos valor | Uso |
|--------|-------|-------------|-----|
| `TablaDinámica3` | AT4:AW35 | VOLUMEN ENVIADO A RO (m3), LÍMITE INDICADOR M3, INDICADOR $/m3 RO | gráfica RO en DB QUIMICA |
| `TablaDinámica2` | AY4:BA35 | VOLUMEN ENVIADO A RO (m3), TIEMPO DE OPERACIÓN | operativo RO |
| `TablaDinámica4` | BC4:BF35 | VOLUMEN ENVIADO A RO (m3), TIEMPO DE OPERACIÓN, COSTO QUÍMICA RO | costo RO |

---

## Bloque Calidad / DQO / SST (B80:I106)

Este bloque calcula el costo de remoción de contaminantes. **No usa pivots** — combina valores estáticos del informe mensual con referencias a DB QUIMICA.

### Sección DQO (filas 80–82)

| Celda | Dato | Fórmula / Origen |
|-------|------|-----------------|
| B82 | DQO INICIAL (mg/L) promedio | `=E97` → promedio DQO entrada GEM (valor estático en GRAFICAS) |
| C82 | DQO SALIDA (mg/L) promedio | `=F97` → promedio DQO salida GEM (valor estático) |
| D82 | DQO REMOVIDA (mg/L) | `=B82 - C82` |
| E82 | KG REMOVIDOS DQO / M3 | `=(D82/1,000,000) × 1,000` |
| F82 | M3 TRATADOS (total mes) | `='DB QUIMICA'!Z8` → pivot TablaDinámica1 campo CAUDAL TOTAL |
| G82 | TOTAL KG DQO REMOVIDOS | `=F82 × E82` |
| H82 | $ TRATAMIENTO (costo total mes) | `='DB QUIMICA'!AD8` → pivot TablaDinámica5 campo COSTO QUÍMICA GEM |
| I82 | $ REMOVER KG DQO | `=H82 / G82` |

### Sección SST (filas 84–86)

| Celda | Dato | Fórmula / Origen |
|-------|------|-----------------|
| B86 | SST INICIAL (mg/L) promedio | `=E102` → promedio SST entrada GEM (estático) |
| C86 | SST SALIDA (mg/L) promedio | `=F102` → promedio SST salida GEM (estático) |
| D86 | SST REMOVIDOS (mg/L) | `=B86 - C86` |
| E86 | KG REMOVIDOS SST / M3 | `=(D86/1,000,000) × 1,000` |
| F86 | M3 TRATADOS | `=F82` (mismo que DQO) |
| G86 | TOTAL KG SST REMOVIDOS | `=F86 × E86` |
| H86 | $ TRATAMIENTO | `=H82` (mismo costo total) |
| I86 | $ REMOVER KG SST | `=H86 / D86` |

### KPIs de calidad (B91:F106) — valores estáticos del informe mensual

Estos valores se actualizan manualmente cada mes a partir del `INFORME CALIDAD`:

| Celda(s) | Indicador | Nota |
|----------|----------|------|
| E93/F93 | COLOR promedio Entrada/Salida GEM | Manual |
| E94/F94 | COLOR Percentil 90 | Manual |
| E95/F95 | Índice de estabilidad COLOR (CV%) | Manual |
| E97/F97 | DQO promedio Entrada/Salida | **Referenciado en B82/C82** |
| E98/F98 | DQO Percentil 90 | Manual |
| E99/F99 | Índice estabilidad DQO (CV%) | Manual |
| E100 | CARGA REMOVIDA Kg/día DQO | `=G82` |
| E102/F102 | SST promedio Entrada/Salida | **Referenciado en B86/C86** |
| E103/F103 | SST Percentil 90 | Manual |
| E104/F104 | Índice estabilidad SST (CV%) | Manual |
| E105 | CARGA REMOVIDA Kg/día SST | `=G86` |

---

## Resumen rápido: gráfica → pivot → tabla fuente

| Gráfica en dashboard | Pivot en GRAFICAS | Tabla fuente | Columna clave |
|---------------------|-------------------|-------------|--------------|
| PPM diarios por producto | PT-01 `TablaDinámica5` V:AB | `INVENTARIO Y CONSUMO GEM` Tabla1 | cols X,Y,Z,AA,AB (PPM) |
| Consumo L/Kg diario por producto | PT-02 `TablaDinámica6` AD:AJ | Tabla1 | cols N,O,P,Q,R (consumos) |
| Consumo Kg diario | PT-03 `TablaDinámica7` AL:AR | Tabla1 | cols S,T,U,V,W (kg) |
| Indicadores $/m3 por producto | PT-04 `TablaDinámica10` AT:AZ | Tabla1 | col AT ($m3) |
| Estadísticas MIN/MAX/PROM por insumo | Fórmulas P:T (MINIFS, MAX, AVERAGEIF) | Referencias directas a PT-01/02/03/04 | cols W-AZ filas 4:30 |
| Total consumido y costo mensual | `GETPIVOTDATA` en P:T | PT-02 `AD:AJ` y PT-03 `AL:AR` | Totales de columna |
| Costo $/ Kg DQO removido | Fórmulas B80:I82 | `DB QUIMICA`!Z8 y AD8 | Pivots TablaDinámica1 y TablaDinámica5 |
| Costo $/ Kg SST removido | Fórmulas B84:I86 | mismo que DQO | misma referencia |
| KPIs de calidad (DQO, SST, Color) | Valores estáticos B91:F106 | `INFORME CALIDAD` — actualización manual | E97,F97,E102,F102 |

---

## Equivalencia SQL — vista para replicar en base de datos

```sql
-- Tabla base equivalente a INVENTARIO Y CONSUMO GEM (Tabla1)
-- Una fila por turno de operación del sistema GEM
CREATE TABLE consumo_quimica_gem (
    fecha              DATE,
    dia                INT,           -- día del mes
    turno              INT,
    caudal_tratado_m3  FLOAT,         -- col L
    horas_operacion    FLOAT,         -- col AU
    -- Consumos en litros
    consumo_acido_l    FLOAT,         -- col N
    consumo_coagulante_l FLOAT,       -- col O
    consumo_decolorante_l FLOAT,      -- col P
    -- Consumos en kg
    kg_acido           FLOAT,         -- col S
    kg_coagulante      FLOAT,         -- col T
    kg_decolorante     FLOAT,         -- col U
    kg_anionico        FLOAT,         -- col V
    kg_cationico       FLOAT,         -- col W
    -- PPM
    ppm_acido          FLOAT,         -- col X
    ppm_coagulante     FLOAT,         -- col Y
    ppm_decolorante    FLOAT,         -- col Z
    ppm_anionico       FLOAT,         -- col AA
    ppm_cationico      FLOAT,         -- col AB
    -- Costos
    costo_quimica_total FLOAT,        -- col AR
    indicador_m3       FLOAT          -- col AT
);

-- Vista diaria equivalente a las 4 tablas dinámicas de GRAFICAS
CREATE VIEW resumen_diario_gem AS
SELECT
    fecha,
    dia,
    EXTRACT(MONTH FROM fecha)   AS mes,
    SUM(caudal_tratado_m3)      AS caudal_total_m3,
    SUM(horas_operacion)        AS horas_total,
    -- PPM promedio ponderado
    SUM(ppm_acido * caudal_tratado_m3) / NULLIF(SUM(caudal_tratado_m3),0) AS ppm_acido,
    SUM(ppm_coagulante * caudal_tratado_m3) / NULLIF(SUM(caudal_tratado_m3),0) AS ppm_coagulante,
    SUM(ppm_decolorante * caudal_tratado_m3) / NULLIF(SUM(caudal_tratado_m3),0) AS ppm_decolorante,
    SUM(ppm_anionico * caudal_tratado_m3) / NULLIF(SUM(caudal_tratado_m3),0) AS ppm_anionico,
    SUM(ppm_cationico * caudal_tratado_m3) / NULLIF(SUM(caudal_tratado_m3),0) AS ppm_cationico,
    -- Consumos totales del día
    SUM(kg_acido)               AS kg_acido,
    SUM(kg_coagulante)          AS kg_coagulante,
    SUM(kg_decolorante)         AS kg_decolorante,
    SUM(kg_anionico)            AS kg_anionico,
    SUM(kg_cationico)           AS kg_cationico,
    -- Costo e indicador
    SUM(costo_quimica_total)    AS costo_total,
    SUM(costo_quimica_total) / NULLIF(SUM(caudal_tratado_m3),0) AS indicador_m3,
    -- Indicadores por producto ($/m3)
    SUM(kg_acido * 830) / NULLIF(SUM(caudal_tratado_m3),0)        AS indicador_acido_m3,
    SUM(kg_coagulante * 2900) / NULLIF(SUM(caudal_tratado_m3),0)  AS indicador_coagulante_m3,
    SUM(kg_decolorante * 6295) / NULLIF(SUM(caudal_tratado_m3),0) AS indicador_decolorante_m3,
    SUM(kg_anionico * 19050) / NULLIF(SUM(caudal_tratado_m3),0)   AS indicador_anionico_m3,
    SUM(kg_cationico * 22050) / NULLIF(SUM(caudal_tratado_m3),0)  AS indicador_cationico_m3
FROM consumo_quimica_gem
GROUP BY fecha, dia, mes;

-- Estadísticas mensuales equivalentes al bloque P:T de GRAFICAS
CREATE VIEW estadisticas_mensuales_gem AS
SELECT
    mes,
    -- Decolorante (COF 255)
    MIN(CASE WHEN ppm_decolorante > 0 THEN ppm_decolorante END)    AS min_ppm_decolorante,
    MAX(ppm_decolorante)                                            AS max_ppm_decolorante,
    AVG(CASE WHEN ppm_decolorante > 0 THEN ppm_decolorante END)    AS prom_ppm_decolorante,
    SUM(kg_decolorante)                                             AS total_kg_decolorante,
    SUM(kg_decolorante * 6295)                                      AS total_costo_decolorante,
    SUM(kg_decolorante) / NULLIF(SUM(caudal_total_m3),0)           AS real_kg_m3_decolorante,
    -- (repetir para Coagulante, Ácido, Aniónico, Catiónico)
    SUM(caudal_total_m3)                                            AS m3_tratados_mes
FROM resumen_diario_gem
GROUP BY mes;
```

---

## Notas para mantenimiento

1. **Actualizar precios unitarios:** cambiar solo las celdas `AV2:AZ2` en GRAFICAS — todos los cálculos de $ se recalculan automáticamente.
2. **Actualizar KPIs de calidad:** ingresar manualmente los promedios de DQO, SST y Color del mes en las celdas `E97`, `F97`, `E102`, `F102` de GRAFICAS.
3. **Filtro de mes:** el slicer que controla las 4 pivots está asociado a la cabecera `V1` (muestra "Varios elementos" cuando hay filtro activo). Para ver solo un mes, aplicar el filtro directamente en cualquiera de las 4 pivots — todas comparten el mismo caché (ID 24) y se sincronizan.
4. **Nueva tabla REGISTRO RO:** si se agregan químicos nuevos al sistema RO, agregar columnas en `Tabla2` de REGISTRO RO y crear nuevas pivots en DB QUIMICA con Cache 23.
