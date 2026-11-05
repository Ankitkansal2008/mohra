import { Chess, type Square } from 'chess.js';
import type { GameStatus, RejectionReason, Side } from './types.ts';

export type { GameStatus, RejectionReason, Side };

export interface MoveResult {
  san: string;
  fen: string;
  uci: string;
  status: GameStatus;
  winner: Side | null;
}

export interface LegalMove {
  from: string;
  to: string;
  promotion?: string;
}

// Single private instance maintains authoritative rules state across the app lifecycle.
const instance = new Chess();

export function reset(fen?: string): void {
  if (fen) {
    instance.load(fen);
  } else {
    instance.reset();
  }
}

export function legalFrom(square: string): string[] {
  if (!/^[a-h][1-8]$/.test(square)) {
    return [];
  }
  const moves = instance.moves({ square: square as Square, verbose: true });
  // Underpromotion yields duplicate target squares that must be collapsed for UI target dots.
  return Array.from(new Set(moves.map((move) => move.to)));
}

export function legalMovesAll(): LegalMove[] {
  const moves = instance.moves({ verbose: true });
  return moves.map((move) =>
    move.promotion
      ? { from: move.from, to: move.to, promotion: move.promotion }
      : { from: move.from, to: move.to },
  );
}

export function status(): { status: GameStatus; winner: Side | null } {
  // Checkmate terminates the game with a victor; the side whose turn it is has no legal escape.
  if (instance.isCheckmate()) {
    return {
      status: 'checkmate',
      winner: instance.turn() === 'w' ? 'b' : 'w',
    };
  }

  // Stalemate is a terminal draw condition where the active side has no legal moves but is not in check.
  if (instance.isStalemate()) {
    return {
      status: 'stalemate',
      winner: null,
    };
  }

  // Repetition claims take precedence over move count thresholds per FIDE claim ordering.
  if (instance.isThreefoldRepetition()) {
    return {
      status: 'draw-repetition',
      winner: null,
    };
  }

  // chess.js 1.4 exposes isDrawByFiftyMoves (without Rule suffix) for half-move counter checks.
  if (instance.isDrawByFiftyMoves()) {
    return {
      status: 'draw-fifty',
      winner: null,
    };
  }

  // Dead positions with insufficient mating material cannot be won by either player.
  if (instance.isInsufficientMaterial()) {
    return {
      status: 'draw-material',
      winner: null,
    };
  }

  if (instance.inCheck()) {
    return {
      status: 'check',
      winner: null,
    };
  }

  return {
    status: 'playing',
    winner: null,
  };
}

export function apply(from: string, to: string, promotion?: string): MoveResult {
  const move = instance.move({
    from,
    to,
    ...(promotion ? { promotion } : {}),
  });
  const currentStatus = status();
  return {
    san: move.san,
    fen: instance.fen(),
    uci: move.lan,
    status: currentStatus.status,
    winner: currentStatus.winner,
  };
}

export function undo(): MoveResult | null {
  const undone = instance.undo();
  if (!undone) {
    return null;
  }
  const currentStatus = status();
  return {
    san: undone.san,
    fen: instance.fen(),
    uci: undone.lan,
    status: currentStatus.status,
    winner: currentStatus.winner,
  };
}

export function fen(): string {
  return instance.fen();
}

export function pgn(): string {
  return instance.pgn();
}

export function loadPgn(pgnString: string): void {
  instance.loadPgn(pgnString);
}

export function isAttacked(square: string, by: Side): boolean {
  if (!/^[a-h][1-8]$/.test(square)) {
    return false;
  }
  return instance.isAttacked(square as Square, by);
}

export function getPiece(square: string): { type: string; color: Side } | null {
  if (!/^[a-h][1-8]$/.test(square)) {
    return null;
  }
  const piece = instance.get(square as Square);
  return piece ? { type: piece.type, color: piece.color as Side } : null;
}

export function getRejectionReason(from: string, to: string): RejectionReason {
  if (instance.isGameOver()) {
    return 'game-over';
  }

  if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) {
    return 'illegal-shape';
  }

  const piece = instance.get(from as Square);
  if (!piece) {
    return 'illegal-shape';
  }

  const turn = instance.turn();
  if (piece.color !== turn) {
    return 'wrong-turn';
  }

  // Castling attempt: king moving 2 squares horizontally
  if (piece.type === 'k') {
    const fromCol = from.charCodeAt(0);
    const toCol = to.charCodeAt(0);
    if (Math.abs(toCol - fromCol) === 2) {
      return 'castling-blocked';
    }
  }

  // If already in check, any illegal move fails to escape check
  if (instance.inCheck()) {
    return 'in-check';
  }

  // If king tries to move into an attacked square
  if (piece.type === 'k') {
    const opponentColor = turn === 'w' ? 'b' : 'w';
    if (instance.isAttacked(to as Square, opponentColor)) {
      return 'in-check';
    }
    return 'illegal-shape';
  }

  // Absolute pin check: if removing piece leaves friendly king under attack
  let kingSquare: Square | null = null;
  const board = instance.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === turn) {
        kingSquare = p.square;
        break;
      }
    }
    if (kingSquare) break;
  }

  if (kingSquare) {
    const clone = new Chess(instance.fen());
    clone.remove(from as Square);
    const opponentColor = turn === 'w' ? 'b' : 'w';
    if (clone.isAttacked(kingSquare, opponentColor)) {
      return 'pinned';
    }
  }

  return 'illegal-shape';
}

export const rules = {
  reset,
  legalFrom,
  legalMovesAll,
  apply,
  undo,
  fen,
  pgn,
  loadPgn,
  status,
  isAttacked,
  getPiece,
  getRejectionReason,
};

export default rules;
