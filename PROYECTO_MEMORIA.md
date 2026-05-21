# MEMORIA COMPLETA — App PTAR (PETAR PERMODA)
> Generada: 2026-05-06 | Usar en cualquier chat de Claude para retomar el proyecto sin perder contexto.

---

## 1. IDENTIDAD DEL PROYECTO

| Campo | Valor |
|---|---|
| **Nombre app** | ptar-app |
| **Empresa** | PERMODA LTDA |
| **Propósito** | Sistema de gestión operativa de la Planta de Tratamiento de Aguas Residuales (PTAR) de la fábrica textil |
| **URL producción** | https://ptar-app.vercel.app |
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
Backend:    Supabase (PostgreSQL + Auth + Storage)
Deploy:     Vercel CLI (sin git, directo CLI)
```

### Dependencias exactas (package.json)
```json
"@hookform/resolvers": "^3.9.0",
"@supabase/supabase-js": "^2.105.0",
"react": "^19.0.0",
"react-dom": "^19.0.0",
"react-error-boundary": "^5.0.0",
"react-hook-form": "^7.53.0",
"react-hot-toast": "^2.4.1",
"react-router-dom": "^6.28.0",
"recharts": "^2.14.0",
"zod": "^3.23.8"
```

---

## 3. ESTRUCTURA DE ARCHIVOS

```
App_PTAR/
├── CLAUDE.md                          ← memoria de deploy (NO modificar)
├── PROYECTO_MEMORIA.md                ← ESTE ARCHIVO
└── ptar-app/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── .vercel/
    │   └── project.json               ← vínculo Vercel CLI
    └── src/
        ├── main.tsx                   ← entry point
        ├── App.tsx                    ← AuthProvider + AppRouter
        ├── app/
        │   ├── Router.tsx             ← todas las rutas (lazy loaded)
        │   ├── Layout.tsx             ← Navbar + NotificationManager + Outlet
        │   └── guards/
        │       └── RoleGuard.tsx      ← protección por rol
        ├── state/
        │   └── AuthContext.tsx        ← ⚠️ AUTH MOCK — usuarios hardcodeados
        ├── models/
        │   └── index.ts               ← tipos TypeScript del dominio
        ├── lib/
        │   ├── supabase.ts            ← cliente Supabase + interfaces DB
        │   ├── routes.ts              ← constantes de rutas
        │   ├── audio.ts               ← playPing() para notificaciones
        │   └── constants/
        │       ├── contadores.ts      ← 35 contadores de agua con metadatos
        │       ├── quimicos.ts        ← 5 reactivos químicos con precios
        │       └── incidencias.ts     ← parámetros calidad + unidades tratamiento
        ├── hooks/
        │   └── useRegistrosPolling.ts ← polling HTTP 15s (sin WebSockets — Zscaler)
        ├── components/
        │   ├── layout/
        │   │   └── Navbar.tsx
        │   └── notifications/
        │       └── NotificationManager.tsx ← toasts para encargado/admin
        └── features/
            ├── splash/
            │   └── SplashScreen.tsx   ← diagrama SVG animado del proceso PTAR
            ├── auth/
            │   └── LoginPage.tsx
            ├── dashboard/
            │   ├── DashboardPage.tsx  ← ⚠️ usa mockData, no datos reales
            │   ├── KpiGauge.tsx
            │   └── mockData.ts        ← KPIs y series de tiempo FICTICIAS
            └── operario/
                ├── OperarioHome.tsx   ← selección de formato (F-01, F-02, F-03)
                ├── FormatoCaudales.tsx    ← F-01: lecturas contadores m³
                ├── FormatoReactivos.tsx   ← F-02: niveles y consumo reactivos
                ├── FormatoIncidencias.tsx ← F-03: parámetros físico-químicos
                └── components/
                    └── ContadorCard.tsx
```

---

## 4. DEPLOY — VERCEL CLI

> **IMPORTANTE:** No hay repositorio git en `ptar-app/`. El deploy es 100% CLI.

```bash
# Desplegar a producción
cd "C:\Users\davidan\OneDrive - PERMODA LTDA\Documents\Claude\App_PTAR\ptar-app"
vercel --prod

# Ver deploys recientes
vercel ls
```

### Credenciales Vercel
| Campo | Valor |
|---|---|
| projectId | prj_6ALodWSTKZHAOhe8sA11V7mTqSoW |
| orgId | team_DQHmdbk33W0cDYRolzVLYD4i |
| projectName | ptar-app |
| equipo | confiabilidad |
| usuario | davidan11-ing |
| Vercel CLI versión | 51.x |

El archivo `.vercel/project.json` tiene el vínculo. Tarda ~15-20s. Genera URL tipo `https://ptar-XXXXXXXX-confiabilidad.vercel.app`.

---

## 5. SUPABASE

### Conexión (src/lib/supabase.ts)
```typescript
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
export const supabase = createClient(supabaseUrl, supabaseKey);
```
Variables en `.env` (no commitear, no en git).

### Tablas existentes en producción
| Tabla | Descripción |
|---|---|
| `ptar_registro_contadores` | Lecturas de contadores de agua por turno |
| `ptar_registro_costos` | Consumo y costo de reactivos por turno |
| `ptar_registro_calidad` | Parámetros físico-químicos (interfaz definida, tabla a confirmar) |

### Interfaces TypeScript (src/lib/supabase.ts)

```typescript
interface RegistroContador {
  id?: string; created_at?: string;
  turno: 'mañana' | 'tarde' | 'noche';
  usuario: string;
  id_contador: string; nombre_contador: string;
  ubicacion: string; tipo_agua: string;
  lectura_anterior_m3: number; lectura_actual_m3: number;
  delta_m3?: number;        // columna generada — solo lectura
  observaciones?: string;
}

interface RegistroCosto {
  id?: string; created_at?: string;
  turno: 'mañana' | 'tarde' | 'noche';
  usuario: string;
  id_quimico: string; nombre_quimico: string;
  unidad: string; densidad_kg: number;
  nivel_inicial: number; nivel_final: number;
  consumo?: number;          // generada
  kg_consumidos: number; precio_kg: number;
  ppm?: number;              // generada
  costo_operativo?: number;  // generada
  horometro_inicial: number;
  caudal_tratado_gem: number; horas_operacion: number;
  observaciones?: string;
}

interface RegistroCalidad {
  id?: string; created_at?: string;
  turno: 'mañana' | 'tarde' | 'noche';
  usuario: string;
  unidad_tratamiento: string; parametro: string;
  unidad_medida: string; valor?: number;
  metodo?: string; no_aplica: boolean;
  observaciones?: string;
}
```

### MCP disponibles en Claude Code
- `mcp__supabase-ptar__` — proyecto PTAR (usar este)
- `mcp__supabase__` — proyecto alternativo

---

## 6. AUTENTICACIÓN — ESTADO ACTUAL ⚠️

**AuthContext.tsx usa usuarios mock hardcodeados.** No hay Supabase Auth activo.

```typescript
// src/state/AuthContext.tsx — MOCK (debe reemplazarse)
const MOCK_USERS: AppUser[] = [
  { id: 'op1',    nombre: 'Carlos Mendoza',  roles: ['operario'],                    activeRole: 'operario'      },
  { id: 'op2',    nombre: 'Ana Suárez',       roles: ['operario'],                    activeRole: 'operario'      },
  { id: 'enc1',   nombre: 'Jorge Rivera',     roles: ['encargado'],                   activeRole: 'encargado'     },
  { id: 'adm1',   nombre: 'Laura Gómez',      roles: ['administrador'],               activeRole: 'administrador' },
  { id: 'multi1', nombre: 'Director PTAR',    roles: ['encargado','administrador'],   activeRole: 'encargado'     },
];
```

Login usa `localStorage` con clave `ptar_session`. No hay JWT ni sesión real.

### Roles del sistema
```typescript
type Role = 'operario' | 'encargado' | 'administrador';
```

---

## 7. RUTAS (src/lib/routes.ts)

```typescript
ROUTES = {
  LOGIN:               '/login',
  OPERARIO_HOME:       '/operario',
  FORMATO_CAUDALES:    '/operario/formato/caudales',
  FORMATO_REACTIVOS:   '/operario/formato/reactivos',
  FORMATO_INCIDENCIAS: '/operario/formato/incidencias',
  ENCARGADO_DASHBOARD: '/encargado/dashboard',
  ADMIN_DASHBOARD:     '/admin/dashboard',
}
```

| Ruta | Componente | Rol requerido |
|---|---|---|
| `/` | SplashScreen | Público |
| `/login` | LoginPage | Público |
| `/operario` | OperarioHome | operario |
| `/operario/formato/caudales` | FormatoCaudales | operario |
| `/operario/formato/reactivos` | FormatoReactivos | operario |
| `/operario/formato/incidencias` | FormatoIncidencias | operario |
| `/encargado/dashboard` | DashboardPage (canEdit=true) | encargado |
| `/admin/dashboard` | DashboardPage (canEdit=false) | administrador |

---

## 8. FORMATOS OPERATIVOS

### F-01 — Registro de Caudales (FormatoCaudales.tsx)
- Graba en: `ptar_registro_contadores`
- Selección de contador de la lista CONTADORES (35 contadores)
- Calcula delta_m3 automáticamente (columna generada en DB)
- Valida que lectura actual ≥ lectura anterior

### F-02 — Registro de Reactivos (FormatoReactivos.tsx)
- Graba en: `ptar_registro_costos`
- Calcula consumo, kg_consumidos, ppm, costo_operativo (columnas generadas)
- 5 productos: Ácido, Coagulante, Decolorante, Polímero Aniónico, Polímero Catiónico

### F-03 — Registro de Incidencias / Calidad (FormatoIncidencias.tsx)
- Graba en: `ptar_registro_calidad`
- Parámetros diarios: Temperatura, pH, TDS, SST, SolidosSediment, Conductividad, Color, Turbidez
- Parámetros ocasionales: DQO, Hierro, SST Gravimétrico, Cloruros, Fósforo, Nitrógeno, Sulfatos, Alcalinidad, Dureza Cálcica, Dureza Total, Sílice, ORP, Cloro Residual

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
| Login / Auth | ⚠️ Mock | Usuarios hardcodeados, sin Supabase Auth |
| F-01 Caudales | ✅ Funcional | Graba en `ptar_registro_contadores` |
| F-02 Reactivos | ✅ Funcional | Graba en `ptar_registro_costos` |
| F-03 Incidencias/Calidad | ✅ UI lista | Graba en `ptar_registro_calidad` |
| Dashboard KPIs | ❌ Mock | `mockData.ts` con datos ficticios |
| Notificaciones | ✅ Funcional | Polling 15s, toasts para encargado/admin |
| RLS (seguridad DB) | ❓ Pendiente | Probablemente abierta con anon key |
| Exportación PDF | ❌ No existe | Pendiente implementar |
| Conexión PLC | ❌ No existe | Futuro — requiere Python en red de planta |

---

## 13. ROADMAP TÉCNICO PENDIENTE

### Prioridad Alta (sin esto el sistema no es seguro en producción)
1. **Auth real con Supabase Auth** — reemplazar `MOCK_USERS` y `localStorage` por `supabase.auth.signInWithPassword()`. Agregar tabla `ptar_perfiles(id, nombre, rol)` vinculada a `auth.users`.
2. **Row-Level Security (RLS)** — Políticas por rol:
   - Operario: INSERT propio + SELECT propio últimas 24h
   - Encargado: SELECT todo su turno
   - Admin: SELECT/UPDATE todo

### Prioridad Media (el dashboard no sirve sin esto)
3. **Vistas SQL para KPIs reales** — reemplazar `mockData.ts`
4. **Tabla `ptar_incidencias`** para incidencias de equipos (diferente de F-03 calidad):
   ```sql
   CREATE TABLE ptar_incidencias (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     created_at timestamptz DEFAULT now(),
     usuario text, turno text,
     equipo_afectado text, descripcion text,
     accion_tomada text, tiempo_paro_min int,
     prioridad text CHECK (prioridad IN ('baja','media','alta','critica')),
     estado text DEFAULT 'abierta'
   );
   ```

### Prioridad Baja (valor operativo futuro)
5. **Generación de PDFs por turno** — Render (gratis) + FastAPI + reportlab/weasyprint
6. **Alertas automáticas** — pg_cron + Edge Function cuando pH/turbidez superan límites
7. **Modo offline PWA** — Service Worker + IndexedDB para zonas sin señal
8. **Integración PLC** — Python (pymodbus) en PC de sala de control → escribe en Supabase

---

## 14. ARQUITECTURA OBJETIVO (FUTURA)

```
Planta física (red local)
  [PLC ModBus/OPC-UA]
       ↓ pymodbus
  [Python en PC sala de control]
       ↓ HTTPS supabase-py
       ↓
  [SUPABASE]  ←→  [React App — Vercel]
  Auth + DB        Dashboard tiempo real
  RLS + Storage    Formularios operarios
       ↓
  [FastAPI en Render (gratis)]
  Generación PDFs reportes
  Alertas por parámetros
```

**Lenguajes por capa:**
- Frontend: TypeScript (React) — ya implementado
- Base de datos: SQL (PostgreSQL) — Supabase
- Lógica servidor: TypeScript (Edge Functions) o Python (FastAPI)
- Integración PLC: Python (pymodbus, opcua)

---

## 15. COMANDOS FRECUENTES

```bash
# Dev local
cd "C:\Users\davidan\OneDrive - PERMODA LTDA\Documents\Claude\App_PTAR\ptar-app"
npm run dev
# → http://localhost:5174

# Build verificación TypeScript
npm run build

# Deploy producción
vercel --prod

# Ver deploys
vercel ls
```

---

## 16. NOTAS IMPORTANTES PARA CLAUDE

- **No hay git** en `ptar-app/` — nunca intentar `git commit` ahí
- **Deploy = `vercel --prod`** desde el directorio `ptar-app/`
- **El archivo más grande** es `SplashScreen.tsx` (~1000 líneas) — leerlo siempre antes de editar
- **Zscaler** bloquea WebSockets en la red corporativa — por eso el polling HTTP en lugar de Supabase Realtime
- **TypeScript strict** — siempre verificar con `tsc -b` antes de hacer deploy
- **Puerto dev:** 5174 (no 5173, porque 5173 puede estar ocupado)
- **MCP Supabase:** usar `mcp__supabase-ptar__` para el proyecto PTAR
- Al editar SVG: las constantes `mYA=480` y `mYB=615` son el ancla de todo el layout de TERCIARIA
