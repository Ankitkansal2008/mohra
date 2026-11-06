import type React from 'react';
import { formatSquareAriaLabel, getPieceAtSquare } from '../../lib/moveAnnouncement.ts';

export interface BoardScreenReaderGridProps {
  readonly fen: string;
  readonly selected: string | null;
  readonly orientation?: 'white' | 'black';
}

const RANKS_WHITE = [8, 7, 6, 5, 4, 3, 2, 1];
const RANKS_BLACK = [1, 2, 3, 4, 5, 6, 7, 8];
const FILES_WHITE = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const FILES_BLACK = ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];

// UI/UX Section 9: The board is an accessible grid with aria-rowcount/colcount and per-square labels.
export function BoardScreenReaderGrid({
  fen,
  selected,
  orientation = 'white',
}: BoardScreenReaderGridProps): React.JSX.Element {
  const ranks = orientation === 'white' ? RANKS_WHITE : RANKS_BLACK;
  const files = orientation === 'white' ? FILES_WHITE : FILES_BLACK;

  return (
    <div
      className="gambit-sr-grid"
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: 0,
      }}
      aria-hidden="false"
    >
      {ranks.map((rankNum, rIndex) => (
        <div key={rankNum} role="row" aria-rowindex={rIndex + 1}>
          {files.map((fileChar, cIndex) => {
            const square = `${fileChar}${rankNum}`;
            const piece = getPieceAtSquare(fen, square);
            const label = formatSquareAriaLabel(square, piece);
            return (
              <div
                key={square}
                id={`gambit-cell-${square}`}
                role="gridcell"
                aria-colindex={cIndex + 1}
                aria-label={label}
                aria-selected={selected === square}
                tabIndex={-1}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default BoardScreenReaderGrid;

