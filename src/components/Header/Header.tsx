import type React from 'react';
import { en } from '../../copy/en.ts';
import { useGameStore } from '../../game/store.ts';
import { FenLoader } from './FenLoader.tsx';
import './Header.css';

export interface HeaderProps {
  readonly onOpenSettings?: () => void;
}

export function Header({ onOpenSettings }: HeaderProps): React.JSX.Element {
  const resetGame = useGameStore((s) => s.resetGame);

  return (
    <header className="gambit-header" role="banner">
      <div className="gambit-brand">Gambit</div>

      <div className="gambit-header-actions">
        {import.meta.env.DEV ? <FenLoader /> : null}
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
