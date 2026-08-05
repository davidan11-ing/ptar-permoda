// Cliente HTTP centralizado para todas las llamadas al backend .NET de PTAR
// Autenticación via cookie httpOnly — no se maneja token en JS.

// En producción VITE_API_URL debe estar vacío (rutas relativas /api/...).
// En desarrollo: VITE_API_URL=http://localhost:8001 desde .env.development.
const API = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

// Singleton de refresh: múltiples requests 401 simultáneos comparten UNA sola llamada
let _refreshPromise: Promise<boolean> | null = null;

// Intento de renovar la sesión vía endpoint de refresh
function tryRefresh(): Promise<boolean> {
  if (!_refreshPromise) {
    _refreshPromise = fetch(`${API}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(r => r.ok)
      .catch(() => false)
      .finally(() => { _refreshPromise = null; });
  }
  return _refreshPromise;
}

// Wrapper de fetch que siempre incluye credenciales y Content-Type JSON
async function doFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
}

// Función genérica de petición con manejo de 401 y reintento automático
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await doFetch(path, init);

  if (res.status === 401 && path !== '/api/auth/refresh') {
    const refreshed = await tryRefresh();
    if (refreshed) {
      // Reintentar la petición original una sola vez
      const retry = await doFetch(path, init);
      if (retry.ok) return retry.json() as Promise<T>;
      if (retry.status === 401) {
        window.dispatchEvent(new CustomEvent('ptar:unauthorized'));
        throw new Error('401 Unauthorized');
      }
      const retryBody = await retry.text().catch(() => '');
      throw new Error(`${retry.status} ${retry.statusText}${retryBody ? ': ' + retryBody : ''}`);
    }
    // Refresh falló — sesión expirada
    window.dispatchEvent(new CustomEvent('ptar:unauthorized'));
    throw new Error('401 Unauthorized');
  }

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('ptar:unauthorized'));
    throw new Error('401 Unauthorized');
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${body ? ': ' + body : ''}`);
  }
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

// Cambio de contraseña del usuario autenticado
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API}/api/auth/change-password`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(data.detail ?? `Error ${res.status}`);
  }
}

// ─── Interfaces (espejo exacto de las tablas) ─────────────────────────────────

// Registro de lectura de contador de caudales por turno
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

// Registro de consumo de reactivo químico por turno
export interface RegistroCosto {
  id?: string;
  created_at?: string;
  turno: 'mañana' | 'tarde' | 'noche';
  usuario: string;
  equipo?: string;
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
  // Contadores RO/PTAP
  lectura_entrada_actual?:  number;
  lectura_permeado_actual?: number;
  caudal_entrada_mh?:       number;
  caudal_salida_mh?:        number;
  volumen_entrada_m3?:      number;
  volumen_permeado_m3?:     number;
  horas_operacion_sistema?: number;
  // RO: mantenimiento
  cartuchos_cambiados?: boolean;
  // PTAP: mantenimiento
  cebs_realizados?: boolean;
  cebs_cantidad?:   number;
  manga_cambiada?:  boolean;
  manga_cantidad?:  number;
}

// Registro de parámetro de calidad de agua por turno y unidad de tratamiento
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

// Última lectura registrada por cada contador
export async function getUltimasLecturas(): Promise<Record<string, number>> {
  return request<Record<string, number>>('/api/caudales/ultimas-lecturas');
}

// Inserción masiva de lecturas de caudales
export async function createCaudalesBatch(
  rows: Omit<RegistroContador, 'id' | 'created_at' | 'delta_m3'>[],
): Promise<{ inserted: number }> {
  return request('/api/caudales/batch', { method: 'POST', body: JSON.stringify(rows) });
}

// Lecturas recientes de caudales desde una fecha dada
export async function getCaudalesRecientes(since: string, limit = 60): Promise<RegistroContador[]> {
  const params = new URLSearchParams({ since, limit: String(limit) });
  return request<RegistroContador[]>(`/api/caudales/?${params}`);
}

// ─── Reactivos ────────────────────────────────────────────────────────────────

// Inserción masiva de consumos de reactivos
export async function createReactivosBatch(
  rows: Omit<RegistroCosto, 'id' | 'created_at' | 'consumo' | 'ppm' | 'costo_operativo'>[],
): Promise<{ inserted: number }> {
  return request('/api/reactivos/batch', { method: 'POST', body: JSON.stringify(rows) });
}

// Registros recientes de reactivos desde una fecha dada
export async function getReactivosRecientes(since: string, limit = 60): Promise<RegistroCosto[]> {
  const params = new URLSearchParams({ since, limit: String(limit) });
  return request<RegistroCosto[]>(`/api/reactivos/?${params}`);
}

// Último horómetro registrado del GEM
export interface UltimoHorometro {
  horometro: number | null;
  fecha: string | null;
  turno: string | null;
}

export async function getUltimoHorometro(): Promise<UltimoHorometro> {
  return request<UltimoHorometro>('/api/reactivos/ultimo-horometro');
}

// Último nivel final registrado para un químico específico
export interface UltimoNivel {
  nivel_final: number | null;
  fecha: string | null;
  turno: string | null;
}

export async function getUltimoNivel(quimico_id: string): Promise<UltimoNivel> {
  const q = new URLSearchParams({ quimico_id });
  return request<UltimoNivel>(`/api/reactivos/ultimo-nivel?${q}`);
}

// Última lectura de contadores del sistema RO
export interface UltimaLecturaRO {
  c12:   number | null;
  c13:   number | null;
  fecha: string | null;
  turno: string | null;
}

export async function getUltimaLecturaRO(): Promise<UltimaLecturaRO> {
  try {
    return await request<UltimaLecturaRO>('/api/reactivos/ultima-lectura-ro');
  } catch {
    return { c12: null, c13: null, fecha: null, turno: null };
  }
}

// Última lectura de contadores del sistema PTAP
export interface UltimaLecturaPTAP {
  entrada:  number | null;
  permeado: number | null;
  fecha:    string | null;
  turno:    string | null;
}

export async function getUltimaLecturaPTAP(): Promise<UltimaLecturaPTAP> {
  try {
    return await request<UltimaLecturaPTAP>('/api/reactivos/ultima-lectura-ptap');
  } catch {
    return { entrada: null, permeado: null, fecha: null, turno: null };
  }
}

// ─── Calidad ──────────────────────────────────────────────────────────────────

// Inserción masiva de registros de calidad
export async function createCalidadBatch(
  rows: Omit<RegistroCalidad, 'id' | 'created_at'>[],
): Promise<{ inserted: number }> {
  return request('/api/calidad/batch', { method: 'POST', body: JSON.stringify(rows) });
}

// Catálogo de parámetros de calidad disponibles
export async function getCalidadParametros(): Promise<{ id: number; nombre: string; unidad_medida: string }[]> {
  return request<{ id: number; nombre: string; unidad_medida: string }[]>('/api/calidad/parametros');
}

// Último valor registrado para un parámetro y unidad de tratamiento
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

// Nomenclatura correcta: turno 1=Noche, 2=Mañana, 3=Tarde
const TURNO_STR_TO_INT: Record<string, string> = {
  'noche':  '1',
  'mañana': '2', 'manana': '2',
  'tarde':  '3',
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

// Consulta de mediciones de calidad en rango de fechas con filtros opcionales
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

// KPIs principales del dashboard en un rango de fechas
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

// Fecha más reciente con datos en las tablas principales (para inicializar rangos).
// Intenta primero el endpoint dedicado; si no existe aún, escanea endpoints existentes.
export async function getUltimaFechaConDatos(): Promise<string> {
  const hoy = new Date().toLocaleDateString('en-CA');
  const hace1anio = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toLocaleDateString('en-CA'); })();

  // Intento 1: endpoint dedicado (disponible tras reconstruir backend)
  try {
    const r = await request<{ fecha: string }>('/api/dashboard/ultima-fecha');
    if (r?.fecha) return r.fecha;
  } catch {}

  // Intento 2: GEM eficiencia último año — busca la fecha más reciente con datos
  try {
    const rows = await request<Array<{ fecha?: string }>>(
      `/api/reactivos/gem-eficiencia?fecha_inicio=${hace1anio}&fecha_fin=${hoy}`
    );
    if (Array.isArray(rows) && rows.length > 0) {
      const ultima = [...rows].reverse().find(r => r.fecha)?.fecha;
      if (ultima) return ultima;
    }
  } catch {}

  // Intento 3: caudales último año — fecha más reciente
  try {
    const rows = await request<Array<{ fecha?: string }>>(
      `/api/caudales/?fecha_inicio=${hace1anio}&fecha_fin=${hoy}&limit=2000`
    );
    if (Array.isArray(rows) && rows.length > 0) {
      const ultima = [...rows].reverse().find(r => r.fecha)?.fecha;
      if (ultima) return ultima;
    }
  } catch {}

  return hoy;
}

// ─── Reportes / PDF ───────────────────────────────────────────────────────────

// URL del informe PDF general (caudales, reactivos, calidad o completo)
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

// Porcentajes de remoción por etapa del tren de tratamiento
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

// Consulta de remociones por parámetro y rango de fechas
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

// ─── Calidad — Resumen estadístico ───────────────────────────────────────────

// Estadísticas mensuales de calidad por parámetro y unidad de tratamiento
export interface CalidadResumenRow {
  anio: number;
  mes: number;
  parametro_codigo: string;
  parametro: string;
  parametro_unidad: string;
  unidad_codigo: string;
  unidad: string;
  orden_tren: number;
  n_mediciones: number;
  minimo: number | null;
  maximo: number | null;
  promedio: number | null;
  desv_estandar: number | null;
  cv_pct: number | null;
  limite_vertimiento_min: number | null;
  limite_vertimiento_max: number | null;
  pct_fuera_limite_vert: number | null;
}

// Resumen estadístico de calidad en rango de fechas
export async function getCalidadResumen(params: {
  fecha_inicio: string;
  fecha_fin: string;
}): Promise<CalidadResumenRow[]> {
  const q = new URLSearchParams({ fecha_inicio: params.fecha_inicio, fecha_fin: params.fecha_fin });
  return request<CalidadResumenRow[]>(`/api/calidad/resumen?${q}`);
}

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

// Rango min/max/promedio diario de un parámetro por unidad de tratamiento
export interface DispersionRow {
  fecha: string;
  unidad_tratamiento: string;
  minimo: number;
  maximo: number;
  promedio: number;
  n: number;
}

// Consulta de dispersión de valores para análisis de variabilidad
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

// Valor promedio de parámetro MBR por turno y unidad de tratamiento
export interface MbrEficienciaRow {
  fecha: string;
  turno: string;
  unidad_tratamiento: string;
  parametro: string;
  valor_promedio: number;
}

// Eficiencia del sistema MBR en rango de fechas
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

// Fila del balance hídrico con todos los contadores y volúmenes por turno
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
  und_efectivas: number | null;
  kg_tela: number | null;
  m_tela: number | null;
}

// Datos del balance hídrico en rango de fechas con filtro de turno opcional
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

// Totales acumulados por medidor en el período
export interface ResumenBalanceRow {
  medidor: string;
  descripcion: string;
  total_m3: number;
  n_turnos: number;
}

// Resumen consolidado del balance hídrico
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

// Consumo diario de un producto químico por sistema
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

// Consumo diario de reactivos en rango de fechas con filtro de sistema
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

// Comparativo mensual real vs proyectado por producto y sistema
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

// Proyección de consumo de químicos vs real por año/mes/sistema
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

// Estadísticas diarias de consumo por producto, sistema y mes
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

// Estadísticas de reactivos agrupadas por mes y sistema
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

// Eficiencia del GEM: caudales, consumos y costos por turno
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

// Datos de eficiencia del GEM en rango de fechas
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

// ─── Reactivos — RO Eficiencia ────────────────────────────────────────────────

// Eficiencia del sistema de Ósmosis Inversa por turno
export interface RoEficienciaRow {
  fecha: string;
  turno: string;
  caudal_m3: number | null;
  horas_operacion: number | null;
  caudal_entrada_mh: number | null;
  caudal_salida_mh: number | null;
  costo_quimica_turno: number | null;
  pesos_por_m3: number | null;
}

// Datos de eficiencia del sistema RO en rango de fechas
export async function getRoEficiencia(params: {
  fecha_inicio: string;
  fecha_fin: string;
}): Promise<RoEficienciaRow[]> {
  const q = new URLSearchParams({
    fecha_inicio: params.fecha_inicio,
    fecha_fin:    params.fecha_fin,
  });
  return request<RoEficienciaRow[]>(`/api/reactivos/ro-eficiencia?${q}`);
}

// ─── Condiciones de Operación ─────────────────────────────────────────────────

// Caudales de entrada y salida del sistema RO en un turno específico
export interface CaudalesROTurno {
  caudal_entrada_mh: number | null;
  caudal_salida_mh:  number | null;
}

// Caudales y datos de mantenimiento del PTAP en un turno específico
export interface CaudalesPTAPTurno {
  caudal_entrada_mh: number | null;
  caudal_salida_mh:  number | null;
  manga_cambiada:    number | null;
  manga_cantidad:    number | null;
  cebs_realizados:   number | null;
  cebs_cantidad:     number | null;
}

// Última condición de operación registrada para el sistema RO
export interface UltimaCondicionRO {
  ultima_cip?: string | null;
  [key: string]: unknown;
}

// Caudales RO de un turno específico
export async function getCaudalesROTurno(fecha: string, turno: string): Promise<CaudalesROTurno> {
  const q = new URLSearchParams({ fecha, turno });
  return request<CaudalesROTurno>(`/api/condiciones/caudales-ro?${q}`);
}

// Caudales PTAP de un turno específico
export async function getCaudalesPTAPTurno(fecha: string, turno: string): Promise<CaudalesPTAPTurno> {
  const q = new URLSearchParams({ fecha, turno });
  return request<CaudalesPTAPTurno>(`/api/condiciones/caudales-ptap?${q}`);
}

// Última condición operacional del sistema RO
export async function getUltimaCondicionRO(): Promise<UltimaCondicionRO> {
  return request<UltimaCondicionRO>('/api/condiciones/ultima-ro');
}

// Guarda condiciones de operación del MBR
export async function saveCondicionesMbr(body: Record<string, unknown>): Promise<void> {
  await request('/api/condiciones/mbr', { method: 'POST', body: JSON.stringify(body) });
}

// Guarda condiciones de operación del RO
export async function saveCondicionesRo(body: Record<string, unknown>): Promise<void> {
  await request('/api/condiciones/ro', { method: 'POST', body: JSON.stringify(body) });
}

// Guarda condiciones de operación del PTAP
export async function saveCondicionesPtap(body: Record<string, unknown>): Promise<void> {
  await request('/api/condiciones/ptap', { method: 'POST', body: JSON.stringify(body) });
}

// ─── Dashboard config (Analista → Visualizador) ───────────────────────────────

// Configuración persistida del visualizador de dashboard
export async function getDashboardConfig(): Promise<import('../types/dashboardConfig').DashboardConfig> {
  return request<import('../types/dashboardConfig').DashboardConfig>('/api/dashboard/config');
}

// Persiste la configuración del visualizador de dashboard
export async function saveDashboardConfig(
  config: import('../types/dashboardConfig').DashboardConfig,
): Promise<void> {
  await request('/api/dashboard/config', { method: 'PUT', body: JSON.stringify(config) });
}

// ─── Resumen de turno (operario) ──────────────────────────────────────────────

export interface OtResumenItem {
  id: number;
  sharepoint_id: number | null;
  objeto: string | null;
  descripcion: string | null;
  criticidad: string | null;
  estado: string | null;
  responsable: string | null;
}

export interface FormularioResumen {
  codigo: string;
  nombre: string;
  completado: boolean;
  registros: number;
  costo?: number;
}

export interface TurnoResumen {
  fecha: string;
  turno_int: number;
  turno_nombre: string;
  formularios: FormularioResumen[];
  costo_turno: number;
  ots: {
    fecha: string;
    total_pendientes: number;
    total_completadas: number;
    criticas_pendientes: number;
    sp_base_url: string;
    items_pendientes: OtResumenItem[];
  };
}

// Resumen del turno actual del operario: formularios completados, costo y OTs pendientes
export async function getTurnoResumen(): Promise<TurnoResumen> {
  return request<TurnoResumen>('/api/turno/resumen');
}
