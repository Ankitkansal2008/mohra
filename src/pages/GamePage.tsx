import React, { useState } from 'react';
import { BoardView } from '../components/Board/BoardView.tsx';
import { ResultDialog } from '../components/Dialogs/ResultDialog.tsx';
import { HomeScreen } from '../components/Home/HomeScreen.tsx';
import { Controls } from '../components/Panels/Controls.tsx';
import { EngineBanner } from '../components/Panels/EngineBanner.tsx';
import { MoveListPanel } from '../components/Panels/MoveListPanel.tsx';
import { ThinkingIndicator } from '../components/Panels/ThinkingIndicator.tsx';
import { TurnIndicator } from '../components/Panels/TurnIndicator.tsx';
import { en } from '../copy/en.ts';
import { isGameOver } from '../game/selectors.ts';
import { useGameStore } from '../game/store.ts';
import type { GameState, NewGameOptions } from '../game/types.ts';
import { usePageMetadata } from '../hooks/usePageMetadata.ts';
import { clearSavedGame, isSaveUnder24Hours, loadSavedGame } from '../lib/persist.ts';

export interface GamePageProps {
  readonly isMovesOpen: boolean;
  readonly setIsMovesOpen: React.Dispatch<React.SetStateAction<boolean>>;
  readonly savedGame?: GameState | null;
  readonly setSavedGame?: React.Dispatch<React.SetStateAction<GameState | null>>;
  readonly showResumeBanner?: boolean;
  readonly onDismissResume?: () => void;
}

export function GamePage({
  isMovesOpen,
  setIsMovesOpen,
  savedGame: propSavedGame,
  setSavedGame: setPropSavedGame,
}: GamePageProps): React.JSX.Element {
  usePageMetadata(en.playDocTitle, en.playMetaDescription);

  const [localSavedGame, setLocalSavedGame] = useState<GameState | null>(() => {
    if (propSavedGame !== undefined) return propSavedGame;
    const saved = loadSavedGame();
    if (saved && !isGameOver(saved.status) && isSaveUnder24Hours(saved.savedAt) && saved.moves.length > 0) {
      return saved;
    }
    return null;
  });

  const effectiveSavedGame = propSavedGame !== undefined ? propSavedGame : localSavedGame;

  const game = useGameStore((s) => s.game);
  const storeInProgress = useGameStore((s) => s.isGameInProgress);
  const reviewPly = useGameStore((s) => s.ui.reviewPly);
  const isTerminal = isGameOver(game.status);
  const isGameInProgress = storeInProgress || isTerminal || game.moves.length > 0;

  const handleStartNewGame = (options: NewGameOptions): void => {
    useGameStore.getState().startNewGame(options);
    if (setPropSavedGame) setPropSavedGame(null);
    setLocalSavedGame(null);
  };

  const handleResumeGame = (): void => {
    if (effectiveSavedGame) {
      useGameStore.getState().restoreGame(effectiveSavedGame);
      if (setPropSavedGame) setPropSavedGame(null);
      setLocalSavedGame(null);
    }
  };

  const handleDiscardGame = (): void => {
    clearSavedGame();
    if (setPropSavedGame) setPropSavedGame(null);
    setLocalSavedGame(null);
  };

  if (!isGameInProgress) {
    return (
      <main className="board-container setup-mode" role="main">
        <div className="board-layout">
          <HomeScreen
            inline
            isOpen
            savedGame={effectiveSavedGame}
            onResume={handleResumeGame}
            onDiscard={handleDiscardGame}
            onStart={handleStartNewGame}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="board-container" role="main">
      {/* Left column (240px on >=1100px) */}
      <div className="left-column">
        <TurnIndicator position="top" />
        <div className="left-column-spacer" />
        <TurnIndicator position="bottom" />
      </div>

      {/* Center column */}
      <div className="board-layout">
        <EngineBanner />
        <BoardView />
        <ThinkingIndicator />
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

      {/* Drawer / bottom sheet backdrop */}
      {isMovesOpen ? (
        <div
          className="gambit-drawer-backdrop"
          role="presentation"
          onClick={() => setIsMovesOpen(false)}
        />
      ) : null}

      {/* Right column */}
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
