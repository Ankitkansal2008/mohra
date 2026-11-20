import { describe, expect, it } from 'vitest';
import { getDailyPuzzle, hashDate } from '../../src/puzzles/daily.ts';
import type { Puzzle } from '../../src/puzzles/types.ts';

const SAMPLE_PUZZLES: Puzzle[] = [
  {
    id: 'p1',
    fen: '8/8/2P2k2/3B1p2/3NpK1p/2r5/5P2/8 w - - 2 49',
    moves: ['d4b5', 'c3f3'],
    rating: 601,
    themes: ['endgame', 'mateIn1'],
    side: 'b',
  },
  {
    id: 'p2',
    fen: '4rrk1/2qb2bp/pp1p4/n1pPppNn/P1P5/1P2N1PP/2QB1P1K/1R2RB2 b - - 1 22',
    moves: ['f5f4', 'c2h7'],
    rating: 605,
    themes: ['mateIn1', 'middlegame'],
    side: 'w',
  },
  {
    id: 'p3',
    fen: 'r4rk1/1p3pp1/p1np3p/4p3/4Q1bq/3B1R2/PPPBN2P/R5K1 b - - 5 19',
    moves: ['d6d5', 'e4h7'],
    rating: 609,
    themes: ['mateIn1', 'middlegame'],
    side: 'w',
  },
];

describe('Daily puzzle selection (src/puzzles/daily.ts)', () => {
  it('daily puzzle is stable for a given date', () => {
    const dateStr = '2026-11-21';
    const firstResult = getDailyPuzzle(SAMPLE_PUZZLES, dateStr);
    const secondResult = getDailyPuzzle(SAMPLE_PUZZLES, dateStr);

    expect(firstResult).not.toBeNull();
    expect(secondResult).not.toBeNull();
    expect(firstResult!.id).toBe(secondResult!.id);
    expect(firstResult!.rating).toBe(secondResult!.rating);
    expect(firstResult).toEqual(secondResult);
  });

  it('hashDate produces deterministic output for identical string inputs', () => {
    const hashA = hashDate('2026-05-15');
    const hashB = hashDate('2026-05-15');
    expect(hashA).toBe(hashB);
    expect(typeof hashA).toBe('number');
  });

  it('returns null when puzzle list is empty', () => {
    expect(getDailyPuzzle([])).toBeNull();
  });
});

