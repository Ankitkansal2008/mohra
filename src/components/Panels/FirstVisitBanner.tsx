import React, { useState } from 'react';
import { en } from '../../copy/en.ts';
import { AppLink } from '../Common/AppLink.tsx';
import './FirstVisitBanner.css';

const FIRST_VISIT_STORAGE_KEY = 'mohra_first_visit_dismissed';

export function FirstVisitBanner(): React.JSX.Element | null {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(FIRST_VISIT_STORAGE_KEY) === 'true';
      }
    } catch {}
    return false;
  });

  if (isDismissed) {
    return null;
  }

  const handleDismiss = (): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(FIRST_VISIT_STORAGE_KEY, 'true');
      }
    } catch {}
    setIsDismissed(true);
  };

  return (
    <div className="gambit-first-visit-banner" role="region" aria-label={en.firstVisitDismiss}>
      <div className="gambit-first-visit-content">
        <span>{en.firstVisitText}</span>
        <AppLink to="/how-to-play" className="gambit-first-visit-link">
          {en.firstVisitHowToPlay}
        </AppLink>
      </div>
      <button
        type="button"
        className="gambit-first-visit-close"
        onClick={handleDismiss}
        aria-label={en.firstVisitDismiss}
      >
        ×
      </button>
    </div>
  );
}

export default FirstVisitBanner;

