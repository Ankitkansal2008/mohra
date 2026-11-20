import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearStoredStreak,
  getStreak,
  getYesterdayDateString,
  loadStoredStreak,
  recordPuzzleSolved,
  STORAGE_KEY_STREAK,
} from '../../src/puzzles/streak.ts';

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

describe('Puzzle streak tracking (src/puzzles/streak.ts)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    clearStoredStreak();
  });

  it('calculates yesterday date correctly across months and leap years', () => {
    expect(getYesterdayDateString('2026-11-21')).toBe('2026-11-20');
    expect(getYesterdayDateString('2026-03-01')).toBe('2026-02-28');
    expect(getYesterdayDateString('2024-03-01')).toBe('2024-02-29'); // Leap year
    expect(getYesterdayDateString('2026-01-01')).toBe('2025-12-31');
  });

  it('streak increments on consecutive days and resets after a gap', () => {
    // Day 1: Solve on 2026-11-01 -> streak starts at 1
    const day1Streak = recordPuzzleSolved('2026-11-01');
    expect(day1Streak).toBe(1);
    expect(getStreak('2026-11-01')).toBe(1);

    // Day 2: Solve on 2026-11-02 -> consecutive day increments to 2
    const day2Streak = recordPuzzleSolved('2026-11-02');
    expect(day2Streak).toBe(2);
    expect(getStreak('2026-11-02')).toBe(2);

    // Day 3: Solve on 2026-11-03 -> consecutive day increments to 3
    const day3Streak = recordPuzzleSolved('2026-11-03');
    expect(day3Streak).toBe(3);
    expect(getStreak('2026-11-03')).toBe(3);

    // Solving again on Day 3 does not double-increment
    const day3Again = recordPuzzleSolved('2026-11-03');
    expect(day3Again).toBe(3);

    // Day 5: Gap! Player missed Day 4 (2026-11-04). Solve on 2026-11-05
    const day5Streak = recordPuzzleSolved('2026-11-05');
    // Any gap resets streak to 1
    expect(day5Streak).toBe(1);
    expect(getStreak('2026-11-05')).toBe(1);
  });

  it('getStreak returns active streak when checked on yesterday or today, but 0 after a gap', () => {
    recordPuzzleSolved('2026-11-10');

    // On same day: returns 1
    expect(getStreak('2026-11-10')).toBe(1);

    // On next day before solving: still returns 1 (active streak waiting for today\'s solve)
    expect(getStreak('2026-11-11')).toBe(1);

    // Two days later without solving: gap broke the streak, returns 0
    expect(getStreak('2026-11-12')).toBe(0);
  });

  it('persists in localStorage under STORAGE_KEY_STREAK', () => {
    recordPuzzleSolved('2026-11-20');
    const stored = loadStoredStreak();
    expect(stored).toEqual({ streak: 1, lastSolvedDate: '2026-11-20' });

    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY_STREAK);
      expect(raw).toContain('"streak":1');
      expect(raw).toContain('"lastSolvedDate":"2026-11-20"');
    }
  });
});
