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

    it('allows Black to play a move after White plays a move in local mode', () => {
      const store = useGameStore.getState();
      expect(store.game.mode).toBe('local');
      expect(getTurn(store.game.fen)).toBe('w');

      // White plays 1. e4
      const whiteMove = store.attemptMove('e2', 'e4');
      expect(whiteMove).toBe(true);

      const stateAfterWhite = useGameStore.getState();
      expect(getTurn(stateAfterWhite.game.fen)).toBe('b');
      expect(stateAfterWhite.game.moves).toEqual(['e4']);

      // Black plays 1... e5 in response
      const blackMove = store.attemptMove('e7', 'e5');
      expect(blackMove).toBe(true);

      const stateAfterBlack = useGameStore.getState();
      expect(getTurn(stateAfterBlack.game.fen)).toBe('w');
      expect(stateAfterBlack.game.moves).toEqual(['e4', 'e5']);
      expect(stateAfterBlack.lastMove).toEqual(['e7', 'e5']);
      expect(stateAfterBlack.announcedMove).toBe('Black plays e5');
    });

    it('plays sequence e2e4, e7e5, g1f3, b8c6, f1c4, g8f6 and advances FEN on every ply', () => {
      const sequence = [
        { from: 'e2', to: 'e4', ply: 1 },
        { from: 'e7', to: 'e5', ply: 2 },
        { from: 'g1', to: 'f3', ply: 3 },
        { from: 'b8', to: 'c6', ply: 4 },
        { from: 'f1', to: 'c4', ply: 5 },
        { from: 'g8', to: 'f6', ply: 6 },
      ];

      let previousFen = useGameStore.getState().game.fen;

      for (const { from, to, ply } of sequence) {
        const success = useGameStore.getState().attemptMove(from, to);
        const currentFen = useGameStore.getState().game.fen;
        const toast = useGameStore.getState().toast;

        expect(
          success,
          `Ply ${ply} (${from}${to}) failed with reason: ${toast?.reason ?? 'none'}`,
        ).toBe(true);

        expect(
          currentFen,
          `Ply ${ply} (${from}${to}) did not advance FEN`,
        ).not.toBe(previousFen);

        previousFen = currentFen;
      }
    });

    it('refuses move when wrong side is to move with exact sentence', () => {
      const store = useGameStore.getState();
      // Black piece attempting move on White turn
      const success = store.attemptMove('e7', 'e5');

      expect(success).toBe(false);
      const state = useGameStore.getState();
      expect(state.toast).not.toBeNull();
      expect(state.toast?.reason).toBe('wrong-turn');
      expect(state.toast?.message).toBe('It is not your turn to move.');
      expect(state.game.moves).toEqual([]);
    });

    it('refuses illegal shape move with exact sentence', () => {
      const store = useGameStore.getState();
      // Bishop move attempted by pawn
      const success = store.attemptMove('e2', 'f3');

      expect(success).toBe(false);
      const state = useGameStore.getState();
      expect(state.toast?.reason).toBe('illegal-shape');
      expect(state.toast?.message).toBe('That piece cannot reach that square from here.');
      expect(state.game.moves).toEqual([]);
    });

    it('refuses move of pinned piece with exact sentence', () => {
      // Position where White knight at c3 is pinned to king at e1 by Black bishop at b4
      const PIN_FEN =
        'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4';
      useGameStore.getState().resetGame(PIN_FEN);

      const success = useGameStore.getState().attemptMove('c3', 'e4');

      expect(success).toBe(false);
      const state = useGameStore.getState();
      expect(state.toast?.reason).toBe('pinned');
      expect(state.toast?.message).toBe('That piece is pinned - moving it would expose your king.');
      expect(state.game.moves).toEqual([]);
    });

    it('refuses move leaving king attacked when in check with exact sentence', () => {
      // White in check by black rook at e8, King at e1, unrelated pawn at a2
      const CHECK_FEN = '4r1k1/8/8/8/8/8/P7/4K3 w - - 0 1';
      useGameStore.getState().resetGame(CHECK_FEN);

      // Attempting unrelated pawn move while in check fails to resolve check
      const success = useGameStore.getState().attemptMove('a2', 'a3');

      expect(success).toBe(false);
      const state = useGameStore.getState();
      expect(state.toast?.reason).toBe('in-check');
      expect(state.toast?.message).toBe('You are in check - that move leaves your king attacked.');
    });

    it('refuses castling through check with exact sentence', () => {
      // White e1 king trying to castle kingside through f1 attacked by black rook at f8
      const CASTLE_THROUGH_CHECK_FEN =
        '4kr2/8/8/8/8/8/8/R3K2R w KQ - 0 1';
      useGameStore.getState().resetGame(CASTLE_THROUGH_CHECK_FEN);

      const success = useGameStore.getState().attemptMove('e1', 'g1');

      expect(success).toBe(false);
      const state = useGameStore.getState();
      expect(state.toast?.reason).toBe('castling-blocked');
      expect(state.toast?.message).toBe('You cannot castle out of, through, or into check.');
    });

    it('refuses castling attempted while in check with exact sentence', () => {
      // White e1 king in check by black rook at e8, trying to castle kingside
      const CASTLE_IN_CHECK_FEN =
        '4r1k1/8/8/8/8/8/8/R3K2R w KQ - 0 1';
      useGameStore.getState().resetGame(CASTLE_IN_CHECK_FEN);

      const success = useGameStore.getState().attemptMove('e1', 'g1');

      expect(success).toBe(false);
      const state = useGameStore.getState();
      expect(state.toast?.reason).toBe('castling-blocked');
      expect(state.toast?.message).toBe('You cannot castle out of, through, or into check.');
    });

    it('refuses move with no toast when game is in terminal status (panel shows instead)', () => {
      // Fool's mate position: Black delivered Qh4#
      const CHECKMATE_FEN =
        'rnb1kbnr/pppp1ppp/4p3/8/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
      useGameStore.getState().resetGame(CHECKMATE_FEN);

      const state = useGameStore.getState();
      expect(state.game.status).toBe('checkmate');

      const success = useGameStore.getState().attemptMove('e2', 'e3');

      expect(success).toBe(false);
      // Requirement: 1. terminal status -> "game-over" (no toast, panel shows)
      expect(useGameStore.getState().toast).toBeNull();
    });

    it('refuses move with no toast when review mode is active', () => {
      useGameStore.getState().resetGame();
      useGameStore.setState((s) => ({
        ui: { ...s.ui, reviewPly: 0 },
      }));

      const success = useGameStore.getState().attemptMove('e2', 'e4');
      expect(success).toBe(false);
      // Requirement: 2. review mode active -> no toast at all
      expect(useGameStore.getState().toast).toBeNull();
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

  describe('Position loader (loadFen)', () => {
    it('loads a valid FEN, resetting to fresh GameState while preserving mode and humanSide', () => {
      // Configure existing custom game state
      useGameStore.setState({
        game: {
          ...useGameStore.getState().game,
          mode: 'computer',
          humanSide: 'b',
          moves: ['e4', 'e5'],
          uciMoves: ['e2e4', 'e7e5'],
          pgn: '1. e4 e5',
        },
      });

      const validFen = 'r1bqkb1r/pppp1Qpp/2n5/4p3/2B1n3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4'; // Scholar's mate
      const success = useGameStore.getState().loadFen(validFen);

      expect(success).toBe(true);

      const state = useGameStore.getState();
      expect(state.game.fen).toBe(validFen);
      expect(state.game.mode).toBe('computer');
      expect(state.game.humanSide).toBe('b');
      expect(state.game.status).toBe('checkmate');
      expect(state.game.winner).toBe('w');
      expect(state.game.moves).toHaveLength(0);
      expect(state.game.uciMoves).toHaveLength(0);
      expect(state.game.pgn).toBe('');
      expect(state.toast).toBeNull();
      expect(state.lastMove).toBeNull();
      expect(state.announcedMove).toBeNull();
    });

    it('rejects an invalid FEN, shows "That position is not valid." toast, and leaves game untouched', () => {
      // Play a move first to establish initial state
      useGameStore.getState().attemptMove('e2', 'e4');
      const stateBefore = useGameStore.getState();
      const fenBefore = stateBefore.game.fen;
      const movesBefore = [...stateBefore.game.moves];

      // Attempt invalid FEN (malformed structure)
      const success = useGameStore.getState().loadFen('invalid-fen-string');

      expect(success).toBe(false);

      const stateAfter = useGameStore.getState();
      // Game state left completely untouched
      expect(stateAfter.game.fen).toBe(fenBefore);
      expect(stateAfter.game.moves).toEqual(movesBefore);
      expect(stateAfter.game.mode).toBe(stateBefore.game.mode);
      expect(stateAfter.game.humanSide).toBe(stateBefore.game.humanSide);

      // Toast displays exact expected string from en.ts
      expect(stateAfter.toast).not.toBeNull();
      expect(stateAfter.toast?.message).toBe('That position is not valid.');
      expect(stateAfter.toast?.message).toBe(en.invalidPosition);
    });

    it('rejects an illegal chess position (missing kings), leaves game untouched, and shows toast', () => {
      const fenBefore = useGameStore.getState().game.fen;

      // 8 empty ranks with no kings
      const invalidPosition = '8/8/8/8/8/8/8/8 w - - 0 1';
      const success = useGameStore.getState().loadFen(invalidPosition);

      expect(success).toBe(false);

      const stateAfter = useGameStore.getState();
      expect(stateAfter.game.fen).toBe(fenBefore);
      expect(stateAfter.toast?.message).toBe('That position is not valid.');
    });
  });
});
