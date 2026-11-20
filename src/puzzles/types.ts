export interface Puzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
  side: 'w' | 'b';
}

export interface PuzzleData {
  version: number;
  source?: string;
  note?: string;
  count: number;
  puzzles: Puzzle[];
}

export interface StoredStreak {
  streak: number;
  lastSolvedDate: string;
}

export type MoveResult = 'correct' | 'wrong';
