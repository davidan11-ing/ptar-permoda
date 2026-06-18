# AuthContext
`src/state/AuthContext.tsx`

Proveedor global de autenticación. Expone `useAuth()` hook.

## Exporta
- `AuthProvider` — proveedor de contexto
- `useAuth()` — hook para acceder a usuario y rol actual

## Es importado por
- [[App.tsx]]
- [[RoleGuard]]
- [[04 Componentes/Navbar]]

## Estado actual
> ⚠️ **Mock** — usuarios hardcodeados, sin validación real contra BD.

## Roles disponibles
`operario` | `encargado` | `administrador`

Tags: #nucleo #auth #contexto
