export type Status = 'operando' | 'advertencia' | 'alarma';

export interface EqDef { id: string; label: string; status: Status; params: [string, string][]; }

export const SC: Record<Status, string> = { operando: '#3fb950', advertencia: '#d29922', alarma: '#f85149' };
export const SB: Record<Status, string> = { operando: '#0d2d1a', advertencia: '#2d1f08', alarma: '#2d0a0a' };
export const SL: Record<Status, string> = { operando: '● EN OPERACIÓN', advertencia: '▲ ADVERTENCIA', alarma: '✖ ALARMA' };

export const EQ: Record<string, EqDef> = {
  /* FASE PRELIMINAR */
  rotativa:    { id:'rot',     label:'Descarga Rotativa',           status:'operando',    params:[['Caudal','5.2 m³/h'],['SST','640 mg/L'],['pH','7.9']] },
  funza:       { id:'funza',   label:'Descarga Ext. Funza',         status:'advertencia', params:[['Caudal','6.0 m³/h'],['DQO','1800 mg/L'],['Color','alto']] },
  tintoreria:  { id:'tintor',  label:'Descarga Tintorería',         status:'operando',    params:[['Caudal','12.4 m³/h'],['pH','9.8'],['Temp.','42 °C']] },
  lavanderia:  { id:'lavand',  label:'Descarga Lavandería',         status:'operando',    params:[['Caudal','8.6 m³/h'],['Turb.','380 NTU'],['Temp.','38 °C']] },
  tk2m3:       { id:'tk2m3',   label:'TK Recepción 2 m³',          status:'operando',    params:[['Fuentes','Rotativa + Funza'],['Caudal E.','11 m³/h'],['Vol.','2 m³']] },
  tk30m3:      { id:'tk30m3',  label:'TK Recepción 30 m³',         status:'operando',    params:[['Fuentes','Tintorería + Lavand.'],['Caudal E.','25 m³/h'],['Vol.','30 m³']] },
  tk15m3:      { id:'tk15m3',  label:'TK Buffer Lav. Remota 15 m³',status:'operando',    params:[['Fuente','Lavandería (ramal E)'],['Caudal E.','3.8 m³/h'],['Vol.','15 m³']] },
  tk60m3:      { id:'tk60m3',  label:'TK Pulmón 60 m³',            status:'operando',    params:[['Nivel','72 %'],['Entrada G+H','≈ 40 m³/h'],['T. retención','1.5 h']] },
  /* FASE PRIMARIA */
  cribRot:     { id:'cribRot', label:'Criba Rotativa',              status:'operando',    params:[['Apertura','2 mm'],['Velocidad','4 rpm'],['Captura','35 kg/d']] },
  vibrat1:     { id:'vib1',    label:'Criba Vibratoria 1 (M1)',     status:'operando',    params:[['Apertura','0.5 mm'],['Frecuencia','50 Hz'],['Potencia','2.2 kW']] },
  vibrat2:     { id:'vib2',    label:'Criba Vibratoria 2 (M2)',     status:'operando',    params:[['Apertura','0.25 mm'],['Frecuencia','50 Hz'],['Potencia','2.2 kW']] },
  tkPulmon:    { id:'tkPulm',  label:'TK Pulmón',                   status:'operando',    params:[['Nivel','65 %'],['Entradas','N1+N2 cribas'],['Salidas','O → Torre, R → Cárcamo']] },
  torre:       { id:'torre',   label:'Torre de Enfriamiento',       status:'operando',    params:[['T entrada','44 °C'],['T salida','28 °C'],['P','Pérd. vapor']] },
  carcamo:     { id:'carc',    label:'Cárcamo',                     status:'operando',    params:[['Función','Colecta efluente'],['AK1','→ Fase Secundaria'],['Rebose','→ vertimiento']] },
  homogen:     { id:'homog',   label:'TK Homogeneizador 800 m³',   status:'operando',    params:[['Volumen','≈ 800 m³'],['pH ajust.','7.2'],['Entradas','Q + Ozono + Lixiviado']] },
  eqGem:       { id:'gem',     label:'Equipo GEM',                  status:'operando',    params:[['Tipo','Reactor fisicoquímico'],['Reactivos','5 dosificaciones'],['Salida','U → Swingmill']] },
  swingmill:   { id:'swing',   label:'Swingmill',                   status:'operando',    params:[['Función','Espesado de lodos'],['Salida W','Lodo deshidratado'],['Caudal','5 m³/h']] },
  /* FASE SECUNDARIA */
  tkPermeado:  { id:'tkPerm',  label:'TK Permeado',                 status:'operando',    params:[['Nivel','68 %'],['Entrada','AK1 desde Cárcamo'],['Rebose','AK1 → desborde']] },
  mbrT:        { id:'mbrT',    label:'MBR T (Superior)',            status:'operando',    params:[['Flux','18 L/m²/h'],['TMP','-0.22 bar'],['Estado','en servicio']] },
  mbrK:        { id:'mbrK',    label:'MBR K (Inferior)',            status:'advertencia', params:[['Flux','15 L/m²/h'],['TMP','-0.38 bar'],['CIP','próximo']] },
  mbbr:        { id:'mbbr',    label:'Reactor MBBR',                status:'operando',    params:[['Llenado','65 %'],['MLSS','4 800 mg/L'],['OD','2.4 mg/L']] },
  anoxic:      { id:'anox',    label:'Reactor Anóxico',             status:'operando',    params:[['OD','< 0.2 mg/L'],['NO₃⁻','8.4 mg/L'],['T. retención','4 h']] },
  /* FASE VERTIMIENTO */
  tkVert:   { id:'tkVert',   label:'TK Permeado Vertimiento', status:'operando',    params:[['Función','Almacenamiento efluente tratado'],['Vol.','10 m³'],['DBO salida','< 5 mg/L']] },
  filtVert: { id:'filtVert', label:'Filtro Carbón Activado',  status:'operando',    params:[['Medio','Carbón granular GAC'],['Carga hidráulica','4 m/h'],['Turb. salida','< 1 NTU']] },
  /* FASE TERCIARIA */
  filtro5:     { id:'filt5',   label:'Filtros Cartucho 5 µm',      status:'operando',    params:[['ΔP','0.22 bar'],['Flujo','42 m³/h'],['Reemplazo','en 12 d']] },
  ro1e1:       { id:'ro1e1',   label:'Ósmosis Inversa RO1 – E1',   status:'operando',    params:[['Recuperación','58 %'],['TDS perm.','18 mg/L'],['Sales rej.','98.5 %']] },
  ro1e2:       { id:'ro1e2',   label:'Ósmosis Inversa RO1 – E2',   status:'operando',    params:[['Recuperación','62 %'],['TDS perm.','12 mg/L'],['Permeado AI','→ TK Recir.']] },
  ro2:         { id:'ro2',     label:'Ósmosis Inversa RO2',         status:'alarma',      params:[['TMP','↑ 0.65 bar'],['Fouling','detectable'],['CIP','programado']] },
  filtrosII:   { id:'filtII',  label:'Filtros Intercambio Iónico', status:'operando',    params:[['Entrada','AE desde Sec.'],['Resinas','en servicio'],['Salida AF','→ RO1']] },
  tkRecir:     { id:'tkRecir', label:'TK Recirculación',           status:'operando',    params:[['Vol.','30 m³'],['Fuentes','RO1 E2 + AQ/AR/AS'],['Salida','→ Producción']] },
  tkRechazo:   { id:'tkRech',  label:'TK Rechazo RO1',            status:'advertencia', params:[['Entrada AJ','Rechazo RO1 E2'],['AK','→ Filtro → RO2'],['Desborde','→ Caja Vert.']] },
  tkRechazoRO2:{ id:'tkRech2', label:'TK Rechazo RO2',            status:'advertencia', params:[['Entrada','Rechazo RO2'],['Salida','→ Caja Vertimiento'],['Caudal','6 m³/h']] },
  cajaVert:    { id:'cajaV',   label:'Caja Vertimiento Terc.',     status:'operando',    params:[['Destino','Fase Vertimiento'],['Pipe AT','→ VERT.'],['Caudal','8 m³/h']] },
  produccion:  { id:'prod',    label:'Producción REÚSO',           status:'operando',    params:[['Flujo','22 m³/h'],['Calidad','Textil ✓'],['Ahorro','$53k/mes']] },
};
