import { create } from 'zustand';
import { rules } from './rules.ts';
import {
  STARTING_FEN,
  createInitialGameState,
  createInitialUiState,
  getRejectionMessage,
  getTurn,
  isGameOver,
} from './selectors.ts';
import type {
  GameState,
  RejectionReason,
  ToastNotification,
  UiState,
} from './types.ts';

export {
  STARTING_FEN,
  getRejectionMessage,
  getTurn,
  isCheck,
  isGameOver,
} from './selectors.ts';

export interface GameStoreState {
  game: GameState;
  ui: UiState;
  toast: ToastNotification | null;
  lastMove: [string, string] | null;
  announcedMove: string | null;

  // Actions
  attemptMove: (from: string, to: string, promotion?: string) => boolean;
  selectSquare: (square: string) => void;
  clearSelection: () => void;
  cancelPromotion: () => void;
  confirmPromotion: (piece: 'q' | 'r' | 'b' | 'n') => boolean;
  setRejectionToast: (reason: RejectionReason) => void;
  dismissToast: () => void;
  resetGame: (customFen?: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useGameStore = create<GameStoreState>((set, get) => ({
  game: createInitialGameState(),
  ui: createInitialUiState(),
  toast: null,
  lastMove: null,
  announcedMove: null,

  attemptMove: (from: string, to: string, promotion?: string): boolean => {
    const state = get();
    const currentFen = state.game.fen;
    const currentTurn = getTurn(currentFen);

    // 1. Pre-check: terminal status, review mode, or wrong side to move
    if (isGameOver(state.game.status)) {
      get().setRejectionToast('game-over');
      return false;
    }

    if (state.ui.reviewPly !== null) {
      return false;
    }

    if (state.game.mode === 'computer' && currentTurn !== state.game.humanSide) {
      get().setRejectionToast('wrong-turn');
      return false;
    }

    rules.reset(currentFen);
    const piece = rules.getPiece(from);
    if (!piece || piece.color !== currentTurn) {
      get().setRejectionToast('wrong-turn');
      return false;
    }

    // 2. Validate legality of target destination
    const legalTargets = rules.legalFrom(from);
    if (!legalTargets.includes(to)) {
      const reason = rules.getRejectionReason(from, to);
      get().setRejectionToast(reason);
      set((s) => ({
        ui: { ...s.ui, selected: null, targets: [] },
      }));
      return false;
    }

    // 3. Pawn promotion gate: reaching 8th or 1st rank without chosen piece
    const isPawnPromotion =
      piece.type === 'p' &&
      ((piece.color === 'w' && to.endsWith('8')) ||
        (piece.color === 'b' && to.endsWith('1')));

    if (isPawnPromotion && !promotion) {
      set((s) => ({
        ui: {
          ...s.ui,
          pendingPromotion: { from, to },
          selected: null,
          targets: [],
        },
      }));
      return false;
    }

    // 4. Authoritative apply committed in ONE atomic store transaction
    const result = rules.apply(from, to, promotion);
    const movePgn = rules.pgn();
    const sideLabel = currentTurn === 'w' ? 'White' : 'Black';

    set((s) => ({
      game: {
        ...s.game,
        fen: result.fen,
        status: result.status,
        winner: result.winner,
        moves: [...s.game.moves, result.san],
        uciMoves: [...s.game.uciMoves, result.uci],
        pgn: movePgn,
        savedAt: Date.now(),
      },
      ui: {
        ...s.ui,
        selected: null,
        targets: [],
        pendingPromotion: null,
      },
      lastMove: [from, to],
      announcedMove: `${sideLabel} plays ${result.san}`,
    }));

    return true;
  },

  selectSquare: (square: string): void => {
    const state = get();
    if (isGameOver(state.game.status) || state.ui.reviewPly !== null) {
      return;
    }

    const currentTurn = getTurn(state.game.fen);
    if (state.game.mode === 'computer' && currentTurn !== state.game.humanSide) {
      return;
    }

    rules.reset(state.game.fen);
    const piece = rules.getPiece(square);

    // Tapping the same square deselects it
    if (state.ui.selected === square) {
      set((s) => ({
        ui: { ...s.ui, selected: null, targets: [] },
      }));
      return;
    }

    // If already selected and tapping an unselected square not of current piece, attempt move
    if (state.ui.selected && (!piece || piece.color !== currentTurn)) {
      get().attemptMove(state.ui.selected, square);
      return;
    }

    // Tapping friendly piece switches selection and generates targets
    if (piece && piece.color === currentTurn) {
      const targets = rules.legalFrom(square);
      set((s) => ({
        ui: { ...s.ui, selected: square, targets },
      }));
      return;
    }

    set((s) => ({
      ui: { ...s.ui, selected: null, targets: [] },
    }));
  },

  clearSelection: (): void => {
    set((s) => ({
      ui: { ...s.ui, selected: null, targets: [] },
    }));
  },

  cancelPromotion: (): void => {
    set((s) => ({
      ui: { ...s.ui, pendingPromotion: null, selected: null, targets: [] },
    }));
  },

  confirmPromotion: (piece: 'q' | 'r' | 'b' | 'n'): boolean => {
    const pending = get().ui.pendingPromotion;
    if (!pending) return false;
    return get().attemptMove(pending.from, pending.to, piece);
  },

  setRejectionToast: (reason: RejectionReason): void => {
    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    const message = getRejectionMessage(reason);
    set({
      toast: {
        id: String(Date.now()),
        reason,
        message,
      },
    });

    toastTimer = setTimeout(() => {
      get().dismissToast();
    }, 3000);
  },

  dismissToast: (): void => {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    set({ toast: null });
  },

  resetGame: (customFen?: string): void => {
    const fen = customFen ?? STARTING_FEN;
    set({
      game: createInitialGameState(fen),
      ui: createInitialUiState(),
      toast: null,
      lastMove: null,
      announcedMove: null,
    });
  },
}));

export default useGameStore;
