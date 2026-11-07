import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../../src/game/store.ts';
import { loadSavedSettings } from '../../src/lib/persist.ts';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

if (typeof globalThis.window === 'undefined') {
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: localStorageMock,
  };
} else {
  Object.defineProperty(globalThis.window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}

describe('Settings persistence and clock slice independence', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useGameStore.getState().resetGame();
  });

  it('toggling theme preserves the clock setting', () => {
    const store = useGameStore.getState();
    store.setClockEnabled(true);
    expect(loadSavedSettings()?.clockEnabled).toBe(true);

    store.setTheme('slate');
    const settings = loadSavedSettings();
    expect(settings?.theme).toBe('slate');
    expect(settings?.clockEnabled).toBe(true);
  });

  it('toggling sound preserves both theme and clock setting', () => {
    const store = useGameStore.getState();
    store.setClockEnabled(true);
    store.setTheme('slate');

    store.setSoundOn(false);
    const settings = loadSavedSettings();
    expect(settings?.soundOn).toBe(false);
    expect(settings?.theme).toBe('slate');
    expect(settings?.clockEnabled).toBe(true);
  });

  it('changing level preserves existing settings and persists level', () => {
    const store = useGameStore.getState();
    store.setClockEnabled(true);
    store.setTheme('slate');

    store.setLevel(3);
    const settings = loadSavedSettings();
    expect(settings?.level).toBe(3);
    expect(settings?.theme).toBe('slate');
    expect(settings?.clockEnabled).toBe(true);
  });

  it('a clock tick updates only the clock slice and leaves the game object identical', () => {
    const store = useGameStore.getState();
    store.setClockEnabled(true);

    const prevGame = useGameStore.getState().game;
    const prevClock = useGameStore.getState().clock;
    expect(prevClock).not.toBeNull();

    const tickTime = (prevClock?.lastTickAt ?? Date.now()) + 200;
    store.tickClock(tickTime);

    const nextGame = useGameStore.getState().game;
    const nextClock = useGameStore.getState().clock;

    // Game reference must remain strictly identical
    expect(nextGame).toBe(prevGame);

    // Only clock slice is mutated/updated
    expect(nextClock).not.toBe(prevClock);
    expect(nextClock?.whiteMs).toBeLessThan(prevClock!.whiteMs);
    expect(nextClock?.running).toBe('w');
  });
});
