import type React from 'react';
import { BoardView } from './components/Board/BoardView.tsx';
import './App.css';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function App(): React.JSX.Element {
  return (
    <main className="board-container">
      <BoardView fen={STARTING_FEN} />
    </main>
  );
}

export default App;
