export type Side = 'w' | 'b';
export type Level = 1 | 2 | 3 | 4;

export interface ClockState {
  whiteMs: number;
  blackMs: number;
  running: Side | null;
  lastTickAt: number | null;
  initialMs?: number;
}

export type GameTerminalStatus =
  | 'checkmate'
  | 'stalemate'
  | 'draw-repetition'
  | 'draw-fifty'
  | 'draw-material'
  | 'resigned'
  | 'timeout';

export type GameStatus = 'playing' | 'check' | GameTerminalStatus;

export interface GameState {
  id: string;
  fen: string;
  pgn: string;
  moves: string[];
  uciMoves: string[];
  status: GameStatus;
  winner: Side | null;
  mode: 'computer' | 'local';
  humanSide: Side;
  level: Level;
  clock: ClockState | null;
  startedAt: number;
  savedAt: number;
}

export interface UiState {
  selected: string | null;
  targets: string[];
  pendingPromotion: { from: string; to: string } | null;
  reviewPly: number | null;
  flipped: boolean;
  theme: 'default' | 'slate';
  soundOn: boolean;
  animationOn: boolean;
  showCoords: boolean;
}

export type RejectionReason =
  | 'pinned'
  | 'wrong-turn'
  | 'illegal-shape'
  | 'in-check'
  | 'castling-blocked'
  | 'game-over';

export interface ToastNotification {
  id: string;
  reason?: RejectionReason;
  message: string;
}

export interface NewGameOptions {
  mode?: 'computer' | 'local';
  humanSide?: Side;
  level?: Level;
  clockEnabled?: boolean;
  timeControlMs?: number | null;
}

export interface GameStoreState {
  game: GameState;
  clock: ClockState | null;
  ui: UiState;
  toast: ToastNotification | null;
  lastMove: [string, string] | null;
  announcedMove: string | null;
  engineToken: number;
  isThinking: boolean;
  engineFailed: boolean;

  attemptMove: (from: string, to?: string, promotion?: string, isEngine?: boolean) => boolean;
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
  showToast: (message: string, reason?: RejectionReason, type?: 'notify' | 'refuse') => void;
  dismissToast: () => void;
  resetGame: (customFen?: string) => void;
  rematch: () => void;
  startNewGame: (options?: NewGameOptions) => void;
  loadFen: (fen: string) => boolean;
  undo: () => boolean;
  resignGame: () => void;
  toggleFlip: () => void;
  setReviewPly: (ply: number | null) => void;
  tickClock: (now?: number) => void;
  setTheme: (theme: 'default' | 'slate') => void;
  setSoundOn: (soundOn: boolean) => void;
  setAnimationOn: (animationOn: boolean) => void;
  setShowCoords: (showCoords: boolean) => void;
  setClockEnabled: (enabled: boolean) => void;
  restoreGame: (savedGame: GameState) => void;
}
