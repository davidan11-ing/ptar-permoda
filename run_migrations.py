"""
Ejecuta las migraciones SQL pendientes para RO y PTAP.
Correr UNA SOLA VEZ desde la raíz del proyecto:

    python run_migrations.py
"""
import pymysql
import os

# ── Conexión (mismos datos que ptar-backend/.env) ────────────────────────────
conn = pymysql.connect(
    host='127.0.0.1',
    port=3306,
    user='root',
    password='Lsop5367**',
    database='ptar_permoda',
    autocommit=False,
)

# ── Migraciones a ejecutar ────────────────────────────────────────────────────
MIGRATIONS = [
    {
        'nombre': 'PTAP — Crear tabla operacion_ptap_turno (si no existe)',
        'archivo': 'sql/operacion_ptap_turno.sql',
    },
    {
        'nombre': 'PTAP — Agregar columnas operativas (si ya existia sin ellas)',
        'archivo': 'sql/alter_operacion_ptap_turno.sql',
    },
    {
        'nombre': 'RO — Agregar columnas de contadores/caudales',
        'archivo': 'sql/alter_operacion_ro_turno.sql',
    },
    {
        'nombre': 'RO — Agregar columna cartuchos_cambiados',
        'archivo': 'sql/alter_ro_cartuchos.sql',
    },
    {
        'nombre': 'Calidad — Unidades PTAP + recrear v_tabla_datos_1',
        'archivo': 'sql/ptap_calidad_unidades.sql',
    },
    {
        'nombre': 'Condiciones de Operacion — Tablas MBR, RO y PTAP',
        'archivo': 'sql/condiciones_operacion.sql',
    },
]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def run_sql_file(cursor, conn, filepath: str):
    import re
    full_path = os.path.join(BASE_DIR, filepath)
    with open(full_path, encoding='utf-8') as f:
        content = f.read()

    # Eliminar comentarios -- antes de dividir por ;
    content = re.sub(r'--[^\n]*', '', content)

    statements = [s.strip() for s in content.split(';') if s.strip()]
    for stmt in statements:
        try:
            cursor.execute(stmt)
            conn.commit()
        except pymysql.err.OperationalError as e:
            conn.rollback()
            code, msg = e.args
            if code == 1060:  # Duplicate column name — ya existe, OK
                print(f"    [SKIP] Columna ya existe: {msg}")
            elif code == 1050:  # Table already exists
                print(f"    [SKIP] Tabla ya existe")
            else:
                raise  # relanzar si es otro error


def main():
    cursor = conn.cursor()
    all_ok = True

    for m in MIGRATIONS:
        print(f"\n{'='*60}")
        print(f"  {m['nombre']}")
        print(f"  Archivo: {m['archivo']}")
        print(f"{'='*60}")
        try:
            run_sql_file(cursor, conn, m['archivo'])
            print("  [OK]  Migracion aplicada correctamente")
        except pymysql.err.OperationalError as e:
            conn.rollback()
            code, msg = e.args
            print(f"  [ERROR] MySQL {code}: {msg}")
            all_ok = False
        except Exception as e:
            conn.rollback()
            print(f"  [ERROR] Inesperado: {e}")
            all_ok = False

    cursor.close()
    conn.close()

    print(f"\n{'='*60}")
    if all_ok:
        print("  [LISTO] Todas las migraciones completadas.")
    else:
        print("  [ATENCION] Algunas migraciones fallaron - revisa los errores arriba.")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
