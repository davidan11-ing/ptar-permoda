import { useEffect, useRef } from 'react';
import { getCaudalesRecientes, getReactivosRecientes } from '../services/ptarClient';

export interface RegistroEvent {
  tipo: 'caudal' | 'reactivo';
  formNombre: string;
  usuario: string;
  turno: string;
}

const MAX_SEEN   = 400;
const POLL_MS    = 15_000;
const WINDOW_MIN = 120;   // consultar solo las últimas 2 horas (Zscaler bloquea WS)

export function useRegistrosPolling(
  onNuevo: (evt: RegistroEvent) => void,
  enabled: boolean,
) {
  const seenRef    = useRef<string[]>([]);
  const seenSetRef = useRef<Set<string>>(new Set());
  const cbRef      = useRef(onNuevo);
  const busyRef    = useRef(false);
  cbRef.current    = onNuevo;

  const addSeen = (key: string) => {
    if (seenSetRef.current.has(key)) return;
    seenRef.current.push(key);
    seenSetRef.current.add(key);
    if (seenRef.current.length > MAX_SEEN) {
      const evicted = seenRef.current.splice(0, seenRef.current.length - MAX_SEEN);
      evicted.forEach(k => seenSetRef.current.delete(k));
    }
  };

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const makeKey = (
      tipo: string,
      r: { usuario: string; turno: string; created_at: string },
    ) => {
      const min = Math.floor(new Date(r.created_at).getTime() / 60_000);
      return `${tipo}|${r.usuario}|${r.turno}|${min}`;
    };

    const poll = async (seed: boolean) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();

        const [cnt, cos] = await Promise.all([
          getCaudalesRecientes(since, 60).catch(() => []),
          getReactivosRecientes(since, 60).catch(() => []),
        ]);

        if (!active) return;

        const groups = [
          ...cnt.filter(r => !!r.created_at).map(r => ({ key: makeKey('caudal',   r as Required<typeof r>), tipo: 'caudal'   as const, ...r })),
          ...cos.filter(r => !!r.created_at).map(r => ({ key: makeKey('reactivo', r as Required<typeof r>), tipo: 'reactivo' as const, ...r })),
        ];

        if (seed) {
          groups.forEach(g => addSeen(g.key));
          return;
        }

        const firedThisPoll = new Set<string>();
        for (const g of groups) {
          if (!seenSetRef.current.has(g.key) && !firedThisPoll.has(g.key)) {
            addSeen(g.key);
            firedThisPoll.add(g.key);
            cbRef.current({
              tipo:       g.tipo,
              formNombre: g.tipo === 'caudal' ? 'F-01 Registro de Caudales' : 'F-02 Registro de Reactivos',
              usuario:    g.usuario,
              turno:      g.turno,
            });
          }
        }
      } finally {
        busyRef.current = false;
      }
    };

    poll(true);
    const timer = setInterval(() => poll(false), POLL_MS);
    return () => { active = false; clearInterval(timer); };
  }, [enabled]);
}
