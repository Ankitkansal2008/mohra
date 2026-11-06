import type React from 'react';
import { en } from '../../copy/en.ts';
import { useGameStore } from '../../game/store.ts';
import { FenLoader } from './FenLoader.tsx';
import './Header.css';

export interface HeaderProps {
  readonly onOpenSettings?: () => void;
  readonly onToggleMoves?: () => void;
  readonly isMovesOpen?: boolean;
  readonly movesCount?: number;
}

export function Header({
  onOpenSettings,
  onToggleMoves,
  isMovesOpen,
  movesCount,
}: HeaderProps): React.JSX.Element {
  const resetGame = useGameStore((s) => s.resetGame);

  return (
    <header className="gambit-header" role="banner">
      <div className="gambit-brand">{en.gambit}</div>

      <div className="gambit-header-actions">
        {import.meta.env.DEV ? <FenLoader /> : null}
        {onToggleMoves ? (
          <button
            type="button"
            className={`gambit-header-btn gambit-header-moves-btn ${isMovesOpen ? 'gambit-header-btn-active' : ''}`}
            onClick={onToggleMoves}
            aria-label={en.moves}
            aria-expanded={isMovesOpen}
          >
            {en.moves}
            {movesCount !== undefined && movesCount > 0 ? ` (${movesCount})` : ''}
          </button>
        ) : null}
        <button
          type="button"
          className="gambit-header-btn"
          onClick={() => resetGame()}
          aria-label={en.newGame}
        >
          {en.newGame}
        </button>
        {onOpenSettings ? (
          <button
            type="button"
            className="gambit-header-btn"
            onClick={onOpenSettings}
            aria-label={en.settings}
          >
            {en.settings}
          </button>
        ) : null}
      </div>
    </header>
  );
}

export default Header;
