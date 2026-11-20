// Deterministic daily puzzle selector based on calendar date hash.
import type { Puzzle } from './types.ts';

export function hashDate(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function getDailyPuzzle(puzzles: readonly Puzzle[], dateStr?: string): Puzzle | null {
  if (!puzzles || puzzles.length === 0) return null;
  const targetDate = dateStr ?? getTodayDateString();
  const index = hashDate(targetDate) % puzzles.length;
  return puzzles[index] ?? null;
}

