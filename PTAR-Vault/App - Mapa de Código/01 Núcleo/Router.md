# Router
`src/app/Router.tsx`

Define todas las rutas de la SPA con React Router v6. Usa `lazy()` para cargar páginas bajo demanda.

## Importa a
- [[Layout]]
- [[RoleGuard]]
- `lib/routes.ts` — constantes ROUTES
- [[02 Features/SplashScreen]]
- [[02 Features/LoginPage]]
- [[02 Features/OperarioHome]]
- [[02 Features/FormatoCaudales]]
- [[02 Features/FormatoReactivos]]
- [[02 Features/FormatoCalidad]]
- [[02 Features/DashboardPage]]
- [[02 Features/CalidadDashboardPage]]
- [[02 Features/BalanceHidricoDashboard]]
- [[02 Features/CostosDashboard]]
- [[02 Features/RegistrosPanel]]
- [[02 Features/MantenimientosDashboard]]

## Es importado por
- [[App.tsx]]

## Rutas definidas

| Ruta | Página | Rol |
|------|--------|-----|
| `/` | SplashScreen | Todos |
| `/login` | LoginPage | Todos |
| `/operario` | OperarioHome | operario |
| `/operario/formato/caudales` | FormatoCaudales | operario |
| `/operario/formato/reactivos` | FormatoReactivos | operario |
| `/operario/formato/calidad` | FormatoCalidad | operario |
| `/encargado/dashboard` | DashboardPage | encargado |
| `/encargado/calidad` | CalidadDashboardPage | encargado/admin |
| `/encargado/balance` | BalanceHidricoDashboard | encargado/admin |
| `/encargado/costos` | CostosDashboard | encargado/admin |
| `/encargado/registros` | RegistrosPanel | encargado/admin |
| `/mantenimientos` | MantenimientosDashboard | encargado/admin |
| `/admin/dashboard` | DashboardPage | administrador |

Tags: #nucleo #router #rutas
