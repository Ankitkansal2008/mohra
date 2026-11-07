import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../src/App.tsx';
import { en } from '../../src/copy/en.ts';
import { useGameStore } from '../../src/game/store.ts';

describe('Result dialog placement and mobile responsive checks', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('renders result panel below the board in place of controls on checkmate (Ra8#)', () => {
    // Setup position 6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1
    const store = useGameStore.getState();
    store.loadFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');

    // Play Ra8#
    const moved = useGameStore.getState().attemptMove('a1', 'a8');
    expect(moved).toBe(true);

    const gameState = useGameStore.getState().game;
    expect(gameState.status).toBe('checkmate');
    expect(gameState.winner).toBe('w');

    const html = renderToStaticMarkup(React.createElement(App));

    // Result dialog must be rendered
    expect(html).toContain('gambit-result-dialog');
    expect(html).toContain('Checkmate. White wins.');
    expect(html).toContain(en.rematch);
    expect(html).toContain(en.reviewMoves);
    expect(html).toContain(en.copyPgn);
    expect(html).toContain(en.share);

    // Controls row must be replaced by ResultDialog
    expect(html).not.toContain('class="gambit-controls"');

    // The result dialog must NOT be rendered inside the board wrapper
    const boardWrapperStart = html.indexOf('class="gambit-board-wrapper');
    expect(boardWrapperStart).toBeGreaterThan(-1);

    // End of board wrapper is marked by its closing div before thinking slot / result dialog
    const resultDialogPos = html.indexOf('class="gambit-result-dialog');
    expect(resultDialogPos).toBeGreaterThan(-1);

    // Board wrapper contains the white king on g1 and white rook on a8
    expect(html).toContain('id="chessboard-piece-wK-g1"');
    expect(html).toContain('id="chessboard-piece-wR-a8"');

    // Result dialog is rendered after the board wrapper in the DOM tree (below the board)
    expect(resultDialogPos).toBeGreaterThan(boardWrapperStart);

    // The board wrapper keeps its full aspect-ratio and height sizing
    expect(html).toContain('aspect-ratio:1/1');
    expect(html).toContain('width:clamp(320px, 100%, 100%)');
  });

  it('verifies that no square is covered: board wrapper does not contain result dialog', () => {
    useGameStore.getState().loadFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    useGameStore.getState().attemptMove('a1', 'a8');

    const html = renderToStaticMarkup(React.createElement(App));

    // Extract content between gambit-board-wrapper and the next sibling
    const boardWrapperHtml = html.slice(
      html.indexOf('gambit-board-wrapper'),
      html.indexOf('gambit-thinking-slot'),
    );

    // Result dialog is strictly outside the board wrapper
    expect(boardWrapperHtml).not.toContain('gambit-result-dialog');
    expect(boardWrapperHtml).toContain('chessboard-square-g1');
  });

  it('renders Moves button in controls and collapses header on mobile', () => {
    const html = renderToStaticMarkup(React.createElement(App));

    // Header has mobile trigger button
    expect(html).toContain('gambit-header-mobile-trigger');
    expect(html).toContain('gambit-header-menu-btn');
    expect(html).toContain(en.menu);

    // Controls has Moves button
    expect(html).toContain('gambit-control-moves-btn');
    expect(html).toContain(en.moves);

    // Sidebar bottom sheet exists with aria-label
    expect(html).toContain('class="sidebar-layout "');
    expect(html).toContain(`aria-label="${en.moves}"`);
  });
});

