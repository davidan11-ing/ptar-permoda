"""Helper de conexión a MySQL para el proyecto PTAR 2.

Carga credenciales desde el .env de la raíz del proyecto y expone un
SQLAlchemy Engine reutilizable. Cualquier script futuro hace:

    from db import get_engine
    eng = get_engine()              # conecta a la BD por defecto (MYSQL_DB)
    eng = get_engine(db=None)       # conecta al servidor sin BD seleccionada
    eng = get_engine("ptar_permoda")
"""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")


def get_engine(db: str | None = "__default__") -> Engine:
    user = os.environ["MYSQL_USER"]
    pwd = quote_plus(os.environ["MYSQL_PASSWORD"])
    host = os.environ["MYSQL_HOST"]
    port = os.environ["MYSQL_PORT"]
    if db == "__default__":
        db = os.environ.get("MYSQL_DB", "")
    name = db or ""
    url = f"mysql+pymysql://{user}:{pwd}@{host}:{port}/{name}?charset=utf8mb4"
    return create_engine(url, pool_pre_ping=True, future=True)


if __name__ == "__main__":
    eng = get_engine(db=None)
    with eng.connect() as conn:
        version = conn.execute(text("SELECT VERSION();")).scalar()
        user = conn.execute(text("SELECT CURRENT_USER();")).scalar()
        dbs = [r[0] for r in conn.execute(text("SHOW DATABASES;"))]
    print(f"MySQL {version} conectado como {user}")
    print(f"Bases de datos: {', '.join(dbs)}")
