// Cliente HTTP para el backend FastAPI de PTAR.
// Reemplaza todas las llamadas directas a `supabase.from(...)`.

// En producción (dist servido desde FastAPI) VITE_API_URL debe estar vacío
// para que todas las llamadas usen rutas relativas (/api/...).
// En desarrollo, VITE_API_URL=http://localhost:8001 desde .env.development.
const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${body ? ': ' + body : ''}`);
  }
  return res.json() as Promise<T>;
}

// ─── Interfaces (espejo exacto de las tablas) ─────────────────────────────────

export interface RegistroContador {
  id?: string;
  created_at?: string;
  turno: 'mañana' | 'tarde' | 'noche';
  usuario: string;
  equipo?: string;           // JSON array de nombres del equipo en turno
  id_contador: string;
  nombre_contador: string;
  ubicacion: string;
  tipo_agua: string;
  lectura_anterior_m3: number;
  lectura_actual_m3: number;
  delta_m3?: number;
  observaciones?: string;
}

export interface RegistroCosto {
  id?: string;
  created_at?: string;
  turno: 'mañana' | 'tarde' | 'noche';
  usuario: string;
  equipo?: string;           // JSON array de nombres del equipo en turno
  id_quimico: string;
  nombre_quimico: string;
  unidad: string;
  densidad_kg: number;
  nivel_inicial: number;
  nivel_final: number;
  consumo?: number;
  kg_consumidos: number;
  precio_kg: number;
  ppm?: number;
  costo_operativo?: number;
  horometro_inicial: number;
  caudal_tratado_gem: number;
  horas_operacion: number;
  observaciones?: string;
  ingreso_coagulante_l?: number;
  trasegado_coagulante_ptap_l?: number;
}

export interface RegistroCalidad {
  id?: string;
  created_at?: string;
  fecha?: string;
  turno: 'mañana' | 'tarde' | 'noche';
  usuario: string;
  equipo?: string;           // JSON array de nombres del equipo en turno
  unidad_tratamiento: string;
  parametro: string;
  unidad_medida: string;
  valor?: number;
  no_aplica: boolean;
  observaciones?: string;
}

// ─── Caudales ─────────────────────────────────────────────────────────────────

export async function getUltimasLecturas(): Promise<Record<string, number>> {
  return request<Record<string, number>>('/api/caudales/ultimas-lecturas');
}

export async function createCaudalesBatch(
  rows: Omit<RegistroContador, 'id' | 'created_at' | 'delta_m3'>[],
): Promise<{ inserted: number }> {
  return request('/api/caudales/batch', { method: 'POST', body: JSON.stringify(rows) });
}

export async function getCaudalesRecientes(since: string, limit = 60): Promise<RegistroContador[]> {
  const params = new URLSearchParams({ since, limit: String(limit) });
  return request<RegistroContador[]>(`/api/caudales/?${params}`);
}

// ─── Reactivos ────────────────────────────────────────────────────────────────

export async function createReactivosBatch(
  rows: Omit<RegistroCosto, 'id' | 'created_at' | 'consumo' | 'ppm' | 'costo_operativo'>[],
): Promise<{ inserted: number }> {
  return request('/api/reactivos/batch', { method: 'POST', body: JSON.stringify(rows) });
}

export async function getReactivosRecientes(since: string, limit = 60): Promise<RegistroCosto[]> {
  const params = new URLSearchParams({ since, limit: String(limit) });
  return request<RegistroCosto[]>(`/api/reactivos/?${params}`);
}

export interface UltimoHorometro {
  horometro: number | null;
  fecha: string | null;
  turno: string | null;
}

export async function getUltimoHorometro(): Promise<UltimoHorometro> {
  return request<UltimoHorometro>('/api/reactivos/ultimo-horometro');
}

export interface UltimoNivel {
  nivel_final: number | null;
  fecha: string | null;
  turno: string | null;
}

export async function getUltimoNivel(quimico_id: string): Promise<UltimoNivel> {
  const q = new URLSearchParams({ quimico_id });
  return request<UltimoNivel>(`/api/reactivos/ultimo-nivel?${q}`);
}

// ─── Calidad ──────────────────────────────────────────────────────────────────

export async function createCalidadBatch(
  rows: Omit<RegistroCalidad, 'id' | 'created_at'>[],
): Promise<{ inserted: number }> {
  return request('/api/calidad/batch', { method: 'POST', body: JSON.stringify(rows) });
}

export async function getCalidadParametros(): Promise<{ id: number; nombre: string; unidad_medida: string }[]> {
  return request<{ id: number; nombre: string; unidad_medida: string }[]>('/api/calidad/parametros');
}

export interface UltimoValorCalidad {
  valor: number | null;
  fecha: string | null;
  turno: string | null;
}

export async function getUltimoValorCalidad(
  unidad_tratamiento: string,
  parametro: string
): Promise<UltimoValorCalidad> {
  const q = new URLSearchParams({ unidad_tratamiento, parametro });
  return request<UltimoValorCalidad>(`/api/calidad/ultimo-valor?${q}`);
}

const TURNO_STR_TO_INT: Record<string, string> = {
  'mañana': '1', 'manana': '1',
  'tarde':  '2',
  'noche':  '3',
};

/** Mediciones en formato largo — una fila por (fecha, turno, unidad_tratamiento) */
export interface MedicionCalidad {
  fecha: string;
  turno: string;           // 'mañana' | 'tarde' | 'noche'
  parametro: string;
  unidad_tratamiento: string;
  valor: number;
  metodo?: string;
  usuario: string;
}

export async function getCalidadMediciones(params: {
  parametro: string;
  fecha_inicio: string;
  fecha_fin: string;
  turno?: string;          // string de texto ('mañana'|'tarde'|'noche') — convertido a int internamente
  limit?: number;
}): Promise<MedicionCalidad[]> {
  const q = new URLSearchParams({
    parametro:    params.parametro,
    fecha_inicio: params.fecha_inicio,
    fecha_fin:    params.fecha_fin,
    solo_con_valor: 'true',
    limit: String(params.limit ?? 5000),
  });
  if (params.turno) {
    const turnoInt = TURNO_STR_TO_INT[params.turno.toLowerCase()];
    if (turnoInt) q.set('turno', turnoInt);
  }
  return request<MedicionCalidad[]>(`/api/calidad/mediciones?${q}`);
}

/** @deprecated Usa getCalidadMediciones — el endpoint pivot /api/calidad/ está reservado para el modelo tabla */
export async function getCalidad(params: {
  parametro: string;
  fecha_inicio: string;
  fecha_fin: string;
  turno?: string;
  limit?: number;
}): Promise<RegistroCalidad[]> {
  return getCalidadMediciones(params) as unknown as Promise<RegistroCalidad[]>;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getDashboardKpis(params?: {
  fecha_inicio?: string;
  fecha_fin?: string;
}) {
  const q = new URLSearchParams();
  if (params?.fecha_inicio) q.set('fecha_inicio', params.fecha_inicio);
  if (params?.fecha_fin)    q.set('fecha_fin', params.fecha_fin);
  const qs = q.toString();
  return request(`/api/dashboard/kpis${qs ? '?' + qs : ''}`);
}

// ─── Reportes / PDF ───────────────────────────────────────────────────────────

export function getReportePdfUrl(params: {
  fecha_inicio: string;
  fecha_fin: string;
  tipo?: 'caudales' | 'reactivos' | 'calidad' | 'completo';
}): string {
  const q = new URLSearchParams({
    fecha_inicio: params.fecha_inicio,
    fecha_fin: params.fecha_fin,
    tipo: params.tipo ?? 'completo',
  });
  return `${API}/api/reportes/pdf?${q}`;
}

// ─── Calidad — Remociones ─────────────────────────────────────────────────────

export interface RemocionCalidad {
  fecha: string;
  turno: number;
  parametro_codigo: string;
  parametro: string;
  parametro_unidad: string | null;
  pulmon: number | null;
  gem_salida: number | null;
  mbr_permeado_avg: number | null;
  ro1_compuesta: number | null;
  vertimiento: number | null;
  pct_remocion_gem: number | null;
  pct_remocion_biologico: number | null;
  pct_remocion_ro: number | null;
  pct_remocion_global: number | null;
}

export async function getCalidadRemociones(params: {
  fecha_inicio: string;
  fecha_fin: string;
  parametro_codigo?: string;
  turno?: number;
}): Promise<RemocionCalidad[]> {
  const q = new URLSearchParams({
    fecha_inicio: params.fecha_inicio,
    fecha_fin: params.fecha_fin,
  });
  if (params.parametro_codigo) q.set('parametro_codigo', params.parametro_codigo);
  if (params.turno != null) q.set('turno', String(params.turno));
  return request<RemocionCalidad[]>(`/api/calidad/remociones?${q}`);
}

// ─── Reportes / PDF ───────────────────────────────────────────────────────────

/** Informe de Calidad HTML completo (abre en nueva pestaña, imprime como PDF con Ctrl+P) */
export function getReporteCalidadHtmlUrl(params: {
  fecha_inicio: string;
  fecha_fin: string;
  usuario?: string;
}): string {
  const q = new URLSearchParams({
    fecha_inicio: params.fecha_inicio,
    fecha_fin: params.fecha_fin,
    usuario: params.usuario ?? 'Encargado',
  });
  return `${API}/api/reportes/calidad-html?${q}`;
}

/** Informe KPI Dashboard HTML (abre en nueva pestaña, imprime como PDF con Ctrl+P) */
export function getReporteDashboardHtmlUrl(params: {
  fecha_inicio: string;
  fecha_fin: string;
  usuario?: string;
}): string {
  const q = new URLSearchParams({
    fecha_inicio: params.fecha_inicio,
    fecha_fin: params.fecha_fin,
    usuario: params.usuario ?? 'Encargado',
  });
  return `${API}/api/reportes/dashboard-html?${q}`;
}

// ─── Calidad — Dispersión ─────────────────────────────────────────────────────

export interface DispersionRow {
  fecha: string;
  unidad_tratamiento: string;
  minimo: number;
  maximo: number;
  promedio: number;
  n: number;
}

export async function getCalidadDispersion(params: {
  parametro: string;
  fecha_inicio: string;
  fecha_fin: string;
}): Promise<DispersionRow[]> {
  const q = new URLSearchParams({
    parametro:    params.parametro,
    fecha_inicio: params.fecha_inicio,
    fecha_fin:    params.fecha_fin,
  });
  return request<DispersionRow[]>(`/api/calidad/dispersion?${q}`);
}

// ─── Calidad — MBR Eficiencia ─────────────────────────────────────────────────

export interface MbrEficienciaRow {
  fecha: string;
  turno: string;
  unidad_tratamiento: string;
  parametro: string;
  valor_promedio: number;
}

export async function getCalidadMbrEficiencia(params: {
  fecha_inicio: string;
  fecha_fin: string;
}): Promise<MbrEficienciaRow[]> {
  const q = new URLSearchParams({
    fecha_inicio: params.fecha_inicio,
    fecha_fin:    params.fecha_fin,
  });
  return request<MbrEficienciaRow[]>(`/api/calidad/mbr-eficiencia?${q}`);
}

// ─── Balance Hídrico ──────────────────────────────────────────────────────────

export interface BalanceHidricoRow {
  fecha: string;
  turno: number;
  semana: number | null;
  ingreso_ptap: number | null;
  potable_ptap: number | null;
  carrotanques_m3: number | null;
  mulas_funza_m3: number | null;
  contador_principal: number | null;
  entrada_ro1: number | null;
  permeado_ro1: number | null;
  rechazo_ro1: number | null;
  eficiencia_ro_pct: number | null;
  permeado_mbr1: number | null;
  permeado_mbr2: number | null;
  envio_th: number | null;
  acueducto_m3: number | null;
  total_agua_limpia_m3: number | null;
  consumo_gem_m3: number | null;
  lavanderia_m3: number | null;
  tintoreria_m3: number | null;
  rotativa_m3: number | null;
  indicador_lav_l_und: number | null;
  indicador_tin_l_kg: number | null;
  indicador_rot_l_m: number | null;
}

export async function getBalanceHidrico(params: {
  fecha_inicio: string;
  fecha_fin: string;
  turno?: number;
  limit?: number;
}): Promise<BalanceHidricoRow[]> {
  const q = new URLSearchParams({
    fecha_inicio: params.fecha_inicio,
    fecha_fin:    params.fecha_fin,
    limit:        String(params.limit ?? 2000),
  });
  if (params.turno != null) q.set('turno', String(params.turno));
  return request<BalanceHidricoRow[]>(`/api/caudales/?${q}`);
}

export interface ResumenBalanceRow {
  medidor: string;
  descripcion: string;
  total_m3: number;
  n_turnos: number;
}

export async function getResumenBalance(params: {
  fecha_inicio: string;
  fecha_fin: string;
}): Promise<ResumenBalanceRow[]> {
  const q = new URLSearchParams({
    fecha_inicio: params.fecha_inicio,
    fecha_fin:    params.fecha_fin,
  });
  return request<ResumenBalanceRow[]>(`/api/caudales/resumen?${q}`);
}

// ─── Reactivos — Consumo diario y proyección ──────────────────────────────────

export interface ConsumoQuimicoDiaRow {
  fecha: string;
  sistema: string;
  producto_id: number;
  producto_codigo: string | null;
  producto_nombre: string;
  L_dia: number | null;
  kg_dia: number | null;
  ppm_promedio_dia: number | null;
  costo_dia: number | null;
  caudal_m3_dia: number | null;
}

export async function getConsumoQuimicoDiario(params: {
  fecha_inicio: string;
  fecha_fin: string;
  sistema?: string;
  limit?: number;
}): Promise<ConsumoQuimicoDiaRow[]> {
  const q = new URLSearchParams({
    fecha_inicio: params.fecha_inicio,
    fecha_fin:    params.fecha_fin,
    limit:        String(params.limit ?? 2000),
  });
  if (params.sistema) q.set('sistema', params.sistema);
  return request<ConsumoQuimicoDiaRow[]>(`/api/reactivos/?${q}`);
}

export interface RealVsProyectadoRow {
  anio: number;
  mes: number;
  producto_id: number;
  producto: string;
  sistema: string;
  kg_real: number | null;
  costo_real: number | null;
  kg_proyectado: number | null;
  costo_proyectado: number | null;
  kg_por_m3_real: number | null;
  kg_por_m3_proyectado: number | null;
  cumplimiento_pct: number | null;
  cumplimiento_costo_pct: number | null;
  desviacion_pct: number | null;
}

export async function getProyeccionQuimicos(params: {
  anio: number;
  mes?: number;
  sistema?: string;
}): Promise<RealVsProyectadoRow[]> {
  const q = new URLSearchParams({ anio: String(params.anio) });
  if (params.mes != null) q.set('mes', String(params.mes));
  if (params.sistema) q.set('sistema', params.sistema);
  return request<RealVsProyectadoRow[]>(`/api/reactivos/proyeccion?${q}`);
}

export interface EstadisticasDiaRow {
  anio: number;
  mes: number;
  sistema: string;
  producto_id: number;
  producto_nombre: string;
  dias: number | null;
  kg_min: number | null;
  kg_max: number | null;
  kg_avg: number | null;
  kg_total: number | null;
  ppm_min: number | null;
  ppm_max: number | null;
  ppm_avg: number | null;
  costo_total: number | null;
}

export async function getEstadisticasReactivos(params: {
  anio: number;
  mes?: number;
  sistema?: string;
}): Promise<EstadisticasDiaRow[]> {
  const q = new URLSearchParams({ anio: String(params.anio) });
  if (params.mes != null) q.set('mes', String(params.mes));
  if (params.sistema) q.set('sistema', params.sistema);
  return request<EstadisticasDiaRow[]>(`/api/reactivos/estadisticas?${q}`);
}

/** URL del informe HTML de Balance Hídrico */
export function getReporteBalanceHtmlUrl(params: {
  fecha_inicio: string;
  fecha_fin: string;
}): string {
  const q = new URLSearchParams({
    fecha_inicio: params.fecha_inicio,
    fecha_fin:    params.fecha_fin,
  });
  return `${API}/api/reportes/balance-html?${q}`;
}

/** URL del informe HTML de Costos Químicos */
export function getReporteCostosHtmlUrl(params: {
  anio: number;
  mes?: number;
  sistema?: string;
}): string {
  const q = new URLSearchParams({ anio: String(params.anio) });
  if (params.mes != null) q.set('mes', String(params.mes));
  if (params.sistema) q.set('sistema', params.sistema);
  return `${API}/api/reportes/costos-html?${q}`;
}

// ─── Reactivos — GEM Eficiencia ───────────────────────────────────────────────

export interface GemEficienciaRow {
  fecha: string;
  turno: string;
  horometro_inicial: number | null;
  caudal_m3: number | null;
  caudal_mh: number | null;
  consumo_acido_l: number | null;
  consumo_coagulante_l: number | null;
  consumo_decolorante_l: number | null;
  consumo_pol_anionico_kg: number | null;
  consumo_pol_cationico_kg: number | null;
  ppm_acido: number | null;
  ppm_coagulante: number | null;
  ppm_decolorante: number | null;
  ppm_pol_anionico: number | null;
  ppm_pol_cationico: number | null;
  costo_op_acido: number | null;
  costo_op_coagulante: number | null;
  costo_op_decolorante: number | null;
  costo_op_anionico: number | null;
  costo_op_cationico: number | null;
  costo_quimica_turno: number | null;
  kg_acido: number | null;
  kg_coagulante: number | null;
  kg_decolorante: number | null;
  kg_pol_anionico: number | null;
  kg_pol_cationico: number | null;
  pesos_por_m3: number | null;
}

export async function getGemEficiencia(params: {
  fecha_inicio: string;
  fecha_fin: string;
}): Promise<GemEficienciaRow[]> {
  const q = new URLSearchParams({
    fecha_inicio: params.fecha_inicio,
    fecha_fin:    params.fecha_fin,
  });
  return request<GemEficienciaRow[]>(`/api/reactivos/gem-eficiencia?${q}`);
}
