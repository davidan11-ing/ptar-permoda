-- ============================================================
--  Migración operacion_ro_turno — columnas faltantes
--  Ejecutado automáticamente por run_migrations.py
--  Cada ALTER es independiente para tolerar columnas ya existentes.
-- ============================================================

ALTER TABLE operacion_ro_turno ADD COLUMN usuario            VARCHAR(255)  NULL AFTER turno_descripcion;
ALTER TABLE operacion_ro_turno ADD COLUMN equipo             TEXT          NULL AFTER usuario;
ALTER TABLE operacion_ro_turno ADD COLUMN lectura_c12        DECIMAL(12,2) NULL AFTER volumen_enviado_ro_m3;
ALTER TABLE operacion_ro_turno ADD COLUMN lectura_c13        DECIMAL(12,2) NULL AFTER lectura_c12;
ALTER TABLE operacion_ro_turno ADD COLUMN caudal_entrada_mh  DECIMAL(10,2) NULL AFTER lectura_c13;
ALTER TABLE operacion_ro_turno ADD COLUMN caudal_salida_mh   DECIMAL(10,2) NULL AFTER caudal_entrada_mh;
ALTER TABLE operacion_ro_turno ADD COLUMN volumen_permeado_m3 DECIMAL(12,2) NULL AFTER caudal_salida_mh;
ALTER TABLE operacion_ro_turno ADD COLUMN horas_operacion    DECIMAL(8,2)  NULL AFTER volumen_permeado_m3;
