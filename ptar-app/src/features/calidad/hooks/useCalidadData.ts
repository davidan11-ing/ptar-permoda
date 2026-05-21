import { useState, useEffect, useMemo } from 'react';
import { getCalidadMediciones } from '../../../services/ptarClient';

// ─── Orden del proceso de tratamiento ─────────────────────────────────────────
// Nombres exactos de la tabla `unidad_tratamiento` en MySQL (sin tildes ni paréntesis)
export const PROCESO_ORDEN: string[] = [
  'Tanque Pulmon',
  'Tanque Homogeneizador',
  'GEM Salida',
  'Reactor Anoxico',
  'Reactor MBBR',
  'MBR 1 Interno',
  'MBR 2 Interno',
  'MBR 1 Permeado',
  'MBR 2 Permeado',
  'RO 1 Etapa 1',
  'RO 1 Etapa 2',
  'RO 1 Compuesta',
  'RO 2 Permeado',
  'RO Rechazo',
  'Vertimiento',
];

// Colores por posición en el proceso (claves = nombres exactos de DB)
export const UNIDAD_COLORES: Record<string, string> = {
  'Tanque Pulmon':         '#00c5e3',
  'Tanque Homogeneizador': '#1f6feb',
  'GEM Salida':            '#58a6ff',
  'Reactor Anoxico':       '#d29922',
  'Reactor MBBR':          '#e3b341',
  'MBR 1 Interno':         '#f0883e',
  'MBR 2 Interno':         '#fd7d3b',
  'MBR 1 Permeado':        '#3fb950',
  'MBR 2 Permeado':        '#2ea043',
  'RO 1 Etapa 1':          '#9e7aff',
  'RO 1 Etapa 2':          '#7c5ef5',
  'RO 1 Compuesta':        '#6844db',
  'RO 2 Permeado':         '#8b5cf6',
  'RO Rechazo':            '#f85149',
  'Vertimiento':           '#e6523a',
};

export const TURNO_COLORES: Record<string, string> = {
  noche:  '#1f6feb',
  mañana: '#3fb950',
  tarde:  '#d29922',
};

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface RawRow {
  fecha: string;
  turno: string;
  unidad_tratamiento: string;
  valor: number;
}

/** Una fila para el TendenciaChart: { fecha, [unidad]: promedio } */
export interface TendenciaRow {
  fecha: string;
  [unidad: string]: number | string;
}

/** Resumen estadístico por unidad */
export interface SummaryRow {
  unidad: string;
  min: number;
  avg: number;
  max: number;
  n: number;
  color: string;
}

/** Fila para el TurnoChart: { fecha, noche?, mañana?, tarde? } */
export interface TurnoRow {
  fecha: string;
  noche?: number;
  mañana?: number;
  tarde?: number;
}

/** Eficiencia de remoción por etapa */
export interface EficienciaRow {
  etapa: string;
  entrada_label: string;
  salida_label: string;
  pct: number;          // puede ser negativo si hay incremento
}

// ─── Parámetros que admiten cálculo de remoción ───────────────────────────────
// Nombres exactos de la tabla `parametro_calidad` en MySQL
const PARAMS_REMOCION = new Set([
  'SST',
  'SST Gravimetrico',
  'DQO',
  'Color',
  'Turbidez',
  'Conductividad',
  'TDS',
  'Solidos Sedimentables',
]);

// ─── Hook principal ───────────────────────────────────────────────────────────

interface Params {
  parametro: string;
  fechaInicio: string;
  fechaFin: string;
  turno?: string;       // undefined = todos los turnos
  unidadTurno?: string; // unidad seleccionada para TurnoChart
}

interface Result {
  loading: boolean;
  error: string | null;
  rawRows: RawRow[];
  unidades: string[];           // unidades con datos, ordenadas por proceso
  tendencia: TendenciaRow[];
  summary: SummaryRow[];
  turnoRows: TurnoRow[];
  eficiencia: EficienciaRow[];
  tieneRemocion: boolean;
}

export function useCalidadData({
  parametro,
  fechaInicio,
  fechaFin,
  turno,
  unidadTurno,
}: Params): Result {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);

  useEffect(() => {
    if (!parametro || !fechaInicio || !fechaFin) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchData() {
      try {
        const data = await getCalidadMediciones({
          parametro,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          turno,
          limit: 5000,
        });
        if (cancelled) return;
        setRawRows(data as RawRow[]);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
        setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [parametro, fechaInicio, fechaFin, turno]);

  // ── Derivados ──────────────────────────────────────────────────────────────

  const unidades = useMemo(() => {
    const set = new Set(rawRows.map(r => r.unidad_tratamiento));
    return PROCESO_ORDEN.filter(u => set.has(u));
  }, [rawRows]);

  // Tendencia: promedio por (fecha, unidad)
  const tendencia = useMemo((): TendenciaRow[] => {
    const map = new Map<string, Map<string, number[]>>();
    for (const r of rawRows) {
      if (!map.has(r.fecha)) map.set(r.fecha, new Map());
      const byUnidad = map.get(r.fecha)!;
      if (!byUnidad.has(r.unidad_tratamiento)) byUnidad.set(r.unidad_tratamiento, []);
      byUnidad.get(r.unidad_tratamiento)!.push(r.valor);
    }
    const fechas = Array.from(map.keys()).sort();
    return fechas.map(fecha => {
      const row: TendenciaRow = { fecha };
      const byUnidad = map.get(fecha)!;
      for (const [u, vals] of byUnidad) {
        row[u] = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
      }
      return row;
    });
  }, [rawRows]);

  // Summary: min/avg/max por unidad
  const summary = useMemo((): SummaryRow[] => {
    const map = new Map<string, number[]>();
    for (const r of rawRows) {
      if (!map.has(r.unidad_tratamiento)) map.set(r.unidad_tratamiento, []);
      map.get(r.unidad_tratamiento)!.push(r.valor);
    }
    return PROCESO_ORDEN
      .filter(u => map.has(u))
      .map(u => {
        const vals = map.get(u)!;
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        return {
          unidad: u,
          min: +Math.min(...vals).toFixed(2),
          avg: +avg.toFixed(2),
          max: +Math.max(...vals).toFixed(2),
          n: vals.length,
          color: UNIDAD_COLORES[u] ?? '#8b949e',
        };
      });
  }, [rawRows]);

  // TurnoChart: promedio por (fecha, turno) para una unidad específica
  const turnoRows = useMemo((): TurnoRow[] => {
    const targetUnidad = unidadTurno ?? unidades[0];
    if (!targetUnidad) return [];

    const filtered = rawRows.filter(r => r.unidad_tratamiento === targetUnidad);
    const map = new Map<string, Map<string, number[]>>();
    for (const r of filtered) {
      if (!map.has(r.fecha)) map.set(r.fecha, new Map());
      const byTurno = map.get(r.fecha)!;
      if (!byTurno.has(r.turno)) byTurno.set(r.turno, []);
      byTurno.get(r.turno)!.push(r.valor);
    }
    const fechas = Array.from(map.keys()).sort();
    return fechas.map(fecha => {
      const row: TurnoRow = { fecha };
      const byTurno = map.get(fecha)!;
      for (const t of ['noche', 'mañana', 'tarde'] as const) {
        const vals = byTurno.get(t);
        if (vals) row[t] = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
      }
      return row;
    });
  }, [rawRows, unidades, unidadTurno]);

  // Eficiencia de remoción
  const tieneRemocion = PARAMS_REMOCION.has(parametro);

  const eficiencia = useMemo((): EficienciaRow[] => {
    if (!tieneRemocion) return [];

    // Promedio global por unidad (todo el período)
    const avgByUnidad = new Map<string, number>();
    for (const s of summary) avgByUnidad.set(s.unidad, s.avg);

    const calc = (entradaKey: string, salidaKey: string, etapa: string): EficienciaRow | null => {
      const entrada = avgByUnidad.get(entradaKey);
      const salida  = avgByUnidad.get(salidaKey);
      if (entrada == null || salida == null || entrada === 0) return null;
      const pct = +((entrada - salida) / entrada * 100).toFixed(1);
      return { etapa, entrada_label: entradaKey, salida_label: salidaKey, pct };
    };

    // MBR permeado promedio de MBR1 y MBR2
    const mbr1 = avgByUnidad.get('MBR 1 Permeado');
    const mbr2 = avgByUnidad.get('MBR 2 Permeado');
    const mbrProm = mbr1 != null && mbr2 != null
      ? (mbr1 + mbr2) / 2
      : (mbr1 ?? mbr2);

    const rows: EficienciaRow[] = [];

    const etapa1 = calc('Tanque Pulmon', 'GEM Salida', 'Pretratamiento');
    if (etapa1) rows.push(etapa1);

    const entrada_gem = avgByUnidad.get('GEM Salida');
    if (entrada_gem != null && mbrProm != null && entrada_gem !== 0) {
      const pct = +((entrada_gem - mbrProm) / entrada_gem * 100).toFixed(1);
      rows.push({
        etapa: 'Tratamiento Biológico',
        entrada_label: 'GEM Salida',
        salida_label: 'MBR 1+2 Permeado',
        pct,
      });
    }

    const global = calc('Tanque Pulmon', 'Vertimiento', 'Remoción Global');
    if (global) rows.push(global);

    return rows;
  }, [summary, tieneRemocion]);

  return { loading, error, rawRows, unidades, tendencia, summary, turnoRows, eficiencia, tieneRemocion };
}
