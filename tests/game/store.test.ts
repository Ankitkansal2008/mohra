import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '../../src/copy/en.ts';
import { pgn } from '../../src/game/rules.ts';
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

  describe('Default configuration', () => {
    it('initialises with default mode "computer" and humanSide "w"', () => {
      const store = useGameStore.getState();
      expect(store.game.mode).toBe('computer');
      expect(store.game.humanSide).toBe('w');
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
      useGameStore.setState((s) => ({ game: { ...s.game, mode: 'local' } }));
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
      useGameStore.setState((s) => ({ game: { ...s.game, mode: 'local' } }));
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

  describe('Undo functionality', () => {
    it('disables undo with "Nothing to undo yet." toast at game start', () => {
      const store = useGameStore.getState();
      const success = store.undo();
      expect(success).toBe(false);
      expect(useGameStore.getState().toast?.message).toBe(en.undoStart);
    });

    it('takes back one ply in local mode so the other side is to move', () => {
      useGameStore.setState((s) => ({ game: { ...s.game, mode: 'local' } }));
      const store = useGameStore.getState();
      expect(store.game.mode).toBe('local');

      // 1. e4
      store.attemptMove('e2', 'e4');
      expect(useGameStore.getState().game.moves).toEqual(['e4']);
      expect(getTurn(useGameStore.getState().game.fen)).toBe('b');

      // Undo 1 ply
      const undone = store.undo();
      expect(undone).toBe(true);

      const state = useGameStore.getState();
      expect(state.game.moves).toHaveLength(0);
      expect(getTurn(state.game.fen)).toBe('w');
      expect(state.game.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(state.lastMove).toBeNull();
    });

    it('takes back exactly one ply in a multi-move local game', () => {
      useGameStore.setState((s) => ({ game: { ...s.game, mode: 'local' } }));
      const store = useGameStore.getState();
      store.attemptMove('e2', 'e4');
      store.attemptMove('e7', 'e5');
      store.attemptMove('g1', 'f3');

      expect(useGameStore.getState().game.moves).toEqual(['e4', 'e5', 'Nf3']);
      expect(getTurn(useGameStore.getState().game.fen)).toBe('b');

      // Undo 1 ply (Nf3)
      store.undo();
      const state = useGameStore.getState();
      expect(state.game.moves).toEqual(['e4', 'e5']);
      expect(getTurn(state.game.fen)).toBe('w');
      expect(state.lastMove).toEqual(['e7', 'e5']);
    });

    it('takes back two plies in computer mode when human is White so human is always to move', () => {
      useGameStore.setState({
        game: {
          ...useGameStore.getState().game,
          mode: 'computer',
          humanSide: 'w',
        },
      });

      const store = useGameStore.getState();
      // White human plays 1. e4, black computer plays 1... e5
      store.attemptMove('e2', 'e4');
      store.attemptMove('e7', 'e5', undefined, true);
      expect(useGameStore.getState().game.moves).toEqual(['e4', 'e5']);

      // Undo in computer mode takes back 2 plies
      const undone = store.undo();
      expect(undone).toBe(true);

      const state = useGameStore.getState();
      expect(state.game.moves).toHaveLength(0);
      expect(getTurn(state.game.fen)).toBe('w');
      expect(state.lastMove).toBeNull();
    });

    it('takes back two plies in computer mode when human is Black after computer reply', () => {
      useGameStore.setState({
        game: {
          ...useGameStore.getState().game,
          mode: 'computer',
          humanSide: 'b',
        },
      });

      const store = useGameStore.getState();
      // Computer 1. e4, human 1... e5, computer 2. Nf3
      store.attemptMove('e2', 'e4', undefined, true);
      // At ply 1, human (Black) has not moved yet -> undo is disabled
      expect(store.undo()).toBe(false);
      expect(useGameStore.getState().toast?.message).toBe(en.undoStart);

      // Now human plays e5
      store.attemptMove('e7', 'e5');
      // Computer replies Nf3
      store.attemptMove('g1', 'f3', undefined, true);
      expect(useGameStore.getState().game.moves).toEqual(['e4', 'e5', 'Nf3']);
      expect(getTurn(useGameStore.getState().game.fen)).toBe('b');

      // Undo takes back 2 plies (Nf3 and e5), leaving 1. e4 so Black human is to move again
      const undone = store.undo();
      expect(undone).toBe(true);

      const state = useGameStore.getState();
      expect(state.game.moves).toEqual(['e4']);
      expect(getTurn(state.game.fen)).toBe('b');
      expect(state.lastMove).toEqual(['e2', 'e4']);
    });

    it('allows undo from checkmate to resume active play', () => {
      useGameStore.setState((s) => ({ game: { ...s.game, mode: 'local' } }));
      const store = useGameStore.getState();
      // Fool's mate: 1. f3 e5 2. g4 Qh4#
      store.attemptMove('f2', 'f3');
      store.attemptMove('e7', 'e5');
      store.attemptMove('g2', 'g4');
      store.attemptMove('d8', 'h4');

      expect(useGameStore.getState().game.status).toBe('checkmate');
      expect(useGameStore.getState().game.winner).toBe('b');

      // Undo the checkmate move
      store.undo();
      const state = useGameStore.getState();
      expect(state.game.status).toBe('playing');
      expect(state.game.winner).toBeNull();
      expect(state.game.moves).toEqual(['f3', 'e5', 'g4']);
      expect(getTurn(state.game.fen)).toBe('b');
    });
  });

  describe('Resign functionality', () => {
    it('resigns in local mode with active player losing and sets status to resigned', () => {
      const store = useGameStore.getState();
      expect(getTurn(store.game.fen)).toBe('w');

      // White resigns
      store.resignGame();

      const state = useGameStore.getState();
      expect(state.game.status).toBe('resigned');
      expect(state.game.winner).toBe('b');
      expect(isGameOver(state.game.status)).toBe(true);
    });

    it('resigns in computer mode with human losing regardless of turn', () => {
      useGameStore.setState({
        game: {
          ...useGameStore.getState().game,
          mode: 'computer',
          humanSide: 'w',
        },
      });

      useGameStore.getState().resignGame();

      const state = useGameStore.getState();
      expect(state.game.status).toBe('resigned');
      expect(state.game.winner).toBe('b');
    });

    it('freezes the board after resignation', () => {
      useGameStore.getState().resignGame();
      const moveAllowed = useGameStore.getState().attemptMove('e2', 'e4');
      expect(moveAllowed).toBe(false);
      expect(useGameStore.getState().game.moves).toHaveLength(0);
    });

    it('after a resignation win for White, pgn() contains [Result "1-0"] and ends with 1-0', () => {
      useGameStore.setState((s) => ({ game: { ...s.game, mode: 'local' } }));
      const store = useGameStore.getState();
      store.attemptMove('e2', 'e4');
      // Black's turn in local mode: Black resigns, so White wins
      store.resignGame();

      const state = useGameStore.getState();
      expect(state.game.status).toBe('resigned');
      expect(state.game.winner).toBe('w');

      // Both store.game.pgn and rules.pgn() reflect the result and headers
      expect(state.game.pgn).toContain('[Result "1-0"]');
      expect(state.game.pgn.trim().endsWith('1-0')).toBe(true);
      expect(state.game.pgn).toContain('[White "Player 1"]');
      expect(state.game.pgn).toContain('[Black "Player 2"]');

      expect(pgn()).toContain('[Result "1-0"]');
      expect(pgn().trim().endsWith('1-0')).toBe(true);
    });

    it('sets computer mode headers White "You" and Black "Gambit" when human is White', () => {
      useGameStore.setState({
        game: {
          ...useGameStore.getState().game,
          mode: 'computer',
          humanSide: 'w',
        },
      });

      const store = useGameStore.getState();
      store.attemptMove('e2', 'e4');
      // Human resigns (White resigns -> Black wins: 0-1)
      store.resignGame();

      const state = useGameStore.getState();
      expect(state.game.winner).toBe('b');
      expect(state.game.pgn).toContain('[White "You"]');
      expect(state.game.pgn).toContain('[Black "Gambit"]');
      expect(state.game.pgn).toContain('[Result "0-1"]');
      expect(state.game.pgn.trim().endsWith('0-1')).toBe(true);
    });
  });

  describe('Flip board functionality', () => {
    it('toggles flipped UI state', () => {
      expect(useGameStore.getState().ui.flipped).toBe(false);
      useGameStore.getState().toggleFlip();
      expect(useGameStore.getState().ui.flipped).toBe(true);
      useGameStore.getState().toggleFlip();
      expect(useGameStore.getState().ui.flipped).toBe(false);
    });
  });
});
