# Layout
`src/app/Layout.tsx`

Envoltorio visual de todas las páginas protegidas. Muestra la Navbar y renderiza la página activa vía `<Outlet />`.

## Importa a
- [[04 Componentes/Navbar]]
- `NotificationManager`

## Es importado por
- [[Router]]

## Estructura
```
<Layout>
  <Navbar />
  <Outlet />   ← aquí se renderiza cada página
</Layout>
```

Tags: #nucleo #layout
