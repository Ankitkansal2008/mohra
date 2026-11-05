import type React from 'react';
import { en } from '../../copy/en.ts';
import { useGameStore } from '../../game/store.ts';
import './EngineBanner.css';

export interface EngineBannerProps {
  readonly className?: string;
}

// Inline fallback banner when Stockfish engine worker fails to load.
export function EngineBanner({ className = '' }: EngineBannerProps): React.JSX.Element | null {
  const engineFailed = useGameStore((s) => s.engineFailed);

  if (!engineFailed) {
    return null;
  }

  return (
    <div className={`gambit-engine-banner ${className}`.trim()} role="alert">
      <span>{en.engineFailed}</span>
    </div>
  );
}

export default EngineBanner;
