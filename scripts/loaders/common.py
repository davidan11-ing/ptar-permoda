"""Utilidades comunes para los loaders de Excel a MySQL."""
from __future__ import annotations
import sys, io
from datetime import datetime, date
from pathlib import Path

# stdout UTF-8 para no romper con emojis/acentos en consolas cp1252
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ERROR_STRS = {"#DIV/0!", "#REF!", "#N/A", "#NAME?", "#VALUE!", "#NULL!", "#NUM!", "", None}

def clean_num(v):
    """Convierte celdas Excel a float o None. Maneja errores #DIV/0!, strings vacios, etc."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip()
    if s in ERROR_STRS or s.startswith("#"):
        return None
    # quitar separadores de miles si vienen como "1.234,56" o "1,234.56"
    s = s.replace(" ", "")
    try:
        return float(s.replace(",", ""))
    except ValueError:
        try:
            return float(s.replace(".", "").replace(",", "."))
        except ValueError:
            return None

def clean_int(v):
    n = clean_num(v)
    return int(n) if n is not None else None

def clean_str(v):
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None

def clean_date(v) -> date | None:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    s = str(v).strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(s.split(" ")[0] if fmt == "%Y-%m-%d" else s, fmt).date()
        except ValueError:
            continue
    return None

# Hace que `from db import get_engine` funcione desde scripts/loaders/*.py
SCRIPTS_DIR = Path(__file__).resolve().parent.parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))
