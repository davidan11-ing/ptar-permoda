from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel, field_validator, ConfigDict
from typing import Optional
from datetime import date
from app.database import get_db

router = APIRouter()

# Mapeo de frontend contador IDs a columnas en contadores_lectura
CONTADOR_MAPPING = {
    # ── Contadores PTAR diarios ──────────────────────────────────────────────
    'C-10': 'tanque_reuso_2in',
    'C-11': 'ptar',
    'C-12': 'entrada_ro1',
    'C-13': 'salida_ro1',
    'C-14': 'entrada_ro2',
    'C-15': 'salida_ro2',
    'C-17': 'medidor_verde_retorno',
    'C-19': 'envio_th',
    'C-20': 'mbr1',
    'C-21': 'mbr2',
    'C-22': 'ingreso_uf_ptap',
    'C-23': 'salida_uf_ptap',
    'C-36': 'gem_prueba',
    # ── Contadores adicionales (acueducto, producción, auxiliares) ───────────
    'C-01': 'entrada_ap_principal_6in',
    'C-02': 'entrada_ap_fria_lavanderia_4in',
    'C-03': 'entrada_ap_lab_lavanderia',
    'C-04': 'entrada_medidor_rojo_tintoreria_4in',
    'C-05': 'entrada_ap_fria_tintoreria_4in',
    'C-06': 'entrada_medidor_rojo_lavanderia_4in',
    'C-07': 'rama',
    'C-08': 'abridora_1',
    'C-09': 'abridora_2',
    'C-16': 'entrada_ap_rotativa_3in',
    'C-18': 'entrada_ap_tintoreria_6in',
    'C-24': 'entrada_ap_ptar2_acueducto',
    'C-25': 'entrada_ap_puerta4_acueducto',
    'C-26': 'entrada_ap_quimicos',
    'C-27': 'agua_caliente_tintoreria',
    'C-28': 'medidor_prueba_agua_caliente',
    'C-29': 'entrada_ap_puerta2_acueducto',
    'C-30': 'entrada_ap_caldera_acueducto',
    'C-31': 'entrada_ap_puerta5_acueducto',
    'C-32': 'entrada_ap_puerta6_acueducto',
    'C-33': 'entrada_ap_puerta7_acueducto',
    'C-34': 'entrada_ap_lavanderia_acueducto',
    'C-35': 'entrada_ap_zona_lodos_acueducto',
}


class LecturaContadorIn(BaseModel):
    """Modelo para recibir una lectura de contador desde el formulario"""
    model_config = ConfigDict(extra='ignore')  # Ignorar campos no esperados

    fecha: Optional[date] = None
    turno: str  # 'mañana'|'tarde'|'noche'
    usuario: str
    equipo: Optional[str] = None  # JSON array de nombres del equipo en turno
    id_contador: str  # C-12, C-13, etc.
    nombre_contador: str
    ubicacion: str
    tipo_agua: str
    lectura_anterior_m3: float
    lectura_actual_m3: float
    observaciones: Optional[str] = None

    @field_validator('turno')
    @classmethod
    def validate_turno(cls, v):
        v_lower = v.lower().replace('ñ', 'n')
        if v_lower not in {"manana", "tarde", "noche"}:
            raise ValueError(f"Turno debe ser 'mañana', 'tarde' o 'noche', recibido: {v}")
        return v_lower


class CaudalesBatchResponse(BaseModel):
    inserted: int
    updated: int
    total: int


class BalanceHidricoOut(BaseModel):
    fecha: date
    turno: int
    semana: int | None
    ingreso_ptap: float | None
    potable_ptap: float | None
    carrotanques_m3: float | None
    mulas_funza_m3: float | None
    contador_principal: float | None
    entrada_ro1: float | None
    permeado_ro1: float | None
    rechazo_ro1: float | None
    eficiencia_ro_pct: float | None
    permeado_mbr1: float | None
    permeado_mbr2: float | None
    envio_th: float | None
    acueducto_m3: float | None
    total_agua_limpia_m3: float | None
    consumo_gem_m3: float | None
    lavanderia_m3: float | None
    tintoreria_m3: float | None
    rotativa_m3: float | None
    und_efectivas: float | None
    kg_tela: float | None
    m_tela: float | None
    indicador_lav_l_und: float | None
    indicador_tin_l_kg: float | None
    indicador_rot_l_m: float | None
    rollover_detectado: int | None


class ResumenBalance(BaseModel):
    medidor: str
    descripcion: str
    total_m3: float
    n_turnos: int


TURNO_INT = {"mañana": 1, "manana": 1, "tarde": 2, "noche": 3}

# Mapeo turno a hora_lectura requerida por CHECK CONSTRAINT chk_hora_turno
TURNO_HORA_MAP = {
    1: "22:00:00",  # noche (10PM)
    2: "06:00:00",  # mañana (6AM)
    3: "14:00:00",  # tarde (2PM)
}


# ── GET / — detalle por turno ────────────────────────────────────────────────

@router.get("/", response_model=list[BalanceHidricoOut])
async def get_balance(
    fecha: str | None = Query(None, description="YYYY-MM-DD"),
    fecha_inicio: str | None = Query(None),
    fecha_fin: str | None = Query(None),
    turno: int | None = Query(None, ge=1, le=3),
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
    if turno is not None:
        filters.append("turno = :turno")
        params["turno"] = turno
    where = ("WHERE " + " AND ".join(filters)) if filters else ""
    rows = (await db.execute(text(f"""
        SELECT fecha, turno, semana,
               ingreso_ptap, potable_ptap, carrotanques_m3, mulas_funza_m3,
               contador_principal,
               entrada_ro1, permeado_ro1, rechazo_ro1, eficiencia_ro_pct,
               permeado_mbr1, permeado_mbr2, envio_th,
               acueducto_m3, total_agua_limpia_m3, consumo_gem_m3,
               lavanderia_m3, tintoreria_m3, rotativa_m3,
               und_efectivas, kg_tela, m_tela,
               indicador_lav_l_und, indicador_tin_l_kg, indicador_rot_l_m,
               rollover_detectado
        FROM v_balance_hidrico
        {where}
        ORDER BY fecha DESC, turno DESC
        LIMIT :limit
    """), params)).mappings().all()
    return [BalanceHidricoOut(**dict(r)) for r in rows]


@router.post("/batch", response_model=CaudalesBatchResponse)
async def create_caudales_batch(registros: list[LecturaContadorIn], db: AsyncSession = Depends(get_db)):
    """
    Guardar un lote de lecturas de contadores.

    Agrupa por (fecha, turno) y actualiza la fila correspondiente en contadores_lectura.

    Validaciones:
    - Fecha no puede ser futura
    - Turno debe ser válido (mañana/tarde/noche)
    - id_contador debe estar en el mapeo

    Estrategia: Una lectura por contador; se agrupa todo por (fecha, turno) en una sola
    fila contadores_lectura con múltiples columnas.
    """
    today = date.today()
    inserted, updated = 0, 0
    turno_map = {"manana": 1, "tarde": 2, "noche": 3}

    # Agrupar por (fecha, turno)
    # Cada entrada: {'usuario': str, 'cols': {col_name: valor}}
    grouped: dict[tuple[date, int], dict] = {}

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

        # Resolver contador
        col_name = CONTADOR_MAPPING.get(reg.id_contador)
        if col_name is None:
            raise HTTPException(status_code=400, detail=f"Contador no soportado: {reg.id_contador}")

        # Agrupar
        key = (fecha, turno_int)
        if key not in grouped:
            grouped[key] = {'usuario': reg.usuario, 'equipo': reg.equipo, 'cols': {}}

        grouped[key]['cols'][col_name] = reg.lectura_actual_m3

    # Ahora insertar/actualizar por (fecha, turno)
    for (fecha, turno_int), group_data in grouped.items():
        col_values = group_data['cols']
        usuario    = group_data['usuario']
        equipo     = group_data.get('equipo')

        # Construir dinámicamente las columnas a insertar
        hora_lectura = TURNO_HORA_MAP.get(turno_int, "12:00:00")
        cols = ['fecha', 'turno', 'hora_lectura', 'usuario']
        vals = [':fecha', ':turno', f"'{hora_lectura}'", ':usuario']
        params = {'fecha': fecha, 'turno': turno_int, 'usuario': usuario}
        update_parts = ['usuario = :usuario']

        if equipo is not None:
            cols.append('equipo')
            vals.append(':equipo')
            params['equipo'] = equipo
            update_parts.append('equipo = :equipo')

        for col_name, value in col_values.items():
            cols.append(col_name)
            vals.append(f':{col_name}')
            params[col_name] = value
            update_parts.append(f'{col_name} = :{col_name}')

        cols_str = ', '.join(cols)
        vals_str = ', '.join(vals)
        update_clause = ', '.join(update_parts)

        sql_str = f"""
            INSERT INTO contadores_lectura ({cols_str})
            VALUES ({vals_str})
            ON DUPLICATE KEY UPDATE
                {update_clause},
                actualizado_en = CURRENT_TIMESTAMP
        """

        result = await db.execute(text(sql_str), params)

        # Detectar insert vs update
        if result.rowcount == 1:
            inserted += 1
        elif result.rowcount == 2:
            updated += 1

    await db.commit()
    return CaudalesBatchResponse(inserted=inserted, updated=updated, total=inserted + updated)


# ── GET /ultimas-lecturas — último turno disponible ──────────────────────────

@router.get("/ultimas-lecturas")
async def get_ultimas_lecturas(db: AsyncSession = Depends(get_db)):
    """Devuelve los valores del turno más reciente en v_balance_hidrico."""
    row = (await db.execute(text("""
        SELECT fecha, turno,
               envio_th, entrada_ro1, permeado_ro1, rechazo_ro1, eficiencia_ro_pct,
               consumo_gem_m3, ingreso_ptap, potable_ptap,
               lavanderia_m3, tintoreria_m3, rotativa_m3,
               acueducto_m3, total_agua_limpia_m3,
               carrotanques_m3, mulas_funza_m3
        FROM v_balance_hidrico
        ORDER BY fecha DESC, turno DESC
        LIMIT 1
    """))).mappings().first()

    if not row:
        return {}

    # Retornar un dict con los valores mapeados a los ids del contador
    row_dict = dict(row)
    result = {}
    for contador_id, col_name in CONTADOR_MAPPING.items():
        if col_name in row_dict:
            result[contador_id] = row_dict[col_name]
    return result


# ── GET /resumen — totales por medidor en el período ─────────────────────────

@router.get("/resumen", response_model=list[ResumenBalance])
async def get_resumen_balance(
    fecha_inicio: str = Query(..., description="YYYY-MM-DD"),
    fecha_fin: str = Query(..., description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(text("""
        SELECT medidor, descripcion,
               ROUND(COALESCE(SUM(m3), 0), 2) AS total_m3,
               COUNT(*)                         AS n_turnos
        FROM (
            SELECT 'envio_th'            AS medidor, 'Envío a TH'           AS descripcion, envio_th            AS m3 FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
            UNION ALL
            SELECT 'ingreso_ptap',        'Ingreso PTAP',                                  ingreso_ptap         FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
            UNION ALL
            SELECT 'potable_ptap',        'Potable PTAP',                                  potable_ptap         FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
            UNION ALL
            SELECT 'entrada_ro1',         'Entrada RO1 (m³)',                              entrada_ro1          FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
            UNION ALL
            SELECT 'permeado_ro1',        'Permeado RO1',                                  permeado_ro1         FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
            UNION ALL
            SELECT 'rechazo_ro1',         'Rechazo RO1',                                   rechazo_ro1          FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
            UNION ALL
            SELECT 'consumo_gem_m3',      'Caudal tratado GEM',                            consumo_gem_m3       FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
            UNION ALL
            SELECT 'lavanderia_m3',       'Lavandería',                                     lavanderia_m3        FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
            UNION ALL
            SELECT 'tintoreria_m3',       'Tintorería',                                     tintoreria_m3        FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
            UNION ALL
            SELECT 'rotativa_m3',         'Rotativa',                                       rotativa_m3          FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
            UNION ALL
            SELECT 'acueducto_m3',        'Acueducto (calculado)',                          acueducto_m3         FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
            UNION ALL
            SELECT 'total_agua_limpia_m3','Total agua limpia producción',                   total_agua_limpia_m3 FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
            UNION ALL
            SELECT 'carrotanques_m3',     'Carrotanques',                                   carrotanques_m3      FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
            UNION ALL
            SELECT 'mulas_funza_m3',      'Mulas Funza',                                    mulas_funza_m3       FROM v_balance_hidrico WHERE fecha BETWEEN :fi AND :ff
        ) u
        WHERE m3 IS NOT NULL AND m3 > 0
        GROUP BY medidor, descripcion
        ORDER BY total_m3 DESC
    """), {"fi": fecha_inicio, "ff": fecha_fin})).mappings().all()
    return [ResumenBalance(**dict(r)) for r in rows]
