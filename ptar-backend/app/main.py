import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.config import settings
from app.routes import auth, caudales, reactivos, calidad, dashboard, reportes, equipos

# Raíz del proyecto (App_PTAR_SQL/ptar-backend/) — funciona desde cualquier CWD
BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "dist"

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="PTAR Permoda API",
    description="Backend REST para la app de gestión de la Planta de Tratamiento de Aguas Residuales",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS restrictivo ──────────────────────────────────────────────────────────
_allowed_origins = [o.strip() for o in settings.CORS_ORIGIN.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(auth.router,      prefix="/api/auth",      tags=["auth"])
app.include_router(caudales.router,  prefix="/api/caudales",  tags=["caudales"])
app.include_router(reactivos.router, prefix="/api/reactivos", tags=["reactivos"])
app.include_router(calidad.router,   prefix="/api/calidad",   tags=["calidad"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(reportes.router,  prefix="/api/reportes",  tags=["reportes"])
app.include_router(equipos.router,   prefix="/api/equipos",   tags=["equipos"])

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}

# Servir frontend React (dist/) — debe ir al final
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        return FileResponse(str(DIST_DIR / "index.html"))
