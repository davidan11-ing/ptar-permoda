import { useState, useEffect } from 'react';
import {
  getCalidadMediciones,
  getCalidadRemociones,
} from '../../../services/ptarClient';

// ─── Límites normativos Resolución 0631 / 2015 ────────────────────────────────
export interface LimiteConfig {
  min?: number;
  max?: number;
  unidad: string;
  label: string;
  unidadTratamiento: string;
}

export const LIMITES_VERTIMIENTO: Record<string, LimiteConfig> = {
  'pH':          { min: 5,  max: 9,   unidad: '',     label: 'pH',       unidadTratamiento: 'Vertimiento' },
  'SST':         {          max: 75,  unidad: 'mg/L', label: 'SST',      unidadTratamiento: 'Vertimiento' },
  'DQO':         {          max: 600, unidad: 'mg/L', label: 'DQO',      unidadTratamiento: 'Vertimiento' },
  'Temperatura': {          max: 40,  unidad: '°C',   label: 'Temp.',    unidadTratamiento: 'Vertimiento' },
};

const KPI_PARAMS = Object.keys(LIMITES_VERTIMIENTO); // ['pH','SST','DQO','Temperatura']

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface KpiRow {
  param: string;
  label: string;
  unidad: string;
  avg: number | null;
  min: number | null;
  max: number | null;
  n: number;
  pctCumplimiento: number | null; // % mediciones dentro del límite
  enLimite: boolean | null;       // promedio dentro del límite
  limiteStr: string;
}

export interface RemocionResumen {
  parametro: string;
  pct_global_avg: number;
  pct_gem_avg: number | null;
  pct_bio_avg: number | null;
  n: number;
}

interface Result {
  loading: boolean;
  error: string | null;
  kpis: KpiRow[];
  remociones: RemocionResumen[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isEnLimite(val: number, cfg: LimiteConfig): boolean {
  if (cfg.min != null && val < cfg.min) return false;
  if (cfg.max != null && val > cfg.max) return false;
  return true;
}

function buildLimiteStr(cfg: LimiteConfig): string {
  if (cfg.min != null && cfg.max != null) return `${cfg.min}–${cfg.max}${cfg.unidad ? ' ' + cfg.unidad : ''}`;
  if (cfg.max != null) return `≤ ${cfg.max}${cfg.unidad ? ' ' + cfg.unidad : ''}`;
  if (cfg.min != null) return `≥ ${cfg.min}${cfg.unidad ? ' ' + cfg.unidad : ''}`;
  return '';
}

function avg(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCalidadKpis(fechaInicio: string, fechaFin: string): Result {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [kpis, setKpis]       = useState<KpiRow[]>([]);
  const [remociones, setRemociones] = useState<RemocionResumen[]>([]);

  useEffect(() => {
    if (!fechaInicio || !fechaFin) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchAll() {
      try {
        // Cargar los 4 parámetros clave + remociones en paralelo
        const [pHData, sstData, dqoData, tempData, remData] = await Promise.all([
          getCalidadMediciones({ parametro: 'pH',          fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: 2000 }),
          getCalidadMediciones({ parametro: 'SST',         fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: 2000 }),
          getCalidadMediciones({ parametro: 'DQO',         fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: 2000 }),
          getCalidadMediciones({ parametro: 'Temperatura', fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: 2000 }),
          getCalidadRemociones({ fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
        ]);

        if (cancelled) return;

        // Filtrar por unidad de tratamiento y construir KPIs
        const rawData: Record<string, number[]> = {
          'pH':          pHData.filter(r => r.unidad_tratamiento === 'Vertimiento').map(r => r.valor),
          'SST':         sstData.filter(r => r.unidad_tratamiento === 'Vertimiento').map(r => r.valor),
          'DQO':         dqoData.filter(r => r.unidad_tratamiento === 'Vertimiento').map(r => r.valor),
          'Temperatura': tempData.filter(r => r.unidad_tratamiento === 'Vertimiento').map(r => r.valor),
        };
        // Fallback para Temperatura si no hay datos en Vertimiento → usar Tanque Pulmon
        if (rawData['Temperatura'].length === 0) {
          rawData['Temperatura'] = tempData.filter(r => r.unidad_tratamiento === 'Tanque Pulmon').map(r => r.valor);
        }

        const kpiRows: KpiRow[] = KPI_PARAMS.map(param => {
          const cfg  = LIMITES_VERTIMIENTO[param];
          const vals = rawData[param] ?? [];

          if (vals.length === 0) {
            return {
              param, label: cfg.label, unidad: cfg.unidad,
              avg: null, min: null, max: null, n: 0,
              pctCumplimiento: null, enLimite: null,
              limiteStr: buildLimiteStr(cfg),
            };
          }

          const mean   = avg(vals);
          const cumple = vals.filter(v => isEnLimite(v, cfg)).length;
          return {
            param,
            label: cfg.label,
            unidad: cfg.unidad,
            avg: +mean.toFixed(2),
            min: +Math.min(...vals).toFixed(2),
            max: +Math.max(...vals).toFixed(2),
            n: vals.length,
            pctCumplimiento: +(cumple / vals.length * 100).toFixed(1),
            enLimite: isEnLimite(mean, cfg),
            limiteStr: buildLimiteStr(cfg),
          };
        });

        // Agregar % de remoción global por parámetro (promedio del período)
        const remMap = new Map<string, { global: number[]; gem: number[]; bio: number[] }>();
        for (const r of remData) {
          if (!remMap.has(r.parametro)) remMap.set(r.parametro, { global: [], gem: [], bio: [] });
          const entry = remMap.get(r.parametro)!;
          if (r.pct_remocion_global   != null) entry.global.push(r.pct_remocion_global);
          if (r.pct_remocion_gem      != null) entry.gem.push(r.pct_remocion_gem);
          if (r.pct_remocion_biologico != null) entry.bio.push(r.pct_remocion_biologico);
        }

        const remRows: RemocionResumen[] = Array.from(remMap.entries())
          .map(([parametro, d]) => ({
            parametro,
            pct_global_avg: d.global.length > 0 ? +(avg(d.global)).toFixed(1) : 0,
            pct_gem_avg:    d.gem.length    > 0 ? +(avg(d.gem)).toFixed(1)    : null,
            pct_bio_avg:    d.bio.length    > 0 ? +(avg(d.bio)).toFixed(1)    : null,
            n: d.global.length,
          }))
          .filter(r => r.n > 0)
          .sort((a, b) => b.pct_global_avg - a.pct_global_avg);

        setKpis(kpiRows);
        setRemociones(remRows);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Error al cargar KPIs de calidad');
        setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [fechaInicio, fechaFin]);

  return { loading, error, kpis, remociones };
}
