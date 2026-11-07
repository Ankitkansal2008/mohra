import { describe, expect, it } from 'vitest';
import {
  apply,
  fen,
  findLegalMove,
  isAttacked,
  legalFrom,
  legalMovesAll,
  loadPgn,
  pgn,
  reset,
  status,
  undo,
} from '../../src/game/rules.ts';
import fixtures from './positions.json' with { type: 'json' };

interface PositionFixture {
  name: string;
  fen: string;
  moves: string[];
  expectedStatus: string;
  expectedWinner: string | null;
}

describe('rule edge case fixtures', () => {
  const positionFixtures = fixtures as PositionFixture[];

  for (const fixture of positionFixtures) {
    it(`evaluates fixture: ${fixture.name}`, () => {
      reset(fixture.fen);

      for (const move of fixture.moves) {
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);
        const promotion = move.length > 4 ? move.slice(4) : undefined;
        apply(from, to, promotion);
      }

      const currentStatus = status();
      expect(currentStatus.status).toBe(fixture.expectedStatus);
      expect(currentStatus.winner).toBe(fixture.expectedWinner);
    });
  }

  it('proves castling refused through check prevents kingside castle', () => {
    reset('4kr2/8/8/8/8/8/8/R3K2R w KQ - 0 1');
    expect(legalFrom('e1')).not.toContain('g1');
    expect(legalFrom('e1')).toContain('c1');
  });

  it('proves castling refused after king moved clears castling options', () => {
    reset('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
    apply('e1', 'e2');
    apply('e8', 'e7');
    apply('e2', 'e1');
    apply('e7', 'e8');
    expect(legalFrom('e1')).not.toContain('g1');
    expect(legalFrom('e1')).not.toContain('c1');
  });

  it('proves absolute pin prevents pinned piece from moving', () => {
    reset('rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4');
    expect(legalFrom('c3')).toEqual([]);
  });

  it('proves en passant expiration prevents capture on subsequent turns', () => {
    reset('rnbqkbnr/pppppppp/8/4P3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
    apply('d7', 'd5');
    expect(legalFrom('e5')).toContain('d6');
    apply('a2', 'a3');
    apply('a7', 'a6');
    expect(legalFrom('e5')).not.toContain('d6');
  });
});

describe('rules adapter API methods', () => {
  it('resets to default and custom fen', () => {
    reset();
    expect(fen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    reset('8/8/8/8/8/4k3/8/4K3 w - - 0 1');
    expect(fen()).toBe('8/8/8/8/8/4k3/8/4K3 w - - 0 1');
  });

  it('computes legalFrom for a given square and handles invalid squares', () => {
    reset();
    expect(legalFrom('e2')).toEqual(['e3', 'e4']);
    expect(legalFrom('invalid')).toEqual([]);
    expect(legalFrom('e5')).toEqual([]);
  });

  it('returns all legal moves via legalMovesAll', () => {
    reset();
    const all = legalMovesAll();
    expect(all).toHaveLength(20);
    expect(all).toContainEqual({ from: 'e2', to: 'e4' });
  });

  it('applies moves returning san, fen, uci, status, and winner', () => {
    reset();
    const result = apply('e2', 'e4');
    expect(result.san).toBe('e4');
    expect(result.uci).toBe('e2e4');
    expect(result.status).toBe('playing');
    expect(result.winner).toBeNull();
    expect(fen()).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
  });

  it('handles undo correctly and returns previous move info', () => {
    reset();
    expect(undo()).toBeNull();
    apply('e2', 'e4');
    const undone = undo();
    expect(undone).not.toBeNull();
    expect(undone?.san).toBe('e4');
    expect(undone?.uci).toBe('e2e4');
    expect(undone?.status).toBe('playing');
    expect(fen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });

  it('exports and loads PGN', () => {
    reset();
    apply('e2', 'e4');
    apply('e7', 'e5');
    const pgnOutput = pgn();
    expect(pgnOutput).toContain('1. e4 e5');

    reset();
    expect(fen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    loadPgn(pgnOutput);
    expect(fen()).toBe('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
  });

  it('checks attacked squares correctly', () => {
    reset();
    expect(isAttacked('e3', 'w')).toBe(true);
    expect(isAttacked('e4', 'w')).toBe(false);
    expect(isAttacked('invalid', 'w')).toBe(false);
  });

  it('a promotion move produces uci "e7e8q" and findLegalMove matches it', () => {
    reset('8/4P3/8/8/8/8/8/k3K3 w - - 0 1');
    const matched = findLegalMove('e7e8q');
    expect(matched).toEqual({
      from: 'e7',
      to: 'e8',
      promotion: 'q',
      san: 'e8=Q',
    });

    const result = apply('e7', 'e8', 'q');
    expect(result.uci).toBe('e7e8q');
  });
});
