# Stack Tecnológico

## Frontend

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| React | 19 | UI components |
| Vite | 6 | Build tool y dev server |
| TypeScript | strict | Tipado fuerte |
| React Router | v6 | Navegación SPA |
| Recharts | — | Gráficos (barras, torta, percentiles) |
| Tailwind CSS | — | Estilos utilitarios |

**Dev server:** `npm run dev` → `http://localhost:5174`
**Directorio:** `ptar-app/`

---

## Backend actual (Supabase)

| Componente | Detalle |
|-----------|---------|
| Base de datos | PostgreSQL gestionado por Supabase |
| Auth | Mock hardcodeado (sin Supabase Auth real) |
| Polling | Cada 15 segundos (Zscaler bloquea WebSockets) |
| Cliente | `ptar-app/src/lib/supabase.ts` |

---

## Backend futuro (FastAPI + MySQL)

| Componente | Detalle |
|-----------|---------|
| Framework | FastAPI (Python) |
| ORM | SQLAlchemy async + aiomysql |
| SQL | Raw SQL con `text()` (sin ORM) |
| Config | pydantic-settings |
| Servidor | `wserver.permoda.com.co:8001` |
| Gestor servicio | NSSM (igual que almacén) |

**Patrón de referencia:**
```
C:\Users\davidan\OneDrive - PERMODA LTDA\Documents\Claude\App Almacen Permoda\almacen-permoda-backend\
```

---

## Despliegue

```
Estado actual:
  Frontend → Vercel (vercel.app)
  BD       → Supabase (nube)

Estado futuro:
  Frontend → FastAPI sirve dist/ estático
  BD       → MySQL en wserver.permoda.com.co
  API      → FastAPI en puerto 8001
```

---

Tags: #arquitectura #stack #tecnologia
