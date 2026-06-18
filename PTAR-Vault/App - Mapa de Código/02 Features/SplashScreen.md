# SplashScreen
`src/features/splash/SplashScreen.tsx`

Diagrama SVG interactivo de la planta. Primera pantalla que ve el usuario en `/`.

## Importa a (componentes propios)
- `PhaseModal` — modal de detalle de cada fase
- `EquipSvgDrawing` — dibujo SVG de equipos
- `EquipmentModal` — modal de equipo específico

## Es importado por
- [[01 Núcleo/Router]] — ruta `/`

## Características
- ViewBox `0 0 1800 700`
- Tooltips interactivos por equipo
- Badges de costo operativo en líneas de flujo
- Indicadores teal `#7ec8c8` por equipo
- `CostBadge` → `CostBadgeDown` ↓ `CostTag` (componentes SVG internos)

Tags: #feature #splash #svg #diagrama
