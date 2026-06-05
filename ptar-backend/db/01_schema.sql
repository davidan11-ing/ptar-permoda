-- ============================================================
--  PTAR Permoda — Schema MySQL
--  Requiere MySQL 8.0.13+ (DEFAULT (UUID()))
--  Ejecutar: mysql -u root -p < 01_schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS ptar_permoda
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ptar_permoda;

-- ──────────────────────────────────────────────────────────────
--  Usuarios
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ptar_users (
  id     CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
  email  VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  role   VARCHAR(50)  NOT NULL   -- 'operario' | 'encargado' | 'administrador'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO ptar_users (email, nombre, role) VALUES
  ('davidan@permoda.com.co',   'David',     'administrador'),
  ('encargado@permoda.com.co', 'Encargado', 'encargado'),
  ('operario@permoda.com.co',  'Operario',  'operario');

-- ──────────────────────────────────────────────────────────────
--  F-01: Lecturas de contadores de agua (m³)
--  delta_m3 = lectura_actual_m3 - lectura_anterior_m3
--  Se calcula en Python antes del INSERT
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ptar_registro_contadores (
  id                  CHAR(36)       PRIMARY KEY DEFAULT (UUID()),
  created_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  turno               VARCHAR(20)    NOT NULL,        -- 'mañana' | 'tarde' | 'noche'
  usuario             VARCHAR(255)   NOT NULL,
  id_contador         VARCHAR(50)    NOT NULL,        -- 'C-01' … 'C-35' o slugs más largos
  nombre_contador     VARCHAR(255)   NOT NULL,
  ubicacion           VARCHAR(255)   NOT NULL,
  tipo_agua           VARCHAR(100)   NOT NULL,
  lectura_anterior_m3 DECIMAL(12,3)  NOT NULL DEFAULT 0,
  lectura_actual_m3   DECIMAL(12,3)  NOT NULL,
  delta_m3            DECIMAL(12,3)  NOT NULL DEFAULT 0,
  observaciones       TEXT           NULL,
  KEY idx_cont_fecha      (created_at),
  KEY idx_cont_contador   (id_contador),
  KEY idx_cont_turno      (turno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ──────────────────────────────────────────────────────────────
--  F-02: Niveles y consumo de reactivos químicos
--  ppm y costo_operativo se calculan en Python antes del INSERT
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ptar_registro_costos (
  id                  CHAR(36)       PRIMARY KEY DEFAULT (UUID()),
  created_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  turno               VARCHAR(20)    NOT NULL,
  usuario             VARCHAR(255)   NOT NULL,
  id_quimico          VARCHAR(10)    NOT NULL,        -- 'Q-01' … 'Q-05'
  nombre_quimico      VARCHAR(255)   NOT NULL,
  unidad              VARCHAR(10)    NOT NULL,        -- 'L' | 'kg'
  densidad_kg         DECIMAL(8,4)   NOT NULL,
  nivel_inicial       DECIMAL(12,3)  NOT NULL,
  nivel_final         DECIMAL(12,3)  NOT NULL,
  consumo             DECIMAL(12,3)  NOT NULL DEFAULT 0,
  kg_consumidos       DECIMAL(12,4)  NOT NULL DEFAULT 0,
  precio_kg           DECIMAL(12,2)  NOT NULL DEFAULT 0,
  ppm                 DECIMAL(12,4)  NULL,
  costo_operativo     DECIMAL(14,2)  NULL,
  horometro_inicial   DECIMAL(12,3)  NOT NULL DEFAULT 0,
  caudal_tratado_gem  DECIMAL(12,3)  NOT NULL DEFAULT 0,
  horas_operacion     DECIMAL(6,2)   NOT NULL DEFAULT 0,
  observaciones       TEXT           NULL,
  KEY idx_costos_fecha   (created_at),
  KEY idx_costos_quimico (id_quimico),
  KEY idx_costos_turno   (turno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ──────────────────────────────────────────────────────────────
--  F-03: Parámetros físico-químicos de calidad del agua
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ptar_registro_calidad (
  id                  CHAR(36)       PRIMARY KEY DEFAULT (UUID()),
  created_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha               DATE           NOT NULL,        -- fecha de la medición (YYYY-MM-DD)
  turno               VARCHAR(20)    NOT NULL,
  usuario             VARCHAR(255)   NOT NULL,
  unidad_tratamiento  VARCHAR(255)   NOT NULL,
  parametro           VARCHAR(255)   NOT NULL,
  unidad_medida       VARCHAR(100)   NOT NULL,
  valor               DECIMAL(12,4)  NULL,
  metodo              VARCHAR(255)   NULL,
  no_aplica           TINYINT(1)     NOT NULL DEFAULT 0,
  observaciones       TEXT           NULL,
  KEY idx_calidad_fecha  (fecha),
  KEY idx_calidad_param  (parametro),
  KEY idx_calidad_turno  (turno),
  KEY idx_calidad_unidad (unidad_tratamiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ──────────────────────────────────────────────────────────────
--  Mantenimientos Preventivos GFT
--  Datos sincronizados desde SharePoint CONFIABILIDAD
--  via Office365-REST-Python-Client (Python + credenciales usuario)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mantenimientos_preventivos (
  id                  INT            PRIMARY KEY AUTO_INCREMENT,
  sharepoint_id       INT            NOT NULL UNIQUE,   -- ID de la lista SharePoint
  semana              TINYINT        NULL,
  gerencia            VARCHAR(100)   NULL,
  area                VARCHAR(100)   NULL,
  gft                 VARCHAR(100)   NULL,
  objeto              VARCHAR(255)   NULL,
  af                  VARCHAR(100)   NULL,
  descripcion         VARCHAR(500)   NULL,
  tipo_mantenimiento  VARCHAR(100)   NULL,
  frecuencia          VARCHAR(50)    NULL,
  responsable         VARCHAR(255)   NULL,
  pedido_de_trabajo   VARCHAR(100)   NULL,
  criticidad          VARCHAR(50)    NULL,    -- ALTA | MEDIA | BAJA
  estado              VARCHAR(50)    NULL,    -- PENDIENTE | COMPLETADO | EN PROCESO
  dia_programado      DATE           NULL,
  asignado_a          VARCHAR(255)   NULL,
  observaciones       TEXT           NULL,
  ultima_sync         DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                     ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_mtto_semana    (semana),
  KEY idx_mtto_estado    (estado),
  KEY idx_mtto_area      (area),
  KEY idx_mtto_critico   (criticidad),
  KEY idx_mtto_dia       (dia_programado),
  KEY idx_mtto_sync      (ultima_sync)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
