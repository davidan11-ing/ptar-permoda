# Diagrama SVG de la Planta

**Archivo:** `ptar-app/src/features/splash/SplashScreen.tsx`

## Dimensiones del SVG

```
ViewBox: 0 0 1800 700
```

## Constantes clave

| Constante | Valor | Descripción |
|-----------|-------|-------------|
| `mYA` | `480` | Eje Y del pipe principal TERCIARIA |
| `mYB` | `615` | Eje Y de la fila de rechazos |

## Zonas del diagrama

### Fila superior (y=36, h=315)
```
PRELIMINAR | PRIMARIA | SECUNDARIA
```

### Fila inferior (y=355, h=313)
```
TERCIARIA | VERTIMIENTO
```

## Componentes SVG internos

| Componente | Descripción |
|-----------|-------------|
| `CostBadge` | Badge con punta → en ámbar (valores acumulados por checkpoint) |
| `CostBadgeDown` | Badge con punta ↓ (acumulados Fin.RO1 / Fin.RO2) |
| `CostTag` | Tag compacto teal (valores individuales de paso) |

Definidos en `SplashScreen.tsx` ~línea 147.

## Features del diagrama

### Tooltips
- Sistema `tooltipOverlay` al final del SVG (siempre por encima)
- Callbacks `setTt` y `hideTt` en cada grupo de equipo
- `flipY` automático para equipos en bordes de fase

### Indicadores de costo
- Labels teal `#7ec8c8` bajo cada nombre de equipo
- Clase CSS `eq-cost-float` (animación flotante)
- 5 badges de costo en las líneas de flujo (checkpoints del PDF)

### Modal de detalle (PhaseModal)
- Sección COSTO OPERATIVO con `$` animado (`eq-cost-sign`)
- `costRange` opcional para mostrar rango del PDF
- `clipTopPad`: 240px fases superiores / 120px fases inferiores
- `tooltipOverlay` renderizado fuera del clipPath (nunca recortado)

## Interfaz de equipos

```typescript
interface EqDef {
  cost?:      string;   // ej: "$2.158 COP/m³" o "$480k/mes"
  costRange?: string;   // rango del PDF ej: "$2.000 – $2.300"
}
```

## Equipos con datos reales (del PDF interno)

| ID equipo | Nombre |
|-----------|--------|
| `tk60m3` | Tanque igualador 60m³ |
| `cribRot` | Criba rotativa |
| `mbbr` | Reactor MBBR |
| `anoxic` | Zona anóxica |
| `filtrosII` | Filtros secundarios |
| `ro1e1` | OI línea 1 — etapa 1 |
| `ro1e2` | OI línea 1 — etapa 2 |
| `ro2` | OI línea 2 |
| `tkRecir` | Tanque recirculación |

## Nomenclatura (renombres importantes)

| Nombre anterior | Nombre actual |
|----------------|---------------|
| Swingmill | ESPESADOR |
| Reúso | RECIRCULACIÓN |

---

Tags: #svg #diagrama #splash #planta
