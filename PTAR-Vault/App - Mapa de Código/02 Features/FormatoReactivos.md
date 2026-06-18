# FormatoReactivos
`src/features/operario/FormatoReactivos.tsx`

Formulario de registro de niveles y consumo de los 5 reactivos químicos.

## Importa a
- [[03 Servicios y Hooks/ptarClient]] — POST reactivos

## Es importado por
- [[01 Núcleo/Router]] — ruta `/operario/formato/reactivos`

## Flujo de datos
```
Operario ingresa nivel % y consumo L
→ POST /reactivos → MySQL ptar_registro_costos
```

Tags: #feature #operario #reactivos #formulario
