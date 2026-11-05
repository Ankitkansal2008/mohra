import { create } from 'zustand';
import { en } from '../copy/en.ts';
import { rules } from './rules.ts';
import type {
  GameState,
  GameStatus,
  RejectionReason,
  Side,
  ToastNotification,
  UiState,
} from './types.ts';

export const STARTING_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Pure derived helpers calculate state on demand from FEN without redundant storage.
export function getTurn(fen: string): Side {
  const parts = fen.split(' ');
  return (parts[1] as Side) || 'w';
}

export function isCheck(status: GameStatus): boolean {
  return status === 'check';
}

export function isGameOver(status: GameStatus): boolean {
  return (
    status === 'checkmate' ||
    status === 'stalemate' ||
    status === 'draw-repetition' ||
    status === 'draw-fifty' ||
    status === 'draw-material' ||
    status === 'resigned' ||
    status === 'timeout'
  );
}

export function getRejectionMessage(reason: RejectionReason): string {
  switch (reason) {
    case 'pinned':
      return en.rejectionPinned;
    case 'wrong-turn':
      return en.rejectionWrongTurn;
    case 'illegal-shape':
      return en.rejectionIllegalShape;
    case 'in-check':
      return en.rejectionInCheck;
    case 'castling-blocked':
      return en.rejectionCastlingBlocked;
    case 'game-over':
      return en.rejectionGameOver;
  }
}

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

function createInitialGameState(fen: string = STARTING_FEN): GameState {
  rules.reset(fen);
  const currentStatus = rules.status();
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'game-1',
    fen,
    pgn: '',
    moves: [],
    uciMoves: [],
    status: currentStatus.status,
    winner: currentStatus.winner,
    mode: 'computer',
    humanSide: 'w',
    level: 2,
    clock: null,
    startedAt: Date.now(),
    savedAt: Date.now(),
  };
}

function createInitialUiState(): UiState {
  return {
    selected: null,
    targets: [],
    pendingPromotion: null,
    reviewPly: null,
    flipped: false,
    theme: 'default',
    soundOn: true,
    animationOn: true,
    showCoords: true,
  };
}

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
