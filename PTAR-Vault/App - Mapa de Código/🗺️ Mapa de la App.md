# 🗺️ Mapa de la App — ptar-app

> Grafo de dependencias real del código fuente.
> Cada flecha `→` representa un `import` entre archivos.

---

## Punto de entrada

```
main.tsx  →  App.tsx  →  AuthContext  +  Router
```

- [[01 Núcleo/main.tsx]] — punto de arranque de React
- [[01 Núcleo/App.tsx]] — monta el proveedor de auth y el router
- [[01 Núcleo/Router]] — define todas las rutas y carga páginas
- [[01 Núcleo/AuthContext]] — sesión global del usuario
- [[01 Núcleo/Layout]] — navbar + outlet de rutas
- [[01 Núcleo/RoleGuard]] — protege rutas por rol

---

## Features (páginas)

| Feature | Archivo principal | Rol que la usa |
|---------|-----------------|----------------|
| [[02 Features/SplashScreen]] | `splash/SplashScreen.tsx` | Todos |
| [[02 Features/LoginPage]] | `auth/LoginPage.tsx` | Todos |
| [[02 Features/OperarioHome]] | `operario/OperarioHome.tsx` | Operario |
| [[02 Features/FormatoCaudales]] | `operario/FormatoCaudales.tsx` | Operario |
| [[02 Features/FormatoReactivos]] | `operario/FormatoReactivos.tsx` | Operario |
| [[02 Features/FormatoCalidad]] | `operario/FormatoCalidad.tsx` | Operario |
| [[02 Features/CalidadDashboardPage]] | `calidad/CalidadDashboardPage.tsx` | Encargado / Admin |
| [[02 Features/DashboardPage]] | `dashboard/DashboardPage.tsx` | Encargado / Admin |
| [[02 Features/BalanceHidricoDashboard]] | `balance/BalanceHidricoDashboard.tsx` | Encargado / Admin |
| [[02 Features/CostosDashboard]] | `costos/CostosDashboard.tsx` | Encargado / Admin |
| [[02 Features/RegistrosPanel]] | `encargado/RegistrosPanel.tsx` | Encargado |
| [[02 Features/MantenimientosDashboard]] | `mantenimientos/MantenimientosDashboard.tsx` | Encargado / Admin |

---

## Capa de datos (la más conectada)

```
Páginas / Hooks  →  ptarClient.ts  →  FastAPI Backend
```

- [[03 Servicios y Hooks/ptarClient]] — **hub central de datos**, todas las funciones fetch()
- [[03 Servicios y Hooks/useCalidadData]] → ptarClient
- [[03 Servicios y Hooks/useGemEficiencia]] → ptarClient
- [[03 Servicios y Hooks/useMbrEficiencia]] → ptarClient
- [[03 Servicios y Hooks/useRegistrosPolling]] → ptarClient
- [[03 Servicios y Hooks/useBalanceData]] → ptarClient
- [[03 Servicios y Hooks/useGranularidad]] — hook de fechas/granularidad (no llama API)

---

## Componentes compartidos

- [[04 Componentes/Navbar]] — barra de navegación, usa AuthContext
- [[04 Componentes/GranularidadSelector]] — selector de período, usado en Calidad y Costos
- [[04 Componentes/Spinner]] — indicador de carga

---

Tags: #mapa #codigo #arquitectura #imports
