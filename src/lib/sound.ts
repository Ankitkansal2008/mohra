// Synthesized Web Audio sound effects ensure no external network assets are required in v1.
import type { GameStatus, Side } from '../game/types.ts';
import {
  type ActiveSoundInstance,
  type GameEndOutcome,
  playCapture,
  playCastle,
  playCheck,
  playEndGame,
  playMove,
  playPromote,
} from './soundEffects.ts';

export type { GameEndOutcome };

export type SoundEffect =
  | 'move'
  | 'capture'
  | 'castle'
  | 'check'
  | 'promote'
  | 'gameEnd';

let audioCtx: AudioContext | null = null;
let unlockListenersAttached = false;
let isReviewingProvider: (() => boolean) | null = null;
const activeInstances = new Map<SoundEffect, ActiveSoundInstance[]>();

export function setReviewingProvider(fn: (() => boolean) | null): void {
  isReviewingProvider = fn;
}

function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

export function getAudioContext(): AudioContext | null {
  return audioCtx;
}

// User gesture unlock: required by mobile Safari and modern browser autoplay policies.
export function unlockAudio(): void {
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) return;

  try {
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    // Play a 1-sample silent buffer on user gesture for iOS Safari compatibility
    const buffer = audioCtx.createBuffer(1, 1, 22050);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
  } catch {
    // Strictly constrained browser autoplay policies fail silently
  }
}

function handleUnlock(): void {
  removeUnlockListeners();
  unlockAudio();
}

export function removeUnlockListeners(): void {
  if (typeof window === 'undefined') return;
  window.removeEventListener('pointerdown', handleUnlock, true);
  window.removeEventListener('keydown', handleUnlock, true);
  unlockListenersAttached = false;
}

export function initAudioUnlock(): void {
  if (typeof window === 'undefined' || unlockListenersAttached) return;
  window.addEventListener('pointerdown', handleUnlock, { capture: true });
  window.addEventListener('keydown', handleUnlock, { capture: true });
  unlockListenersAttached = true;
}

if (typeof window !== 'undefined') {
  initAudioUnlock();
}

function registerInstance(effect: SoundEffect, instance: ActiveSoundInstance, now: number): void {
  const current = (activeInstances.get(effect) || []).filter((item) => item.endsAt > now);
  // Never overlap the same sound more than twice
  while (current.length >= 2) {
    const oldest = current.shift();
    if (oldest) {
      try {
        oldest.stop();
      } catch {}
    }
  }
  current.push(instance);
  activeInstances.set(effect, current);
}

export function playSound(effect: SoundEffect, enabled: boolean, outcome: GameEndOutcome = 'draw'): void {
  if (!enabled) return;
  if (!audioCtx || audioCtx.state !== 'running') return;
  if (isReviewingProvider && isReviewingProvider()) return;

  try {
    const now = audioCtx.currentTime;
    let instance: ActiveSoundInstance;

    switch (effect) {
      case 'move':
        instance = playMove(audioCtx, now);
        break;
      case 'capture':
        instance = playCapture(audioCtx, now);
        break;
      case 'castle':
        instance = playCastle(audioCtx, now);
        break;
      case 'check':
        instance = playCheck(audioCtx, now);
        break;
      case 'promote':
        instance = playPromote(audioCtx, now);
        break;
      case 'gameEnd':
        instance = playEndGame(audioCtx, now, outcome);
        break;
    }

    registerInstance(effect, instance, now);
  } catch {
    // Autoplay restrictions or audio failures fail silently without throwing
  }
}

export function resolveGameEndOutcome(
  game?: { winner: Side | null; mode: string; humanSide: Side } | null,
): GameEndOutcome {
  if (!game || !game.winner) return 'draw';
  if (game.mode === 'computer') {
    return game.winner === game.humanSide ? 'win' : 'loss';
  }
  return 'win';
}

export function playMoveSound(
  san: string,
  status: GameStatus,
  enabled: boolean,
  context?: { winner: Side | null; mode: string; humanSide: Side } | GameEndOutcome,
): void {
  if (!enabled) return;
  const outcome: GameEndOutcome =
    typeof context === 'string'
      ? context
      : resolveGameEndOutcome(context);

  if (
    status === 'checkmate' ||
    status === 'stalemate' ||
    status === 'draw-repetition' ||
    status === 'draw-fifty' ||
    status === 'draw-material' ||
    status === 'resigned' ||
    status === 'timeout'
  ) {
    playSound('gameEnd', enabled, outcome);
  } else if (status === 'check') {
    playSound('check', enabled);
  } else if (san.includes('=')) {
    playSound('promote', enabled);
  } else if (san.startsWith('O-O') || san.startsWith('0-0')) {
    playSound('castle', enabled);
  } else if (san.includes('x')) {
    playSound('capture', enabled);
  } else {
    playSound('move', enabled);
  }
}

export function resetAudioForTesting(): void {
  removeUnlockListeners();
  if (audioCtx) {
    try {
      audioCtx.close().catch(() => {});
    } catch {}
    audioCtx = null;
  }
  activeInstances.clear();
  isReviewingProvider = null;
}

export function setAudioContextForTesting(ctx: AudioContext | null): void {
  audioCtx = ctx;
}
