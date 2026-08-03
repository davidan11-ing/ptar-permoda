# Contexto del proyecto PTAR 2 — Bogotá

## 1. Descripción del sistema

Se trata de una **Planta de Tratamiento de Agua Residual (PTAR 2)** de una empresa textil en Bogotá. El sistema trata aguas residuales del proceso de tintorería y lavandería para su recirculación interna.

### Tren de tratamiento (en orden)
1. **Tanque Pulmón** — recibe el agua residual cruda del proceso textil
2. **Tanque Homogeneizador** — homogeniza el influente antes de entrar al GEM; es el punto de entrada al sistema de tratamiento principal
3. **GEM (Sistema de coagulación-floculación)** — punto de dosificación de químicos; produce la salida que alimenta el sistema biológico
4. **Reactor Anóxico** — desnitrificación
5. **Reactor MBBR** — biomasa en soportes
6. **Reactor MBR 1 y MBR 2 (interno)** — licor mezcla con alta concentración de biomasa (9.000–15.000 mg/L SST, valor normal)
7. **Reactor MBR 1 y MBR 2 (permeado)** — salida filtrada de las membranas; debe ser de baja carga para alimentar la RO
8. **Ósmosis Inversa (RO)** — única etapa que remueve sales/TDS; permeado va a recirculación, rechazo va al vertimiento
9. **PTAP** — planta de tratamiento de agua potable interna
10. **Vertimiento** — punto de descarga final; recibe también el rechazo de la RO, por lo que la conductividad alta en este punto es normal y esperada

### Notas importantes del sistema
- El sistema biológico (Anóxico, MBBR, MBR) **no está diseñado para remover sales/conductividad**
- La **RO es la única etapa de remoción de TDS**
- El rechazo de la RO va al vertimiento, por eso la conductividad alta allí no es incumplimiento normativo
- La idea final es **recircular el agua tratada** al proceso productivo
- Hay datos de **RO1 (Compuesta, Etapa 1, Etapa 2)** y **RO2** pendientes de digitalizar (están en fotos, no en la tabla de datos)

---

## 2. Sistema de registro de datos

### Hoja: BITACORA CALIDAD DE AGUA
- Formato matricial: **filas = parámetros**, **columnas = unidades de tratamiento × 3 turnos**
- **Turno 1:** 10 PM – 6 AM
- **Turno 2:** 6 AM – 2 PM
- **Turno 3:** 2 PM – 10 PM
- Equipos de laboratorio: reactivos Hach, espectrofotómetro, termoreactor, multiparámetro, titulación, gravimétrico

### Hoja: TABLA DATOS 1
Formato plano con columnas:
```
DATO | FECHA | PARÁMETRO | TURNO | TANQUE PULMÓN | TANQUE HOMOGENEIZADOR (ENTRADA GEM) | GEM (SALIDA) | REACTOR ANÓXICO | REACTOR MBBR | REACTOR MBR 1 (INTERNO) | REACTOR MBR 2 (INTERNO) | REACTOR MBR 1 (PERMEADO) | REACTOR MBR 2 (PERMEADO) | VERTIMIENTO | RO 1 (COMPUESTA) | RO 1 (ETAPA 1) | RO 1 (ETAPA 2) | RO 2 (PERMEADO) | RO (RECHAZO) | COSTO DE TRATAMIENTO | ADICIONAL 1 | ADICIONAL 2
```
- 21 parámetros × 3 turnos = 63 filas por día
- Columnas adicionales al final: `Actual T7` y `ACTUAL T9`

### Hoja: DASHBOARD
- Análisis estadístico con distribución de frecuencias en 5 rangos (mín–máx)
- Gráfico de % remoción sistema GEM (entrada Homo. vs salida GEM + línea % remoción)
- Gráfico % remoción vs $costo/m³
- Gráfico entrada vs salida vs dosis PPM por químico (filtrable por: ácido, coagulante, decolorante, pol. aniónico, pol. catiónico)
- Gráfico Kg removidos/día (DQO o SST) + indicador Kg/m³
- Gráfico Kg de químico / Kg removido (barras apiladas por químico)

---

## 3. Parámetros monitoreados

| Parámetro | Unidad | Límite vertimiento (Res. 0631/2015 Art. 13 + Res. 3759/2009) |
|---|---|---|
| Temperatura | °C | ≤ 40°C |
| pH | Unidades de pH | 5,0 – 9,0 |
| DQO | mg/L | ≤ 600 mg/L |
| SST (Sólidos Suspendidos Totales) | mg/L | ≤ 75 mg/L |
| Sólidos Sedimentables | mL/L | ≤ 3 mL/L |
| Cloruros | mg/L | ≤ 1.200 mg/L |
| TDS / Conductividad | µS/cm | Sin límite normativo (alto en vertimiento es esperado por rechazo RO) |
| Color | UPTCO | Sin límite numérico (no aplica en el análisis) |
| SST Gravimétrico | mg/L | Complementario |
| Hierro, Fósforo, Nitrógeno, Sulfatos, Sílice, ORP, Cloro residual, Turbidez, Alcalinidad, Dureza | Varios | Sin datos registrados en Q1 2026 |

---

## 4. Sistema de dosificación química

| Código | Químico | Función principal |
|---|---|---|
| COF 280 | Acidificante | Ajuste de pH en Tanque Pulmón |
| COF 235 | Coagulante | Remoción de SST y color |
| COF 255 | Decolorante | Remoción de colorantes textiles |
| COF 440 | Polímero Aniónico | Floculación |
| COF 494 | Polímero Catiónico | Floculación |
| — | Hipoclorito de sodio | Desinfección |
| — | Soda cáustica | Ajuste alcalinidad |
| — | Antincrustante RO | Protección membranas RO |
| — | Biodispersante RO | Protección membranas RO |
| — | CIP ácido / alcalino RO | Limpieza membranas RO |

### Correlaciones clave identificadas
- **pH Pulmón alto → mayor dosis de ácido** (correlación positiva confirmada)
- **Color/SST entrada alta → mayor dosis coagulante/decolorante**
- **Picos de PPM al arranque** después de días sin operación
- **Acidificante supera proyección** en los 3 meses de Q1 (influente textil más alcalino de lo proyectado)

---

## 5. Datos disponibles por período

### Marzo 2026 (datos más completos)
- Calidad de agua: TABLA DATOS 1 completa (filas 1–1953)
- Costos turno a turno: 93 registros
- Balance hídrico: imágenes del informe PTAR 2

### Febrero 2026
- Costos turno a turno: 87 registros
- Balance hídrico: imágenes del informe PTAR 2
- Calidad de agua: pendiente

### Enero 2026
- Costos turno a turno: 93 registros corregidos
- Balance hídrico: imágenes del informe PTAR 2
- Calidad de agua: pendiente

---

## 6. Indicadores operativos Q1 2026

### Costos GEM

| Mes | Volumen (m³) | Costo $/m³ | Horas op. | Consolidado química | Indicador límite |
|---|---|---|---|---|---|
| Enero | 29.325 | $3.043 | 331 | $121.294.254 | $3.599 |
| Febrero | 30.080 | $3.240 | 376 | $97.449.928 | $3.599 |
| Marzo | 32.829 | $3.119 | 410 | $102.401.074 | $3.599 |
| **Q1 Total** | **92.234** | **$3.134 prom.** | **1.117** | **$320.769.256** | |

> Los tres meses se mantuvieron por debajo del indicador límite de $3.599/m³.

### Consumo de químicos Q1

| Químico | Enero kg | Feb kg | Mar kg | Total Q1 |
|---|---|---|---|---|
| Decolorante | 4.513 | 4.513 | 5.888 | 14.914 |
| Coagulante | 21.213 | 17.199 | 15.715 | 54.127 |
| Acidificante | 9.620 | 10.673 | 12.480 | 32.773 |
| Pol. Aniónico | 145 | 165 | 168 | 478 |
| Pol. Catiónico | 295 | 325 | 340 | 960 |

> **Tendencia preocupante:** el acidificante aumentó de 9.620 kg en enero a 12.480 kg en marzo (+29,7%), superando la proyección en los tres meses. Recomendación: revisar dosis base del Plan Maestro para Q2.

---

## 7. Balance hídrico Q1 2026

### Fuentes de abastecimiento (objetivo: maximizar internas, minimizar externas)

| Fuente | Tipo | Enero m³ | Feb m³ | Mar m³ |
|---|---|---|---|---|
| Acueducto | **Externa** | 9.944 (36,52%) | 10.099 (38,83%) | 10.521 (34,44%) |
| Carrotanques | **Externa** | 180 (0,66%) | 208 (1,18%) | **0 (0,00%)** |
| Osmosis Inversa RO | **Interna** | 11.443 (42,03%) | 11.281 (43,15%) | 14.663 (47,99%) |
| PTAP | **Interna** | 5.662 (20,79%) | 4.456 (17,04%) | 5.368 (17,57%) |
| **Total** | | **27.229** | **26.144** | **30.552** |

> **Hito marzo:** cero carrotanques — primera vez en el año con autosuficiencia hídrica total.

### Proyección Plan Maestro 2026

| Fuente | % Plan Maestro | Ene proyectado | Feb proyectado | Mar proyectado |
|---|---|---|---|---|
| Acueducto | 36,52% | 9.944 | 9.766 | 9.266 |
| Carrotanques | 0,66% | 175 | 166 | 166 |
| RO PTAR | 42,03% | 11.175 | 10.664 | 10.664 |
| PTAP | 20,79% | 5.527 | 5.275 | 5.275 |
| Total | | 26.587 | 25.372 | 25.372 |

### Indicadores de proceso por área

| Área | Indicador | Enero | Febrero | Marzo | Proyección | Benchmark mundial |
|---|---|---|---|---|---|---|
| Tintorería | L/kg tela | 52,0 | 42,6 | 51,9 | 60,0 | Best Practice: 50–80 L/kg |
| Lavandería | L/und efectiva | 45,5 | 42,6 | 46,8 | 34,0 | Best Practice: 40–70 L/u.e. |

> Nota lavandería: supera la proyección interna (34 L/u.e.) pero cumple el benchmark mundial Best Practice. Se recomienda revisar la viabilidad de la meta proyectada.

---

## 8. Eventos operativos relevantes Q1 2026

| Fecha | Evento | Impacto |
|---|---|---|
| 13/01 | Lavado membranas MBR2, cloro en tanque permeado | Solicitud carrotanques, RO sin operar 2 turnos |
| 20/01 | Taponamiento Swingmill | Parada sistema GEM |
| 18–19/02 | Falla bomba ultrafiltración | Proceso inhabilitado |
| 20–21/02 | Falla bomba alimentación OI | Sistema RO fuera de servicio |
| 24/02 | Instalación nueva bomba OI | Restablecimiento sistema |
| 25–27/02 | Baja eficiencia PTAP + estabilización RO | Solicitud carrotanques |
| 01/03 | CIP sistema RO (segundo CIP tras falla feb) | Mejora presiones y caudales |
| 24/03 | Falla bomba pozo | Reducción aporte PTAP |
| 28/03 | CIP sistema RO | Disminuye envío de agua |
| 28–31/03 | Semana Santa | Parada producción, consumos mínimos |

---

## 9. Análisis de calidad de agua — Marzo 2026

### Parámetros con datos disponibles
- **Completos (todos los turnos):** Temperatura, pH, TDS/Conductividad, SST, Color
- **Periódicos (no todos los turnos):** DQO (solo turno 2 en días específicos), Sólidos Sedimentables, Cloruros
- **Sin datos:** Hierro, SST Gravimétrico, Fósforo, Nitrógeno, Sulfatos, Sílice, ORP, Cloro residual, Turbidez

### Hallazgos principales marzo 2026

**pH:**
- Tanque Pulmón: rango 5,89–11,43 u.pH (alta variabilidad, CV alto)
- Vertimiento: dentro del límite 5–9 en todos los registros disponibles
- Correlación confirmada: pH Pulmón alto → mayor dosificación de ácido

**SST:**
- GEM salida: siempre por debajo de 75 mg/L (límite normativo) ✓
- MBR permeados: 1–7 mg/L (membranas íntegras)
- Reactores internos MBR: 9.000–15.000 mg/L (normal en sistema MBR)

**Color:**
- Alta variabilidad en Pulmón y Homo. (CV > 40%)
- Evento crítico 13/03 T1: vertimiento 14.940 UPTCO — posible falla o bypass puntual
- Evento 28/03: pico extremo Pulmón 12.819 UPTCO

**DQO:**
- Solo 7 mediciones en el mes (turno 2)
- Remoción GEM: 50–66%
- Vertimiento: siempre por debajo de 600 mg/L ✓
- Recomendación: aumentar frecuencia de muestreo

**Conductividad:**
- Vertimiento alto (> 8.000 µS/cm promedio) — esperado por rechazo RO, no es incumplimiento
- GEM no remueve sales — normal
- Solo la RO puede reducir TDS

**SST sistema biológico:**
- Anóxico: 1.000–4.000 mg/L (normal)
- MBR interno: 9.000–15.000 mg/L (normal para sistema MBR de alta carga)
- Permeados MBR: < 10 mg/L (membranas funcionando bien)

---

## 10. Normativa aplicable

- **Resolución 0631 de 2015, Artículo 13** — industria textil (vertimiento a cuerpo de agua)
- **Resolución 3759 de 2009** — criterios adicionales de seguimiento

---

## 11. Pendientes identificados

1. **Datos de calidad de agua enero y febrero** — no digitalizados aún
2. **Datos RO** (RO1 compuesta, etapa 1, etapa 2, RO2 permeado y rechazo) — están en fotos, pendiente de digitalizar
3. **Balance hídrico comparativo Q1** — informes mensuales listos, falta integrar en un solo artefacto comparativo
4. **Informe de calidad de agua** — se tiene marzo completo; enero y febrero pendientes
5. **Análisis comparativo de calidad entre meses** — requiere datos enero y febrero
6. **Revisión dosis base Plan Maestro** — especialmente acidificante (0,308 kg/m³ proyectado vs ~0,38 real en marzo)

---

## 12. Artefactos generados en esta conversación

| Artefacto | Descripción |
|---|---|
| `informe_profundo` | Análisis profundo de calidad de agua marzo 2026 por parámetro: tren de tratamiento, sistema biológico, picos y eventos, remociones GEM, correlación con dosis |
| `informe_corporativo` | Informe corporativo Q1 2026: resumen ejecutivo, panorama operativo, consumo químico, tendencias — enero a marzo |
| `balance_hidrico` | Balance hídrico Q1 2026: fuentes de abastecimiento, indicadores por área (tintorería y lavandería), tendencias |
| Correos enero/feb/mar | Textos de correo ejecutivo integrando los 3 balances por mes |

---

## 13. Glosario

| Término | Significado |
|---|---|
| GEM | Sistema de coagulación-floculación (etapa química principal) |
| MBR | Membrane Bioreactor — reactor biológico con membranas |
| MBBR | Moving Bed Biofilm Reactor |
| RO | Reverse Osmosis — Ósmosis Inversa |
| PTAP | Planta de Tratamiento de Agua Potable (interna) |
| CIP | Clean In Place — limpieza química de membranas in situ |
| CEB | Chemically Enhanced Backwash — retrolavado químico |
| TDS | Total Dissolved Solids — Sólidos Disueltos Totales |
| PPM | Partes por millón (equivalente a mg/L en agua) |
| CV | Coeficiente de Variación = (Desv. Est. / Media) × 100 |
| Homo. | Tanque Homogeneizador |
| SST | Sólidos Suspendidos Totales |
| DQO | Demanda Química de Oxígeno |
| L/kg | Litros de agua por kilogramo de tela (indicador tintorería) |
| L/u.e. | Litros por unidad efectiva (indicador lavandería) |
| Q1 | Primer trimestre (enero–marzo) |
