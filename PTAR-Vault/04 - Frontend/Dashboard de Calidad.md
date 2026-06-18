# Dashboard de Calidad del Agua

**Archivo principal:** `ptar-app/src/features/calidad/CalidadDashboardPage.tsx`

## Sección 1 — Distribución y Comportamiento Multiparámetro ✅

Aparece **primero**, debajo de los filtros globales.

### Gráficos (3 en fila)

| Gráfico | Tipo | Descripción |
|---------|------|-------------|
| `HistogramaChart` | Barras verticales | Frecuencia por 5 rangos fijos — colores: rojo→amarillo→verde→morado→azul |
| `PieDistribucionChart` | Torta | Porcentaje por cada uno de los 5 rangos |
| `PercentilChart` | Barras horizontales | P0(MIN) hasta P100 cada 10%, P100 arriba, verde uniforme |

### Tablas (3 columnas debajo de los gráficos)

| Tabla | Contenido |
|-------|-----------|
| `TablaParams` | MÍNIMO / MÁXIMO / AMPLITUD / #DATOS / #RANGOS=5 / TAMAÑO |
| `TablaRangos` | 5 rangos con MÍN/MÁX/RANGO/FRECUENCIA/%FREC + fila TOTAL |
| `TablaPercentiles` | 11 filas con scroll, header sticky, `maxHeight:162px` |

### Reglas de cálculo

```typescript
valoresFlat   // filtro: v > 0 (excluye ceros Y negativos)
bins          // (MAX - MIN) / 5  — siempre 5 rangos fijos
labelRango    // "min - max" con 2 decimales y espacio-guion-espacio
P100          // percentileInc(0.999) — igual que PERCENTILE() de Excel
```

---

## Sección 2 — Remoción Sistema GEM ✅

### Layout
- Dropdown **PARÁMETRO** (filtro INDEPENDIENTE del dashboard global — clase `cal-filter-select`)
- Parámetros derivados de datos reales de la BD (no hardcodeados)
- Gráfico `ComposedChart` ancho completo:
  - Barras: Entrada (azul) + Salida (morado)
  - Línea: Remoción% (verde) — eje secundario
- 3 tablas en fila: **Entrada GEM** | **Salida GEM** | **% Eficiencia Remoción**

### Datos de la BD

| Campo | Fuente en BD |
|-------|-------------|
| Entrada | `r.pulmon` |
| Salida GEM | `r.gem_salida` |
| % Eficiencia | `r.pct_remocion_gem` |

### Reglas especiales
- Stats usan filtro `v !== 0` (incluye negativos — para ORP)
- **CV% > 30%** → mostrar en naranja (alta variabilidad)

---

## Secciones pendientes 🔴

| Sección | Estado |
|---------|--------|
| Sección 3 — Osmosis Inversa | No implementada |
| Sección 4 — KPIs generales | No implementada |
| Otras secciones | No definidas |

---

Tags: #dashboard #calidad #graficos #estadistica
