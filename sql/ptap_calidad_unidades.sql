-- ============================================================
--  Agrega las 3 unidades de tratamiento PTAP al catálogo
--  y recrea v_tabla_datos_1 con esas 3 columnas nuevas.
-- ============================================================

USE ptar_permoda;

-- 1. Insertar unidades PTAP (si ya existen, IGNORE las saltará)
INSERT IGNORE INTO unidad_tratamiento (codigo, nombre, orden_tren, descripcion) VALUES
  ('PTAP_POZO',  'Pozo',                              16, 'Entrada agua cruda — captación pozo PTAP'),
  ('PTAP_CLARI', 'Salida Clarifloculador / Entrada UF', 17, 'Salida clarifloculador / entrada a ultrafiltración PTAP'),
  ('PTAP_UF',    'Salida UF',                         18, 'Salida de ultrafiltración PTAP — agua tratada');

-- 2. Recrear v_tabla_datos_1 con las 3 nuevas columnas PTAP
DROP VIEW IF EXISTS v_tabla_datos_1;

CREATE VIEW v_tabla_datos_1 AS
SELECT
    m.fecha,
    m.turno,
    p.codigo                                                           AS parametro_codigo,
    p.nombre                                                           AS parametro,
    p.unidad                                                           AS parametro_unidad,
    -- ── PTAR — 15 unidades originales ──────────────────────────────
    MAX(CASE WHEN u.codigo = 'PULMON'      THEN m.valor END)           AS pulmon,
    MAX(CASE WHEN u.codigo = 'HOMO'        THEN m.valor END)           AS homogeneizador,
    MAX(CASE WHEN u.codigo = 'GEM_SAL'     THEN m.valor END)           AS gem_salida,
    MAX(CASE WHEN u.codigo = 'ANOXICO'     THEN m.valor END)           AS anoxico,
    MAX(CASE WHEN u.codigo = 'MBBR'        THEN m.valor END)           AS mbbr,
    MAX(CASE WHEN u.codigo = 'MBR1_INT'    THEN m.valor END)           AS mbr1_interno,
    MAX(CASE WHEN u.codigo = 'MBR2_INT'    THEN m.valor END)           AS mbr2_interno,
    MAX(CASE WHEN u.codigo = 'MBR1_PER'    THEN m.valor END)           AS mbr1_permeado,
    MAX(CASE WHEN u.codigo = 'MBR2_PER'    THEN m.valor END)           AS mbr2_permeado,
    MAX(CASE WHEN u.codigo = 'VERTIMIENTO' THEN m.valor END)           AS vertimiento,
    MAX(CASE WHEN u.codigo = 'RO1_COMP'    THEN m.valor END)           AS ro1_compuesta,
    MAX(CASE WHEN u.codigo = 'RO1_E1'      THEN m.valor END)           AS ro1_etapa1,
    MAX(CASE WHEN u.codigo = 'RO1_E2'      THEN m.valor END)           AS ro1_etapa2,
    MAX(CASE WHEN u.codigo = 'RO2_PER'     THEN m.valor END)           AS ro2_permeado,
    MAX(CASE WHEN u.codigo = 'RO_RECHAZO'  THEN m.valor END)           AS ro_rechazo,
    -- ── PTAP — 3 nuevas unidades ────────────────────────────────────
    MAX(CASE WHEN u.codigo = 'PTAP_POZO'   THEN m.valor END)           AS ptap_pozo,
    MAX(CASE WHEN u.codigo = 'PTAP_CLARI'  THEN m.valor END)           AS ptap_clari,
    MAX(CASE WHEN u.codigo = 'PTAP_UF'     THEN m.valor END)           AS ptap_uf
FROM medicion_calidad m
JOIN parametro_calidad   p ON p.id = m.parametro_id
JOIN unidad_tratamiento  u ON u.id = m.unidad_id
GROUP BY m.fecha, m.turno, p.codigo, p.nombre, p.unidad;
