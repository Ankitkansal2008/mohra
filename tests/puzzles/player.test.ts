import { describe, expect, it } from 'vitest';
import { createPuzzlePlayer } from '../../src/puzzles/player.ts';
import type { Puzzle } from '../../src/puzzles/types.ts';

// Multi-ply puzzle (mate in 2: setup + player1 + opp_reply + player2)
const MATE_IN_2_PUZZLE: Puzzle = {
  id: '12AwL',
  fen: '5k2/2p4p/p1R1n1p1/1p2N3/3P4/qPP5/P2bRPPP/6K1 w - - 8 35',
  moves: ['e2d2', 'a3c1', 'd2d1', 'c1d1'],
  rating: 634,
  themes: ['backRankMate', 'endgame', 'fork', 'mateIn2', 'short'],
  side: 'b',
};

// Single-ply puzzle (mate in 1: setup + player1)
const MATE_IN_1_PUZZLE: Puzzle = {
  id: '6y9a0',
  fen: '8/8/2P2k2/3B1p2/3NpK1p/2r5/5P2/8 w - - 2 49',
  moves: ['d4b5', 'c3f3'],
  rating: 601,
  themes: ['endgame', 'mateIn1'],
  side: 'b',
};

describe('PuzzlePlayer state machine (src/puzzles/player.ts)', () => {
  it('load(puzzle): applies moves[0] automatically, then waits for the player', () => {
    const player = createPuzzlePlayer();
    player.load(MATE_IN_1_PUZZLE);

    // Initial position was White's turn; moves[0] is White's setup move d4b5
    expect(player.getCurrentMoveIndex()).toBe(1);
    expect(player.getTurn()).toBe('b');
    expect(player.getLastMove()).toEqual(['d4', 'b5']);
    expect(player.isSolved()).toBe(false);
  });

  it('a wrong move reverts the board', () => {
    const player = createPuzzlePlayer();
    player.load(MATE_IN_1_PUZZLE);

    const fenBeforeAttempt = player.getFen();

    // Black plays a wrong legal move: c3c2 instead of expected c3f3
    const result = player.tryMove('c3', 'c2');

    expect(result).toBe('wrong');
    expect(player.getFen()).toBe(fenBeforeAttempt);
    expect(player.getCurrentMoveIndex()).toBe(1);
    expect(player.getWrongAttempts()).toBe(1);
    expect(player.isSolved()).toBe(false);

    // Playing an illegal shape also reverts and returns wrong
    const illegalResult = player.tryMove('c3', 'h8');
    expect(illegalResult).toBe('wrong');
    expect(player.getFen()).toBe(fenBeforeAttempt);
    expect(player.getWrongAttempts()).toBe(2);
  });

  it('a correct move advances to the opponent\'s reply', () => {
    const player = createPuzzlePlayer();
    player.load(MATE_IN_2_PUZZLE);

    expect(player.getCurrentMoveIndex()).toBe(1);
    expect(player.getTurn()).toBe('b');

    // Expected player move is a3c1
    // By default, tryMove auto-applies opponent's reply d2d1
    const result = player.tryMove('a3', 'c1');

    expect(result).toBe('correct');
    // Advances through player move (index 2) AND opponent reply d2d1 (index 3)
    expect(player.getCurrentMoveIndex()).toBe(3);
    expect(player.getLastMove()).toEqual(['d2', 'd1']);
    expect(player.getTurn()).toBe('b');
    expect(player.isSolved()).toBe(false);

    // Final move by player c1d1 solves the puzzle
    const finalResult = player.tryMove('c1', 'd1');
    expect(finalResult).toBe('correct');
    expect(player.getCurrentMoveIndex()).toBe(4);
    expect(player.isSolved()).toBe(true);
  });

  it('reveal completes the puzzle', () => {
    const player = createPuzzlePlayer();
    player.load(MATE_IN_2_PUZZLE);

    expect(player.isSolved()).toBe(false);
    expect(player.getCurrentMoveIndex()).toBe(1);

    player.reveal();

    expect(player.isSolved()).toBe(true);
    expect(player.isRevealed()).toBe(true);
    expect(player.getCurrentMoveIndex()).toBe(4);
    expect(player.getLastMove()).toEqual(['c1', 'd1']);
  });
});
