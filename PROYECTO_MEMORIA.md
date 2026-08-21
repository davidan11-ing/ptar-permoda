# MEMORIA COMPLETA — App PTAR (PETAR PERMODA)
> Generada: 2026-05-06 | Actualizada: 2026-08-20 (migración Supabase→MySQL/.NET y deploy local reflejados) | Usar en cualquier chat de Claude para retomar el proyecto sin perder contexto.

---

## 1. IDENTIDAD DEL PROYECTO

| Campo | Valor |
|---|---|
| **Nombre app** | ptar-app |
| **Empresa** | PERMODA LTDA |
| **Propósito** | Sistema de gestión operativa de la Planta de Tratamiento de Aguas Residuales (PTAR) de la fábrica textil |
| **Despliegue** | Local — red interna PERMODA (sin nube, sin Vercel) |
| **Dev server** | http://localhost:5174 |
| **Email usuario** | davidan@permoda.com.co |

---

## 2. STACK TECNOLÓGICO

```
Frontend:   React 19 + TypeScript strict (5.6.2) + Vite 6.0.5
Routing:    React Router DOM 6.28
Forms:      React Hook Form 7.53 + Zod 3.23 (validación)
Charts:     Recharts 2.14
Toasts:     react-hot-toast 2.4
Backend:    .NET 10 (ASP.NET Core) + MySQL — ver ptar-backend-dotnet/
Deploy:     Local — red interna PERMODA (sin Vercel, sin nube)
```

### Dependencias exactas (package.json)
```json
"@fortune-sheet/react": "^1.0.4",
"@hookform/resolvers": "^3.9.0",
"chartmix": "^0.2.0",
"hyperformula": "^3.3.0",
"react": "^19.0.0",
"react-dom": "^19.0.0",
"react-error-boundary": "^5.0.0",
"react-hook-form": "^7.53.0",
"react-hot-toast": "^2.4.1",
"react-router-dom": "^6.28.0",
"recharts": "^2.14.0",
"zod": "^3.23.8"
```
No hay dependencia de Supabase — se retiró junto con la migración al backend .NET.

---

## 3. ESTRUCTURA DE ARCHIVOS

```
App_PTAR_SQL/                          ← raíz del repo git (origin: davidan11-ing/ptar-permoda)
├── CLAUDE.md                          ← instrucciones de proyecto para Claude Code
├── PROYECTO_MEMORIA.md                ← ESTE ARCHIVO
├── ptar-app/                          ← Frontend (React + Vite)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx                   ← entry point
│       ├── App.tsx                    ← AuthProvider + AppRouter
│       ├── app/
│       │   ├── Router.tsx             ← todas las rutas (lazy loaded)
│       │   ├── Layout.tsx             ← Navbar + NotificationManager + Outlet
│       │   └── guards/RoleGuard.tsx   ← protección por rol
│       ├── state/
│       │   ├── AuthContext.tsx        ← sesión real vía JWT en cookie httpOnly (NO es mock)
│       │   └── ThemeContext.tsx       ← tema claro/oscuro
│       ├── models/index.ts            ← tipos TypeScript del dominio (Role, AppUser, KpiMetric...)
│       ├── services/
│       │   └── ptarClient.ts          ← ⭐ único cliente HTTP hacia el backend .NET (fetch + cookies + refresh 401)
│       ├── lib/
│       │   ├── supabase.ts            ← ⚠️ CÓDIGO MUERTO — nada lo importa, queda de la época Supabase, se puede borrar
│       │   ├── routes.ts              ← constantes de rutas (ROUTES, ROLE_HOME)
│       │   ├── theme.ts, audio.ts
│       │   └── constants/
│       │       ├── contadores.ts      ← contadores de agua con metadatos
│       │       ├── quimicos.ts        ← reactivos químicos con precios
│       │       └── incidencias.ts     ← parámetros calidad + unidades tratamiento
│       ├── hooks/
│       │   ├── useRegistrosPolling.ts ← polling HTTP 15s (sin WebSockets — Zscaler)
│       │   └── useGranularidad.ts
│       ├── components/{layout,notifications,shared}/
│       └── features/
│           ├── splash/SplashScreen.tsx        ← diagrama SVG animado del proceso PTAR
│           ├── auth/LoginPage.tsx
│           ├── operario/                      ← formularios de turno (ver sección 8)
│           ├── dashboard/                      ← KPIs reales (RealKpiSection + widgets/); mockData.ts solo lo usa AdminDashboardPage.tsx
│           ├── calidad/, balance/, costos/     ← dashboards e informes por dominio
│           ├── encargado/                      ← panel de registros del turno
│           ├── mantenimientos/                 ← OTs sincronizadas desde SharePoint
│           └── analista/                       ← vista de análisis cruzado
│
├── ptar-backend-dotnet/                ← Backend activo (.NET 10 / ASP.NET Core)
│   └── PtarApi/
│       ├── PtarApi.csproj              ← TargetFramework net10.0
│       ├── Program.cs                  ← startup + DI + middleware
│       ├── appsettings.json            ← config base (CORS, JWT, connection string, SharePoint)
│       ├── appsettings.Development.json / .Local.json  ← credenciales locales (gitignored)
│       ├── Data/PtarDbContext.cs       ← DbContext mínimo + IDbConnectionFactory (Dapper hace las queries reales)
│       ├── Services/
│       │   ├── JwtService.cs
│       │   ├── SharePointService.cs        ← MSAL + REST API SharePoint
│       │   └── SharePointSyncService.cs    ← BackgroundService, sync cada 1h
│       └── Features/
│           ├── Auth/                   ← login, /me, refresh, change-password
│           ├── Caudales/, Reactivos/, Calidad/, Condiciones/
│           ├── Turno/                  ← cierre de turno, OTs con detalle expandible
│           ├── Equipos/, Mantenimientos/, Dashboard/, Analisis/, Reportes/  ← PDF (QuestPDF) + HTML
│
└── ptar-backend/                       ← Backend Python (FastAPI) — OBSOLETO, reemplazado por el .NET. Puede ignorarse.
```

---

## 4. DEPLOY — LOCAL (red interna PERMODA)

> **IMPORTANTE:** No se usa Vercel ni ningún hosting en la nube. Todo corre en la red interna de PERMODA.

- **Frontend:** `ptar-app/` — se sirve localmente (`npm run dev` para desarrollo). El repo sí tiene git (raíz `App_PTAR_SQL/`), a diferencia de lo que decía una versión anterior de esta nota.
- **Backend:** `ptar-backend-dotnet/PtarApi/` — ASP.NET Core corriendo en `http://localhost:8001` (o el host que corresponda dentro de la red interna), ver `start-backend.ps1` y `ptar-backend-dotnet/SETUP.txt`.
- **Pendiente de documentar:** el mecanismo exacto de cómo se sirve el frontend en producción dentro de la red interna (¿build estático servido por el propio backend .NET? ¿IIS? ¿otro proceso?) y el hostname/puerto real (se ha visto la referencia `wserver.permoda.com.co` en otros archivos, pero no está confirmado el puerto del frontend). Confirmar y actualizar esta sección cuando se defina.

---

## 5. BACKEND — .NET 10 + MySQL

**Ya no existe Supabase en este proyecto.** `ptar-app/src/lib/supabase.ts` sigue en el repo pero es código muerto (nada lo importa) — candidato a borrar.

### Conexión (ptar-backend-dotnet/PtarApi)
- Base de datos: **MySQL** (`ptar_permoda`), acceso vía `Pomelo.EntityFrameworkCore.MySql` (DbContext mínimo) + **Dapper** para las queries reales (la mayoría contra vistas MySQL, no entidades mapeadas).
- Connection string y JWT secret viven en `appsettings.Development.json` / `appsettings.Local.json` (gitignored) — en producción se recomienda `dotnet user-secrets` o variables de entorno.
- El frontend habla con el backend exclusivamente a través de `src/services/ptarClient.ts` (fetch con `credentials: 'include'`, sin SDK de terceros).

### Módulos del backend (`Features/`)
Auth · Caudales · Reactivos · Calidad · Condiciones · Turno (cierre de turno + OTs) · Equipos · Mantenimientos (sync SharePoint) · Dashboard · Analisis · Reportes (PDF/HTML)

38 endpoints en total — lista completa en `ptar-backend-dotnet/SETUP.txt`.

### Integración SharePoint
`SharePointService.cs` + `SharePointSyncService.cs` (BackgroundService) sincronizan mantenimientos/OTs cada 1 hora vía MSAL, usando el token cacheado en `ptar-backend/.sharepoint_token_cache.json` (ruta configurada en `appsettings.json → SharePoint.TokenCacheFile`). Ese token lo genera originalmente `auth_sharepoint.py` del backend Python legado.

### MCP de Claude Code
`mcp__supabase-ptar__` **ya no aplica a este proyecto** — no hay nada en Supabase que consultar. Si necesitas leer datos de producción, es contra el MySQL local/interno, no vía ese MCP.

---

## 6. AUTENTICACIÓN — ESTADO ACTUAL

**Ya no es mock.** El login es real contra el backend .NET:

- `POST /api/auth/login` (email + password) → el backend valida contra MySQL y devuelve el JWT como **cookie httpOnly** (no se maneja el token en JS).
- `AuthContext.tsx` (`ptar-app/src/state/AuthContext.tsx`) guarda en `localStorage` (`ptar_session`) solo los datos de sesión no sensibles (id, nombre, rol) para hidratar la UI — la autenticación real la valida la cookie en cada request.
- `GET /api/auth/me` valida la cookie al montar la app; un 401 en cualquier llamada (evento `ptar:unauthorized`) limpia la sesión y fuerza reintento único vía `POST /api/auth/refresh` (`ptarClient.ts`, refresh singleton para no duplicar llamadas concurrentes).
- `POST /api/auth/change-password` y `POST /api/auth/logout` también existen.
- Passwords con BCrypt (`BCrypt.Net-Next`) en el backend.
- Rate limiting por endpoint (`AspNetCoreRateLimit`), p.ej. login limitado a 10/min.

No confundir con `OPERARIOS_LISTA` en `AuthContext.tsx` — es solo la lista de nombres para el checklist de "equipo en turno" (quién más está trabajando ese turno), no tiene relación con las credenciales de login.

### Roles del sistema
```typescript
type Role = 'operario' | 'encargado' | 'administrador';
```
`rolesForBackendRole()` expande jerárquicamente: administrador ve los 3 roles, encargado ve operario+encargado, operario solo el suyo — permite cambiar de "sombrero" sin volver a loguearse.

---

## 7. RUTAS (src/lib/routes.ts)

```typescript
ROUTES = {
  LOGIN: '/login',
  // Operario
  OPERARIO_HOME: '/operario',
  FORMATO_CAUDALES: '/operario/formato/caudales',
  FORMATO_REACTIVOS: '/operario/formato/reactivos',
  FORMATO_CALIDAD: '/operario/formato/calidad',
  FORMATO_INCIDENCIAS: '/operario/formato/incidencias',
  FORMATO_CONDICIONES_OP: '/operario/formato/condiciones',
  // Encargado
  ENCARGADO_DASHBOARD:  '/encargado/dashboard',
  ENCARGADO_CALIDAD:    '/encargado/calidad',
  ENCARGADO_BALANCE:    '/encargado/balance',
  ENCARGADO_COSTOS:     '/encargado/costos',
  ENCARGADO_REGISTROS:  '/encargado/registros',
  ENCARGADO_ANALISIS:   '/encargado/analisis',
  // Administrador
  ADMIN_DASHBOARD: '/admin/dashboard',
  // Mantenimientos (SharePoint)
  MANTENIMIENTOS: '/mantenimientos',
}
```

| Ruta | Componente | Rol requerido |
|---|---|---|
| `/` | SplashScreen | Público |
| `/login` | LoginPage | Público |
| `/operario` | OperarioHome | operario |
| `/operario/formato/caudales` | FormatoCaudales | operario |
| `/operario/formato/reactivos` | FormatoReactivos | operario |
| `/operario/formato/calidad` | FormatoCalidad | operario |
| `/operario/formato/incidencias` | FormatoIncidencias | operario |
| `/operario/formato/condiciones` | FormatoCondicionesOp | operario |
| `/encargado/dashboard` | DashboardPage (canEdit=true) | encargado |
| `/encargado/calidad` | CalidadDashboardPage | encargado |
| `/encargado/balance` | BalanceHidricoDashboard | encargado |
| `/encargado/costos` | CostosDashboard | encargado |
| `/encargado/registros` | RegistrosPanel | encargado |
| `/encargado/analisis` | AnalistaPage | encargado, administrador |
| `/mantenimientos` | MantenimientosDashboard | encargado, administrador |
| `/admin/dashboard` | AdminDashboardPage | administrador |
| `/informe/calidad`, `/informe/balance`, `/informe/costos` | Informe*Page (standalone, sin navbar) | encargado, administrador |

---

## 8. FORMATOS OPERATIVOS Y DASHBOARDS

El frontend ya no llama tablas de Supabase directamente — todo pasa por `services/ptarClient.ts` contra los endpoints REST del backend .NET (ver sección 5). Los formularios del operario:

- **FormatoCaudales** — lecturas de contadores de agua (m³)
- **FormatoReactivos** / **FormatoReactivosRO** — niveles y consumo de reactivos químicos (GEM / RO)
- **FormatoCalidad** — parámetros físico-químicos del agua
- **FormatoIncidencias** — incidencias de equipos/proceso
- **FormatoCondicionesOp** — condiciones de operación
- **ResumenTurnoModal** — resumen/cierre del turno (incluye OTs de mantenimiento con detalle expandible, ver `CERRAR_TURNO_OTs.md` en `ptar-backend-dotnet/`)

Dashboards del encargado/admin (`features/{calidad,balance,costos,dashboard,analista,mantenimientos}/`) consumen los mismos endpoints para KPIs, tendencias e informes exportables a HTML/PDF (`Features/Reportes` con QuestPDF).

> Los nombres de tablas/columnas exactos en MySQL no se documentan aquí para evitar que queden desactualizados — ver `sql/schema.sql` y los `sql/alter_*.sql` como fuente de verdad del esquema real.

---

## 9. CONSTANTES DEL DOMINIO

### Reactivos químicos (src/lib/constants/quimicos.ts)
| ID | Nombre | Unidad | Capacidad | Densidad | Precio/kg |
|---|---|---|---|---|---|
| Q-01 | Ácido | L | 6000 | 1.300 | $830 |
| Q-02 | Coagulante | L | 9000 | 1.325 | $2818 |
| Q-03 | Decolorante | L | 7000 | 1.250 | $6295 |
| Q-04 | Polímero Aniónico | kg | 500 | 1.000 | $19050 |
| Q-05 | Polímero Catiónico | kg | 500 | 1.000 | $22050 |

### Contadores (src/lib/constants/contadores.ts)
35 contadores C-01 a C-35. Los **diarios** (obligatorios) son:
`C-11, C-10, C-12, C-13, C-14, C-15, C-17, C-19, C-20, C-21, C-22, C-23`

Tipos de agua: Potable, Industrial, Reúso, RO, Tratada, Residual, Pretratamiento, Rechazo

### Unidades de tratamiento (para F-03)
Tanque Pulmón, Tanque Homogeneizador (Entrada GEM), GEM (Salida), Reactor Anóxico, Reactor MBBR, Reactor MBR 1 y 2 (Interno/Permeado), Filtro 1 Intercambio Iónico (Salida), Vertimiento, RO 1 (Compuesta / Etapa 1 / Etapa 2), RO 2 (Permeado), RO (Rechazo)

---

## 10. NOTIFICACIONES EN TIEMPO REAL

**Mecanismo:** HTTP polling cada 15s (WebSockets bloqueados por Zscaler corporativo).

```typescript
// src/hooks/useRegistrosPolling.ts
const POLL_MS    = 15_000;   // cada 15 segundos
const WINDOW_MIN = 120;      // consulta solo las últimas 2 horas
const MAX_SEEN   = 400;      // límite memoria de claves vistas
```

- Solo activo para roles `encargado` y `administrador`
- Deduplicación por `(tipo|usuario|turno|minuto)` → 1 notif por envío de F-02
- Guard anti-race condition: ignora poll si el anterior aún no terminó
- Máximo 3 toasts simultáneos visibles
- Toast dura 8 segundos con barra de progreso animada
- Reproduce `playPing()` al recibir notificación

---

## 11. SVG SPLASH SCREEN (src/features/splash/SplashScreen.tsx)

### Dimensiones y coordenadas clave
```
ViewBox:     0 0 1800 700
mYA = 480   pipe principal FASE TERCIARIA (fila superior)
mYB = 615   fila de rechazos (fila inferior)
Fila sup:   y=36 h=315  (PRELIM / PRIMARIA / SECUNDARIA)
Fila inf:   y=355 h=313 (TERCIARIA / VERTIMIENTO)
Título TERCIARIA: y=373 (nada puede subir sobre esta línea)
```

### FASE TERCIARIA — layout final implementado
```
y=373 ── "FASE TERCIARIA · REÚSO" (título) ← ZONA LIBRE
y=392   RO1 E2 (x=575, h=88, 4 tubos)  RO1 E1 (x=740, h=88, 4 tubos)
y=426   FILT. IÓNICO horizontal (translate(1093,480), rect x=-50 y=-54 w=100 h=54)
y=453   FILTRO 5µm-A (translate(920,453)) ← ARRIBA del pipe
y=480 ─── PIPE PRINCIPAL (x1=1060, x2=530) ────────────────
y=485   FILTRO 5µm-B stub down
y=510   Colector (x1=840, x2=200)  ← producción
y=563   FILTRO 5µm-B (translate(920,563)) ← ABAJO del pipe

FILA INFERIOR (y=615):
PRODUCCIÓN (translate(65,450))
TK RECIR (translate(200,615))
TK RECH RO1 (x=530) → FILTRO AK (x=630) → RO2 (x=745) → TK RECH RO2 (x=850) → CAJA VERT (x=1060)
```

### AE pipe (FILT. IÓNICO)
```jsx
<line x1="1093" y1="257" x2="1093" y2="426" stroke="#3fb950" strokeWidth="2" opacity=".85" className="p-bio"/>
<polygon points="1089,422 1093,430 1097,422" fill="#3fb950" opacity=".9"/>
```

### FILT. IÓNICO interior (3 lechos horizontales)
```jsx
// bx=[-42,-12,18] width=24 — todos dentro del rect ±50
{[[-42,'#1a2a50','#3b82f6'],[-12,'#1a1a2a','#6b7280'],[18,'#1a2a50','#3b82f6']].map(([bx,bg,sc],i)=>(
  <g key={i}>
    <rect x={Number(bx)} y="-48" width="24" height="44" rx="3" fill={bg} stroke={sc} strokeWidth="1"/>
    {[-40,-28,-16,-4].map(ry=>(<circle key={ry} cx={Number(bx)+12} cy={ry} r="3" fill={sc} opacity=".4"/>))}
  </g>
))}
```

### Clases CSS de animación
- `p-clean` — agua tratada (verde #3fb950), dashoffset 28→0
- `p-bio` — proceso biológico
- `flowR` — animación: flujo en la dirección del trazado (x1→x2, y1→y2)

---

## 12. ESTADO ACTUAL — QUÉ FUNCIONA Y QUÉ NO

| Componente | Estado | Detalle |
|---|---|---|
| SplashScreen SVG | ✅ Producción | Diagrama animado del proceso completo |
| Login / Auth | ✅ Real | JWT en cookie httpOnly contra MySQL, refresh automático (sección 6) |
| Formularios operario (Caudales/Reactivos/Calidad/Incidencias/Condiciones) | ✅ Funcional | Graban vía API .NET (sección 8) |
| Dashboard KPIs (encargado, `DashboardPage.tsx`) | ✅ Real | `RealKpiSection` + widgets reales, ya no usa `mockData.ts` |
| Dashboard admin (`AdminDashboardPage.tsx`) | ⚠️ Parcial | Todavía importa `mockData.ts` — pendiente de pasar a datos reales |
| Notificaciones | ✅ Funcional | Polling 15s, toasts para encargado/admin (Zscaler bloquea WebSockets) |
| Mantenimientos / OTs | ✅ Funcional | Sync automático desde SharePoint cada 1h + detalle expandible en cierre de turno |
| Exportación PDF/HTML | ✅ Existe | `Features/Reportes` (QuestPDF) — calidad, balance, costos, dashboard |
| Rate limiting / seguridad API | ✅ Existe | `AspNetCoreRateLimit` por endpoint, BCrypt para passwords |
| Conexión PLC | ❌ No existe | Futuro — requiere integración en la red de planta |
| Modo offline / PWA | ❌ No existe | No confirmado si sigue en roadmap |

---

## 13. PENDIENTES CONOCIDOS

> Esta sección listaba antes un roadmap "Auth real / RLS / KPIs reales" que **ya se implementó** con la migración a .NET + MySQL. Lo que queda abierto, hasta donde se pudo confirmar revisando el código:

1. **`AdminDashboardPage.tsx` sigue en `mockData.ts`** — homologarlo al mismo patrón que `DashboardPage.tsx` (RealKpiSection + widgets).
2. **`ptar-app/src/lib/supabase.ts` es código muerto** — nada lo importa, se puede eliminar junto con cualquier resto de configuración de Supabase.
3. **Backend Python (`ptar-backend/`)** — declarado obsoleto en `NOTAS_PENDIENTES.md`, pero sigue en el repo. Confirmar si ya se puede borrar o si algo todavía depende de él (p. ej. el token de SharePoint se genera con `auth_sharepoint.py` de ahí).
4. **Conexión PLC** — sigue sin implementar, es la única pieza de "futuro" que se mantiene igual desde la versión anterior de esta memoria.
5. **Hostname/puerto real de producción en la red interna** — no confirmado (ver sección 4).

Para roadmap de producto (qué feature sigue, prioridades del negocio) usar `NOTAS_PENDIENTES.md` y los commits recientes, no esta sección — no se pudo verificar contra un backlog vivo.

---

## 14. ARQUITECTURA ACTUAL

```
[MySQL "ptar_permoda"]  ←── Dapper / EF Core ──  [ASP.NET Core "PtarApi" — .NET 10]
        ▲                                            │  JWT (cookie httpOnly) · Rate limiting
        │                                            │  Reportes PDF/HTML (QuestPDF)
        │                                            ▼
        │                                   [React App — Vite, servida en local]
        │                                   Dashboard tiempo real · Formularios operario
        │
        └── sync horaria ──  [SharePoint — Mantenimientos/OTs]  (MSAL, token cacheado)

Todo corre en la red interna PERMODA — sin nube, sin Vercel, sin Supabase.
```

**Pendiente / futuro:**
- Integración PLC (Modbus/OPC-UA) — no implementada, requeriría un puente en la red de planta.
- Confirmar el mecanismo exacto de despliegue del frontend en producción dentro de la red interna (sección 4).

---

## 15. COMANDOS FRECUENTES

> Rutas absolutas de esta instalación (perfil de Windows `TUF`). Si cambia el perfil/PC, ajustar la raíz.

### Levantar todo local (2 terminales)

**Terminal 1 — Backend (.NET)**
```powershell
cd "C:\Users\TUF\OneDrive - PERMODA LTDA\Documents\Claude\App_PTAR_SQL\ptar-backend-dotnet\PtarApi"
dotnet run
```
→ `http://localhost:8001` (Swagger en `/swagger`)

**Terminal 2 — Frontend (Vite)**
```powershell
cd "C:\Users\TUF\OneDrive - PERMODA LTDA\Documents\Claude\App_PTAR_SQL\ptar-app"
npm run dev
```
→ `http://localhost:5174`

### Build de verificación TypeScript
```powershell
cd "C:\Users\TUF\OneDrive - PERMODA LTDA\Documents\Claude\App_PTAR_SQL\ptar-app"
npm run build
```

### Base de datos MySQL — recrear usuario/permisos de `ptar_app`
Correr en MySQL Workbench conectado como `root` (la password de `ptar_app` real está en `ptar-backend-dotnet/PtarApi/appsettings.Local.json`, gitignored):
```sql
CREATE DATABASE IF NOT EXISTS ptar_permoda CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'ptar_app'@'localhost' IDENTIFIED BY 'LA_PASSWORD_DEL_ARCHIVO';
ALTER USER 'ptar_app'@'localhost' IDENTIFIED BY 'LA_PASSWORD_DEL_ARCHIVO'; -- si el usuario ya existía, CREATE USER IF NOT EXISTS no actualiza el password
GRANT ALL PRIVILEGES ON ptar_permoda.* TO 'ptar_app'@'localhost';
FLUSH PRIVILEGES;
```
Luego cargar el dump (schema + datos) — **File → Run SQL Script...** en Workbench, seleccionar `ptar_permoda_dump.sql` (raíz del repo). Es el archivo oficial de restauración según `INSTRUCTIVO_BASE_DATOS_PTAR.txt` sección 7 — trae 18 tablas + 9 vistas. Ojo: los datos del dump están congelados a la fecha en que se generó (revisar el comentario `-- Dump completed on` al inicio del archivo), no son necesariamente de hoy.

### Renovar token de SharePoint (cuando el backend loguea "grant inválido" / "token expiró")
Requiere Python 3.x instalado (`winget install --id Python.Python.3.12`, o el que ya tengas — no está fijado a una versión exacta).
```powershell
cd "C:\Users\TUF\OneDrive - PERMODA LTDA\Documents\Claude\App_PTAR_SQL\ptar-backend"
python -m venv .venv --clear
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe auth_sharepoint.py
```
El script imprime una URL + código corto — se abre en cualquier navegador, se completa el login (MFA incluido) con la cuenta `davidan@permoda.com.co`, y guarda el token en `.sharepoint_token_cache.json`. Reiniciar el backend después para que tome el token nuevo. Se repite cada ~90 días (cuando expira el refresh token).

---

## 16. NOTAS IMPORTANTES PARA CLAUDE

- **Deploy es local** — red interna PERMODA, sin Vercel ni nube. Ver sección 4.
- **El archivo más grande** es `SplashScreen.tsx` (~1000 líneas) — leerlo siempre antes de editar
- **Zscaler** bloquea WebSockets en la red corporativa — por eso el polling HTTP en lugar de WebSockets/Realtime
- **TypeScript strict** — siempre verificar con `tsc -b` antes de hacer deploy
- **Puerto dev:** 5174 (no 5173, porque 5173 puede estar ocupado)
- **Backend .NET requiere SDK 10** — `PtarApi.csproj` usa `net10.0`; verificar `dotnet --list-sdks` antes de compilar
- **Sin Supabase** — no usar el MCP `mcp__supabase-ptar__` para este proyecto, no aplica
- Al editar SVG: las constantes `mYA=480` y `mYB=615` son el ancla de todo el layout de TERCIARIA
