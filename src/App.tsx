import type React from 'react';
import { BoardView } from './components/Board/BoardView.tsx';
import { Header } from './components/Header/Header.tsx';
import './App.css';

export function App(): React.JSX.Element {
  return (
    <div className="app-shell">
      <Header />
      <main className="board-container">
        <BoardView />
      </main>
    </div>
  );
}

export default App;
