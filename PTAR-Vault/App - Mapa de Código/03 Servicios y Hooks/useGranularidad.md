# useGranularidad
`src/hooks/useGranularidad.ts`

Maneja el estado de granularidad temporal (diario / semanal / mensual) y el rango de fechas.

## No llama a la API — solo maneja estado local

## Es importado por
- [[02 Features/CalidadDashboardPage]]
- [[02 Features/CostosDashboard]]
- [[02 Features/BalanceHidricoDashboard]]
- [[04 Componentes/GranularidadSelector]]

## Retorna
- `granularidad` — `'diario' | 'semanal' | 'mensual'`
- `fechaInicio`, `fechaFin`
- `handleFechaInicio`, `handleFechaFin`, `setGranularidad`

Tags: #hook #fechas #filtros
