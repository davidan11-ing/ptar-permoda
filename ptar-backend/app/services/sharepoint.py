"""
sharepoint.py
Servicio de sincronización SharePoint → MySQL para mantenimientos preventivos.
Usa Office365-REST-Python-Client con credenciales de usuario (sin Azure AD app).

Campos mapeados desde la lista SharePoint CONFIABILIDAD:
  field_1  → semana          field_3  → area
  field_4  → gft             field_5  → objeto
  field_6  → af              field_7  → descripcion
  field_9  → frecuencia      field_10 → responsable
  field_11 → pedido_trabajo  field_12 → estado
  field_13 → dia_programado  field_14 → asignado_a
  CRITICIDAD → criticidad    (columna con nombre explícito)
"""
import logging
from datetime import datetime, date
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

log = logging.getLogger("ptar.sharepoint")

# GUID de la lista SharePoint CONFIABILIDAD/MANTENIMIENTOS
SP_LIST_GUID = "9f6714c3-6a81-4773-90f3-0600085416af"

# Campos a seleccionar en la query OData
SP_SELECT = (
    "ID,field_1,field_3,field_4,field_5,field_6,field_7,"
    "field_9,field_10,field_11,field_12,field_13,field_14,"
    "CRITICIDAD,field_21,GERENCIA,TIPO_DE_MANTENIMIENTO"
)

# Normalización de ESTADO (igual que el BI)
_ESTADO_MAP = {
    "PROGRAMADO":    "PENDIENTE",
    "NO CONCERTADO": "PENDIENTE",
    "TERMINADO":     "COMPLETADO",
}
# Normalización de ÁREA
_AREA_MAP = {
    "CORTE FAMILIAS FUNZA":        "CORTE",
    "CORTE JEAN FUNZA":            "CORTE",
    "CORTE TEJIDO DE PUNTO FUNZA": "CORTE",
}


def _norm_estado(val: Optional[str]) -> Optional[str]:
    if not val:
        return val
    upper = val.strip().upper()
    return _ESTADO_MAP.get(upper, val.strip().upper())


def _norm_area(val: Optional[str]) -> Optional[str]:
    if not val:
        return val
    return _AREA_MAP.get(val.strip().upper(), val.strip())


def _parse_date(val) -> Optional[date]:
    """Convierte string ISO o datetime a date, None si falla."""
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val if isinstance(val, date) else val.date()
    try:
        return datetime.fromisoformat(str(val)[:10]).date()
    except Exception:
        return None


def _map_item(raw: dict) -> dict:
    """Convierte un ítem JSON de SharePoint al dict de la BD."""
    estado_raw = raw.get("field_12") or raw.get("ESTADO") or ""
    area_raw   = raw.get("field_3")  or raw.get("ÁREA")  or ""
    return {
        "sp_id":       int(raw.get("ID", 0)),
        "semana":      raw.get("field_1"),
        "gerencia":    raw.get("GERENCIA") or raw.get("field_0"),
        "area":        _norm_area(area_raw),
        "gft":         raw.get("field_4"),
        "objeto":      raw.get("field_5"),
        "af":          raw.get("field_6"),
        "descripcion": raw.get("field_7"),
        "frecuencia":  raw.get("field_9"),
        "responsable": raw.get("field_10"),
        "pedido":      raw.get("field_11"),
        "estado":      _norm_estado(estado_raw),
        "dia":         _parse_date(raw.get("field_13")),
        "asignado":    raw.get("field_14"),
        "criticidad":  raw.get("CRITICIDAD"),
        "tipo":        raw.get("TIPO_DE_MANTENIMIENTO") or raw.get("field_8"),
        "observaciones": raw.get("field_21"),
    }


# ── Función principal (síncrona — llamar con run_in_executor) ─────────────────

def fetch_sharepoint_items(site_url: str, email: str, password: str) -> list[dict]:
    """
    Descarga todos los ítems de la lista MANTENIMIENTOS desde SharePoint.
    Devuelve lista de dicts ya normalizados listos para UPSERT.
    Síncrono — ejecutar en threadpool desde código async.
    """
    # Import aquí para que si no está instalada la lib, solo falle al llamar
    from office365.runtime.auth.user_credential import UserCredential
    from office365.sharepoint.client_context import ClientContext

    log.info("Iniciando conexión SharePoint: %s", site_url)
    ctx = ClientContext(site_url).with_credentials(
        UserCredential(email, password)
    )

    año_actual = datetime.now().year
    list_obj = ctx.web.lists.get_by_id(SP_LIST_GUID)

    # Traer hasta 5 000 ítems, filtrar año actual en cliente
    items = (
        list_obj.items
        .top(5000)
        .order_by("ID desc")
        .get()
        .execute_query()
    )

    resultados = []
    for item in items:
        props = item.properties
        dia = _parse_date(props.get("field_13"))
        # Filtro año actual (igual que el BI)
        if dia and dia.year != año_actual:
            continue
        resultados.append(_map_item(props))

    log.info("SharePoint: %d ítems del año %d descargados", len(resultados), año_actual)
    return resultados


# ── UPSERT en MySQL ───────────────────────────────────────────────────────────

_UPSERT_SQL = text("""
    INSERT INTO mantenimientos_preventivos
      (sharepoint_id, semana, gerencia, area, gft, objeto, af,
       descripcion, tipo_mantenimiento, frecuencia, responsable,
       pedido_de_trabajo, criticidad, estado, dia_programado,
       asignado_a, observaciones)
    VALUES
      (:sp_id, :semana, :gerencia, :area, :gft, :objeto, :af,
       :descripcion, :tipo, :frecuencia, :responsable,
       :pedido, :criticidad, :estado, :dia,
       :asignado, :observaciones)
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
      asignado_a         = :asignado,
      observaciones      = :observaciones
""")


async def upsert_items(db: AsyncSession, items: list[dict]) -> int:
    """UPSERT masivo en mantenimientos_preventivos. Devuelve cantidad procesada."""
    if not items:
        return 0
    for item in items:
        await db.execute(_UPSERT_SQL, item)
    await db.commit()
    log.info("UPSERT completado: %d registros", len(items))
    return len(items)
