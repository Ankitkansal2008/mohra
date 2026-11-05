import React, { useState } from 'react';
import { en } from '../../copy/en.ts';
import { useGameStore } from '../../game/store.ts';

export function FenLoader(): React.JSX.Element | null {
  const [fen, setFen] = useState('');
  const loadFen = useGameStore((s) => s.loadFen);

  // Never render in production bundles to avoid exposing dev diagnostics.
  if (!import.meta.env.DEV) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    loadFen(fen);
  };

  return (
    <form onSubmit={handleSubmit} className="fen-loader-form">
      <label htmlFor="load-fen-input" className="fen-loader-label">
        {en.loadFen}
      </label>
      <input
        id="load-fen-input"
        name="fen"
        type="text"
        value={fen}
        onChange={(e) => setFen(e.target.value)}
        placeholder={en.loadFenPlaceholder}
        className="fen-loader-input"
        aria-label={en.loadFen}
        autoComplete="off"
        spellCheck={false}
      />
      <button type="submit" className="fen-loader-button">
        {en.loadFenSubmit}
      </button>
    </form>
  );
}

export default FenLoader;
