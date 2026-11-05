import type React from 'react';
import { BoardView } from './components/Board/BoardView.tsx';
import { Header } from './components/Header/Header.tsx';
import { Controls } from './components/Panels/Controls.tsx';
import './App.css';

export function App(): React.JSX.Element {
  return (
    <div className="app-shell">
      <Header />
      <main className="board-container">
        <div className="board-layout">
          <BoardView />
          <Controls />
        </div>
      </main>
    </div>
  );
}

export default App;
