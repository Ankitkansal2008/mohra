import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../src/App.tsx';
import { useGameStore } from '../../src/game/store.ts';

describe('Result dialog in game view', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('renders result panel with "Checkmate. White wins." when store is in checkmate state', () => {
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        status: 'checkmate',
        winner: 'w',
      },
    });

    const html = renderToStaticMarkup(React.createElement(App));
    expect(html).toContain('Checkmate. White wins.');
    expect(html).toContain('Black has no legal move and the king is attacked.');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('gambit-result-dialog');
  });

  it('renders result panel with "Checkmate. Black wins." when Black wins by checkmate', () => {
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        status: 'checkmate',
        winner: 'b',
      },
    });

    const html = renderToStaticMarkup(React.createElement(App));
    expect(html).toContain('Checkmate. Black wins.');
    expect(html).toContain('White has no legal move and the king is attacked.');
  });

  it('renders stalemate panel when game is in stalemate', () => {
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        status: 'stalemate',
        winner: null,
      },
    });

    const html = renderToStaticMarkup(React.createElement(App));
    expect(html).toContain("Stalemate. It&#x27;s a draw.");
  });

  it('does not render result panel during active play', () => {
    const html = renderToStaticMarkup(React.createElement(App));
    expect(html).not.toContain('gambit-result-dialog');
    expect(html).not.toContain('Checkmate');
  });
});
