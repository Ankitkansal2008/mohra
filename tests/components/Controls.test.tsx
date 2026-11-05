import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Controls } from '../../src/components/Panels/Controls.tsx';
import { en } from '../../src/copy/en.ts';
import { useGameStore } from '../../src/game/store.ts';

describe('Controls component', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('renders Undo, Flip, and Resign buttons', () => {
    const html = renderToStaticMarkup(React.createElement(Controls));

    expect(html).toContain(en.undo);
    expect(html).toContain(en.flip);
    expect(html).toContain(en.resign);
  });

  it('disables Undo button with "Nothing to undo yet." when there are no moves', () => {
    const html = renderToStaticMarkup(React.createElement(Controls));

    expect(html).toContain('disabled=""');
    expect(html).toContain(`title="${en.undoStart}"`);
    expect(html).toContain(`aria-label="${en.undo} - ${en.undoStart}"`);
  });

  it('enables Undo button after a move has been played', () => {
    useGameStore.getState().attemptMove('e2', 'e4');
    const html = renderToStaticMarkup(React.createElement(Controls));

    // In local mode after 1 move, Undo is enabled
    expect(html).not.toContain(`title="${en.undoStart}"`);
  });

  it('renders enabled buttons with callbacks attached', () => {
    const onUndo = vi.fn();
    const onFlip = vi.fn();
    const onResign = vi.fn();

    useGameStore.getState().attemptMove('e2', 'e4');

    const html = renderToStaticMarkup(
      React.createElement(Controls, { onUndo, onFlip, onResign }),
    );
    expect(html).toContain(en.undo);
    expect(html).toContain(en.flip);
    expect(html).toContain(en.resign);
    expect(html).not.toContain('disabled=""');
  });

  it('disables Resign button when game status is terminal', () => {
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        status: 'checkmate',
        winner: 'w',
      },
    });

    const html = renderToStaticMarkup(React.createElement(Controls));
    // Both undo (no moves) and resign (game over) disabled
    expect(html).toContain(`title="${en.resign}"`);
  });
});
