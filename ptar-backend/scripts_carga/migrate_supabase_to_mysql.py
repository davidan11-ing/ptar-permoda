"""
migrate_supabase_to_mysql.py
Migra datos de Supabase (PostgreSQL) a MySQL local para el proyecto PTAR.

Ejecución:
    cd ptar-backend
    python scripts_carga/migrate_supabase_to_mysql.py
"""

import asyncio
import httpx
import aiomysql
from datetime import datetime, timezone

# ──────────────────────────────────────────────
#  Config Supabase
# ──────────────────────────────────────────────
SUPABASE_URL = "https://beqybxnzltzkmtavtfde.supabase.co"
SUPABASE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlcXlieG56bHR6a210YXZ0ZmRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NjUwNzIsImV4cCI6MjA5MjU0MTA3Mn0"
    ".ZbR6H2vlN14h98ivtPDI9e8sA02UoOoE9Xi0CXN3Ndg"
)
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "count=exact",
}

# ──────────────────────────────────────────────
#  Config MySQL
# ──────────────────────────────────────────────
MYSQL = dict(
    host="127.0.0.1",
    port=3306,
    user="root",
    password="Santia*34",
    db="ptar_permoda",
    charset="utf8mb4",
    autocommit=True,
)

PAGE = 1000  # filas por petición a Supabase


# ──────────────────────────────────────────────
#  Helpers Supabase REST
# ──────────────────────────────────────────────
async def fetch_all(client: httpx.AsyncClient, table: str) -> list[dict]:
    """Descarga todas las filas de una tabla Supabase con paginación."""
    rows: list[dict] = []
    offset = 0
    while True:
        r = await client.get(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers=HEADERS,
            params={
                "select": "*",
                "order": "created_at.asc",
                "limit": PAGE,
                "offset": offset,
            },
        )
        r.raise_for_status()
        batch = r.json()
        rows.extend(batch)
        print(f"  {table}: descargadas {len(rows)} filas...", end="\r")
        if len(batch) < PAGE:
            break
        offset += PAGE
    print()
    return rows


def parse_ts(ts_str: str | None) -> str | None:
    """Convierte ISO 8601 con zona horaria a DATETIME sin TZ para MySQL."""
    if not ts_str:
        return None
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        # Convertir a UTC naive
        dt_utc = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt_utc.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return ts_str[:19]  # fallback: tomar primeros 19 chars


def f(val, decimals=3):
    """Convierte a float redondeado, o 0 si None."""
    if val is None:
        return 0.0
    return round(float(val), decimals)


# ──────────────────────────────────────────────
#  Inserción en MySQL
# ──────────────────────────────────────────────
async def migrate_contadores(conn, rows: list[dict]):
    """ptar_registro_contadores"""
    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM ptar_registro_contadores")
        print(f"  tabla limpia, insertando {len(rows)} filas...")

        sql = """
            INSERT INTO ptar_registro_contadores
              (id, created_at, turno, usuario,
               id_contador, nombre_contador, ubicacion, tipo_agua,
               lectura_anterior_m3, lectura_actual_m3, delta_m3, observaciones)
            VALUES (%s,%s,%s,%s, %s,%s,%s,%s, %s,%s,%s,%s)
        """
        data = [
            (
                row["id"],
                parse_ts(row.get("created_at")),
                row["turno"],
                row["usuario"],
                row["id_contador"],
                row["nombre_contador"],
                row["ubicacion"],
                row["tipo_agua"],
                f(row.get("lectura_anterior_m3")),
                f(row.get("lectura_actual_m3")),
                f(row.get("delta_m3")),
                row.get("observaciones"),
            )
            for row in rows
        ]
        await cur.executemany(sql, data)
    print(f"  ✓ {len(rows)} filas insertadas en ptar_registro_contadores")


async def migrate_costos(conn, rows: list[dict]):
    """ptar_registro_costos"""
    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM ptar_registro_costos")
        print(f"  tabla limpia, insertando {len(rows)} filas...")

        sql = """
            INSERT INTO ptar_registro_costos
              (id, created_at, turno, usuario,
               id_quimico, nombre_quimico, unidad, densidad_kg,
               nivel_inicial, nivel_final, consumo, kg_consumidos,
               precio_kg, ppm, costo_operativo,
               horometro_inicial, caudal_tratado_gem, horas_operacion,
               observaciones)
            VALUES (%s,%s,%s,%s, %s,%s,%s,%s, %s,%s,%s,%s, %s,%s,%s, %s,%s,%s, %s)
        """
        data = [
            (
                row["id"],
                parse_ts(row.get("created_at")),
                row["turno"],
                row["usuario"],
                row["id_quimico"],
                row["nombre_quimico"],
                row["unidad"],
                f(row.get("densidad_kg"), 4),
                f(row.get("nivel_inicial")),
                f(row.get("nivel_final")),
                f(row.get("consumo")),
                f(row.get("kg_consumidos"), 4),
                f(row.get("precio_kg"), 2),
                f(row.get("ppm"), 4) if row.get("ppm") is not None else None,
                f(row.get("costo_operativo"), 2) if row.get("costo_operativo") is not None else None,
                f(row.get("horometro_inicial")),
                f(row.get("caudal_tratado_gem")),
                f(row.get("horas_operacion"), 2),
                row.get("observaciones"),
            )
            for row in rows
        ]
        await cur.executemany(sql, data)
    print(f"  ✓ {len(rows)} filas insertadas en ptar_registro_costos")


async def migrate_calidad(conn, rows: list[dict]):
    """ptar_registro_calidad"""
    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM ptar_registro_calidad")
        print(f"  tabla limpia, insertando {len(rows)} filas...")

        sql = """
            INSERT INTO ptar_registro_calidad
              (id, created_at, fecha, turno, usuario,
               unidad_tratamiento, parametro, unidad_medida,
               valor, metodo, no_aplica, observaciones)
            VALUES (%s,%s,%s,%s,%s, %s,%s,%s, %s,%s,%s,%s)
        """
        data = [
            (
                row["id"],
                parse_ts(row.get("created_at")),
                row.get("fecha"),  # DATE string 'YYYY-MM-DD'
                row["turno"],
                row["usuario"],
                row["unidad_tratamiento"],
                row["parametro"],
                row["unidad_medida"],
                float(row["valor"]) if row.get("valor") is not None else None,
                row.get("metodo"),
                1 if row.get("no_aplica") else 0,
                row.get("observaciones"),
            )
            for row in rows
        ]
        await cur.executemany(sql, data)
    print(f"  ✓ {len(rows)} filas insertadas en ptar_registro_calidad")


# ──────────────────────────────────────────────
#  Main
# ──────────────────────────────────────────────
async def main():
    print("=== Migración Supabase → MySQL ===\n")

    # 1. Descargar datos de Supabase
    print("→ Descargando datos de Supabase...")
    async with httpx.AsyncClient(timeout=60) as client:
        print("  [1/3] ptar_registro_contadores")
        contadores = await fetch_all(client, "ptar_registro_contadores")
        print("  [2/3] ptar_registro_costos")
        costos = await fetch_all(client, "ptar_registro_costos")
        print("  [3/3] ptar_registro_calidad")
        calidad = await fetch_all(client, "ptar_registro_calidad")

    print(f"\nDescargado: {len(contadores)} contadores | {len(costos)} costos | {len(calidad)} calidad\n")

    # 2. Insertar en MySQL
    print("→ Insertando en MySQL...")
    conn = await aiomysql.connect(**MYSQL)
    try:
        print("  [1/3] ptar_registro_contadores")
        await migrate_contadores(conn, contadores)

        print("  [2/3] ptar_registro_costos")
        await migrate_costos(conn, costos)

        print("  [3/3] ptar_registro_calidad")
        await migrate_calidad(conn, calidad)
    finally:
        conn.close()

    # 3. Verificación final
    print("\n→ Verificación final:")
    conn2 = await aiomysql.connect(**MYSQL)
    async with conn2.cursor() as cur:
        for tabla in ["ptar_registro_contadores", "ptar_registro_costos", "ptar_registro_calidad"]:
            await cur.execute(f"SELECT COUNT(*) FROM {tabla}")
            (cnt,) = await cur.fetchone()
            print(f"  {tabla}: {cnt} filas en MySQL")
    conn2.close()

    print("\n✅ Migración completada con éxito.")


if __name__ == "__main__":
    asyncio.run(main())
