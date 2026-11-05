import { create } from 'zustand';
import { en } from '../copy/en.ts';
import { rules } from './rules.ts';
import {
  STARTING_FEN,
  canUndo,
  createInitialGameState,
  createInitialUiState,
  getPliesToUndo,
  getRejectionMessage,
  getResignWinner,
  getTurn,
  isGameOver,
} from './selectors.ts';
import type { GameState, RejectionReason, ToastNotification, UiState } from './types.ts';

export { STARTING_FEN, canUndo, getPliesToUndo, getRejectionMessage, getTurn, isCheck, isGameOver } from './selectors.ts';

export interface GameStoreState {
  game: GameState;
  ui: UiState;
  toast: ToastNotification | null;
  lastMove: [string, string] | null;
  announcedMove: string | null;

  attemptMove: (from: string, to: string, promotion?: string, isEngine?: boolean) => boolean;
  selectSquare: (square: string) => void;
  clearSelection: () => void;
  cancelPromotion: () => void;
  confirmPromotion: (piece: 'q' | 'r' | 'b' | 'n') => boolean;
  setRejectionToast: (reason: RejectionReason) => void;
  showToast: (message: string, reason?: RejectionReason) => void;
  dismissToast: () => void;
  resetGame: (customFen?: string) => void;
  loadFen: (fen: string) => boolean;
  undo: () => boolean;
  resignGame: () => void;
  toggleFlip: () => void;
  setReviewPly: (ply: number | null) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useGameStoreBase = create<GameStoreState>((set, get) => ({
  game: createInitialGameState(),
  ui: createInitialUiState(),
  toast: null,
  lastMove: null,
  announcedMove: null,

  attemptMove: (from: string, to: string, promotion?: string, isEngine?: boolean): boolean => {
    const state = get();
    const currentFen = state.game.fen;
    const currentTurn = getTurn(currentFen);

    if (isGameOver(state.game.status) || state.ui.reviewPly !== null) return false;
    if (state.game.mode === 'computer') {
      if (isEngine && currentTurn === state.game.humanSide) return false;
      if (!isEngine && currentTurn !== state.game.humanSide) {
        get().setRejectionToast('wrong-turn');
        return false;
      }
    }

    rules.reset(currentFen);
    const piece = rules.getPiece(from);
    if (!piece || piece.color !== currentTurn) {
      get().setRejectionToast('wrong-turn');
      return false;
    }

    const legalTargets = rules.legalFrom(from);
    if (!legalTargets.includes(to)) {
      get().setRejectionToast(rules.getRejectionReason(from, to));
      set((s) => ({ ui: { ...s.ui, selected: null, targets: [] } }));
      return false;
    }

    const isPromotion =
      piece.type === 'p' &&
      ((piece.color === 'w' && to.endsWith('8')) || (piece.color === 'b' && to.endsWith('1')));

    if (isPromotion && !promotion) {
      set((s) => ({
        ui: { ...s.ui, pendingPromotion: { from, to }, selected: null, targets: [] },
      }));
      return false;
    }

    const result = rules.apply(from, to, promotion);
    const sideLabel = currentTurn === 'w' ? 'White' : 'Black';

    set((s) => ({
      game: {
        ...s.game,
        fen: result.fen,
        status: result.status,
        winner: result.winner,
        moves: [...s.game.moves, result.san],
        uciMoves: [...s.game.uciMoves, result.uci],
        pgn: rules.pgn(),
        savedAt: Date.now(),
      },
      ui: { ...s.ui, selected: null, targets: [], pendingPromotion: null },
      lastMove: [from, to],
      announcedMove: `${sideLabel} plays ${result.san}`,
    }));
    return true;
  },

  selectSquare: (square: string): void => {
    const state = get();
    if (isGameOver(state.game.status) || state.ui.reviewPly !== null) return;
    const currentTurn = getTurn(state.game.fen);
    if (state.game.mode === 'computer' && currentTurn !== state.game.humanSide) return;

    rules.reset(state.game.fen);
    const piece = rules.getPiece(square);

    if (state.ui.selected === square) {
      set((s) => ({ ui: { ...s.ui, selected: null, targets: [] } }));
      return;
    }
    if (state.ui.selected && (!piece || piece.color !== currentTurn)) {
      get().attemptMove(state.ui.selected, square);
      return;
    }
    if (piece && piece.color === currentTurn) {
      set((s) => ({ ui: { ...s.ui, selected: square, targets: rules.legalFrom(square) } }));
      return;
    }
    set((s) => ({ ui: { ...s.ui, selected: null, targets: [] } }));
  },

  clearSelection: () => set((s) => ({ ui: { ...s.ui, selected: null, targets: [] } })),
  cancelPromotion: () => set((s) => ({ ui: { ...s.ui, pendingPromotion: null, selected: null, targets: [] } })),
  confirmPromotion: (piece: 'q' | 'r' | 'b' | 'n'): boolean => {
    const pending = get().ui.pendingPromotion;
    return pending ? get().attemptMove(pending.from, pending.to, piece) : false;
  },

  showToast: (message: string, reason?: RejectionReason): void => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: { id: String(Date.now()), message, ...(reason ? { reason } : {}) } });
    toastTimer = setTimeout(() => get().dismissToast(), 3000);
  },

  setRejectionToast: (reason: RejectionReason) => get().showToast(getRejectionMessage(reason), reason),
  dismissToast: () => {
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    set({ toast: null });
  },

  resetGame: (customFen?: string): void => {
    rules.reset(customFen);
    set({
      game: createInitialGameState(customFen ?? STARTING_FEN),
      ui: createInitialUiState(),
      toast: null,
      lastMove: null,
      announcedMove: null,
    });
  },

  loadFen: (fen: string): boolean => {
    const trimmed = fen.trim();
    try {
      rules.reset(trimmed);
    } catch {
      rules.reset(get().game.fen);
      get().showToast(en.invalidPosition);
      return false;
    }
    const { mode, humanSide, level } = get().game;
    set({
      game: { ...createInitialGameState(trimmed), mode, humanSide, level },
      ui: createInitialUiState(), toast: null, lastMove: null, announcedMove: null,
    });
    return true;
  },

  undo: (): boolean => {
    const state = get();
    if (!canUndo(state.game)) {
      get().showToast(en.undoStart);
      return false;
    }

    const plies = getPliesToUndo(state.game);
    if (state.game.pgn) {
      try { rules.loadPgn(state.game.pgn); } catch {}
    }
    for (let i = 0; i < plies; i++) {
      rules.undo();
    }

    const newMoves = state.game.moves.slice(0, state.game.moves.length - plies);
    const newUci = state.game.uciMoves.slice(0, state.game.uciMoves.length - plies);
    const currentStatus = rules.status();
    const lastUci = newUci[newUci.length - 1];
    const lastMove: [string, string] | null = lastUci
      ? [lastUci.slice(0, 2), lastUci.slice(2, 4)]
      : null;

    set((s) => ({
      game: {
        ...s.game,
        fen: rules.fen(),
        status: currentStatus.status,
        winner: currentStatus.winner,
        moves: newMoves,
        uciMoves: newUci,
        pgn: rules.pgn(),
        savedAt: Date.now(),
      },
      ui: { ...s.ui, selected: null, targets: [], pendingPromotion: null, reviewPly: null },
      lastMove,
      announcedMove: null,
    }));
    return true;
  },

  resignGame: (): void => {
    const state = get();
    if (isGameOver(state.game.status)) return;
    const winner = getResignWinner(state.game);
    set((s) => ({
      game: { ...s.game, status: 'resigned', winner, savedAt: Date.now() },
      ui: { ...s.ui, selected: null, targets: [], pendingPromotion: null },
      announcedMove: null,
    }));
  },

  toggleFlip: () => set((s) => ({ ui: { ...s.ui, flipped: !s.ui.flipped } })),
  setReviewPly: (ply: number | null) => set((s) => ({ ui: { ...s.ui, reviewPly: ply } })),
}));

export const useGameStore = Object.assign(
  <U = GameStoreState>(selector?: (state: GameStoreState) => U): U =>
    typeof window === 'undefined'
      ? selector
        ? selector(useGameStoreBase.getState())
        : (useGameStoreBase.getState() as unknown as U)
      : useGameStoreBase(selector as (state: GameStoreState) => U),
  useGameStoreBase,
);

export default useGameStore;
