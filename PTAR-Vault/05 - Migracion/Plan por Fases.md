# Plan de Migración — Supabase → FastAPI + MySQL

## Contexto

La app PTAR debe migrarse de **Vercel + Supabase** a **FastAPI + MySQL** en el servidor corporativo.

- **Razón:** Política corporativa — los datos deben vivir en servidor interno
- **Puerto destino:** `wserver.permoda.com.co:8001`
- **Patrón a seguir:** `almacen-permoda-backend/` (mismo stack, puerto 8000)

---

## Fases de Migración

### Fase 1 — Limpieza Frontend
- [ ] Eliminar `supabase.ts` como cliente de datos
- [ ] Crear `ptarClient.ts` (cliente fetch() hacia FastAPI)
- [ ] Actualizar imports en todos los hooks

### Fase 2 — Crear Backend FastAPI
- [ ] Crear `ptar-backend/` con estructura base
- [ ] Configurar `pydantic-settings` para variables de entorno
- [ ] SQLAlchemy async + aiomysql
- [ ] Raw SQL con `text()` (sin ORM)
- [ ] Copiar patrón de `almacen-permoda-backend/`

### Fase 3 — Schema MySQL (4 tablas)
- [ ] `ptar_registro_contadores`
- [ ] `ptar_registro_costos`
- [ ] `ptar_registro_calidad`
- [ ] `usuarios` (para reemplazar mock auth)

### Fase 4 — 11 Endpoints
- [ ] `POST /auth/login`
- [ ] `GET  /auth/me`
- [ ] `POST /caudales` + `GET /caudales`
- [ ] `POST /reactivos` + `GET /reactivos`
- [ ] `POST /calidad` + `GET /calidad`
- [ ] `GET  /dashboard/kpis`
- [ ] `GET  /health`
- [ ] `GET  /semana-activa`

### Fase 5 — Migrar Polling
- [ ] Reemplazar `useRegistrosPolling.ts` de Supabase SDK a `fetch()`
- [ ] Mantener intervalo de 15s (Zscaler bloquea WebSockets)

### Fase 6 — Servir Frontend desde FastAPI
- [ ] Configurar FastAPI para servir `dist/` estático
- [ ] `npm run build` → copiar dist/ al servidor

### Fase 7 — PDF de Informes
- [ ] Evaluar: `reportlab` vs `weasyprint`
- [ ] Endpoint `GET /informes/pdf`
- [ ] Diseño del informe (por turno / por semana)

### Fase 8 — Migración de Datos
- [ ] Exportar Supabase → CSV
- [ ] Script de importación CSV → MySQL
- [ ] Validar integridad de datos

### Fase 9 — Deploy en Servidor
- [ ] Puerto 8001 (libre, almacén usa 8000)
- [ ] Configurar NSSM como servicio Windows
- [ ] Variables de entorno en servidor
- [ ] Pruebas de conectividad desde red Permoda

---

## Referencias

- **Patrón del Almacén:**
  `C:\Users\davidan\OneDrive - PERMODA LTDA\Documents\Claude\App Almacen Permoda\almacen-permoda-backend\`
- **Backend PTAR en construcción:**
  `ptar-backend/` (en el repo)

---

Tags: #migracion #fastapi #mysql #plan
