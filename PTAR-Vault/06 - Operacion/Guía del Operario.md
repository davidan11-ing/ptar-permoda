# Guía del Operario — Registro de Turno

Esta guía explica paso a paso cómo el operario registra su turno en la app PTAR.

---

## Acceso al sistema

1. Abrir la app en el navegador
2. Ingresar con usuario y contraseña asignados
3. El sistema identifica automáticamente el rol como **Operario**

---

## Pantalla principal del Operario

Al ingresar, el operario ve:
- **Donut chart** — resumen de KPIs de la semana activa
- **Tabla paginada** — registros de su semana
- **Botones de formulario** para registrar el turno actual

---

## Formulario 1 — Caudales (Contadores)

1. Seleccionar **fecha** y **turno** (Mañana / Tarde / Noche)
2. Para cada contador, ingresar:
   - **Lectura actual** (valor actual del medidor)
   - **Lectura anterior** (valor del día anterior)
   - El sistema calcula automáticamente el **delta m³**
3. Revisar los 35 contadores y hacer clic en **Guardar**

> ⚠️ Si un contador no tiene lectura, dejar en blanco (no ingresar 0 a menos que sea la lectura real).

---

## Formulario 2 — Reactivos Químicos

1. Para cada uno de los **5 químicos**:
   - Ingresar **nivel del tanque** en porcentaje (%)
   - Ingresar **consumo en litros** del turno
2. El sistema calcula PPM y costo operativo automáticamente
3. Hacer clic en **Guardar**

---

## Formulario 3 — Calidad / Incidencias

> Este formulario también lo puede usar el personal de laboratorio.

1. Seleccionar **fecha**, **turno** y **unidad de tratamiento**
2. Para cada parámetro con medición disponible:
   - Ingresar el **valor** medido
3. Registrar cualquier **novedad o incidencia** del turno
4. Hacer clic en **Guardar**

---

## Frecuencia de registro

| Formulario | Frecuencia recomendada |
|-----------|----------------------|
| Caudales | Una vez por turno (inicio o fin) |
| Reactivos | Una vez por turno |
| Calidad | Según muestras de laboratorio |

---

Tags: #operario #guia #registro #turno
