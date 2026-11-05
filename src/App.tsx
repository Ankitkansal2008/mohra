import React, { useEffect } from 'react';
import { BoardView } from './components/Board/BoardView.tsx';
import { Header } from './components/Header/Header.tsx';
import { Controls } from './components/Panels/Controls.tsx';
import { EngineBanner } from './components/Panels/EngineBanner.tsx';
import { ThinkingIndicator } from './components/Panels/ThinkingIndicator.tsx';
import { connectBridgeToStore, initEngine } from './engine/bridge.ts';
import './App.css';

export function App(): React.JSX.Element {
  useEffect(() => {
    initEngine();
    const disconnect = connectBridgeToStore();
    return () => {
      disconnect();
    };
  }, []);

  return (
    <div className="app-shell">
      <Header />
      <main className="board-container">
        <div className="board-layout">
          <EngineBanner />
          <BoardView />
          <ThinkingIndicator />
          <Controls />
        </div>
      </main>
    </div>
  );
}

export default App;
