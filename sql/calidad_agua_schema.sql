-- =====================================================================
--  Calidad de Agua — Esquema (extensión)
--  BD: ptar_permoda
--
--  La tabla base medicion_calidad ya existe en formato LONG:
--     id | fecha | turno | parametro_id | unidad_id | valor | observacion
--
--  Este script:
--    1. Ajusta el catalogo parametro_calidad (separa Dureza Total vs Calcica)
--    2. Crea 3 vistas de consulta:
--         v_tabla_datos_1            — pivot ancho como la hoja Excel
--         v_calidad_estadisticas     — min/max/avg/stddev por mes
--         v_calidad_remociones       — % remocion entre puntos clave
-- =====================================================================

USE ptar_permoda;

-- ---------------------------------------------------------------------
-- 1. AJUSTE CATALOGO parametro_calidad
--    El Excel distingue Dureza Calcica vs Dureza Total.
-- ---------------------------------------------------------------------

-- Renombra "DUR" -> "DUR_TOT" si todavia no se ha hecho
UPDATE parametro_calidad
   SET codigo = 'DUR_TOT', nombre = 'Dureza Total'
 WHERE codigo = 'DUR';

-- Inserta Dureza Calcica si falta
INSERT IGNORE INTO parametro_calidad (codigo, nombre, unidad, notas)
VALUES ('DUR_CA', 'Dureza Calcica', 'mg/L CaCO3', NULL);


-- ---------------------------------------------------------------------
-- 2. VIEW: v_tabla_datos_1
--    Replica la hoja "Tabla datos 1" del Excel: una fila por
--    (fecha, turno, parametro) y una columna por cada unidad de
--    tratamiento (PULMON ... RO_RECHAZO). NULL si no hubo medicion.
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS v_tabla_datos_1;

CREATE VIEW v_tabla_datos_1 AS
SELECT
    m.fecha,
    m.turno,
    p.codigo                                                          AS parametro_codigo,
    p.nombre                                                          AS parametro,
    p.unidad                                                          AS parametro_unidad,
    -- 15 unidades del tren de tratamiento (orden_tren 1..15)
    MAX(CASE WHEN u.codigo = 'PULMON'      THEN m.valor END)          AS pulmon,
    MAX(CASE WHEN u.codigo = 'HOMO'        THEN m.valor END)          AS homogeneizador,
    MAX(CASE WHEN u.codigo = 'GEM_SAL'     THEN m.valor END)          AS gem_salida,
    MAX(CASE WHEN u.codigo = 'ANOXICO'     THEN m.valor END)          AS anoxico,
    MAX(CASE WHEN u.codigo = 'MBBR'        THEN m.valor END)          AS mbbr,
    MAX(CASE WHEN u.codigo = 'MBR1_INT'    THEN m.valor END)          AS mbr1_interno,
    MAX(CASE WHEN u.codigo = 'MBR2_INT'    THEN m.valor END)          AS mbr2_interno,
    MAX(CASE WHEN u.codigo = 'MBR1_PER'    THEN m.valor END)          AS mbr1_permeado,
    MAX(CASE WHEN u.codigo = 'MBR2_PER'    THEN m.valor END)          AS mbr2_permeado,
    MAX(CASE WHEN u.codigo = 'VERTIMIENTO' THEN m.valor END)          AS vertimiento,
    MAX(CASE WHEN u.codigo = 'RO1_COMP'    THEN m.valor END)          AS ro1_compuesta,
    MAX(CASE WHEN u.codigo = 'RO1_E1'      THEN m.valor END)          AS ro1_etapa1,
    MAX(CASE WHEN u.codigo = 'RO1_E2'      THEN m.valor END)          AS ro1_etapa2,
    MAX(CASE WHEN u.codigo = 'RO2_PER'     THEN m.valor END)          AS ro2_permeado,
    MAX(CASE WHEN u.codigo = 'RO_RECHAZO'  THEN m.valor END)          AS ro_rechazo
FROM medicion_calidad m
JOIN parametro_calidad   p ON p.id = m.parametro_id
JOIN unidad_tratamiento  u ON u.id = m.unidad_id
GROUP BY m.fecha, m.turno, p.codigo, p.nombre, p.unidad;


-- ---------------------------------------------------------------------
-- 3. VIEW: v_calidad_estadisticas
--    Estadisticos mensuales por (anio, mes, parametro, unidad):
--    cuenta de mediciones, min, max, promedio, desviacion estandar
--    y coeficiente de variacion (%).
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS v_calidad_estadisticas;

CREATE VIEW v_calidad_estadisticas AS
SELECT
    YEAR(m.fecha)                                                     AS anio,
    MONTH(m.fecha)                                                    AS mes,
    p.codigo                                                          AS parametro_codigo,
    p.nombre                                                          AS parametro,
    p.unidad                                                          AS parametro_unidad,
    u.codigo                                                          AS unidad_codigo,
    u.nombre                                                          AS unidad,
    u.orden_tren                                                      AS orden_tren,
    COUNT(m.valor)                                                    AS n_mediciones,
    ROUND(MIN(m.valor), 4)                                            AS minimo,
    ROUND(MAX(m.valor), 4)                                            AS maximo,
    ROUND(AVG(m.valor), 4)                                            AS promedio,
    ROUND(STDDEV_SAMP(m.valor), 4)                                    AS desv_estandar,
    CASE WHEN AVG(m.valor) <> 0
         THEN ROUND(STDDEV_SAMP(m.valor) / AVG(m.valor) * 100, 2)
         ELSE NULL
    END                                                               AS cv_pct,
    -- Limites normativos (si aplican; solo tiene sentido para Vertimiento)
    p.limite_vertimiento_min,
    p.limite_vertimiento_max,
    -- % de mediciones fuera de limites en Vertimiento
    CASE WHEN u.codigo = 'VERTIMIENTO' AND COUNT(m.valor) > 0
         THEN ROUND(
                100.0 *
                SUM(CASE
                        WHEN (p.limite_vertimiento_min IS NOT NULL AND m.valor < p.limite_vertimiento_min)
                          OR (p.limite_vertimiento_max IS NOT NULL AND m.valor > p.limite_vertimiento_max)
                        THEN 1 ELSE 0
                    END) / COUNT(m.valor),
              2)
         ELSE NULL
    END                                                               AS pct_fuera_limite_vert
FROM medicion_calidad m
JOIN parametro_calidad   p ON p.id = m.parametro_id
JOIN unidad_tratamiento  u ON u.id = m.unidad_id
WHERE m.valor IS NOT NULL
GROUP BY YEAR(m.fecha), MONTH(m.fecha),
         p.id, p.codigo, p.nombre, p.unidad,
         u.id, u.codigo, u.nombre, u.orden_tren,
         p.limite_vertimiento_min, p.limite_vertimiento_max;


-- ---------------------------------------------------------------------
-- 4. VIEW: v_calidad_remociones
--    % de remocion entre puntos clave del tren de tratamiento,
--    por (fecha, turno, parametro). Solo tiene sentido para
--    parametros donde el sistema biologico/quimico remueve carga
--    (DQO, SST, Color, etc.) — para pH/Temp/Cond este valor no es
--    un indicador de "eficiencia" en sentido estricto.
--
--    Remociones calculadas:
--      gem            : Pulmon -> GEM_SAL
--      biologico      : GEM_SAL -> MBR1_PER (promedio MBR1/MBR2 permeados)
--      ro             : MBR_PER -> RO1_COMP
--      global         : Pulmon -> Vertimiento
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS v_calidad_remociones;

CREATE VIEW v_calidad_remociones AS
SELECT
    t.fecha,
    t.turno,
    t.parametro_codigo,
    t.parametro,
    t.parametro_unidad,
    t.pulmon,
    t.homogeneizador,
    t.gem_salida,
    -- promedio de los dos MBR permeados (ignora NULLs)
    CASE
        WHEN t.mbr1_permeado IS NOT NULL AND t.mbr2_permeado IS NOT NULL
            THEN (t.mbr1_permeado + t.mbr2_permeado) / 2
        WHEN t.mbr1_permeado IS NOT NULL THEN t.mbr1_permeado
        WHEN t.mbr2_permeado IS NOT NULL THEN t.mbr2_permeado
        ELSE NULL
    END                                                               AS mbr_permeado_avg,
    t.ro1_compuesta,
    t.vertimiento,

    -- % remocion GEM (Pulmon -> GEM_SAL)
    CASE WHEN t.pulmon IS NOT NULL AND t.pulmon > 0 AND t.gem_salida IS NOT NULL
         THEN ROUND((t.pulmon - t.gem_salida) / t.pulmon * 100, 2)
         ELSE NULL
    END                                                               AS pct_remocion_gem,

    -- % remocion biologico (GEM_SAL -> MBR permeado promedio)
    CASE WHEN t.gem_salida IS NOT NULL AND t.gem_salida > 0
              AND COALESCE(t.mbr1_permeado, t.mbr2_permeado) IS NOT NULL
         THEN ROUND(
                (t.gem_salida -
                 CASE
                    WHEN t.mbr1_permeado IS NOT NULL AND t.mbr2_permeado IS NOT NULL
                        THEN (t.mbr1_permeado + t.mbr2_permeado) / 2
                    WHEN t.mbr1_permeado IS NOT NULL THEN t.mbr1_permeado
                    ELSE t.mbr2_permeado
                 END
                ) / t.gem_salida * 100,
              2)
         ELSE NULL
    END                                                               AS pct_remocion_biologico,

    -- % remocion RO (MBR_PER -> RO1_COMP)
    CASE WHEN COALESCE(t.mbr1_permeado, t.mbr2_permeado) IS NOT NULL
              AND COALESCE(t.mbr1_permeado, t.mbr2_permeado) > 0
              AND t.ro1_compuesta IS NOT NULL
         THEN ROUND(
                (CASE
                    WHEN t.mbr1_permeado IS NOT NULL AND t.mbr2_permeado IS NOT NULL
                        THEN (t.mbr1_permeado + t.mbr2_permeado) / 2
                    WHEN t.mbr1_permeado IS NOT NULL THEN t.mbr1_permeado
                    ELSE t.mbr2_permeado
                 END
                 - t.ro1_compuesta
                ) /
                (CASE
                    WHEN t.mbr1_permeado IS NOT NULL AND t.mbr2_permeado IS NOT NULL
                        THEN (t.mbr1_permeado + t.mbr2_permeado) / 2
                    WHEN t.mbr1_permeado IS NOT NULL THEN t.mbr1_permeado
                    ELSE t.mbr2_permeado
                 END) * 100,
              2)
         ELSE NULL
    END                                                               AS pct_remocion_ro,

    -- % remocion GLOBAL (Pulmon -> Vertimiento)
    CASE WHEN t.pulmon IS NOT NULL AND t.pulmon > 0 AND t.vertimiento IS NOT NULL
         THEN ROUND((t.pulmon - t.vertimiento) / t.pulmon * 100, 2)
         ELSE NULL
    END                                                               AS pct_remocion_global
FROM v_tabla_datos_1 t;


SELECT 'Esquema calidad_agua creado correctamente' AS status,
       (SELECT COUNT(*) FROM parametro_calidad) AS parametros,
       (SELECT COUNT(*) FROM unidad_tratamiento) AS unidades;
