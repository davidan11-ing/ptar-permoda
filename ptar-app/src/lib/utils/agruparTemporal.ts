/**
 * agruparTemporal.ts
 * Utilidad de agregación temporal compartida por todos los dashboards.
 * Transforma datos por turno/día en agrupaciones por día, semana o mes.
 */
import type { Granularidad } from '../../hooks/useGranularidad';

// ── Constantes ────────────────────────────────────────────────────────────────
const MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
export const TURNO_LABEL: Record<number, string> = { 1: 'Noc', 2: 'Mañ', 3: 'Tar' };

// ── ISO week number (ISO 8601) ─────────────────────────────────────────────────
function isoWeek(dateStr: string): number {
  // Recortar a YYYY-MM-DD por si el backend entrega datetime con hora
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// ── Generadores de label y sort-key ───────────────────────────────────────────

/**
 * Genera el label visible en el eje X según la granularidad.
 * Ejemplo: fecha='2026-06-02', turno=2, gran='turno' → "02/Jun Mañ"
 */
export function xLabel(
  fecha: string,
  turno: number | undefined,
  gran: Granularidad | null,
): string {
  const f = fecha.slice(0, 10); // normalizar a YYYY-MM-DD
  const [y, m, d] = f.split('-');
  switch (gran ?? 'dia') {
    case 'turno': {
      const tLabel = TURNO_LABEL[turno ?? 0] ?? '';
      return `${d}/${MESES[+m]} ${tLabel}`.trim();
    }
    case 'dia':
      return `${d}/${MESES[+m]}`;
    case 'semana':
      return `Sem ${isoWeek(f)}`;
    case 'mes':
      return `${MESES[+m]} ${y.slice(2)}`;
  }
}

/**
 * Genera la clave de ordenación cronológica.
 * Diferente del label porque para semana/mes el label es texto.
 */
export function sortKey(
  fecha: string,
  turno: number | undefined,
  gran: Granularidad | null,
): string {
  const f = fecha.slice(0, 10); // normalizar a YYYY-MM-DD
  switch (gran ?? 'dia') {
    case 'turno':
      return `${f}_${String(turno ?? 0).padStart(1, '0')}`;
    case 'dia':
      return f;
    case 'semana': {
      const w = isoWeek(f);
      return `${f.slice(0, 4)}-W${String(w).padStart(2, '0')}`;
    }
    case 'mes':
      return f.slice(0, 7); // YYYY-MM
  }
}

// ── Función genérica de agregación ────────────────────────────────────────────

interface AgruparOptions<T> {
  gran: Granularidad | null;
  getFecha: (r: T) => string;
  getTurno?: (r: T) => number | undefined;
  sumFields: (keyof T)[];
  avgFields: (keyof T)[];
}

export interface AgrupadoRow {
  fecha: string;         // label del eje X
  _sortKey: string;      // para ordenar cronológicamente
  [key: string]: number | string | null;
}

/**
 * Genera todos los períodos entre fechaInicio y fechaFin para la granularidad dada.
 * Usado para rellenar períodos vacíos cuando "Días sin datos" está activo.
 */
export function generateAllPeriods(
  fechaInicio: string,
  fechaFin:    string,
  gran:        Granularidad,
): { sk: string; label: string }[] {
  const result: { sk: string; label: string }[] = [];
  const seen   = new Set<string>();
  const addIf  = (dateStr: string) => {
    const sk    = sortKey(dateStr, undefined, gran);
    const label = xLabel(dateStr, undefined, gran);
    if (!seen.has(sk)) { seen.add(sk); result.push({ sk, label }); }
  };

  const start = new Date(fechaInicio + 'T12:00:00Z');
  const end   = new Date(fechaFin   + 'T12:00:00Z');

  if (gran === 'dia') {
    const cur = new Date(start);
    while (cur <= end) {
      addIf(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  } else if (gran === 'semana') {
    const cur = new Date(start);
    while (cur <= end) {
      addIf(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 7);
    }
    // Asegurar que el último período esté incluido
    addIf(end.toISOString().slice(0, 10));
  } else if (gran === 'mes') {
    const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 15));
    const endM = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 15));
    while (cur <= endM) {
      addIf(cur.toISOString().slice(0, 10));
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
  }

  return result;
}

export function agruparPorGranularidad<T>(
  rows: T[],
  opts: AgruparOptions<T>,
): AgrupadoRow[] {
  const { gran, getFecha, getTurno, sumFields, avgFields } = opts;

  type Bucket = {
    label: string;
    sortK: string;
    sums: Record<string, number>;
    avgs: Record<string, number[]>;
  };

  const map = new Map<string, Bucket>();

  for (const r of rows) {
    const fecha = getFecha(r);
    const turno = getTurno ? getTurno(r) : undefined;
    const label = xLabel(fecha, turno, gran);
    const sk    = sortKey(fecha, turno, gran);

    if (!map.has(sk)) {
      map.set(sk, { label, sortK: sk, sums: {}, avgs: {} });
    }
    const bucket = map.get(sk)!;

    for (const f of sumFields) {
      const v = r[f];
      if (v != null && typeof v === 'number' && v > 0) {
        bucket.sums[f as string] = (bucket.sums[f as string] ?? 0) + v;
      }
    }
    for (const f of avgFields) {
      const v = r[f];
      if (v != null && typeof v === 'number') {
        if (!bucket.avgs[f as string]) bucket.avgs[f as string] = [];
        bucket.avgs[f as string].push(v);
      }
    }
  }

  const avg = (arr: number[]) =>
    arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(4) : null;

  return Array.from(map.values())
    .sort((a, b) => a.sortK.localeCompare(b.sortK))
    .map(bucket => {
      const row: AgrupadoRow = { fecha: bucket.label, _sortKey: bucket.sortK };
      for (const [k, v] of Object.entries(bucket.sums)) row[k] = +v.toFixed(4);
      for (const [k, arr] of Object.entries(bucket.avgs))  row[k] = avg(arr);
      return row;
    });
}
