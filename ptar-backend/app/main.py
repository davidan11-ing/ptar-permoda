import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import settings
from app.routes import auth, caudales, reactivos, calidad, dashboard, reportes

# Raíz del proyecto (App_PTAR_SQL/ptar-backend/) — funciona desde cualquier CWD
BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "dist"

app = FastAPI(
    title="PTAR Permoda API",
    description="Backend REST para la app de gestión de la Planta de Tratamiento de Aguas Residuales",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.CORS_ORIGIN, "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/api/auth",      tags=["auth"])
app.include_router(caudales.router,  prefix="/api/caudales",  tags=["caudales"])
app.include_router(reactivos.router, prefix="/api/reactivos", tags=["reactivos"])
app.include_router(calidad.router,   prefix="/api/calidad",   tags=["calidad"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(reportes.router,  prefix="/api/reportes",  tags=["reportes"])

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
