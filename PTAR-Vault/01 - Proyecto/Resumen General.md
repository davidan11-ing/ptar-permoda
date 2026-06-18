# Resumen General — App PTAR

## ¿Qué es?

Aplicación web para la **gestión digital de la Planta de Tratamiento de Aguas Residuales (PTAR)** de Permoda Ltda. Permite registrar, monitorear y analizar los parámetros operativos de la planta en tiempo real.

## ¿Para qué sirve?

| Función | Descripción |
|---------|-------------|
| Registro de turnos | Operarios ingresan lecturas de contadores, niveles de reactivos e incidencias |
| Monitoreo de calidad | Análisis estadístico de 22 parámetros físico-químicos del agua |
| Trazabilidad | Historial completo por turno, fecha y unidad de tratamiento |
| Costos operativos | Cálculo automático de costo por m³ de agua tratada |
| Diagrama de planta | Visualización interactiva del flujo de agua con tooltips por equipo |

## Stack Tecnológico

```
Frontend:  React 19 + Vite 6 + TypeScript strict
Router:    React Router v6
Backend:   Supabase (PostgreSQL) → migrando a FastAPI + MySQL
Despliegue: Vercel (frontend) / wserver.permoda.com.co:8001 (futuro)
```

## Directorio del Proyecto

```
C:\Users\davidan\OneDrive - PERMODA LTDA\Documents\Claude\App_PTAR_SQL\
├── ptar-app/          ← Frontend React
├── ptar-backend/      ← Backend FastAPI (en construcción)
├── sql/               ← Scripts SQL
├── scripts/           ← Utilidades
└── PTAR-Vault/        ← Esta bóveda Obsidian
```

## Contexto Corporativo

- **Empresa:** Permoda Ltda. (fabricante textil)
- **Responsable TI:** davidan@permoda.com.co
- **Política:** Datos deben residir en servidor interno corporativo
- **Servidor destino:** `wserver.permoda.com.co:8001`

---

Tags: #proyecto #ptar #resumen
