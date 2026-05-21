"""
load_from_mcp_files.py
Lee los archivos JSON descargados via MCP de Supabase e inserta en MySQL local.

Ejecucion:
    cd ptar-backend
    python scripts_carga/load_from_mcp_files.py
"""

import asyncio
import json
import re
import aiomysql
from pathlib import Path

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

# Directorio donde el MCP guarda los resultados
MCP_DIR = Path(r"C:\Users\davidan\.claude\projects\C--Users-davidan-OneDrive---PERMODA-LTDA-Documents-Claude-App-PTAR-SQL\d4bc3d98-a631-4a82-b642-76d3e9fa20eb\tool-results")

# Archivos por tabla (en orden)
FILES = {
    "costos": [
        "mcp-supabase-ptar-execute_sql-1778511519878.txt",
    ],
    "calidad": [
        "mcp-supabase-ptar-execute_sql-1778511542468.txt",  # offset 0
        "mcp-supabase-ptar-execute_sql-1778511566509.txt",  # offset 500
        "mcp-supabase-ptar-execute_sql-1778511569488.txt",  # offset 1000
        "mcp-supabase-ptar-execute_sql-1778511571724.txt",  # offset 1500
    ],
}

# Contadores: 25 filas embebidas directamente (ya disponibles en contexto)
CONTADORES_DATA = [
    {"id":"f372fe36-b417-40c2-bc19-db550f4b5404","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-01","nombre_contador":"Contador Entrada Agua Potable Principal 6\"","ubicacion":"Entrada Principal","tipo_agua":"Potable","lectura_anterior_m3":0,"lectura_actual_m3":3117,"delta_m3":3117,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"c7af26ef-c65c-4455-b0c6-a587e94b9020","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-02","nombre_contador":"Contador Entrada Agua Potable Fría Lavandería (4\")","ubicacion":"Lavandería","tipo_agua":"Potable","lectura_anterior_m3":0,"lectura_actual_m3":302160,"delta_m3":302160,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"8f84c2e2-1226-435f-82f9-08455efc65b9","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-03","nombre_contador":"Contador Entrada Agua Potable LAB Lavandería","ubicacion":"LAB Lavandería","tipo_agua":"Potable","lectura_anterior_m3":0,"lectura_actual_m3":10345,"delta_m3":10345,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"ab05a0c4-8234-4046-808a-a0fe59858d99","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-04","nombre_contador":"Entrada Agua Medidor Rojo Tintorería (4\")","ubicacion":"Tintorería","tipo_agua":"Industrial","lectura_anterior_m3":0,"lectura_actual_m3":66334,"delta_m3":66334,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"bc817ccf-68ff-4cd5-b1b7-0d137ba1792c","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-05","nombre_contador":"Entrada Agua Potable Fría Tintorería (4\")","ubicacion":"Tintorería","tipo_agua":"Potable","lectura_anterior_m3":0,"lectura_actual_m3":8834,"delta_m3":8834,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"0c41063e-7f9d-42b7-a618-e2d87ac7b35f","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-06","nombre_contador":"Entrada Agua Medidor Rojo Lavandería (4\")","ubicacion":"Lavandería","tipo_agua":"Industrial","lectura_anterior_m3":0,"lectura_actual_m3":9530,"delta_m3":9530,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"a8242f4b-5780-4d66-a429-ad65c41975d6","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-07","nombre_contador":"Rama","ubicacion":"Distribución","tipo_agua":"Potable","lectura_anterior_m3":0,"lectura_actual_m3":10,"delta_m3":10,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"1cf1a469-5a23-4f84-a087-b849409f18b4","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-08","nombre_contador":"Abridora 1","ubicacion":"Proceso","tipo_agua":"Industrial","lectura_anterior_m3":0,"lectura_actual_m3":3555,"delta_m3":3555,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"4ffa934e-d58c-4880-bcb8-90bfd74cbaff","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-09","nombre_contador":"Abridora 2","ubicacion":"Proceso","tipo_agua":"Industrial","lectura_anterior_m3":0,"lectura_actual_m3":4942,"delta_m3":4942,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"b3022917-94b4-434b-b858-9d13ea7a98b6","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-10","nombre_contador":"Tanque de Reúso (2\")","ubicacion":"Tanque de Reúso","tipo_agua":"Reúso","lectura_anterior_m3":0,"lectura_actual_m3":22011,"delta_m3":22011,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"5d58a846-40a4-44f2-bd19-a2f25b8a8050","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-11","nombre_contador":"PTAR","ubicacion":"Entrada PTAR","tipo_agua":"Residual","lectura_anterior_m3":0,"lectura_actual_m3":13992,"delta_m3":13992,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"73af8dd5-63dc-4c93-876a-4a109d64923e","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-12","nombre_contador":"Entrada RO #1","ubicacion":"Módulo RO #1","tipo_agua":"Pretratamiento","lectura_anterior_m3":0,"lectura_actual_m3":5689428,"delta_m3":5689428,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"4b163a3b-370d-4758-bfa0-7a4c361de5ae","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-13","nombre_contador":"Salida RO #1","ubicacion":"Módulo RO #1","tipo_agua":"RO","lectura_anterior_m3":0,"lectura_actual_m3":247266,"delta_m3":247266,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"34837ada-b375-4e9e-b74f-3e26eb5fd9b2","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-14","nombre_contador":"Entrada RO #2","ubicacion":"Módulo RO #2","tipo_agua":"Pretratamiento","lectura_anterior_m3":0,"lectura_actual_m3":30974,"delta_m3":30974,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"be3b3547-9092-487b-aaf0-5ae5f88d7a6d","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-15","nombre_contador":"Salida RO #2","ubicacion":"Módulo RO #2","tipo_agua":"RO","lectura_anterior_m3":0,"lectura_actual_m3":7616,"delta_m3":7616,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"ccfe452e-e265-428c-88fa-58896207c120","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-16","nombre_contador":"Entrada Agua Potable Rotativa 3\"","ubicacion":"Rotativa","tipo_agua":"Potable","lectura_anterior_m3":0,"lectura_actual_m3":46437,"delta_m3":46437,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"9b1487e0-c293-4489-85cd-146dc34857b0","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-17","nombre_contador":"Medidor VERDE DIGITAL Retorno","ubicacion":"Retorno","tipo_agua":"Reúso","lectura_anterior_m3":0,"lectura_actual_m3":22858609,"delta_m3":22858609,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"ed0b8aa9-0f0d-4381-b4e6-9326144e8c9d","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-19","nombre_contador":"Envío a TH","ubicacion":"Torre Enfriamiento","tipo_agua":"Tratada","lectura_anterior_m3":0,"lectura_actual_m3":82398,"delta_m3":82398,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"2c41428c-e27f-4e05-b695-795eeb2e9a8f","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-20","nombre_contador":"MBR 1","ubicacion":"Reactor MBR 1","tipo_agua":"Tratada","lectura_anterior_m3":0,"lectura_actual_m3":229899,"delta_m3":229899,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"30e83537-6a2c-42fc-9428-00c384c6fb35","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-21","nombre_contador":"MBR 2","ubicacion":"Reactor MBR 2","tipo_agua":"Tratada","lectura_anterior_m3":0,"lectura_actual_m3":257977,"delta_m3":257977,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"c40418a7-85e8-4065-bb5b-4b63a3bb3bcf","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-22","nombre_contador":"Medidor de Ingreso UF PTAP","ubicacion":"UF PTAP","tipo_agua":"Pretratamiento","lectura_anterior_m3":0,"lectura_actual_m3":50964,"delta_m3":50964,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"37e6bf98-9579-48ae-99fc-720e5f20d27d","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-23","nombre_contador":"Medidor Salida UF PTAP","ubicacion":"UF PTAP","tipo_agua":"Tratada","lectura_anterior_m3":0,"lectura_actual_m3":36006,"delta_m3":36006,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"399fa399-b76f-4bfd-a282-2f326179c3af","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-26","nombre_contador":"Entrada Agua Potable Cuarto Químicos","ubicacion":"Cuarto Químicos","tipo_agua":"Potable","lectura_anterior_m3":0,"lectura_actual_m3":78354,"delta_m3":78354,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"d94c59be-4d99-4a7f-9442-a8353b97166d","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-27","nombre_contador":"Agua Caliente Tintorería (Digital)","ubicacion":"Tintorería","tipo_agua":"Potable","lectura_anterior_m3":0,"lectura_actual_m3":248400,"delta_m3":248400,"observaciones":"Lectura inicial cargada desde Excel histórico"},
    {"id":"730c2470-7b98-4eed-8205-423b342f6d77","created_at":"2026-01-01 06:00:00","turno":"mañana","usuario":"davidan@permoda.com.co","id_contador":"C-28","nombre_contador":"Medidor Prueba Agua Caliente","ubicacion":"Prueba Caldera","tipo_agua":"Potable","lectura_anterior_m3":0,"lectura_actual_m3":94803,"delta_m3":94803,"observaciones":"Lectura inicial cargada desde Excel histórico"},
]


def extract_rows_from_file(filepath: Path) -> list[dict]:
    """
    Parsea un archivo de resultado MCP.
    Estructura real del archivo:
      [{"type":"text","text":"{\"result\":\"...\\n<untrusted-data-ID>\\n[{\\\"data\\\":[...rows...]}]\\n</untrusted-data-ID>...\"}" }]
    """
    raw = filepath.read_text(encoding="utf-8")
    # Nivel 1: array externo
    items = json.loads(raw)
    # Nivel 2: el campo "text" es un JSON string que contiene {"result":"..."}
    inner = json.loads(items[0]["text"])
    result_str = inner["result"]  # string con las etiquetas <untrusted-data-...>

    # Extraer el JSON entre las etiquetas <untrusted-data-...>
    m = re.search(r'<untrusted-data-[^>]+>\s*(\[.*?\])\s*</untrusted-data-', result_str, re.DOTALL)
    if not m:
        raise ValueError(f"No se encontraron datos en {filepath.name}")

    result_array = json.loads(m.group(1))
    rows = result_array[0]["data"]  # [{"data": [...rows...]}]
    return rows


def f(val, decimals=3):
    if val is None:
        return 0.0
    return round(float(val), decimals)


# ──────────────────────────────────────────────
#  Insercion en MySQL
# ──────────────────────────────────────────────
async def insert_contadores(conn, rows: list[dict]):
    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM ptar_registro_contadores")
        sql = """
            INSERT INTO ptar_registro_contadores
              (id, created_at, turno, usuario, id_contador, nombre_contador,
               ubicacion, tipo_agua, lectura_anterior_m3, lectura_actual_m3,
               delta_m3, observaciones)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """
        data = [
            (r["id"], r["created_at"], r["turno"], r["usuario"],
             r["id_contador"], r["nombre_contador"], r["ubicacion"], r["tipo_agua"],
             f(r.get("lectura_anterior_m3")), f(r.get("lectura_actual_m3")),
             f(r.get("delta_m3")), r.get("observaciones"))
            for r in rows
        ]
        await cur.executemany(sql, data)
    print(f"  contadores: {len(rows)} filas insertadas")


async def insert_costos(conn, rows: list[dict]):
    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM ptar_registro_costos")
        sql = """
            INSERT INTO ptar_registro_costos
              (id, created_at, turno, usuario, id_quimico, nombre_quimico,
               unidad, densidad_kg, nivel_inicial, nivel_final, consumo,
               kg_consumidos, precio_kg, ppm, costo_operativo,
               horometro_inicial, caudal_tratado_gem, horas_operacion, observaciones)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """
        data = [
            (r["id"], r["created_at"], r["turno"], r["usuario"],
             r["id_quimico"], r["nombre_quimico"], r["unidad"],
             f(r.get("densidad_kg"),4), f(r.get("nivel_inicial")), f(r.get("nivel_final")),
             f(r.get("consumo")), f(r.get("kg_consumidos"),4),
             f(r.get("precio_kg"),2),
             float(r["ppm"]) if r.get("ppm") is not None else None,
             float(r["costo_operativo"]) if r.get("costo_operativo") is not None else None,
             f(r.get("horometro_inicial")), f(r.get("caudal_tratado_gem")),
             f(r.get("horas_operacion"),2), r.get("observaciones"))
            for r in rows
        ]
        await cur.executemany(sql, data)
    print(f"  costos: {len(rows)} filas insertadas")


async def insert_calidad(conn, rows: list[dict]):
    async with conn.cursor() as cur:
        await cur.execute("DELETE FROM ptar_registro_calidad")
        sql = """
            INSERT INTO ptar_registro_calidad
              (id, created_at, fecha, turno, usuario,
               unidad_tratamiento, parametro, unidad_medida,
               valor, metodo, no_aplica, observaciones)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """
        CHUNK = 200
        total = 0
        for i in range(0, len(rows), CHUNK):
            chunk = rows[i:i+CHUNK]
            data = [
                (r["id"], r["created_at"], r.get("fecha"), r["turno"], r["usuario"],
                 r["unidad_tratamiento"], r["parametro"], r["unidad_medida"],
                 float(r["valor"]) if r.get("valor") is not None else None,
                 r.get("metodo"), 1 if r.get("no_aplica") else 0, r.get("observaciones"))
                for r in chunk
            ]
            await cur.executemany(sql, data)
            total += len(chunk)
            print(f"  calidad: {total}/{len(rows)} filas...", end="\r")
    print(f"  calidad: {len(rows)} filas insertadas    ")


async def main():
    print("=== Carga datos Supabase -> MySQL ===\n")

    # 1. Contadores (embebidos)
    print("[1/3] ptar_registro_contadores (25 filas embebidas)")
    contadores = CONTADORES_DATA

    # 2. Costos - leer del archivo MCP
    print("[2/3] ptar_registro_costos - leyendo archivo local...")
    costos = []
    for fname in FILES["costos"]:
        fpath = MCP_DIR / fname
        if not fpath.exists():
            print(f"  AVISO: archivo no encontrado: {fpath}")
            continue
        batch = extract_rows_from_file(fpath)
        costos.extend(batch)
        print(f"  {fname}: {len(batch)} filas leidas")
    print(f"  Total costos: {len(costos)} filas")

    # 3. Calidad - leer de archivos MCP (4 lotes)
    print("[3/3] ptar_registro_calidad - leyendo archivos locales...")
    calidad = []
    for fname in FILES["calidad"]:
        fpath = MCP_DIR / fname
        if not fpath.exists():
            print(f"  AVISO: archivo no encontrado: {fpath}")
            continue
        batch = extract_rows_from_file(fpath)
        calidad.extend(batch)
        print(f"  {fname}: {len(batch)} filas leidas")
    print(f"  Total calidad: {len(calidad)} filas")

    print()

    # Insertar en MySQL
    print("Conectando a MySQL...")
    conn = await aiomysql.connect(**MYSQL)
    try:
        await insert_contadores(conn, contadores)
        await insert_costos(conn, costos)
        await insert_calidad(conn, calidad)
    finally:
        conn.close()

    # Verificacion
    print("\nVerificacion final:")
    conn2 = await aiomysql.connect(**MYSQL)
    async with conn2.cursor() as cur:
        for tabla in ["ptar_registro_contadores","ptar_registro_costos","ptar_registro_calidad"]:
            await cur.execute(f"SELECT COUNT(*) FROM {tabla}")
            (cnt,) = await cur.fetchone()
            print(f"  {tabla}: {cnt} filas")
    conn2.close()

    print("\nMigracion completada.")


if __name__ == "__main__":
    asyncio.run(main())
