import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { countPuzzlesForTheme, PRACTICE_THEMES } from '../../src/puzzles/themes.ts';
import type { PuzzleData } from '../../src/puzzles/types.ts';

describe('Practice by theme definitions and dataset counts', () => {
  const jsonPath = path.resolve(__dirname, '../../public/data/puzzles.json');
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data: PuzzleData = JSON.parse(raw);

  it('validates total puzzles count is 1158', () => {
    expect(data.count).toBe(1158);
    expect(data.puzzles).toHaveLength(1158);
  });

  it('verifies exact counts for all 6 required practice themes', () => {
    const mateIn1 = countPuzzlesForTheme(data.puzzles, 'mateIn1');
    const mateIn2 = countPuzzlesForTheme(data.puzzles, 'mateIn2');
    const fork = countPuzzlesForTheme(data.puzzles, 'fork');
    const pin = countPuzzlesForTheme(data.puzzles, 'pin');
    const discoveredAttack = countPuzzlesForTheme(data.puzzles, 'discoveredAttack');
    const hangingPiece = countPuzzlesForTheme(data.puzzles, 'hangingPiece');

    expect(mateIn1).toBe(371);
    expect(mateIn2).toBe(322);
    expect(fork).toBe(248);
    expect(pin).toBe(76);
    expect(discoveredAttack).toBe(84);
    expect(hangingPiece).toBe(55);
  });

  it('contains exactly the 6 required practice themes in PRACTICE_THEMES', () => {
    const themeKeys = PRACTICE_THEMES.map((t) => t.themeKey);
    expect(themeKeys).toEqual([
      'mateIn1',
      'mateIn2',
      'fork',
      'pin',
      'discoveredAttack',
      'hangingPiece',
    ]);
  });
});

