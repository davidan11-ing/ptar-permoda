# CalidadDashboardPage
`src/features/calidad/CalidadDashboardPage.tsx`

Página principal de calidad del agua. El archivo más conectado del frontend.

## Importa a (hooks)
- [[03 Servicios y Hooks/useCalidadData]]
- [[03 Servicios y Hooks/useGranularidad]]
- [[ptarClient]] — `getCalidadParametros`, `getReporteCalidadHtmlUrl`

## Importa a (componentes)
- `HistogramaChart` — barras de frecuencia 5 rangos
- `PieDistribucionChart` — torta porcentual
- `PercentilChart` — percentiles P0–P100
- `TablaParams` + `TablaRangos` — estadísticas
- `TablaPercentiles` — tabla con scroll
- `RemociónGemSection` — sección GEM completa
- `RemocionCostoChart` — costo vs remoción
- `ParamVsDosisSection` — parámetro vs dosis química
- `CargaRemovoidaSection` — carga removida kg/día
- `KgQuimicoSection` — consumo de químicos
- [[04 Componentes/GranularidadSelector]]

## Es importado por
- [[01 Núcleo/Router]] — ruta `/encargado/calidad`

## Roles con acceso
`encargado` | `administrador`

Tags: #feature #calidad #dashboard #pagina
