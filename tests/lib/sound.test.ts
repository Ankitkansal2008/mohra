import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  initAudioUnlock,
  playMoveSound,
  playSound,
  resetAudioForTesting,
  setAudioContextForTesting,
  setReviewingProvider,
  unlockAudio,
} from '../../src/lib/sound.ts';
import { createInitialUiState } from '../../src/game/selectors.ts';
import { loadSavedSettings, saveSettings } from '../../src/lib/persist.ts';

const storage = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, String(v)),
  removeItem: (k: string) => storage.delete(k),
  clear: () => storage.clear(),
};

function createMockAudioContext(initialState: AudioContextState = 'running') {
  let currentTime = 1.0;
  const createGain = vi.fn(() => ({
    connect: vi.fn(),
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() },
  }));
  const createOscillator = vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    type: 'sine' as OscillatorType,
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  }));
  const createBiquadFilter = vi.fn(() => ({
    connect: vi.fn(),
    type: 'lowpass' as BiquadFilterType,
    frequency: { setValueAtTime: vi.fn() },
  }));
  const createBufferSource = vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), buffer: null }));

  return {
    get state() { return initialState; },
    set state(val: AudioContextState) { initialState = val; },
    get currentTime() { return currentTime; },
    set currentTime(t: number) { currentTime = t; },
    destination: {},
    createGain,
    createOscillator,
    createBiquadFilter,
    createBufferSource,
    createBuffer: vi.fn(() => ({})),
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe('Sound module (src/lib/sound.ts)', () => {
  let mockCtx: ReturnType<typeof createMockAudioContext>;
  const listeners = new Map<string, Set<(e?: unknown) => void>>();

  beforeEach(() => {
    storage.clear();
    listeners.clear();
    resetAudioForTesting();
    mockCtx = createMockAudioContext('running');

    function MockAudioContextConstructor(this: unknown) {
      return mockCtx;
    }

    const mockWindow = {
      localStorage: localStorageMock,
      AudioContext: vi.fn().mockImplementation(MockAudioContextConstructor),
      addEventListener: vi.fn((type: string, fn: (e?: unknown) => void) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(fn);
      }),
      removeEventListener: vi.fn((type: string, fn: (e?: unknown) => void) => {
        listeners.get(type)?.delete(fn);
      }),
      dispatchEvent: vi.fn((evt: { type: string }) => {
        listeners.get(evt.type)?.forEach((fn) => fn(evt));
        return true;
      }),
    };

    (globalThis as unknown as { window: unknown; localStorage: unknown }).window = mockWindow;
    (globalThis as unknown as { localStorage: unknown }).localStorage = localStorageMock;
    setAudioContextForTesting(mockCtx as unknown as AudioContext);
  });

  afterEach(() => {
    resetAudioForTesting();
    vi.restoreAllMocks();
  });

  describe('Context availability and mute handling', () => {
    it('playing a sound when the context is unavailable does not throw', () => {
      setAudioContextForTesting(null);
      expect(() => playSound('move', true)).not.toThrow();
      expect(() => playMoveSound('e4', 'playing', true)).not.toThrow();
    });

    it('the mute setting suppresses every sound without creating nodes', () => {
      playSound('move', false);
      playSound('capture', false);
      playSound('check', false);
      playSound('gameEnd', false, 'win');
      playMoveSound('Nxd5', 'playing', false);
      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
      expect(mockCtx.createGain).not.toHaveBeenCalled();
    });

    it('until the context is running, sound calls are silent no-ops', () => {
      mockCtx.state = 'suspended';
      playSound('move', true);
      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
      expect(mockCtx.createGain).not.toHaveBeenCalled();
    });
  });

  describe('Audio unlock mechanism', () => {
    it('unlocks AudioContext and plays silent buffer on user gesture', () => {
      setAudioContextForTesting(null);
      unlockAudio();
      expect(mockCtx.createBuffer).toHaveBeenCalledWith(1, 1, 22050);
      expect(mockCtx.createBufferSource).toHaveBeenCalled();
    });

    it('listens for pointerdown and keydown then removes listeners after trigger', () => {
      initAudioUnlock();
      expect(window.addEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function), { capture: true });
      expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), { capture: true });

      window.dispatchEvent(new Event('pointerdown'));
      expect(window.removeEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
      expect(window.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
    });
  });

  describe('Synthesized sound effects', () => {
    it('plays move sound as short soft click with lowpass filter', () => {
      playSound('move', true);
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(1);
      expect(mockCtx.createBiquadFilter).toHaveBeenCalledTimes(1);
    });

    it('plays capture sound as dull thud with lowpass filter', () => {
      playSound('capture', true);
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(1);
      expect(mockCtx.createBiquadFilter).toHaveBeenCalledTimes(1);
    });

    it('plays castle sound with two quick clicks', () => {
      playSound('castle', true);
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
      expect(mockCtx.createBiquadFilter).toHaveBeenCalledTimes(1);
    });

    it('plays check sound as two-tone alert', () => {
      playSound('check', true);
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
    });

    it('plays promote sound as rising three-note arpeggio', () => {
      playSound('promote', true);
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3);
    });

    it('plays game end chords for win, loss, and draw', () => {
      playSound('gameEnd', true, 'win');
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3);

      mockCtx.currentTime = 2.0;
      playSound('gameEnd', true, 'loss');
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(6);

      mockCtx.currentTime = 3.0;
      playSound('gameEnd', true, 'draw');
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(9);
    });

    it('playMoveSound dispatches castle, promote, capture, check, and gameEnd', () => {
      playMoveSound('O-O', 'playing', true);
      playMoveSound('e8=Q', 'playing', true);
      playMoveSound('exd5', 'playing', true);
      playMoveSound('Nf3+', 'check', true);
      playMoveSound('Qxf7#', 'checkmate', true, 'win');
      expect(mockCtx.createOscillator).toHaveBeenCalled();
    });
  });

  describe('Overlap limiter and review mode suppression', () => {
    it('never overlaps the same sound more than twice', () => {
      const stops: Array<() => void> = [];
      mockCtx.createOscillator = vi.fn(() => {
        const stop = vi.fn();
        stops.push(stop);
        return {
          connect: vi.fn(),
          start: vi.fn(),
          stop,
          type: 'sine' as OscillatorType,
          frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        };
      });

      playSound('move', true); // Instance 1: schedules stop at 1.04
      playSound('move', true); // Instance 2: schedules stop at 1.04
      expect(stops[0]).toHaveBeenCalledTimes(1); // Scheduled only

      playSound('move', true); // Instance 3 triggers eviction of instance 1
      expect(stops[0]).toHaveBeenCalledTimes(2); // Stopped early by eviction
    });

    it('suppresses sound while reviewing moves in a finished game', () => {
      setReviewingProvider(() => true);
      playSound('move', true);
      playMoveSound('e4', 'playing', true);
      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
    });
  });

  describe('Default soundOn setting and persistence', () => {
    it('defaults soundOn to true for new players', () => {
      const state = createInitialUiState();
      expect(state.soundOn).toBe(true);

      const loaded = loadSavedSettings();
      expect(loaded).toBeNull();
    });

    it('persists and respects the player mute toggle', () => {
      saveSettings({ soundOn: false });
      const loaded = loadSavedSettings();
      expect(loaded?.soundOn).toBe(false);

      saveSettings({ soundOn: true });
      const reloaded = loadSavedSettings();
      expect(reloaded?.soundOn).toBe(true);
    });
  });
});
