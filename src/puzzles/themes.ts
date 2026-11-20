// Tactical theme definitions for practice mode.
import type { Puzzle } from './types.ts';

export interface ThemeDefinition {
  readonly id: string;
  readonly nameKey: string;
  readonly themeKey: string;
}

export const PRACTICE_THEMES: readonly ThemeDefinition[] = [
  { id: 'mateIn1', nameKey: 'puzzleThemeMateIn1', themeKey: 'mateIn1' },
  { id: 'mateIn2', nameKey: 'puzzleThemeMateIn2', themeKey: 'mateIn2' },
  { id: 'fork', nameKey: 'puzzleThemeFork', themeKey: 'fork' },
  { id: 'pin', nameKey: 'puzzleThemePin', themeKey: 'pin' },
  { id: 'discoveredAttack', nameKey: 'puzzleThemeDiscoveredAttack', themeKey: 'discoveredAttack' },
  { id: 'hangingPiece', nameKey: 'puzzleThemeHangingPiece', themeKey: 'hangingPiece' },
] as const;

export function countPuzzlesForTheme(puzzles: readonly Puzzle[], themeKey: string): number {
  return puzzles.filter((p) => p.themes.includes(themeKey)).length;
}

export function getPuzzlesForTheme(puzzles: readonly Puzzle[], themeKey: string): Puzzle[] {
  return puzzles.filter((p) => p.themes.includes(themeKey));
}
