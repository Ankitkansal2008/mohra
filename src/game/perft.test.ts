import { beforeEach, describe, expect, it } from 'vitest';
import { apply, legalMovesAll, reset, undo } from './rules.ts';

function perft(depth: number): number {
  const moves = legalMovesAll();
  if (depth === 1) {
    return moves.length;
  }
  let nodes = 0;
  for (const move of moves) {
    apply(move.from, move.to, move.promotion);
    nodes += perft(depth - 1);
    undo();
  }
  return nodes;
}

describe('perft move generation proof', () => {
  beforeEach(() => {
    reset();
  });

  it('counts depth 1 nodes as 20', () => {
    expect(perft(1)).toBe(20);
  });

  it('counts depth 2 nodes as 400', () => {
    expect(perft(2)).toBe(400);
  });

  it('counts depth 3 nodes as 8902', () => {
    expect(perft(3)).toBe(8902);
  });

  it('counts depth 4 nodes as 197281', () => {
    expect(perft(4)).toBe(197281);
  }, 120000);
});
