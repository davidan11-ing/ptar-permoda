"""
Loader: BITÁCORA CALIDAD DE AGUA → medicion_calidad
Lee los archivos DASHBOARD CALIDAD AGUA *.xlsm y carga los datos
a la tabla medicion_calidad (misma tabla que usa la app).

Estructura del Excel (por cada bloque de fecha, 24 filas):
  Fila 1: FECHA | [fecha] | T1(Noche) col3 | T2(Mañana) col18 | T3(Tarde) col33
  Fila 2: Parámetros | Unidad | [15 unidades x 3 turnos]
  Filas 3-23: 21 parámetros con valores
  Fila 24: vacía (separador)

Mapeo de turnos Excel → BD:
  T1 (Noche)   cols 3-17  → turno 3
  T2 (Mañana)  cols 18-32 → turno 1
  T3 (Tarde)   cols 33-47 → turno 2
"""

import pandas as pd
import pymysql
import os
import re
import warnings
from datetime import datetime, date
warnings.filterwarnings('ignore')

# ── Conexión a MySQL ──────────────────────────────────────────────────────────
DB = dict(host='127.0.0.1', port=3306, user='root',
          password='Lsop5367**', database='ptar_permoda',
          charset='utf8mb4')

# ── Carpeta con los archivos ──────────────────────────────────────────────────
FOLDER = (r"C:\Users\lunaop\OneDrive - PERMODA LTDA\Documentos\Claude"
          r"\Projects\App PTAR 2\BASE DE DATOS\BALANCES 2026"
          r"\BALANCE CALIDAD DE AGUA Vs COSTOS\DASHBOARD CALIDAD")

# ── Mapeo parámetros Excel → parametro_calidad.id ────────────────────────────
PARAM_MAP = {
    'temperatura':                            1,
    'ph':                                     2,
    'demanda quimica de oxigeno':             3,
    'dqo':                                    3,
    'solidos disueltos totales':              8,
    'tds':                                    8,
    'solidos suspendidos totales':            4,
    'sst':                                    4,
    'solidos sedimentables':                  5,
    'hierro':                                11,
    'solidos suspendidos totales gravimetrico': 10,
    'gravimetrico':                           10,
    'cloruros':                               6,
    'fosforo total':                         12,
    'nitrogeno total':                       13,
    'sulfatos':                              14,
    'alcalinidad':                           19,
    'dureza calcica':                        21,
    'dureza total':                          20,
    'silice':                                15,
    'orp':                                   16,
    'cloro res':                             17,
    'cloro residual':                        17,
    'conductividad':                          7,
    'color':                                  9,
    'turbidez':                              18,
}

# ── Mapeo unidades Excel (columna) → unidad_tratamiento.id ───────────────────
# 15 unidades en orden de columna (se repite para T1, T2, T3)
UNIDAD_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]

# ── Turnos: (col_inicio, turno_bd) ───────────────────────────────────────────
# Nomenclatura correcta: turno 1=Noche, turno 2=Mañana, turno 3=Tarde
TURNOS = [
    (3,  1),   # T1 Noche  → turno 1
    (18, 2),   # T2 Mañana → turno 2
    (33, 3),   # T3 Tarde  → turno 3
]

USUARIO = 'loader_excel'


def normalizar(texto):
    """Normaliza texto: minúsculas, sin tildes, sin espacios extra."""
    if not texto:
        return ''
    t = str(texto).lower().strip()
    t = t.replace('á','a').replace('é','e').replace('í','i')
    t = t.replace('ó','o').replace('ú','u').replace('ü','u').replace('ñ','n')
    t = re.sub(r'\s+', ' ', t)
    t = t.strip(' ()')
    return t


def resolver_param(texto):
    """Devuelve parametro_id o None."""
    norm = normalizar(texto)
    # Búsqueda exacta
    if norm in PARAM_MAP:
        return PARAM_MAP[norm]
    # Búsqueda parcial
    for key, pid in PARAM_MAP.items():
        if key in norm or norm in key:
            return pid
    return None


def leer_df(df):
    """
    Recibe DataFrame (sin header) y devuelve lista de dicts:
    {fecha, turno, parametro_id, unidad_id, valor}
    """
    registros = []
    n_filas = len(df)

    # Cada bloque de fecha ocupa 24 filas (fila_fecha + fila_header + 21 params + 1 vacia)
    for bloque_inicio in range(0, n_filas, 24):
        # Fila 0 del bloque = FECHA
        fila_fecha = df.iloc[bloque_inicio]
        col0 = normalizar(str(fila_fecha.iloc[0] or ''))
        if 'fecha' not in col0:
            continue

        fecha_raw = fila_fecha.iloc[1]
        if isinstance(fecha_raw, (datetime, date)):
            fecha = fecha_raw.date() if isinstance(fecha_raw, datetime) else fecha_raw
        elif pd.isna(fecha_raw):
            continue
        else:
            try:
                fecha = pd.to_datetime(fecha_raw).date()
            except Exception:
                continue

        # Filas 2-22 del bloque = parámetros (offset desde bloque_inicio)
        for param_offset in range(2, 23):
            idx = bloque_inicio + param_offset
            if idx >= n_filas:
                break

            fila_param = df.iloc[idx]
            param_nombre = fila_param.iloc[0]
            if pd.isna(param_nombre) or normalizar(str(param_nombre)) == 'fecha':
                continue

            param_id = resolver_param(str(param_nombre))
            if param_id is None:
                continue

            # Leer valores por turno
            # TURNOS: (col_inicio_excel, turno_bd) — col_inicio es 1-based, pandas es 0-based
            for col_inicio, turno_bd in TURNOS:
                for unidad_offset, unidad_id in enumerate(UNIDAD_IDS):
                    col_idx = col_inicio + unidad_offset - 1  # pandas 0-based
                    if col_idx >= len(fila_param):
                        continue
                    valor = fila_param.iloc[col_idx]

                    if pd.isna(valor) or str(valor).strip() in ('', 'N/A', 'NA', '-'):
                        continue
                    try:
                        valor_float = float(valor)
                    except (ValueError, TypeError):
                        continue

                    registros.append({
                        'fecha':        fecha,
                        'turno':        turno_bd,
                        'parametro_id': param_id,
                        'unidad_id':    unidad_id,
                        'valor':        valor_float,
                    })

    return registros


def cargar_archivo(path, conn, nombre_archivo):
    """Carga registros de un archivo Excel a medicion_calidad."""
    # Leer con pandas — rápido, solo cols útiles (A:AX) y máx 900 filas
    df = pd.read_excel(path, sheet_name=2, header=None,
                       engine='openpyxl', usecols=range(48), nrows=900)

    registros = leer_df(df)
    if not registros:
        print(f"  Sin datos: {nombre_archivo}")
        return 0, 0

    cursor = conn.cursor()
    inserted = updated = 0

    sql = """
        INSERT INTO medicion_calidad
            (fecha, turno, parametro_id, unidad_id, valor, usuario)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            valor      = VALUES(valor),
            usuario    = VALUES(usuario),
            updated_at = CURRENT_TIMESTAMP
    """

    for r in registros:
        cursor.execute(sql, (
            r['fecha'], r['turno'], r['parametro_id'],
            r['unidad_id'], r['valor'], USUARIO
        ))
        if cursor.rowcount == 1:
            inserted += 1
        elif cursor.rowcount == 2:
            updated += 1

    conn.commit()
    cursor.close()
    return inserted, updated


def main():
    print("=" * 60)
    print("CARGANDO BITACORA CALIDAD DE AGUA -> medicion_calidad")
    print("=" * 60)

    archivos = sorted([
        f for f in os.listdir(FOLDER)
        if f.upper().startswith('DASHBOARD CALIDAD AGUA') and f.endswith('.xlsm')
    ])

    if not archivos:
        print("ERROR: No se encontraron archivos DASHBOARD CALIDAD AGUA *.xlsm")
        return

    print(f"Archivos encontrados: {len(archivos)}")
    for a in archivos:
        print(f"  - {a}")
    print()

    conn = pymysql.connect(**DB)
    total_ins = total_upd = 0

    for archivo in archivos:
        path = os.path.join(FOLDER, archivo)
        print(f"Procesando: {archivo} ...")
        try:
            ins, upd = cargar_archivo(path, conn, archivo)
            total_ins += ins
            total_upd += upd
            print(f"  OK -> Insertados: {ins} | Actualizados: {upd}")
        except Exception as e:
            print(f"  ERROR: {e}")

    conn.close()
    print()
    print("=" * 60)
    print("CARGA COMPLETA")
    print(f"  Total insertados:   {total_ins}")
    print(f"  Total actualizados: {total_upd}")
    print(f"  Total procesados:   {total_ins + total_upd}")
    print("=" * 60)


if __name__ == '__main__':
    main()
