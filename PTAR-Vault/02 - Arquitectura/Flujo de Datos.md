# Flujo de Datos

## Flujo actual (Supabase)

```
Operario/Lab
    │
    ▼
Formulario React (browser)
    │  POST
    ▼
Supabase SDK (supabase.ts)
    │
    ▼
PostgreSQL Supabase (nube)
    │
    ▼
Hook useRegistrosPolling.ts
(polling cada 15s)
    │
    ▼
Dashboard / Gráficos
```

---

## Flujo futuro (FastAPI + MySQL)

```
Operario/Lab
    │
    ▼
Formulario React (browser)
    │  fetch() POST
    ▼
FastAPI (wserver:8001)
    │  SQLAlchemy async
    ▼
MySQL local (wserver)
    │
    ▼
fetch() GET (polling 15s)
    │
    ▼
Dashboard / Gráficos
```

---

## Formularios de captura de datos

### Caudales (contadores)
- **Archivo:** `FormatoCaudales.tsx`
- **Tabla destino:** `ptar_registro_contadores`
- **Datos:** 35 contadores, lectura actual y anterior → delta_m³ (columna generada)
- **Frecuencia:** Por turno (mañana / tarde / noche)

### Reactivos Químicos
- **Archivo:** `FormatoReactivos.tsx`
- **Tabla destino:** `ptar_registro_costos`
- **Datos:** 5 químicos, nivel tanque (%), consumo (L), PPM calculado
- **Frecuencia:** Por turno

### Incidencias / Calidad
- **Archivo:** `FormatoIncidencias.tsx`
- **Tabla destino:** `ptar_registro_calidad`
- **Datos:** 22 parámetros físico-químicos, 16 unidades de tratamiento
- **Frecuencia:** Variable (laboratorio)

---

Tags: #arquitectura #flujo #datos
