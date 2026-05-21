-- =====================================================================
--  Stored Procedure: recalcular_consumos
--  BD: ptar_permoda
--
--  Calcula consumos por turno (delta entre lecturas acumuladas)
--  usando window function LAG() — requiere MySQL 8.0+
--
--  Uso:
--    CALL recalcular_consumos('2026-01-01', '2026-03-31');
--    CALL recalcular_consumos('2026-01-01', CURDATE());
--
--  Logica:
--    consumo_turno_X = CAST(lectura_X AS SIGNED) - CAST(LAG(lectura_X) AS SIGNED)
--    Si delta < 0 -> rollover_detectado = 1 (contador reseteado o error)
--    GREATEST(delta, 0) evita consumos negativos en la tabla
--
--  Nota: los campos de contadores_lectura son BIGINT UNSIGNED.
--  Se castea a SIGNED antes de restar para evitar overflow cuando
--  lectura_actual < lectura_anterior (rollover o error de digitacion).
-- =====================================================================

USE ptar_permoda;

DROP PROCEDURE IF EXISTS recalcular_consumos;

DELIMITER $$

CREATE PROCEDURE recalcular_consumos(
    IN p_fecha_desde DATE,
    IN p_fecha_hasta DATE
)
BEGIN
    -- Elimina registros del rango para recalcular limpios
    DELETE FROM consumo_turno
     WHERE fecha BETWEEN p_fecha_desde AND p_fecha_hasta;

    INSERT INTO consumo_turno (
        fecha, turno,
        cons_entrada_ap_principal_6in,
        cons_entrada_ap_fria_lavanderia_4in,
        cons_entrada_ap_lab_lavanderia,
        cons_entrada_ap_fria_tintoreria_4in,
        cons_entrada_ap_rotativa_3in,
        cons_entrada_ap_tintoreria_6in,
        cons_entrada_ap_ptar2_acueducto,
        cons_entrada_ap_puerta2_acueducto,
        cons_entrada_ap_puerta4_acueducto,
        cons_entrada_ap_puerta5_acueducto,
        cons_entrada_ap_puerta6_acueducto,
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
        cons_medidor_prueba_agua_caliente,
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
    WITH lag_calc AS (
        SELECT
            fecha, turno,
            -- CAST a SIGNED antes de restar: evita overflow UNSIGNED cuando hay rollover
            CAST(entrada_ap_principal_6in AS SIGNED)
                - CAST(LAG(entrada_ap_principal_6in)           OVER w AS SIGNED) AS d_principal_6in,
            CAST(entrada_ap_fria_lavanderia_4in AS SIGNED)
                - CAST(LAG(entrada_ap_fria_lavanderia_4in)     OVER w AS SIGNED) AS d_fria_lav_4in,
            CAST(entrada_ap_lab_lavanderia AS SIGNED)
                - CAST(LAG(entrada_ap_lab_lavanderia)          OVER w AS SIGNED) AS d_lab_lav,
            CAST(entrada_ap_fria_tintoreria_4in AS SIGNED)
                - CAST(LAG(entrada_ap_fria_tintoreria_4in)     OVER w AS SIGNED) AS d_fria_tin_4in,
            CAST(entrada_ap_rotativa_3in AS SIGNED)
                - CAST(LAG(entrada_ap_rotativa_3in)            OVER w AS SIGNED) AS d_rotativa_3in,
            CAST(entrada_ap_tintoreria_6in AS SIGNED)
                - CAST(LAG(entrada_ap_tintoreria_6in)          OVER w AS SIGNED) AS d_tin_6in,
            CAST(entrada_ap_ptar2_acueducto AS SIGNED)
                - CAST(LAG(entrada_ap_ptar2_acueducto)         OVER w AS SIGNED) AS d_ptar2_acueducto,
            CAST(entrada_ap_puerta2_acueducto AS SIGNED)
                - CAST(LAG(entrada_ap_puerta2_acueducto)       OVER w AS SIGNED) AS d_puerta2,
            CAST(entrada_ap_puerta4_acueducto AS SIGNED)
                - CAST(LAG(entrada_ap_puerta4_acueducto)       OVER w AS SIGNED) AS d_puerta4,
            CAST(entrada_ap_puerta5_acueducto AS SIGNED)
                - CAST(LAG(entrada_ap_puerta5_acueducto)       OVER w AS SIGNED) AS d_puerta5,
            CAST(entrada_ap_puerta6_acueducto AS SIGNED)
                - CAST(LAG(entrada_ap_puerta6_acueducto)       OVER w AS SIGNED) AS d_puerta6,
            CAST(entrada_ap_puerta7_acueducto AS SIGNED)
                - CAST(LAG(entrada_ap_puerta7_acueducto)       OVER w AS SIGNED) AS d_puerta7,
            CAST(entrada_ap_caldera_acueducto AS SIGNED)
                - CAST(LAG(entrada_ap_caldera_acueducto)       OVER w AS SIGNED) AS d_caldera,
            CAST(entrada_ap_quimicos AS SIGNED)
                - CAST(LAG(entrada_ap_quimicos)                OVER w AS SIGNED) AS d_quimicos,
            CAST(entrada_ap_lavanderia_acueducto AS SIGNED)
                - CAST(LAG(entrada_ap_lavanderia_acueducto)    OVER w AS SIGNED) AS d_lav_acueducto,
            CAST(entrada_ap_zona_lodos_acueducto AS SIGNED)
                - CAST(LAG(entrada_ap_zona_lodos_acueducto)    OVER w AS SIGNED) AS d_zona_lodos,
            CAST(entrada_medidor_rojo_tintoreria_4in AS SIGNED)
                - CAST(LAG(entrada_medidor_rojo_tintoreria_4in) OVER w AS SIGNED) AS d_rojo_tin,
            CAST(entrada_medidor_rojo_lavanderia_4in AS SIGNED)
                - CAST(LAG(entrada_medidor_rojo_lavanderia_4in) OVER w AS SIGNED) AS d_rojo_lav,
            CAST(rama AS SIGNED)
                - CAST(LAG(rama)                               OVER w AS SIGNED) AS d_rama,
            CAST(abridora_1 AS SIGNED)
                - CAST(LAG(abridora_1)                         OVER w AS SIGNED) AS d_abridora_1,
            CAST(abridora_2 AS SIGNED)
                - CAST(LAG(abridora_2)                         OVER w AS SIGNED) AS d_abridora_2,
            CAST(agua_caliente_tintoreria AS SIGNED)
                - CAST(LAG(agua_caliente_tintoreria)           OVER w AS SIGNED) AS d_agua_cal,
            CAST(medidor_prueba_agua_caliente AS SIGNED)
                - CAST(LAG(medidor_prueba_agua_caliente)       OVER w AS SIGNED) AS d_prueba_cal,
            CAST(tanque_reuso_2in AS SIGNED)
                - CAST(LAG(tanque_reuso_2in)                   OVER w AS SIGNED) AS d_reuso,
            CAST(ptar AS SIGNED)
                - CAST(LAG(ptar)                               OVER w AS SIGNED) AS d_ptar,
            CAST(envio_th AS SIGNED)
                - CAST(LAG(envio_th)                           OVER w AS SIGNED) AS d_envio_th,
            CAST(entrada_ro1 AS SIGNED)
                - CAST(LAG(entrada_ro1)                        OVER w AS SIGNED) AS d_entrada_ro1,
            CAST(salida_ro1 AS SIGNED)
                - CAST(LAG(salida_ro1)                         OVER w AS SIGNED) AS d_salida_ro1,
            CAST(entrada_ro2 AS SIGNED)
                - CAST(LAG(entrada_ro2)                        OVER w AS SIGNED) AS d_entrada_ro2,
            CAST(salida_ro2 AS SIGNED)
                - CAST(LAG(salida_ro2)                         OVER w AS SIGNED) AS d_salida_ro2,
            CAST(mbr1 AS SIGNED)
                - CAST(LAG(mbr1)                               OVER w AS SIGNED) AS d_mbr1,
            CAST(mbr2 AS SIGNED)
                - CAST(LAG(mbr2)                               OVER w AS SIGNED) AS d_mbr2,
            CAST(ingreso_uf_ptap AS SIGNED)
                - CAST(LAG(ingreso_uf_ptap)                    OVER w AS SIGNED) AS d_ingreso_uf,
            CAST(salida_uf_ptap AS SIGNED)
                - CAST(LAG(salida_uf_ptap)                     OVER w AS SIGNED) AS d_salida_uf,
            CAST(medidor_verde_retorno AS SIGNED)
                - CAST(LAG(medidor_verde_retorno)              OVER w AS SIGNED) AS d_verde_retorno
        FROM contadores_lectura
        WINDOW w AS (ORDER BY fecha, turno)
    )
    SELECT
        fecha, turno,
        GREATEST(COALESCE(d_principal_6in,   0), 0),
        GREATEST(COALESCE(d_fria_lav_4in,    0), 0),
        GREATEST(COALESCE(d_lab_lav,         0), 0),
        GREATEST(COALESCE(d_fria_tin_4in,    0), 0),
        GREATEST(COALESCE(d_rotativa_3in,    0), 0),
        GREATEST(COALESCE(d_tin_6in,         0), 0),
        GREATEST(COALESCE(d_ptar2_acueducto, 0), 0),
        GREATEST(COALESCE(d_puerta2,         0), 0),
        GREATEST(COALESCE(d_puerta4,         0), 0),
        GREATEST(COALESCE(d_puerta5,         0), 0),
        GREATEST(COALESCE(d_puerta6,         0), 0),
        GREATEST(COALESCE(d_puerta7,         0), 0),
        GREATEST(COALESCE(d_caldera,         0), 0),
        GREATEST(COALESCE(d_quimicos,        0), 0),
        GREATEST(COALESCE(d_lav_acueducto,   0), 0),
        GREATEST(COALESCE(d_zona_lodos,      0), 0),
        GREATEST(COALESCE(d_rojo_tin,        0), 0),
        GREATEST(COALESCE(d_rojo_lav,        0), 0),
        GREATEST(COALESCE(d_rama,            0), 0),
        GREATEST(COALESCE(d_abridora_1,      0), 0),
        GREATEST(COALESCE(d_abridora_2,      0), 0),
        GREATEST(COALESCE(d_agua_cal,        0), 0),
        GREATEST(COALESCE(d_prueba_cal,      0), 0),
        GREATEST(COALESCE(d_reuso,           0), 0),
        GREATEST(COALESCE(d_ptar,            0), 0),
        GREATEST(COALESCE(d_envio_th,        0), 0),
        GREATEST(COALESCE(d_entrada_ro1,     0), 0),
        GREATEST(COALESCE(d_salida_ro1,      0), 0),
        GREATEST(COALESCE(d_entrada_ro2,     0), 0),
        GREATEST(COALESCE(d_salida_ro2,      0), 0),
        GREATEST(COALESCE(d_mbr1,            0), 0),
        GREATEST(COALESCE(d_mbr2,            0), 0),
        GREATEST(COALESCE(d_ingreso_uf,      0), 0),
        GREATEST(COALESCE(d_salida_uf,       0), 0),
        GREATEST(COALESCE(d_verde_retorno,   0), 0),
        -- rollover: 1 si alguno de los medidores clave bajo de valor
        CASE WHEN LEAST(
            COALESCE(d_principal_6in,  0),
            COALESCE(d_fria_lav_4in,   0),
            COALESCE(d_lab_lav,        0),
            COALESCE(d_ptar,           0),
            COALESCE(d_envio_th,       0),
            COALESCE(d_entrada_ro1,    0),
            COALESCE(d_salida_ro1,     0),
            COALESCE(d_verde_retorno,  0)
        ) < 0 THEN 1 ELSE 0 END
    FROM lag_calc
    WHERE fecha BETWEEN p_fecha_desde AND p_fecha_hasta
      AND fecha IS NOT NULL;

    -- Reporte de resultado
    SELECT
        COUNT(*)                          AS turnos_calculados,
        SUM(rollover_detectado)           AS turnos_con_rollover,
        MIN(fecha)                        AS desde,
        MAX(fecha)                        AS hasta,
        ROUND(SUM(cons_ptar), 0)          AS m3_ptar_periodo,
        ROUND(SUM(cons_entrada_ap_principal_6in), 0) AS m3_acueducto_principal
    FROM consumo_turno
    WHERE fecha BETWEEN p_fecha_desde AND p_fecha_hasta;

END$$

DELIMITER ;

SELECT 'Procedimiento recalcular_consumos creado correctamente' AS status;
