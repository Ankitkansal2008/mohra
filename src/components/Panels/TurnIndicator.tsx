import type React from 'react';
import { en } from '../../copy/en.ts';
import { getPlayerNames } from '../../game/pgn.ts';
import { getTurn, isGameOver } from '../../game/selectors.ts';
import { useGameStore } from '../../game/store.ts';
import type { Side } from '../../game/types.ts';
import { formatClock } from '../../lib/format.ts';
import './TurnIndicator.css';

export interface TurnIndicatorProps {
  readonly position: 'top' | 'bottom';
  readonly className?: string;
}

export function TurnIndicator({
  position,
  className = '',
}: TurnIndicatorProps): React.JSX.Element {
  const game = useGameStore((s) => s.game);
  const storeClock = useGameStore((s) => s.clock);
  const flipped = useGameStore((s) => s.ui.flipped);

  // Position on screen maps to side based on current board flip orientation
  const side: Side = position === 'top' ? (flipped ? 'w' : 'b') : (flipped ? 'b' : 'w');
  const currentTurn = getTurn(game.fen);
  const isCurrentTurn = !isGameOver(game.status) && currentTurn === side;

  const names = getPlayerNames(game.mode, game.humanSide);
  const playerName = side === 'w' ? names.white : names.black;
  const isComputerPlayer = game.mode === 'computer' && side !== game.humanSide;

  const sideLabel = side === 'w' ? en.white : en.black;
  const subLabel = isComputerPlayer
    ? `${en.levelLabel.replace('{level}', String(game.level))} • ${sideLabel}`
    : sideLabel;

  const clock = storeClock ?? game.clock;
  const clockMs = clock ? (side === 'w' ? clock.whiteMs : clock.blackMs) : null;
  const isClockActive = clock?.running === side && !isGameOver(game.status);
  const isClockUrgent = clockMs !== null && clockMs < 60_000 && clockMs > 0;
  const isClockFlagged = clockMs !== null && clockMs <= 0;

  const clockClass = [
    'gambit-clock',
    isClockActive ? 'gambit-clock-active' : '',
    isClockUrgent ? 'gambit-clock-urgent' : '',
    isClockFlagged ? 'gambit-clock-flagged' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={`gambit-turn-indicator ${className}`.trim()}
      data-testid={`turn-indicator-${position}`}
      data-side={side}
    >
      <div className="gambit-player-info">
        <div
          className={`gambit-player-avatar ${side === 'w' ? 'gambit-avatar-white' : 'gambit-avatar-black'}`}
          aria-hidden="true"
        >
          {side === 'w' ? '♔' : '♚'}
        </div>
        <div className="gambit-player-meta">
          <div className="gambit-player-name">{playerName}</div>
          <div className="gambit-player-sub">{subLabel}</div>
        </div>
        {isCurrentTurn ? (
          <span className="gambit-turn-badge" role="status">
            {en.toMove}
          </span>
        ) : null}
      </div>

      {clockMs !== null ? (
        <div
          className={clockClass}
          role="timer"
          aria-label={en.playerClock
            .replace('{player}', playerName)
            .replace('{time}', formatClock(clockMs))}
        >
          {formatClock(clockMs)}
        </div>
      ) : null}
    </div>
  );
}

export default TurnIndicator;

