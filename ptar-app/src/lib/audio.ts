/** Ping de 2 tonos (Do→Mi) vía Web Audio API. Sin dependencias externas. */
export function playPing() {
  try {
    const ctx = new AudioContext();
    const tone = (freq: number, start: number, dur: number) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    };
    tone(523, 0,    0.14); // Do5
    tone(659, 0.17, 0.2);  // Mi5
  } catch {
    // contexto de audio bloqueado o no disponible — ignorar silenciosamente
  }
}
