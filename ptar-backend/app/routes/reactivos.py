from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, field_validator, ConfigDict
from datetime import date
from typing import Optional
from app.database import get_db

router = APIRouter()

# Rutas de reactivos químicos — todas usan las vistas del proyecto:
#   v_consumo_quimico_diario      : detalle diario (10 productos)
#   v_consumo_quimico_mensual     : agregado mensual por producto
#   v_quimico_real_vs_proyectado  : cruce real vs Plan Maestro
#   v_quimico_estadisticas_dia    : min/max/avg/stddev (estilo hoja GRAFICAS)

# Mapeo de químicos Q-XX a nombres y sistemas
# Tupla: (nombre, sistema, col_consumo_l, col_kg, col_ppm, col_costo, col_nivel_final)
QUIMICOS_MAP = {
    'Q-01': ('Ácido',             'GEM', 'consumo_acido_l',         'kg_acido',               'ppm_acido',          'costo_op_acido',      'final_acido_l'),
    'Q-02': ('Coagulante',        'GEM', 'consumo_coagulante_l',    'kg_coagulante',           'ppm_coagulante',     'costo_op_coagulante', 'final_coagulante_l'),
    'Q-03': ('Decolorante',       'GEM', 'consumo_decolorante_l',   'kg_decolorante',          'ppm_decolorante',    'costo_op_decolorante','final_decolorante_l'),
    'Q-04': ('Polímero Aniónico', 'GEM', 'consumo_pol_anionico_l',  'consumo_pol_anionico_kg', 'ppm_pol_anionico',   'costo_op_anionico',   'final_pol_anionico_kg'),
    'Q-05': ('Polímero Catiónico','GEM', 'consumo_pol_cationico_l', 'consumo_pol_cationico_kg','ppm_pol_cationico',  'costo_op_cationico',  'final_pol_cationico_kg'),
    # ── Sistema RO (placeholder — columnas por confirmar) ────────────────────
    'Q-06': ('Anti-incrustante',       'RO', 'consumo_antiincrustante_l', 'kg_antiincrustante', 'ppm_antiincrustante', 'costo_op_antiincrustante', 'final_antiincrustante_l'),
    'Q-07': ('Biocida / Desinfectante','RO', 'consumo_biocida_l',         'kg_biocida',         'ppm_biocida',         'costo_op_biocida',         'final_biocida_l'),
    'Q-08': ('Limpiador Químico',      'RO', 'consumo_limpiador_l',       'kg_limpiador',       'ppm_limpiador',       'costo_op_limpiador',       'final_limpiador_l'),
}


class RegistroReactivoIn(BaseModel):
    """Modelo para recibir un registro de consumo químico desde el formulario"""
    model_config = ConfigDict(extra='ignore')  # Ignorar campos no esperados

    fecha: Optional[date] = None
    turno: str  # 'mañana'|'tarde'|'noche'
    usuario: str
    equipo: Optional[str] = None               # JSON array de nombres del equipo en turno
    id_quimico: str  # Q-01, Q-02, etc.
    nombre_quimico: str
    unidad: str  # L o kg
    densidad_kg: float
    nivel_inicial: float
    nivel_final: float
    kg_consumidos: float
    precio_kg: float
    horometro_inicial: float
    caudal_tratado_gem: float
    horas_operacion: float
    observaciones: Optional[str] = None
    ingreso_coagulante_l: Optional[float] = None         # solo Q-02: ingreso recibido
    trasegado_coagulante_ptap_l: Optional[float] = None  # solo Q-02: trasiego a PTAP

    @field_validator('turno')
    @classmethod
    def validate_turno(cls, v):
        v_lower = v.lower().replace('ñ', 'n')
        if v_lower not in {"manana", "tarde", "noche"}:
            raise ValueError(f"Turno debe ser 'mañana', 'tarde' o 'noche', recibido: {v}")
        return v_lower


class ReactivosBatchResponse(BaseModel):
    inserted: int
    updated: int
    total: int


class ConsumoQuimicoDia(BaseModel):
    fecha: date
    sistema: str
    producto_id: int
    producto_codigo: str | None
    producto_nombre: str
    L_dia: float | None
    kg_dia: float | None
    ppm_promedio_dia: float | None
    costo_dia: float | None
    caudal_m3_dia: float | None


class ConsumoQuimicoMes(BaseModel):
    anio: int
    mes: int
    sistema: str
    producto_id: int
    producto_nombre: str
    dias_con_dato: int | None
    kg_mes: float | None
    L_mes: float | None
    kg_promedio_diario: float | None
    ppm_promedio_mes: float | None
    costo_mes: float | None
    caudal_total_m3_mes: float | None
    kg_por_m3: float | None
    pesos_por_m3: float | None


class RealVsProyectado(BaseModel):
    anio: int
    mes: int
    producto_id: int
    producto: str
    sistema: str
    kg_real: float | None
    costo_real: float | None
    kg_proyectado: float | None
    costo_proyectado: float | None
    kg_por_m3_real: float | None
    kg_por_m3_proyectado: float | None
    caudal_real_m3: float | None
    caudal_proyectado_m3: float | None
    desviacion_kg: float | None
    desviacion_pct: float | None
    cumplimiento_pct: float | None
    cumplimiento_costo_pct: float | None


class EstadisticasDia(BaseModel):
    anio: int
    mes: int
    sistema: str
    producto_id: int
    producto_nombre: str
    dias: int | None
    kg_min: float | None
    kg_max: float | None
    kg_avg: float | None
    kg_stddev: float | None
    kg_total: float | None
    L_min: float | None
    L_max: float | None
    L_avg: float | None
    ppm_min: float | None
    ppm_max: float | None
    ppm_avg: float | None
    costo_min: float | None
    costo_max: float | None
    costo_avg: float | None
    costo_total: float | None


# ── GET /ultimo-horometro — último horómetro registrado ─────────────────────

@router.get("/ultimo-horometro")
async def get_ultimo_horometro(db: AsyncSession = Depends(get_db)):
    """Devuelve el último horómetro registrado en operacion_gem_turno."""
    row = (await db.execute(text("""
        SELECT horometro_inicial AS horometro,
               DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
               CASE turno WHEN 1 THEN 'mañana' WHEN 2 THEN 'tarde' WHEN 3 THEN 'noche' ELSE NULL END AS turno
        FROM operacion_gem_turno
        WHERE horometro_inicial IS NOT NULL AND horometro_inicial > 0
        ORDER BY fecha DESC, turno DESC
        LIMIT 1
    """))).mappings().first()

    if not row:
        return {"horometro": None, "fecha": None, "turno": None}

    return dict(row)


# ── GET / — detalle diario por producto (v_consumo_quimico_diario) ────────────

@router.get("/", response_model=list[ConsumoQuimicoDia])
async def get_reactivos(
    fecha: str | None = Query(None, description="YYYY-MM-DD"),
    fecha_inicio: str | None = Query(None),
    fecha_fin: str | None = Query(None),
    sistema: str | None = Query(None, description="GEM | RO | PTAP | OTRO"),
    producto_nombre: str | None = Query(None),
    limit: int = Query(500, ge=1, le=2000),
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
    if sistema:
        filters.append("sistema = :sistema")
        params["sistema"] = sistema.upper()
    if producto_nombre:
        filters.append("producto_nombre LIKE :pn")
        params["pn"] = f"%{producto_nombre.upper()}%"
    where = ("WHERE " + " AND ".join(filters)) if filters else ""
    rows = (await db.execute(text(f"""
        SELECT fecha, sistema, producto_id, producto_codigo, producto_nombre,
               L_dia, kg_dia, ppm_promedio_dia, costo_dia, caudal_m3_dia
        FROM v_consumo_quimico_diario
        {where}
        ORDER BY fecha DESC, sistema, producto_nombre
        LIMIT :limit
    """), params)).mappings().all()
    return [ConsumoQuimicoDia(**dict(r)) for r in rows]


@router.post("/batch", response_model=ReactivosBatchResponse)
async def create_reactivos_batch(registros: list[RegistroReactivoIn], db: AsyncSession = Depends(get_db)):
    """
    Guardar un lote de consumos de reactivos químicos (GEM o RO).

    Los registros se distribuyen a las tablas operacion_gem_turno u operacion_ro_turno
    según el sistema del químico.

    Validaciones:
    - Turno debe ser válido (mañana/tarde/noche)
    - id_quimico debe estar en el catálogo

    Estrategia: Agrupa por (fecha, turno, sistema) e inserta en la tabla correspondiente
    """
    from datetime import datetime

    today = date.today()
    inserted, updated = 0, 0
    turno_map = {"manana": 1, "tarde": 2, "noche": 3}

    # Agrupar por (fecha, turno, sistema)
    grouped: dict[tuple[date, int, str], dict[str, any]] = {}

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

        # Resolver químico
        quimico_info = QUIMICOS_MAP.get(reg.id_quimico)
        if quimico_info is None:
            raise HTTPException(status_code=400, detail=f"Químico no soportado: {reg.id_quimico}")

        nombre, sistema, col_l, col_kg, col_ppm, col_costo, col_final = quimico_info

        # Agrupar por (fecha, turno, sistema)
        key = (fecha, turno_int, sistema)
        if key not in grouped:
            grouped[key] = {
                'fecha': fecha,
                'turno': turno_int,
                'usuario': reg.usuario,
                'equipo': reg.equipo,
                'horometro_inicial': reg.horometro_inicial,
                'caudal_tratado_gem': reg.caudal_tratado_gem,
                'horas_operacion': reg.horas_operacion,
                'columns': {}
            }

        # Almacenar valores de columnas específicas del químico
        grouped[key]['columns'][col_l]     = reg.nivel_inicial - reg.nivel_final if reg.unidad == 'L' else None
        grouped[key]['columns'][col_kg]    = reg.kg_consumidos
        grouped[key]['columns'][col_ppm]   = (reg.kg_consumidos / reg.caudal_tratado_gem * 1000) if reg.caudal_tratado_gem > 0 else None
        grouped[key]['columns'][col_costo] = reg.kg_consumidos * reg.precio_kg
        grouped[key]['columns'][col_final] = reg.nivel_final  # nivel de tanque al final del turno

        # Campos adicionales para Q-02 (Coagulante)
        if reg.id_quimico == 'Q-02':
            if reg.ingreso_coagulante_l is not None:
                grouped[key]['columns']['ingreso_coagulante_l'] = reg.ingreso_coagulante_l
            if reg.trasegado_coagulante_ptap_l is not None:
                grouped[key]['columns']['trasegado_coagulante_ptap_l'] = reg.trasegado_coagulante_ptap_l

    # Ahora insertar/actualizar por (fecha, turno, sistema)
    for (fecha, turno_int, sistema), data in grouped.items():
        table_name = 'operacion_gem_turno' if sistema == 'GEM' else f'operacion_ro_turno'

        # Construir dinámicamente las columnas a insertar
        horas = data['horas_operacion']
        caudal_m3h = round(data['caudal_tratado_gem'] / horas, 2) if horas and horas > 0 else None

        equipo = data.get('equipo')
        cols = ['fecha', 'turno', 'dia_mes', 'horometro_inicial', 'caudal_total_tratado_gem_m3', 'caudal_tratamiento_m3h', 'usuario']
        vals = [':fecha', ':turno', 'DAY(:fecha)', ':horometro_inicial', ':caudal_tratado_gem', ':caudal_tratamiento_m3h', ':usuario']
        params = {
            'fecha': fecha,
            'turno': turno_int,
            'horometro_inicial': data['horometro_inicial'],
            'caudal_tratado_gem': data['caudal_tratado_gem'],
            'caudal_tratamiento_m3h': caudal_m3h,
            'usuario': data['usuario']
        }
        update_parts = []

        if equipo is not None:
            cols.append('equipo')
            vals.append(':equipo')
            params['equipo'] = equipo
            update_parts.append('equipo = :equipo')

        for col_name, value in data['columns'].items():
            if value is not None:
                cols.append(col_name)
                vals.append(f':{col_name}')
                params[col_name] = value
                update_parts.append(f'{col_name} = :{col_name}')

        cols_str = ', '.join(cols)
        vals_str = ', '.join(vals)
        update_clause = ', '.join(update_parts) if update_parts else 'usuario = :usuario'

        sql_str = f"""
            INSERT INTO {table_name} ({cols_str})
            VALUES ({vals_str})
            ON DUPLICATE KEY UPDATE
                {update_clause}
        """

        result = await db.execute(text(sql_str), params)

        # Detectar insert vs update
        if result.rowcount == 1:
            inserted += 1
        elif result.rowcount == 2:
            updated += 1

    await db.commit()
    return ReactivosBatchResponse(inserted=inserted, updated=updated, total=inserted + updated)


# ── GET /resumen — agregado mensual (v_consumo_quimico_mensual) ───────────────

@router.get("/resumen", response_model=list[ConsumoQuimicoMes])
async def get_resumen_reactivos(
    fecha_inicio: str = Query(..., description="YYYY-MM-DD"),
    fecha_fin: str = Query(..., description="YYYY-MM-DD"),
    sistema: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    filters = [
        "(anio * 100 + mes) BETWEEN (YEAR(:fi) * 100 + MONTH(:fi)) "
        "AND (YEAR(:ff) * 100 + MONTH(:ff))"
    ]
    params: dict = {"fi": fecha_inicio, "ff": fecha_fin}
    if sistema:
        filters.append("sistema = :sistema")
        params["sistema"] = sistema.upper()
    where = "WHERE " + " AND ".join(filters)
    rows = (await db.execute(text(f"""
        SELECT anio, mes, sistema, producto_id, producto_nombre,
               dias_con_dato, kg_mes, L_mes, kg_promedio_diario,
               ppm_promedio_mes, costo_mes, caudal_total_m3_mes,
               kg_por_m3, pesos_por_m3
        FROM v_consumo_quimico_mensual
        {where}
        ORDER BY anio, mes, sistema, producto_nombre
    """), params)).mappings().all()
    return [ConsumoQuimicoMes(**dict(r)) for r in rows]


# ── GET /proyeccion — real vs Plan Maestro (v_quimico_real_vs_proyectado) ─────

@router.get("/proyeccion", response_model=list[RealVsProyectado])
async def get_proyeccion(
    anio: int = Query(..., description="Año proyectado, p.ej. 2026"),
    mes: int | None = Query(None, ge=1, le=12),
    sistema: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    filters = ["anio = :anio"]
    params: dict = {"anio": anio}
    if mes is not None:
        filters.append("mes = :mes")
        params["mes"] = mes
    if sistema:
        filters.append("sistema = :sistema")
        params["sistema"] = sistema.upper()
    where = "WHERE " + " AND ".join(filters)
    rows = (await db.execute(text(f"""
        SELECT anio, mes, producto_id, producto, sistema,
               kg_real, costo_real, kg_proyectado, costo_proyectado,
               kg_por_m3_real, kg_por_m3_proyectado,
               caudal_real_m3, caudal_proyectado_m3,
               desviacion_kg, desviacion_pct,
               cumplimiento_pct, cumplimiento_costo_pct
        FROM v_quimico_real_vs_proyectado
        {where}
        ORDER BY mes, sistema, producto
    """), params)).mappings().all()
    return [RealVsProyectado(**dict(r)) for r in rows]


# ── GET /estadisticas — min/max/avg estilo GRAFICAS ──────────────────────────

@router.get("/estadisticas", response_model=list[EstadisticasDia])
async def get_estadisticas_reactivos(
    anio: int = Query(..., description="Año, p.ej. 2026"),
    mes: int | None = Query(None, ge=1, le=12),
    sistema: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    filters = ["anio = :anio"]
    params: dict = {"anio": anio}
    if mes is not None:
        filters.append("mes = :mes")
        params["mes"] = mes
    if sistema:
        filters.append("sistema = :sistema")
        params["sistema"] = sistema.upper()
    where = "WHERE " + " AND ".join(filters)
    rows = (await db.execute(text(f"""
        SELECT anio, mes, sistema, producto_id, producto_nombre,
               dias, kg_min, kg_max, kg_avg, kg_stddev, kg_total,
               L_min, L_max, L_avg,
               ppm_min, ppm_max, ppm_avg,
               costo_min, costo_max, costo_avg, costo_total
        FROM v_quimico_estadisticas_dia
        {where}
        ORDER BY mes, sistema, producto_nombre
    """), params)).mappings().all()
    return [EstadisticasDia(**dict(r)) for r in rows]
