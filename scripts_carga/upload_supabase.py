# -*- coding: utf-8 -*-
"""
Script de carga masiva a Supabase - PTAR App
Carga datos históricos del Excel a las 3 tablas:
  - ptar_registro_costos     (~94 turnos × 5 químicos = ~470 filas)
  - ptar_registro_contadores (~35 contadores: lectura inicial del 2026-01-01)
  - ptar_registro_calidad    (datos del bloque April-2026 detectados)

Uso:  python upload_supabase.py
"""

import io
import sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import pandas as pd
import requests
import json
import warnings
from datetime import datetime

warnings.filterwarnings("ignore")

# ─── Configuración Supabase ──────────────────────────────────────────────────
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
    "Prefer": "return=minimal",
}

EXCEL_PATH = r"Bases de datos\FORMATOS DE REGISTRO.xlsx"
USUARIO = "davidan@permoda.com.co"

# ─── Helpers ─────────────────────────────────────────────────────────────────
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
SESSION = requests.Session()
SESSION.verify = False


def insert_batch(table: str, rows: list[dict]) -> bool:
    """Inserta una lista de dicts en una tabla Supabase. Retorna True si OK."""
    if not rows:
        return True
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    resp = SESSION.post(url, headers=HEADERS, data=json.dumps(rows, default=str))
    if resp.status_code not in (200, 201):
        print(f"  [ERR] Error {resp.status_code}: {resp.text[:300]}")
        return False
    return True


def safe_float(val, default=0.0) -> float:
    try:
        v = float(val)
        return v if v == v else default  # NaN check
    except (TypeError, ValueError):
        return default


def parse_turno(raw: str) -> str:
    """Convierte texto de turno del Excel al formato de la app."""
    s = str(raw).upper()
    if "NOCHE" in s:
        return "noche"
    if "MA" in s:  # MAÑANA
        return "mañana"
    if "TARDE" in s:
        return "tarde"
    return "noche"


def fmt(val) -> float | None:
    """Convierte a float o None."""
    try:
        v = float(val)
        if v != v:  # NaN
            return None
        return round(v, 4)
    except (TypeError, ValueError):
        return None


# ─── 1. COSTOS ───────────────────────────────────────────────────────────────
QUIMICOS = [
    {"id": "Q-01", "nombre": "Ácido",             "unidad": "L",  "densidad": 1.300, "precio_kg":  830,  "nivel_inicial_default": 2780},
    {"id": "Q-02", "nombre": "Coagulante",         "unidad": "L",  "densidad": 1.325, "precio_kg": 2818,  "nivel_inicial_default": 5720},
    {"id": "Q-03", "nombre": "Decolorante",        "unidad": "L",  "densidad": 1.250, "precio_kg": 6295,  "nivel_inicial_default": 4280},
    {"id": "Q-04", "nombre": "Polímero Aniónico",  "unidad": "kg", "densidad": 1.000, "precio_kg": 19050, "nivel_inicial_default":  275},
    {"id": "Q-05", "nombre": "Polímero Catiónico", "unidad": "kg", "densidad": 1.000, "precio_kg": 22050, "nivel_inicial_default":  225},
]
# Columnas del Excel que contienen el NIVEL FINAL de cada químico
QUIMICO_NIVEL_FINAL_COL = [5, 6, 7, 8, 9]      # FINAL ACIDO, COAGULANTE, DECOLORANTE, ANIONICO, CATIONICO
QUIMICO_KG_COL          = [18, 19, 20, 21, 22]  # KG de cada químico (calculados en Excel)


def cargar_costos(df: pd.DataFrame) -> int:
    print("\n── Cargando COSTOS ──────────────────────────────────────────────")
    data_rows = df.iloc[1:].dropna(subset=[0]).reset_index(drop=True)
    print(f"  Filas encontradas: {len(data_rows)}")

    # Niveles iniciales para el primer turno
    nivel_prev = [q["nivel_inicial_default"] for q in QUIMICOS]

    all_records = []
    for _, row in data_rows.iterrows():
        fecha_raw = row[0]
        turno_raw = str(row[2])
        turno = parse_turno(turno_raw)

        # Fecha → created_at ISO
        if isinstance(fecha_raw, datetime):
            fecha_iso = fecha_raw.strftime("%Y-%m-%dT08:00:00")
        else:
            try:
                fecha_iso = pd.to_datetime(fecha_raw).strftime("%Y-%m-%dT08:00:00")
            except Exception:
                continue

        horometro     = safe_float(row[10])
        caudal        = safe_float(row[11])
        horas_op      = safe_float(row[46], default=8.0)
        if horas_op == 0:
            horas_op = 8.0

        for i, q in enumerate(QUIMICOS):
            nivel_final = fmt(row[QUIMICO_NIVEL_FINAL_COL[i]])
            kg_consumidos = fmt(row[QUIMICO_KG_COL[i]])

            if nivel_final is None:
                nivel_prev[i] = q["nivel_inicial_default"]
                continue

            nivel_ini = nivel_prev[i]
            nivel_prev[i] = nivel_final  # actualizar para la siguiente fila

            all_records.append({
                "created_at":        fecha_iso,
                "turno":             turno,
                "usuario":           USUARIO,
                "id_quimico":        q["id"],
                "nombre_quimico":    q["nombre"],
                "unidad":            q["unidad"],
                "densidad_kg":       q["densidad"],
                "nivel_inicial":     nivel_ini,
                "nivel_final":       nivel_final,
                "kg_consumidos":     round(kg_consumidos or 0.0, 4),
                "precio_kg":         float(q["precio_kg"]),
                "horometro_inicial": horometro,
                "caudal_tratado_gem": caudal,
                "horas_operacion":   horas_op,
            })

    print(f"  Registros a insertar: {len(all_records)}")

    # Insertar en lotes de 50
    BATCH = 50
    ok = 0
    for i in range(0, len(all_records), BATCH):
        batch = all_records[i: i + BATCH]
        if insert_batch("ptar_registro_costos", batch):
            ok += len(batch)
            print(f"  [OK] {ok}/{len(all_records)} insertados", end="\r")
        else:
            print(f"\n  [WARN] Fallo en lote {i}–{i+BATCH}")
            return ok

    print(f"\n  [OK] {ok} registros de costos cargados.")
    return ok


# ─── 2. CONTADORES ───────────────────────────────────────────────────────────
CONTADOR_COL_MAP = {
    #  col_excel → (id_app, nombre_completo, ubicacion, tipo_agua)
    2:  ("C-01", 'Contador Entrada Agua Potable Principal 6"',           "Entrada Principal",      "Potable"),
    3:  ("C-02", 'Contador Entrada Agua Potable Fría Lavandería (4")',   "Lavandería",             "Potable"),
    4:  ("C-03", "Contador Entrada Agua Potable LAB Lavandería",         "LAB Lavandería",         "Potable"),
    5:  ("C-04", "Entrada Agua Medidor Rojo Tintorería (4\")",           "Tintorería",             "Industrial"),
    6:  ("C-05", "Entrada Agua Potable Fría Tintorería (4\")",           "Tintorería",             "Potable"),
    7:  ("C-06", "Entrada Agua Medidor Rojo Lavandería (4\")",           "Lavandería",             "Industrial"),
    8:  ("C-07", "Rama",                                                  "Distribución",           "Potable"),
    9:  ("C-08", "Abridora 1",                                            "Proceso",                "Industrial"),
    10: ("C-09", "Abridora 2",                                            "Proceso",                "Industrial"),
    11: ("C-10", "Tanque de Reúso (2\")",                                "Tanque de Reúso",        "Reúso"),
    12: ("C-11", "PTAR",                                                  "Entrada PTAR",           "Residual"),
    13: ("C-12", "Entrada RO #1",                                         "Módulo RO #1",           "Pretratamiento"),
    14: ("C-13", "Salida RO #1",                                          "Módulo RO #1",           "RO"),
    15: ("C-14", "Entrada RO #2",                                         "Módulo RO #2",           "Pretratamiento"),
    16: ("C-15", "Salida RO #2",                                          "Módulo RO #2",           "RO"),
    17: ("C-16", "Entrada Agua Potable Rotativa 3\"",                    "Rotativa",               "Potable"),
    18: ("C-17", "Medidor VERDE DIGITAL Retorno",                         "Retorno",                "Reúso"),
    19: ("C-18", "Contador Entrada Agua Potable Tintorería 6\"",         "Tintorería",             "Potable"),
    20: ("C-19", "Envío a TH",                                            "Torre Enfriamiento",     "Tratada"),
    21: ("C-20", "MBR 1",                                                  "Reactor MBR 1",          "Tratada"),
    22: ("C-21", "MBR 2",                                                  "Reactor MBR 2",          "Tratada"),
    23: ("C-22", "Medidor de Ingreso UF PTAP",                            "UF PTAP",                "Pretratamiento"),
    24: ("C-23", "Medidor Salida UF PTAP",                                "UF PTAP",                "Tratada"),
    25: ("C-24", "Entrada Agua Potable PTAR 2 (½\") — Tanque Recirculación", "PTAR 2 — Acueducto", "Potable"),
    26: ("C-25", "Entrada Agua Potable Puerta 4 — Acueducto",            "Puerta 4",               "Potable"),
    27: ("C-26", "Entrada Agua Potable Cuarto Químicos",                   "Cuarto Químicos",        "Potable"),
    28: ("C-27", "Agua Caliente Tintorería (Digital)",                    "Tintorería",             "Potable"),
    29: ("C-28", "Medidor Prueba Agua Caliente",                          "Prueba Caldera",         "Potable"),
    30: ("C-29", "Entrada Agua Potable Puerta 2 — Acueducto",            "Puerta 2",               "Potable"),
    31: ("C-30", "Entrada Agua Potable Caldera — Acueducto",             "Caldera",                "Potable"),
    32: ("C-31", "Entrada Agua Potable Puerta 5 — Acueducto",            "Puerta 5",               "Potable"),
    33: ("C-32", "Entrada Agua Potable Puerta 6 — Acueducto",            "Puerta 6",               "Potable"),
    34: ("C-33", "Entrada Agua Potable Puerta 7 — Acueducto",            "Puerta 7",               "Potable"),
    35: ("C-34", "Entrada Agua Potable ½\" Lavandería — Acueducto",     "Lavandería — Acueducto", "Potable"),
    36: ("C-35", "Entrada Agua Potable Zona de Lodos ½\" (Lava Ojos)",  "Zona de Lodos",          "Potable"),
}


def cargar_contadores(df: pd.DataFrame) -> int:
    print("\n── Cargando CONTADORES ──────────────────────────────────────────")
    # Solo fila 2 (primera lectura real del 2026-01-01)
    data_row = df.iloc[2]
    fecha_raw = data_row[0]
    if isinstance(fecha_raw, datetime):
        fecha_iso = fecha_raw.strftime("%Y-%m-%dT06:00:00")
    else:
        fecha_iso = "2026-01-01T06:00:00"

    records = []
    for col, (cid, nombre, ubicacion, tipo_agua) in CONTADOR_COL_MAP.items():
        val = fmt(data_row[col])
        if val is None:
            continue
        records.append({
            "created_at":          fecha_iso,
            "turno":               "mañana",
            "usuario":             USUARIO,
            "id_contador":         cid,
            "nombre_contador":     nombre,
            "ubicacion":           ubicacion,
            "tipo_agua":           tipo_agua,
            "lectura_anterior_m3": 0.0,
            "lectura_actual_m3":   val,
            "observaciones":       "Lectura inicial cargada desde Excel histórico",
        })

    print(f"  Registros a insertar: {len(records)}")
    if insert_batch("ptar_registro_contadores", records):
        print(f"  [OK] {len(records)} contadores cargados.")
        return len(records)
    return 0


# ─── 3. CALIDAD ───────────────────────────────────────────────────────────────
PARAMS_CALIDAD = {
    "Temperatura":                          ("Temperatura",               "°C",           "diario"),
    "pH":                                   ("pH",                        "Unidades de pH","diario"),
    "Demanda química de oxígeno (DQO)":     ("DQO",                       "mg/L",         "ocasional"),
    "SOLIDOS DISUELTOS TOTALES (TDS)":      ("TDS",                       "mg/L",         "diario"),
    "Sólidos suspendidos Totales":          ("SST",                       "mg/L",         "diario"),
    "Sólidos Sedimentables":                ("Sólidos Sedimentables",     "mL/L",         "diario"),
    "HIERRO":                               ("Hierro",                    "mg/L",         "ocasional"),
    "Solidos Suspendidos totales GRAVIMETRICO": ("SST Gravimétrico",      "mg/L",         "ocasional"),
    "Cloruros":                             ("Cloruros",                  "mg/L",         "ocasional"),
    "FOSFORO TOTAL":                        ("Fósforo Total",             "mg/L",         "ocasional"),
    "Nitrógeno Total":                      ("Nitrógeno Total",           "mg/L",         "ocasional"),
    "Sulfatos":                             ("Sulfatos",                  "mg/L",         "ocasional"),
    "Alcalinidad":                          ("Alcalinidad",               "mg CaCO3/L",   "ocasional"),
    "Dureza Cálcica":                       ("Dureza Cálcica",            "mg CaCO3/L",   "ocasional"),
    "Dureza Total":                         ("Dureza Total",              "mg CaCO3/L",   "ocasional"),
    "SILICE":                               ("Sílice",                    "mg/L",         "ocasional"),
    "ORP":                                  ("ORP",                       "mV",           "ocasional"),
    "CLORO RES":                            ("Cloro Residual",            "mg/L",         "ocasional"),
    "Conductividad":                        ("Conductividad",             "µS/cm",        "diario"),
    "Color":                                ("Color",                     "UPC",          "diario"),
    "Turbidez":                             ("Turbidez",                  "NTU",          "diario"),
}

# Normalización de nombres de parámetro (Excel → clave en PARAMS_CALIDAD)
def normalize_param(s: str) -> str:
    s = str(s).strip()
    # Quitar sufijos de unidad entre paréntesis
    if " (" in s:
        s = s[:s.index(" (")]
    return s.strip().rstrip(" ")

# Unidades de tratamiento col 1-15 (T1, fila 1)
UNIDADES_COLS = {
    "Tanque Pulmon":                           0,
    "Tanque Homogeneizador (Entrada GEM)":     1,
    "GEM (Salida)":                            2,
    "Reactor Anóxico (Interna)":               3,
    "Reactor MBBR (Interno)":                  4,
    "Reactor MBR 1 (Interno)":                 5,
    "Reactor MBR 2 (Interno)":                 6,
    "Reactor MBR 1 (Permeado)":                7,
    "Reactor MBR 2 (Permeado)":                8,
    "Vertimiento":                             9,
    "RO 1 (COMPUESTA - Permeado)":            10,
    "RO 1 (ETAPA 1)":                         11,
    "RO 1 (ETAPA 2)":                         12,
    "RO 2 (Permeado)":                        13,
    "RO (Rechazo)":                           14,
}

# Mapa a nombres en la app
UNIDAD_APP = {
    "Tanque Pulmon":                        "Tanque Pulmón",
    "Tanque Homogeneizador (Entrada GEM)":  "Tanque Homogeneizador (Entrada GEM)",
    "GEM (Salida)":                         "GEM (Salida)",
    "Reactor Anóxico (Interna)":            "Reactor Anóxico (Interno)",
    "Reactor MBBR (Interno)":              "Reactor MBBR (Interno)",
    "Reactor MBR 1 (Interno)":             "Reactor MBR 1 (Interno)",
    "Reactor MBR 2 (Interno)":             "Reactor MBR 2 (Interno)",
    "Reactor MBR 1 (Permeado)":            "Reactor MBR 1 (Permeado)",
    "Reactor MBR 2 (Permeado)":            "Reactor MBR 2 (Permeado)",
    "Vertimiento":                          "Vertimiento (Salida)",
    "RO 1 (COMPUESTA - Permeado)":         "RO 1 (COMPUESTA - Permeado)",
    "RO 1 (ETAPA 1)":                      "RO 1 (ETAPA 1)",
    "RO 1 (ETAPA 2)":                      "RO 1 (ETAPA 2)",
    "RO 2 (Permeado)":                     "RO 2 (Permeado)",
    "RO (Rechazo)":                        "RO (Rechazo)",
}

TURNOS_COLS = [
    ("noche",   2),   # T1 empieza en col 2
    ("mañana", 17),   # T2 empieza en col 17
    ("tarde",  32),   # T3 empieza en col 32
]


def cargar_calidad(df: pd.DataFrame) -> int:
    print("\n── Cargando CALIDAD ─────────────────────────────────────────────")
    BLOCK_SIZE = 24   # rows per date block (2 header + 21 params + 1 blank)
    n_rows = len(df)
    n_blocks = n_rows // BLOCK_SIZE
    print(f"  Bloques de fecha estimados: {n_blocks}")

    all_records = []

    for b in range(n_blocks):
        r0 = b * BLOCK_SIZE        # fila FECHA
        r1 = r0 + 1               # fila parámetros/unidades
        r_data_start = r0 + 2     # primera fila de datos
        r_data_end   = r0 + 23    # última fila de datos (inclusive)

        # Obtener fecha
        fecha_raw = df.iloc[r0, 1]
        if str(fecha_raw) in ("nan", "None", "", "FECHA "):
            continue
        try:
            fecha_dt = pd.to_datetime(fecha_raw)
            fecha_str = fecha_dt.strftime("%Y-%m-%d")
        except Exception:
            continue

        # Obtener nombres de parámetro para este bloque (col 0)
        param_names_raw = [str(df.iloc[r, 0]) for r in range(r_data_start, r_data_end)]

        # Para cada turno
        for turno, col_start in TURNOS_COLS:
            # Para cada unidad de tratamiento (15 columnas)
            for u_name, u_offset in UNIDADES_COLS.items():
                col_val = col_start + u_offset
                if col_val >= df.shape[1]:
                    continue
                unidad_app = UNIDAD_APP.get(u_name, u_name)

                # Para cada parámetro
                for param_idx, param_raw in enumerate(param_names_raw):
                    r_val = r_data_start + param_idx
                    if r_val >= r_data_end or r_val >= n_rows:
                        continue

                    # Buscar en PARAMS_CALIDAD
                    p_norm = normalize_param(param_raw)
                    p_info = None
                    for key, val in PARAMS_CALIDAD.items():
                        if p_norm.lower().startswith(key.lower()[:8]) or key.lower() in p_norm.lower():
                            p_info = val
                            break
                    if p_info is None:
                        continue

                    param_nombre, param_unidad, _ = p_info

                    # Valor
                    cell_val = df.iloc[r_val, col_val]
                    valor = fmt(cell_val)
                    if valor is None:
                        continue  # skip empty cells

                    # Hora aproximada según turno
                    hora_map = {"noche": "02:00:00", "mañana": "10:00:00", "tarde": "18:00:00"}
                    created_at = f"{fecha_str}T{hora_map[turno]}"

                    all_records.append({
                        "created_at":          created_at,
                        "turno":               turno,
                        "usuario":             USUARIO,
                        "unidad_tratamiento":  unidad_app,
                        "parametro":           param_nombre,
                        "unidad_medida":       param_unidad,
                        "valor":               valor,
                        "no_aplica":           False,
                    })

    print(f"  Registros a insertar: {len(all_records)}")
    if len(all_records) == 0:
        print("  [WARN] No se encontraron datos de calidad.")
        return 0

    # Insertar en lotes de 100
    BATCH = 100
    ok = 0
    for i in range(0, len(all_records), BATCH):
        batch = all_records[i: i + BATCH]
        if insert_batch("ptar_registro_calidad", batch):
            ok += len(batch)
            print(f"  [OK] {ok}/{len(all_records)} insertados", end="\r")
        else:
            print(f"\n  [WARN] Fallo en lote {i}–{i+BATCH}")
            break

    print(f"\n  [OK] {ok} registros de calidad cargados.")
    return ok


# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  PTAR - Carga historica a Supabase")
    print("=" * 60)
    print(f"\n[*] Leyendo Excel: {EXCEL_PATH}")

    try:
        df_costos     = pd.read_excel(EXCEL_PATH, sheet_name="REGISTRO DE DATOS COSTOS",    header=None)
        df_contadores = pd.read_excel(EXCEL_PATH, sheet_name="REGISTRO DE CONTADORES - BH", header=None)
        df_calidad    = pd.read_excel(EXCEL_PATH, sheet_name="REGISTRO DE DATOS CALIDAD ",  header=None)
    except PermissionError:
        print("\n⚠️  El archivo Excel está abierto en Excel. Cópialo y reintenta,")
        print("    o cierra Excel primero.")
        # Intentar con copia
        import shutil, os
        tmp = EXCEL_PATH.replace(".xlsx", "_tmp.xlsx")
        try:
            shutil.copy2(EXCEL_PATH, tmp)
            df_costos     = pd.read_excel(tmp, sheet_name="REGISTRO DE DATOS COSTOS",    header=None)
            df_contadores = pd.read_excel(tmp, sheet_name="REGISTRO DE CONTADORES - BH", header=None)
            df_calidad    = pd.read_excel(tmp, sheet_name="REGISTRO DE DATOS CALIDAD ",  header=None)
            os.remove(tmp)
            print("    [OK] Leído desde copia temporal.")
        except Exception as e:
            print(f"    [ERR] No se pudo leer: {e}")
            sys.exit(1)

    total = 0
    total += cargar_costos(df_costos)
    total += cargar_contadores(df_contadores)
    total += cargar_calidad(df_calidad)

    print("\n" + "=" * 60)
    print(f"  [OK] Carga completa. Total registros insertados: {total}")
    print("=" * 60)


if __name__ == "__main__":
    main()
