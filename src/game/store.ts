import { create } from 'zustand';
import { en } from '../copy/en.ts';
import { emitGameEvent } from './events.ts';
import { syncPgnHeaders } from './pgn.ts';
import { rules } from './rules.ts';
import {
  STARTING_FEN, canUndo, createInitialGameState, createInitialUiState,
  getRejectionMessage, getResignWinner, getTurn, isGameOver,
} from './selectors.ts';
import { executeUndoPlies, validateMoveIntent } from './storeHelpers.ts';
import type { GameState, Level, RejectionReason, ToastNotification, UiState } from './types.ts';

export { STARTING_FEN, canUndo, getPliesToUndo, getRejectionMessage, getTurn, isCheck, isGameOver } from './selectors.ts';

export interface GameStoreState {
  game: GameState;
  ui: UiState;
  toast: ToastNotification | null;
  lastMove: [string, string] | null;
  announcedMove: string | null;
  engineToken: number;
  isThinking: boolean;
  engineFailed: boolean;

  attemptMove: (from: string, to: string, promotion?: string, isEngine?: boolean) => boolean;
  applyEngineMove: (token: number, uci: string) => boolean;
  setThinking: (thinking: boolean) => void;
  setEngineFailed: (failed: boolean) => void;
  setEngineToken: (token: number) => void;
  requestEngineToken: () => number;
  setLevel: (level: Level) => void;
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
  engineToken: 0,
  isThinking: false,
  engineFailed: false,

  attemptMove: (from: string, to: string, promotion?: string, isEngine?: boolean): boolean => {
    const state = get();
    const check = validateMoveIntent(state.game, state.ui, from, to, isEngine);
    if (!check.valid) {
      if (check.reason) get().setRejectionToast(check.reason);
      set((s) => ({ ui: { ...s.ui, selected: null, targets: [] } }));
      return false;
    }
    if (check.isPromotion && !promotion) {
      set((s) => ({ ui: { ...s.ui, pendingPromotion: { from, to }, selected: null, targets: [] } }));
      return false;
    }

    const currentTurn = getTurn(state.game.fen);
    const result = rules.apply(from, to, promotion);
    const sideLabel = currentTurn === 'w' ? 'White' : 'Black';
    syncPgnHeaders({
      mode: state.game.mode,
      humanSide: state.game.humanSide,
      status: result.status,
      winner: result.winner,
    });

    const nextFen = result.fen;
    const nextMoves = [...state.game.moves, result.san];
    const nextUciMoves = [...state.game.uciMoves, result.uci];

    set((s) => ({
      game: {
        ...s.game,
        fen: nextFen,
        status: result.status,
        winner: result.winner,
        moves: nextMoves,
        uciMoves: nextUciMoves,
        pgn: rules.pgn(),
        savedAt: Date.now(),
      },
      ui: { ...s.ui, selected: null, targets: [], pendingPromotion: null },
      lastMove: [from, to],
      announcedMove: `${sideLabel} plays ${result.san}`,
      engineToken: isEngine ? s.engineToken : s.engineToken + 1,
      isThinking: false,
    }));

    if (!isEngine) {
      emitGameEvent({
        type: 'human-move',
        fen: nextFen,
        level: state.game.level,
        uciMoves: nextUciMoves,
      });
    }

    return true;
  },

  applyEngineMove: (token: number, uci: string): boolean => {
    const state = get();
    // Guard 1: token is current
    if (token !== state.engineToken) return false;
    // Guard 2: it is still the engine's turn
    const turn = getTurn(state.game.fen);
    if (state.game.mode !== 'computer' || turn === state.game.humanSide) return false;
    // Guard 3: status is playing or check
    if (state.game.status !== 'playing' && state.game.status !== 'check') return false;

    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
    set((s) => ({ engineToken: s.engineToken + 1, isThinking: false }));
    return get().attemptMove(from, to, promotion, true);
  },

  setThinking: (isThinking: boolean) => set({ isThinking }),
  setEngineFailed: (failed: boolean) =>
    set((s) => ({ engineFailed: failed, isThinking: false, game: failed ? { ...s.game, mode: 'local' } : s.game })),
  setEngineToken: (engineToken: number) => set({ engineToken }),
  requestEngineToken: (): number => {
    const next = get().engineToken + 1;
    set({ engineToken: next });
    return next;
  },
  setLevel: (level: Level): void => {
    set((s) => ({ game: { ...s.game, level } }));
    emitGameEvent({ type: 'level-change', level });
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
  confirmPromotion: (piece) =>
    get().ui.pendingPromotion ? get().attemptMove(get().ui.pendingPromotion!.from, get().ui.pendingPromotion!.to, piece) : false,
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
    const initial = createInitialGameState(customFen ?? STARTING_FEN);
    syncPgnHeaders(initial);
    set((s) => ({
      game: initial, ui: createInitialUiState(), toast: null, lastMove: null,
      announcedMove: null, engineToken: s.engineToken + 1, isThinking: false,
    }));
    emitGameEvent({
      type: 'new-game',
      fen: initial.fen,
      level: initial.level,
      uciMoves: initial.uciMoves,
    });
  },

  loadFen: (fen: string): boolean => {
    const trimmed = fen.trim();
    try { rules.reset(trimmed); } catch { rules.reset(get().game.fen); get().showToast(en.invalidPosition); return false; }
    const { mode, humanSide, level } = get().game;
    const newGame = { ...createInitialGameState(trimmed), mode, humanSide, level };
    syncPgnHeaders(newGame);
    set((s) => ({
      game: newGame, ui: createInitialUiState(), toast: null, lastMove: null,
      announcedMove: null, engineToken: s.engineToken + 1, isThinking: false,
    }));
    emitGameEvent({
      type: 'new-game',
      fen: newGame.fen,
      level: newGame.level,
      uciMoves: newGame.uciMoves,
    });
    return true;
  },

  undo: (): boolean => {
    const state = get();
    if (!canUndo(state.game)) {
      get().showToast(en.undoStart);
      return false;
    }
    const undone = executeUndoPlies(state.game);
    set((s) => ({
      game: { ...s.game, ...undone, savedAt: Date.now() },
      ui: { ...s.ui, selected: null, targets: [], pendingPromotion: null, reviewPly: null },
      lastMove: undone.lastMove,
      announcedMove: null,
      engineToken: s.engineToken + 1,
      isThinking: false,
    }));
    emitGameEvent({ type: 'undo' });
    return true;
  },

  resignGame: (): void => {
    const state = get();
    if (isGameOver(state.game.status)) return;
    const winner = getResignWinner(state.game);
    syncPgnHeaders({ mode: state.game.mode, humanSide: state.game.humanSide, status: 'resigned', winner });
    set((s) => ({
      game: { ...s.game, status: 'resigned', winner, pgn: rules.pgn(), savedAt: Date.now() },
      ui: { ...s.ui, selected: null, targets: [], pendingPromotion: null },
      announcedMove: null,
      engineToken: s.engineToken + 1,
      isThinking: false,
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
