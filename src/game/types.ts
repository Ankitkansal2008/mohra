export type Side = 'w' | 'b';
export type Level = 1 | 2 | 3 | 4;

export interface ClockState {
  whiteMs: number;
  blackMs: number;
  running: Side | null;
  lastTickAt: number | null;
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
