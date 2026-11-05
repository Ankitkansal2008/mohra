// Synthesized Web Audio sound effects ensure no external network assets are required in v1.
import type { GameStatus } from '../game/types.ts';

export type SoundEffect = 'move' | 'capture' | 'check' | 'gameEnd';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playSound(effect: SoundEffect, enabled: boolean): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (effect) {
      case 'move': {
        // Soft wooden tap: gentle downward frequency sweep with quick decay
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.05);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.06);
        break;
      }
      case 'capture': {
        // Crisp dual-tone impact
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.07);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }
      case 'check': {
        // Alert chime: high double tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.setValueAtTime(740, now + 0.07);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.19);
        break;
      }
      case 'gameEnd': {
        // Concluding harmonic resolution
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.36);
        break;
      }
    }
  } catch {
    // Browsers with strict auto-play policies silently fail without throwing
  }
}

export function playMoveSound(san: string, status: GameStatus, enabled: boolean): void {
  if (!enabled) return;
  if (
    status === 'checkmate' ||
    status === 'stalemate' ||
    status === 'draw-repetition' ||
    status === 'draw-fifty' ||
    status === 'draw-material' ||
    status === 'resigned' ||
    status === 'timeout'
  ) {
    playSound('gameEnd', enabled);
  } else if (status === 'check') {
    playSound('check', enabled);
  } else if (san.includes('x')) {
    playSound('capture', enabled);
  } else {
    playSound('move', enabled);
  }
}
