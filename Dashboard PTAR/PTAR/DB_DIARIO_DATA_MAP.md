# DB DIARIO — Mapa de datos: tablas → gráficas

> **Propósito de este archivo:** documentación técnica para que cualquier agente o desarrollador entienda exactamente de dónde viene cada dato que se muestra en el dashboard Balance Hídrico Bogotá 2026.
>
> **Archivo fuente:** `DASHBOARD BALANCE HIDRICO BOGOTA 2026.xlsx`
> **Hoja analizada:** `DB DIARIO`

---

## Arquitectura del flujo de datos

```
[1]Contadores Por Turno 2026.xlsx   ← FUENTE PRIMARIA (lecturas acumuladas de contadores físicos)
            │
            │  diferencia entre turnos consecutivos (ej: X4−X3)
            ▼
Hoja: BASE DE DATOS  →  Tabla1 (A1:BB~1096)
            │            3 filas por día (turno 1, 2, 3)
            │  Cache ID 2 (todas las pivots lo usan)
            ▼
Hoja: DB DIARIO  →  15 tablas dinámicas
            │
            │  fórmulas =X/Y  y  GETPIVOTDATA()
            ▼
Tablas auxiliares (porcentajes, totales del mes)
            │
            ▼
Gráficas del dashboard
```

> ⚠️ **Punto crítico:** Si `[1]Contadores Por Turno 2026.xlsx` no está abierto o cambió de ruta, todas las fórmulas de `BASE DE DATOS` se rompen y por cascada las 14 tablas dinámicas del dashboard muestran datos incorrectos o en cero.

---

## Columnas clave de BASE DE DATOS (Tabla1)

Cada fila = 1 turno. Columna B = número de turno (1, 2 o 3). La fecha está en columna A.

| Col | Nombre campo | Origen / fórmula |
|-----|-------------|-----------------|
| A | FECHA | Ingreso manual |
| B | TURNO | Ingreso manual (1, 2 o 3) |
| C | SEMANA | `=WEEKNUM(FECHA, 2)` |
| D | DÍA | `=DAY(FECHA)` — usado como fila en algunas pivots |
| E | VOLUMEN INGRESO PTAP (m3) | `='[1]Contadores...'!X(n) − X(n-1)` |
| F | PTAP POTABLE (m3) | `='[1]Contadores...'!Y(n) − Y(n-1)` |
| G | VOLUMEN CONSUMO CARROTANQUES (m3) | derivado de contadores |
| H | VOLUMEN CONSUMO ACUEDUCTO (m3) | `= ENVÍO A TH − (PTAP + Carrotanques + ...)` |
| I | VOLUMEN INGRESO CONTADOR PRINCIPAL | `='[1]Contadores...'!C(n) − C(n-1)) × 10` |
| J | VOLUMEN ENVIADO A RO (m3) | `= ENTRADA RO 1` (col N) |
| K | VOLUMEN ENVIADO RECHAZO (m3) | `= RECHAZO ETAPA 1` (col P) |
| L | VOLUMEN ENVIADO PERMEADO RO (m3) | `= PERMEADO ETAPA 1` (col O) |
| M | % EFICIENCIA RO | `= 1 − (J − L) / J` |
| N | ENTRADA RO 1 (m3) | `='[1]Contadores...'!N(n) − N(n-1)) / 1000` |
| O | PERMEADO ETAPA 1 (m3) | `='[1]Contadores...'!O(n) − O(n-1)` |
| P | RECHAZO ETAPA 1 (m3) | `= N − O` |
| V | CONSUMO RO (m3) | `= L` (igual al permeado) |
| W | TOTAL CONSUMO AGUA PRODUCCIÓN (m3) | `= Agua Limpia + Agua Rechazo` |
| X | TOTAL CONSUMO AGUA LIMPIA PRODUCCIÓN (m3) | `= Permeado + PTAP + Carrotanques + ...` |
| Y | TOTAL CONSUMO AGUA RECHAZO PRODUCCIÓN (m3) | valor de rechazo usado en producción |
| Z | CONSUMO TOTAL TRATADO GEM (m3) | volumen tratado por sistema GEM |
| AA | CONSUMO TOTAL TINTORERÍA (m3) | `= AGUA LIMPIA TINTORERÍA` (col AC) |
| AC | VOLUMEN CONSUMO AGUA LIMPIA TINTORERÍA (m3) | `= X − (Lavandería + Rotativa + ...)` |
| AE | Kg Tela | dato de producción Tintorería |
| AF | RANGO MÁXIMO INDICADOR TINTORERÍA | constante = 65 |
| AG | RANGO MÍNIMO INDICADOR TINTORERÍA | constante = 45 |
| AH | CONSUMO TOTAL LAVANDERÍA (m3) | `= AGUA LIMPIA LAVANDERÍA` (col AJ) |
| AJ | VOLUMEN CONSUMO AGUA LIMPIA LAVANDERÍA | `='[1]Contadores...'!D(n) − D(n-1)` |
| AL | Und efectivas | dato de producción Lavandería |
| AM | RANGO MÁXIMO INDICADOR LAVANDERÍA | constante = 19 |
| AN | RANGO MÍNIMO INDICADOR LAVANDERÍA | constante = 0 |
| AO | CONSUMO TOTAL ROTATIVA (m3) | `='[1]Contadores...'!R(n) − R(n-1)` |
| AQ | m Tela Rotativa | dato de producción Rotativa |
| AR | MÍNIMO RANGO INDICADOR ROTATIVA | constante = 8 |
| AU | ENVÍO A TH (m3) | `='[1]Contadores...'!U(n) − U(n-1)` |
| AV | PERMEADO MBR1 (m3) | `='[1]Contadores...'!V(n) − V(n-1)` |
| AW | PERMEADO MBR2 (m3) | `='[1]Contadores...'!W(n) − W(n-1)` |
| AX | MULAS DE FUNZA (m3) | ingreso externo de agua |
| AY | AGUA CALIENTE TINTORERÍA (m3) | `='[1]Contadores...'!` col AY |
| AZ | AGUA RETORNO (m3) | `='[1]Contadores...'!S(n) − S(n-1)) / 1000` |

---

## Tablas dinámicas en DB DIARIO

### Cache ID 2 (fuente principal — BASE DE DATOS Tabla1)
Usada por 14 de las 15 tablas dinámicas. Agrupa los 3 turnos diarios en total por día.

### Cache ID 1 (fuente secundaria)
Usada solo por `TablaDinámica1` (rango AD76:AE108).

---

## Tablas dinámicas — detalle por gráfica

---

### PT-01 · `T CONS INDICADOR`
**Rango en hoja:** `Y5:AE24`
**Filtros activos:** Año = Todas · Trimestre = Todas · Mes = `Z3` (actualmente "may")
**Fila (agrupación):** FECHA (diaria)

| Columna hoja | Nombre columna pivot | Campo Tabla1 |
|-------------|---------------------|-------------|
| Y | FECHA | — |
| Z | CONSUMO TOTAL TINTORERÍA (m3) | col AA |
| AA | TINTORERÍA INDICADOR | col AA / col AE (m3/Kg tela) |
| AB | LAVANDERÍA INDICADOR | col AH / col AL (m3/Und) |
| AC | CONSUMO TOTAL ROTATIVA (m3) | col AO |
| AD | ROTATIVA INDICADOR | col AO / col AQ (m3/m Tela) |
| AE | TOTAL CONSUMO AGUA RECHAZO PRODUCCIÓN | col Y |

**Alimenta gráfica:** Tabla comparativa de indicadores (Tintorería / Lavandería / Rotativa).

---

### PT-02 · `T BALANCE RO`
**Rango en hoja:** `AG5:AL24`
**Filtros activos:** Año = Todas · Mes = `AH2` (actualmente "may")
**Fila:** FECHA (diaria)

| Columna hoja | Nombre columna pivot | Campo Tabla1 |
|-------------|---------------------|-------------|
| AG | FECHA | — |
| AH | TOTAL CONSUMO AGUA LIMPIA PRODUCCIÓN (m3) | col X |
| AI | VOLUMEN CONSUMO CARROTANQUES (m3) | col G |
| AJ | VOLUMEN ENVIADO PERMEADO RO (m3) | col L |
| AK | VOLUMEN CONSUMO ACUEDUCTO (m3) | col H |
| AL | VOLUMEN CONSUMO PTAP POTABLE (m3) | col F |

**Alimenta gráfica:** Columnas apiladas "Balance Hídrico" — fuentes de agua al sistema.

---

### PT-03 · `T BALANCE P + R`
**Rango en hoja:** `AN5:AU24`
**Filtros activos:** Año = Todas · Trimestre = Todas · Mes = `AO3` (actualmente "may")
**Fila:** FECHA (diaria)

| Columna hoja | Nombre columna pivot | Campo Tabla1 |
|-------------|---------------------|-------------|
| AN | FECHA | — |
| AO | VOLUMEN SUMINISTRADO A PRODUCCIÓN | col W |
| AP | VOLUMEN TOTAL RO (m3) | col J |
| AQ | VOLUMEN CONSUMO ACUEDUCTO (m3) | col H |
| AR | VOLUMEN CONSUMO CARROTANQUES (m3) | col G |
| AS | PERMEADO RO (RO Total) | col L |
| AT | VOLUMEN ENVIADO RECHAZO (m3) | col K |
| AU | VOLUMEN PTAP POTABLE (m3) | col F |

**Alimenta gráfica:** "Balance Hídrico Desglosado RO" — entradas y salidas del sistema RO.

---

### PT-04 · Tabla auxiliar GRÁFICA DE TORTA
**Rango en hoja:** `AW5:CE14`
**Tipo:** NO es tabla dinámica — son fórmulas que referencian PT-03 (T BALANCE P+R)

| Fila | Etiqueta | Fórmula (patrón) | Descripción |
|------|---------|-----------------|-------------|
| 6 | % ACUEDUCTO | `=AQ[n]/AO[n]` | Acueducto / Total suministrado |
| 7 | % CARROTANQUES | `=AR[n]/AO[n]` | Carrotanques / Total suministrado |
| 8 | % PERMEADO RO | `=AS[n]/AO[n]` | Permeado RO / Total suministrado |
| 9 | % PTAP POTABLE | `=AU[n]/AO[n]` | PTAP / Total suministrado |
| 14 | % RECHAZO | `=AT[n]/AO[n]` | Rechazo / Total suministrado |

Columna CD (totales del mes) usa `GETPIVOTDATA` sobre PT-03:
```excel
=GETPIVOTDATA("VOLUMEN CONSUMO ACUEDUCTO (m3)",$AN$5)
=GETPIVOTDATA("VOLUMEN CONSUMO CARROTANQUES (m3)",$AN$4)
=GETPIVOTDATA("VOLUMEN PERMEADO RO (RO Total)",$AN$4)
=GETPIVOTDATA("VOLUMEN ENVIADO RECHAZO (m3)",$AN$4)
```

**Alimenta gráfica:** Torta consolidada del mes — porcentaje de cada fuente de agua.

---

### PT-05 · `TINT VOL IND`
**Rango en hoja:** `CG5:CL24`
**Filtros activos:** Año = Todas · Trimestre = Todas · Mes = `CH3` (actualmente "may")
**Fila:** FECHA (diaria)

| Columna hoja | Nombre columna pivot | Campo Tabla1 |
|-------------|---------------------|-------------|
| CG | FECHA | — |
| CH | CONSUMO TOTAL TINTORERÍA (m3) | col AA |
| CI | TINTORERÍA INDICADOR | col AA / col AE |
| CJ | 2025 TINTORERÍA | referencia histórica comparativa |
| CK | AGUA FRÍA TINTORERÍA (m3) | col AC |
| CL | AGUA CALIENTE (m3) | col AY |

**Alimenta gráfica:** Volumen diario Tintorería con comparativo 2025 y desglose térmico.

---

### PT-06 · `TINT IND KG`
**Rango en hoja:** `CP5:CT24`
**Filtros activos:** Año = Todas · Trimestre = Todas · Mes = `CQ3` (actualmente "may")
**Fila:** FECHA (diaria)

| Columna hoja | Nombre columna pivot | Campo Tabla1 |
|-------------|---------------------|-------------|
| CP | FECHA | — |
| CQ | TINTORERÍA INDICADOR (m3/Kg tela) | col AA / col AE |
| CR | Kg Tela procesados | col AE |
| CS | Meta Kg procesados/día | valor fijo = 7,250 |
| CT | 2025 TINTORERÍA | referencia histórica |

**Alimenta gráfica:** Indicador Tintorería vs meta vs año anterior.

---

### PT-07 · `LAV VOL IND`
**Rango en hoja:** `CX5:DA24`
**Filtros activos:** Año = Todas · Trimestre = Todas · Mes = `CY3` (actualmente "may")
**Fila:** FECHA (diaria)

| Columna hoja | Nombre columna pivot | Campo Tabla1 |
|-------------|---------------------|-------------|
| CX | FECHA | — |
| CY | CONSUMO TOTAL LAVANDERÍA (m3) | col AH |
| CZ | LAVANDERÍA INDICADOR (m3/Und) | col AH / col AL |
| DA | 2025 LAVANDERÍA | referencia histórica |

**Alimenta gráfica:** Volumen diario Lavandería con comparativo 2025.

---

### PT-08 · `LAV UND IND`
**Rango en hoja:** `DD5:DH24`
**Filtros activos:** Año = Todas · Trimestre = Todas · Mes = `DE3` (actualmente "may")
**Fila:** FECHA (diaria)

| Columna hoja | Nombre columna pivot | Campo Tabla1 |
|-------------|---------------------|-------------|
| DD | FECHA | — |
| DE | LAVANDERÍA INDICADOR (m3/Und) | col AH / col AL |
| DF | Unidades efectivas | col AL |
| DG | Meta Und efectivas/día | valor fijo = 18,600 (`=464000/25`) |
| DH | 2025 LAVANDERÍA | referencia histórica |

**Alimenta gráfica:** Indicador Lavandería vs meta vs año anterior.

---

### PT-09 · `ROT IND VOL`
**Rango en hoja:** `DK4:DO23`
**Filtros activos:** sin filtro de mes (muestra datos acumulados del año)
**Fila:** FECHA (diaria)

| Columna hoja | Nombre columna pivot | Campo Tabla1 |
|-------------|---------------------|-------------|
| DK | FECHA | — |
| DL | CONSUMO TOTAL ROTATIVA (m3) | col AO |
| DM | ROTATIVA INDICADOR (m3/m Tela) | col AO / col AQ |
| DN | MÍNIMO RANGO INDICADOR ROTATIVA | col AR (constante = 8) |
| DO | 2024 ROTATIVA | referencia histórica |

**Alimenta gráfica:** Volumen Rotativa con banda de rango aceptable y comparativo 2024.

---

### PT-10 · `ROT M IND`
**Rango en hoja:** `DQ4:DU23`
**Filtros activos:** sin filtro de mes
**Fila:** FECHA (diaria)

| Columna hoja | Nombre columna pivot | Campo Tabla1 |
|-------------|---------------------|-------------|
| DQ | FECHA | — |
| DR | ROTATIVA INDICADOR (m3/m Tela) | col AO / col AQ |
| DS | MÍNIMO RANGO INDICADOR ROTATIVA | col AR |
| DT | m Tela procesados | col AQ |
| DU | 2024 ROTATIVA | referencia histórica |

**Alimenta gráfica:** Indicador Rotativa vs mínimo aceptable vs año anterior.

---

### PT-11 · `TablaDinámica12`
**Rango en hoja:** `DW4:ED23`
**Filtros activos:** Mes = `DX1` (actualmente "may")
**Fila:** DÍA del mes (col D de Tabla1 — `=DAY(FECHA)`) — agrupa por número de día, no por fecha completa

| Columna hoja | Nombre columna pivot | Campo Tabla1 |
|-------------|---------------------|-------------|
| DW | DÍA (1, 2, 3...) | col D |
| DX | TOTAL CONSUMO LAVANDERÍA (m3) | col AH |
| DY | TOTAL CONSUMO ROTATIVA (m3) | col AO |
| DZ | TOTAL CONSUMO TINTORERÍA (m3) | col AA |
| EA | TOTAL TRATADO GEM (m3) | col Z |
| EB | MULAS DE FUNZA (m3) | col AX |
| EC | TOTAL CONSUMO AGUA LIMPIA PRODUCCIÓN (m3) | col X |
| ED | TOTAL VOLUMEN A TRATAR | col calculada |

**Alimenta gráfica:** Consolidado diario del mes — comparativo entre todos los procesos.

---

### PT-12 · `AGUA CALIENTE`
**Rango en hoja:** `EG5:EK24`
**Filtros activos:** Año = Todas · Trimestre = Todas · Mes = `EH3` (actualmente "may")
**Fila:** FECHA (diaria)

| Columna hoja | Nombre columna pivot | Campo Tabla1 |
|-------------|---------------------|-------------|
| EG | FECHA | — |
| EH | CONSUMO TOTAL TINTORERÍA (m3) | col AA |
| EI | AGUA CALIENTE (m3) | col AY |
| EJ | AGUA FRÍA TINTORERÍA (m3) | col AC |
| EK | AGUA RETORNO (m3) | col AZ |

**Alimenta gráfica:** Desglose térmico del agua en Tintorería (fría / caliente / retorno).

---

### PT-13 · `TablaDinámica6`
**Rango en hoja:** `EM5:ES24`
**Filtros activos:** Año = Todas · Trimestre = Todas · Mes = `EN3` (actualmente "may")
**Fila:** FECHA (diaria)

| Columna hoja | Nombre columna pivot | Campo Tabla1 |
|-------------|---------------------|-------------|
| EM | FECHA | — |
| EN | VOLUMEN ENVIADO A RO (m3) | col J |
| EO | VOLUMEN ENVIADO PERMEADO RO (m3) | col L |
| EP | VOLUMEN ENVIADO RECHAZO (m3) | col K |
| EQ | VOLUMEN VERTIMIENTO GEM (m3) | col nueva (no en lista base) |
| ER | VOLUMEN VERTIMIENTO MBRS (m3) | col nueva |
| ES | CONSUMO TOTAL TRATADO GEM (m3) | col Z |

**Alimenta gráfica:** Sistema RO completo — entradas, permeado, rechazo y vertimientos.

---

### PT-14 · `TablaDinámica2`
**Rango en hoja:** `EW5:FC24`
**Filtros activos:** Mes = `EX1` (actualmente "may")
**Fila:** DÍA del mes (col D de Tabla1) — igual que PT-11

| Columna hoja | Nombre columna pivot | Campo Tabla1 |
|-------------|---------------------|-------------|
| EW | DÍA | col D |
| EX | TOTAL VOLUMEN A TRATAR | col calculada |
| EY | TOTAL CONSUMO AGUA LIMPIA PRODUCCIÓN | col X |
| EZ | ENVÍO A TH (m3) | col AU |
| FA | TRATADO GEM (m3) | col Z |
| FB | PERMEADO MBRS (m3) | `= col AV + col AW` |
| FC | ENVIADO A RO (m3) | col J |

**Alimenta gráfica:** Sistema de tratamiento completo — flujo TH → GEM → MBRS → RO.

---

### PT-15 · `TablaDinámica1` (Cache ID 1 — fuente distinta)
**Rango en hoja:** `AD76:AE108`
**Cache:** 1 (no es Tabla1 de BASE DE DATOS)
**Dato:** VOLUMEN CONSUMO CARROTANQUES (m3)

Tabla auxiliar de uso secundario, probablemente para validación o referencia cruzada.

---

## Resumen rápido: gráfica → tabla → columna Tabla1

| Gráfica dashboard | Pivot en DB DIARIO | Columnas Tabla1 usadas |
|-------------------|--------------------|------------------------|
| Indicadores Tint / Lav / Rot | PT-01 `T CONS INDICADOR` Y:AE | AA, AE, AH, AL, AO, AQ, Y |
| Balance Hídrico columnas apiladas | PT-02 `T BALANCE RO` AG:AL | X, G, L, H, F |
| Balance Hídrico desglosado RO | PT-03 `T BALANCE P+R` AN:AU | W, J, H, G, L, K, F |
| Torta % fuentes de agua | Fórmulas AW:CE (=X/AO) | referencia a PT-03 |
| Volumen + Indicador Tintorería | PT-05 `TINT VOL IND` CG:CL | AA, AE, AC, AY |
| Indicador Tintorería vs Kg Tela | PT-06 `TINT IND KG` CP:CT | AA, AE |
| Volumen + Indicador Lavandería | PT-07 `LAV VOL IND` CX:DA | AH, AL |
| Indicador Lavandería vs Und | PT-08 `LAV UND IND` DD:DH | AH, AL |
| Volumen + Indicador Rotativa | PT-09 `ROT IND VOL` DK:DO | AO, AQ, AR |
| Indicador Rotativa vs m Tela | PT-10 `ROT M IND` DQ:DU | AO, AQ, AR |
| Consolidado diario del mes | PT-11 `TablaDinámica12` DW:ED | AH, AO, AA, Z, AX, X — por DÍA |
| Desglose térmico Tintorería | PT-12 `AGUA CALIENTE` EG:EK | AA, AY, AC, AZ |
| Sistema RO completo | PT-13 `TablaDinámica6` EM:ES | J, L, K, Z |
| Flujo TH → GEM → MBRS → RO | PT-14 `TablaDinámica2` EW:FC | X, AU, Z, AV, AW, J — por DÍA |

---

## Notas para desarrollo / vinculación SQL

Si se migra este modelo a una base de datos SQL, la equivalencia es:

```sql
-- Tabla base equivalente a BASE DE DATOS (Tabla1)
-- Una fila por turno, 3 turnos por día
CREATE TABLE lecturas_turno (
    fecha        DATE,
    turno        INT,          -- 1, 2 o 3
    semana       INT,
    dia          INT,
    ptap_potable FLOAT,        -- col F
    carrotanques FLOAT,        -- col G
    acueducto    FLOAT,        -- col H
    enviado_ro   FLOAT,        -- col J
    rechazo_ro   FLOAT,        -- col K
    permeado_ro  FLOAT,        -- col L
    agua_limpia_prod FLOAT,    -- col X
    agua_rechazo_prod FLOAT,   -- col Y
    tratado_gem  FLOAT,        -- col Z
    tintoreria_m3 FLOAT,       -- col AA
    kg_tela      FLOAT,        -- col AE
    lavanderia_m3 FLOAT,       -- col AH
    und_efectivas FLOAT,       -- col AL
    rotativa_m3  FLOAT,        -- col AO
    m_tela       FLOAT,        -- col AQ
    envio_th     FLOAT,        -- col AU
    permeado_mbr1 FLOAT,       -- col AV
    permeado_mbr2 FLOAT,       -- col AW
    mulas_funza  FLOAT,        -- col AX
    agua_caliente FLOAT,       -- col AY
    agua_retorno FLOAT         -- col AZ
);

-- Vista diaria equivalente a cada tabla dinámica (agrupa los 3 turnos)
CREATE VIEW resumen_diario AS
SELECT
    fecha,
    dia,
    EXTRACT(MONTH FROM fecha) AS mes,
    SUM(tintoreria_m3)    AS consumo_tintoreria,
    SUM(kg_tela)          AS kg_tela,
    SUM(lavanderia_m3)    AS consumo_lavanderia,
    SUM(und_efectivas)    AS und_efectivas,
    SUM(rotativa_m3)      AS consumo_rotativa,
    SUM(m_tela)           AS m_tela,
    SUM(acueducto)        AS vol_acueducto,
    SUM(carrotanques)     AS vol_carrotanques,
    SUM(permeado_ro)      AS vol_permeado_ro,
    SUM(rechazo_ro)       AS vol_rechazo,
    SUM(ptap_potable)     AS vol_ptap,
    SUM(enviado_ro)       AS vol_enviado_ro,
    SUM(agua_limpia_prod) AS agua_limpia_prod,
    SUM(envio_th)         AS envio_th,
    SUM(tratado_gem)      AS tratado_gem,
    SUM(permeado_mbr1 + permeado_mbr2) AS permeado_mbrs,
    SUM(agua_caliente)    AS agua_caliente,
    SUM(agua_retorno)     AS agua_retorno,
    SUM(mulas_funza)      AS mulas_funza,
    -- Indicadores calculados
    CASE WHEN SUM(kg_tela) > 0
         THEN SUM(tintoreria_m3) / SUM(kg_tela) END AS indicador_tintoreria,
    CASE WHEN SUM(und_efectivas) > 0
         THEN SUM(lavanderia_m3) / SUM(und_efectivas) END AS indicador_lavanderia,
    CASE WHEN SUM(m_tela) > 0
         THEN SUM(rotativa_m3) / SUM(m_tela) END AS indicador_rotativa
FROM lecturas_turno
GROUP BY fecha, dia, mes;
```

---

## Control de filtros de mes en DB DIARIO

Cada tabla dinámica tiene su propio slicer de fecha. Para cambiar el mes visible en el dashboard, hay que actualizar estas celdas (o los slicers vinculados):

| Celda | Controla |
|-------|---------|
| Z3 | Mes de PT-01 (T CONS INDICADOR) |
| AH2 | Mes de PT-02 (T BALANCE RO) |
| AO3 | Mes de PT-03 (T BALANCE P+R) |
| CH3 | Mes de PT-05 (TINT VOL IND) |
| CQ3 | Mes de PT-06 (TINT IND KG) |
| CY3 | Mes de PT-07 (LAV VOL IND) |
| DE3 | Mes de PT-08 (LAV UND IND) |
| DX1 | Mes de PT-11 (TablaDinámica12) |
| EH3 | Mes de PT-12 (AGUA CALIENTE) |
| EN3 | Mes de PT-13 (TablaDinámica6) |
| EX1 | Mes de PT-14 (TablaDinámica2) |

> PT-09 (`ROT IND VOL`) y PT-10 (`ROT M IND`) no tienen filtro de mes — muestran el año completo.
