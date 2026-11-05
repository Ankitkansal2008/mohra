import { Chess, type Square } from 'chess.js';

export type Side = 'w' | 'b';

export type GameStatus =
  | 'checkmate'
  | 'stalemate'
  | 'draw-repetition'
  | 'draw-fifty'
  | 'draw-material'
  | 'check'
  | 'playing';

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
};

export default rules;
