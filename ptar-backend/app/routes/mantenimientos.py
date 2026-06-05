"""
mantenimientos.py
Endpoints para mantenimientos preventivos GFT.
Los datos se sincronizan desde SharePoint (via Python + credenciales usuario)
y se sirven al dashboard React.

Rutas:
  GET  /api/mantenimientos/         — listado con filtros
  GET  /api/mantenimientos/kpis     — KPIs para cards del dashboard
  POST /api/mantenimientos/pull     — dispara sync manual desde SharePoint
"""
import asyncio
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.config import settings
from app.services.sharepoint import fetch_sharepoint_items, upsert_items

router = APIRouter()
log    = logging.getLogger("ptar.mantenimientos")


# ── GET / — listado con filtros ───────────────────────────────────────────────

@router.get("/")
async def get_mantenimientos(
    semana:      Optional[int] = Query(None, description="Número de semana ISO"),
    estado:      Optional[str] = Query(None, description="COMPLETADO | PENDIENTE"),
    area:        Optional[str] = Query(None),
    responsable: Optional[str] = Query(None),
    criticidad:  Optional[str] = Query(None),
    tipo:        Optional[str] = Query(None),
    limit:       int           = Query(1000, ge=1, le=5000),
    db: AsyncSession = Depends(get_db),
):
    filters, params = [], {"limit": limit}
    if semana is not None:
        filters.append("semana = :semana");            params["semana"]  = semana
    if estado:
        filters.append("UPPER(estado) LIKE UPPER(:estado)"); params["estado"] = f"%{estado}%"
    if area:
        filters.append("UPPER(area) LIKE UPPER(:area)");     params["area"]   = f"%{area}%"
    if responsable:
        filters.append("responsable LIKE :resp");      params["resp"]    = f"%{responsable}%"
    if criticidad:
        filters.append("UPPER(criticidad) = UPPER(:crit)");  params["crit"] = criticidad
    if tipo:
        filters.append("UPPER(tipo_mantenimiento) LIKE UPPER(:tipo)"); params["tipo"] = f"%{tipo}%"

    where = ("WHERE " + " AND ".join(filters)) if filters else ""

    rows = (await db.execute(text(f"""
        SELECT  id, sharepoint_id, semana, gerencia, area, gft,
                objeto, af, descripcion, tipo_mantenimiento, frecuencia,
                responsable, pedido_de_trabajo, criticidad, estado,
                DATE_FORMAT(dia_programado, '%Y-%m-%d') AS dia_programado,
                asignado_a, observaciones,
                DATE_FORMAT(ultima_sync, '%Y-%m-%d %H:%i') AS ultima_sync
        FROM    mantenimientos_preventivos
        {where}
        ORDER BY semana DESC,
                 FIELD(UPPER(criticidad),'ALTA','MEDIA','BAJA') ASC,
                 dia_programado ASC
        LIMIT :limit
    """), params)).mappings().all()

    return [dict(r) for r in rows]


# ── GET /kpis — contadores para las cards del dashboard ──────────────────────

@router.get("/kpis")
async def get_kpis(
    semana: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    where  = "WHERE semana = :semana" if semana else ""
    params = {"semana": semana} if semana else {}

    row = (await db.execute(text(f"""
        SELECT
            COUNT(*)                                                  AS total,
            SUM(UPPER(estado) LIKE '%COMPLET%')                       AS completados,
            SUM(UPPER(estado) LIKE '%PENDIENTE%')                     AS pendientes,
            SUM(UPPER(estado) LIKE '%PROCESO%'
             OR UPPER(estado) LIKE '%PROGRESO%')                      AS en_proceso,
            SUM(UPPER(criticidad) = 'ALTA')                           AS criticos,
            MAX(ultima_sync)                                          AS ultima_actualizacion
        FROM mantenimientos_preventivos
        {where}
    """), params)).mappings().first()

    areas = (await db.execute(text(f"""
        SELECT area,
               COUNT(*) AS n,
               SUM(UPPER(estado) LIKE '%COMPLET%') AS completados
        FROM   mantenimientos_preventivos
        {where}
        GROUP BY area
        ORDER BY n DESC
        LIMIT 10
    """), params)).mappings().all()

    return {
        "total":                int(row["total"] or 0),
        "completados":          int(row["completados"] or 0),
        "pendientes":           int(row["pendientes"] or 0),
        "en_proceso":           int(row["en_proceso"] or 0),
        "criticos":             int(row["criticos"] or 0),
        "ultima_actualizacion": str(row["ultima_actualizacion"] or ""),
        "por_area":             [dict(r) for r in areas],
    }


# ── Función interna de sincronización (corre en threadpool) ──────────────────

async def _do_pull(db: AsyncSession) -> dict:
    """
    Llama a SharePoint en un thread (la lib es síncrona),
    luego hace UPSERT en MySQL.
    """
    if not settings.sp_enabled:
        raise HTTPException(
            status_code=503,
            detail="SharePoint no configurado. Agrega SP_EMAIL y SP_PASSWORD al .env",
        )
    try:
        inicio = datetime.now()
        log.info("Iniciando pull SharePoint...")

        # Ejecutar la llamada síncrona en un thread para no bloquear el event loop
        loop  = asyncio.get_event_loop()
        items = await loop.run_in_executor(
            None,
            fetch_sharepoint_items,
            settings.SP_SITE_URL,
            settings.SP_EMAIL,
            settings.SP_PASSWORD,
        )

        procesados = await upsert_items(db, items)
        duracion   = (datetime.now() - inicio).total_seconds()

        log.info("Pull completado: %d registros en %.1fs", procesados, duracion)
        return {
            "ok":         True,
            "procesados": procesados,
            "duracion_s": round(duracion, 1),
            "timestamp":  datetime.now().isoformat(timespec="seconds"),
        }

    except HTTPException:
        raise
    except Exception as exc:
        log.error("Error en pull SharePoint: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error SharePoint: {exc}")


# ── POST /pull — dispara sync manual (o lo llama el scheduler) ───────────────

@router.post("/pull")
async def pull_from_sharepoint(
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Dispara una sincronización inmediata desde SharePoint.
    Devuelve resultado al finalizar (no es background — así el cliente sabe cuándo terminó).
    """
    return await _do_pull(db)


# ── Función exportada para el scheduler de main.py ───────────────────────────

async def scheduled_pull():
    """Llamada por APScheduler cada SP_SYNC_HOURS horas."""
    from app.database import AsyncSessionLocal  # importación local para evitar ciclo
    async with AsyncSessionLocal() as db:
        try:
            result = await _do_pull(db)
            log.info("Sync programado completado: %s", result)
        except Exception as exc:
            log.warning("Sync programado falló: %s", exc)
