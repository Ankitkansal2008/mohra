import type React from 'react';
import { getResultExplanation } from '../../game/selectors.ts';
import type { GameStatus, Side } from '../../game/types.ts';
import './ResultDialog.css';

export interface ResultDialogProps {
  readonly status: GameStatus;
  readonly winner: Side | null;
  readonly fen?: string;
  readonly className?: string;
}

export function ResultDialog({
  status,
  winner,
  fen,
  className = '',
}: ResultDialogProps): React.JSX.Element | null {
  // Pure explanation helper handles copy formatting for all terminal outcomes.
  const explanation = getResultExplanation(status, winner, fen);
  if (!explanation) {
    return null;
  }

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
    </div>
  );
}

export default ResultDialog;
