# Plan de Migración — Arquitectura

> Ver detalles completos en [[05 - Migracion/Plan por Fases]]

## Resumen ejecutivo

| Aspecto | Actual | Futuro |
|---------|--------|--------|
| Frontend | Vercel (nube) | Mismo (o FastAPI sirve el dist/) |
| Base de datos | Supabase PostgreSQL (nube) | MySQL en `wserver.permoda.com.co` |
| API | Supabase SDK (directo) | FastAPI REST en puerto **8001** |
| Auth | Mock hardcodeado | JWT con tabla `usuarios` en MySQL |
| PDF | No disponible | reportlab / weasyprint vía FastAPI |

## Razón del cambio

La política corporativa de Permoda exige que los datos operativos de la planta residan en servidores internos, no en la nube de terceros.

## Patrón de referencia

El backend del **Almacén Permoda** ya está funcionando con este mismo stack:
```
FastAPI + SQLAlchemy async + aiomysql
Puerto: 8001 (PTAR) — Puerto: 8000 (Almacén)
Gestor: NSSM (Windows Service)
```

---

Tags: #migracion #arquitectura
