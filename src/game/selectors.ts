import { en } from '../copy/en.ts';
import { rules } from './rules.ts';
import type {
  GameState,
  GameStatus,
  RejectionReason,
  Side,
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

export function getResultExplanation(
  status: GameStatus,
  winner: Side | null,
  fen?: string,
): { headline: string; detail: string } | null {
  if (!isGameOver(status)) {
    return null;
  }

  if (status === 'checkmate') {
    const winnerLabel = winner === 'b' ? 'Black' : 'White';
    const loserLabel = winner === 'b' ? 'White' : 'Black';
    return {
      headline: en.checkmate.replace('{Winner}', winnerLabel),
      detail: en.checkmateDetail.replace('{Loser}', loserLabel),
    };
  }

  if (status === 'stalemate') {
    const turn = fen ? getTurn(fen) : 'w';
    const sideLabel = turn === 'b' ? 'Black' : 'White';
    return {
      headline: en.stalemate,
      detail: en.stalemateDetail.replace('{Side}', sideLabel),
    };
  }

  if (status === 'draw-repetition') {
    return { headline: en.repetition, detail: en.repetitionDetail };
  }

  if (status === 'draw-fifty') {
    return { headline: en.fiftyMove, detail: en.fiftyMoveDetail };
  }

  if (status === 'draw-material') {
    return { headline: en.insufficientMaterial, detail: '' };
  }

  const winnerLabel = winner === 'b' ? 'Black' : 'White';
  const loserLabel = winner === 'b' ? 'White' : 'Black';

  if (status === 'resigned') {
    return {
      headline: en.resigned.replace('{Player}', loserLabel).replace('{Winner}', winnerLabel),
      detail: '',
    };
  }

  if (status === 'timeout') {
    return {
      headline: en.timeout.replace('{Player}', loserLabel).replace('{Winner}', winnerLabel),
      detail: '',
    };
  }

  return null;
}

export function isSquareOccupied(fen: string, square: string): boolean {
  if (!/^[a-h][1-8]$/.test(square)) return false;
  const rows = fen.split(' ')[0].split('/');
  const fileIndex = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1], 10);
  const rowStr = rows[8 - rank];
  if (!rowStr) return false;

  let currentFile = 0;
  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    if (char >= '1' && char <= '8') {
      currentFile += parseInt(char, 10);
    } else {
      if (currentFile === fileIndex) return true;
      currentFile += 1;
    }
    if (currentFile > fileIndex) break;
  }
  return false;
}

export function findKingSquare(fen: string, color: 'w' | 'b'): string | null {
  const rows = fen.split(' ')[0].split('/');
  const kingChar = color === 'w' ? 'K' : 'k';
  for (let r = 0; r < 8; r++) {
    const rank = 8 - r;
    let file = 0;
    for (const char of rows[r]) {
      if (char >= '1' && char <= '8') {
        file += parseInt(char, 10);
      } else {
        if (char === kingChar) {
          return `${String.fromCharCode('a'.charCodeAt(0) + file)}${rank}`;
        }
        file += 1;
      }
    }
  }
  return null;
}

export function createInitialGameState(fen: string = STARTING_FEN): GameState {
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
    mode: 'local',
    humanSide: 'w',
    level: 2,
    clock: null,
    startedAt: Date.now(),
    savedAt: Date.now(),
  };
}

export function createInitialUiState(): UiState {
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

// Undo availability: 1 ply in local mode, 2 plies in computer mode so human always moves.
export function canUndo(game: GameState): boolean {
  if (game.moves.length === 0) {
    return false;
  }
  if (game.mode === 'local') {
    return game.moves.length >= 1;
  }
  return game.humanSide === 'w' ? game.moves.length >= 1 : game.moves.length >= 2;
}

export function getPliesToUndo(game: GameState): number {
  if (!canUndo(game)) {
    return 0;
  }
  if (game.mode === 'local') {
    return 1;
  }
  if (game.humanSide === 'w') {
    return game.moves.length >= 2 ? 2 : 1;
  }
  return game.moves.length >= 3 ? 2 : 1;
}

export function getResignWinner(game: GameState): Side {
  const currentTurn = getTurn(game.fen);
  const resigningSide: Side = game.mode === 'computer' ? game.humanSide : currentTurn;
  return resigningSide === 'w' ? 'b' : 'w';
}
