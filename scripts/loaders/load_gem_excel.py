"""
Loader: INVENTARIO Y CONSUMO GEM → operacion_gem_turno
Lee los archivos FORMATO BITÁCORA OPERACIÓN PTAR *.xlsx y
DASHBOARD COSTOS *.xlsx y carga a operacion_gem_turno.

Mapeo turnos Excel → BD:
  "FINAL TURNO 1" → turno 1 (Mañana)
  "FINAL TURNO 2" → turno 2 (Tarde)
  "FINAL TURNO 3" → turno 3 (Noche)
"""

import pandas as pd
import pymysql
import os
import warnings
from datetime import datetime, date
warnings.filterwarnings('ignore')

DB = dict(host='127.0.0.1', port=3306, user='root',
          password='Lsop5367**', database='ptar_permoda',
          charset='utf8mb4')

FOLDER = (r"C:\Users\lunaop\OneDrive - PERMODA LTDA\Documentos\Claude"
          r"\Projects\App PTAR 2\BASE DE DATOS\BALANCES 2026"
          r"\BALANCE ECONÓMICO\Química GEM RO")

USUARIO = 'loader_excel'

# Mapeo por NOMBRE de columna → campo BD
# Robusto ante diferencias de estructura entre archivos DASHBOARD y BITACORA
COL_NAME_MAP = {
    'FINAL ACIDO':                'final_acido_l',
    'FINAL COAGULANTE':           'final_coagulante_l',
    'FINAL DECOLORANTE':          'final_decolorante_l',
    'FINAL POL ANIONICO':         'final_pol_anionico_kg',
    'FINAL POL CATIONICO':        'final_pol_cationico_kg',
    'LECTURA HOROMETRO':          'horometro_inicial',
    'CAUDAL TOTAL TRATADO GEM':   'caudal_total_tratado_gem_m3',
    'CAUDAL DE TRATAMIENTO':      'caudal_tratamiento_m3h',
    'CONSUMO LITROS ACIDO':       'consumo_acido_l',
    'CONSUMO LITROS COAGULANTE':  'consumo_coagulante_l',
    'CONSUMO LITROS DECOLORANTE': 'consumo_decolorante_l',
    'CONSUMO POL ANIONICO':       'consumo_pol_anionico_kg',
    'CONSUMO POL CATIONICO':      'consumo_pol_cationico_kg',
    'KG ACIDO':                   'kg_acido',
    'KG COAGULANTE':              'kg_coagulante',
    'KG DECOLORANTE':             'kg_decolorante',
    'KG POL ANIONICO':            'kg_pol_anionico',
    'KG POL CATIONICO':           'kg_pol_cationico',
    'PPM ACIDO':                  'ppm_acido',
    'PPM COAGULANTE':             'ppm_coagulante',
    'PPM DECOLORANTE':            'ppm_decolorante',
    'PPM POL ANIONICO':           'ppm_pol_anionico',
    'PPM POL CATIONICO':          'ppm_pol_cationico',
    'COSTO OPERATIVO ACIDO':      'costo_op_acido',
    'COSTO OPERATIVO COAGULANTE': 'costo_op_coagulante',
    'COSTO OPERATIVO DECOLORANTE':'costo_op_decolorante',
    'COSTO OPERATIVO ANIONICO':   'costo_op_anionico',
    'COSTO OPERATIVO CATIONICO':  'costo_op_cationico',
    'COSTO QUIMICA':              'costo_quimica_turno',
    'LIMITE INDICADOR M3':        'limite_indicador_m3',
    '$ M3':                       'pesos_por_m3',       # ← columna que faltaba
}


def build_col_map(df_columns):
    """
    Construye mapeo {indice_col → campo_bd} usando nombres de columna.
    Esto hace el loader robusto ante diferencias de estructura entre archivos.
    """
    col_map = {}
    for idx, col in enumerate(df_columns):
        col_upper = str(col).strip().upper()
        for pattern, campo_bd in COL_NAME_MAP.items():
            if pattern in col_upper:
                col_map[idx] = campo_bd
                break
    return col_map

# Mapa DILIGENCIAR BITACORA → turno_bd
# Nomenclatura correcta: turno 1=Noche, turno 2=Mañana, turno 3=Tarde
# En el Excel: "FINAL TURNO 1" = cierra Mañana (turno 2)
#              "FINAL TURNO 2" = cierra Tarde  (turno 3)
#              "FINAL TURNO 3" = cierra Noche  (turno 1)
TURNO_MAP = {
    'FINAL TURNO 1': 2,  # Mañana
    'FINAL TURNO 2': 3,  # Tarde
    'FINAL TURNO 3': 1,  # Noche
}


def resolver_turno(diligencia):
    """Extrae turno BD desde el campo DILIGENCIAR BITACORA."""
    if pd.isna(diligencia):
        return None
    d = str(diligencia).strip().upper()
    return TURNO_MAP.get(d, None)


def safe_float(val):
    """Convierte a float, None si no es numérico."""
    if pd.isna(val):
        return None
    try:
        f = float(val)
        return f if f == f else None  # NaN check
    except (ValueError, TypeError):
        return None


def safe_int(val):
    """Convierte a int, None si no es numérico."""
    f = safe_float(val)
    return int(f) if f is not None else None


def leer_registros(df):
    """Parsea el DataFrame y devuelve lista de dicts listos para insertar."""
    registros = []

    # Construir mapeo dinámico por nombre de columna
    col_map = build_col_map(df.columns)

    for _, row in df.iterrows():
        # Fecha
        fecha_raw = row.iloc[0]
        if pd.isna(fecha_raw):
            continue
        try:
            if isinstance(fecha_raw, (datetime, date)):
                fecha = fecha_raw.date() if isinstance(fecha_raw, datetime) else fecha_raw
            else:
                fecha = pd.to_datetime(fecha_raw).date()
        except Exception:
            continue

        # Día mes
        dia_mes = safe_int(row.iloc[1])
        if dia_mes is None:
            dia_mes = fecha.day

        # Turno
        diligencia = str(row.iloc[4]).strip() if not pd.isna(row.iloc[4]) else ''
        turno_bd = resolver_turno(diligencia)
        if turno_bd is None:
            # Fallback: usar ANALISIS TURNO
            # Nomenclatura: turno 1=Noche, turno 2=Mañana, turno 3=Tarde
            analisis = str(row.iloc[2]).upper() if not pd.isna(row.iloc[2]) else ''
            if 'NOCHE' in analisis:
                turno_bd = 1
            elif 'MAÑANA' in analisis or 'MANANA' in analisis:
                turno_bd = 2
            elif 'TARDE' in analisis:
                turno_bd = 3
            else:
                continue

        turno_desc = str(row.iloc[2]).strip() if not pd.isna(row.iloc[2]) else None

        rec = {
            'fecha':               fecha,
            'dia_mes':             dia_mes,
            'turno':               turno_bd,
            'turno_descripcion':   turno_desc,
            'diligencia_bitacora': diligencia,
            'usuario':             USUARIO,
        }

        # Mapear columnas numéricas usando índices dinámicos por nombre
        for col_idx, campo_bd in col_map.items():
            val = safe_float(row.iloc[col_idx])
            if val is not None:
                rec[campo_bd] = val

        registros.append(rec)

    return registros


def cargar_registros(registros, conn):
    """Inserta/actualiza registros en operacion_gem_turno."""
    if not registros:
        return 0, 0

    cursor = conn.cursor()
    inserted = updated = 0

    for rec in registros:
        campos = list(rec.keys())
        valores = [rec[c] for c in campos]
        placeholders = ', '.join(['%s'] * len(campos))
        cols_str = ', '.join(campos)

        # UPDATE: todos los campos excepto fecha, turno, dia_mes
        update_parts = [
            f"{c} = VALUES({c})"
            for c in campos
            if c not in ('fecha', 'turno', 'dia_mes')
        ]
        update_str = ', '.join(update_parts)

        sql = f"""
            INSERT INTO operacion_gem_turno ({cols_str})
            VALUES ({placeholders})
            ON DUPLICATE KEY UPDATE {update_str}
        """
        cursor.execute(sql, valores)
        if cursor.rowcount == 1:
            inserted += 1
        elif cursor.rowcount == 2:
            updated += 1

    conn.commit()
    cursor.close()
    return inserted, updated


def procesar_archivo(path, nombre):
    """Lee el Excel y retorna lista de registros."""
    print(f"  Leyendo: {nombre} ...")
    try:
        # Buscar la hoja correcta
        xl = pd.ExcelFile(path, engine='openpyxl')
        hoja = None
        for sh in xl.sheet_names:
            if 'INVENTARIO' in sh.upper() and 'GEM' in sh.upper():
                hoja = sh
                break
        if hoja is None:
            print(f"  No se encontro hoja INVENTARIO Y CONSUMO GEM")
            return []

        df = pd.read_excel(path, sheet_name=hoja, header=0,
                           engine='openpyxl', dtype=object)
        print(f"  Hoja: '{hoja}' | Filas: {len(df)}")
        return leer_registros(df)

    except Exception as e:
        print(f"  ERROR leyendo: {e}")
        return []


def main():
    print("=" * 60)
    print("CARGANDO INVENTARIO Y CONSUMO GEM -> operacion_gem_turno")
    print("=" * 60)

    # Buscar todos los xlsx en la carpeta
    archivos = sorted([
        f for f in os.listdir(FOLDER)
        if f.endswith('.xlsx') and (
            'BITACORA' in f.upper() or 'BITÁCORA' in f.upper() or
            'DASHBOARD' in f.upper()
        )
    ])

    print(f"Archivos encontrados: {len(archivos)}")
    for a in archivos:
        print(f"  - {a}")
    print()

    conn = pymysql.connect(**DB)
    total_ins = total_upd = 0

    for archivo in archivos:
        path = os.path.join(FOLDER, archivo)
        print(f"Procesando: {archivo}")
        registros = procesar_archivo(path, archivo)
        if registros:
            ins, upd = cargar_registros(registros, conn)
            total_ins += ins
            total_upd += upd
            print(f"  OK -> Insertados: {ins} | Actualizados: {upd}")
        print()

    conn.close()
    print("=" * 60)
    print("CARGA COMPLETA")
    print(f"  Total insertados:   {total_ins}")
    print(f"  Total actualizados: {total_upd}")
    print(f"  Total procesados:   {total_ins + total_upd}")
    print("=" * 60)


if __name__ == '__main__':
    main()
