-- ============================================================
--  Tabla operacion_ptap_turno — Química PTAP por turno
--  Estructura que espera ptar-backend/app/routes/reactivos.py
--  Ejecutar: mysql -u root -p ptar_permoda < operacion_ptap_turno.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS operacion_ptap_turno (
  id                              INT AUTO_INCREMENT PRIMARY KEY,
  fecha                           DATE NOT NULL,
  dia_mes                         TINYINT NOT NULL,
  turno                           TINYINT NOT NULL,
  usuario                         VARCHAR(255),
  equipo                          TEXT,

  -- ── inventarios fin de turno (nivel_final de cada tanque) ──────────────
  final_pol_anionico_ptap_l       DECIMAL(12,2),   -- Q-09
  final_coagulante_ptap_l         DECIMAL(12,2),   -- Q-10
  final_acido_ptap_l              DECIMAL(12,2),   -- Q-11
  final_soda_l                    DECIMAL(12,2),   -- Q-12
  final_peroxido_l                DECIMAL(12,2),   -- Q-13

  -- ── consumo del turno (L) ───────────────────────────────────────────────
  consumo_pol_anionico_ptap_l     DECIMAL(12,2),
  consumo_coagulante_ptap_l       DECIMAL(12,2),
  consumo_acido_ptap_l            DECIMAL(12,2),
  consumo_soda_l                  DECIMAL(12,2),
  consumo_peroxido_l              DECIMAL(12,2),

  -- ── consumo convertido a kg ─────────────────────────────────────────────
  kg_pol_anionico_ptap            DECIMAL(12,4),
  kg_coagulante_ptap              DECIMAL(12,4),
  kg_acido_ptap                   DECIMAL(12,4),
  kg_soda                         DECIMAL(12,4),
  kg_peroxido                     DECIMAL(12,4),

  -- ── dosis PPM ───────────────────────────────────────────────────────────
  ppm_pol_anionico_ptap           DECIMAL(12,4),
  ppm_coagulante_ptap             DECIMAL(12,4),
  ppm_acido_ptap                  DECIMAL(12,4),
  ppm_soda                        DECIMAL(12,4),
  ppm_peroxido                    DECIMAL(12,4),

  -- ── costos ──────────────────────────────────────────────────────────────
  costo_op_pol_anionico_ptap      DECIMAL(14,2),
  costo_op_coagulante_ptap        DECIMAL(14,2),
  costo_op_acido_ptap             DECIMAL(14,2),
  costo_op_soda                   DECIMAL(14,2),
  costo_op_peroxido               DECIMAL(14,2),

  observaciones                   TEXT,

  UNIQUE KEY uk_ptap_fecha_turno (fecha, turno),
  KEY idx_ptap_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
