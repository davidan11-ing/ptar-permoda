# RoleGuard
`src/app/guards/RoleGuard.tsx`

Componente que protege rutas según el rol del usuario. Si el rol no está permitido, redirige a `/`.

## Importa a
- [[AuthContext]] — lee el rol actual con `useAuth()`
- `models/index.ts` — tipo `Role`
- `lib/routes.ts` — constante ROUTES

## Es importado por
- [[Router]]

## Uso
```tsx
<RoleGuard allowedRoles={['encargado', 'administrador']}>
  <CalidadDashboardPage />
</RoleGuard>
```

Tags: #nucleo #seguridad #roles
