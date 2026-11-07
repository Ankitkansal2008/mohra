// Pure Web Audio synthesis routines for game effects.
export type GameEndOutcome = 'win' | 'loss' | 'draw';

export interface ActiveSoundInstance {
  endsAt: number;
  stop: () => void;
}

export function playMove(ctx: AudioContext, now: number): ActiveSoundInstance {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, now);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(340, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.04);
  return { endsAt: now + 0.04, stop: () => { try { osc.stop(); } catch {} } };
}

export function playCapture(ctx: AudioContext, now: number): ActiveSoundInstance {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(380, now);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(190, now);
  osc.frequency.exponentialRampToValueAtTime(55, now + 0.07);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.07);
  return { endsAt: now + 0.07, stop: () => { try { osc.stop(); } catch {} } };
}

export function playCastle(ctx: AudioContext, now: number): ActiveSoundInstance {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1100, now);
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(340, now);
  osc1.frequency.exponentialRampToValueAtTime(130, now + 0.035);
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(380, now + 0.05);
  osc2.frequency.exponentialRampToValueAtTime(150, now + 0.085);
  gain.gain.setValueAtTime(0.16, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
  gain.gain.setValueAtTime(0.16, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.035);
  osc2.start(now + 0.05);
  osc2.stop(now + 0.085);
  return { endsAt: now + 0.085, stop: () => { try { osc1.stop(); } catch {}; try { osc2.stop(); } catch {} } };
}

export function playCheck(ctx: AudioContext, now: number): ActiveSoundInstance {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(587.33, now);
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(880, now + 0.075);
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  gain.gain.setValueAtTime(0.18, now + 0.075);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.07);
  osc2.start(now + 0.075);
  osc2.stop(now + 0.16);
  return { endsAt: now + 0.16, stop: () => { try { osc1.stop(); } catch {}; try { osc2.stop(); } catch {} } };
}

export function playPromote(ctx: AudioContext, now: number): ActiveSoundInstance {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const osc3 = ctx.createOscillator();
  const gain = ctx.createGain();
  const notes = [
    { osc: osc1, freq: 523.25, start: now, end: now + 0.06 },
    { osc: osc2, freq: 659.25, start: now + 0.06, end: now + 0.12 },
    { osc: osc3, freq: 783.99, start: now + 0.12, end: now + 0.22 },
  ];
  gain.gain.setValueAtTime(0.001, now);
  for (const n of notes) {
    n.osc.type = 'sine';
    n.osc.frequency.setValueAtTime(n.freq, n.start);
    gain.gain.setValueAtTime(0.16, n.start);
    gain.gain.exponentialRampToValueAtTime(0.001, n.end);
    n.osc.connect(gain);
    n.osc.start(n.start);
    n.osc.stop(n.end);
  }
  gain.connect(ctx.destination);
  return { endsAt: now + 0.22, stop: () => { try { osc1.stop(); } catch {}; try { osc2.stop(); } catch {}; try { osc3.stop(); } catch {} } };
}

function playChord(ctx: AudioContext, now: number, freqs: [number, number, number]): ActiveSoundInstance {
  const oscs = freqs.map((freq) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    return osc;
  });
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  oscs.forEach((osc) => {
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.45);
  });
  gain.connect(ctx.destination);
  return { endsAt: now + 0.45, stop: () => { oscs.forEach((osc) => { try { osc.stop(); } catch {} }); } };
}

export function playEndGame(ctx: AudioContext, now: number, outcome: GameEndOutcome = 'draw'): ActiveSoundInstance {
  const freqs: Record<GameEndOutcome, [number, number, number]> = {
    win: [523.25, 659.25, 783.99],
    loss: [523.25, 622.25, 783.99],
    draw: [523.25, 698.46, 783.99],
  };
  return playChord(ctx, now, freqs[outcome] ?? freqs.draw);
}

// Soft low tone: 180 Hz sine, 90 ms, fast decay, volume around 0.12 (gentle thud, never a buzzer)
export function playRefuse(ctx: AudioContext, now: number): ActiveSoundInstance {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.09);
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.09);
  return { endsAt: now + 0.09, stop: () => { try { osc.stop(); } catch {} } };
}

// Light high blip: 880 Hz, 60 ms, volume around 0.10 for confirmations
export function playNotify(ctx: AudioContext, now: number): ActiveSoundInstance {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, now);
  gain.gain.setValueAtTime(0.10, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.06);
  return { endsAt: now + 0.06, stop: () => { try { osc.stop(); } catch {} } };
}
