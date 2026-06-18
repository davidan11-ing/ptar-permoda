# FormatoCaudales
`src/features/operario/FormatoCaudales.tsx`

Formulario de registro de lecturas de los 35 contadores por turno.

## Importa a
- [[03 Servicios y Hooks/ptarClient]] — POST caudales
- `ContadorCard` — tarjeta por cada contador

## Es importado por
- [[01 Núcleo/Router]] — ruta `/operario/formato/caudales`

## Flujo de datos
```
Operario ingresa lectura actual + anterior
→ sistema calcula delta_m³
→ POST /caudales → MySQL ptar_registro_contadores
```

Tags: #feature #operario #caudales #formulario
