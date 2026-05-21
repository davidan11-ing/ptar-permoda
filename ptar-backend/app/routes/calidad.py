from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, field_validator, Field, ConfigDict
from datetime import date, datetime
from typing import Optional
from app.database import get_db

router = APIRouter()

# Rutas de calidad — todas las consultas usan las vistas creadas en este proyecto:
#   v_tabla_datos_1       : detalle pivot (fecha, turno, parámetro × 15 unidades)
#   v_calidad_estadisticas: estadísticas mensuales (min/max/avg/stddev/CV%)
#   v_calidad_remociones  : % remoción GEM / biológico / RO / global


class RegistroCalidadIn(BaseModel):
    """Modelo para recibir registros de calidad desde el formulario"""
    model_config = ConfigDict(extra='ignore')  # Ignorar campos no esperados

    fecha: Optional[date] = None
    turno: str  # 'mañana'|'tarde'|'noche'
    usuario: str
    unidad_tratamiento: str  # Nombre descriptivo (ej: "PULMON", "GEM_SALIDA")
    parametro: str  # Nombre del parámetro (ej: "DQO", "pH")
    valor: Optional[float] = None
    metodo: Optional[str] = None
    no_aplica: bool = False
    observaciones: Optional[str] = None

    @field_validator('turno')
    @classmethod
    def validate_turno(cls, v):
        v_lower = v.lower().replace('ñ', 'n')  # "mañana" → "manana"
        if v_lower not in {"manana", "tarde", "noche"}:
            raise ValueError(f"Turno debe ser 'mañana', 'tarde' o 'noche', recibido: {v}")
        return v_lower


class CalidadBatchResponse(BaseModel):
    inserted: int
    updated: int
    total: int


class TablaDatos1Out(BaseModel):
    fecha: date
    turno: int
    parametro_codigo: str
    parametro: str
    parametro_unidad: str | None
    pulmon: float | None
    homogeneizador: float | None
    gem_salida: float | None
    anoxico: float | None
    mbbr: float | None
    mbr1_interno: float | None
    mbr2_interno: float | None
    mbr1_permeado: float | None
    mbr2_permeado: float | None
    vertimiento: float | None
    ro1_compuesta: float | None
    ro1_etapa1: float | None
    ro1_etapa2: float | None
    ro2_permeado: float | None
    ro_rechazo: float | None


class EstadisticasOut(BaseModel):
    anio: int
    mes: int
    parametro_codigo: str
    parametro: str
    parametro_unidad: str | None
    unidad_codigo: str
    unidad: str
    orden_tren: int | None
    n_mediciones: int
    minimo: float | None
    maximo: float | None
    promedio: float | None
    desv_estandar: float | None
    cv_pct: float | None
    pct_fuera_limite_vert: float | None


class RemocionesOut(BaseModel):
    fecha: date
    turno: int
    parametro_codigo: str
    parametro: str
    parametro_unidad: str | None
    pulmon: float | None
    gem_salida: float | None
    mbr_permeado_avg: float | None
    ro1_compuesta: float | None
    vertimiento: float | None
    pct_remocion_gem: float | None
    pct_remocion_biologico: float | None
    pct_remocion_ro: float | None
    pct_remocion_global: float | None


TURNO_INT = {"mañana": 1, "manana": 1, "tarde": 2, "noche": 3}


# ── GET / — detalle pivot (v_tabla_datos_1) ──────────────────────────────────

@router.get("/", response_model=list[TablaDatos1Out])
async def get_calidad(
    fecha: str | None = Query(None, description="YYYY-MM-DD"),
    fecha_inicio: str | None = Query(None),
    fecha_fin: str | None = Query(None),
    turno: int | None = Query(None, ge=1, le=3),
    parametro_codigo: str | None = Query(None, description="Código p.ej. DQO, PH, TDS"),
    limit: int = Query(500, ge=1, le=5000),
    db: AsyncSession = Depends(get_db),
):
    filters, params = [], {"limit": limit}
    if fecha:
        filters.append("fecha = :fecha")
        params["fecha"] = fecha
    elif fecha_inicio and fecha_fin:
        filters.append("fecha BETWEEN :fi AND :ff")
        params["fi"] = fecha_inicio
        params["ff"] = fecha_fin
    if turno is not None:
        filters.append("turno = :turno")
        params["turno"] = turno
    if parametro_codigo:
        filters.append("parametro_codigo = :pc")
        params["pc"] = parametro_codigo.upper()
    where = ("WHERE " + " AND ".join(filters)) if filters else ""
    sql = f"""
        SELECT fecha, turno, parametro_codigo, parametro, parametro_unidad,
               pulmon, homogeneizador, gem_salida, anoxico, mbbr,
               mbr1_interno, mbr2_interno, mbr1_permeado, mbr2_permeado,
               vertimiento, ro1_compuesta, ro1_etapa1, ro1_etapa2,
               ro2_permeado, ro_rechazo
        FROM v_tabla_datos_1
        {where}
        ORDER BY fecha DESC, turno DESC, parametro
        LIMIT :limit
    """
    rows = (await db.execute(text(sql), params)).mappings().all()
    return [TablaDatos1Out(**dict(r)) for r in rows]


@router.post("/batch", response_model=CalidadBatchResponse)
async def create_calidad_batch(registros: list[RegistroCalidadIn], db: AsyncSession = Depends(get_db)):
    """
    Guardar un lote de mediciones de calidad.

    Validaciones:
    - Fecha no puede ser futura
    - Turno debe ser válido (mañana/tarde/noche)
    - Parámetro y unidad_tratamiento deben existir en BD

    Estrategia: UPSERT por (fecha, turno, parametro_id, unidad_id)
    """
    today = date.today()
    inserted, updated = 0, 0

    # Mapeo turno string → int
    turno_map = {"manana": 1, "tarde": 2, "noche": 3}

    # Pre-cargar todos los parámetros y unidades para evitar queries repetidas
    params_rows = (await db.execute(text("""
        SELECT id, nombre FROM parametro_calidad
    """))).mappings().all()

    units_rows = (await db.execute(text("""
        SELECT id, nombre FROM unidad_tratamiento
    """))).mappings().all()

    # Crear mapas
    param_map = {str(r['nombre']).upper(): r['id'] for r in params_rows}
    unit_map = {str(r['nombre']).upper(): r['id'] for r in units_rows}

    for reg in registros:
        # Si no viene fecha, usar hoy
        fecha = reg.fecha or today

        # Validación: fecha no futura
        if fecha > today:
            raise HTTPException(status_code=400, detail=f"Fecha {fecha} no puede ser futura")

        # Resolver turno
        turno_int = turno_map.get(reg.turno)
        if turno_int is None:
            raise HTTPException(status_code=400, detail=f"Turno inválido: {reg.turno}")

        # Resolver parámetro_id
        param_key = reg.parametro.upper()
        parametro_id = None
        for k, v in param_map.items():
            if param_key in k or k in param_key:
                parametro_id = v
                break

        if parametro_id is None:
            raise HTTPException(status_code=400, detail=f"Parámetro no encontrado: {reg.parametro}")

        # Resolver unidad_id
        unit_key = reg.unidad_tratamiento.upper()
        unidad_id = None
        for k, v in unit_map.items():
            if unit_key in k or k in unit_key:
                unidad_id = v
                break

        if unidad_id is None:
            raise HTTPException(status_code=400, detail=f"Unidad no encontrada: {reg.unidad_tratamiento}")

        # UPSERT en medicion_calidad
        sql = text("""
            INSERT INTO medicion_calidad
            (fecha, turno, parametro_id, unidad_id, valor, observacion, usuario, metodo, no_aplica)
            VALUES (:fecha, :turno, :param_id, :unit_id, :valor, :obs, :usuario, :metodo, :no_aplica)
            ON DUPLICATE KEY UPDATE
                valor = :valor,
                observacion = :obs,
                usuario = :usuario,
                metodo = :metodo,
                no_aplica = :no_aplica,
                updated_at = CURRENT_TIMESTAMP
        """)

        result = await db.execute(sql, {
            'fecha': fecha,
            'turno': turno_int,
            'param_id': parametro_id,
            'unit_id': unidad_id,
            'valor': reg.valor if not reg.no_aplica else None,
            'obs': reg.observaciones,
            'usuario': reg.usuario,
            'metodo': reg.metodo,
            'no_aplica': reg.no_aplica
        })

        # Detectar insert vs update
        if result.rowcount == 1:
            inserted += 1
        elif result.rowcount == 2:
            updated += 1

    await db.commit()
    return CalidadBatchResponse(inserted=inserted, updated=updated, total=inserted + updated)


# ── GET /parametros — catálogo de parámetros con datos ──────────────────────

@router.get("/parametros")
async def get_parametros_disponibles(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(text("""
        SELECT id, nombre, unidad AS unidad_medida
        FROM parametro_calidad
        ORDER BY nombre
    """))).mappings().all()
    return [dict(r) for r in rows]


# ── GET /mediciones — formato largo (una fila por medición) ──────────────────

@router.get("/mediciones")
async def get_mediciones_largo(
    parametro: str = Query(..., description="Nombre exacto del parámetro, ej: DQO"),
    fecha_inicio: str = Query(..., description="YYYY-MM-DD"),
    fecha_fin: str = Query(..., description="YYYY-MM-DD"),
    turno: int | None = Query(None, ge=1, le=3),
    solo_con_valor: bool = Query(True),
    limit: int = Query(5000, ge=1, le=20000),
    db: AsyncSession = Depends(get_db),
):
    """
    Devuelve mediciones en formato largo (fecha, turno_str, unidad_tratamiento, parametro, valor).
    Pensado para el dashboard de calidad del encargado.
    """
    filters = [
        "mc.fecha BETWEEN :fi AND :ff",
        "UPPER(p.nombre) = UPPER(:parametro)",
    ]
    params: dict = {"fi": fecha_inicio, "ff": fecha_fin, "parametro": parametro, "limit": limit}

    if turno is not None:
        filters.append("mc.turno = :turno")
        params["turno"] = turno
    if solo_con_valor:
        filters.append("mc.valor IS NOT NULL")
        filters.append("mc.no_aplica = 0")

    where = "WHERE " + " AND ".join(filters)

    rows = (await db.execute(text(f"""
        SELECT
            mc.fecha,
            CASE mc.turno
                WHEN 1 THEN 'mañana'
                WHEN 2 THEN 'tarde'
                WHEN 3 THEN 'noche'
            END                          AS turno,
            p.nombre                     AS parametro,
            u.nombre                     AS unidad_tratamiento,
            CAST(mc.valor AS DECIMAL(18,4)) AS valor,
            mc.metodo,
            mc.usuario
        FROM medicion_calidad mc
        JOIN parametro_calidad  p ON p.id = mc.parametro_id
        JOIN unidad_tratamiento u ON u.id = mc.unidad_id
        {where}
        ORDER BY mc.fecha ASC, mc.turno ASC
        LIMIT :limit
    """), params)).mappings().all()
    return [dict(r) for r in rows]


# ── GET /estadisticas — min/max/avg por (anio, mes, parámetro, unidad) ───────

@router.get("/estadisticas", response_model=list[EstadisticasOut])
async def get_estadisticas(
    anio: int = Query(..., description="Año, p.ej. 2026"),
    mes: int | None = Query(None, ge=1, le=12, description="Mes 1-12; omitir para todo el año"),
    parametro_codigo: str | None = Query(None),
    unidad_codigo: str | None = Query(None, description="Código unidad p.ej. VERTIMIENTO, MBR1_PER"),
    db: AsyncSession = Depends(get_db),
):
    filters = ["anio = :anio"]
    params: dict = {"anio": anio}
    if mes is not None:
        filters.append("mes = :mes")
        params["mes"] = mes
    if parametro_codigo:
        filters.append("parametro_codigo = :pc")
        params["pc"] = parametro_codigo.upper()
    if unidad_codigo:
        filters.append("unidad_codigo = :uc")
        params["uc"] = unidad_codigo.upper()
    where = "WHERE " + " AND ".join(filters)
    rows = (await db.execute(text(f"""
        SELECT anio, mes, parametro_codigo, parametro, parametro_unidad,
               unidad_codigo, unidad, orden_tren,
               n_mediciones, minimo, maximo, promedio,
               desv_estandar, cv_pct, pct_fuera_limite_vert
        FROM v_calidad_estadisticas
        {where}
        ORDER BY mes, parametro, orden_tren
    """), params)).mappings().all()
    return [EstadisticasOut(**dict(r)) for r in rows]


# ── GET /resumen — alias de /estadisticas para todo el período ───────────────

@router.get("/resumen")
async def get_resumen_calidad(
    fecha_inicio: str = Query(..., description="YYYY-MM-DD"),
    fecha_fin: str = Query(..., description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(text("""
        SELECT anio, mes, parametro_codigo, parametro, parametro_unidad,
               unidad_codigo, unidad, orden_tren,
               n_mediciones, minimo, maximo, promedio,
               desv_estandar, cv_pct, pct_fuera_limite_vert
        FROM v_calidad_estadisticas
        WHERE (anio * 100 + mes)
              BETWEEN (YEAR(:fi) * 100 + MONTH(:fi))
              AND     (YEAR(:ff) * 100 + MONTH(:ff))
        ORDER BY anio, mes, parametro, orden_tren
    """), {"fi": fecha_inicio, "ff": fecha_fin})).mappings().all()
    return [dict(r) for r in rows]


# ── GET /remociones — % remoción por etapa (v_calidad_remociones) ────────────

@router.get("/remociones", response_model=list[RemocionesOut])
async def get_remociones(
    fecha_inicio: str = Query(..., description="YYYY-MM-DD"),
    fecha_fin: str = Query(..., description="YYYY-MM-DD"),
    parametro_codigo: str | None = Query(None),
    turno: int | None = Query(None, ge=1, le=3),
    db: AsyncSession = Depends(get_db),
):
    filters = ["fecha BETWEEN :fi AND :ff"]
    params: dict = {"fi": fecha_inicio, "ff": fecha_fin}
    if parametro_codigo:
        filters.append("parametro_codigo = :pc")
        params["pc"] = parametro_codigo.upper()
    if turno is not None:
        filters.append("turno = :turno")
        params["turno"] = turno
    where = "WHERE " + " AND ".join(filters)
    rows = (await db.execute(text(f"""
        SELECT fecha, turno, parametro_codigo, parametro, parametro_unidad,
               pulmon, gem_salida, mbr_permeado_avg, ro1_compuesta, vertimiento,
               pct_remocion_gem, pct_remocion_biologico,
               pct_remocion_ro, pct_remocion_global
        FROM v_calidad_remociones
        {where}
        ORDER BY fecha DESC, turno, parametro
    """), params)).mappings().all()
    return [RemocionesOut(**dict(r)) for r in rows]
