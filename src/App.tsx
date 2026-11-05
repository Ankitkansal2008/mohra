import React, { useEffect, useState } from 'react';
import { BoardView } from './components/Board/BoardView.tsx';
import { SettingsDialog } from './components/Dialogs/SettingsDialog.tsx';
import { Header } from './components/Header/Header.tsx';
import { Controls } from './components/Panels/Controls.tsx';
import { EngineBanner } from './components/Panels/EngineBanner.tsx';
import { MoveListPanel } from './components/Panels/MoveListPanel.tsx';
import { ResumeBanner } from './components/Panels/ResumeBanner.tsx';
import { ThinkingIndicator } from './components/Panels/ThinkingIndicator.tsx';
import { TurnIndicator } from './components/Panels/TurnIndicator.tsx';
import { connectBridgeToStore, initEngine } from './engine/bridge.ts';
import { useGameStore } from './game/store.ts';
import type { GameState } from './game/types.ts';
import { isSaveUnder24Hours, loadSavedGame } from './lib/persist.ts';
import './App.css';

export function App(): React.JSX.Element {
  const [savedGame, setSavedGame] = useState<GameState | null>(null);
  const [showResumeBanner, setShowResumeBanner] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  useEffect(() => {
    initEngine();
    const disconnect = connectBridgeToStore();

    // PRD FR-21 / TRD Section 8: Auto-restore on mount; corrupt state falls back to clean game
    const saved = loadSavedGame();
    if (saved) {
      useGameStore.getState().restoreGame(saved);
      if (isSaveUnder24Hours(saved.savedAt) && saved.moves.length > 0) {
        setSavedGame(saved);
        setShowResumeBanner(true);
      }
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

  return (
    <div className="app-shell">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />
      <main className="board-container">
        <div className="board-layout">
          {showResumeBanner && savedGame ? (
            <ResumeBanner
              savedGame={savedGame}
              onDismiss={() => setShowResumeBanner(false)}
            />
          ) : null}
          <EngineBanner />
          <TurnIndicator position="top" />
          <BoardView />
          <TurnIndicator position="bottom" />
          <ThinkingIndicator />
          <Controls />
        </div>
        <div className="sidebar-layout">
          <MoveListPanel />
        </div>
      </main>

      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
