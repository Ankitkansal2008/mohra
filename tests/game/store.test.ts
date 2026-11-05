import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '../../src/copy/en.ts';
import {
  getTurn,
  isCheck,
  isGameOver,
  useGameStore,
} from '../../src/game/store.ts';

describe('Game store and move pipeline', () => {
  beforeEach(() => {
    vi.useRealTimers();
    useGameStore.getState().resetGame();
  });

  describe('Derived calculations', () => {
    it('derives turn directly from FEN', () => {
      expect(
        getTurn('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
      ).toBe('w');
      expect(
        getTurn('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'),
      ).toBe('b');
    });

    it('derives check status on demand', () => {
      expect(isCheck('playing')).toBe(false);
      expect(isCheck('check')).toBe(true);
      expect(isCheck('checkmate')).toBe(false);
    });

    it('derives game over status on demand for all terminal conditions', () => {
      expect(isGameOver('playing')).toBe(false);
      expect(isGameOver('check')).toBe(false);
      expect(isGameOver('checkmate')).toBe(true);
      expect(isGameOver('stalemate')).toBe(true);
      expect(isGameOver('draw-repetition')).toBe(true);
      expect(isGameOver('draw-fifty')).toBe(true);
      expect(isGameOver('draw-material')).toBe(true);
      expect(isGameOver('resigned')).toBe(true);
      expect(isGameOver('timeout')).toBe(true);
    });
  });

  describe('attemptMove pipeline', () => {
    it('plays legal move 1. e4 in a single atomic store update', () => {
      const store = useGameStore.getState();
      const success = store.attemptMove('e2', 'e4');

      expect(success).toBe(true);
      const state = useGameStore.getState();
      expect(state.game.moves).toEqual(['e4']);
      expect(state.game.uciMoves).toEqual(['e2e4']);
      expect(state.game.status).toBe('playing');
      expect(state.lastMove).toEqual(['e2', 'e4']);
      expect(getTurn(state.game.fen)).toBe('b');
      expect(state.ui.selected).toBeNull();
      expect(state.ui.targets).toEqual([]);
      expect(state.announcedMove).toBe('White plays e4');
    });

    it('refuses move when wrong side is to move', () => {
      const store = useGameStore.getState();
      // Black piece attempting move on White turn
      const success = store.attemptMove('e7', 'e5');

      expect(success).toBe(false);
      const state = useGameStore.getState();
      expect(state.toast).not.toBeNull();
      expect(state.toast?.reason).toBe('wrong-turn');
      expect(state.toast?.message).toBe(en.rejectionWrongTurn);
      expect(state.game.moves).toEqual([]);
    });

    it('refuses illegal shape move with visible rejection toast', () => {
      const store = useGameStore.getState();
      // Bishop move attempted by pawn
      const success = store.attemptMove('e2', 'f3');

      expect(success).toBe(false);
      const state = useGameStore.getState();
      expect(state.toast?.reason).toBe('illegal-shape');
      expect(state.toast?.message).toBe(en.rejectionIllegalShape);
      expect(state.game.moves).toEqual([]);
    });

    it('refuses move of pinned piece and identifies pin reason', () => {
      // Position where White knight at c3 is pinned to king at e1 by Black bishop at b4
      const PIN_FEN =
        'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4';
      useGameStore.getState().resetGame(PIN_FEN);

      const success = useGameStore.getState().attemptMove('c3', 'e4');

      expect(success).toBe(false);
      const state = useGameStore.getState();
      expect(state.toast?.reason).toBe('pinned');
      expect(state.toast?.message).toBe(en.rejectionPinned);
      expect(state.game.moves).toEqual([]);
    });

    it('refuses move leaving king attacked when in check', () => {
      // White in check by black rook at e8, King at e1, unrelated pawn at a2
      const CHECK_FEN = '4r1k1/8/8/8/8/8/P7/4K3 w - - 0 1';
      useGameStore.getState().resetGame(CHECK_FEN);

      // Attempting unrelated pawn move while in check fails to resolve check
      const success = useGameStore.getState().attemptMove('a2', 'a3');

      expect(success).toBe(false);
      const state = useGameStore.getState();
      expect(state.toast?.reason).toBe('in-check');
      expect(state.toast?.message).toBe(en.rejectionInCheck);
    });

    it('refuses castling through check and returns castling-blocked', () => {
      // White e1 king trying to castle kingside through f1 attacked by black rook at f8
      const CASTLE_THROUGH_CHECK_FEN =
        '4kr2/8/8/8/8/8/8/R3K2R w KQ - 0 1';
      useGameStore.getState().resetGame(CASTLE_THROUGH_CHECK_FEN);

      const success = useGameStore.getState().attemptMove('e1', 'g1');

      expect(success).toBe(false);
      const state = useGameStore.getState();
      expect(state.toast?.reason).toBe('castling-blocked');
      expect(state.toast?.message).toBe(en.rejectionCastlingBlocked);
    });

    it('refuses move when game is already in a terminal state', () => {
      // Fool's mate position: Black delivered Qh4#
      const CHECKMATE_FEN =
        'rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
      useGameStore.getState().resetGame(CHECKMATE_FEN);

      const state = useGameStore.getState();
      expect(state.game.status).toBe('checkmate');

      const success = useGameStore.getState().attemptMove('e2', 'e3');

      expect(success).toBe(false);
      expect(useGameStore.getState().toast?.reason).toBe('game-over');
      expect(useGameStore.getState().toast?.message).toBe(en.rejectionGameOver);
    });

    it('intercepts pawn reaching 8th rank and sets pendingPromotion without applying', () => {
      // White pawn at a7 poised to promote on a8
      const PROMOTION_FEN = '8/P7/8/8/8/8/8/k3K3 w - - 0 1';
      useGameStore.getState().resetGame(PROMOTION_FEN);

      const success = useGameStore.getState().attemptMove('a7', 'a8');

      // Returns false and halts without committing move until piece chosen
      expect(success).toBe(false);
      const state = useGameStore.getState();
      expect(state.ui.pendingPromotion).toEqual({ from: 'a7', to: 'a8' });
      expect(state.game.moves).toHaveLength(0);
    });

    it('confirms pending promotion when choice is made', () => {
      const PROMOTION_FEN = '8/P7/8/8/8/8/8/k3K3 w - - 0 1';
      useGameStore.getState().resetGame(PROMOTION_FEN);

      useGameStore.getState().attemptMove('a7', 'a8');
      expect(useGameStore.getState().ui.pendingPromotion).not.toBeNull();

      const success = useGameStore.getState().confirmPromotion('q');
      expect(success).toBe(true);

      const state = useGameStore.getState();
      expect(state.ui.pendingPromotion).toBeNull();
      expect(state.game.moves).toEqual(['a8=Q+']);
      expect(state.game.uciMoves).toEqual(['a7a8q']);
    });

    it('cancels pending promotion when dismissed without playing', () => {
      const PROMOTION_FEN = '8/P7/8/8/8/8/8/k3K3 w - - 0 1';
      useGameStore.getState().resetGame(PROMOTION_FEN);

      useGameStore.getState().attemptMove('a7', 'a8');
      expect(useGameStore.getState().ui.pendingPromotion).not.toBeNull();

      useGameStore.getState().cancelPromotion();
      const state = useGameStore.getState();
      expect(state.ui.pendingPromotion).toBeNull();
      expect(state.game.moves).toHaveLength(0);
    });
  });

  describe('click-to-move selection interaction', () => {
    it('first click selects friendly piece and computes legal destinations', () => {
      useGameStore.getState().selectSquare('e2');
      const state = useGameStore.getState();

      expect(state.ui.selected).toBe('e2');
      expect(state.ui.targets).toEqual(['e3', 'e4']);
    });

    it('second click on legal destination plays move and clears selection', () => {
      useGameStore.getState().selectSquare('e2');
      useGameStore.getState().selectSquare('e4');

      const state = useGameStore.getState();
      expect(state.ui.selected).toBeNull();
      expect(state.ui.targets).toEqual([]);
      expect(state.game.moves).toEqual(['e4']);
    });

    it('clicking own piece switches selection to that piece', () => {
      useGameStore.getState().selectSquare('e2');
      expect(useGameStore.getState().ui.selected).toBe('e2');

      useGameStore.getState().selectSquare('d2');
      const state = useGameStore.getState();
      expect(state.ui.selected).toBe('d2');
      expect(state.ui.targets).toEqual(['d3', 'd4']);
    });

    it('clicking the already selected square deselects it', () => {
      useGameStore.getState().selectSquare('e2');
      expect(useGameStore.getState().ui.selected).toBe('e2');

      useGameStore.getState().selectSquare('e2');
      const state = useGameStore.getState();
      expect(state.ui.selected).toBeNull();
      expect(state.ui.targets).toEqual([]);
    });
  });

  describe('Toast timer behavior', () => {
    it('auto-dismisses toast after 3 seconds', () => {
      vi.useFakeTimers();
      useGameStore.getState().setRejectionToast('pinned');

      expect(useGameStore.getState().toast?.message).toBe(en.rejectionPinned);

      vi.advanceTimersByTime(2999);
      expect(useGameStore.getState().toast).not.toBeNull();

      vi.advanceTimersByTime(2);
      expect(useGameStore.getState().toast).toBeNull();
    });
  });
});
