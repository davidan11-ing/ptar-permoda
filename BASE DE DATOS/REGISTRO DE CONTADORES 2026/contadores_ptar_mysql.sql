-- ============================================================
--  CONTADORES PTAR 2026 — Esquema MySQL
--  Fuente: Contadores PTAR 2026.xlsx
--  Hoja principal: "Contadores Por Turno 2026"
--  Generado: 2026-05-12
-- ============================================================
--
--  LÓGICA DE NEGOCIO RELEVANTE
--  ─────────────────────────────────────────────────────────
--  • Todos los valores son LECTURAS ACUMULADAS de odómetro (m³).
--    El consumo por turno se obtiene como delta entre lecturas
--    consecutivas, NO como valor directo.
--
--  • Estructura de turnos (lectura tomada al INICIO del turno):
--      Turno 1  → 22:00   (10 PM – 6 AM  del día siguiente)
--      Turno 2  → 06:00   (6 AM  – 2 PM)
--      Turno 3  → 14:00   (2 PM  – 10 PM)
--
--  • El Excel almacena la FECHA solo en la primera fila de cada
--    grupo de 3 turnos. En MySQL se normaliza: cada fila lleva
--    su fecha completa.
--
--  • Contadores con 100% de valores nulos en 2026 se mantienen
--    en el esquema para paridad con el Excel (pueden activarse
--    en cualquier momento):
--      - entrada_ap_tintoreria_6in    (col T)
--      - entrada_ap_puerta6_acueducto (col AH)
-- ============================================================

-- ------------------------------------------------------------
--  0. BASE DE DATOS
-- ------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS ptar2
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ptar2;

-- ------------------------------------------------------------
--  1. CATÁLOGO DE MEDIDORES
--     Registro maestro de cada contador físico instalado.
--     Permite habilitar/deshabilitar sin modificar la tabla
--     de lecturas y documenta la ubicación física.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medidor (
    id                TINYINT UNSIGNED  NOT NULL AUTO_INCREMENT,
    codigo_columna    VARCHAR(60)       NOT NULL  COMMENT 'Nombre de columna en tabla contadores_lectura',
    nombre_completo   VARCHAR(200)      NOT NULL  COMMENT 'Nombre original del Excel',
    area              VARCHAR(80)       NULL      COMMENT 'Área o sistema al que pertenece',
    diametro          VARCHAR(15)       NULL      COMMENT 'Diámetro de la línea (ej: 6", 4", 3", 1/2")',
    tipo_agua         ENUM(
                          'potable',
                          'reuso',
                          'proceso',
                          'retorno',
                          'permeado_ro',
                          'caliente',
                          'otro'
                      )                NOT NULL  DEFAULT 'potable',
    unidad            CHAR(3)          NOT NULL  DEFAULT 'm3' COMMENT 'Unidad de medida',
    activo            TINYINT(1)       NOT NULL  DEFAULT 1    COMMENT '1=activo, 0=sin lecturas / retirado',
    notas             TEXT             NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_medidor_columna (codigo_columna)
) ENGINE=InnoDB
  COMMENT='Catálogo de contadores físicos instalados en PTAR 2';

-- Inserción del catálogo completo (35 medidores)
INSERT INTO medidor
    (codigo_columna, nombre_completo, area, diametro, tipo_agua, activo)
VALUES
-- Acueducto / Agua Potable
('entrada_ap_principal_6in',
 'Contador Entrada Agua Potable Principal 6"',
 'Acueducto general', '6"', 'potable', 1),

('entrada_ap_fria_lavanderia_4in',
 'Contador Entrada Agua Potable Fría Lavandería (4")',
 'Lavandería', '4"', 'potable', 1),

('entrada_ap_lab_lavanderia',
 'Contador Entrada Agua Potable LAB Lavandería',
 'Laboratorio Lavandería', NULL, 'potable', 1),

('entrada_ap_fria_tintoreria_4in',
 'Entrada Agua Potable Fría Tintorería (4")',
 'Tintorería', '4"', 'potable', 1),

('entrada_ap_rotativa_3in',
 'Entrada Agua Potable Rotativa 3"',
 'Área rotativa / general', '3"', 'potable', 1),

('entrada_ap_tintoreria_6in',
 'Contador Entrada Agua Potable Tintorería 6"',
 'Tintorería', '6"', 'potable', 0),  -- 100% nulo en 2026

('entrada_ap_ptar2_acueducto',
 'Entrada Agua Potable PTAR 2 - (1/2") (Alimenta Tanque de Recirculación) ACUEDUCTO',
 'PTAR 2 / Tanque recirculación', '1/2"', 'potable', 1),

('entrada_ap_puerta2_acueducto',
 'Entrada Agua Potable Puerta 2 ACUEDUCTO',
 'Acueducto - Puerta 2', NULL, 'potable', 1),

('entrada_ap_puerta4_acueducto',
 'Entrada Agua Potable Puerta 4 ACUEDUCTO',
 'Acueducto - Puerta 4', NULL, 'potable', 1),

('entrada_ap_puerta5_acueducto',
 'Entrada Agua Potable Puerta 5 ACUEDUCTO',
 'Acueducto - Puerta 5', NULL, 'potable', 1),

('entrada_ap_puerta6_acueducto',
 'Entrada Agua Potable Puerta 6 ACUEDUCTO',
 'Acueducto - Puerta 6', NULL, 'potable', 0),  -- 100% nulo en 2026

('entrada_ap_puerta7_acueducto',
 'Entrada Agua Potable Puerta 7 ACUEDUCTO',
 'Acueducto - Puerta 7', NULL, 'potable', 1),

('entrada_ap_caldera_acueducto',
 'Entrada Agua Potable Caldera ACUEDUCTO',
 'Caldera', NULL, 'potable', 1),

('entrada_ap_quimicos',
 'Entrada Agua Potable Cuarto Químicos',
 'Cuarto de químicos', NULL, 'potable', 1),

('entrada_ap_lavanderia_acueducto',
 'Entrada Agua Potable 1/2" - Lavandería ACUEDUCTO',
 'Lavandería', '1/2"', 'potable', 1),

('entrada_ap_zona_lodos_acueducto',
 'Entrada Agua Potable Zona de Lodos 1/2" (Rama - Estaciones lava Ojos) ACUEDUCTO',
 'Zona de lodos / Estaciones lava ojos', '1/2"', 'potable', 1),

-- Medidores de proceso / producción
('entrada_medidor_rojo_tintoreria_4in',
 'Entrada Agua Medidor Rojo Tintorería (4")',
 'Tintorería', '4"', 'proceso', 1),

('entrada_medidor_rojo_lavanderia_4in',
 'Entrada Agua Medidor Rojo Lavandería (4")',
 'Lavandería', '4"', 'proceso', 1),

('rama',
 'Rama',
 'Distribución interna', NULL, 'proceso', 1),

('abridora_1',
 'Abridora 1',
 'Área abridoras', NULL, 'proceso', 1),

('abridora_2',
 'Abridora 2',
 'Área abridoras', NULL, 'proceso', 1),

-- Agua caliente
('agua_caliente_tintoreria',
 'Agua Caliente Tintorería (DIGITAL)',
 'Tintorería', NULL, 'caliente', 1),

('medidor_prueba_agua_caliente',
 'Medidor Prueba Agua Caliente',
 'Tintorería - prueba', NULL, 'caliente', 1),

-- Reuso / PTAR
('tanque_reuso_2in',
 'Tanque de Reuso (2")',
 'Reuso / Recirculación', '2"', 'reuso', 1),

('ptar',
 'PTAR',
 'PTAR 2 - entrada general', NULL, 'proceso', 1),

('envio_th',
 'Envío a TH (Tanque Homogeneizador)',
 'PTAR 2 - envío a tratamiento', NULL, 'proceso', 1),

-- Ósmosis Inversa
('entrada_ro1',
 'Entrada RO #1',
 'Ósmosis Inversa - RO 1', NULL, 'proceso', 1),

('salida_ro1',
 'Salida RO #1 (Permeado)',
 'Ósmosis Inversa - RO 1', NULL, 'permeado_ro', 1),

('entrada_ro2',
 'Entrada RO #2',
 'Ósmosis Inversa - RO 2', NULL, 'proceso', 1),

('salida_ro2',
 'Salida RO #2 (Permeado)',
 'Ósmosis Inversa - RO 2', NULL, 'permeado_ro', 1),

-- Sistema biológico MBR
('mbr1',
 'MBR 1',
 'Reactor MBR 1', NULL, 'proceso', 1),

('mbr2',
 'MBR 2',
 'Reactor MBR 2', NULL, 'proceso', 1),

-- PTAP (Planta Tratamiento Agua Potable interna)
('ingreso_uf_ptap',
 'Medidor de Ingreso UF PTAP',
 'PTAP - entrada ultrafiltración', NULL, 'proceso', 1),

('salida_uf_ptap',
 'Medidor Salida UF PTAP',
 'PTAP - salida ultrafiltración', NULL, 'proceso', 1),

-- Retorno
('medidor_verde_retorno',
 'Medidor Verde Digital Retorno',
 'Retorno / Recirculación general', NULL, 'retorno', 1);


-- ------------------------------------------------------------
--  2. TABLA PRINCIPAL DE LECTURAS
--     Una fila = una lectura por turno.
--     Todos los valores son acumulados en m³ (odómetro).
--
--  NOTAS DE TIPO:
--  • BIGINT UNSIGNED: soporta hasta ~18,4 × 10^18.
--    El mayor acumulado observado es ~35.875.060 m³
--    (Medidor Verde Retorno). Se usa BIGINT para cubrir
--    reinicios de contador y crecimiento multi-año.
--  • NULL permitido: varios medidores solo tienen lecturas
--    parciales del año (ver activo=0 en catálogo).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contadores_lectura (
    id                              BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,

    -- ── Identificadores temporales ──────────────────────────
    fecha                           DATE              NOT NULL
        COMMENT 'Fecha de la lectura (completada desde el Excel donde la celda estaba vacía)',
    turno                           TINYINT UNSIGNED  NOT NULL
        COMMENT '1=10PM-6AM | 2=6AM-2PM | 3=2PM-10PM',
    hora_lectura                    TIME              NOT NULL
        COMMENT 'Hora al inicio del turno: 22:00=T1, 06:00=T2, 14:00=T3',

    -- ── Acueducto / Agua Potable Principal ──────────────────
    entrada_ap_principal_6in        BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. Contador Entrada AP Principal 6"',
    entrada_ap_fria_lavanderia_4in  BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. AP Fría Lavandería 4"',
    entrada_ap_lab_lavanderia       BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. AP LAB Lavandería',
    entrada_ap_fria_tintoreria_4in  BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. AP Fría Tintorería 4"',
    entrada_ap_rotativa_3in         BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. AP Rotativa 3"',
    entrada_ap_tintoreria_6in       BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. AP Tintorería 6" (sin lecturas 2026)',
    entrada_ap_ptar2_acueducto      BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. AP PTAR 2 (1/2") Tanque Recirculación',
    entrada_ap_puerta2_acueducto    BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. AP Puerta 2 Acueducto',
    entrada_ap_puerta4_acueducto    BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. AP Puerta 4 Acueducto',
    entrada_ap_puerta5_acueducto    BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. AP Puerta 5 Acueducto',
    entrada_ap_puerta6_acueducto    BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. AP Puerta 6 Acueducto (sin lecturas 2026)',
    entrada_ap_puerta7_acueducto    BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. AP Puerta 7 Acueducto',
    entrada_ap_caldera_acueducto    BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. AP Caldera Acueducto',
    entrada_ap_quimicos             BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. AP Cuarto Químicos',
    entrada_ap_lavanderia_acueducto BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. AP 1/2" Lavandería Acueducto',
    entrada_ap_zona_lodos_acueducto BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. AP Zona Lodos / Lava Ojos 1/2"',

    -- ── Medidores de proceso / producción ───────────────────
    entrada_medidor_rojo_tintoreria_4in BIGINT UNSIGNED NULL   COMMENT 'm3 acum. Medidor Rojo Tintorería 4"',
    entrada_medidor_rojo_lavanderia_4in BIGINT UNSIGNED NULL   COMMENT 'm3 acum. Medidor Rojo Lavandería 4"',
    rama                            BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. Rama distribución',
    abridora_1                      BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. Abridora 1',
    abridora_2                      BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. Abridora 2',

    -- ── Agua caliente ────────────────────────────────────────
    agua_caliente_tintoreria        BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. Agua Caliente Tintorería (digital)',
    medidor_prueba_agua_caliente    BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. Medidor Prueba Agua Caliente',

    -- ── Reuso / PTAR ────────────────────────────────────────
    tanque_reuso_2in                BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. Tanque Reuso 2"',
    ptar                            BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. Entrada PTAR 2 (contador planta)',
    envio_th                        BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. Envío a Tanque Homogeneizador',

    -- ── Ósmosis Inversa ──────────────────────────────────────
    entrada_ro1                     BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. Entrada RO #1',
    salida_ro1                      BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. Salida (permeado) RO #1',
    entrada_ro2                     BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. Entrada RO #2',
    salida_ro2                      BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. Salida (permeado) RO #2',

    -- ── Sistema biológico MBR ────────────────────────────────
    mbr1                            BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. MBR 1',
    mbr2                            BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. MBR 2',

    -- ── PTAP (Planta Tratamiento AP interna) ─────────────────
    ingreso_uf_ptap                 BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. Ingreso Ultrafiltración PTAP',
    salida_uf_ptap                  BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. Salida Ultrafiltración PTAP',

    -- ── Retorno / Recirculación ───────────────────────────────
    medidor_verde_retorno           BIGINT UNSIGNED   NULL     COMMENT 'm3 acum. Medidor Verde Digital Retorno',

    -- ── Metadatos de carga ───────────────────────────────────
    creado_en                       TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en                  TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                               ON UPDATE CURRENT_TIMESTAMP,

    -- ── Restricciones ────────────────────────────────────────
    PRIMARY KEY (id),

    -- Unicidad: solo puede existir una lectura por fecha y turno
    UNIQUE KEY uq_fecha_turno (fecha, turno),

    -- Índices de consulta frecuente
    KEY idx_fecha        (fecha),
    KEY idx_fecha_turno  (fecha, turno),

    -- Integridad de turno
    CONSTRAINT chk_turno CHECK (turno IN (1, 2, 3)),

    -- Integridad de hora según turno
    CONSTRAINT chk_hora_turno CHECK (
        (turno = 1 AND hora_lectura = '22:00:00')
     OR (turno = 2 AND hora_lectura = '06:00:00')
     OR (turno = 3 AND hora_lectura = '14:00:00')
    )

) ENGINE=InnoDB
  COMMENT='Lecturas acumuladas (odómetro) de contadores de agua por turno — PTAR 2 2026';


-- ------------------------------------------------------------
--  3. TABLA DE CONSUMOS POR TURNO (delta entre lecturas)
--     Equivalente a la hoja "PRUEBA MARZO" pero generalizada.
--     Se llena desde la aplicación o con el procedimiento
--     recalcular_consumos() definido abajo.
--
--  NOTA: consumo = lectura_actual − lectura_turno_anterior.
--        Si lectura_actual < lectura_anterior → hubo reinicio
--        de contador (ROLLOVER); el campo rollover_detectado
--        lo registra para revisión manual.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consumo_turno (
    id                              BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
    fecha                           DATE              NOT NULL,
    turno                           TINYINT UNSIGNED  NOT NULL,
    operario                        VARCHAR(60)       NULL     COMMENT 'Nombre del operario de turno (col T2 en prueba)',

    -- Consumos calculados (m³ = lectura_actual - lectura_anterior)
    cons_entrada_ap_principal_6in        DECIMAL(10,2) NULL,
    cons_entrada_ap_fria_lavanderia_4in  DECIMAL(10,2) NULL,
    cons_entrada_ap_lab_lavanderia       DECIMAL(10,2) NULL,
    cons_entrada_ap_fria_tintoreria_4in  DECIMAL(10,2) NULL,
    cons_entrada_ap_rotativa_3in         DECIMAL(10,2) NULL,
    cons_entrada_ap_tintoreria_6in       DECIMAL(10,2) NULL,
    cons_entrada_ap_ptar2_acueducto      DECIMAL(10,2) NULL,
    cons_entrada_ap_puerta2_acueducto    DECIMAL(10,2) NULL,
    cons_entrada_ap_puerta4_acueducto    DECIMAL(10,2) NULL,
    cons_entrada_ap_puerta5_acueducto    DECIMAL(10,2) NULL,
    cons_entrada_ap_puerta6_acueducto    DECIMAL(10,2) NULL,
    cons_entrada_ap_puerta7_acueducto    DECIMAL(10,2) NULL,
    cons_entrada_ap_caldera_acueducto    DECIMAL(10,2) NULL,
    cons_entrada_ap_quimicos             DECIMAL(10,2) NULL,
    cons_entrada_ap_lavanderia_acueducto DECIMAL(10,2) NULL,
    cons_entrada_ap_zona_lodos_acueducto DECIMAL(10,2) NULL,
    cons_entrada_medidor_rojo_tintoreria DECIMAL(10,2) NULL,
    cons_entrada_medidor_rojo_lavanderia DECIMAL(10,2) NULL,
    cons_rama                            DECIMAL(10,2) NULL,
    cons_abridora_1                      DECIMAL(10,2) NULL,
    cons_abridora_2                      DECIMAL(10,2) NULL,
    cons_agua_caliente_tintoreria        DECIMAL(10,2) NULL,
    cons_medidor_prueba_agua_caliente    DECIMAL(10,2) NULL,
    cons_tanque_reuso_2in                DECIMAL(10,2) NULL,
    cons_ptar                            DECIMAL(10,2) NULL,
    cons_envio_th                        DECIMAL(10,2) NULL,
    cons_entrada_ro1                     DECIMAL(10,2) NULL,
    cons_salida_ro1                      DECIMAL(10,2) NULL,
    cons_entrada_ro2                     DECIMAL(10,2) NULL,
    cons_salida_ro2                      DECIMAL(10,2) NULL,
    cons_mbr1                            DECIMAL(10,2) NULL,
    cons_mbr2                            DECIMAL(10,2) NULL,
    cons_ingreso_uf_ptap                 DECIMAL(10,2) NULL,
    cons_salida_uf_ptap                  DECIMAL(10,2) NULL,
    cons_medidor_verde_retorno           DECIMAL(10,2) NULL,

    -- Indicadores calculados por turno (del área PRUEBA MARZO)
    cons_total_produccion_m3        DECIMAL(10,2)     NULL  COMMENT 'Consumo total producción (tintorería + lavandería)',
    cons_tintoreria_m3              DECIMAL(10,2)     NULL  COMMENT 'Consumo tintorería en el turno',
    cons_lavanderia_m3              DECIMAL(10,2)     NULL  COMMENT 'Consumo lavandería en el turno',
    kg_tintoreria                   DECIMAL(10,2)     NULL  COMMENT 'kg de tela procesados en el turno',
    unidades_lavanderia             DECIMAL(10,2)     NULL  COMMENT 'Unidades efectivas lavandería',
    indicador_tintoreria_l_kg       DECIMAL(10,4)     NULL  COMMENT 'L/kg tela (consumo tintorería)',
    indicador_lavanderia_l_und      DECIMAL(10,4)     NULL  COMMENT 'L/unidad efectiva (consumo lavandería)',

    -- Control de calidad
    rollover_detectado              TINYINT(1)        NOT NULL DEFAULT 0
        COMMENT '1 si algún contador bajó respecto al turno anterior (posible reinicio o error)',
    notas                           TEXT              NULL,

    creado_en                       TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en                  TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_consumo_fecha_turno (fecha, turno),
    KEY idx_consumo_fecha (fecha),
    CONSTRAINT chk_consumo_turno CHECK (turno IN (1, 2, 3))

) ENGINE=InnoDB
  COMMENT='Consumos calculados por turno (delta de lecturas acumuladas)';


-- ------------------------------------------------------------
--  4. VISTA: lecturas_con_turno
--     Convierte la hora a número de turno y añade etiqueta
--     legible. Útil para reportes directos.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW lecturas_con_turno AS
SELECT
    id,
    fecha,
    turno,
    CASE turno
        WHEN 1 THEN '10PM-6AM'
        WHEN 2 THEN '6AM-2PM'
        WHEN 3 THEN '2PM-10PM'
    END                              AS turno_descripcion,
    hora_lectura,
    -- Acueducto
    entrada_ap_principal_6in,
    entrada_ap_fria_lavanderia_4in,
    entrada_ap_lab_lavanderia,
    entrada_ap_fria_tintoreria_4in,
    entrada_ap_rotativa_3in,
    entrada_ap_ptar2_acueducto,
    entrada_ap_puerta2_acueducto,
    entrada_ap_puerta4_acueducto,
    entrada_ap_puerta5_acueducto,
    entrada_ap_puerta7_acueducto,
    entrada_ap_caldera_acueducto,
    entrada_ap_quimicos,
    entrada_ap_lavanderia_acueducto,
    entrada_ap_zona_lodos_acueducto,
    -- Proceso
    entrada_medidor_rojo_tintoreria_4in,
    entrada_medidor_rojo_lavanderia_4in,
    rama,
    abridora_1,
    abridora_2,
    agua_caliente_tintoreria,
    medidor_prueba_agua_caliente,
    -- PTAR / Reuso
    tanque_reuso_2in,
    ptar,
    envio_th,
    -- RO
    entrada_ro1,
    salida_ro1,
    entrada_ro2,
    salida_ro2,
    -- MBR
    mbr1,
    mbr2,
    -- PTAP
    ingreso_uf_ptap,
    salida_uf_ptap,
    -- Retorno
    medidor_verde_retorno
FROM contadores_lectura;


-- ------------------------------------------------------------
--  5. PROCEDIMIENTO: recalcular_consumos
--     Recalcula la tabla consumo_turno para un rango de fechas.
--     Uso: CALL recalcular_consumos('2026-01-01', '2026-03-31');
--
--     ALGORITMO:
--     Para cada fila de contadores_lectura ordenada por fecha+turno,
--     se busca la lectura inmediatamente anterior (fila LAG) y se
--     calcula el delta. Si delta < 0, se activa rollover_detectado.
-- ------------------------------------------------------------
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS recalcular_consumos(
    IN p_fecha_desde DATE,
    IN p_fecha_hasta DATE
)
BEGIN
    -- Elimina registros existentes en el rango para recalcular
    DELETE FROM consumo_turno
     WHERE fecha BETWEEN p_fecha_desde AND p_fecha_hasta;

    -- Inserta consumos calculados usando LAG() (requiere MySQL 8+)
    INSERT INTO consumo_turno (
        fecha, turno,
        cons_entrada_ap_principal_6in,
        cons_entrada_ap_fria_lavanderia_4in,
        cons_entrada_ap_lab_lavanderia,
        cons_entrada_ap_fria_tintoreria_4in,
        cons_entrada_ap_rotativa_3in,
        cons_entrada_ap_ptar2_acueducto,
        cons_entrada_ap_puerta2_acueducto,
        cons_entrada_ap_puerta4_acueducto,
        cons_entrada_ap_puerta5_acueducto,
        cons_entrada_ap_puerta7_acueducto,
        cons_entrada_ap_caldera_acueducto,
        cons_entrada_ap_quimicos,
        cons_entrada_ap_lavanderia_acueducto,
        cons_entrada_ap_zona_lodos_acueducto,
        cons_entrada_medidor_rojo_tintoreria,
        cons_entrada_medidor_rojo_lavanderia,
        cons_rama,
        cons_abridora_1,
        cons_abridora_2,
        cons_agua_caliente_tintoreria,
        cons_tanque_reuso_2in,
        cons_ptar,
        cons_envio_th,
        cons_entrada_ro1,
        cons_salida_ro1,
        cons_entrada_ro2,
        cons_salida_ro2,
        cons_mbr1,
        cons_mbr2,
        cons_ingreso_uf_ptap,
        cons_salida_uf_ptap,
        cons_medidor_verde_retorno,
        rollover_detectado
    )
    WITH lecturas_con_lag AS (
        SELECT
            fecha, turno,
            -- Delta = actual - anterior (NULL si no hay lectura anterior)
            entrada_ap_principal_6in
                - LAG(entrada_ap_principal_6in)        OVER w AS d_principal_6in,
            entrada_ap_fria_lavanderia_4in
                - LAG(entrada_ap_fria_lavanderia_4in)  OVER w AS d_fria_lavanderia_4in,
            entrada_ap_lab_lavanderia
                - LAG(entrada_ap_lab_lavanderia)       OVER w AS d_lab_lavanderia,
            entrada_ap_fria_tintoreria_4in
                - LAG(entrada_ap_fria_tintoreria_4in)  OVER w AS d_fria_tintoreria_4in,
            entrada_ap_rotativa_3in
                - LAG(entrada_ap_rotativa_3in)         OVER w AS d_rotativa_3in,
            entrada_ap_ptar2_acueducto
                - LAG(entrada_ap_ptar2_acueducto)      OVER w AS d_ptar2_acueducto,
            entrada_ap_puerta2_acueducto
                - LAG(entrada_ap_puerta2_acueducto)    OVER w AS d_puerta2,
            entrada_ap_puerta4_acueducto
                - LAG(entrada_ap_puerta4_acueducto)    OVER w AS d_puerta4,
            entrada_ap_puerta5_acueducto
                - LAG(entrada_ap_puerta5_acueducto)    OVER w AS d_puerta5,
            entrada_ap_puerta7_acueducto
                - LAG(entrada_ap_puerta7_acueducto)    OVER w AS d_puerta7,
            entrada_ap_caldera_acueducto
                - LAG(entrada_ap_caldera_acueducto)    OVER w AS d_caldera,
            entrada_ap_quimicos
                - LAG(entrada_ap_quimicos)             OVER w AS d_quimicos,
            entrada_ap_lavanderia_acueducto
                - LAG(entrada_ap_lavanderia_acueducto) OVER w AS d_lavanderia_acueducto,
            entrada_ap_zona_lodos_acueducto
                - LAG(entrada_ap_zona_lodos_acueducto) OVER w AS d_zona_lodos,
            entrada_medidor_rojo_tintoreria_4in
                - LAG(entrada_medidor_rojo_tintoreria_4in) OVER w AS d_rojo_tintoreria,
            entrada_medidor_rojo_lavanderia_4in
                - LAG(entrada_medidor_rojo_lavanderia_4in) OVER w AS d_rojo_lavanderia,
            rama          - LAG(rama)          OVER w AS d_rama,
            abridora_1    - LAG(abridora_1)    OVER w AS d_abridora_1,
            abridora_2    - LAG(abridora_2)    OVER w AS d_abridora_2,
            agua_caliente_tintoreria
                - LAG(agua_caliente_tintoreria) OVER w AS d_agua_caliente,
            tanque_reuso_2in - LAG(tanque_reuso_2in) OVER w AS d_reuso,
            ptar          - LAG(ptar)          OVER w AS d_ptar,
            envio_th      - LAG(envio_th)      OVER w AS d_envio_th,
            entrada_ro1   - LAG(entrada_ro1)   OVER w AS d_entrada_ro1,
            salida_ro1    - LAG(salida_ro1)    OVER w AS d_salida_ro1,
            entrada_ro2   - LAG(entrada_ro2)   OVER w AS d_entrada_ro2,
            salida_ro2    - LAG(salida_ro2)    OVER w AS d_salida_ro2,
            mbr1          - LAG(mbr1)          OVER w AS d_mbr1,
            mbr2          - LAG(mbr2)          OVER w AS d_mbr2,
            ingreso_uf_ptap  - LAG(ingreso_uf_ptap)  OVER w AS d_ingreso_uf,
            salida_uf_ptap   - LAG(salida_uf_ptap)   OVER w AS d_salida_uf,
            medidor_verde_retorno
                - LAG(medidor_verde_retorno) OVER w AS d_verde_retorno
        FROM contadores_lectura
        WINDOW w AS (ORDER BY fecha, turno)
    )
    SELECT
        fecha, turno,
        GREATEST(d_principal_6in,       0),
        GREATEST(d_fria_lavanderia_4in, 0),
        GREATEST(d_lab_lavanderia,      0),
        GREATEST(d_fria_tintoreria_4in, 0),
        GREATEST(d_rotativa_3in,        0),
        GREATEST(d_ptar2_acueducto,     0),
        GREATEST(d_puerta2,             0),
        GREATEST(d_puerta4,             0),
        GREATEST(d_puerta5,             0),
        GREATEST(d_puerta7,             0),
        GREATEST(d_caldera,             0),
        GREATEST(d_quimicos,            0),
        GREATEST(d_lavanderia_acueducto,0),
        GREATEST(d_zona_lodos,          0),
        GREATEST(d_rojo_tintoreria,     0),
        GREATEST(d_rojo_lavanderia,     0),
        GREATEST(d_rama,                0),
        GREATEST(d_abridora_1,          0),
        GREATEST(d_abridora_2,          0),
        GREATEST(d_agua_caliente,       0),
        GREATEST(d_reuso,               0),
        GREATEST(d_ptar,                0),
        GREATEST(d_envio_th,            0),
        GREATEST(d_entrada_ro1,         0),
        GREATEST(d_salida_ro1,          0),
        GREATEST(d_entrada_ro2,         0),
        GREATEST(d_salida_ro2,          0),
        GREATEST(d_mbr1,                0),
        GREATEST(d_mbr2,                0),
        GREATEST(d_ingreso_uf,          0),
        GREATEST(d_salida_uf,           0),
        GREATEST(d_verde_retorno,       0),
        -- rollover: 1 si algún delta fue negativo
        CASE WHEN LEAST(
            COALESCE(d_principal_6in,       0),
            COALESCE(d_fria_lavanderia_4in, 0),
            COALESCE(d_lab_lavanderia,      0),
            COALESCE(d_fria_tintoreria_4in, 0),
            COALESCE(d_rotativa_3in,        0),
            COALESCE(d_envio_th,            0),
            COALESCE(d_entrada_ro1,         0),
            COALESCE(d_verde_retorno,       0)
        ) < 0 THEN 1 ELSE 0 END
    FROM lecturas_con_lag
    WHERE fecha BETWEEN p_fecha_desde AND p_fecha_hasta
      AND fecha IS NOT NULL;

END$$

DELIMITER ;


-- ------------------------------------------------------------
--  6. RESUMEN DEL ESQUEMA
-- ============================================================
--
--  TABLAS:
--    medidor              → Catálogo de 35 contadores físicos
--    contadores_lectura   → 1 fila por fecha+turno, valores acumulados
--    consumo_turno        → 1 fila por fecha+turno, valores delta (consumo real)
--
--  VISTA:
--    lecturas_con_turno   → contadores_lectura con etiqueta de turno legible
--
--  PROCEDIMIENTO:
--    recalcular_consumos(desde, hasta) → puebla consumo_turno desde lecturas
--
--  MAPEO Excel → MySQL:
--    Col A  FECHA            → fecha (DATE, propagada a todas las filas del grupo)
--    Col B  HORA             → hora_lectura (TIME) + turno (1/2/3 derivado)
--    Col C  → entrada_ap_principal_6in
--    Col D  → entrada_ap_fria_lavanderia_4in
--    Col E  → entrada_ap_lab_lavanderia
--    Col F  → entrada_medidor_rojo_tintoreria_4in
--    Col G  → entrada_ap_fria_tintoreria_4in
--    Col H  → entrada_medidor_rojo_lavanderia_4in
--    Col I  → rama
--    Col J  → abridora_1
--    Col K  → abridora_2
--    Col L  → tanque_reuso_2in
--    Col M  → ptar
--    Col N  → entrada_ro1
--    Col O  → salida_ro1
--    Col P  → entrada_ro2
--    Col Q  → salida_ro2
--    Col R  → entrada_ap_rotativa_3in
--    Col S  → medidor_verde_retorno
--    Col T  → entrada_ap_tintoreria_6in      (100% nulo 2026)
--    Col U  → envio_th
--    Col V  → mbr1
--    Col W  → mbr2
--    Col X  → ingreso_uf_ptap
--    Col Y  → salida_uf_ptap
--    Col Z  → entrada_ap_ptar2_acueducto
--    Col AA → entrada_ap_puerta4_acueducto
--    Col AB → entrada_ap_quimicos
--    Col AC → agua_caliente_tintoreria
--    Col AD → medidor_prueba_agua_caliente
--    Col AE → entrada_ap_puerta2_acueducto
--    Col AF → entrada_ap_caldera_acueducto
--    Col AG → entrada_ap_puerta5_acueducto
--    Col AH → entrada_ap_puerta6_acueducto   (100% nulo 2026)
--    Col AI → entrada_ap_puerta7_acueducto
--    Col AJ → entrada_ap_lavanderia_acueducto
--    Col AK → entrada_ap_zona_lodos_acueducto
-- ============================================================
