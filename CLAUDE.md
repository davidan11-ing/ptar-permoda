# PETAR PERMODA — App PTAR

## Proyecto
- **Nombre:** ptar-app
- **Stack:** React 19 + Vite 6 + TypeScript strict + React Router + Supabase
- **Directorio de la app:** `App_PTAR/ptar-app/`
- **Dev server:** `npm run dev` → http://localhost:5174

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
