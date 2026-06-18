# Deuda Técnica Conocida

Lista de pendientes técnicos con impacto en producción o calidad.

---

## 🔴 Crítica

### Auth completamente mock
- **Archivo:** `ptar-app/src/state/AuthContext.tsx`
- **Problema:** Los usuarios están hardcodeados. No hay sesión real ni validación.
- **Riesgo:** Cualquier persona que conozca la URL puede acceder.
- **Solución:** Implementar auth con Supabase Auth o tabla `usuarios` en MySQL.

### Dashboard KPIs usa datos falsos
- **Archivo:** `ptar-app/src/features/dashboard/mockData.ts`
- **Problema:** Los KPIs del dashboard principal no reflejan datos reales de la BD.
- **Solución:** Crear endpoint `GET /dashboard/kpis` y conectar al hook real.

### Supabase RLS posiblemente abierto
- **Problema:** La `anon key` de Supabase podría permitir acceso sin autenticar a las tablas.
- **Riesgo:** Exposición de datos de la planta sin autenticación.
- **Solución:** Revisar políticas RLS en Supabase o migrar a MySQL con auth interna.

---

## 🟡 Media

### Costos de equipos sin datos reales
- **Archivo:** `ptar-app/src/features/splash/SplashScreen.tsx` (equipment.ts)
- **Problema:** Varios equipos tienen valores placeholder `$XXXk/mes`.
- **Datos reales disponibles en:** PDF interno `Proceso - Mapa de funcionamiento de la PTAR (1).pdf`
- **Solución:** Leer el PDF y actualizar los valores en `equipment.ts`.

### PDF de informes no implementado
- **Problema:** El sistema no genera informes exportables.
- **Solución:** Fase 7 de la migración (reportlab o weasyprint en FastAPI).

### Dashboard Calidad — secciones 3+ pendientes
- **Secciones pendientes:**
  - Osmosis Inversa (análisis de permeado/rechazo)
  - KPIs globales de eficiencia
  - Comparativa histórica

---

## 🟢 Baja (mejoras deseables)

### Polling de 15 segundos (no WebSocket)
- **Razón:** Zscaler corporativo bloquea WebSockets.
- **Estado:** Workaround aceptado. No es urgente cambiar.

### Sin manejo de errores en formularios
- **Problema:** Si Supabase falla, el usuario no ve feedback claro.
- **Solución:** Agregar toast notifications o manejo de error explícito.

---

Tags: #deuda #pendientes #bugs
