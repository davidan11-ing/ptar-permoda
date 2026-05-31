# Actualizaciones de Sesión — PTAR Permoda
**Fecha:** 2026-05-31  
**Commit anterior:** `8fe9e9a`

---

## 1. Panel de Edición de Registros del Operario (Encargado)

### Nuevos archivos frontend
| Archivo | Descripción |
|---|---|
| `ptar-app/src/features/encargado/RegistrosPanel.tsx` | Panel principal con 3 tabs: Calidad / Reactivos / Caudales |
| `ptar-app/src/features/encargado/components/TablaCalidad.tsx` | Tabla editable de `medicion_calidad` (F-03) |
| `ptar-app/src/features/encargado/components/TablaReactivos.tsx` | Tabla editable de `operacion_gem_turno` (F-02) |
| `ptar-app/src/features/encargado/components/TablaCaudales.tsx` | Tabla editable de `contadores_lectura` (F-01) |

### Archivos modificados frontend
- `ptar-app/src/lib/routes.ts` → agregada ruta `ENCARGADO_REGISTROS: '/encargado/registros'`
- `ptar-app/src/app/Router.tsx` → agregada ruta `/encargado/registros`
- `ptar-app/src/features/dashboard/DashboardPage.tsx` → botón "📋 Registros Operarios" en header

### Nuevos endpoints backend
- `GET/PUT /api/calidad/edicion` — listado y edición de `medicion_calidad`
- `GET/PUT /api/reactivos/edicion-gem` — listado y edición de `operacion_gem_turno`
- `GET/PUT /api/caudales/edicion` — listado y edición de `contadores_lectura`

Archivos backend modificados:
- `ptar-backend/app/routes/calidad.py`
- `ptar-backend/app/routes/reactivos.py`
- `ptar-backend/app/routes/caudales.py`

---

## 2. Fixes al Dashboard de Calidad

### PieDistribucionChart.tsx
- **Bug corregido:** el gráfico de torta filtraba los rangos con `count=0` con `.filter(b => b.count > 0)`, mostrando solo 1 slice
- **Fix:** ahora devuelve los 5 rangos siempre (igual que el histograma), los vacíos aparecen en la leyenda

### Fixes en calidad.py
- `mc.no_aplica = 0` → reemplazado por `mc.valor > 0` (columna `no_aplica` no existía en medicion_calidad)
- `mc.metodo, mc.usuario` en SELECT → `NULL AS metodo, mc.usuario` (metodo no existe en tabla)
- Búsqueda parámetro/unidad: exact match primero, substring como fallback
- `GET /calidad/parametros`: alias `unidad` → `unidad_medida` para coincidir con frontend
- Nuevos endpoints de edición (ver sección 1)

### Columnas agregadas a `medicion_calidad` (MySQL)
```sql
ALTER TABLE medicion_calidad
  ADD COLUMN usuario    VARCHAR(255) DEFAULT NULL,
  ADD COLUMN equipo     TEXT         DEFAULT NULL,
  ADD COLUMN no_aplica  TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP;
```

---

## 3. Fix Navbar — Logo navega al SVG

- `ptar-app/src/components/layout/Navbar.tsx`
- El logo PTAR + texto "Sistema de Gestión" ahora son un `<Link to="/">` que lleva al diagrama SVG

---

## 4. Responsive Scaling — toda la app

### `ptar-app/src/index.css`
```css
/* ANTES */
.main-content { padding: 24px; max-width: 1400px; margin: 0 auto; }
.cal-page { max-width: 1200px; margin: 0 auto; }
.dashboard { display: flex; flex-direction: column; gap: 20px; }

/* DESPUÉS */
.main-content { padding: 16px 20px; width: 100%; }
.cal-page { width: 100%; max-width: 100%; margin: 0; }
.dashboard { width: 100%; display: flex; flex-direction: column; gap: 20px; }
.dash-section { width: 100%; }
```

Breakpoints nuevos añadidos (1600px+) para dashboards grandes.

### `ptar-app/src/styles/splash.css`
- `.splash-inner` max-width: `1560px` → `min(1900px, 98vw)` — diagrama más grande en pantallas anchas
- `.splash-page` padding reducido para maximizar el área del SVG

### Otros CSS (base, navbar, calidad, dashboard)
- Padding con `clamp()` en navbar
- Breakpoints responsivos para 1600px+

---

## 5. Cloudflare Tunnel — allowedHosts

### `ptar-app/vite.config.ts`
```typescript
// Agregado para permitir acceso externo vía Cloudflare Tunnel
allowedHosts: true,
```

Sin este cambio, Vite bloquea los dominios `trycloudflare.com` con "Blocked request".

---

## 6. Correcciones en caudales.py

- Endpoint `GET /api/caudales/edicion`: eliminada columna `usuario` del SELECT (no existe en `contadores_lectura`)
- Fix `TURNO_HORA_MAP`: mañana→06h, tarde→14h, noche→22h (estaba invertido)

---

## 7. Cambios en Base de Datos MySQL

### Tabla `medicion_calidad` — columnas agregadas
```sql
ALTER TABLE medicion_calidad
  ADD COLUMN usuario    VARCHAR(255) DEFAULT NULL AFTER observacion,
  ADD COLUMN equipo     TEXT         DEFAULT NULL AFTER usuario,
  ADD COLUMN no_aplica  TINYINT(1)   NOT NULL DEFAULT 0 AFTER equipo,
  ADD COLUMN updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                        ON UPDATE CURRENT_TIMESTAMP AFTER no_aplica;
```

### Tabla `operacion_gem_turno` — valores calculados
```sql
-- Calculados los 5 PPM desde kg y caudal
UPDATE operacion_gem_turno SET
  ppm_acido         = ROUND(kg_acido         * 1000 / caudal_total_tratado_gem_m3, 4),
  ppm_coagulante    = ROUND(kg_coagulante     * 1000 / caudal_total_tratado_gem_m3, 4),
  ppm_decolorante   = ROUND(kg_decolorante    * 1000 / caudal_total_tratado_gem_m3, 4),
  ppm_pol_anionico  = ROUND(kg_pol_anionico   * 1000 / caudal_total_tratado_gem_m3, 4),
  ppm_pol_cationico = ROUND(kg_pol_cationico  * 1000 / caudal_total_tratado_gem_m3, 4)
WHERE caudal_total_tratado_gem_m3 > 0;

-- pesos_por_m3 calculado
UPDATE operacion_gem_turno
SET pesos_por_m3 = ROUND(costo_quimica_turno / caudal_total_tratado_gem_m3, 2)
WHERE caudal_total_tratado_gem_m3 > 0;
```

### Tabla `estado_equipo` — creada
```sql
CREATE TABLE IF NOT EXISTS estado_equipo (
  id          INT           NOT NULL AUTO_INCREMENT,
  fecha       DATE          NOT NULL,
  turno       TINYINT       NOT NULL,
  equipo_key  VARCHAR(100)  NOT NULL,
  estado      VARCHAR(50)   NOT NULL DEFAULT 'operativo',
  observacion TEXT          DEFAULT NULL,
  usuario     VARCHAR(255)  DEFAULT NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_estado_equipo_turno (fecha, turno, equipo_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 8. SplashScreen.tsx — tooltips fase preliminar

Corregidos tooltips de D. ROTATIVA, D. FUNZA, D. TINTORERÍA, D. LAVANDERÍA, LAV. REMOTA:
- Agregado `flipY:true` → aparecen hacia abajo (antes se salían de pantalla hacia arriba)
- LAV. REMOTA: sin `flipY` (aparece hacia arriba para no cortarse abajo)

---

## Cómo aplicar los cambios de BD en otro PC

Al clonar/actualizar en otro equipo, ejecutar manualmente en MySQL:

```sql
USE ptar_permoda;

-- 1. Columnas medicion_calidad
ALTER TABLE medicion_calidad
  ADD COLUMN IF NOT EXISTS usuario    VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS equipo     TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS no_aplica  TINYINT(1)   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 2. Tabla estado_equipo
CREATE TABLE IF NOT EXISTS estado_equipo (
  id INT NOT NULL AUTO_INCREMENT, fecha DATE NOT NULL, turno TINYINT NOT NULL,
  equipo_key VARCHAR(100) NOT NULL, estado VARCHAR(50) NOT NULL DEFAULT 'operativo',
  observacion TEXT DEFAULT NULL, usuario VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_estado_equipo_turno (fecha, turno, equipo_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Calcular PPM y pesos_por_m3 (solo si hay datos)
UPDATE operacion_gem_turno SET
  ppm_acido=ROUND(kg_acido*1000/caudal_total_tratado_gem_m3,4),
  ppm_coagulante=ROUND(kg_coagulante*1000/caudal_total_tratado_gem_m3,4),
  ppm_decolorante=ROUND(kg_decolorante*1000/caudal_total_tratado_gem_m3,4),
  ppm_pol_anionico=ROUND(kg_pol_anionico*1000/caudal_total_tratado_gem_m3,4),
  ppm_pol_cationico=ROUND(kg_pol_cationico*1000/caudal_total_tratado_gem_m3,4),
  pesos_por_m3=ROUND(costo_quimica_turno/caudal_total_tratado_gem_m3,2)
WHERE caudal_total_tratado_gem_m3 > 0;
```
