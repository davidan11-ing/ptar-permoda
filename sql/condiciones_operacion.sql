USE ptar_permoda;

CREATE TABLE IF NOT EXISTS condiciones_mbr_turno (
    id                     INT AUTO_INCREMENT PRIMARY KEY,
    fecha                  DATE        NOT NULL,
    turno                  TINYINT     NOT NULL,
    usuario                VARCHAR(100),
    mbr1_caudal_permeado   DECIMAL(8,2),
    mbr1_tmp               DECIMAL(8,2),
    mbr1_nivel_tmp         ENUM('bajo','medio','alto'),
    mbr1_purga             TINYINT(1)  DEFAULT 0,
    mbr1_purga_min         SMALLINT,
    mbr1_recirculacion     TINYINT(1)  DEFAULT 0,
    mbr1_recirculacion_min SMALLINT,
    mbr1_observaciones     TEXT,
    mbr2_caudal_permeado   DECIMAL(8,2),
    mbr2_tmp               DECIMAL(8,2),
    mbr2_nivel_tmp         ENUM('bajo','medio','alto'),
    mbr2_purga             TINYINT(1)  DEFAULT 0,
    mbr2_purga_min         SMALLINT,
    mbr2_recirculacion     TINYINT(1)  DEFAULT 0,
    mbr2_recirculacion_min SMALLINT,
    mbr2_observaciones     TEXT,
    observaciones          TEXT,
    created_at             TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_mbr_fecha_turno (fecha, turno)
) ENGINE=InnoDB COMMENT='Condiciones de operacion reactores MBR por turno';

CREATE TABLE IF NOT EXISTS condiciones_ro_turno (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    fecha                DATE        NOT NULL,
    turno                TINYINT     NOT NULL,
    usuario              VARCHAR(100),
    p_entrada_e1         DECIMAL(6,3),
    p_salida_e1          DECIMAL(6,3),
    p_entrada_e2         DECIMAL(6,3),
    p_salida_e2          DECIMAL(6,3),
    q_permeado_e1        DECIMAL(8,2),
    q_permeado_e2        DECIMAL(8,2),
    q_rechazo_rotametro  DECIMAL(8,2),
    flujo_normalizado_e1 DECIMAL(10,4),
    p_filtro_cartuchos   DECIMAL(6,3),
    p_f1                 DECIMAL(6,3),
    p_f2                 DECIMAL(6,3),
    p_f3                 DECIMAL(6,3),
    fecha_cip            DATE,
    observaciones        TEXT,
    created_at           TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ro_fecha_turno (fecha, turno)
) ENGINE=InnoDB COMMENT='Condiciones de operacion osmosis inversa por turno';

CREATE TABLE IF NOT EXISTS condiciones_ptap_turno (
    id                        INT AUTO_INCREMENT PRIMARY KEY,
    fecha                     DATE        NOT NULL,
    turno                     TINYINT     NOT NULL,
    usuario                   VARCHAR(100),
    tmp_pantalla              DECIMAL(8,2),
    tiempo_filtracion_min     SMALLINT,
    tiempo_purga_clarif_min   SMALLINT,
    frecuencia_purga_clarif_h DECIMAL(6,2),
    observaciones             TEXT,
    created_at                TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ptap_cond_fecha_turno (fecha, turno)
) ENGINE=InnoDB COMMENT='Condiciones de operacion PTAP por turno';
