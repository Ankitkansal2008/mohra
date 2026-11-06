import React, { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { BoardView } from './components/Board/BoardView.tsx';
import { ResultDialog } from './components/Dialogs/ResultDialog.tsx';
import { SettingsDialog } from './components/Dialogs/SettingsDialog.tsx';
import { Footer } from './components/Footer/Footer.tsx';
import { Header } from './components/Header/Header.tsx';
import { HomeScreen } from './components/Home/HomeScreen.tsx';
import { Controls } from './components/Panels/Controls.tsx';
import { EngineBanner } from './components/Panels/EngineBanner.tsx';
import { MoveListPanel } from './components/Panels/MoveListPanel.tsx';
import { ResumeBanner } from './components/Panels/ResumeBanner.tsx';
import { ThinkingIndicator } from './components/Panels/ThinkingIndicator.tsx';
import { TurnIndicator } from './components/Panels/TurnIndicator.tsx';
import { en } from './copy/en.ts';
import { connectBridgeToStore, initEngine } from './engine/bridge.ts';
import { isGameOver } from './game/selectors.ts';
import { useGameStore } from './game/store.ts';
import type { GameState, NewGameOptions } from './game/types.ts';
import { clearSavedGame, isSaveUnder24Hours, loadSavedGame } from './lib/persist.ts';
import './App.css';

function loadDevFenIfPresent(): boolean {
  if (import.meta.env.DEV && typeof window !== 'undefined' && window.location?.search) {
    try {
      const fenParam = new URLSearchParams(window.location.search).get('fen');
      if (fenParam) {
        const trimmed = fenParam.trim();
        new Chess(trimmed);
        useGameStore.getState().loadFen(trimmed);
        useGameStore.getState().dismissToast();
        return true;
      }
    } catch {}
  }
  return false;
}

export function App(): React.JSX.Element {
  const [savedGame, setSavedGame] = useState<GameState | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMovesOpen, setIsMovesOpen] = useState<boolean>(false);
  const [isNewGameOpen, setIsNewGameOpen] = useState<boolean>(() => {
    if (loadDevFenIfPresent()) {
      return false;
    }
    const saved = loadSavedGame();
    if (saved && !isGameOver(saved.status) && isSaveUnder24Hours(saved.savedAt) && saved.moves.length > 0) {
      return false;
    }
    return true;
  });

  const game = useGameStore((s) => s.game);
  const movesCount = game.moves.length;
  const reviewPly = useGameStore((s) => s.ui.reviewPly);
  const isTerminal = isGameOver(game.status);

  // Automatically reveal move panel when entering review mode from ResultDialog
  useEffect(() => {
    if (reviewPly !== null) setIsMovesOpen(true);
  }, [reviewPly]);

  // Lock body scroll while mobile bottom sheet or tablet drawer is open
  useEffect(() => {
    if (!isMovesOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [isMovesOpen]);

  // Close drawer or bottom sheet on Escape key press
  useEffect(() => {
    if (!isMovesOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMovesOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMovesOpen]);

  useEffect(() => {
    initEngine();
    const disconnect = connectBridgeToStore();

    // Development-only ?fen=<fen> query parameter loading (silent on invalid)
    loadDevFenIfPresent();

    // PRD FR-21 / TRD Section 8: Only in-progress games are offered; board stays at start until Resume
    const saved = loadSavedGame();
    if (saved && !isGameOver(saved.status) && isSaveUnder24Hours(saved.savedAt) && saved.moves.length > 0) {
      setSavedGame(saved);
      setShowResumeBanner(true);
    } else if (saved && isGameOver(saved.status)) {
      clearSavedGame();
    }

    // PRD FR-18: Running clock timer ticks active side every 200ms
    const clockTimer = setInterval(() => {
      useGameStore.getState().tickClock();
    }, 200);

    return () => {
      disconnect();
      clearInterval(clockTimer);
    };
  }, []);

  const handleStartNewGame = (options: NewGameOptions): void => {
    useGameStore.getState().startNewGame(options);
    setIsNewGameOpen(false);
    setShowResumeBanner(false);
  };

  return (
    <div className="app-shell">
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleMoves={() => setIsMovesOpen((prev) => !prev)}
        onNewGame={() => setIsNewGameOpen(true)}
        isMovesOpen={isMovesOpen}
        movesCount={movesCount}
      />

      <main className="board-container">
        {/* Left column (240px on >=1100px). On <1100px, display: contents places indicators top & bottom */}
        <div className="left-column">
          <TurnIndicator position="top" />
          <div className="left-column-spacer" />
          <TurnIndicator position="bottom" />
        </div>

        {/* Center column on >=1100px. On <1100px, display: contents preserves mobile-first order */}
        <div className="board-layout">
          {showResumeBanner && savedGame ? (
            <ResumeBanner
              savedGame={savedGame}
              onDismiss={() => setShowResumeBanner(false)}
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

      <Footer />

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <HomeScreen
        isOpen={isNewGameOpen}
        onClose={() => setIsNewGameOpen(false)}
        onStart={handleStartNewGame}
        canClose={movesCount > 0 || isTerminal}
      />
    </div>
  );
}

export default App;
