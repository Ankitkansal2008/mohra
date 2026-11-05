import type React from 'react';
import { en } from '../../copy/en.ts';
import { useGameStore } from '../../game/store.ts';
import './ThinkingIndicator.css';

export interface ThinkingIndicatorProps {
  readonly className?: string;
}

// Fixed-height indicator slot so nothing shifts during search.
export function ThinkingIndicator({ className = '' }: ThinkingIndicatorProps): React.JSX.Element {
  const isThinking = useGameStore((s) => s.isThinking);

  return (
    <div
      className={`gambit-thinking-slot ${className}`.trim()}
      aria-live="polite"
      aria-atomic="true"
    >
      {isThinking ? (
        <div className="gambit-thinking-content" role="status">
          <span className="gambit-thinking-dots" aria-hidden="true">
            <span className="gambit-thinking-dot" />
            <span className="gambit-thinking-dot" />
            <span className="gambit-thinking-dot" />
          </span>
          <span>{en.thinking}</span>
        </div>
      ) : null}
    </div>
  );
}

export default ThinkingIndicator;
