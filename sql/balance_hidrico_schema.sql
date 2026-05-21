-- =====================================================================
--  Balance Hídrico — Esquema
--  BD: ptar_permoda
--
--  Diseño en dos capas:
--
--  1. balance_hidrico_manual  — SOLO los campos que ingresan operadores
--     (no derivan de contadores): carrotanques, kg_tela, und_efectivas,
--     m_tela, mulas_funza.
--
--  2. v_balance_hidrico       — VIEW completa que cruza:
--       consumo_turno          (deltas de los 35 contadores)
--       balance_hidrico_manual (entradas manuales de producción)
--       operacion_gem_turno    (caudal tratado GEM, viene de bitácora)
--     y calcula todos los indicadores derivados.
--
--  Mapeo de contadores a columnas del Excel BASE DE DATOS:
--    ingreso_ptap          = cons_ingreso_uf_ptap          (col X=24)
--    potable_ptap          = cons_salida_uf_ptap            (col Y=25)
--    contador_principal    = cons_entrada_ap_principal_6in×10 (col C=3, unidad 0.1 m³)
--    entrada_ro1           = cons_entrada_ro1 / 1000        (col N=14, litros→m³)
--    permeado_ro1          = cons_salida_ro1                (col O=15)
--    lavanderia            = cons_entrada_ap_fria_lavanderia_4in (col D=4)
--    rotativa              = cons_entrada_ap_rotativa_3in   (col R=18)
--    contador_acueducto    = cons_tanque_reuso_2in          (col L=12)
--    envio_th              = cons_envio_th                  (col U=21)
--    permeado_mbr1         = cons_mbr1                      (col V=22)
--    permeado_mbr2         = cons_mbr2                      (col W=23)
--    agua_caliente         = cons_agua_caliente_tintoreria  (col AC=29)
--    retorno_verde         = cons_medidor_verde_retorno/1000 (col S=19, litros→m³)
-- =====================================================================

USE ptar_permoda;

-- ---------------------------------------------------------------------
-- 1. TABLA: balance_hidrico_manual
--    Exclusivamente los campos que NO vienen de contadores.
--    Los operadores registran estos valores turno a turno.
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS balance_hidrico_manual;

CREATE TABLE balance_hidrico_manual (
    fecha               DATE        NOT NULL,
    turno               TINYINT     NOT NULL,

    -- Fuentes de agua externas no medidas por contador
    carrotanques_m3     DECIMAL(10,2) NOT NULL DEFAULT 0
                            COMMENT 'm³ recibidos de carrotanques ese turno',

    -- Producción textil (se registra normalmente en turno 2 del día)
    kg_tela             DECIMAL(10,2)           DEFAULT NULL
                            COMMENT 'kg de tela procesados en tintorería',
    und_efectivas       DECIMAL(10,2)           DEFAULT NULL
                            COMMENT 'unidades efectivas procesadas en lavandería',
    m_tela              DECIMAL(10,2)           DEFAULT NULL
                            COMMENT 'metros de tela procesados en rotativa',

    -- Otras fuentes externas
    mulas_funza_m3      DECIMAL(10,2) NOT NULL DEFAULT 0
                            COMMENT 'm³ recibidos de mulas de Funza',

    -- Metadatos de carga
    cargado_en          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (fecha, turno),
    CONSTRAINT chk_turno_bh CHECK (turno IN (1, 2, 3))
) ENGINE=InnoDB
  COMMENT='Entradas manuales de producción para el balance hídrico (no derivan de contadores)';


-- ---------------------------------------------------------------------
-- 2. VIEW: v_balance_hidrico
--    Combina consumo_turno + balance_hidrico_manual + operacion_gem_turno
--    y reproduce la lógica de la hoja "BASE DE DATOS" del Dashboard Excel.
--
--  Fórmulas clave (replicadas del Excel):
--
--  acueducto = envio_th - ingreso_ptap - permeado_ro1
--              - carrotanques - mulas_funza
--
--  total_agua_limpia = permeado_ro1 + potable_ptap + acueducto
--                      + carrotanques
--
--  consumo_tintoreria  = total_agua_limpia - lavanderia
--  indicador_tin (L/kg) = consumo_tintoreria × 1000 / kg_tela
--  indicador_lav (L/ue) = lavanderia × 1000 / und_efectivas
--  indicador_rot (L/m)  = rotativa × 1000 / m_tela
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS v_balance_hidrico;

CREATE VIEW v_balance_hidrico AS
WITH ct AS (
    -- Campos de contadores ya en m³ o convertidos aquí
    SELECT
        ct.fecha,
        ct.turno,

        -- PTAP
        COALESCE(ct.cons_ingreso_uf_ptap,  0)                         AS ingreso_ptap,
        COALESCE(ct.cons_salida_uf_ptap,   0)                         AS potable_ptap,

        -- Contador principal (unidad = 0.1 m³ → ×10 para m³)
        COALESCE(ct.cons_entrada_ap_principal_6in, 0) * 10            AS contador_principal,

        -- RO (entrada en litros → ÷1000; salida ya en m³)
        COALESCE(ct.cons_entrada_ro1, 0) / 1000                       AS entrada_ro1,
        COALESCE(ct.cons_salida_ro1,  0)                              AS permeado_ro1,

        -- Áreas de producción
        COALESCE(ct.cons_entrada_ap_fria_lavanderia_4in, 0)           AS lavanderia_m3,
        COALESCE(ct.cons_entrada_ap_rotativa_3in, 0)                  AS rotativa_m3,

        -- Otros contadores
        COALESCE(ct.cons_tanque_reuso_2in, 0)                         AS contador_acueducto,
        COALESCE(ct.cons_envio_th, 0)                                 AS envio_th,
        COALESCE(ct.cons_mbr1, 0)                                     AS permeado_mbr1,
        COALESCE(ct.cons_mbr2, 0)                                     AS permeado_mbr2,
        COALESCE(ct.cons_agua_caliente_tintoreria, 0)                 AS agua_caliente,

        -- Retorno verde (litros → ÷1000)
        COALESCE(ct.cons_medidor_verde_retorno, 0) / 1000             AS retorno_verde,

        ct.rollover_detectado
    FROM consumo_turno ct
),
bh AS (
    SELECT
        bm.fecha,
        bm.turno,
        COALESCE(bm.carrotanques_m3, 0)   AS carrotanques,
        bm.kg_tela,
        bm.und_efectivas,
        bm.m_tela,
        COALESCE(bm.mulas_funza_m3, 0)   AS mulas_funza
    FROM balance_hidrico_manual bm
),
gem AS (
    SELECT
        og.fecha,
        og.turno,
        og.caudal_total_tratado_gem_m3    AS consumo_gem_m3
    FROM operacion_gem_turno og
)
SELECT
    ct.fecha,
    ct.turno,
    WEEKOFYEAR(ct.fecha)                                               AS semana,
    DAY(ct.fecha)                                                      AS dia,

    -- ── PTAP ──────────────────────────────────────────────────────────
    ct.ingreso_ptap,
    ct.potable_ptap,

    -- ── FUENTES EXTERNAS ──────────────────────────────────────────────
    COALESCE(bh.carrotanques, 0)                                       AS carrotanques_m3,
    COALESCE(bh.mulas_funza, 0)                                        AS mulas_funza_m3,

    -- ── CONTADOR PRINCIPAL ────────────────────────────────────────────
    ct.contador_principal,

    -- ── OSMOSIS INVERSA ───────────────────────────────────────────────
    ct.entrada_ro1,
    ct.permeado_ro1,
    ct.entrada_ro1 - ct.permeado_ro1                                   AS rechazo_ro1,
    CASE WHEN ct.entrada_ro1 > 0
         THEN ROUND(ct.permeado_ro1 / ct.entrada_ro1 * 100, 2)
         ELSE NULL
    END                                                                AS eficiencia_ro_pct,

    -- ── CAUDALES MBR / RETORNO ────────────────────────────────────────
    ct.permeado_mbr1,
    ct.permeado_mbr2,
    ct.agua_caliente,
    ct.retorno_verde,

    -- ── ENVÍO A TH ────────────────────────────────────────────────────
    ct.envio_th,

    -- ── VOLUMEN ACUEDUCTO (calculado por diferencia) ──────────────────
    --  = envio_th − ingreso_ptap − permeado_ro1 − carrotanques − mulas
    GREATEST(
        ct.envio_th
        - ct.ingreso_ptap
        - ct.permeado_ro1
        - COALESCE(bh.carrotanques, 0)
        - COALESCE(bh.mulas_funza,  0),
        0
    )                                                                  AS acueducto_m3,

    -- ── AGUA LIMPIA TOTAL A PRODUCCIÓN ────────────────────────────────
    --  = permeado_ro1 + potable_ptap + acueducto + carrotanques
    GREATEST(ct.envio_th - ct.ingreso_ptap + ct.potable_ptap
             - COALESCE(bh.mulas_funza, 0), 0)                        AS total_agua_limpia_m3,

    -- ── GEM (viene de bitácora, no de contadores) ─────────────────────
    gem.consumo_gem_m3,

    -- ── LAVANDERÍA ────────────────────────────────────────────────────
    ct.lavanderia_m3,
    bh.und_efectivas,
    CASE WHEN COALESCE(bh.und_efectivas, 0) > 0
         THEN ROUND(ct.lavanderia_m3 * 1000.0 / bh.und_efectivas, 2)
         ELSE NULL
    END                                                                AS indicador_lav_l_und,

    -- ── TINTORERÍA ────────────────────────────────────────────────────
    --  consumo_tintoreria = total_agua_limpia - lavanderia
    GREATEST(
        GREATEST(ct.envio_th - ct.ingreso_ptap + ct.potable_ptap
                 - COALESCE(bh.mulas_funza, 0), 0)
        - ct.lavanderia_m3,
        0
    )                                                                  AS tintoreria_m3,
    bh.kg_tela,
    CASE WHEN COALESCE(bh.kg_tela, 0) > 0
         THEN ROUND(
                GREATEST(
                    GREATEST(ct.envio_th - ct.ingreso_ptap + ct.potable_ptap
                             - COALESCE(bh.mulas_funza, 0), 0)
                    - ct.lavanderia_m3,
                    0
                ) * 1000.0 / bh.kg_tela,
              2)
         ELSE NULL
    END                                                                AS indicador_tin_l_kg,

    -- ── ROTATIVA ──────────────────────────────────────────────────────
    ct.rotativa_m3,
    ct.contador_acueducto,
    bh.m_tela,
    CASE WHEN COALESCE(bh.m_tela, 0) > 0
         THEN ROUND(ct.rotativa_m3 * 1000.0 / bh.m_tela, 2)
         ELSE NULL
    END                                                                AS indicador_rot_l_m,

    -- ── CALIDAD / FLAGS ───────────────────────────────────────────────
    ct.rollover_detectado

FROM ct
LEFT JOIN bh  ON bh.fecha  = ct.fecha AND bh.turno  = ct.turno
LEFT JOIN gem ON gem.fecha = ct.fecha AND gem.turno = ct.turno;


SELECT 'Esquema balance_hidrico creado correctamente' AS status;
