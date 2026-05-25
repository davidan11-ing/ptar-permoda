from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from datetime import date
from app.database import get_db

router = APIRouter()


class EstadoEquipoOut(BaseModel):
    equipo_key: str
    estado: str
    observacion: Optional[str] = None


class UpsertEstadoIn(BaseModel):
    equipo_key: str
    estado: str
    turno: int
    observacion: Optional[str] = None
    usuario: Optional[str] = None


@router.get("/estados-hoy", response_model=list[EstadoEquipoOut])
async def get_estados_hoy(db: AsyncSession = Depends(get_db)):
    """Estado más reciente de cada equipo (último turno registrado)."""
    rows = (await db.execute(text("""
        SELECT e.equipo_key, e.estado, e.observacion
        FROM estado_equipo e
        INNER JOIN (
            SELECT equipo_key, MAX(fecha * 10 + turno) AS max_ft
            FROM estado_equipo
            GROUP BY equipo_key
        ) latest ON e.equipo_key = latest.equipo_key
                          AND (e.fecha * 10 + e.turno) = latest.max_ft
        ORDER BY e.equipo_key
    """))).mappings().all()
    return [EstadoEquipoOut(**dict(r)) for r in rows]


@router.post("/estados")
async def upsert_estado(body: UpsertEstadoIn, db: AsyncSession = Depends(get_db)):
    """Registra o actualiza el estado de un equipo para fecha/turno actual."""
    await db.execute(text("""
        INSERT INTO estado_equipo (fecha, turno, equipo_key, estado, observacion, usuario)
        VALUES (:fecha, :turno, :key, :estado, :obs, :usr)
        ON DUPLICATE KEY UPDATE
            estado      = VALUES(estado),
            observacion = VALUES(observacion),
            usuario     = VALUES(usuario),
            created_at  = CURRENT_TIMESTAMP
    """), {
        "fecha": date.today(),
        "turno": body.turno,
        "key":   body.equipo_key,
        "estado": body.estado,
        "obs":   body.observacion,
        "usr":   body.usuario,
    })
    await db.commit()
    return {"ok": True}
