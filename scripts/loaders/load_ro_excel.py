"""
Loader: REGISTRO RO → operacion_ro_turno
Lee los archivos FORMATO BITÁCORA OPERACIÓN PTAR *.xlsx y
DASHBOARD COSTOS *.xlsx de la carpeta Química GEM RO y carga
a operacion_ro_turno.

Turno en el Excel → BD:
  "1 (NOCHE)"  → 1
  "2 (MAÑANA)" → 2
  "3(TARDE)"   → 3
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

# Mapeo col (0-based) → campo BD
COL_MAP = {
    3:  'aplic_hcl',
    4:  'aplic_kuriverter',
    5:  'aplic_vitec',
    6:  'aplic_naoh',
    7:  'aplic_bisulfito',
    8:  'horas_operacion',
    9:  'cm_hcl',
    10: 'cm_ik220',
    11: 'cm_vitec7000',
    12: 'cm_naoh',
    13: 'cm_bisulfito',
    14: 'inv_l_hcl',
    15: 'inv_l_kuriverter',
    16: 'inv_l_vitec',
    17: 'inv_l_naoh',
    18: 'inv_l_bisulfito',
    19: 'consumo_l_hcl',
    20: 'consumo_l_kuriverter',
    21: 'consumo_l_vitec',
    22: 'consumo_l_naoh',
    23: 'consumo_l_bisulfito',
    29: 'consumo_kg_hcl',
    30: 'consumo_kg_kuriverter',
    31: 'consumo_kg_vitec',
    32: 'consumo_kg_naoh',
    33: 'consumo_kg_bisulfito',
    34: 'volumen_enviado_ro_m3',
    35: 'ppm_hcl',
    36: 'ppm_kuriverter',
    37: 'ppm_vitec',
    38: 'ppm_naoh',
    39: 'ppm_bisulfito',
    45: 'costo_op_hcl',
    46: 'costo_op_kuriverter',
    47: 'costo_op_vitec',
    48: 'costo_op_naoh',
    49: 'costo_op_bisulfito',
    50: 'costo_quimica_turno',
    51: 'limite_indicador_m3',
    52: 'pesos_m3_enviado_ro',
}


def safe_float(val):
    if pd.isna(val):
        return None
    try:
        f = float(val)
        return f if f == f else None
    except (ValueError, TypeError):
        return None


def safe_int(val):
    f = safe_float(val)
    return int(f) if f is not None else None


def resolver_turno(turno_raw):
    """Extrae turno BD desde texto del Excel."""
    if turno_raw is None or (isinstance(turno_raw, float) and turno_raw != turno_raw):
        return None
    s = str(turno_raw).strip().upper()
    if s.startswith('1') or 'NOCHE' in s:
        return 1
    if s.startswith('2') or 'MANA' in s or 'MAÑA' in s or 'MA\xd1' in s:
        return 2
    if s.startswith('3') or 'TARDE' in s:
        return 3
    return None


def leer_registros(df):
    registros = []
    n_cols = len(df.columns)
    hoy = date.today()

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

        if fecha > hoy:
            continue

        # Dia
        dia_mes = safe_int(row.iloc[1]) if n_cols > 1 else fecha.day
        if dia_mes is None:
            dia_mes = fecha.day

        # Turno
        turno_raw = row.iloc[2] if n_cols > 2 else None
        turno_bd = resolver_turno(turno_raw)
        if turno_bd is None:
            continue

        rec = {
            'fecha':               fecha,
            'dia_mes':             dia_mes,
            'turno':               turno_bd,
            'turno_descripcion':   str(turno_raw).strip() if turno_raw else None,
            'usuario':             USUARIO,
        }

        # Campos numéricos
        for col_idx, campo in COL_MAP.items():
            if col_idx >= n_cols:
                continue
            val = safe_float(row.iloc[col_idx])
            if val is not None:
                rec[campo] = val

        registros.append(rec)

    return registros


def cargar_registros(registros, conn):
    if not registros:
        return 0, 0

    cursor = conn.cursor()
    inserted = updated = 0

    for rec in registros:
        campos = list(rec.keys())
        valores = [rec[c] for c in campos]
        placeholders = ', '.join(['%s'] * len(campos))
        cols_str = ', '.join(campos)
        update_parts = [f"{c} = VALUES({c})" for c in campos
                        if c not in ('fecha', 'turno', 'dia_mes')]
        update_str = ', '.join(update_parts)

        sql = f"""
            INSERT INTO operacion_ro_turno ({cols_str})
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
    print(f"  Leyendo: {nombre} ...")
    try:
        xl = pd.ExcelFile(path, engine='openpyxl')
        hoja = None
        for sh in xl.sheet_names:
            sh_upper = sh.strip().upper()
            if 'REGISTRO' in sh_upper and 'RO' in sh_upper:
                hoja = sh
                break
        if hoja is None:
            print(f"  No se encontró hoja REGISTRO RO (hojas: {xl.sheet_names})")
            return []

        df = pd.read_excel(path, sheet_name=hoja, header=0,
                           engine='openpyxl', dtype=object)
        print(f"  Hoja: '{hoja}' | Filas: {len(df)}")
        return leer_registros(df)

    except Exception as e:
        print(f"  ERROR leyendo {nombre}: {e}")
        return []


def main():
    print("=" * 60)
    print("CARGANDO REGISTRO RO -> operacion_ro_turno")
    print("=" * 60)

    archivos = sorted([
        f for f in os.listdir(FOLDER)
        if f.lower().endswith('.xlsx') and (
            'BITACORA' in f.upper() or 'BIT\xc1CORA' in f.upper() or
            'DASHBOARD' in f.upper() or 'FORMATO' in f.upper()
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
    print(f"  Total insertados:   {total_ins}")
    print(f"  Total actualizados: {total_upd}")
    print(f"  Total procesados:   {total_ins + total_upd}")
    print("=" * 60)


if __name__ == '__main__':
    main()
