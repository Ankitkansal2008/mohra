// Streak management in localStorage: tracks daily puzzle completion streaks.
import type { StoredStreak } from './types.ts';
import { getTodayDateString } from './daily.ts';

export const STORAGE_KEY_STREAK = 'mohra:puzzles:streak:v1';

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
    return (globalThis as unknown as { localStorage: Storage }).localStorage;
  }
  return null;
}

export function getYesterdayDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}

export function loadStoredStreak(): StoredStreak | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY_STREAK);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.streak === 'number' && typeof parsed?.lastSolvedDate === 'string') {
      return parsed as StoredStreak;
    }
  } catch {}
  return null;
}

export function saveStoredStreak(data: StoredStreak): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY_STREAK, JSON.stringify(data));
  } catch {}
}

export function clearStoredStreak(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY_STREAK);
  } catch {}
}

export function getStreak(todayStr: string = getTodayDateString()): number {
  const stored = loadStoredStreak();
  if (!stored) return 0;
  const yesterday = getYesterdayDateString(todayStr);

  // If solved today or yesterday, streak is active
  if (stored.lastSolvedDate === todayStr || stored.lastSolvedDate === yesterday) {
    return stored.streak;
  }

  // Any gap beyond yesterday resets the readable streak to 0
  return 0;
}

export function recordPuzzleSolved(todayStr: string = getTodayDateString()): number {
  const stored = loadStoredStreak();
  const yesterday = getYesterdayDateString(todayStr);

  let newStreak = 1;
  if (stored) {
    if (stored.lastSolvedDate === todayStr) {
      return stored.streak;
    }
    if (stored.lastSolvedDate === yesterday) {
      newStreak = stored.streak + 1;
    } else {
      // Gap resets streak to 1 on completion
      newStreak = 1;
    }
  }

  saveStoredStreak({ streak: newStreak, lastSolvedDate: todayStr });
  return newStreak;
}
