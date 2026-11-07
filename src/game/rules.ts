import { Chess, type Move, type Square } from 'chess.js';
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

// FIDE repetition key: piece placement, side to move, castling rights, and en passant square.
export function getRepetitionKey(fenString: string): string {
  const parts = fenString.split(' ');
  return parts.slice(0, 4).join(' ');
}

// Single authoritative rules instance maintains game state and repetition counts.
let instance = new Chess();
let positionCounts = new Map<string, number>();

function initPositionCounts(): void {
  positionCounts = new Map<string, number>([[getRepetitionKey(instance.fen()), 1]]);
}

export function reset(fen?: string): void {
  if (!fen) {
    instance.reset();
    initPositionCounts();
  } else if (instance.fen() !== fen) {
    instance.load(fen);
    initPositionCounts();
  }
}

export function syncTo(fen: string): void {
  if (instance.fen() !== fen) {
    instance.load(fen);
    initPositionCounts();
  }
}

export function isThreefoldRepetition(): boolean {
  const key = getRepetitionKey(instance.fen());
  return (positionCounts.get(key) ?? 0) >= 3;
}

export function legalFrom(square: string): string[] {
  if (!/^[a-h][1-8]$/.test(square)) {
    return [];
  }
  const moves = instance.moves({ square: square as Square, verbose: true });
  return Array.from(new Set(moves.map((move) => move.to)));
}

export function legalMovesAll(): LegalMove[] {
  return instance.moves({ verbose: true }).map((move) =>
    move.promotion ? { from: move.from, to: move.to, promotion: move.promotion } : { from: move.from, to: move.to },
  );
}

export function findLegalMove(moveStr: string): { from: string; to: string; promotion?: string; san: string } | null {
  const clean = moveStr.replace(/[+#]/g, '');
  const lower = moveStr.toLowerCase();
  const moves = instance.moves({ verbose: true });
  const matched = moves.find(
    (m) =>
      m.san === moveStr ||
      m.san.replace(/[+#]/g, '') === clean ||
      m.lan === moveStr ||
      `${m.from}${m.to}` === moveStr ||
      `${m.from}${m.to}${m.promotion ?? ''}` === moveStr ||
      `${m.from}${m.to}${m.promotion ?? ''}`.toLowerCase() === lower,
  );
  if (!matched) return null;
  return { from: matched.from, to: matched.to, promotion: matched.promotion, san: matched.san };
}

export function status(): { status: GameStatus; winner: Side | null } {
  if (instance.isCheckmate()) return { status: 'checkmate', winner: instance.turn() === 'w' ? 'b' : 'w' };
  if (instance.isStalemate()) return { status: 'stalemate', winner: null };
  if (isThreefoldRepetition()) return { status: 'draw-repetition', winner: null };
  if (instance.isDrawByFiftyMoves()) return { status: 'draw-fifty', winner: null };
  if (instance.isInsufficientMaterial()) return { status: 'draw-material', winner: null };
  if (instance.inCheck()) return { status: 'check', winner: null };
  return { status: 'playing', winner: null };
}

export function apply(fromOrSan: string, to?: string, promotion?: string): MoveResult {
  let move: Move;
  try {
    if (to) {
      move = instance.move({ from: fromOrSan, to, ...(promotion ? { promotion } : {}) });
    } else {
      move = instance.move(fromOrSan);
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Rules] Rejected illegal move: ${fromOrSan}${to ? '->' + to : ''}. Error: ${errorMsg}`);
    throw new Error(`Illegal move: ${fromOrSan}${to ? '->' + to : ''}`);
  }

  // Exactly one entry added to position counts per ply
  const newFen = instance.fen();
  const key = getRepetitionKey(newFen);
  positionCounts.set(key, (positionCounts.get(key) ?? 0) + 1);

  const currentStatus = status();
  return {
    san: move.san,
    fen: newFen,
    uci: `${move.from}${move.to}${move.promotion ?? ''}`,
    status: currentStatus.status,
    winner: currentStatus.winner,
  };
}

export function undo(): MoveResult | null {
  const currentKey = getRepetitionKey(instance.fen());
  const undone = instance.undo();
  if (!undone) return null;

  const count = positionCounts.get(currentKey) ?? 1;
  if (count <= 1) positionCounts.delete(currentKey);
  else positionCounts.set(currentKey, count - 1);

  instance.header('Result', '*');
  const currentStatus = status();
  return {
    san: undone.san,
    fen: instance.fen(),
    uci: `${undone.from}${undone.to}${undone.promotion ?? ''}`,
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
  } else if (['stalemate', 'draw-repetition', 'draw-fifty', 'draw-material'].includes(currentStatus.status)) {
    instance.header('Result', '1/2-1/2');
  }
  return instance.pgn();
}

export function loadPgn(pgnString: string): void {
  instance.loadPgn(pgnString);
  positionCounts = new Map<string, number>();
  const replay = new Chess();
  positionCounts.set(getRepetitionKey(replay.fen()), 1);
  for (const histMove of instance.history()) {
    replay.move(histMove);
    const key = getRepetitionKey(replay.fen());
    positionCounts.set(key, (positionCounts.get(key) ?? 0) + 1);
  }
}

export function isAttacked(square: string, by: Side): boolean {
  if (!/^[a-h][1-8]$/.test(square)) return false;
  return instance.isAttacked(square as Square, by);
}

export function getPiece(square: string): { type: string; color: Side } | null {
  if (!/^[a-h][1-8]$/.test(square)) return null;
  const piece = instance.get(square as Square);
  return piece ? { type: piece.type, color: piece.color as Side } : null;
}

export function getRejectionReason(from: string, to: string): RejectionReason {
  if (instance.isGameOver()) return 'game-over';
  if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) return 'illegal-shape';
  const piece = instance.get(from as Square);
  if (!piece) return 'illegal-shape';

  const turn = instance.turn();
  if (piece.color !== turn) return 'wrong-turn';
  const opponentColor = turn === 'w' ? 'b' : 'w';

  if (piece.type === 'k') {
    const fromCol = from.charCodeAt(0);
    const toCol = to.charCodeAt(0);
    const isCastling =
      Math.abs(toCol - fromCol) === 2 ||
      (from === 'e1' && ['g1', 'c1', 'h1', 'a1'].includes(to)) ||
      (from === 'e8' && ['g8', 'c8', 'h8', 'a8'].includes(to));
    if (isCastling) return 'castling-blocked';
  }

  if (piece.type !== 'k') {
    const kingSquare = instance.board().flat().find((p) => p && p.type === 'k' && p.color === turn)?.square;
    if (kingSquare) {
      const clone = new Chess(instance.fen());
      clone.remove(from as Square);
      if (clone.attackers(kingSquare, opponentColor).length > instance.attackers(kingSquare, opponentColor).length) {
        return 'pinned';
      }
    }
  }

  if (instance.inCheck() || (piece.type === 'k' && instance.isAttacked(to as Square, opponentColor))) {
    return 'in-check';
  }
  return 'illegal-shape';
}

export const rules = {
  reset,
  syncTo,
  legalFrom,
  legalMovesAll,
  findLegalMove,
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
  getRepetitionKey,
  isThreefoldRepetition,
};

export default rules;
