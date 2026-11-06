import React from 'react';
import './BoardCoordinates.css';

export interface BoardCoordinatesProps {
  readonly boardOrientation?: 'white' | 'black';
  readonly showCoords?: boolean;
  readonly children: React.ReactNode;
}

const WHITE_RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;
const BLACK_RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;
const WHITE_FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const BLACK_FILES = ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] as const;

// UI/UX Section 4 & Section 10: Ranks 1-8 outside to the left, files a-h under the board.
// Rendered at 11px in --color-muted (#5A5A5A), hidden below 360px width.
export function BoardCoordinates({
  boardOrientation = 'white',
  showCoords = true,
  children,
}: BoardCoordinatesProps): React.JSX.Element {
  const ranks = boardOrientation === 'white' ? WHITE_RANKS : BLACK_RANKS;
  const files = boardOrientation === 'white' ? WHITE_FILES : BLACK_FILES;

  return (
    <div className="gambit-board-coords-container">
      <div className="gambit-board-ranks-row">
        {showCoords ? (
          <div className="gambit-coords-ranks" aria-hidden="true">
            {ranks.map((rank) => (
              <span key={rank} className="gambit-coord-rank-label">
                {rank}
              </span>
            ))}
          </div>
        ) : null}

        <div className="gambit-board-core-slot">{children}</div>
      </div>

      {showCoords ? (
        <div className="gambit-coords-files" aria-hidden="true">
          <div className="gambit-coord-spacer" />
          <div className="gambit-coord-files-list">
            {files.map((file) => (
              <span key={file} className="gambit-coord-file-label">
                {file}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default BoardCoordinates;

