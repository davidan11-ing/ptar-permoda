-- Migración: columnas lectura/caudal/horas en tablas RO y PTAP
-- Generado 2026-06-10 — usar IF NOT EXISTS por seguridad (MySQL 8.0.3+)

-- ── operacion_ro_turno ────────────────────────────────────────────────────────
ALTER TABLE operacion_ro_turno ADD COLUMN IF NOT EXISTS lectura_c12        DECIMAL(12,2) NULL AFTER volumen_enviado_ro_m3;
ALTER TABLE operacion_ro_turno ADD COLUMN IF NOT EXISTS lectura_c13        DECIMAL(12,2) NULL AFTER lectura_c12;
ALTER TABLE operacion_ro_turno ADD COLUMN IF NOT EXISTS caudal_entrada_mh  DECIMAL(10,2) NULL AFTER lectura_c13;
ALTER TABLE operacion_ro_turno ADD COLUMN IF NOT EXISTS caudal_salida_mh   DECIMAL(10,2) NULL AFTER caudal_entrada_mh;
ALTER TABLE operacion_ro_turno ADD COLUMN IF NOT EXISTS volumen_permeado_m3 DECIMAL(12,2) NULL AFTER caudal_salida_mh;
ALTER TABLE operacion_ro_turno ADD COLUMN IF NOT EXISTS horas_operacion    DECIMAL(8,2)  NULL AFTER volumen_permeado_m3;

-- ── operacion_ptap_turno ──────────────────────────────────────────────────────
ALTER TABLE operacion_ptap_turno ADD COLUMN IF NOT EXISTS lectura_entrada    DECIMAL(12,2) NULL AFTER costo_op_peroxido;
ALTER TABLE operacion_ptap_turno ADD COLUMN IF NOT EXISTS lectura_permeado   DECIMAL(12,2) NULL AFTER lectura_entrada;
ALTER TABLE operacion_ptap_turno ADD COLUMN IF NOT EXISTS caudal_entrada_mh  DECIMAL(10,2) NULL AFTER lectura_permeado;
ALTER TABLE operacion_ptap_turno ADD COLUMN IF NOT EXISTS caudal_salida_mh   DECIMAL(10,2) NULL AFTER caudal_entrada_mh;
ALTER TABLE operacion_ptap_turno ADD COLUMN IF NOT EXISTS volumen_entrada_m3   DECIMAL(12,2) NULL AFTER caudal_salida_mh;
ALTER TABLE operacion_ptap_turno ADD COLUMN IF NOT EXISTS volumen_permeado_m3  DECIMAL(12,2) NULL AFTER volumen_entrada_m3;
ALTER TABLE operacion_ptap_turno ADD COLUMN IF NOT EXISTS horas_operacion    DECIMAL(8,2)  NULL AFTER volumen_permeado_m3;
ALTER TABLE operacion_ptap_turno ADD COLUMN IF NOT EXISTS cebs_realizados    TINYINT(1) DEFAULT 0 AFTER horas_operacion;
ALTER TABLE operacion_ptap_turno ADD COLUMN IF NOT EXISTS cebs_cantidad      TINYINT    DEFAULT 0 AFTER cebs_realizados;
ALTER TABLE operacion_ptap_turno ADD COLUMN IF NOT EXISTS manga_cambiada     TINYINT(1) DEFAULT 0 AFTER cebs_cantidad;
ALTER TABLE operacion_ptap_turno ADD COLUMN IF NOT EXISTS manga_cantidad     TINYINT    DEFAULT 0 AFTER manga_cambiada;
