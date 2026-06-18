# Contadores y Medidores

## Resumen

- **Total contadores:** 35
- **Tabla:** `ptar_registro_contadores`
- **Constantes:** `ptar-app/src/lib/constants/`

## Tipos de medidores

Los 35 contadores se clasifican por tipo de flujo:

| Tipo | Descripción |
|------|-------------|
| Caudal entrada | Agua cruda que ingresa a la planta |
| Caudal tratado | Agua después de tratamiento primario/secundario |
| Caudal terciario | Agua después de filtración y RO |
| Recirculación | Flujos internos (lodos, rechazos) |
| Vertimiento | Agua que sale al cuerpo receptor |
| Reúso | Agua tratada para uso industrial interno |

## Cálculo delta_m³

La columna `delta_m3` se calcula automáticamente:

```sql
delta_m3 = lectura_actual - lectura_anterior
```

Esta es una **columna generada** en PostgreSQL — no se ingresa directamente, se calcula al hacer INSERT con ambas lecturas.

## Referencia en el código

```
ptar-app/src/lib/constants/contadores.ts  ← definición de los 35 IDs y nombres
ptar-app/src/features/operario/FormatoCaudales.tsx  ← formulario de captura
```

---

Tags: #contadores #medidores #caudales
