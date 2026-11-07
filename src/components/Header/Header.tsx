import React, { useState } from 'react';
import { en } from '../../copy/en.ts';
import { useGameStore } from '../../game/store.ts';
import { track } from '../../lib/analytics.ts';
import './Header.css';

export interface HeaderProps {
  readonly onOpenSettings?: () => void;
  readonly onToggleMoves?: () => void;
  readonly onNewGame?: () => void;
  readonly isMovesOpen?: boolean;
  readonly movesCount?: number;
}

export function Header({
  onOpenSettings,
  onToggleMoves,
  onNewGame,
  isMovesOpen,
  movesCount,
}: HeaderProps): React.JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const resetGame = useGameStore((s) => s.resetGame);

  const handleNewGame = (): void => {
    track('new_game', { from: 'header' });
    if (onNewGame) {
      onNewGame();
    } else {
      resetGame();
    }
    setIsMenuOpen(false);
  };

  const handleOpenSettings = (): void => {
    if (onOpenSettings) onOpenSettings();
    setIsMenuOpen(false);
  };

  return (
    <header className="gambit-header" role="banner">
      <div className="gambit-brand">
        <img
          src="/favicon.svg"
          alt=""
          width={24}
          height={24}
          className="gambit-brand-mark"
        />
        <span>{en.mohra}</span>
      </div>

      {/* Desktop / tablet header actions (>= 768px) */}
      <div className="gambit-header-actions gambit-header-desktop-actions">
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
          onClick={handleNewGame}
          aria-label={en.newGame}
        >
          {en.newGame}
        </button>
        {onOpenSettings ? (
          <button
            type="button"
            className="gambit-header-btn"
            onClick={handleOpenSettings}
            aria-label={en.settings}
          >
            {en.settings}
          </button>
        ) : null}
      </div>

      {/* Mobile single-button menu trigger (< 768px per UI/UX Section 3) */}
      <div className="gambit-header-mobile-trigger">
        <button
          type="button"
          className="gambit-header-btn gambit-header-menu-btn"
          onClick={() => setIsMenuOpen(true)}
          aria-label={en.menu}
          aria-expanded={isMenuOpen}
        >
          {en.menu}
        </button>
      </div>

      {/* Mobile menu modal dialog */}
      {isMenuOpen ? (
        <div
          className="gambit-mobile-menu-backdrop"
          role="presentation"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="gambit-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={en.menu}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gambit-mobile-menu-header">
              <span className="gambit-mobile-menu-title">{en.menu}</span>
              <button
                type="button"
                className="gambit-mobile-menu-close"
                onClick={() => setIsMenuOpen(false)}
                aria-label={en.close}
              >
                ×
              </button>
            </div>
            <div className="gambit-mobile-menu-body">
              <button
                type="button"
                className="gambit-mobile-menu-action"
                onClick={handleNewGame}
              >
                {en.newGame}
              </button>
              {onOpenSettings ? (
                <button
                  type="button"
                  className="gambit-mobile-menu-action"
                  onClick={handleOpenSettings}
                >
                  {en.settings}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export default Header;
