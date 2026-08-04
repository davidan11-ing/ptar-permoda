// Hook de polling periódico para detectar nuevos registros de caudales y reactivos
import { useEffect, useRef } from 'react';
import { getCaudalesRecientes, getReactivosRecientes } from '../services/ptarClient';

// Estructura del evento emitido al detectar un registro nuevo
export interface RegistroEvent {
  tipo: 'caudal' | 'reactivo';
  formNombre: string;
  usuario: string;
  turno: string;
}

// Límite de claves únicas recordadas para evitar notificaciones duplicadas
const MAX_SEEN   = 400;
// Intervalo de consulta en milisegundos (15 segundos)
const POLL_MS    = 15_000;
// Ventana de tiempo consultada en minutos (Zscaler bloquea WebSockets)
const WINDOW_MIN = 120;   // consultar solo las últimas 2 horas (Zscaler bloquea WS)

// Hook que sondea la API cada 15 s y dispara callback al detectar registros nuevos
export function useRegistrosPolling(
  onNuevo: (evt: RegistroEvent) => void,
  enabled: boolean,
) {
  // Arreglo ordenado de claves ya vistas para manejo de desalojo FIFO
  const seenRef    = useRef<string[]>([]);
  // Set de claves ya vistas para búsqueda O(1)
  const seenSetRef = useRef<Set<string>>(new Set());
  // Referencia al callback para evitar stale closures en el intervalo
  const cbRef      = useRef(onNuevo);
  // Bandera para evitar llamadas concurrentes al mismo ciclo de polling
  const busyRef    = useRef(false);
  cbRef.current    = onNuevo;

  // Registra una clave como vista y aplica desalojo si supera el máximo
  const addSeen = (key: string) => {
    if (seenSetRef.current.has(key)) return;
    seenRef.current.push(key);
    seenSetRef.current.add(key);
    if (seenRef.current.length > MAX_SEEN) {
      const evicted = seenRef.current.splice(0, seenRef.current.length - MAX_SEEN);
      evicted.forEach(k => seenSetRef.current.delete(k));
    }
  };

  // Efecto principal: arranca el intervalo de polling cuando el hook está habilitado
  useEffect(() => {
    if (!enabled) return;
    let active = true;

    // Genera una clave única por registro para detectar duplicados entre ciclos
    const makeKey = (
      tipo: string,
      r: { usuario: string; turno: string; created_at: string },
    ) => {
      const min = Math.floor(new Date(r.created_at).getTime() / 60_000);
      return `${tipo}|${r.usuario}|${r.turno}|${min}`;
    };

    // Consulta caudales y reactivos recientes; en el ciclo seed solo inicializa el estado
    const poll = async (seed: boolean) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();

        // Consulta paralela de caudales y reactivos de la última ventana
        const [cnt, cos] = await Promise.all([
          getCaudalesRecientes(since, 60).catch(() => []),
          getReactivosRecientes(since, 60).catch(() => []),
        ]);

        if (!active) return;

        // Unifica ambos tipos de registro con su clave y tipo correspondiente
        const groups = [
          ...cnt.filter(r => !!r.created_at).map(r => ({ key: makeKey('caudal',   r as Required<typeof r>), tipo: 'caudal'   as const, ...r })),
          ...cos.filter(r => !!r.created_at).map(r => ({ key: makeKey('reactivo', r as Required<typeof r>), tipo: 'reactivo' as const, ...r })),
        ];

        // Ciclo seed: solo marca los registros existentes como vistos sin notificar
        if (seed) {
          groups.forEach(g => addSeen(g.key));
          return;
        }

        // Control de duplicados dentro del mismo ciclo de polling
        const firedThisPoll = new Set<string>();
        for (const g of groups) {
          if (!seenSetRef.current.has(g.key) && !firedThisPoll.has(g.key)) {
            addSeen(g.key);
            firedThisPoll.add(g.key);
            // Dispara el callback con los datos del registro nuevo detectado
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

    // Ciclo inicial para capturar el estado base sin emitir notificaciones
    poll(true);
    const timer = setInterval(() => poll(false), POLL_MS);
    return () => { active = false; clearInterval(timer); };
  }, [enabled]);
}
