# FormatoCalidad
`src/features/operario/FormatoCalidad.tsx`

Formulario de registro de parámetros físico-químicos del agua (22 parámetros, 16 unidades).

## Importa a
- [[03 Servicios y Hooks/ptarClient]] — POST calidad

## Es importado por
- [[01 Núcleo/Router]] — ruta `/operario/formato/calidad`

## Flujo de datos
```
Operario/laboratorio ingresa valores por unidad de tratamiento
→ POST /calidad → MySQL ptar_registro_calidad
```

Tags: #feature #operario #calidad #formulario
