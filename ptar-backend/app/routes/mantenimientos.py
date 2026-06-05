"""
mantenimientos.py
Endpoints para la tabla mantenimientos_preventivos.
Los datos llegan desde SharePoint via Power Automate (POST /sync)
y se sirven al dashboard React (GET /).
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from app.database import get_db

router = APIRouter()


# ── Modelo de entrada (Power Automate → POST /sync) ───────────────────────────

class MantenimientoIn(BaseModel):
    sharepoint_id:     int
    semana:            Optional[int]    = None
    gerencia:          Optional[str]    = None
    area:              Optional[str]    = None
    gft:               Optional[str]    = None
    objeto:            Optional[str]    = None
    af:                Optional[str]    = None
    descripcion:       Optional[str]    = None
    tipo_mantenimiento: Optional[str]   = None
    frecuencia:        Optional[str]    = None
    responsable:       Optional[str]    = None
    pedido_de_trabajo: Optional[str]    = None
    criticidad:        Optional[str]    = None
    estado:            Optional[str]    = None
    dia_programado:    Optional[date]   = None
    asignado_a:        Optional[str]    = None


# ── GET / — listado con filtros ───────────────────────────────────────────────

@router.get("/")
async def get_mantenimientos(
    semana:      Optional[int] = Query(None, description="Número de semana ISO"),
    estado:      Optional[str] = Query(None, description="COMPLETADO | PENDIENTE | EN PROCESO…"),
    area:        Optional[str] = Query(None),
    responsable: Optional[str] = Query(None),
    criticidad:  Optional[str] = Query(None),
    tipo:        Optional[str] = Query(None),
    limit:       int           = Query(1000, ge=1, le=5000),
    db: AsyncSession = Depends(get_db),
):
    filters, params = [], {"limit": limit}
    if semana is not None:
        filters.append("semana = :semana");        params["semana"]      = semana
    if estado:
        filters.append("UPPER(estado) LIKE UPPER(:estado)"); params["estado"] = f"%{estado}%"
    if area:
        filters.append("UPPER(area) LIKE UPPER(:area)");     params["area"]   = f"%{area}%"
    if responsable:
        filters.append("responsable LIKE :resp");  params["resp"]        = f"%{responsable}%"
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
                asignado_a,
                DATE_FORMAT(ultima_sync, '%Y-%m-%d %H:%i') AS ultima_sync
        FROM    mantenimientos_preventivos
        {where}
        ORDER BY semana DESC, FIELD(UPPER(criticidad),'ALTA','MEDIA','BAJA') ASC,
                 dia_programado ASC
        LIMIT :limit
    """), params)).mappings().all()

    return [dict(r) for r in rows]


# ── GET /kpis — contadores para las tarjetas del dashboard ───────────────────

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
            SUM(UPPER(estado) LIKE '%PROCESO%' OR UPPER(estado) LIKE '%PROGRESO%') AS en_proceso,
            SUM(UPPER(criticidad) = 'ALTA')                           AS criticos,
            MAX(ultima_sync)                                          AS ultima_actualizacion
        FROM mantenimientos_preventivos
        {where}
    """), params)).mappings().first()

    areas = (await db.execute(text(f"""
        SELECT area, COUNT(*) AS n,
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


# ── POST /sync — recibe datos de Power Automate y hace UPSERT ────────────────

@router.post("/sync")
async def sync_mantenimientos(
    items: list[MantenimientoIn],
    db: AsyncSession = Depends(get_db),
):
    """
    Llamado por Power Automate cada 5 minutos con todos los ítems de la lista.
    Hace UPSERT por sharepoint_id para mantener los datos actualizados.
    """
    if not items:
        return {"upserted": 0, "total": 0}

    upserted = 0
    for item in items:
        result = await db.execute(text("""
            INSERT INTO mantenimientos_preventivos
              (sharepoint_id, semana, gerencia, area, gft, objeto, af,
               descripcion, tipo_mantenimiento, frecuencia, responsable,
               pedido_de_trabajo, criticidad, estado, dia_programado, asignado_a)
            VALUES
              (:sp_id, :semana, :gerencia, :area, :gft, :objeto, :af,
               :descripcion, :tipo, :frecuencia, :responsable,
               :pedido, :criticidad, :estado, :dia, :asignado)
            ON DUPLICATE KEY UPDATE
              semana             = :semana,
              gerencia           = :gerencia,
              area               = :area,
              gft                = :gft,
              objeto             = :objeto,
              af                 = :af,
              descripcion        = :descripcion,
              tipo_mantenimiento = :tipo,
              frecuencia         = :frecuencia,
              responsable        = :responsable,
              pedido_de_trabajo  = :pedido,
              criticidad         = :criticidad,
              estado             = :estado,
              dia_programado     = :dia,
              asignado_a         = :asignado
        """), {
            'sp_id':       item.sharepoint_id,
            'semana':      item.semana,
            'gerencia':    item.gerencia,
            'area':        item.area,
            'gft':         item.gft,
            'objeto':      item.objeto,
            'af':          item.af,
            'descripcion': item.descripcion,
            'tipo':        item.tipo_mantenimiento,
            'frecuencia':  item.frecuencia,
            'responsable': item.responsable,
            'pedido':      item.pedido_de_trabajo,
            'criticidad':  item.criticidad,
            'estado':      item.estado,
            'dia':         item.dia_programado,
            'asignado':    item.asignado_a,
        })
        upserted += 1

    await db.commit()
    return {"upserted": upserted, "total": len(items)}
