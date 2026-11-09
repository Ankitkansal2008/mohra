import React from 'react';
import { BoardView } from '../components/Board/BoardView.tsx';
import { ResultDialog } from '../components/Dialogs/ResultDialog.tsx';
import { Controls } from '../components/Panels/Controls.tsx';
import { EngineBanner } from '../components/Panels/EngineBanner.tsx';
import { FirstVisitBanner } from '../components/Panels/FirstVisitBanner.tsx';
import { MoveListPanel } from '../components/Panels/MoveListPanel.tsx';
import { ResumeBanner } from '../components/Panels/ResumeBanner.tsx';
import { ThinkingIndicator } from '../components/Panels/ThinkingIndicator.tsx';
import { TurnIndicator } from '../components/Panels/TurnIndicator.tsx';
import { en } from '../copy/en.ts';
import { isGameOver } from '../game/selectors.ts';
import { useGameStore } from '../game/store.ts';
import type { GameState } from '../game/types.ts';
import { usePageMetadata } from '../hooks/usePageMetadata.ts';

export interface GamePageProps {
  readonly isMovesOpen: boolean;
  readonly setIsMovesOpen: React.Dispatch<React.SetStateAction<boolean>>;
  readonly savedGame: GameState | null;
  readonly showResumeBanner: boolean;
  readonly onDismissResume: () => void;
}

export function GamePage({
  isMovesOpen,
  setIsMovesOpen,
  savedGame,
  showResumeBanner,
  onDismissResume,
}: GamePageProps): React.JSX.Element {
  usePageMetadata(en.homeTitle, en.homeMetaDescription);

  const game = useGameStore((s) => s.game);
  const reviewPly = useGameStore((s) => s.ui.reviewPly);
  const isTerminal = isGameOver(game.status);

  return (
    <main className="board-container">
      {/* Left column (240px on >=1100px). On <1100px, display: contents places indicators top & bottom */}
      <div className="left-column">
        <TurnIndicator position="top" />
        <div className="left-column-spacer" />
        <TurnIndicator position="bottom" />
      </div>

      {/* Center column on >=1100px. On <1100px, display: contents preserves mobile-first order */}
      <div className="board-layout">
        <FirstVisitBanner />
        {showResumeBanner && savedGame ? (
          <ResumeBanner
            savedGame={savedGame}
            onDismiss={onDismissResume}
          />
        ) : null}
        <EngineBanner />
        <BoardView />
        <ThinkingIndicator />
        {/* UI/UX Section 7 & 10: Result panel renders below board in place of controls row */}
        {isTerminal && reviewPly === null ? (
          <ResultDialog
            status={game.status}
            winner={game.winner}
            fen={game.fen}
          />
        ) : (
          <Controls
            onToggleMoves={() => setIsMovesOpen((prev) => !prev)}
            isMovesOpen={isMovesOpen}
          />
        )}
      </div>

      {/* Drawer / bottom sheet backdrop (covers full viewport on <1100px) */}
      {isMovesOpen ? (
        <div
          className="gambit-drawer-backdrop"
          role="presentation"
          onClick={() => setIsMovesOpen(false)}
        />
      ) : null}

      {/* Right column on >=1100px (280px). On 768-1099px: side drawer. Below 768px: bottom sheet */}
      <div
        className={`sidebar-layout ${isMovesOpen ? 'sidebar-open' : ''}`}
        role="region"
        aria-label={en.moves}
      >
        <div className="sidebar-inner">
          <MoveListPanel onClose={() => setIsMovesOpen(false)} />
        </div>
      </div>
    </main>
  );
}

export default GamePage;

