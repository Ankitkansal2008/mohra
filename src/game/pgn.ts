import { rules } from './rules.ts';
import type { GameState, GameStatus, Side } from './types.ts';

export function getResultToken(status: GameStatus, winner: Side | null): string {
  if (status === 'checkmate' || status === 'resigned' || status === 'timeout') {
    return winner === 'w' ? '1-0' : '0-1';
  }
  if (
    status === 'stalemate' ||
    status === 'draw-repetition' ||
    status === 'draw-fifty' ||
    status === 'draw-material'
  ) {
    return '1/2-1/2';
  }
  return '*';
}

export function getPlayerNames(
  mode: 'computer' | 'local',
  humanSide: Side,
): { white: string; black: string } {
  if (mode === 'computer') {
    return {
      white: humanSide === 'w' ? 'You' : 'Gambit',
      black: humanSide === 'b' ? 'You' : 'Gambit',
    };
  }
  return {
    white: 'Player 1',
    black: 'Player 2',
  };
}

export function syncPgnHeaders(
  game: Pick<GameState, 'mode' | 'humanSide' | 'status' | 'winner'>,
): void {
  const names = getPlayerNames(game.mode, game.humanSide);
  rules.setHeader('White', names.white);
  rules.setHeader('Black', names.black);
  rules.setHeader('Result', getResultToken(game.status, game.winner));
}

// PRD FR-17: Download the active game representation as valid PGN file.
export function downloadPgnFile(pgnText: string, filename: string = 'gambit.pgn'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([pgnText], { type: 'application/x-chess-pgn;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
