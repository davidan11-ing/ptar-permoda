# 🏠 PTAR PERMODA — Base de Conocimiento

> **Planta de Tratamiento de Aguas Residuales — Permoda Ltda.**
> Base de conocimiento técnica y operativa del proyecto de digitalización.

---

## 🗺️ Mapa de la Bóveda

### 📋 Proyecto
- [[01 - Proyecto/Resumen General]] — Qué es, para qué sirve, estado actual
- [[01 - Proyecto/Roles y Usuarios]] — Operario, Calidad, Supervisor
- [[01 - Proyecto/Historial de Cambios]] — Log de versiones importantes

### 🏗️ Arquitectura
- [[02 - Arquitectura/Stack Tecnológico]] — React + Vite + TypeScript + Supabase
- [[02 - Arquitectura/Flujo de Datos]] — Cómo viajan los datos de la planta a la app
- [[02 - Arquitectura/Plan de Migración]] — Supabase → FastAPI + MySQL

### 🗄️ Base de Datos
- [[03 - Base de Datos/Esquema de Tablas]] — 3 tablas principales de Supabase
- [[03 - Base de Datos/Contadores y Medidores]] — 35 contadores registrados
- [[03 - Base de Datos/Reactivos Químicos]] — 5 químicos monitoreados
- [[03 - Base de Datos/Parámetros de Calidad]] — 22 parámetros del agua

### 💻 Frontend
- [[04 - Frontend/Archivos Clave]] — Mapa de archivos críticos
- [[04 - Frontend/Diagrama SVG de la Planta]] — Cómo funciona el SplashScreen
- [[04 - Frontend/Dashboard de Calidad]] — Secciones implementadas

### 🚀 Migración
- [[05 - Migracion/Plan por Fases]] — 9 fases de migración a FastAPI
- [[05 - Migracion/Deuda Técnica]] — Pendientes conocidos

### ⚙️ Operación
- [[06 - Operacion/Guía del Operario]] — Cómo registrar turnos
- [[06 - Operacion/Parámetros de Referencia]] — Valores normales de operación

---

## 🔖 Estado del Proyecto

| Módulo | Estado |
|--------|--------|
| Formulario Caudales | ✅ Implementado |
| Formulario Reactivos | ✅ Implementado |
| Formulario Incidencias | ✅ Implementado |
| Dashboard Calidad — Distribución | ✅ Implementado |
| Dashboard Calidad — Remoción GEM | ✅ Implementado |
| Dashboard Calidad — Osmosis | 🔴 Pendiente |
| Dashboard KPIs | 🟡 Mock (datos falsos) |
| Auth real (login Supabase) | 🔴 Pendiente |
| Backend FastAPI + MySQL | 🟡 En progreso |
| Generación de PDF | 🔴 Pendiente |

---

## 📅 Última actualización
`2026-06-10` — Bóveda Obsidian creada con estado actual del proyecto.
