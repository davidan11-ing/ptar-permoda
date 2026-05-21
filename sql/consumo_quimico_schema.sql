-- =====================================================================
--  Consumo Químico — Esquema (Real + Proyección)
--  BD: ptar_permoda
--
--  Estructura en 3 capas:
--    CAPA 0 (catálogo)   producto_quimico         (existente, +4 productos)
--    CAPA 2 (real)        operacion_gem_turno      (existente, datos por turno)
--                         operacion_ro_turno       (existente)
--    CAPA 2 (proyección)  proyeccion_caudal_mensual    NUEVA
--                         proyeccion_quimica_mensual   NUEVA
--    CAPA 3 (vistas)     v_consumo_quimico_diario
--                        v_consumo_quimico_mensual
--                        v_quimico_real_vs_proyectado
--                        v_quimico_estadisticas_dia
--
--  Se ELIMINAN tablas obsoletas:
--    consumo_quimico_mensual (errata enero, reemplazada por vista)
--    seguimiento_proyeccion_real (vacía, sin uso)
-- =====================================================================

USE ptar_permoda;

-- ---------------------------------------------------------------------
-- 0. Limpieza de tablas obsoletas
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS consumo_quimico_mensual;
DROP TABLE IF EXISTS seguimiento_proyeccion_real;


-- ---------------------------------------------------------------------
-- 1. Completar catálogo producto_quimico (faltan 4 químicos del Excel)
-- ---------------------------------------------------------------------
INSERT INTO producto_quimico (codigo, nombre, sistema, funcion, unidad_inv, precio_kg, activo)
VALUES
  (NULL, 'NITRATO DE PLATA',     'OTRO', 'Trazador / reactivo análisis',          'KG', 180000, 1),
  (NULL, 'CIP ALCALINO RO',      'RO',   'Limpieza CIP alcalina membranas RO',    'KG', 32490,  1),
  (NULL, 'CIP ACIDO RO',         'RO',   'Limpieza CIP acida membranas RO',       'KG', 34156,  1),
  (NULL, 'ACIDO CITRICO',        'RO',   'Acido cítrico — CIP / desincrustación', 'KG', 5200,   1)
ON DUPLICATE KEY UPDATE precio_kg = VALUES(precio_kg);


-- ---------------------------------------------------------------------
-- 2. TABLA: proyeccion_caudal_mensual
--    Caudal Plan Maestro proyectado por (anio, mes, sistema).
--    Sistema = 'GEM_RO' (caudal combinado GEM+RO) o 'PTAP'.
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS proyeccion_caudal_mensual;
CREATE TABLE proyeccion_caudal_mensual (
    anio        SMALLINT     NOT NULL,
    mes         TINYINT      NOT NULL,
    sistema     ENUM('GEM_RO','PTAP') NOT NULL,
    caudal_m3   DECIMAL(12,2) NOT NULL,
    cargado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (anio, mes, sistema),
    CONSTRAINT chk_mes_caudal CHECK (mes BETWEEN 1 AND 12)
) ENGINE=InnoDB
  COMMENT='Caudal Plan Maestro proyectado por mes y subsistema';


-- ---------------------------------------------------------------------
-- 3. TABLA: proyeccion_quimica_mensual
--    Proyección de consumo y costo por (anio, mes, producto, sistema).
--    Un mismo producto puede estar proyectado en dos sistemas
--    (e.g. ACIDIFICANTE en GEM y en PTAP).
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS proyeccion_quimica_mensual;
CREATE TABLE proyeccion_quimica_mensual (
    anio                  SMALLINT     NOT NULL,
    mes                   TINYINT      NOT NULL,
    producto_id           INT          NOT NULL,
    sistema               ENUM('GEM','RO','PTAP','OTRO') NOT NULL,
    dosificacion_kg_m3    DECIMAL(14,8)         DEFAULT NULL,
    kg_proyectado         DECIMAL(14,4) NOT NULL DEFAULT 0,
    costo_unitario_kg     DECIMAL(12,2)         DEFAULT NULL,
    costo_proyectado      DECIMAL(16,2)         DEFAULT NULL,
    cargado_en            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
                                       ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (anio, mes, producto_id, sistema),
    CONSTRAINT chk_mes_quim CHECK (mes BETWEEN 1 AND 12),
    CONSTRAINT fk_proy_producto FOREIGN KEY (producto_id) REFERENCES producto_quimico(id)
) ENGINE=InnoDB
  COMMENT='Proyección mensual de consumo y costo por producto químico y sistema';


-- ---------------------------------------------------------------------
-- 4. VIEW: v_consumo_quimico_diario
--    Agrega operacion_gem_turno + operacion_ro_turno por (fecha, producto).
--    UNION ALL de 10 químicos (5 GEM + 5 RO).
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS v_consumo_quimico_diario;

CREATE VIEW v_consumo_quimico_diario AS
-- ---- GEM ----
SELECT fecha, 'GEM' AS sistema, 1 AS producto_id, 'COF280' AS producto_codigo, 'ACIDIFICANTE' AS producto_nombre,
       SUM(consumo_acido_l) AS L_dia, SUM(kg_acido) AS kg_dia,
       AVG(NULLIF(ppm_acido,0)) AS ppm_promedio_dia,
       SUM(costo_op_acido) AS costo_dia,
       SUM(caudal_total_tratado_gem_m3) AS caudal_m3_dia
FROM operacion_gem_turno GROUP BY fecha
UNION ALL
SELECT fecha, 'GEM', 2, 'COF235', 'COAGULANTE',
       SUM(consumo_coagulante_l), SUM(kg_coagulante),
       AVG(NULLIF(ppm_coagulante,0)),
       SUM(costo_op_coagulante),
       SUM(caudal_total_tratado_gem_m3)
FROM operacion_gem_turno GROUP BY fecha
UNION ALL
SELECT fecha, 'GEM', 3, 'COF255', 'DECOLORANTE',
       SUM(consumo_decolorante_l), SUM(kg_decolorante),
       AVG(NULLIF(ppm_decolorante,0)),
       SUM(costo_op_decolorante),
       SUM(caudal_total_tratado_gem_m3)
FROM operacion_gem_turno GROUP BY fecha
UNION ALL
SELECT fecha, 'GEM', 4, 'COF440', 'POLIMERO ANIONICO',
       NULL, SUM(kg_pol_anionico),
       AVG(NULLIF(ppm_pol_anionico,0)),
       SUM(costo_op_anionico),
       SUM(caudal_total_tratado_gem_m3)
FROM operacion_gem_turno GROUP BY fecha
UNION ALL
SELECT fecha, 'GEM', 5, 'COF494', 'POLIMERO CATIONICO',
       NULL, SUM(kg_pol_cationico),
       AVG(NULLIF(ppm_pol_cationico,0)),
       SUM(costo_op_cationico),
       SUM(caudal_total_tratado_gem_m3)
FROM operacion_gem_turno GROUP BY fecha
-- ---- RO ----
UNION ALL
SELECT fecha, 'RO', 6, NULL, 'HCL 10%',
       SUM(consumo_l_hcl), SUM(consumo_kg_hcl),
       AVG(NULLIF(ppm_hcl,0)),
       SUM(costo_op_hcl),
       SUM(volumen_enviado_ro_m3)
FROM operacion_ro_turno GROUP BY fecha
UNION ALL
SELECT fecha, 'RO', 7, NULL, 'KURIVERTER IK-220',
       SUM(consumo_l_kuriverter), SUM(consumo_kg_kuriverter),
       AVG(NULLIF(ppm_kuriverter,0)),
       SUM(costo_op_kuriverter),
       SUM(volumen_enviado_ro_m3)
FROM operacion_ro_turno GROUP BY fecha
UNION ALL
SELECT fecha, 'RO', 8, NULL, 'VITEC 7000',
       SUM(consumo_l_vitec), SUM(consumo_kg_vitec),
       AVG(NULLIF(ppm_vitec,0)),
       SUM(costo_op_vitec),
       SUM(volumen_enviado_ro_m3)
FROM operacion_ro_turno GROUP BY fecha
UNION ALL
SELECT fecha, 'RO', 9, NULL, 'HIDROXIDO DE SODIO',
       SUM(consumo_l_naoh), SUM(consumo_kg_naoh),
       AVG(NULLIF(ppm_naoh,0)),
       SUM(costo_op_naoh),
       SUM(volumen_enviado_ro_m3)
FROM operacion_ro_turno GROUP BY fecha
UNION ALL
SELECT fecha, 'RO', 10, NULL, 'BISULFITO DE SODIO',
       SUM(consumo_l_bisulfito), SUM(consumo_kg_bisulfito),
       AVG(NULLIF(ppm_bisulfito,0)),
       SUM(costo_op_bisulfito),
       SUM(volumen_enviado_ro_m3)
FROM operacion_ro_turno GROUP BY fecha;


-- ---------------------------------------------------------------------
-- 5. VIEW: v_consumo_quimico_mensual
--    Agrega lo anterior por (anio, mes, producto, sistema).
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS v_consumo_quimico_mensual;

CREATE VIEW v_consumo_quimico_mensual AS
SELECT
    YEAR(fecha)                                       AS anio,
    MONTH(fecha)                                      AS mes,
    sistema,
    producto_id,
    producto_codigo,
    producto_nombre,
    COUNT(DISTINCT fecha)                             AS dias_con_dato,
    ROUND(SUM(L_dia), 2)                              AS L_mes,
    ROUND(SUM(kg_dia), 2)                             AS kg_mes,
    ROUND(SUM(L_dia)  / NULLIF(COUNT(DISTINCT fecha), 0), 2) AS L_promedio_diario,
    ROUND(SUM(kg_dia) / NULLIF(COUNT(DISTINCT fecha), 0), 2) AS kg_promedio_diario,
    ROUND(AVG(ppm_promedio_dia), 2)                   AS ppm_promedio_mes,
    ROUND(SUM(costo_dia), 0)                          AS costo_mes,
    ROUND(SUM(costo_dia) / NULLIF(COUNT(DISTINCT fecha), 0), 0) AS costo_promedio_diario,
    ROUND(SUM(caudal_m3_dia), 2)                      AS caudal_total_m3_mes,
    -- Indicadores reales
    ROUND(SUM(kg_dia)    / NULLIF(SUM(caudal_m3_dia), 0), 6) AS kg_por_m3,
    ROUND(SUM(costo_dia) / NULLIF(SUM(caudal_m3_dia), 0), 2) AS pesos_por_m3
FROM v_consumo_quimico_diario
GROUP BY YEAR(fecha), MONTH(fecha), sistema, producto_id, producto_codigo, producto_nombre;


-- ---------------------------------------------------------------------
-- 6. VIEW: v_quimico_real_vs_proyectado
--    Cruce mensual real vs proyectado por (anio, mes, producto, sistema).
--    Incluye también lo proyectado que aún no tiene real (LEFT JOIN reverso).
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS v_quimico_real_vs_proyectado;

CREATE VIEW v_quimico_real_vs_proyectado AS
SELECT
    COALESCE(p.anio, r.anio)                              AS anio,
    COALESCE(p.mes, r.mes)                                AS mes,
    COALESCE(p.producto_id, r.producto_id)                AS producto_id,
    pq.nombre                                             AS producto,
    COALESCE(p.sistema, r.sistema)                        AS sistema,

    -- REAL (de v_consumo_quimico_mensual)
    r.kg_mes                                              AS kg_real,
    r.costo_mes                                           AS costo_real,
    r.caudal_total_m3_mes                                 AS caudal_real_m3,
    r.kg_por_m3                                           AS kg_por_m3_real,
    r.pesos_por_m3                                        AS pesos_por_m3_real,

    -- PROYECTADO
    p.kg_proyectado,
    p.costo_proyectado,
    p.dosificacion_kg_m3                                  AS kg_por_m3_proyectado,
    pc.caudal_m3                                          AS caudal_proyectado_m3,

    -- DESVIACIONES
    ROUND(r.kg_mes    - p.kg_proyectado, 2)               AS desviacion_kg,
    ROUND((r.kg_mes - p.kg_proyectado) / NULLIF(p.kg_proyectado, 0) * 100, 2)
                                                          AS desviacion_pct,
    ROUND(r.kg_mes / NULLIF(p.kg_proyectado, 0) * 100, 2) AS cumplimiento_pct,
    ROUND(r.costo_mes - p.costo_proyectado, 2)            AS desviacion_costo,
    ROUND(r.costo_mes / NULLIF(p.costo_proyectado, 0) * 100, 2)
                                                          AS cumplimiento_costo_pct

FROM proyeccion_quimica_mensual p
LEFT JOIN v_consumo_quimico_mensual r
       ON r.anio = p.anio AND r.mes = p.mes
      AND r.producto_id = p.producto_id
      AND r.sistema     = p.sistema
LEFT JOIN proyeccion_caudal_mensual pc
       ON pc.anio = p.anio AND pc.mes = p.mes
      AND pc.sistema = (CASE WHEN p.sistema IN ('GEM','RO') THEN 'GEM_RO' ELSE p.sistema END)
LEFT JOIN producto_quimico pq ON pq.id = p.producto_id;


-- ---------------------------------------------------------------------
-- 7. VIEW: v_quimico_estadisticas_dia
--    Estadística diaria por (anio, mes, producto, sistema):
--    MIN / MAX / AVG / STDEV / SUM de kg, L, PPM y costo por DÍA.
--    Es la info de la hoja GRAFICAS pero generalizada.
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS v_quimico_estadisticas_dia;

CREATE VIEW v_quimico_estadisticas_dia AS
SELECT
    YEAR(fecha)                          AS anio,
    MONTH(fecha)                         AS mes,
    sistema,
    producto_id,
    producto_codigo,
    producto_nombre,
    COUNT(*)                             AS dias,
    -- KG
    ROUND(MIN(kg_dia),  4)               AS kg_min,
    ROUND(MAX(kg_dia),  4)               AS kg_max,
    ROUND(AVG(kg_dia),  4)               AS kg_avg,
    ROUND(STDDEV_SAMP(kg_dia), 4)        AS kg_stddev,
    ROUND(SUM(kg_dia),  2)               AS kg_total,
    -- LITROS
    ROUND(MIN(L_dia),   4)               AS L_min,
    ROUND(MAX(L_dia),   4)               AS L_max,
    ROUND(AVG(L_dia),   4)               AS L_avg,
    ROUND(SUM(L_dia),   2)               AS L_total,
    -- PPM
    ROUND(MIN(ppm_promedio_dia), 2)      AS ppm_min,
    ROUND(MAX(ppm_promedio_dia), 2)      AS ppm_max,
    ROUND(AVG(ppm_promedio_dia), 2)      AS ppm_avg,
    -- COSTO
    ROUND(MIN(costo_dia), 0)             AS costo_min,
    ROUND(MAX(costo_dia), 0)             AS costo_max,
    ROUND(AVG(costo_dia), 0)             AS costo_avg,
    ROUND(SUM(costo_dia), 0)             AS costo_total
FROM v_consumo_quimico_diario
WHERE kg_dia IS NOT NULL AND kg_dia > 0
GROUP BY YEAR(fecha), MONTH(fecha), sistema, producto_id, producto_codigo, producto_nombre;


SELECT 'Esquema consumo_quimico creado correctamente' AS status,
       (SELECT COUNT(*) FROM producto_quimico)        AS productos;
