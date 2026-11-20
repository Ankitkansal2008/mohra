// Synthesized Web Audio sound effects ensure no external network assets are required in v1.
import type { GameStatus, Side } from '../game/types.ts';
import {
  type ActiveSoundInstance,
  type GameEndOutcome,
  playCapture, playCastle, playCheck, playEndGame,
  playMove, playNotify, playPromote, playRefuse,
} from './soundEffects.ts';

export type { GameEndOutcome };

export type SoundEffect = 'move' | 'capture' | 'castle' | 'check' | 'promote' | 'gameEnd' | 'refuse' | 'notify';

const TOAST_THROTTLE_MS = 250;
let audioCtx: AudioContext | null = null;
let unlockListenersAttached = false;
let isUnlocked = false;
let visibilityListenerAttached = false;
let isReviewingProvider: (() => boolean) | null = null;
const activeInstances = new Map<SoundEffect, ActiveSoundInstance[]>();
const lastToastTime = new Map<SoundEffect, number>();

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

// User gesture unlock: runs once synchronously on first user gesture on document
export function unlockAudio(): void {
  if (isUnlocked) return;
  isUnlocked = true;
  removeUnlockListeners();

  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) return;

  try {
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    audioCtx.resume().catch(() => {});

    // Play a 1-sample silent buffer on user gesture for iOS Safari compatibility
    const buffer = audioCtx.createBuffer(1, 1, 22050);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);

    if (import.meta.env.DEV) {
      console.log('[AudioContext state after unlock]:', audioCtx.state);
    }
  } catch {
    // Strictly constrained browser autoplay policies fail silently
  }
}

function handleUnlock(): void {
  unlockAudio();
}

export function removeUnlockListeners(): void {
  if (typeof document === 'undefined') return;
  document.removeEventListener('pointerdown', handleUnlock, true);
  document.removeEventListener('touchstart', handleUnlock, true);
  document.removeEventListener('click', handleUnlock, true);
  unlockListenersAttached = false;
}

function initVisibilityListener(): void {
  if (typeof document === 'undefined' || visibilityListenerAttached) return;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && audioCtx && audioCtx.state !== 'running') {
      audioCtx.resume().catch(() => {});
    }
  });
  visibilityListenerAttached = true;
}

export function initAudioUnlock(): void {
  if (typeof document === 'undefined' || unlockListenersAttached) return;
  document.addEventListener('pointerdown', handleUnlock, { capture: true });
  document.addEventListener('touchstart', handleUnlock, { capture: true });
  document.addEventListener('click', handleUnlock, { capture: true });
  unlockListenersAttached = true;
  initVisibilityListener();
}

if (typeof document !== 'undefined') {
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
  if (!audioCtx) return;

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
    return;
  }

  if (audioCtx.state !== 'running') return;
  if (isReviewingProvider && isReviewingProvider()) return;

  // Rate-limit toast feedback sounds to at most once per 250 ms
  if (effect === 'refuse' || effect === 'notify') {
    const last = lastToastTime.get(effect) ?? 0;
    const nowMs = Date.now();
    if (nowMs - last < TOAST_THROTTLE_MS) return;
    lastToastTime.set(effect, nowMs);
  }

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
      case 'refuse':
        instance = playRefuse(audioCtx, now);
        break;
      case 'notify':
        instance = playNotify(audioCtx, now);
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
  isUnlocked = false;
  visibilityListenerAttached = false;
  if (audioCtx) {
    try {
      audioCtx.close().catch(() => {});
    } catch {}
    audioCtx = null;
  }
  activeInstances.clear();
  lastToastTime.clear();
  isReviewingProvider = null;
}

export function setAudioContextForTesting(ctx: AudioContext | null): void {
  audioCtx = ctx;
}
