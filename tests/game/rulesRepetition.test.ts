import { beforeEach, describe, expect, it } from 'vitest';
import { rules } from '../../src/game/rules.ts';
import { useGameStore } from '../../src/game/store.ts';

describe('Chess rules validation and threefold repetition authority', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('replays the game: every ply accepted until Rxh1, which is rejected and dropped', () => {
    // Game: 1.d4 Nf6 2.c4 b6 3.a3 e6 4.g4 Nxg4 5.e3 h5 6.Nf3 Bb7 7.Nh4 Qxh4
    //       8.Qd2 Bxh1 9.Bh3 Nxh2 10.Qd3 Be7 11.Qe4 Bxe4 12.d5 Bxb1 13.Rxh1
    const plies = [
      'd4', 'Nf6', 'c4', 'b6', 'a3', 'e6', 'g4', 'Nxg4',
      'e3', 'h5', 'Nf3', 'Bb7', 'Nh4', 'Qxh4', 'Qd2', 'Bxh1',
      'Bh3', 'Nxh2', 'Qd3', 'Be7', 'Qe4', 'Bxe4', 'd5', 'Bxb1',
    ];

    useGameStore.setState((s) => ({ game: { ...s.game, mode: 'local' } }));

    // Plies 1 to 24 are all legal and must be accepted
    for (let i = 0; i < plies.length; i++) {
      const ply = plies[i];
      const ok = useGameStore.getState().attemptMove(ply);
      expect(ok).toBe(true);
      expect(useGameStore.getState().game.status).not.toBe('draw-repetition');
      expect(rules.isThreefoldRepetition()).toBe(false);
    }

    const stateAfter24 = useGameStore.getState();
    expect(stateAfter24.game.moves.length).toBe(24);
    const fenBeforeIllegal = stateAfter24.game.fen;

    // Move 25: 13.Rxh1 is illegal because rook on h1 was captured on move 8 (...Bxh1).
    // The rules engine rejects it, drops it, and preserves the current position.
    const rejectedSan = useGameStore.getState().attemptMove('Rxh1');
    expect(rejectedSan).toBe(false);
    expect(useGameStore.getState().game.fen).toBe(fenBeforeIllegal);
    expect(useGameStore.getState().game.moves.length).toBe(24);

    // Also coordinate attempt a1 -> h1 is illegal (blocked by pieces on b1 and c1)
    const rejectedCoords = useGameStore.getState().attemptMove('a1', 'h1');
    expect(rejectedCoords).toBe(false);
    expect(useGameStore.getState().game.fen).toBe(fenBeforeIllegal);
    expect(useGameStore.getState().game.moves.length).toBe(24);
  });

  it('a game with no repeated position never reports draw-repetition', () => {
    const plies = [
      'd4', 'Nf6', 'c4', 'b6', 'a3', 'e6', 'g4', 'Nxg4',
      'e3', 'h5', 'Nf3', 'Bb7', 'Nh4', 'Qxh4', 'Qd2', 'Bxh1',
      'Bh3', 'Nxh2', 'Qd3', 'Be7', 'Qe4', 'Bxe4', 'd5', 'Bxb1',
    ];

    useGameStore.setState((s) => ({ game: { ...s.game, mode: 'local' } }));

    for (const ply of plies) {
      const ok = useGameStore.getState().attemptMove(ply);
      expect(ok).toBe(true);
      expect(useGameStore.getState().game.status).not.toBe('draw-repetition');
      expect(rules.isThreefoldRepetition()).toBe(false);
    }
  });

  it('the 8-knight shuffle still reports draw-repetition', () => {
    // 1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8
    const knightShuffle = [
      ['g1', 'f3'], // Ply 1: 1. Nf3 (count = 1)
      ['g8', 'f6'], // Ply 2: 1... Nf6 (count = 1)
      ['f3', 'g1'], // Ply 3: 2. Ng1 (count = 1)
      ['f6', 'g8'], // Ply 4: 2... Ng8 (start position 2nd time, count = 2)
      ['g1', 'f3'], // Ply 5: 3. Nf3 (count = 2)
      ['g8', 'f6'], // Ply 6: 3... Nf6 (count = 2)
      ['f3', 'g1'], // Ply 7: 4. Ng1 (count = 2)
      ['f6', 'g8'], // Ply 8: 4... Ng8 (start position 3rd time, count = 3 -> draw!)
    ];

    useGameStore.setState((s) => ({ game: { ...s.game, mode: 'local' } }));

    // First 7 plies: no draw by repetition
    for (let i = 0; i < 7; i++) {
      const [from, to] = knightShuffle[i];
      const ok = useGameStore.getState().attemptMove(from, to);
      expect(ok).toBe(true);
      expect(useGameStore.getState().game.status).toBe('playing');
      expect(rules.isThreefoldRepetition()).toBe(false);
    }

    // 8th ply reaches the starting position for the 3rd time
    const [from8, to8] = knightShuffle[7];
    const ok8 = useGameStore.getState().attemptMove(from8, to8);
    expect(ok8).toBe(true);
    expect(rules.isThreefoldRepetition()).toBe(true);
    expect(useGameStore.getState().game.status).toBe('draw-repetition');
  });
});

