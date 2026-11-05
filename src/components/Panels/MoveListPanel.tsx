import React from 'react';
import { en } from '../../copy/en.ts';
import { downloadPgnFile } from '../../game/pgn.ts';
import { getMovePairs } from '../../game/selectors.ts';
import { useGameStore } from '../../game/store.ts';
import './MoveListPanel.css';

export interface MoveListPanelProps {
  readonly className?: string;
}

export function MoveListPanel({
  className = '',
}: MoveListPanelProps): React.JSX.Element {
  const moves = useGameStore((s) => s.game.moves);
  const pgn = useGameStore((s) => s.game.pgn);
  const reviewPly = useGameStore((s) => s.ui.reviewPly);
  const setReviewPly = useGameStore((s) => s.setReviewPly);
  const showToast = useGameStore((s) => s.showToast);

  const movePairs = getMovePairs(moves);
  const isReviewing = reviewPly !== null;

  const handleReturnToGame = (): void => {
    setReviewPly(null);
  };

  const handleCopyPgn = (): void => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(pgn).catch(() => {});
    }
    showToast(en.pgnCopied);
  };

  const handleDownloadPgn = (): void => {
    downloadPgnFile(pgn);
  };

  const activePly = isReviewing ? reviewPly : moves.length - 1;

  return (
    <aside className={`gambit-move-panel ${className}`.trim()} aria-label={en.moves}>
      <div className="gambit-move-panel-header">
        <h2 className="gambit-move-panel-title">{en.moves}</h2>
      </div>

      {isReviewing ? (
        <div className="gambit-review-banner">
          <span className="gambit-review-text">
            {en.reviewingMove.replace('{move}', String(reviewPly + 1))}
          </span>
          <button
            type="button"
            className="gambit-btn-return"
            onClick={handleReturnToGame}
            aria-label={en.returnToGame}
          >
            {en.returnToGame}
          </button>
        </div>
      ) : null}

      <div className="gambit-move-list-content">
        {moves.length === 0 ? (
          <div className="gambit-move-empty">{en.noMovesYet}</div>
        ) : (
          movePairs.map((pair) => {
            const isWhiteActive = activePly === pair.white.ply;
            const isBlackActive = pair.black && activePly === pair.black.ply;

            return (
              <div key={pair.moveNumber} className="gambit-move-row">
                <span className="gambit-move-number">{pair.moveNumber}.</span>
                <button
                  type="button"
                  className={`gambit-move-btn ${isWhiteActive ? (isReviewing ? 'gambit-move-reviewing' : 'gambit-move-active') : ''}`}
                  onClick={() => setReviewPly(pair.white.ply)}
                  aria-label={`${pair.moveNumber}. ${pair.white.san}`}
                >
                  {pair.white.san}
                </button>
                {pair.black ? (
                  <button
                    type="button"
                    className={`gambit-move-btn ${isBlackActive ? (isReviewing ? 'gambit-move-reviewing' : 'gambit-move-active') : ''}`}
                    onClick={() => setReviewPly(pair.black!.ply)}
                    aria-label={`${pair.moveNumber}... ${pair.black.san}`}
                  >
                    {pair.black.san}
                  </button>
                ) : (
                  <span />
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="gambit-move-panel-actions">
        <button
          type="button"
          className="gambit-pgn-btn"
          onClick={handleCopyPgn}
          disabled={moves.length === 0}
          aria-label={en.copyPgn}
        >
          {en.copyPgn}
        </button>
        <button
          type="button"
          className="gambit-pgn-btn"
          onClick={handleDownloadPgn}
          disabled={moves.length === 0}
          aria-label={en.downloadPgn}
        >
          {en.downloadPgn}
        </button>
      </div>
    </aside>
  );
}

export default MoveListPanel;

