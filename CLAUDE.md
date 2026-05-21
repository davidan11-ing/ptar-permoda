# App PTAR — PERMODA

## Proyecto
- **Nombre:** ptar-permoda
- **Stack:** React 19 + Vite 6 + TypeScript (frontend) · FastAPI + MySQL (backend)
- **Directorio raíz:** `App_PTAR_SQL/`
- **Frontend dev server:** `npm run dev` → http://localhost:5174
- **Backend dev server:** `uvicorn app.main:app --reload --port 8001` → http://localhost:8001

## Repositorio GitHub
- **URL:** https://github.com/davidan11-ing/ptar-permoda
- **Rama principal:** `master`
- **Repo local:** `C:\Users\davidan\OneDrive - PERMODA LTDA\Documents\Claude\App_PTAR_SQL\`

## ── GIT — REGLA IMPORTANTE ──────────────────────────────────────────────────
**Después de cada sesión de cambios significativos, generar automáticamente un commit y push.**

### Cuándo hacer commit+push
- Al terminar una funcionalidad nueva o corrección
- Cuando el usuario diga "listo", "perfecto", "guardalo", "sube los cambios" o similar
- Al final de una sesión larga de trabajo
- Cuando se modifiquen 3 o más archivos

### Comandos a ejecutar (siempre desde la raíz del repo)
```bash
cd "C:\Users\davidan\OneDrive - PERMODA LTDA\Documents\Claude\App_PTAR_SQL"
git add .
git commit -m "descripción concisa de los cambios"
git push
```

### Formato del mensaje de commit
- `feat:` nueva funcionalidad
- `fix:` corrección de error
- `style:` cambios visuales/CSS
- `docs:` documentación
- `refactor:` reorganización de código sin cambiar funcionalidad

### Archivos que NUNCA se suben (están en .gitignore)
- `.env` (credenciales MySQL)
- `.venv/` (entorno virtual Python)
- `node_modules/` (dependencias Node)
- `dist/` (build del frontend)
- `.claude/` (configuración local de Claude Code)

## Colaboradora
- **Luna** tiene acceso al mismo repo como colaboradora
- Ella trabaja en su propia copia local con su propio `.env`
- Guía de configuración para Luna: `README.md` en la raíz del repo

## Deploy a producción (Vercel CLI)

El proyecto está vinculado a Vercel directamente por CLI, **NO requiere git push**.
El archivo `.vercel/project.json` ya tiene el vínculo configurado:
- `projectId`: prj_6ALodWSTKZHAOhe8sA11V7mTqSoW
- `orgId`: team_DQHmdbk33W0cDYRolzVLYD4i (equipo: **confiabilidad**)
- `projectName`: ptar-app
- Usuario Vercel: **davidan11-ing**

### Comando para desplegar
```bash
cd "C:\Users\davidan\OneDrive - PERMODA LTDA\Documents\Claude\App_PTAR\ptar-app"
vercel --prod
```

- Tarda ~15-20 segundos
- Genera URL del tipo: `https://ptar-XXXXXXXX-confiabilidad.vercel.app`
- La URL de producción fija es la que aparece en el dashboard de Vercel

### Ver deploys recientes
```bash
cd ptar-app
vercel ls
```

### Notas importantes
- **No hay repositorio git local** en `ptar-app/` — el deploy es directo CLI a Vercel
- `.vercel/` está en `.gitignore` pero el directorio existe localmente y es necesario para el deploy
- `node_modules/` y `dist/` también en `.gitignore` — Vercel hace el build en la nube
- Vercel CLI versión: **51.0.0** (`vercel --version`)

## Archivo principal del diagrama SVG
`ptar-app/src/features/splash/SplashScreen.tsx`
- ViewBox: `0 0 1800 700`
- Constantes clave: `mYA=480` (pipe principal TERCIARIA), `mYB=615` (fila rechazos)
- Fila superior zonas: `y=36 h=315` (PRELIM/PRIMARIA/SECUNDARIA)
- Fila inferior zonas: `y=355 h=313` (TERCIARIA/VERTIMIENTO)

## Supabase
- Proyecto: **ptar** (mcp__supabase-ptar__)
- Variables de entorno en `.env` (no commitear)
