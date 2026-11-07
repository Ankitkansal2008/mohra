import React, { useEffect, useRef, useState } from 'react';
import { en } from '../../copy/en.ts';
import { canUndo, isGameOver } from '../../game/selectors.ts';
import { useGameStore } from '../../game/store.ts';
import { useFocusTrap } from '../useFocusTrap.ts';
import './Controls.css';

export interface ControlsProps {
  readonly className?: string;
  readonly onUndo?: () => void;
  readonly onFlip?: () => void;
  readonly onResign?: () => void;
  readonly onToggleMoves?: () => void;
  readonly isMovesOpen?: boolean;
}

export function Controls({
  className = '',
  onUndo,
  onFlip,
  onResign,
  onToggleMoves,
  isMovesOpen,
}: ControlsProps): React.JSX.Element {
  const game = useGameStore((s) => s.game);
  const undo = useGameStore((s) => s.undo);
  const toggleFlip = useGameStore((s) => s.toggleFlip);
  const resignGame = useGameStore((s) => s.resignGame);

  const [isConfirmingResign, setIsConfirmingResign] = useState(false);
  const resignDialogRef = useRef<HTMLDivElement>(null);

  const handleCancelResign = (): void => {
    setIsConfirmingResign(false);
  };

  useFocusTrap(resignDialogRef, handleCancelResign, isConfirmingResign);

  const isUndoDisabled = !canUndo(game);
  const isGameOverState = isGameOver(game.status);

  // Support pressing 'f' or 'F' to flip the board (UI/UX Section 9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        if (onFlip) onFlip();
        else toggleFlip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFlip, toggleFlip]);

  const handleUndo = (): void => {
    if (onUndo) {
      onUndo();
    } else {
      undo();
    }
  };

  const handleFlip = (): void => {
    if (onFlip) {
      onFlip();
    } else {
      toggleFlip();
    }
  };

  const handleOpenResign = (): void => {
    if (isGameOverState) return;
    setIsConfirmingResign(true);
  };

  const handleConfirmResign = (): void => {
    setIsConfirmingResign(false);
    if (onResign) {
      onResign();
    } else {
      resignGame();
    }
  };

  const undoTitle = isUndoDisabled
    ? en.undoStart
    : game.mode === 'computer'
      ? en.undoComputer
      : en.undo;

  return (
    <>
      <div className={`gambit-controls ${className}`.trim()}>
        <button
          type="button"
          className="gambit-control-btn"
          onClick={handleUndo}
          disabled={isUndoDisabled}
          title={undoTitle}
          aria-label={isUndoDisabled ? `${en.undo} - ${en.undoStart}` : en.undo}
        >
          {en.undo}
        </button>

        <button
          type="button"
          className="gambit-control-btn"
          onClick={handleFlip}
          title={en.flip}
          aria-label={en.flip}
        >
          {en.flip}
        </button>

        <button
          type="button"
          className="gambit-control-btn gambit-control-btn-danger"
          onClick={handleOpenResign}
          disabled={isGameOverState}
          title={en.resign}
          aria-label={en.resign}
        >
          {en.resign}
        </button>

        {onToggleMoves ? (
          <button
            type="button"
            className={`gambit-control-btn gambit-control-moves-btn ${isMovesOpen ? 'gambit-control-btn-active' : ''}`}
            onClick={onToggleMoves}
            title={en.moves}
            aria-label={en.moves}
            aria-expanded={isMovesOpen}
          >
            {en.moves}
          </button>
        ) : null}
      </div>

      {isConfirmingResign ? (
        <div
          className="gambit-resign-overlay"
          role="presentation"
          onClick={handleCancelResign}
        >
          <div
            ref={resignDialogRef}
            className="gambit-resign-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resign-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="resign-dialog-title" className="gambit-resign-dialog-title">
              {en.resignConfirm}
            </h3>
            <div className="gambit-resign-dialog-actions">
              <button
                type="button"
                className="gambit-resign-btn-cancel"
                onClick={handleCancelResign}
              >
                {en.cancel}
              </button>
              <button
                type="button"
                className="gambit-resign-btn-confirm"
                onClick={handleConfirmResign}
              >
                {en.resignConfirmAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default Controls;

