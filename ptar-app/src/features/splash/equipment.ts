export type Status = 'operando' | 'advertencia' | 'alarma';

export interface EqDef {
  id:          string;
  label:       string;
  status:      Status;
  params:      [string, string][];
  vb?:         string;   // viewBox crop "x y w h" para zoom en modal
  chartParam?: number;   // índice en params[] a graficar (default 0)
}

export const SC: Record<Status, string> = { operando: '#3fb950', advertencia: '#d29922', alarma: '#f85149' };
export const SB: Record<Status, string> = { operando: '#0d2d1a', advertencia: '#2d1f08', alarma: '#2d0a0a' };
export const SL: Record<Status, string> = { operando: '● EN OPERACIÓN', advertencia: '▲ ADVERTENCIA', alarma: '✖ ALARMA' };

export const EQ: Record<string, EqDef> = {
  /* FASE PRELIMINAR */
  rotativa:    { id:'rot',     label:'Descarga Rotativa',           status:'operando',    params:[['Caudal','5.2 m³/h'],['SST','640 mg/L'],['pH','7.9']],
                 vb:'0 82 155 52', chartParam:0 },
  funza:       { id:'funza',   label:'Descarga Ext. Funza',         status:'advertencia', params:[['Caudal','6.0 m³/h'],['DQO','1800 mg/L'],['Color','alto']],
                 vb:'0 106 160 52', chartParam:0 },
  tintoreria:  { id:'tintor',  label:'Descarga Tintorería',         status:'operando',    params:[['Caudal','12.4 m³/h'],['pH','9.8'],['Temp.','42 °C']],
                 vb:'0 168 155 52', chartParam:0 },
  lavanderia:  { id:'lavand',  label:'Descarga Lavandería',         status:'operando',    params:[['Caudal','8.6 m³/h'],['Turb.','380 NTU'],['Temp.','38 °C']],
                 vb:'0 188 155 52', chartParam:0 },
  tk2m3:       { id:'tk2m3',   label:'TK Recepción 2 m³',          status:'operando',    params:[['Fuentes','Rotativa + Funza'],['Caudal E.','11 m³/h'],['Vol.','2 m³']],
                 vb:'80 88 100 80', chartParam:1 },
  tk30m3:      { id:'tk30m3',  label:'TK Recepción 30 m³',         status:'operando',    params:[['Fuentes','Tintorería + Lavand.'],['Caudal E.','25 m³/h'],['Vol.','30 m³']],
                 vb:'75 172 105 95', chartParam:1 },
  tk15m3:      { id:'tk15m3',  label:'TK Buffer Lav. Remota 15 m³',status:'operando',    params:[['Fuente','Lavandería (ramal E)'],['Caudal E.','3.8 m³/h'],['Vol.','15 m³']],
                 vb:'76 238 106 78', chartParam:1 },
  tk60m3:      { id:'tk60m3',  label:'TK Pulmón 60 m³',            status:'operando',    params:[['Nivel','72 %'],['Entrada G+H','≈ 40 m³/h'],['T. retención','1.5 h']],
                 vb:'152 132 135 158', chartParam:0 },
  /* FASE PRIMARIA */
  cribRot:     { id:'cribRot', label:'Criba Rotativa',              status:'operando',    params:[['Apertura','2 mm'],['Velocidad','4 rpm'],['Captura','35 kg/d']],
                 vb:'262 105 180 170', chartParam:2 },
  vibrat1:     { id:'vib1',    label:'Criba Vibratoria 1 (M1)',     status:'operando',    params:[['Apertura','0.5 mm'],['Frecuencia','50 Hz'],['Potencia','2.2 kW']],
                 vb:'370 72 175 168', chartParam:1 },
  vibrat2:     { id:'vib2',    label:'Criba Vibratoria 2 (M2)',     status:'operando',    params:[['Apertura','0.25 mm'],['Frecuencia','50 Hz'],['Potencia','2.2 kW']],
                 vb:'370 164 175 168', chartParam:1 },
  tkPulmon:    { id:'tkPulm',  label:'TK Pulmón',                   status:'operando',    params:[['Nivel','65 %'],['Entradas','N1+N2 cribas'],['Salidas','O → Torre, R → Cárcamo']],
                 vb:'508 140 148 175', chartParam:0 },
  torre:       { id:'torre',   label:'Torre de Enfriamiento',       status:'operando',    params:[['T entrada','44 °C'],['T salida','28 °C'],['P','Pérd. vapor']],
                 vb:'622 82 132 168', chartParam:0 },
  carcamo:     { id:'carc',    label:'Cárcamo',                     status:'operando',    params:[['Función','Colecta efluente'],['AK1','→ Fase Secundaria'],['Rebose','→ vertimiento']],
                 vb:'626 202 120 132', chartParam:0 },
  homogen:     { id:'homog',   label:'TK Homogeneizador 800 m³',   status:'operando',    params:[['Volumen','≈ 800 m³'],['pH ajust.','7.2'],['Entradas','Q + Ozono + Lixiviado']],
                 vb:'722 128 168 198', chartParam:1 },
  eqGem:       { id:'gem',     label:'Equipo GEM',                  status:'operando',    params:[['Tipo','Reactor fisicoquímico'],['Reactivos','5 dosificaciones'],['Salida','U → Swingmill']],
                 vb:'842 76 155 235', chartParam:0 },
  swingmill:   { id:'swing',   label:'Swingmill',                   status:'operando',    params:[['Función','Espesado de lodos'],['Salida W','Lodo deshidratado'],['Caudal','5 m³/h']],
                 vb:'955 170 145 145', chartParam:2 },
  /* FASE SECUNDARIA */
  tkPermeado:  { id:'tkPerm',  label:'TK Permeado',                 status:'operando',    params:[['Nivel','68 %'],['Entrada','AK1 desde Cárcamo'],['Rebose','AK1 → desborde']],
                 vb:'1052 128 148 168', chartParam:0 },
  mbrT:        { id:'mbrT',    label:'MBR T (Superior)',            status:'operando',    params:[['Flux','18 L/m²/h'],['TMP','-0.22 bar'],['Estado','en servicio']],
                 vb:'1252 92 158 152', chartParam:0 },
  mbrK:        { id:'mbrK',    label:'MBR K (Inferior)',            status:'advertencia', params:[['Flux','15 L/m²/h'],['TMP','-0.38 bar'],['CIP','próximo']],
                 vb:'1252 215 158 152', chartParam:0 },
  mbbr:        { id:'mbbr',    label:'Reactor MBBR',                status:'operando',    params:[['Llenado','65 %'],['MLSS','4 800 mg/L'],['OD','2.4 mg/L']],
                 vb:'1438 145 205 182', chartParam:2 },
  anoxic:      { id:'anox',    label:'Reactor Anóxico',             status:'operando',    params:[['OD','< 0.2 mg/L'],['NO₃⁻','8.4 mg/L'],['T. retención','4 h']],
                 vb:'1648 145 195 178', chartParam:1 },
  /* FASE VERTIMIENTO */
  tkVert:   { id:'tkVert',   label:'TK Permeado Vertimiento', status:'operando',    params:[['Función','Almacenamiento efluente tratado'],['Vol.','10 m³'],['DBO salida','< 5 mg/L']],
              vb:'1408 415 245 158', chartParam:1 },
  filtVert: { id:'filtVert', label:'Filtro Carbón Activado',  status:'operando',    params:[['Medio','Carbón granular GAC'],['Carga hidráulica','4 m/h'],['Turb. salida','< 1 NTU']],
              vb:'1418 522 156 168', chartParam:1 },
  /* FASE TERCIARIA */
  filtro5:     { id:'filt5',   label:'Filtros Cartucho 5 µm',      status:'operando',    params:[['ΔP','0.22 bar'],['Flujo','42 m³/h'],['Reemplazo','en 12 d']],
                 vb:'852 352 145 148', chartParam:1 },
  ro1e1:       { id:'ro1e1',   label:'Ósmosis Inversa RO1 – E1',   status:'operando',    params:[['Recuperación','58 %'],['TDS perm.','18 mg/L'],['Sales rej.','98.5 %']],
                 vb:'645 368 205 158', chartParam:0 },
  ro1e2:       { id:'ro1e2',   label:'Ósmosis Inversa RO1 – E2',   status:'operando',    params:[['Recuperación','62 %'],['TDS perm.','12 mg/L'],['Permeado AI','→ TK Recir.']],
                 vb:'480 368 205 158', chartParam:0 },
  ro2:         { id:'ro2',     label:'Ósmosis Inversa RO2',         status:'alarma',      params:[['TMP','0.65 bar'],['Fouling','detectable'],['CIP','programado']],
                 vb:'648 482 205 180', chartParam:0 },
  filtrosII:   { id:'filtII',  label:'Filtros Intercambio Iónico', status:'operando',    params:[['Entrada','AE desde Sec.'],['Resinas','en servicio'],['Salida AF','→ RO1']],
                 vb:'988 405 218 118', chartParam:0 },
  tkRecir:     { id:'tkRecir', label:'TK Recirculación',           status:'operando',    params:[['Vol.','30 m³'],['Fuentes','RO1 E2 + AQ/AR/AS'],['Salida','→ Producción']],
                 vb:'115 498 212 158', chartParam:0 },
  tkRechazo:   { id:'tkRech',  label:'TK Rechazo RO1',            status:'advertencia', params:[['Entrada AJ','Rechazo RO1 E2'],['AK','→ Filtro → RO2'],['Desborde','→ Caja Vert.']],
                 vb:'452 524 162 138', chartParam:0 },
  tkRechazoRO2:{ id:'tkRech2', label:'TK Rechazo RO2',            status:'advertencia', params:[['Entrada','Rechazo RO2'],['Salida','→ Caja Vertimiento'],['Caudal','6 m³/h']],
                 vb:'775 524 162 138', chartParam:2 },
  cajaVert:    { id:'cajaV',   label:'Caja Vertimiento Terc.',     status:'operando',    params:[['Destino','Fase Vertimiento'],['Pipe AT','→ VERT.'],['Caudal','8 m³/h']],
                 vb:'985 524 162 138', chartParam:2 },
  produccion:  { id:'prod',    label:'Producción REÚSO',           status:'operando',    params:[['Flujo','22 m³/h'],['Calidad','Textil ✓'],['Ahorro','$53k/mes']],
                 vb:'0 342 178 178', chartParam:0 },
};
