# Reactivos Químicos

## Resumen

- **Total químicos monitoreados:** 5
- **Tabla:** `ptar_registro_costos`
- **Constantes:** `ptar-app/src/lib/constants/`

## Químicos de la PTAR

| ID | Químico | Uso principal |
|----|---------|--------------|
| Q01 | Coagulante (ej: Sulfato de Aluminio) | Tratamiento primario |
| Q02 | Floculante (ej: Poliacrilamida) | Sedimentación |
| Q03 | Desinfectante (ej: Hipoclorito) | Desinfección efluente |
| Q04 | pH ajustador (ácido/base) | Control pH |
| Q05 | Antiincrustante (RO) | Protección membranas OI |

> ⚠️ Los nombres exactos están en `constants/quimicos.ts`. Verificar antes de editar.

## Columnas calculadas

```sql
-- PPM calculado según caudal y dosis
ppm = (consumo_l * 1000) / caudal_tratado_m3

-- Costo operativo en COP/m³
costo_operativo = (consumo_l * precio_litro) / caudal_tratado_m3
```

Estos valores son **columnas generadas** en la BD o calculados en el formulario.

## Costos de referencia (PDF interno)

Los equipos tienen rangos de costo documentados en el PDF de referencia:
`Proceso - Mapa de funcionamiento de la PTAR (1).pdf`

Equipos con datos reales del PDF:
- `tk60m3` — Tanque igualador 60m³
- `cribRot` — Criba rotativa
- `mbbr` — Reactor MBBR
- `anoxic` — Zona anóxica
- `filtrosII` — Filtros secundarios
- `ro1e1`, `ro1e2` — Osmosis Inversa línea 1
- `ro2` — Osmosis Inversa línea 2
- `tkRecir` — Tanque recirculación

---

Tags: #quimicos #reactivos #costos
