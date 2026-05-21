-- =====================================================================
-- Esquema PTAR 2 - Permoda  (BD: ptar_permoda)
-- =====================================================================

USE ptar_permoda;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Catalogos
-- ---------------------------------------------------------------------

DROP TABLE IF EXISTS producto_quimico;
CREATE TABLE producto_quimico (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  codigo          VARCHAR(50)  UNIQUE,
  nombre          VARCHAR(100) NOT NULL UNIQUE,
  sistema         ENUM('GEM','RO','PTAP','OTRO') NOT NULL DEFAULT 'GEM',
  funcion         VARCHAR(255),
  densidad_g_ml   DECIMAL(8,4),
  unidad_inv      ENUM('L','KG') NOT NULL DEFAULT 'L',
  precio_kg       DECIMAL(12,2),
  activo          BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

DROP TABLE IF EXISTS unidad_tratamiento;
CREATE TABLE unidad_tratamiento (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  codigo       VARCHAR(30)  UNIQUE NOT NULL,
  nombre       VARCHAR(100) NOT NULL,
  orden_tren   TINYINT,
  descripcion  TEXT
) ENGINE=InnoDB;

DROP TABLE IF EXISTS parametro_calidad;
CREATE TABLE parametro_calidad (
  id                       INT AUTO_INCREMENT PRIMARY KEY,
  codigo                   VARCHAR(30)  UNIQUE NOT NULL,
  nombre                   VARCHAR(100) NOT NULL,
  unidad                   VARCHAR(30),
  limite_vertimiento_min   DECIMAL(12,4),
  limite_vertimiento_max   DECIMAL(12,4),
  notas                    VARCHAR(255)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Operacion GEM por turno  (hoja "INVENTARIO Y CONSUMO GEM")
-- ---------------------------------------------------------------------

DROP TABLE IF EXISTS operacion_gem_turno;
CREATE TABLE operacion_gem_turno (
  id                              INT AUTO_INCREMENT PRIMARY KEY,
  fecha                           DATE NOT NULL,
  dia_mes                         TINYINT NOT NULL,
  turno                           TINYINT NOT NULL,
  turno_descripcion               VARCHAR(20),
  diligencia_bitacora             VARCHAR(50),

  -- inventarios fin de turno
  final_acido_l                   DECIMAL(12,2),
  final_coagulante_l              DECIMAL(12,2),
  final_decolorante_l             DECIMAL(12,2),
  final_pol_anionico_kg           DECIMAL(12,2),
  final_pol_cationico_kg          DECIMAL(12,2),

  -- operacion
  horometro_inicial               INT,
  caudal_total_tratado_gem_m3     DECIMAL(12,2),
  caudal_tratamiento_m3h          DECIMAL(10,2),

  -- consumo del turno
  consumo_acido_l                 DECIMAL(12,2),
  consumo_coagulante_l            DECIMAL(12,2),
  consumo_decolorante_l           DECIMAL(12,2),
  consumo_pol_anionico_kg         DECIMAL(12,2),
  consumo_pol_cationico_kg        DECIMAL(12,2),

  -- consumo convertido a kg
  kg_acido                        DECIMAL(12,4),
  kg_coagulante                   DECIMAL(12,4),
  kg_decolorante                  DECIMAL(12,4),
  kg_pol_anionico                 DECIMAL(12,4),
  kg_pol_cationico                DECIMAL(12,4),

  -- dosis PPM
  ppm_acido                       DECIMAL(12,4),
  ppm_coagulante                  DECIMAL(12,4),
  ppm_decolorante                 DECIMAL(12,4),
  ppm_pol_anionico                DECIMAL(12,4),
  ppm_pol_cationico               DECIMAL(12,4),

  -- costos
  costo_op_acido                  DECIMAL(14,2),
  costo_op_coagulante             DECIMAL(14,2),
  costo_op_decolorante            DECIMAL(14,2),
  costo_op_anionico               DECIMAL(14,2),
  costo_op_cationico              DECIMAL(14,2),
  costo_quimica_turno             DECIMAL(14,2),
  limite_indicador_m3             DECIMAL(12,2),
  pesos_por_m3                    DECIMAL(14,4),

  observaciones                   TEXT,

  UNIQUE KEY uk_gem_fecha_turno (fecha, turno),
  KEY idx_gem_fecha (fecha)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Operacion RO por turno (hoja "REGISTRO RO")
-- ---------------------------------------------------------------------

DROP TABLE IF EXISTS operacion_ro_turno;
CREATE TABLE operacion_ro_turno (
  id                          INT AUTO_INCREMENT PRIMARY KEY,
  fecha                       DATE NOT NULL,
  dia_mes                     TINYINT NOT NULL,
  turno                       TINYINT NOT NULL,
  turno_descripcion           VARCHAR(20),

  -- ml/g aplicados (cabecera HCL / Kuriverter / Vitec / NaOH / Bisulfito)
  aplic_hcl                   DECIMAL(12,2),
  aplic_kuriverter            DECIMAL(12,2),
  aplic_vitec                 DECIMAL(12,2),
  aplic_naoh                  DECIMAL(12,2),
  aplic_bisulfito             DECIMAL(12,2),

  tiempo_operacion_min        INT,

  -- lecturas cm
  cm_hcl                      DECIMAL(12,2),
  cm_ik220                    DECIMAL(12,2),
  cm_vitec7000                DECIMAL(12,2),
  cm_naoh                     DECIMAL(12,2),
  cm_bisulfito                DECIMAL(12,2),

  -- inventario residual L
  inv_l_hcl                   DECIMAL(12,4),
  inv_l_kuriverter            DECIMAL(12,4),
  inv_l_vitec                 DECIMAL(12,4),
  inv_l_naoh                  DECIMAL(12,4),
  inv_l_bisulfito             DECIMAL(12,4),

  -- consumo L
  consumo_l_hcl               DECIMAL(12,4),
  consumo_l_kuriverter        DECIMAL(12,4),
  consumo_l_vitec             DECIMAL(12,4),
  consumo_l_naoh              DECIMAL(12,4),
  consumo_l_bisulfito         DECIMAL(12,4),

  -- consumo kg
  consumo_kg_hcl              DECIMAL(12,4),
  consumo_kg_kuriverter       DECIMAL(12,4),
  consumo_kg_vitec            DECIMAL(12,4),
  consumo_kg_naoh             DECIMAL(12,4),
  consumo_kg_bisulfito        DECIMAL(12,4),

  volumen_enviado_ro_m3       DECIMAL(12,2),

  -- ppm
  ppm_hcl                     DECIMAL(12,4),
  ppm_kuriverter              DECIMAL(12,4),
  ppm_vitec                   DECIMAL(12,4),
  ppm_naoh                    DECIMAL(12,4),
  ppm_bisulfito               DECIMAL(12,4),

  -- costos
  costo_op_hcl                DECIMAL(14,2),
  costo_op_kuriverter         DECIMAL(14,2),
  costo_op_vitec              DECIMAL(14,2),
  costo_op_naoh               DECIMAL(14,2),
  costo_op_bisulfito          DECIMAL(14,2),
  costo_quimica_turno         DECIMAL(14,2),
  limite_indicador_m3         DECIMAL(12,2),
  pesos_m3_enviado_ro         DECIMAL(14,4),
  pesos_m3_rechazo            DECIMAL(14,4),
  pesos_m3_permeado_ro        DECIMAL(14,4),

  observaciones               TEXT,

  UNIQUE KEY uk_ro_fecha_turno (fecha, turno),
  KEY idx_ro_fecha (fecha)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Mediciones de calidad (turno x parametro x unidad)
-- ---------------------------------------------------------------------

DROP TABLE IF EXISTS medicion_calidad;
CREATE TABLE medicion_calidad (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  fecha           DATE NOT NULL,
  turno           TINYINT NOT NULL,
  parametro_id    INT NOT NULL,
  unidad_id       INT NOT NULL,
  valor           DECIMAL(18,6),
  observacion     VARCHAR(255),
  CONSTRAINT fk_mc_param  FOREIGN KEY (parametro_id) REFERENCES parametro_calidad(id),
  CONSTRAINT fk_mc_unidad FOREIGN KEY (unidad_id)    REFERENCES unidad_tratamiento(id),
  UNIQUE KEY uk_mc (fecha, turno, parametro_id, unidad_id),
  KEY idx_mc_fecha (fecha),
  KEY idx_mc_param (parametro_id),
  KEY idx_mc_unidad (unidad_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Consolidado consumo mensual por producto (hoja "Consumos")
-- ---------------------------------------------------------------------

DROP TABLE IF EXISTS consumo_quimico_mensual;
CREATE TABLE consumo_quimico_mensual (
  id                       INT AUTO_INCREMENT PRIMARY KEY,
  anio                     SMALLINT NOT NULL,
  mes                      TINYINT  NOT NULL,
  sistema                  ENUM('GEM','RO','PTAP','OTRO') NOT NULL,
  producto                 VARCHAR(100) NOT NULL,
  kg_consumidos            DECIMAL(14,2),
  kg_promedio_diario       DECIMAL(14,4),
  costo_mes                DECIMAL(16,2),
  costo_promedio_diario    DECIMAL(16,2),
  indicador_pesos_m3       DECIMAL(12,4),
  UNIQUE KEY uk_consumo (anio, mes, sistema, producto),
  KEY idx_consumo_periodo (anio, mes)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Seguimiento mensual proyeccion vs real (varias hojas del Excel maestro)
-- ---------------------------------------------------------------------

DROP TABLE IF EXISTS seguimiento_proyeccion_real;
CREATE TABLE seguimiento_proyeccion_real (
  id                       INT AUTO_INCREMENT PRIMARY KEY,
  anio                     SMALLINT NOT NULL,
  mes                      TINYINT  NOT NULL,
  hoja_origen              VARCHAR(50) NOT NULL,
  categoria                VARCHAR(100),
  indicador                VARCHAR(255) NOT NULL,
  unidad                   VARCHAR(50),
  meta_ref                 VARCHAR(100),
  proyectado               DECIMAL(20,4),
  real_valor               DECIMAL(20,4),
  desviacion               DECIMAL(20,4),
  porcentaje_cumplimiento  DECIMAL(10,2),
  UNIQUE KEY uk_seg (anio, mes, hoja_origen, indicador),
  KEY idx_seg_periodo (anio, mes)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Catalogo de medidores  (adoptado de contadores_ptar_mysql.sql)
-- col_excel: indice 1-based de la columna en el Excel fuente (para loader)
-- ---------------------------------------------------------------------

DROP TABLE IF EXISTS medidor;
CREATE TABLE medidor (
  id              TINYINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  codigo_columna  VARCHAR(60)       NOT NULL  COMMENT 'Nombre de campo en contadores_lectura',
  nombre_completo VARCHAR(200)      NOT NULL  COMMENT 'Nombre original del Excel',
  area            VARCHAR(80)       NULL      COMMENT 'Area o sistema al que pertenece',
  diametro        VARCHAR(15)       NULL      COMMENT 'Diametro de la linea (6", 4", 3", 1/2"...)',
  tipo_agua       ENUM('potable','reuso','proceso','retorno','permeado_ro','caliente','otro')
                                    NOT NULL  DEFAULT 'potable',
  col_excel       TINYINT UNSIGNED  NOT NULL  COMMENT 'Indice columna Excel 1-based (C=3..AK=37)',
  unidad          CHAR(3)           NOT NULL  DEFAULT 'm3',
  activo          TINYINT(1)        NOT NULL  DEFAULT 1,
  notas           TEXT              NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_medidor_columna (codigo_columna),
  UNIQUE KEY uq_medidor_col_excel (col_excel)
) ENGINE=InnoDB
  COMMENT='Catalogo de 35 contadores fisicos instalados en PTAR 2';

-- ---------------------------------------------------------------------
-- Lecturas acumuladas por turno (formato ANCHO — 1 fila por fecha+turno)
-- Valores en BIGINT UNSIGNED: odometros enteros, sin decimales
-- ---------------------------------------------------------------------

DROP TABLE IF EXISTS contadores_lectura;
CREATE TABLE contadores_lectura (
  id                                BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,

  -- Identificadores temporales
  fecha                             DATE              NOT NULL,
  turno                             TINYINT UNSIGNED  NOT NULL  COMMENT '1=10PM-6AM | 2=6AM-2PM | 3=2PM-10PM',
  hora_lectura                      TIME              NOT NULL  COMMENT '22:00=T1 | 06:00=T2 | 14:00=T3',

  -- Acueducto / Agua Potable
  entrada_ap_principal_6in          BIGINT UNSIGNED   NULL,
  entrada_ap_fria_lavanderia_4in    BIGINT UNSIGNED   NULL,
  entrada_ap_lab_lavanderia         BIGINT UNSIGNED   NULL,
  entrada_ap_fria_tintoreria_4in    BIGINT UNSIGNED   NULL,
  entrada_ap_rotativa_3in           BIGINT UNSIGNED   NULL,
  entrada_ap_tintoreria_6in         BIGINT UNSIGNED   NULL  COMMENT '100% nulo en 2026',
  entrada_ap_ptar2_acueducto        BIGINT UNSIGNED   NULL,
  entrada_ap_puerta2_acueducto      BIGINT UNSIGNED   NULL,
  entrada_ap_puerta4_acueducto      BIGINT UNSIGNED   NULL,
  entrada_ap_puerta5_acueducto      BIGINT UNSIGNED   NULL,
  entrada_ap_puerta6_acueducto      BIGINT UNSIGNED   NULL  COMMENT '100% nulo en 2026',
  entrada_ap_puerta7_acueducto      BIGINT UNSIGNED   NULL,
  entrada_ap_caldera_acueducto      BIGINT UNSIGNED   NULL,
  entrada_ap_quimicos               BIGINT UNSIGNED   NULL,
  entrada_ap_lavanderia_acueducto   BIGINT UNSIGNED   NULL,
  entrada_ap_zona_lodos_acueducto   BIGINT UNSIGNED   NULL,

  -- Proceso / Produccion
  entrada_medidor_rojo_tintoreria_4in  BIGINT UNSIGNED NULL,
  entrada_medidor_rojo_lavanderia_4in  BIGINT UNSIGNED NULL,
  rama                              BIGINT UNSIGNED   NULL,
  abridora_1                        BIGINT UNSIGNED   NULL,
  abridora_2                        BIGINT UNSIGNED   NULL,

  -- Agua caliente
  agua_caliente_tintoreria          BIGINT UNSIGNED   NULL,
  medidor_prueba_agua_caliente      BIGINT UNSIGNED   NULL,

  -- Reuso / PTAR
  tanque_reuso_2in                  BIGINT UNSIGNED   NULL,
  ptar                              BIGINT UNSIGNED   NULL,
  envio_th                          BIGINT UNSIGNED   NULL,

  -- Osmosis Inversa
  entrada_ro1                       BIGINT UNSIGNED   NULL,
  salida_ro1                        BIGINT UNSIGNED   NULL,
  entrada_ro2                       BIGINT UNSIGNED   NULL,
  salida_ro2                        BIGINT UNSIGNED   NULL,

  -- Sistema biologico MBR
  mbr1                              BIGINT UNSIGNED   NULL,
  mbr2                              BIGINT UNSIGNED   NULL,

  -- PTAP
  ingreso_uf_ptap                   BIGINT UNSIGNED   NULL,
  salida_uf_ptap                    BIGINT UNSIGNED   NULL,

  -- Retorno / Recirculacion
  medidor_verde_retorno             BIGINT UNSIGNED   NULL,

  -- Metadatos
  creado_en                         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en                    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_fecha_turno (fecha, turno),
  KEY idx_fecha (fecha),
  CONSTRAINT chk_turno CHECK (turno IN (1, 2, 3)),
  CONSTRAINT chk_hora_turno CHECK (
      (turno = 1 AND hora_lectura = '22:00:00')
   OR (turno = 2 AND hora_lectura = '06:00:00')
   OR (turno = 3 AND hora_lectura = '14:00:00')
  )
) ENGINE=InnoDB
  COMMENT='Lecturas acumuladas (odometro) de 35 contadores por fecha+turno — PTAR 2 2026';

-- ---------------------------------------------------------------------
-- Consumos calculados por turno (delta entre lecturas consecutivas)
-- Incluye KPIs operativos: L/kg tela, L/unidad efectiva, rollover flag
-- ---------------------------------------------------------------------

DROP TABLE IF EXISTS consumo_turno;
CREATE TABLE consumo_turno (
  id                                BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,
  fecha                             DATE              NOT NULL,
  turno                             TINYINT UNSIGNED  NOT NULL,
  operario                          VARCHAR(60)       NULL,

  -- Consumos delta (m3 = lectura_actual - lectura_anterior por turno)
  cons_entrada_ap_principal_6in         DECIMAL(10,2) NULL,
  cons_entrada_ap_fria_lavanderia_4in   DECIMAL(10,2) NULL,
  cons_entrada_ap_lab_lavanderia        DECIMAL(10,2) NULL,
  cons_entrada_ap_fria_tintoreria_4in   DECIMAL(10,2) NULL,
  cons_entrada_ap_rotativa_3in          DECIMAL(10,2) NULL,
  cons_entrada_ap_tintoreria_6in        DECIMAL(10,2) NULL,
  cons_entrada_ap_ptar2_acueducto       DECIMAL(10,2) NULL,
  cons_entrada_ap_puerta2_acueducto     DECIMAL(10,2) NULL,
  cons_entrada_ap_puerta4_acueducto     DECIMAL(10,2) NULL,
  cons_entrada_ap_puerta5_acueducto     DECIMAL(10,2) NULL,
  cons_entrada_ap_puerta6_acueducto     DECIMAL(10,2) NULL,
  cons_entrada_ap_puerta7_acueducto     DECIMAL(10,2) NULL,
  cons_entrada_ap_caldera_acueducto     DECIMAL(10,2) NULL,
  cons_entrada_ap_quimicos              DECIMAL(10,2) NULL,
  cons_entrada_ap_lavanderia_acueducto  DECIMAL(10,2) NULL,
  cons_entrada_ap_zona_lodos_acueducto  DECIMAL(10,2) NULL,
  cons_entrada_medidor_rojo_tintoreria  DECIMAL(10,2) NULL,
  cons_entrada_medidor_rojo_lavanderia  DECIMAL(10,2) NULL,
  cons_rama                             DECIMAL(10,2) NULL,
  cons_abridora_1                       DECIMAL(10,2) NULL,
  cons_abridora_2                       DECIMAL(10,2) NULL,
  cons_agua_caliente_tintoreria         DECIMAL(10,2) NULL,
  cons_medidor_prueba_agua_caliente     DECIMAL(10,2) NULL,
  cons_tanque_reuso_2in                 DECIMAL(10,2) NULL,
  cons_ptar                             DECIMAL(10,2) NULL,
  cons_envio_th                         DECIMAL(10,2) NULL,
  cons_entrada_ro1                      DECIMAL(10,2) NULL,
  cons_salida_ro1                       DECIMAL(10,2) NULL,
  cons_entrada_ro2                      DECIMAL(10,2) NULL,
  cons_salida_ro2                       DECIMAL(10,2) NULL,
  cons_mbr1                             DECIMAL(10,2) NULL,
  cons_mbr2                             DECIMAL(10,2) NULL,
  cons_ingreso_uf_ptap                  DECIMAL(10,2) NULL,
  cons_salida_uf_ptap                   DECIMAL(10,2) NULL,
  cons_medidor_verde_retorno            DECIMAL(10,2) NULL,

  -- KPIs operativos (de la hoja PRUEBA MARZO)
  cons_total_produccion_m3          DECIMAL(10,2) NULL  COMMENT 'Consumo total produccion (tintoreria + lavanderia)',
  cons_tintoreria_m3                DECIMAL(10,2) NULL,
  cons_lavanderia_m3                DECIMAL(10,2) NULL,
  kg_tintoreria                     DECIMAL(10,2) NULL,
  unidades_lavanderia               DECIMAL(10,2) NULL,
  indicador_tintoreria_l_kg         DECIMAL(10,4) NULL  COMMENT 'L/kg tela',
  indicador_lavanderia_l_und        DECIMAL(10,4) NULL  COMMENT 'L/unidad efectiva',

  -- Control de calidad
  rollover_detectado                TINYINT(1)    NOT NULL DEFAULT 0
      COMMENT '1 si algun contador bajo respecto al turno anterior',
  notas                             TEXT          NULL,

  creado_en                         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en                    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_consumo_fecha_turno (fecha, turno),
  KEY idx_consumo_fecha (fecha),
  CONSTRAINT chk_consumo_turno CHECK (turno IN (1, 2, 3))
) ENGINE=InnoDB
  COMMENT='Consumos calculados por turno (delta de lecturas acumuladas) + KPIs operativos';

-- Vista: etiqueta legible de turno
DROP VIEW IF EXISTS lecturas_con_turno;
CREATE VIEW lecturas_con_turno AS
SELECT id, fecha, turno,
       CASE turno WHEN 1 THEN '10PM-6AM' WHEN 2 THEN '6AM-2PM' WHEN 3 THEN '2PM-10PM' END AS turno_descripcion,
       hora_lectura,
       entrada_ap_principal_6in, entrada_ap_fria_lavanderia_4in, entrada_ap_lab_lavanderia,
       entrada_ap_fria_tintoreria_4in, entrada_ap_rotativa_3in, entrada_ap_ptar2_acueducto,
       entrada_ap_puerta2_acueducto, entrada_ap_puerta4_acueducto, entrada_ap_puerta5_acueducto,
       entrada_ap_puerta7_acueducto, entrada_ap_caldera_acueducto, entrada_ap_quimicos,
       entrada_ap_lavanderia_acueducto, entrada_ap_zona_lodos_acueducto,
       entrada_medidor_rojo_tintoreria_4in, entrada_medidor_rojo_lavanderia_4in,
       rama, abridora_1, abridora_2, agua_caliente_tintoreria, medidor_prueba_agua_caliente,
       tanque_reuso_2in, ptar, envio_th,
       entrada_ro1, salida_ro1, entrada_ro2, salida_ro2,
       mbr1, mbr2, ingreso_uf_ptap, salida_uf_ptap, medidor_verde_retorno
  FROM contadores_lectura;

-- ---------------------------------------------------------------------
-- Catalogos: carga inicial
-- ---------------------------------------------------------------------

INSERT INTO producto_quimico (codigo, nombre, sistema, funcion, unidad_inv, densidad_g_ml, precio_kg) VALUES
 ('COF280','ACIDO','GEM','Acidificante (ajuste pH Tanque Pulmon)','L', 1.300,   830),
 ('COF235','COAGULANTE','GEM','Coagulante - remocion SST y color','L', 1.325, 2818),
 ('COF255','DECOLORANTE','GEM','Decolorante textiles','L',                1.250, 6295),
 ('COF440','POLIMERO ANIONICO','GEM','Floculante anionico','KG',          NULL, 19050),
 ('COF494','POLIMERO CATIONICO','GEM','Floculante cationico','KG',        NULL, 22050),
 (NULL,    'HCL 10%','RO','Limpieza CIP membranas RO','L',                1.180,  1550),
 (NULL,    'KURIVERTER IK-220','RO','Biocida RO','L',                     1.280, 19160),
 (NULL,    'VITEC 7000','RO','Antiincrustante RO','L',                    1.200, 36239),
 (NULL,    'HIDROXIDO DE SODIO','RO','Limpieza alcalina CIP','KG',        1.530,  1560),
 (NULL,    'BISULFITO DE SODIO','RO','Reductor cloro previo a RO','KG',   1.200,  3640),
 (NULL,    'HIPOCLORITO SODIO','OTRO','Desinfeccion','L',                 NULL,   NULL),
 (NULL,    'SODA CAUSTICA','OTRO','Ajuste alcalinidad','KG',              NULL,   NULL);

INSERT INTO unidad_tratamiento (codigo, nombre, orden_tren, descripcion) VALUES
 ('PULMON',      'Tanque Pulmon',              1, 'Recepcion agua residual cruda del proceso textil'),
 ('HOMO',        'Tanque Homogeneizador',      2, 'Entrada al GEM'),
 ('GEM_SAL',     'GEM Salida',                 3, 'Salida del sistema coagulacion-floculacion'),
 ('ANOXICO',     'Reactor Anoxico',            4, 'Desnitrificacion'),
 ('MBBR',        'Reactor MBBR',               5, 'Biomasa en soportes moviles'),
 ('MBR1_INT',    'MBR 1 Interno',              6, 'Licor mezcla 9000-15000 mg/L SST'),
 ('MBR2_INT',    'MBR 2 Interno',              7, 'Licor mezcla 9000-15000 mg/L SST'),
 ('MBR1_PER',    'MBR 1 Permeado',             8, 'Salida filtrada membrana 1'),
 ('MBR2_PER',    'MBR 2 Permeado',             9, 'Salida filtrada membrana 2'),
 ('VERTIMIENTO', 'Vertimiento',               10, 'Descarga final + rechazo RO'),
 ('RO1_COMP',    'RO 1 Compuesta',            11, 'Linea RO 1 muestra compuesta'),
 ('RO1_E1',      'RO 1 Etapa 1',              12, 'Linea RO 1 primera etapa'),
 ('RO1_E2',      'RO 1 Etapa 2',              13, 'Linea RO 1 segunda etapa'),
 ('RO2_PER',     'RO 2 Permeado',             14, 'Linea RO 2 permeado'),
 ('RO_RECHAZO',  'RO Rechazo',                15, 'Rechazo de la RO -> vertimiento');

INSERT INTO parametro_calidad (codigo, nombre, unidad, limite_vertimiento_min, limite_vertimiento_max, notas) VALUES
 ('TEMP','Temperatura','C',                    NULL, 40,    'Res 0631/2015 Art 13'),
 ('PH',  'pH',         'unid pH',              5,    9,     'Res 0631/2015 Art 13'),
 ('DQO', 'DQO',        'mg/L',                 NULL, 600,   'Res 0631/2015 Art 13'),
 ('SST', 'SST',        'mg/L',                 NULL, 75,    'Res 0631/2015 Art 13'),
 ('SS',  'Solidos Sedimentables','mL/L',       NULL, 3,     'Res 0631/2015 Art 13'),
 ('CL',  'Cloruros',   'mg/L',                 NULL, 1200,  'Res 0631/2015 Art 13'),
 ('COND','Conductividad','uS/cm',              NULL, NULL,  'Sin limite normativo'),
 ('TDS', 'TDS',        'mg/L',                 NULL, NULL,  'Sin limite normativo'),
 ('COLOR','Color',     'UPTCO',                NULL, NULL,  'Sin limite numerico'),
 ('SST_GRAV','SST Gravimetrico','mg/L',        NULL, NULL,  'Complementario'),
 ('FE',  'Hierro',     'mg/L',                 NULL, NULL,  ''),
 ('P',   'Fosforo',    'mg/L',                 NULL, NULL,  ''),
 ('N',   'Nitrogeno',  'mg/L',                 NULL, NULL,  ''),
 ('SO4', 'Sulfatos',   'mg/L',                 NULL, NULL,  ''),
 ('SIO2','Silice',     'mg/L',                 NULL, NULL,  ''),
 ('ORP', 'ORP',        'mV',                   NULL, NULL,  ''),
 ('CLR', 'Cloro residual','mg/L',              NULL, NULL,  ''),
 ('TURB','Turbidez',   'NTU',                  NULL, NULL,  ''),
 ('ALC', 'Alcalinidad','mg/L CaCO3',           NULL, NULL,  ''),
 ('DUR', 'Dureza',     'mg/L CaCO3',           NULL, NULL,  '');

-- Catalogo de medidores — 35 contadores fisicos PTAR 2
-- col_excel: indice 1-based de la columna en Contadores PTAR 2026.xlsx
-- Mapeo columna Excel → campo SQL documentado en contadores_ptar_mysql.sql seccion 6
INSERT INTO medidor (codigo_columna, nombre_completo, area, diametro, tipo_agua, col_excel, activo, notas) VALUES
-- Acueducto / Agua Potable
('entrada_ap_principal_6in',         'Contador Entrada Agua Potable Principal 6"',                           'Acueducto general',              '6"',   'potable',     3,  1, 'Medidor principal entrada planta'),
('entrada_ap_fria_lavanderia_4in',   'Contador Entrada Agua Potable Fria Lavanderia (4")',                   'Lavanderia',                     '4"',   'potable',     4,  1, NULL),
('entrada_ap_lab_lavanderia',        'Contador Entrada Agua Potable LAB Lavanderia',                         'Laboratorio Lavanderia',         NULL,   'potable',     5,  1, NULL),
('entrada_medidor_rojo_tintoreria_4in', 'Entrada Agua Medidor Rojo Tintoreria (4")',                         'Tintoreria',                     '4"',   'proceso',     6,  1, NULL),
('entrada_ap_fria_tintoreria_4in',   'Entrada Agua Potable Fria Tintoreria (4")',                            'Tintoreria',                     '4"',   'potable',     7,  1, NULL),
('entrada_medidor_rojo_lavanderia_4in', 'Entrada Agua Medidor Rojo Lavanderia (4")',                         'Lavanderia',                     '4"',   'proceso',     8,  1, NULL),
('rama',                             'Rama',                                                                  'Distribucion interna',           NULL,   'proceso',     9,  1, NULL),
('abridora_1',                       'Abridora 1',                                                            'Area abridoras',                 NULL,   'proceso',     10, 1, NULL),
('abridora_2',                       'Abridora 2',                                                            'Area abridoras',                 NULL,   'proceso',     11, 1, NULL),
('tanque_reuso_2in',                 'Tanque de Reuso (2")',                                                   'Reuso / Recirculacion',          '2"',   'reuso',       12, 1, 'Agua reutilizada hacia produccion'),
('ptar',                             'PTAR',                                                                   'PTAR 2 - entrada general',       NULL,   'proceso',     13, 1, 'Medidor contador entrada PTAR 2'),
('entrada_ro1',                      'Entrada RO #1',                                                          'Osmosis Inversa - RO 1',         NULL,   'proceso',     14, 1, NULL),
('salida_ro1',                       'Salida RO #1 (Permeado)',                                                'Osmosis Inversa - RO 1',         NULL,   'permeado_ro', 15, 1, NULL),
('entrada_ro2',                      'Entrada RO #2',                                                          'Osmosis Inversa - RO 2',         NULL,   'proceso',     16, 1, NULL),
('salida_ro2',                       'Salida RO #2 (Permeado)',                                                'Osmosis Inversa - RO 2',         NULL,   'permeado_ro', 17, 1, NULL),
('entrada_ap_rotativa_3in',          'Entrada Agua Potable Rotativa 3"',                                      'Area rotativa / general',        '3"',   'potable',     18, 1, NULL),
('medidor_verde_retorno',            'Medidor Verde Digital Retorno',                                          'Retorno / Recirculacion',        NULL,   'retorno',     19, 1, NULL),
('entrada_ap_tintoreria_6in',        'Contador Entrada Agua Potable Tintoreria 6"',                           'Tintoreria',                     '6"',   'potable',     20, 0, '100% nulo en 2026'),
('envio_th',                         'Envio a TH (Tanque Homogeneizador)',                                     'PTAR 2 - envio a tratamiento',   NULL,   'proceso',     21, 1, NULL),
('mbr1',                             'MBR 1',                                                                   'Reactor MBR 1',                  NULL,   'proceso',     22, 1, NULL),
('mbr2',                             'MBR 2',                                                                   'Reactor MBR 2',                  NULL,   'proceso',     23, 1, NULL),
('ingreso_uf_ptap',                  'Medidor de Ingreso UF PTAP',                                             'PTAP - entrada ultrafiltracion', NULL,   'proceso',     24, 1, NULL),
('salida_uf_ptap',                   'Medidor Salida UF PTAP',                                                 'PTAP - salida ultrafiltracion',  NULL,   'proceso',     25, 1, NULL),
('entrada_ap_ptar2_acueducto',       'Entrada Agua Potable PTAR 2 -(1/2") Tanque Recirculacion ACUEDUCTO',    'PTAR 2 / Tanque recirculacion',  '1/2"', 'potable',     26, 1, 'Cobertura ~58%'),
('entrada_ap_puerta4_acueducto',     'Entrada Agua Potable Puerta 4 ACUEDUCTO',                               'Acueducto - Puerta 4',           NULL,   'potable',     27, 1, 'Cobertura ~56%'),
('entrada_ap_quimicos',              'Entrada Agua Potable Cuarto Quimicos',                                   'Cuarto de quimicos',             NULL,   'potable',     28, 1, NULL),
('agua_caliente_tintoreria',         'Agua Caliente Tintoreria (DIGITAL)',                                     'Tintoreria',                     NULL,   'caliente',    29, 1, NULL),
('medidor_prueba_agua_caliente',     'Medidor Prueba Agua Caliente',                                           'Tintoreria - prueba',            NULL,   'caliente',    30, 1, 'Cobertura ~81%'),
('entrada_ap_puerta2_acueducto',     'Entrada Agua Potable Puerta 2 ACUEDUCTO',                               'Acueducto - Puerta 2',           NULL,   'potable',     31, 1, 'Cobertura ~51%'),
('entrada_ap_caldera_acueducto',     'Entrada Agua Potable Caldera ACUEDUCTO',                                'Caldera',                        NULL,   'potable',     32, 1, 'Cobertura ~51%'),
('entrada_ap_puerta5_acueducto',     'Entrada Agua Potable Puerta 5 ACUEDUCTO',                               'Acueducto - Puerta 5',           NULL,   'potable',     33, 1, 'Cobertura ~51%'),
('entrada_ap_puerta6_acueducto',     'Entrada Agua Potable Puerta 6 ACUEDUCTO',                               'Acueducto - Puerta 6',           NULL,   'potable',     34, 0, '100% nulo en 2026'),
('entrada_ap_puerta7_acueducto',     'Entrada Agua Potable Puerta 7 ACUEDUCTO',                               'Acueducto - Puerta 7',           NULL,   'potable',     35, 1, 'Cobertura ~51%'),
('entrada_ap_lavanderia_acueducto',  'Entrada Agua Potable 1/2" - Lavanderia ACUEDUCTO',                      'Lavanderia',                     '1/2"', 'potable',     36, 1, 'Cobertura ~53%'),
('entrada_ap_zona_lodos_acueducto',  'Entrada Agua Potable Zona de Lodos 1/2" (Lava Ojos) ACUEDUCTO',        'Zona lodos / Lava ojos',         '1/2"', 'potable',     37, 1, 'Cobertura ~51%');

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'OK schema cargado' AS status,
       (SELECT COUNT(*) FROM producto_quimico)    AS productos_quimicos,
       (SELECT COUNT(*) FROM unidad_tratamiento)  AS unidades_tren,
       (SELECT COUNT(*) FROM parametro_calidad)   AS parametros_calidad,
       (SELECT COUNT(*) FROM medidor)             AS medidores_contador;
