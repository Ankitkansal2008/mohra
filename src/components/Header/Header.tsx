import React, { useRef, useState } from 'react';
import { en } from '../../copy/en.ts';
import { useGameStore } from '../../game/store.ts';
import { track } from '../../lib/analytics.ts';
import { AppLink } from '../Common/AppLink.tsx';
import { useFocusTrap } from '../useFocusTrap.ts';
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
  const menuDialogRef = useRef<HTMLDivElement>(null);

  const handleCloseMenu = (): void => setIsMenuOpen(false);
  useFocusTrap(menuDialogRef, handleCloseMenu, isMenuOpen);

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
        <AppLink to="/" className="gambit-brand-link" aria-label={en.mohra}>
          <img
            src="/favicon.svg"
            alt=""
            width={24}
            height={24}
            className="gambit-brand-mark"
          />
          <span>{en.mohra}</span>
        </AppLink>
      </div>

      {/* Desktop / tablet primary navigation (>= 768px) */}
      <nav className="gambit-nav" aria-label="Main">
        <AppLink to="/play" className="gambit-nav-link">
          {en.navPlay}
        </AppLink>
        <AppLink to="/how-to-play" className="gambit-nav-link">
          {en.navHowToPlay}
        </AppLink>
        <AppLink to="/about" className="gambit-nav-link">
          {en.navAbout}
        </AppLink>
      </nav>

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

        {onNewGame ? (
          <button
            type="button"
            className="gambit-header-btn"
            onClick={handleNewGame}
            aria-label={en.newGame}
          >
            {en.newGame}
          </button>
        ) : null}

        {onOpenSettings ? (
          <button
            type="button"
            className="gambit-header-btn gambit-header-settings-btn"
            onClick={handleOpenSettings}
            aria-label={en.settings}
            title={en.settings}
          >
            <svg
              className="gambit-settings-icon"
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="gambit-settings-text">{en.settings}</span>
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
            ref={menuDialogRef}
            className="gambit-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-menu-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gambit-mobile-menu-header">
              <h2 id="mobile-menu-title" className="gambit-mobile-menu-title">
                {en.menu}
              </h2>
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
              <AppLink
                to="/play"
                className="gambit-mobile-menu-action"
                onClick={handleCloseMenu}
              >
                {en.navPlay}
              </AppLink>
              <AppLink
                to="/how-to-play"
                className="gambit-mobile-menu-action"
                onClick={handleCloseMenu}
              >
                {en.navHowToPlay}
              </AppLink>
              <AppLink
                to="/about"
                className="gambit-mobile-menu-action"
                onClick={handleCloseMenu}
              >
                {en.navAbout}
              </AppLink>
              {onNewGame ? (
                <button
                  type="button"
                  className="gambit-mobile-menu-action"
                  onClick={handleNewGame}
                >
                  {en.newGame}
                </button>
              ) : null}
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
