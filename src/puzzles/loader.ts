// Puzzles dataset loader: fetches and caches public/data/puzzles.json in memory once.
import type { PuzzleData } from './types.ts';

let cachedData: PuzzleData | null = null;
let loadPromise: Promise<PuzzleData> | null = null;

// Allows injecting or mocking puzzle fixtures during tests without network requests.
export function setPuzzlesCache(data: PuzzleData | null): void {
  cachedData = data;
  loadPromise = data ? Promise.resolve(data) : null;
}

export function getCachedPuzzles(): PuzzleData | null {
  return cachedData;
}

export async function loadPuzzles(url: string = '/data/puzzles.json'): Promise<PuzzleData> {
  if (cachedData) return cachedData;
  if (loadPromise) return loadPromise;

  loadPromise = fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load puzzles: ${res.status}`);
      }
      return res.json() as Promise<PuzzleData>;
    })
    .then((data) => {
      cachedData = data;
      return data;
    })
    .catch((err) => {
      loadPromise = null;
      throw err;
    });

  return loadPromise;
}
