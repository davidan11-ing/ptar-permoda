# Archivos Clave del Frontend

**Directorio raíz:** `ptar-app/src/`

## 🔑 Archivos críticos

| Archivo | Propósito |
|---------|-----------|
| `lib/supabase.ts` | Cliente Supabase + interfaces TypeScript de la BD |
| `state/AuthContext.tsx` | Auth mock (usuarios hardcodeados — reemplazar) |
| `app/Router.tsx` | Definición de todas las rutas de la app |
| `hooks/useRegistrosPolling.ts` | Polling cada 15s para actualizar datos |
| `features/dashboard/mockData.ts` | ⚠️ Datos falsos del dashboard principal |

## 📋 Formularios (módulo Operario)

| Archivo | Formulario |
|---------|------------|
| `features/operario/FormatoCaudales.tsx` | 35 contadores — lecturas por turno |
| `features/operario/FormatoReactivos.tsx` | 5 químicos — niveles y consumo |
| `features/operario/FormatoIncidencias.tsx` | Registro de calidad del agua |

## 📊 Dashboard de Calidad

| Archivo | Contenido |
|---------|-----------|
| `features/calidad/CalidadDashboardPage.tsx` | Página principal con filtros |
| `features/calidad/hooks/useCalidadData.ts` | Query rawRows por parámetro/fechas/turno/unidad |
| `features/calidad/hooks/useRemociónGem.ts` | Datos remoción GEM (todas las fechas) |
| `features/calidad/components/HistogramaChart.tsx` | Barras frecuencia 5 rangos fijos |
| `features/calidad/components/PieDistribucionChart.tsx` | Torta 5 rangos porcentuales |
| `features/calidad/components/PercentilChart.tsx` | P0 a P100 cada 10% |
| `features/calidad/components/TablaFrecuencias.tsx` | `TablaParams` + `TablaRangos` |
| `features/calidad/components/TablaPercentiles.tsx` | 11 filas con scroll, header sticky |
| `features/calidad/components/RemociónGemSection.tsx` | Sección completa Remoción GEM |

## 🗺️ Diagrama de Planta

| Archivo | Contenido |
|---------|-----------|
| `features/splash/SplashScreen.tsx` | Diagrama SVG interactivo completo |

Ver [[Diagrama SVG de la Planta]] para detalles del SVG.

## 📐 Constantes

| Directorio | Contenido |
|-----------|-----------|
| `lib/constants/` | IDs y nombres de los 35 contadores, 5 químicos, 22 parámetros |

---

Tags: #frontend #archivos #react
