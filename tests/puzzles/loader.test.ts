import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCachedPuzzles, loadPuzzles, setPuzzlesCache } from '../../src/puzzles/loader.ts';
import type { PuzzleData } from '../../src/puzzles/types.ts';

const MOCK_DATA: PuzzleData = {
  version: 1,
  count: 2,
  puzzles: [
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
  ],
};

describe('Puzzles loader (src/puzzles/loader.ts)', () => {
  beforeEach(() => {
    setPuzzlesCache(null);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setPuzzlesCache(null);
    vi.restoreAllMocks();
  });

  it('fetches and caches dataset once in memory', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_DATA,
    });
    vi.stubGlobal('fetch', fetchSpy);

    const first = await loadPuzzles('/data/puzzles.json');
    expect(first.count).toBe(2);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call should return cached instance without fetching again
    const second = await loadPuzzles('/data/puzzles.json');
    expect(second).toBe(first);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(getCachedPuzzles()).toBe(first);
  });

  it('throws an error when fetch fails', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });
    vi.stubGlobal('fetch', fetchSpy);

    await expect(loadPuzzles('/bad/path.json')).rejects.toThrow('Failed to load puzzles: 404');
  });
});

