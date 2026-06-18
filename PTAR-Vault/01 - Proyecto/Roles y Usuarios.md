# Roles y Usuarios

## Roles definidos en la app

### 👷 Operario
- Accede al panel de registro de turno
- Ingresa lecturas de los 35 contadores
- Registra niveles y consumo de reactivos (5 químicos)
- Registra incidencias y novedades del turno
- Ve KPIs de su semana activa (donut chart + tabla paginada)

### 🔬 Calidad
- Accede al Dashboard de Calidad del Agua
- Analiza distribución estadística de los 22 parámetros
- Evalúa eficiencia de remoción del sistema GEM
- Filtra por parámetro, fecha, turno y unidad de tratamiento

### 👔 Supervisor / Admin
- Acceso completo a todos los módulos
- Visualiza el diagrama SVG interactivo de la planta
- Monitorea costos operativos por equipo

---

## Estado del sistema de autenticación

> ⚠️ **La autenticación es actualmente un MOCK (simulada)**

El archivo `AuthContext.tsx` tiene usuarios hardcodeados:

| Usuario | Rol | Estado |
|---------|-----|--------|
| `lunaop@permoda.com.co` | Operario | ⏳ Pendiente de INSERT en BD |
| (otros) | Calidad / Admin | Mock local |

**Pendiente:** Implementar auth real con Supabase Auth o tabla de usuarios en MySQL.

---

Tags: #usuarios #roles #auth
