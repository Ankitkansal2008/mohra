import type React from 'react';
import { BoardView } from './components/Board/BoardView.tsx';
import './App.css';

export function App(): React.JSX.Element {
  return (
    <main className="board-container">
      <BoardView />
    </main>
  );
}

export default App;
