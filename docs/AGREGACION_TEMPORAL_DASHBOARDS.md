# Agregación Temporal — Dashboards PTAR
> Cómo se transforman los datos por turno (BD) en vistas por Día, Semana y Mes

---

## Contexto

La base de datos almacena **3 registros por día** (uno por turno):
- Turno 1 = Noche   (10pm – 6am)
- Turno 2 = Mañana  (6am  – 2pm)
- Turno 3 = Tarde   (2pm  – 10pm)

El selector **VER POR** del dashboard permite cambiar cómo se muestran esos datos en el eje X:

| Botón | Eje X muestra | Rango de fechas por defecto |
|---|---|---|
| Turno | `02/Jun Mañ`, `02/Jun Tar`… | Últimos 7 días |
| Día | `02/Jun`, `01/Jun`… | Últimos 30 días |
| Semana | `Sem 22`, `Sem 21`… | Últimas 12 semanas (84 d) |
| Mes | `Jun 26`, `May 26`… | Últimos 6 meses (180 d) |

> El selector de granularidad y los date pickers son **independientes**:
> hacer clic en un botón pone las fechas por defecto, pero el usuario puede
> cambiar las fechas manualmente sin perder la granularidad activa.

---

## Regla general de agregación

```
Tipo de dato          Operación      Razón
─────────────────────────────────────────────────────────────────────
Volumen / masa        SUMA           Se acumula: los m³ del lunes
  (m³, kg, L)                        + martes = total de la semana
Ratio / eficiencia    PROMEDIO       No se suman porcentajes ni
  (%, $/m³, mg/L,                    concentraciones de distintos
   PPM, L/und, kg/kg)                turnos/días
```

---

## Archivo central de agregación

```
ptar-app/src/lib/utils/agruparTemporal.ts
```

Contiene 4 funciones exportadas:

| Función | Qué hace |
|---|---|
| `xLabel(fecha, turno, gran)` | Genera el label del eje X según granularidad |
| `sortKey(fecha, turno, gran)` | Clave de ordenación cronológica (interna) |
| `generateAllPeriods(fi, ff, gran)` | Genera todos los períodos del rango (para "Días sin datos") |
| `agruparPorGranularidad(rows, opts)` | Función genérica: recibe `sumFields[]` y `avgFields[]` y aplica suma o promedio según corresponda |

### Cómo funciona `agruparPorGranularidad`

1. Por cada fila del array de datos, calcula `sortKey(fecha, turno, gran)`.  
   Todos los registros con la misma key caen en el mismo **"bucket"**.

   ```
   gran='dia'    → key="2026-06-02"         (T1+T2+T3 del mismo día → 1 bucket)
   gran='semana' → key="2026-W22"           (todos los días de esa semana → 1 bucket)
   gran='mes'    → key="2026-06"            (todos los días del mes → 1 bucket)
   gran='turno'  → key="2026-06-02_2"       (único por turno → sin agregar)
   ```

2. Dentro del bucket, por cada campo:
   - Si está en `sumFields` → acumula `+= valor` (línea 160)
   - Si está en `avgFields` → guarda en un array `[]` (línea 166-168)

3. Al finalizar, convierte cada bucket en una fila:
   - sums → ya es la suma final (línea 179)
   - avgs → `suma del array / cantidad` (líneas 172-173, 180)

---

## Dashboard Balance Hídrico

**Archivo:** `ptar-app/src/features/balance/BalanceHidricoDashboard.tsx`  
**Líneas clave:** 23-32 (declaración de campos) · 60-66 (llamada)

```ts
// Líneas 23-29 — SUMA (flujos volumétricos)
BALANCE_SUM_FIELDS = [
  'ingreso_ptap', 'potable_ptap', 'carrotanques_m3', 'mulas_funza_m3',
  'entrada_ro1',  'permeado_ro1', 'rechazo_ro1',
  'permeado_mbr1','permeado_mbr2','envio_th',
  'acueducto_m3', 'total_agua_limpia_m3', 'consumo_gem_m3',
  'lavanderia_m3','tintoreria_m3','rotativa_m3',
]

// Líneas 30-32 — PROMEDIO (ratios y eficiencias)
BALANCE_AVG_FIELDS = [
  'eficiencia_ro_pct',
  'indicador_lav_l_und', 'indicador_tin_l_kg', 'indicador_rot_l_m',
]
```

| Campo | Tipo | Operación |
|---|---|---|
| `envio_th`, `entrada_ro1`, `lavanderia_m3`… | m³ | **SUMA** |
| `eficiencia_ro_pct` | % recuperación | **PROMEDIO** |
| `indicador_lav_l_und` | L/unidad efectiva | **PROMEDIO** |
| `indicador_tin_l_kg` | L/kg tela | **PROMEDIO** |
| `indicador_rot_l_m` | L/m tela | **PROMEDIO** |

---

## Dashboard Costos Químicos

**Archivo:** `ptar-app/src/features/costos/CostosDashboard.tsx`  
**Funciones:** `byGranularidad()` · `gemPorGranularidad()`

### Consumo diario de reactivos (`byGranularidad`)

| Campo | Tipo | Operación |
|---|---|---|
| `kg_dia`, `L_dia` | kg / litros consumidos | **SUMA** |
| `costo_dia` | COP del período | **SUMA** |
| `caudal_m3_dia` | m³ tratados | **SUMA** |
| `ppm_promedio_dia` | mg/L dosis | **PROMEDIO** |

### GEM $/m³ (`gemPorGranularidad`)

| Campo | Tipo | Operación |
|---|---|---|
| `caudal_m3` | m³ tratados GEM | **SUMA** |
| `pesos_por_m3` | $/m³ operación química | **PROMEDIO** |

---

## Dashboard Calidad del Agua

### Secciones sin eje X temporal (no se agregan)

- **Frecuencia** (histograma)
- **Distribución** (pie chart)
- **Distribución Percentil**
- **Tablas estadísticas** (Parámetros, Rangos, Percentiles)

Estas secciones calculan estadísticas sobre **todos los valores del período** como un conjunto. El rango de fechas los filtra, pero no hay agrupación por día/semana/mes.

**Archivo:** `CalidadDashboardPage.tsx` líneas 60-75  
`valoresFlat = rawRows.map(r => r.valor)` — sin agrupación temporal.

---

### Remoción Sistema GEM

**Archivo:** `ptar-app/src/features/calidad/components/RemociónGemSection.tsx`  
**Función:** `agruparRemociones()` — líneas 62-113

| Modo | Líneas | Comportamiento |
|---|---|---|
| Turno | 70-79 | Un punto por turno: `"02/Jun T2"` |
| Día/Semana/Mes | 82-112 | Agrupa turnos en buckets; `ent[]`, `sal[]`, `pct[]` |

| Campo | Tipo | Operación | Línea de cálculo |
|---|---|---|---|
| `pulmon` (Homo) | mg/L concentración | **PROMEDIO** | L90, L108: `avg(b.ent)` |
| `gem_salida` | mg/L concentración | **PROMEDIO** | L91, L109: `avg(b.sal)` |
| `pct_remocion_gem` | % remoción | **PROMEDIO** | L92, L110: `avg(b.pct)` |

```ts
// Línea 94-95
const avg = (arr) => arr.reduce((a,v) => a+v, 0) / arr.length
```

---

### % Remoción Parámetro vs $Costo/m³

**Archivo:** `ptar-app/src/features/calidad/components/RemocionCostoChart.tsx`  
**Bloque:** `useMemo` líneas 118-167

| Modo | Líneas | Comportamiento |
|---|---|---|
| Turno | 151-166 | Un punto por turno, `rawData` directo |
| Día/Semana/Mes | 121-149 | Agrupa en buckets `rem[]` y `costo[]` |

| Campo | Tipo | Operación | Línea |
|---|---|---|---|
| `remocion` | % (decimal 0.xx) | **PROMEDIO** | L130, L148: `avg(b.rem)` |
| `costoM3` | $/m³ | **PROMEDIO** | L131, L147: `avg(b.costo)` |

---

### Parámetro vs Dosis de Químico

**Archivo:** `ptar-app/src/features/calidad/components/ParamVsDosisSection.tsx`  
**Bloque:** `useMemo` líneas 87-151

| Modo | Líneas | Comportamiento |
|---|---|---|
| Turno | 143-151 | Un punto por turno, `toRow()` limpia ceros |
| Día/Semana/Mes | 101-141 | Agrupa en buckets con array por campo |

| Campo | Tipo | Operación | Línea |
|---|---|---|---|
| `entrada` | mg/L concentración entrada GEM | **PROMEDIO** | L117, L137 |
| `salida` | mg/L concentración salida GEM | **PROMEDIO** | L118, L138 |
| `ppm_acido` | mg/L dosis ácido | **PROMEDIO** | L121, L139 |
| `ppm_coagulante` | mg/L dosis coagulante | **PROMEDIO** | L121, L139 |
| `ppm_decolorante` | mg/L dosis decolorante | **PROMEDIO** | L121, L139 |
| `ppm_pol_anionico` | mg/L dosis pol. aniónico | **PROMEDIO** | L121, L139 |
| `ppm_pol_cationico` | mg/L dosis pol. catiónico | **PROMEDIO** | L121, L139 |

```ts
// Línea 130-131
const avg = (arr) => arr.reduce((a,v) => a+v, 0) / arr.length
```

---

### Carga Removida kg/Día

**Archivo:** `ptar-app/src/features/calidad/components/CargaRemovoidaSection.tsx`  
**Función:** `reagruparCarga()` — líneas 49-84

> **Nota importante:** El hook `useCargaRemovida` ya agrupa los 3 turnos
> en 1 punto diario internamente (calcula kg por turno y suma al día).
> `reagruparCarga` solo agrega de **día → semana/mes**.

| Modo | Línea 56 | Comportamiento |
|---|---|---|
| Turno / Día | `return pts` | Devuelve el dato diario del hook sin modificar |
| Semana / Mes | 57-83 | Agrega los días en buckets por período |

| Campo | Tipo | Operación | Línea |
|---|---|---|---|
| `kgRemovidos` | kg contaminante removido | **SUMA** | L65: `b.kgSum += p.kgRemovidos` |
| `indicadorKgM3` | kg_quimico/kg_removido | **PROMEDIO** | L66, L81: `avg(b.indArr)` |

`kgRemovidos` se **suma** porque es masa física acumulada:  
Si la semana removió 100 kg el lunes y 80 kg el martes → la semana removió 180 kg.

---

### Kg Químico / Kg Removido

**Archivo:** `ptar-app/src/features/calidad/components/KgQuimicoSection.tsx`  
**Función:** `reagruparKgQuimico()` — líneas 55-93

> Igual que Carga Removida: el hook ya devuelve datos por día.
> `reagruparKgQuimico` solo agrega de **día → semana/mes**.

| Modo | Línea 62 | Comportamiento |
|---|---|---|
| Turno / Día | `return pts` | Devuelve el dato diario sin modificar |
| Semana / Mes | 63-93 | Agrega los días en buckets por período |

| Campo | Tipo | Operación | Línea |
|---|---|---|---|
| `coagulanteRatio` | kg_coag / kg_removido | **PROMEDIO** | L71, L89 |
| `decoloranteRatio` | kg_deco / kg_removido | **PROMEDIO** | L72, L90 |
| `polAnionicoRatio` | kg_pola / kg_removido | **PROMEDIO** | L73, L91 |
| `cationicoRatio` | kg_cati / kg_removido | **PROMEDIO** | L74, L92 |
| `kgRemovidos` | kg contaminante removido | **SUMA** | L75: `b.kg += p.kgRemovidos` |

---

## Tabla resumen — todas las gráficas

```
DASHBOARD           GRÁFICA                    CAMPO                  OPERACIÓN
────────────────────────────────────────────────────────────────────────────────
Balance             Flujos hídricos            m³ (envio_th, etc.)    SUMA
Balance             Fuentes agua               m³                     SUMA
Balance             Eficiencia RO              % recuperación         PROMEDIO
Balance             Indicadores prod.          L/und, L/kg, L/m       PROMEDIO

Costos              Consumo reactivos           kg_dia, costo_dia     SUMA
Costos              PPM diario                 ppm_promedio_dia       PROMEDIO
Costos              GEM $/m³                   pesos_por_m3           PROMEDIO
Costos              GEM caudal                 caudal_m3              SUMA

Calidad             Frecuencia/Pie/Percentil   —                      SIN AGREGAR
Calidad             Remoción GEM               pulmon, gem_salida     PROMEDIO
Calidad             Remoción GEM               pct_remocion_gem       PROMEDIO
Calidad             % Rem vs $Costo            remocion, costoM3      PROMEDIO
Calidad             Param vs Dosis             entrada, salida        PROMEDIO
Calidad             Param vs Dosis             ppm_*                  PROMEDIO
Calidad             Carga Removida             kgRemovidos            SUMA
Calidad             Carga Removida             indicadorKgM3          PROMEDIO
Calidad             Kg Quimico                 *Ratio (kg/kg)         PROMEDIO
Calidad             Kg Quimico                 kgRemovidos            SUMA
```

---

## Toggle "Días sin datos"

Cuando está **activo**, se genera el conjunto completo de períodos del rango
con `generateAllPeriods()` (`agruparTemporal.ts` líneas 89-129) y se añaden
buckets vacíos (valor = 0 / null) para los períodos sin registro.

| Granularidad | Genera |
|---|---|
| Día | Un bucket por cada fecha del rango |
| Semana | Un bucket por cada semana ISO del rango |
| Mes | Un bucket por cada mes del rango |

Aplica en las 5 secciones con gráficas temporales del dashboard de Calidad
y en todos los gráficos del Balance y Costos.
