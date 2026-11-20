import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  initAudioUnlock, playMoveSound, playSound, resetAudioForTesting,
  setAudioContextForTesting, setReviewingProvider, unlockAudio,
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
  return {
    get state() { return initialState; },
    set state(val: AudioContextState) { initialState = val; },
    get currentTime() { return currentTime; },
    set currentTime(t: number) { currentTime = t; },
    destination: {},
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() },
    })),
    createOscillator: vi.fn(() => ({
      connect: vi.fn(), start: vi.fn(), stop: vi.fn(), type: 'sine' as OscillatorType,
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    })),
    createBiquadFilter: vi.fn(() => ({
      connect: vi.fn(), type: 'lowpass' as BiquadFilterType, frequency: { setValueAtTime: vi.fn() },
    })),
    createBufferSource: vi.fn(() => ({ connect: vi.fn(), start: vi.fn(), buffer: null })),
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

    const addListener = vi.fn((type: string, fn: (e?: unknown) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    });
    const removeListener = vi.fn((type: string, fn: (e?: unknown) => void) => {
      listeners.get(type)?.delete(fn);
    });
    const dispatch = vi.fn((evt: { type: string }) => {
      listeners.get(evt.type)?.forEach((fn) => fn(evt));
      return true;
    });

    const mockWindow = {
      localStorage: localStorageMock,
      AudioContext: vi.fn().mockImplementation(function (this: unknown) { return mockCtx; }),
      addEventListener: addListener,
      removeEventListener: removeListener,
      dispatchEvent: dispatch,
    };
    const mockDocument = {
      visibilityState: 'visible',
      addEventListener: addListener,
      removeEventListener: removeListener,
      dispatchEvent: dispatch,
    };

    const g = globalThis as unknown as { window: unknown; document: unknown; localStorage: unknown };
    g.window = mockWindow;
    g.document = mockDocument;
    g.localStorage = localStorageMock;
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
      expect(() => playSound('refuse', true)).not.toThrow();
      expect(() => playSound('notify', true)).not.toThrow();
      expect(() => playMoveSound('e4', 'playing', true)).not.toThrow();
    });

    it('the mute setting suppresses every sound without creating nodes', () => {
      playSound('move', false);
      playSound('refuse', false);
      playSound('notify', false);
      playSound('capture', false);
      playSound('check', false);
      playSound('gameEnd', false, 'win');
      playMoveSound('Nxd5', 'playing', false);
      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
      expect(mockCtx.createGain).not.toHaveBeenCalled();
    });

    it('sound calls are no-ops while the context is suspended and trigger resume', () => {
      mockCtx.state = 'suspended';
      playSound('move', true);
      playSound('capture', true);
      playSound('castle', true);
      playSound('check', true);
      playSound('promote', true);
      playSound('gameEnd', true, 'win');
      playSound('refuse', true);
      playSound('notify', true);
      playMoveSound('e4', 'playing', true);

      expect(mockCtx.resume).toHaveBeenCalled();
      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
      expect(mockCtx.createGain).not.toHaveBeenCalled();
      expect(mockCtx.createBiquadFilter).not.toHaveBeenCalled();
    });
  });

  describe('Audio unlock mechanism', () => {
    it('the unlock function resumes the context exactly once', () => {
      setAudioContextForTesting(null);
      initAudioUnlock();

      expect(document.addEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function), { capture: true });
      expect(document.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { capture: true });
      expect(document.addEventListener).toHaveBeenCalledWith('click', expect.any(Function), { capture: true });

      document.dispatchEvent(new Event('pointerdown'));
      expect(mockCtx.resume).toHaveBeenCalledTimes(1);
      expect(mockCtx.createBuffer).toHaveBeenCalledWith(1, 1, 22050);
      expect(mockCtx.createBufferSource).toHaveBeenCalledTimes(1);

      expect(document.removeEventListener).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
      expect(document.removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), true);
      expect(document.removeEventListener).toHaveBeenCalledWith('click', expect.any(Function), true);

      // Subsequent gestures or unlockAudio calls do not resume again
      document.dispatchEvent(new Event('touchstart'));
      document.dispatchEvent(new Event('click'));
      unlockAudio();
      expect(mockCtx.resume).toHaveBeenCalledTimes(1);
    });

    it('resumes context on visibilitychange when page becomes visible', () => {
      initAudioUnlock();
      mockCtx.state = 'suspended';
      (document as unknown as { visibilityState: string }).visibilityState = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
      expect(mockCtx.resume).toHaveBeenCalled();
    });
  });

  describe('Synthesized sound effects', () => {
    it('plays move sound as short soft click with lowpass filter', () => {
      playSound('move', true);
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(1);
      expect(mockCtx.createBiquadFilter).toHaveBeenCalledTimes(1);
    });

    it('plays refuse sound as soft low tone with fast decay and 0.30 peak gain', () => {
      playSound('refuse', true);
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(1);
      const gainNode = mockCtx.createGain.mock.results[0]?.value;
      expect(gainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.30, expect.any(Number));
    });

    it('plays notify sound as light high blip with 0.25 peak gain', () => {
      playSound('notify', true);
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(1);
      const gainNode = mockCtx.createGain.mock.results[0]?.value;
      expect(gainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.25, expect.any(Number));
    });

    it('plays capture, castle, check, promote, and game end chords', () => {
      playSound('capture', true);
      playSound('castle', true);
      playSound('check', true);
      playSound('promote', true);
      playSound('gameEnd', true, 'win');
      expect(mockCtx.createOscillator).toHaveBeenCalled();
    });
  });

  describe('Overlap limiter, throttle and review suppression', () => {
    it('never overlaps the same sound more than twice', () => {
      const stops: Array<() => void> = [];
      mockCtx.createOscillator = vi.fn(() => {
        const stop = vi.fn();
        stops.push(stop);
        return {
          connect: vi.fn(), start: vi.fn(), stop, type: 'sine' as OscillatorType,
          frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        };
      });

      playSound('move', true);
      playSound('move', true);
      expect(stops[0]).toHaveBeenCalledTimes(1);
      playSound('move', true);
      expect(stops[0]).toHaveBeenCalledTimes(2);
    });

    it('rate-limits refuse and notify to at most once per 250 ms', () => {
      playSound('refuse', true);
      playSound('refuse', true); // Within 250ms -> throttled
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(1);

      playSound('notify', true);
      playSound('notify', true); // Within 250ms -> throttled
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(2);
    });

    it('suppresses sound while reviewing moves in a finished game', () => {
      setReviewingProvider(() => true);
      playSound('move', true);
      playSound('refuse', true);
      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
    });
  });

  describe('Default soundOn setting and persistence', () => {
    it('defaults soundOn to true for new players', () => {
      expect(createInitialUiState().soundOn).toBe(true);
      expect(loadSavedSettings()).toBeNull();
    });

    it('persists and respects the player mute toggle', () => {
      saveSettings({ soundOn: false });
      expect(loadSavedSettings()?.soundOn).toBe(false);
      saveSettings({ soundOn: true });
      expect(loadSavedSettings()?.soundOn).toBe(true);
    });
  });
});
