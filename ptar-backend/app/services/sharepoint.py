"""
sharepoint.py
Servicio de sincronización SharePoint → MySQL para mantenimientos preventivos.

Autenticación: Device Code Flow (msal) — compatible con MFA.
- Primera vez: correr `python auth_sharepoint.py` desde la carpeta ptar-backend/
  El script imprime una URL y un código → el usuario los ingresa en el navegador
  → completa MFA → token guardado en .sharepoint_token_cache.json
- Siguientes veces: el token se renueva automáticamente (refresh token ~90 días)

Sin Azure AD app propia — usa el cliente público de Microsoft Office.
"""
import json
import logging
import os
from datetime import datetime, date
from pathlib import Path
from typing import Optional

log = logging.getLogger("ptar.sharepoint")

# ── Configuración ─────────────────────────────────────────────────────────────
# Cliente público de Microsoft Office (no requiere registro de app propia)
MSAL_CLIENT_ID = "d3590ed6-52b3-4102-aeff-aad2292ab01c"
MSAL_TENANT    = "permodaco.onmicrosoft.com"
MSAL_SCOPES    = ["https://permodaco.sharepoint.com/.default"]

# Archivo de caché del token (junto al .env, nunca commitear)
TOKEN_CACHE_FILE = Path(__file__).resolve().parent.parent.parent / ".sharepoint_token_cache.json"

# GUID de la lista SharePoint CONFIABILIDAD/MANTENIMIENTOS
SP_LIST_GUID = "9f6714c3-6a81-4773-90f3-0600085416af"


# ── Normalización de estados y áreas (igual que el BI) ───────────────────────
_ESTADO_MAP = {
    "PROGRAMADO":    "PENDIENTE",
    "NO CONCERTADO": "PENDIENTE",
    "TERMINADO":     "COMPLETADO",
}
_AREA_MAP = {
    "CORTE FAMILIAS FUNZA":        "CORTE",
    "CORTE JEAN FUNZA":            "CORTE",
    "CORTE TEJIDO DE PUNTO FUNZA": "CORTE",
}


def _norm_estado(val: Optional[str]) -> Optional[str]:
    if not val:
        return val
    upper = val.strip().upper()
    return _ESTADO_MAP.get(upper, upper)


def _norm_area(val: Optional[str]) -> Optional[str]:
    if not val:
        return val
    return _AREA_MAP.get(val.strip().upper(), val.strip())


def _parse_date(val) -> Optional[date]:
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val if isinstance(val, date) else val.date()
    try:
        return datetime.fromisoformat(str(val)[:10]).date()
    except Exception:
        return None


def _map_item(props: dict) -> dict:
    return {
        "sp_id":         int(props.get("ID", 0)),
        "semana":        props.get("field_1"),
        "gerencia":      None,           # no incluido en $select del BI
        "area":          _norm_area(props.get("field_3", "")),
        "gft":           props.get("field_4"),
        "objeto":        props.get("field_5"),
        "af":            props.get("field_6"),
        "descripcion":   props.get("field_7"),
        "frecuencia":    props.get("field_9"),
        "responsable":   props.get("field_10"),
        "pedido":        props.get("field_11"),
        "estado":        _norm_estado(props.get("field_12", "")),
        "dia":           _parse_date(props.get("field_13")),
        "asignado":      props.get("field_14"),
        "criticidad":    props.get("CRITICIDAD"),
        "tipo":          None,           # no incluido en $select del BI
        "observaciones": props.get("field_21"),
    }


# ── Gestión de token MSAL ─────────────────────────────────────────────────────

def _load_token_cache():
    """Carga la caché de token desde disco."""
    import msal
    cache = msal.SerializableTokenCache()
    if TOKEN_CACHE_FILE.exists():
        cache.deserialize(TOKEN_CACHE_FILE.read_text(encoding="utf-8"))
    return cache


def _save_token_cache(cache):
    """Guarda la caché de token en disco si hubo cambios."""
    if cache.has_state_changed:
        TOKEN_CACHE_FILE.write_text(cache.serialize(), encoding="utf-8")


def _get_access_token() -> str:
    """
    Obtiene un access token válido para SharePoint.
    - Si hay caché con refresh token → renueva silenciosamente.
    - Si no hay caché → lanza RuntimeError con instrucciones para correr auth_sharepoint.py
    """
    import msal

    cache = _load_token_cache()
    msal_app = msal.PublicClientApplication(
        MSAL_CLIENT_ID,
        authority=f"https://login.microsoftonline.com/{MSAL_TENANT}",
        token_cache=cache,
    )

    accounts = msal_app.get_accounts()
    if not accounts:
        raise RuntimeError(
            "No hay sesión SharePoint guardada. "
            "Corre este comando UNA VEZ en la carpeta ptar-backend/:\n"
            "  .venv\\Scripts\\python.exe auth_sharepoint.py\n"
            "El script abrirá el navegador para que completes el login con MFA."
        )

    result = msal_app.acquire_token_silent(MSAL_SCOPES, account=accounts[0])
    if not result or "access_token" not in result:
        raise RuntimeError(
            f"No se pudo renovar el token SharePoint: {result.get('error_description', 'desconocido')}. "
            "Corre nuevamente auth_sharepoint.py para re-autenticar."
        )

    _save_token_cache(cache)
    return result["access_token"]


# ── Fetch de ítems desde SharePoint REST API ──────────────────────────────────

def fetch_sharepoint_items(site_url: str, _email: str = "", _password: str = "") -> list[dict]:
    """
    Descarga todos los ítems del año actual desde la lista MANTENIMIENTOS.
    Usa token MSAL (device code, compatible con MFA).
    Síncrono — llamar con run_in_executor desde código async.
    """
    import requests

    token = _get_access_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }

    MAX_PAGES  = 10   # 10 páginas × 500 ítems = 5 000 máximo (igual que el BI)
    resultados: list[dict] = []
    url = (
        f"{site_url.rstrip('/')}/_api/web/lists(guid'{SP_LIST_GUID}')/items"
        f"?$select=ID,field_1,field_3,field_4,field_5,field_6,field_7,"
        f"field_9,field_10,field_11,field_12,field_13,field_14,CRITICIDAD,field_21"
        f"&$orderby=ID%20desc&$top=500"
    )

    for page in range(1, MAX_PAGES + 1):
        if not url:
            break
        log.info("SharePoint: página %d → %s...", page, url[:80])
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()

        data     = resp.json()
        items_raw = data.get("d", {}).get("results") or data.get("value", [])

        for item in items_raw:
            props = item if isinstance(item, dict) else {}
            resultados.append(_map_item(props))

        url = (
            data.get("d",  {}).get("__next")
            or data.get("odata.nextLink")
            or data.get("@odata.nextLink")
        )

    log.info("SharePoint: %d ítems descargados (%d páginas)", len(resultados), page)
    return resultados


# ── UPSERT en MySQL ───────────────────────────────────────────────────────────
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

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
    if not items:
        return 0
    for item in items:
        await db.execute(_UPSERT_SQL, item)
    await db.commit()
    log.info("UPSERT completado: %d registros", len(items))
    return len(items)
