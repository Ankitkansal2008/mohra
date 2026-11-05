// Pure helper functions for game store move and undo operations.
import { syncPgnHeaders } from './pgn.ts';
import { rules } from './rules.ts';
import { getPliesToUndo, getTurn, isGameOver } from './selectors.ts';
import type { GameState, RejectionReason, Side, UiState } from './types.ts';

export interface MoveValidation {
  valid: boolean;
  reason?: RejectionReason;
  isPromotion?: boolean;
}

// Validates turn, piece presence, and target square legality before committing a move.
export function validateMoveIntent(
  game: GameState,
  ui: UiState,
  from: string,
  to: string,
  isEngine?: boolean,
): MoveValidation {
  const currentTurn = getTurn(game.fen);
  if (isGameOver(game.status) || ui.reviewPly !== null) {
    return { valid: false };
  }
  if (game.mode === 'computer') {
    if (isEngine && currentTurn === game.humanSide) return { valid: false };
    if (!isEngine && currentTurn !== game.humanSide) {
      return { valid: false, reason: 'wrong-turn' };
    }
  }

  rules.reset(game.fen);
  const piece = rules.getPiece(from);
  if (!piece || piece.color !== currentTurn) {
    return { valid: false, reason: 'wrong-turn' };
  }

  const legalTargets = rules.legalFrom(from);
  if (!legalTargets.includes(to)) {
    return { valid: false, reason: rules.getRejectionReason(from, to) };
  }

  const isPromotion =
    piece.type === 'p' &&
    ((piece.color === 'w' && to.endsWith('8')) || (piece.color === 'b' && to.endsWith('1')));

  return { valid: true, isPromotion };
}

// Reverts plies in the chess.js rules engine and calculates new game history.
export function executeUndoPlies(game: GameState): {
  fen: string;
  status: GameState['status'];
  winner: Side | null;
  moves: string[];
  uciMoves: string[];
  pgn: string;
  lastMove: [string, string] | null;
} {
  const plies = getPliesToUndo(game);
  if (game.pgn) {
    try { rules.loadPgn(game.pgn); } catch {}
  }
  for (let i = 0; i < plies; i++) {
    rules.undo();
  }
  const moves = game.moves.slice(0, game.moves.length - plies);
  const uciMoves = game.uciMoves.slice(0, game.uciMoves.length - plies);
  const cur = rules.status();
  syncPgnHeaders({
    mode: game.mode,
    humanSide: game.humanSide,
    status: cur.status,
    winner: cur.winner,
  });
  const last = uciMoves[uciMoves.length - 1];
  const lastMove: [string, string] | null = last ? [last.slice(0, 2), last.slice(2, 4)] : null;

  return {
    fen: rules.fen(),
    status: cur.status,
    winner: cur.winner,
    moves,
    uciMoves,
    pgn: rules.pgn(),
    lastMove,
  };
}
