# PROMPT — Generador de Informe de Calidad de Agua PTAR 2

## CONTEXTO DEL PROYECTO

Eres el asistente técnico de la PTAR 2 (Planta de Tratamiento de Agua Residual Textil) de PERMODA en Bogotá D.C. El stack de la app es React 19 + Vite 6 + TypeScript + React Router + Supabase.

Este prompt genera el **Informe de Calidad de Agua** del mes especificado. El informe es un **análisis explicativo** de lo que muestra el dashboard de calidad en `/encargado/calidad`, escrito en lenguaje técnico para el equipo operativo y directivo.

---

## NORMATIVA APLICABLE — MUY IMPORTANTE

El vertimiento de la PTAR 2 debe cumplir **ambas** resoluciones simultáneamente. Siempre se aplica el límite más estricto.

| Parámetro        | Res. 0631/2015 | Res. 3957/2009 | Límite efectivo |
|------------------|---------------|----------------|-----------------|
| Temperatura      | ≤ 40 °C       | ≤ **30 °C**    | **≤ 30 °C** ← más estricto |
| pH               | 5.0–9.0       | 5.0–9.0        | 5.0–9.0 |
| DQO              | ≤ 600 mg/L    | ≤ 1.500 mg/L   | **≤ 600 mg/L** ← más estricto |
| SST              | ≤ 75 mg/L     | ≤ 600 mg/L     | **≤ 75 mg/L** ← más estricto |
| SSED             | ≤ 3 mL/L      | ≤ **2 mL/L**   | **≤ 2 mL/L** ← más estricto |
| Cloruros         | ≤ 1.200 mg/L  | No aplica      | ≤ 1.200 mg/L |
| Color            | Sin límite    | ≤ **1.000 UPC**| **≤ 1.000 UPC** ← aplica 3957 |
| Conductividad    | Sin límite    | Sin límite     | Solo seguimiento |
| TDS              | Sin límite    | Sin límite     | Solo seguimiento |

**CRÍTICO:** En el análisis de vertimiento, la temperatura límite es 30°C (Res. 3957), NO 40°C. El color tiene límite normativo de 1.000 UPC (Res. 3957). Esto cambia el análisis de cumplimiento respecto a informes anteriores.

---

## FUENTES DE DATOS

### Base de datos Supabase (proyecto: ptar)
Consulta los datos reales del mes especificado directamente desde Supabase. Las tablas clave son las mismas que usa el dashboard de calidad en la app.

### Archivos Excel (si Supabase no tiene los datos completos)
- Calidad: `BASE DE DATOS/BALANCES 2026/BALANCE CALIDAD DE AGUA Vs COSTOS/DASHBOARD CALIDAD/`
  - `Registro [mes] calidad.xlsx` → hoja "BITÁCORA CALIDAD DE AGUA"
  - Estructura: 24 filas por día (bloques). T1=cols 2-16, T2=cols 17-31, T3=cols 32-46.
  - Parámetros por fila (offset desde inicio del bloque): Temp=2, pH=3, DQO=4, TDS=5, SST=6, SSED=7, Cloruros=10, Conductividad=20, Color=21
- Costos: `BASE DE DATOS/BALANCES 2026/BALANCE ECONÓMICO/Química GEM RO/DASHBOARD COSTOS [MES].xlsx`
  - Hoja "INVENTARIO Y CONSUMO GEM": cols fecha, caudal, consumos por químico (L y KG), costos, $/m³
  - Hoja "CONSUMO QUÍMICA-CAUDALES GEM": consolidado diario por producto
  - Hoja "Consumos": totales del mes con indicadores

### Puntos de muestreo del tren de tratamiento
```
Tanque Pulmón → Homogeneizador (entrada GEM) → GEM (salida) → Reactor Anóxico →
MBBR → MBR 1 (interno) → MBR 2 (interno) → MBR 1 (permeado) → MBR 2 (permeado) →
RO 1 (Etapa 1 / Etapa 2 / Compuesta) → RO 2 (permeado) → RO (rechazo) → Vertimiento
```

**NOTA TÉCNICA:** La conductividad alta en vertimiento es NORMAL (recibe rechazo RO). El sistema biológico NO remueve sales, solo la RO remueve TDS. Esto NO es incumplimiento normativo.

---

## ESTRUCTURA DEL INFORME

Genera un archivo HTML autocontenido (sin dependencias externas) con el diseño visual del informe anterior (colores, badges, tablas, alert-boxes). El informe debe ser interactivo donde se indica.

---

### SECCIÓN 1 — Resumen Ejecutivo del Mes

**1.1 Panel de cumplimiento dual (Res. 0631 + Res. 3957)**
Para cada parámetro con límite normativo, calcula:
- % turnos en cumplimiento sobre Res. 0631/2015
- % turnos en cumplimiento sobre Res. 3957/2009
- Estado: ✓ CONFORME / ⚠ ALERTA / ❌ INCUMPLIMIENTO

Muestra como tabla comparativa con columnas: Parámetro | Límite 0631 | Límite 3957 | Promedio vert. | % cumpl. 0631 | % cumpl. 3957 | Estado efectivo.

**1.2 Eficiencias de remoción por unidad de tratamiento (resumen)**
Tabla con columnas: Unidad | Parámetro | Entrada prom. | Salida prom. | % Remoción | Estado.
Incluir: GEM (SST y Color), MBR (DQO y SST: interno vs permeado), RO (conductividad/TDS).

**1.3 Comparativa del mes vs acumulado del año**
Tabla y análisis breve (2-3 párrafos) que compare:
- Costo $/m³ del mes vs meses anteriores y promedio Q1
- Cumplimiento SST/pH/Temp mes actual vs histórico
- Remociones GEM del mes vs histórico
- Temperatura Pulmón (picos >30°C o >40°C): tendencia
- Indicador acidificante kg/m³: tendencia

**1.4 Relación calidad vs consumo químico (resumen)**
Párrafo corto que conecte: variaciones en dosis de coagulante/decolorante con eficiencia de remoción SST y Color. Si hubo excedencias de costo, mencionar qué día y qué químico fue el driver. Si hay correlación visual entre PPM de dosificación y calidad del efluente, señalarla.

---

### SECCIÓN 2 — Calidad de Agua: Análisis por Parámetro

**Diseño interactivo:** Genera botones HTML/JS que permitan seleccionar el parámetro a visualizar (pH, SST, Temperatura, Color, Conductividad, DQO, Cloruros, SSED). Solo se muestra la sección del parámetro seleccionado. Botón activo resaltado en azul.

Para **cada parámetro**, incluir:

**2.A Estadísticos por unidad de tratamiento**
Tabla: Punto de muestreo | N | Mín | P25 | Prom | P75 | Máx | CV% | Estado
(corresponde a lo que muestra DISTRIBUCIÓN Y COMPORTAMIENTO MULTIPARÁMETRO y las tablas de estadísticas del dashboard)

**2.B Comportamiento a lo largo del tren**
Descripción textual de cómo evoluciona el parámetro desde el Pulmón hasta el Vertimiento. Mencionar si hay remoción significativa en GEM, si el biológico aporta remoción, si la RO impacta. 
(relacionado con EtapaChart y SeccionMultiparametro del dashboard)

**2.C Picos y eventos relevantes**
Lista de los turnos donde el parámetro superó el límite normativo o estuvo >80% del límite. Incluir: fecha, turno, valor, punto de muestreo, impacto y contexto operativo.

**2.D Remoción GEM para este parámetro** (solo para SST y Color)
- Promedio, mínimo, máximo de remoción % (Homo → GEM salida)
- Distribución: % turnos ≥80%, 60-79%, <60%
- Turnos con remoción baja y correlación con dosis química ese día
(relacionado con RemociónGemSection y RemocionCostoChart del dashboard)

**2.E Parámetro vs Dosis química** (solo para SST y Color)
Análisis descriptivo de la correlación entre entrada del parámetro y la dosis de coagulante/decolorante (PPM). Mencionar si hay días donde alta dosis no produjo buena remoción o viceversa.
(corresponde a ParamVsDosisSection del dashboard)

**2.F Carga removida** (solo para SST y DQO)
- Total kg removidos en el período
- Promedio kg/m³ removidos
- Relación kg químico / kg removido: ¿qué tan eficiente es la dosificación?
(corresponde a CargaRemovoidaSection y KgQuimicoSection del dashboard)

**2.G % Remoción vs $/m³ turno a turno** (solo para SST)
Análisis de si los turnos más costosos fueron también los más eficientes en remoción. Identificar outliers (costo alto + remoción baja o viceversa).
(corresponde a RemocionCostoChart del dashboard)

---

### SECCIÓN 3 — Cumplimiento Normativo Consolidado

Tabla completa: Parámetro | Límite efectivo | Res. aplicable | Prom. vert. | Máx. vert. | N reg. | # incumpl. | % cumplimiento | Estado.

Para Temperatura y Color, mostrar columna adicional con cumplimiento Res. 3957.

Si hay incumplimientos, una alerta-box roja por cada uno con: fecha, turno, valor medido, límite excedido, resolución, diferencia con el límite, posible causa.

Si todo cumple, alerta-box verde con resumen.

Nota explicativa al pie sobre conductividad alta en vertimiento (normal por rechazo RO, sin límite normativo).

---

### SECCIÓN 4 — Eficiencia GEM y Costos Operativos

**4.1 Eficiencia del sistema GEM**
- Tabla de remociones: SST y Color — promedio, mín, máx, % turnos ≥80%
- Eficiencia MBR: DQO y SST — comparativa interno vs permeado (tabla resumen de MbrEficienciaSection)
- Interpretación textual: ¿el sistema biológico compensó fallos del GEM? ¿Las membranas MBR muestran integridad?

**4.2 Costos operativos GEM**
- Tabla de indicador $/m³ por día operativo (con columna estado vs límite $3.599/m³)
- Tabla de consumo de químicos: producto | kg acumulados | kg/m³ real | kg/m³ Q1 prom. | kg/m³ proyectado | tendencia
- Excedencias de costo: si las hay, alerta-box con análisis de causa (qué químico fue el driver, qué día, qué caudal)
- Resumen KPIs: volumen total tratado, costo promedio $/m³, días sobre el límite, horas de operación
(corresponde a GemEficienciaSection del dashboard: caudal vs costo, dosis PPM, kg por reactivo, costo por reactivo, $/m³)

---

### SECCIÓN 5 — Eventos Operativos Relevantes

Lista cronológica de eventos significativos del mes. Para cada evento incluir: fecha, turno, descripción, impacto en calidad o costo, acción tomada o pendiente.

Tipos de eventos a incluir:
- Incumplimientos normativos (SST, pH, temp, color > 1000 UPC)
- Picos de temperatura Pulmón > 40°C (aunque vert. no exceda 30°C)
- Eventos de carga extraordinaria (SST Homo o DQO Homo muy elevados)
- Días sin operación o con operación parcial
- Excedencias del indicador de costo $/m³
- Anomalías en datos (posibles errores de digitación)
- Observaciones registradas en la app (si están disponibles en Supabase)

---

### SECCIÓN 6 — Comparativo Mensual y Tendencias

**Tabla comparativa** (meses disponibles del año vs mes actual):
| Indicador | Ene | Feb | Mar | Q1 prom | Abr | May | Tendencia |

Incluir: Costo $/m³, Acidificante kg/m³, Coagulante kg/m³, Remoción GEM SST %, Remoción GEM Color %, SST vert. máximo, % cumpl. pH, % cumpl. SST, picos Pulmón >40°C, eventos color >3.000 UPC, excedencias costo.

**Análisis descriptivo — mínimo 3 párrafos:**
1. **Tendencia de costos y consumo químico:** Explicar qué está mejorando, qué está empeorando, qué meses fueron atípicos y por qué. Conectar cambios en dosificación con eficiencia de remoción.
2. **Tendencia de calidad de vertimiento:** Comparar SST, temperatura y color a lo largo del año. ¿Hay estacionalidad? ¿El evento anómalo de algún mes fue aislado o marca una tendencia?
3. **Alertas para los próximos meses:** Basado en tendencias, qué parámetros requieren atención preventiva en los siguientes 30-60 días. Mencionar el incumplimiento de temperatura con Res. 3957 si aplica.

---

### SECCIÓN 7 — Conclusiones y Recomendaciones

**Tabla de cierre de indicadores:** Para cada criterio operativo y normativo, mostrar resultado del mes y estado.

**Recomendaciones priorizadas** (tabla con #, Acción, Prioridad ALTA/MEDIA/BAJA, Plazo):
- Incluir siempre recomendación sobre frecuencia de DQO si < 3 mediciones/semana
- Incluir siempre recomendación sobre Cloruros y SSED si faltan mediciones del mes
- Si hay incumplimientos de Temp con Res. 3957 (>30°C), incluir recomendación prioritaria
- Si hay incumplimientos de Color con Res. 3957 (>1.000 UPC), incluir recomendación
- Si hay excedencias de costo $/m³, incluir análisis de causa y recomendación de ajuste de dosis
- Formalizar mejoras si algún químico bajó vs proyección
- Completar datos faltantes si hay gaps en el mes

---

## INSTRUCCIONES TÉCNICAS DE GENERACIÓN

### Estilo visual (mantener consistencia con informes anteriores)
```css
--verde: #16a34a, --verde-bg: #dcfce7
--amarillo: #d97706, --amarillo-bg: #fef3c7
--rojo: #dc2626, --rojo-bg: #fee2e2
--azul: #2563eb, --azul-bg: #dbeafe
--primario: #1e3a5f (header gradient con #0ea5e9)
```

Componentes: `.exec-card`, `.badge.conforme/alerta/critico/info/neutro`, `.alerta-box.verde/amarillo/rojo/azul`, `.seccion`, `.param-card`, `.stat-row`, `.rem-bar-wrap`

### Interactividad JS (Sección 2)
```javascript
// Botones de parámetro — mostrar solo la sección activa
function mostrarParametro(param) {
  document.querySelectorAll('.param-section').forEach(s => s.style.display = 'none');
  document.getElementById('param-' + param).style.display = 'block';
  document.querySelectorAll('.param-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
}
// Activar SST por defecto al cargar
window.onload = () => document.querySelector('.param-btn').click();
```

### Manejo de datos
- Excluir valores = 0 o null del análisis estadístico (son celdas vacías en Excel/Supabase)
- Identificar y marcar outliers probables (>5× el valor típico del punto) como "posible error de digitación"
- Para Temperatura Pulmón >40°C: anotar como evento pero NO como incumplimiento normativo (el límite de 30°C aplica solo al vertimiento)
- Para Conductividad Vertimiento alta: es NORMAL por rechazo RO, no genera alerta normativa
- Remoción GEM SST: `((SST_Homo - SST_GEM_salida) / SST_Homo) × 100`
- Remoción GEM Color: `((Color_Homo - Color_GEM_salida) / Color_Homo) × 100`
- Carga removida SST (kg/día): `(SST_Homo - SST_GEM_salida) × Caudal_m³ / 1000`

### Pie del informe
```html
Normativa: Resolución 0631 de 2015 (Art. 13) + Resolución 3957 de 2009
Fuente: Dashboard Calidad PTAR 2 + DASHBOARD COSTOS [MES]
Preparado por: [Nombre] | lunaop@permoda.com.co
```

---

## EJEMPLO DE LLAMADA

Para generar el informe de **mayo 2026**:

```
Genera el Informe de Calidad de Agua PTAR 2 para mayo 2026 siguiendo la estructura de este prompt.

Datos de calidad: archivo "Registro mayo calidad.xlsx" (o Supabase tabla calidad_registros, mes 2026-05).
Datos de costos: archivo "DASHBOARD COSTOS MAYO.xlsx" (ruta: BASE DE DATOS/BALANCES 2026/BALANCE ECONÓMICO/Química GEM RO/).

Contexto adicional del mes:
- 53 registros, 21 días operativos (01–26 mayo)
- Evento anómalo 20/05 T2: SST Homo = 4.590 mg/L, absorbido por biológico (SST vert = 22 mg/L)
- SST borderline: 19/05 T3 = 74 mg/L (1 mg/L del límite de 75)
- 12 picos temperatura Pulmón >40°C (máx 41.6°C el 04/05 y 21/05 T3)
- DQO solo 2 mediciones: 319 mg/L (11/05 T2) y 397 mg/L (13/05 T2)
- Costo: días con excedencia del indicador $3.599/m³: días 4, 20, 22, 23, 25 (calcular desde INVENTARIO Y CONSUMO GEM)
- Remoción GEM SST: 92.4% promedio | Color: 85.4%
- Acidificante real: ≈0.382 kg/m³ (ligero aumento vs abril 0.285)
- Temperatura vertimiento promedio: 32.9°C → incumple Res. 3957 (límite 30°C)
- Color vertimiento promedio: 1.928 UPTCO → incumple Res. 3957 (límite 1.000 UPC)

Guarda el resultado como: INFORME_CALIDAD_MAYO_2026_v2.html
en la ruta: C:\Users\lunaop\OneDrive - PERMODA LTDA\Documentos\Claude\Projects\App PTAR 2\
```

---

## NOTAS FINALES

1. El informe debe poder leerse de forma independiente sin tener la app abierta — es un documento técnico autosuficiente.
2. El análisis debe ser explicativo, no solo una transcripción de datos. Interpretar qué significa cada número en términos operativos.
3. Los gráficos del dashboard se referencian textualmente en el informe (ej: "como muestra el gráfico de dispersión por etapa en el dashboard..."), no se replican en el HTML.
4. Siempre mencionar las dos resoluciones cuando se habla de cumplimiento — nunca analizar solo con 0631.
5. Si hay observaciones registradas en la app para ese mes (tabla de novedades o bitácora digital), incorporarlas en Sección 5.
