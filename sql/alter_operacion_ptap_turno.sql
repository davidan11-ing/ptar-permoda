-- Agrega columnas operativas a operacion_ptap_turno (si ya existia sin ellas)
ALTER TABLE operacion_ptap_turno ADD COLUMN lectura_entrada   DECIMAL(12,2) NULL AFTER costo_op_peroxido;
ALTER TABLE operacion_ptap_turno ADD COLUMN lectura_permeado  DECIMAL(12,2) NULL AFTER lectura_entrada;
ALTER TABLE operacion_ptap_turno ADD COLUMN caudal_entrada_mh DECIMAL(10,2) NULL AFTER lectura_permeado;
ALTER TABLE operacion_ptap_turno ADD COLUMN caudal_salida_mh  DECIMAL(10,2) NULL AFTER caudal_entrada_mh;
ALTER TABLE operacion_ptap_turno ADD COLUMN volumen_entrada_m3  DECIMAL(12,2) NULL AFTER caudal_salida_mh;
ALTER TABLE operacion_ptap_turno ADD COLUMN volumen_permeado_m3 DECIMAL(12,2) NULL AFTER volumen_entrada_m3;
ALTER TABLE operacion_ptap_turno ADD COLUMN horas_operacion   DECIMAL(8,2)  NULL AFTER volumen_permeado_m3;
ALTER TABLE operacion_ptap_turno ADD COLUMN cebs_realizados   TINYINT(1) DEFAULT 0 AFTER horas_operacion;
ALTER TABLE operacion_ptap_turno ADD COLUMN cebs_cantidad     TINYINT    DEFAULT 0 AFTER cebs_realizados;
ALTER TABLE operacion_ptap_turno ADD COLUMN manga_cambiada    TINYINT(1) DEFAULT 0 AFTER cebs_cantidad;
ALTER TABLE operacion_ptap_turno ADD COLUMN manga_cantidad    TINYINT    DEFAULT 0 AFTER manga_cambiada;
ALTER TABLE operacion_ptap_turno ADD COLUMN observaciones     TEXT NULL AFTER manga_cantidad;
