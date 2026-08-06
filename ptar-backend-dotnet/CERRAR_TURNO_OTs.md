# Cerrar Turno — Descripción de Pedidos de Trabajo (OTs)

## Cómo debería funcionar

Al hacer clic en **Cerrar Turno** en la vista del operario, el modal consulta
`GET /api/turno/resumen` y muestra en la sección **Órdenes de Trabajo — Hoy · PTAR BOG**
la lista de OTs pendientes para el día actual.

Cada fila muestra:
- **Línea principal** → `descripcion` del pedido de trabajo (texto largo de SharePoint, p. ej. "Limpiar filtros de membrana RO1 según procedimiento M-023")
- **Línea secundaria** → `objeto` (nombre corto del equipo, p. ej. "Bomba centrífuga RO1")
- **Chip de criticidad** → ALTA / MEDIA / BAJA
- **Enlace "Ver ↗"** → abre el ítem directamente en SharePoint (lista CONFIABILIDAD)

Si la fila muestra **"Sin descripción"** en vez del texto real, el problema está
en la base de datos, no en el código.

---

## Flujo de datos

```
SharePoint (lista CONFIABILIDAD)
        ↓  field_7 = descripcion del pedido
SharePointSyncService.cs   ←  corre cada 1 h al arrancar el backend
        ↓  INSERT … ON DUPLICATE KEY UPDATE descripcion = @Descripcion
MySQL: mantenimientos_preventivos.descripcion
        ↓
TurnoController.cs  →  SELECT … descripcion … FROM mantenimientos_preventivos
        ↓
ResumenTurnoModal.tsx  →  label = ot.descripcion || ot.objeto || "Sin descripción"
```

---

## Por qué aparece "Sin descripción"

### Causa 1 — Columna ausente en la BD (la más común al clonar fresh)

El campo `descripcion` se agregó al sync **después** de que la tabla fue creada
la primera vez. Si la BD se restauró desde un respaldo anterior, la columna
puede no existir.

**Verificar:**
```sql
SHOW COLUMNS FROM mantenimientos_preventivos LIKE 'descripcion';
```

Si no devuelve nada, ejecutar:
```sql
ALTER TABLE mantenimientos_preventivos
  ADD COLUMN descripcion TEXT NULL AFTER af;
```

### Causa 2 — Columna existe pero está vacía (sync no ha corrido desde el ALTER)

La columna existe pero todos los registros tienen `NULL` porque el sync se
ejecutó antes de que la columna existiera y nunca se repitió.

**Verificar:**
```sql
SELECT COUNT(*) AS total,
       SUM(descripcion IS NULL)     AS sin_desc,
       SUM(descripcion IS NOT NULL) AS con_desc
FROM mantenimientos_preventivos
WHERE UPPER(gft) = 'PTAR BOG';
```

**Solución:** reiniciar el backend — al arrancar, `SharePointSyncService`
corre inmediatamente y hace `ON DUPLICATE KEY UPDATE descripcion = @Descripcion`
en todos los registros, rellenando los `NULL`.

```powershell
# Desde ptar-backend-dotnet/
dotnet run --project PtarApi
```

O, si ya corre en producción, bastará con reiniciar el proceso.
El sync inicial tarda ~30 s.

### Causa 3 — `field_7` vacío en SharePoint

SharePoint almacena la descripción en la columna `field_7` de la lista
CONFIABILIDAD. Si ese campo está vacío para un ítem, `descripcion` quedará
`NULL` en la BD aunque el sync funcione correctamente.

**Verificar en SharePoint:** abrir la lista → buscar el ítem por ID
(`sharepoint_id` en la BD) → confirmar que el campo **Descripción / Tarea**
tiene texto.

Si está vacío en SharePoint, hay que completarlo allí; el backend lo
sincronizará en el siguiente ciclo (máx. 1 hora) o al reiniciar.

---

## Pasos de diagnóstico rápido para Luna

1. Conectar a MySQL (`ptar_permoda`) y ejecutar:

```sql
-- ¿Existe la columna?
SHOW COLUMNS FROM mantenimientos_preventivos LIKE 'descripcion';

-- ¿Cuántos registros PTAR BOG tienen descripción hoy?
SELECT objeto, descripcion
FROM mantenimientos_preventivos
WHERE DATE(dia_programado) = CURDATE()
  AND UPPER(gft) = 'PTAR BOG'
  AND UPPER(estado) NOT LIKE '%COMPLET%'
ORDER BY CASE criticidad WHEN 'ALTA' THEN 1 WHEN 'MEDIA' THEN 2 ELSE 3 END;
```

2. Si la columna no existe → ejecutar el `ALTER TABLE` de la Causa 1.
3. Si existe pero está vacía → reiniciar el backend (Causa 2).
4. Si tiene datos en BD pero no en el modal → problema en la API o el frontend;
   verificar la respuesta de `GET /api/turno/resumen` directamente en el navegador
   o Postman con un token válido.

---

## Referencia de campos SharePoint → BD

| Campo SharePoint | Columna BD              | Descripción                              |
|-----------------|-------------------------|------------------------------------------|
| `ID`            | `sharepoint_id`         | ID único del ítem en SharePoint          |
| `field_1`       | `semana`                | Semana programada                        |
| `field_5`       | `objeto`                | Nombre corto del equipo / tarea          |
| **`field_7`**   | **`descripcion`**       | **Texto completo del pedido de trabajo** |
| `field_10`      | `responsable`           | Responsable asignado                     |
| `field_11`      | `pedido_de_trabajo`     | Número de pedido SAP                     |
| `field_12`      | `estado`                | Estado (PENDIENTE / COMPLETADO)          |
| `field_13`      | `dia_programado`        | Fecha programada                         |
| `CRITICIDAD`    | `criticidad`            | ALTA / MEDIA / BAJA                      |
