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
  if (!fen) {
    instance.reset();
  } else if (instance.fen() !== fen) {
    instance.load(fen);
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
    return { status: 'checkmate', winner: instance.turn() === 'w' ? 'b' : 'w' };
  }
  // Stalemate is a terminal draw condition where the active side has no legal moves but is not in check.
  if (instance.isStalemate()) {
    return { status: 'stalemate', winner: null };
  }
  // Repetition claims take precedence over move count thresholds per FIDE claim ordering.
  if (instance.isThreefoldRepetition()) {
    return { status: 'draw-repetition', winner: null };
  }
  // chess.js 1.4 exposes isDrawByFiftyMoves (without Rule suffix) for half-move counter checks.
  if (instance.isDrawByFiftyMoves()) {
    return { status: 'draw-fifty', winner: null };
  }
  // Dead positions with insufficient mating material cannot be won by either player.
  if (instance.isInsufficientMaterial()) {
    return { status: 'draw-material', winner: null };
  }
  if (instance.inCheck()) {
    return { status: 'check', winner: null };
  }
  return { status: 'playing', winner: null };
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
  instance.header('Result', '*');
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

export function setHeader(key: string, value: string): void {
  instance.header(key, value);
}

export function pgn(): string {
  const currentStatus = status();
  if (currentStatus.status === 'checkmate') {
    instance.header('Result', currentStatus.winner === 'w' ? '1-0' : '0-1');
  } else if (
    currentStatus.status === 'stalemate' ||
    currentStatus.status === 'draw-repetition' ||
    currentStatus.status === 'draw-fifty' ||
    currentStatus.status === 'draw-material'
  ) {
    instance.header('Result', '1/2-1/2');
  }
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

  const opponentColor = turn === 'w' ? 'b' : 'w';

  // 7. Castling attempted while in, through or into check, or after pieces moved
  if (piece.type === 'k') {
    const fromCol = from.charCodeAt(0);
    const toCol = to.charCodeAt(0);
    const isCastling =
      Math.abs(toCol - fromCol) === 2 ||
      (from === 'e1' && ['g1', 'c1', 'h1', 'a1'].includes(to)) ||
      (from === 'e8' && ['g8', 'c8', 'h8', 'a8'].includes(to));
    if (isCastling) {
      return 'castling-blocked';
    }
  }

  // 5. Moving piece is pinned (removing it would expose the king) - evaluated before in-check
  if (piece.type !== 'k') {
    const kingSquare = instance
      .board()
      .flat()
      .find((p) => p && p.type === 'k' && p.color === turn)?.square;

    if (kingSquare) {
      const clone = new Chess(instance.fen());
      clone.remove(from as Square);
      const beforeAttackers = instance.attackers(kingSquare, opponentColor).length;
      const afterAttackers = clone.attackers(kingSquare, opponentColor).length;
      if (afterAttackers > beforeAttackers) {
        return 'pinned';
      }
    }
  }

  // 6. Side to move is in check, or king moving into check
  if (instance.inCheck()) {
    return 'in-check';
  }

  if (piece.type === 'k' && instance.isAttacked(to as Square, opponentColor)) {
    return 'in-check';
  }

  // 4. Target not in legalFrom -> illegal-shape
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
  setHeader,
  loadPgn,
  status,
  isAttacked,
  getPiece,
  getRejectionReason,
};

export default rules;
