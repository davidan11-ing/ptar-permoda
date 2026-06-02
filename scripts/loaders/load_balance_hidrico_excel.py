"""
Loader: DASHBOARD BALANCE HIDRICO (BASE DE DATOS) + Contadores PTAR
Carga datos a:
  - consumo_turno          → alimenta v_balance_hidrico (PRINCIPAL)
  - balance_hidrico_manual → carrotanques, kg_tela, und_efectivas, m_tela, mulas
  - contadores_lectura     → lecturas RAW de medidores

Mapeo entrada_ro1:
  El Excel ya trae m3 (ej: 260.724)
  consumo_turno.cons_entrada_ro1 guarda en litros (ej: 260724)
  La vista divide /1000 para mostrar m3
  → Al cargar: multiplicar x 1000 si viene en m3 del Excel BASE DE DATOS
  → EXCEPCION: cons_medidor_verde_retorno también /1000 en la vista
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

FILE_BALANCE = (
    r"C:\Users\lunaop\OneDrive - PERMODA LTDA\Documentos\Claude"
    r"\Projects\App PTAR 2\BASE DE DATOS\BALANCES 2026"
    r"\BALANCE HIDRICO\FORMULACIÓN BALANCE"
    r"\DASHBOARD BALANCE HIDRICO BOGOTA 2026.xlsx"
)

FILE_CONTADORES = (
    r"C:\Users\lunaop\OneDrive - PERMODA LTDA\Documentos\Claude"
    r"\Projects\App PTAR 2\BASE DE DATOS\SEGUIMIENTO DIARIO PTAR 2026"
    r"\REGISTRO DE CONTADORES 2026\Contadores PTAR 2026.xlsx"
)

USUARIO = 'loader_excel'


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
    return int(round(f)) if f is not None else None


def to_date(val):
    if pd.isna(val):
        return None
    if isinstance(val, (datetime, date)):
        return val.date() if isinstance(val, datetime) else val
    try:
        return pd.to_datetime(val).date()
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────
# 1. CONSUMO_TURNO desde BASE DE DATOS del balance hídrico
# ─────────────────────────────────────────────────────────────

# Mapeo col_excel (0-based) → campo consumo_turno
# Nota: entrada_ro1 (col 13) viene en m3 → guardar *1000 (litros) en cons_entrada_ro1
# medidor_verde_retorno (col 51) viene en m3 → guardar *1000
CONSUMO_COL_MAP = {
    4:  ('cons_ingreso_uf_ptap',              1),      # VOLUMEN INGRESO PTAP m3 → directo
    5:  ('cons_salida_uf_ptap',               1),      # VOLUMEN PTAP POTABLE m3 → directo
    8:  ('cons_entrada_ap_principal_6in',     1),      # CONTADOR PRINCIPAL → directo
    13: ('cons_entrada_ro1',               1000),      # ENTRADA RO 1 m3 → *1000 = litros
    14: ('cons_salida_ro1',                   1),      # PERMEADO ETAPA 1 m3 → directo
    33: ('cons_lavanderia_m3',                1),      # CONSUMO LAVANDERIA m3
    40: ('cons_entrada_ap_rotativa_3in',      1),      # CONSUMO ROTATIVA m3
    44: ('cons_tanque_reuso_2in',             1),      # CONTADOR ACUEDUCTO m3
    46: ('cons_envio_th',                     1),      # ENVIO A TH m3
    47: ('cons_mbr1',                         1),      # PERMEADO MBR1 m3
    48: ('cons_mbr2',                         1),      # PERMEADO MBR2 m3
    50: ('cons_agua_caliente_tintoreria',     1),      # AGUA CALIENTE m3
    51: ('cons_medidor_verde_retorno',     1000),      # RETORNO VERDE m3 → *1000
}

# Campos que van a balance_hidrico_manual
MANUAL_COL_MAP = {
    6:  'carrotanques_m3',   # CARROTANQUES
    30: 'kg_tela',           # Kg Tela
    37: 'und_efectivas',     # Und efectivas
    42: 'm_tela',            # m Tela
    49: 'mulas_funza_m3',    # MULAS DE FUNZA
}


def cargar_consumo_turno(conn):
    print("Leyendo BASE DE DATOS (consumo_turno + balance_hidrico_manual)...")
    df = pd.read_excel(FILE_BALANCE, sheet_name='BASE DE DATOS',
                       header=0, engine='openpyxl', dtype=object)
    print(f"  Filas totales: {len(df)}")

    ins_ct = upd_ct = ins_bh = upd_bh = 0
    cursor = conn.cursor()

    hoy = date.today()
    for _, row in df.iterrows():
        fecha = to_date(row.iloc[0])
        turno = safe_int(row.iloc[1])
        if fecha is None or turno is None or turno not in (1, 2, 3):
            continue
        # No cargar fechas futuras (el Excel tiene proyecciones a fin de año)
        if fecha > hoy:
            continue

        # ── consumo_turno ──────────────────────────────────────
        rec_ct = {'fecha': fecha, 'turno': turno}
        for col_idx, (campo, factor) in CONSUMO_COL_MAP.items():
            v = safe_float(row.iloc[col_idx])
            if v is not None:
                rec_ct[campo] = round(v * factor, 2)

        if len(rec_ct) > 2:  # tiene más que fecha y turno
            campos = list(rec_ct.keys())
            vals = [rec_ct[c] for c in campos]
            ph = ', '.join(['%s'] * len(campos))
            cols = ', '.join(campos)
            upd = ', '.join(
                f"{c} = VALUES({c})"
                for c in campos if c not in ('fecha', 'turno')
            )
            sql = f"INSERT INTO consumo_turno ({cols}) VALUES ({ph}) ON DUPLICATE KEY UPDATE {upd}"
            cursor.execute(sql, vals)
            if cursor.rowcount == 1:
                ins_ct += 1
            elif cursor.rowcount == 2:
                upd_ct += 1

        # ── balance_hidrico_manual ─────────────────────────────
        rec_bh = {'fecha': fecha, 'turno': turno}
        for col_idx, campo in MANUAL_COL_MAP.items():
            v = safe_float(row.iloc[col_idx])
            if v is not None:
                rec_bh[campo] = v

        if len(rec_bh) > 2:
            campos = list(rec_bh.keys())
            vals = [rec_bh[c] for c in campos]
            ph = ', '.join(['%s'] * len(campos))
            cols = ', '.join(campos)
            upd = ', '.join(
                f"{c} = VALUES({c})"
                for c in campos if c not in ('fecha', 'turno')
            )
            sql = f"INSERT INTO balance_hidrico_manual ({cols}) VALUES ({ph}) ON DUPLICATE KEY UPDATE {upd}"
            cursor.execute(sql, vals)
            if cursor.rowcount == 1:
                ins_bh += 1
            elif cursor.rowcount == 2:
                upd_bh += 1

    conn.commit()
    cursor.close()
    print(f"  consumo_turno       -> Insertados: {ins_ct} | Actualizados: {upd_ct}")
    print(f"  balance_hidrico_manual -> Insertados: {ins_bh} | Actualizados: {upd_bh}")
    return ins_ct + upd_ct + ins_bh + upd_bh


# ─────────────────────────────────────────────────────────────
# 2. CONTADORES_LECTURA desde Contadores PTAR 2026.xlsx
# ─────────────────────────────────────────────────────────────

# Mapeo col Excel (0-based) → columna contadores_lectura
CONT_COL_MAP = {
    2:  'entrada_ap_principal_6in',
    3:  'entrada_ap_fria_lavanderia_4in',
    4:  'entrada_ap_lab_lavanderia',
    5:  'entrada_medidor_rojo_tintoreria_4in',
    6:  'entrada_ap_fria_tintoreria_4in',
    7:  'entrada_medidor_rojo_lavanderia_4in',
    8:  'rama',
    9:  'abridora_1',
    10: 'abridora_2',
    11: 'tanque_reuso_2in',
    12: 'ptar',
    13: 'entrada_ro1',
    14: 'salida_ro1',
    15: 'entrada_ro2',
    16: 'salida_ro2',
    17: 'entrada_ap_rotativa_3in',
    18: 'medidor_verde_retorno',
    20: 'envio_th',
    21: 'mbr1',
    22: 'mbr2',
    23: 'ingreso_uf_ptap',
    24: 'salida_uf_ptap',
    25: 'entrada_ap_ptar2_acueducto',
    26: 'entrada_ap_puerta4_acueducto',
    27: 'entrada_ap_quimicos',
    28: 'agua_caliente_tintoreria',
    29: 'medidor_prueba_agua_caliente',
    30: 'entrada_ap_puerta2_acueducto',
    31: 'entrada_ap_caldera_acueducto',
    32: 'entrada_ap_puerta5_acueducto',
    33: 'entrada_ap_puerta6_acueducto',
    34: 'entrada_ap_puerta7_acueducto',
    35: 'entrada_ap_lavanderia_acueducto',
    36: 'entrada_ap_zona_lodos_acueducto',
}

TURNO_HORA = {
    '06:00': 2,  # Mañana → turno 2
    '14:00': 3,  # Tarde  → turno 3
    '22:00': 1,  # Noche  → turno 1
    '06:00:00': 2,
    '14:00:00': 3,
    '22:00:00': 1,
}

HORA_BD = {1: '22:00:00', 2: '06:00:00', 3: '14:00:00'}


def resolver_turno_contadores(hora_val):
    """Determina turno desde valor de hora del Excel."""
    if pd.isna(hora_val):
        return None
    h = str(hora_val).strip()
    # Formato datetime
    if 'T' in h or '2026' in h:
        try:
            t = pd.to_datetime(hora_val)
            hhmm = f"{t.hour:02d}:{t.minute:02d}"
            return TURNO_HORA.get(hhmm, None)
        except Exception:
            pass
    # Formato HH:MM o HH:MM:SS
    for key, turno in TURNO_HORA.items():
        if h.startswith(key[:5]):
            return turno
    return None


def cargar_contadores(conn):
    print("Leyendo Contadores PTAR 2026 (contadores_lectura)...")
    # Fila 0 = unidades (m3), fila 1 en adelante = datos
    df = pd.read_excel(FILE_CONTADORES, sheet_name=0,
                       header=0, engine='openpyxl', dtype=object, skiprows=0)
    print(f"  Filas totales: {len(df)}")

    ins = upd = 0
    fecha_actual = None
    cursor = conn.cursor()

    for _, row in df.iterrows():
        # Col 0 = FECHA
        fecha_val = row.iloc[0]
        if pd.notna(fecha_val):
            fd = to_date(fecha_val)
            if fd:
                fecha_actual = fd

        if fecha_actual is None:
            continue

        # Col 1 = HORA
        hora_val = row.iloc[1]
        turno = resolver_turno_contadores(hora_val)
        if turno is None:
            continue

        rec = {
            'fecha':        fecha_actual,
            'turno':        turno,
            'hora_lectura': HORA_BD[turno],
            'usuario':      USUARIO,
        }

        for col_idx, campo in CONT_COL_MAP.items():
            v = safe_float(row.iloc[col_idx]) if col_idx < len(row) else None
            if v is not None:
                rec[campo] = int(round(v))  # lecturas son enteros grandes

        if len(rec) <= 4:
            continue

        campos = list(rec.keys())
        vals = [rec[c] for c in campos]
        ph = ', '.join(['%s'] * len(campos))
        cols = ', '.join(campos)
        upd_parts = ', '.join(
            f"{c} = VALUES({c})"
            for c in campos if c not in ('fecha', 'turno', 'hora_lectura')
        )
        sql = f"INSERT INTO contadores_lectura ({cols}) VALUES ({ph}) ON DUPLICATE KEY UPDATE {upd_parts}, actualizado_en = CURRENT_TIMESTAMP"
        cursor.execute(sql, vals)
        if cursor.rowcount == 1:
            ins += 1
        elif cursor.rowcount == 2:
            upd += 1

    conn.commit()
    cursor.close()
    print(f"  contadores_lectura  -> Insertados: {ins} | Actualizados: {upd}")
    return ins + upd


def main():
    print("=" * 65)
    print("CARGANDO BALANCE HIDRICO + CONTADORES")
    print("=" * 65)

    conn = pymysql.connect(**DB)
    total = 0

    print()
    print(">>> PARTE 1: consumo_turno + balance_hidrico_manual")
    print("-" * 65)
    total += cargar_consumo_turno(conn)

    print()
    print(">>> PARTE 2: contadores_lectura")
    print("-" * 65)
    total += cargar_contadores(conn)

    conn.close()

    print()
    print("=" * 65)
    print("CARGA COMPLETA")
    print(f"  Total operaciones:  {total}")
    print("=" * 65)


if __name__ == '__main__':
    main()
