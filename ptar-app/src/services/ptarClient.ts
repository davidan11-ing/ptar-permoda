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
}

export interface RegistroCalidad {
  id?: string;
  created_at?: string;
  fecha?: string;
  turno: 'mañana' | 'tarde' | 'noche';
  usuario: string;
  unidad_tratamiento: string;
  parametro: string;
  unidad_medida: string;
  valor?: number;
  metodo?: string;
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

// ─── Calidad ──────────────────────────────────────────────────────────────────

export async function createCalidadBatch(
  rows: Omit<RegistroCalidad, 'id' | 'created_at'>[],
): Promise<{ inserted: number }> {
  return request('/api/calidad/batch', { method: 'POST', body: JSON.stringify(rows) });
}

export async function getCalidadParametros(): Promise<{ id: number; nombre: string; unidad_medida: string }[]> {
  return request<{ id: number; nombre: string; unidad_medida: string }[]>('/api/calidad/parametros');
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
