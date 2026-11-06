import React from 'react';
import { en } from '../../copy/en.ts';
import { useGameStore } from '../../game/store.ts';
import type { GameState } from '../../game/types.ts';
import { clearSavedGame, formatResumeLabel } from '../../lib/persist.ts';
import './ResumeBanner.css';

export interface ResumeBannerProps {
  readonly savedGame: GameState;
  readonly onDismiss: () => void;
  readonly onResume?: () => void;
  readonly onDiscard?: () => void;
}

export function ResumeBanner({
  savedGame,
  onDismiss,
  onResume,
  onDiscard,
}: ResumeBannerProps): React.JSX.Element {
  const label = formatResumeLabel(savedGame);

  const handleResume = (): void => {
    if (onResume) {
      onResume();
    } else {
      useGameStore.getState().restoreGame(savedGame);
    }
    onDismiss();
  };

  const handleDiscard = (): void => {
    if (onDiscard) {
      onDiscard();
    } else {
      clearSavedGame();
      useGameStore.getState().resetGame();
    }
    onDismiss();
  };

  return (
    <div
      className="gambit-resume-banner"
      role="region"
      aria-label={label}
    >
      <span className="gambit-resume-label">{label}</span>
      <div className="gambit-resume-actions">
        <button
          type="button"
          className="gambit-btn-resume"
          onClick={handleResume}
          aria-label={en.resume}
        >
          {en.resume}
        </button>
        <button
          type="button"
          className="gambit-btn-discard"
          onClick={handleDiscard}
          aria-label={en.discard}
        >
          {en.discard}
        </button>
      </div>
    </div>
  );
}

export default ResumeBanner;
