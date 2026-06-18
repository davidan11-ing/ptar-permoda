# Esquema de Tablas

## Supabase (esquema actual)

La app tiene **3 tablas principales** en PostgreSQL:

---

### 📊 `ptar_registro_contadores`
Lecturas de medidores por turno.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK generado |
| `fecha` | date | Fecha del registro |
| `turno` | text | `mañana` / `tarde` / `noche` |
| `operario` | text | Nombre del operario |
| `contador_id` | text | ID del contador (ej: `C01`) |
| `lectura_actual` | numeric | Lectura del medidor hoy |
| `lectura_anterior` | numeric | Lectura del día anterior |
| `delta_m3` | numeric | **Columna generada** = actual - anterior |
| `created_at` | timestamptz | Auto |

- **35 contadores** definidos en `src/lib/constants/`
- `delta_m3` es calculado automáticamente por la BD

---

### 🧪 `ptar_registro_costos`
Niveles y consumo de reactivos químicos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK generado |
| `fecha` | date | Fecha del registro |
| `turno` | text | Turno del operario |
| `quimico_id` | text | ID del químico (ej: `Q01`) |
| `nivel_pct` | numeric | Nivel del tanque en % |
| `consumo_l` | numeric | Consumo en litros |
| `ppm` | numeric | **Columna generada** |
| `costo_operativo` | numeric | **Columna generada** COP/m³ |
| `created_at` | timestamptz | Auto |

- **5 químicos** monitoreados
- `ppm` y `costo_operativo` calculados por la BD

---

### 💧 `ptar_registro_calidad`
Parámetros físico-químicos del agua.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid | PK generado |
| `fecha` | date | Fecha del muestreo |
| `turno` | text | Turno |
| `unidad` | text | Unidad de tratamiento (16 posibles) |
| `parametro_id` | text | ID del parámetro (ej: `P01`) |
| `valor` | numeric | Valor medido |
| `unidad_medida` | text | Unidad del parámetro (mg/L, NTU, etc.) |
| `created_at` | timestamptz | Auto |

- **22 parámetros** de calidad
- **16 unidades** de tratamiento (ver [[Parámetros de Calidad]])

---

## Relación entre tablas

Las 3 tablas son **independientes** (sin FK entre sí). Se relacionan conceptualmente por `fecha` + `turno`.

---

Tags: #basededatos #schema #tablas
