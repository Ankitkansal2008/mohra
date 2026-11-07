import type React from 'react';
import { en } from '../../copy/en.ts';
import { getResultExplanation } from '../../game/selectors.ts';
import { useGameStore } from '../../game/store.ts';
import type { GameStatus, Side } from '../../game/types.ts';
import { track } from '../../lib/analytics.ts';
import './ResultDialog.css';

export interface ResultDialogProps {
  readonly status: GameStatus;
  readonly winner: Side | null;
  readonly fen?: string;
  readonly className?: string;
  readonly onRematch?: () => void;
  readonly onReviewMoves?: () => void;
  readonly onCopyPgn?: () => void;
  readonly onShare?: () => void;
}

export function ResultDialog({
  status,
  winner,
  fen,
  className = '',
  onRematch,
  onReviewMoves,
  onCopyPgn,
  onShare,
}: ResultDialogProps): React.JSX.Element | null {
  const movesCount = useGameStore((s) => s.game.moves.length);
  // Pure explanation helper handles copy formatting for all terminal outcomes.
  const explanation = getResultExplanation(status, winner, fen);
  if (!explanation) {
    return null;
  }

  const handleRematch = (): void => {
    track('new_game', { from: 'result_panel' });
    if (onRematch) {
      onRematch();
    } else {
      useGameStore.getState().rematch();
    }
  };

  const handleReviewMoves = (): void => {
    if (onReviewMoves) {
      onReviewMoves();
      return;
    }
    const moves = useGameStore.getState().game.moves;
    if (moves.length > 0) {
      useGameStore.getState().setReviewPly(moves.length - 1);
    }
  };

  const handleCopyPgn = (): void => {
    if (onCopyPgn) {
      onCopyPgn();
      return;
    }
    const state = useGameStore.getState();
    const pgnText = state.game.pgn;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(pgnText).catch(() => {});
    }
    state.showToast(en.pgnCopied);
  };

  const handleShare = (): void => {
    track('share', { from: 'result_panel' });
    if (onShare) {
      onShare();
      return;
    }
    const shareUrl = en.shareUrl;
    const shareText = `${en.shareText} ${shareUrl}`;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        navigator
          .share({
            text: shareText,
            url: shareUrl,
          })
          .catch(() => {});
      } catch {
        // Suppress any synchronous exceptions from Web Share API.
      }
    } else {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(shareUrl).catch(() => {});
      }
      useGameStore.getState().showToast(en.linkCopied);
    }
  };

  const isReviewDisabled = movesCount === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-dialog-headline"
      aria-describedby={explanation.detail ? 'result-dialog-detail' : undefined}
      className={`gambit-result-dialog ${className}`.trim()}
    >
      <h2 id="result-dialog-headline" className="gambit-result-dialog-headline">
        {explanation.headline}
      </h2>
      {explanation.detail ? (
        <p id="result-dialog-detail" className="gambit-result-dialog-detail">
          {explanation.detail}
        </p>
      ) : null}
      <div className="gambit-result-dialog-actions">
        <button
          type="button"
          className="gambit-result-dialog-btn gambit-result-dialog-btn-primary"
          onClick={handleRematch}
        >
          {en.rematch}
        </button>
        <button
          type="button"
          className="gambit-result-dialog-btn"
          disabled={isReviewDisabled}
          onClick={handleReviewMoves}
          title={isReviewDisabled ? en.reviewMovesDisabled : en.reviewMoves}
          aria-label={isReviewDisabled ? en.reviewMovesDisabled : en.reviewMoves}
        >
          {en.reviewMoves}
        </button>
        <button
          type="button"
          className="gambit-result-dialog-btn"
          onClick={handleCopyPgn}
        >
          {en.copyPgn}
        </button>
        <button
          type="button"
          className="gambit-result-dialog-btn"
          onClick={handleShare}
        >
          {en.share}
        </button>
      </div>
    </div>
  );
}

export default ResultDialog;
