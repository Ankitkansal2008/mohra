import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/App.tsx';

describe('App component', () => {
  it('mounts BoardView inside centered board-container with starting position', () => {
    const html = renderToStaticMarkup(React.createElement(App));

    // Centered container
    expect(html).toContain('class="board-container"');

    // Board wrapper and starting 64 squares
    expect(html).toContain('gambit-board-wrapper');
    const squareMatches = html.match(/data-square="[a-h][1-8]"/g) || [];
    expect(squareMatches.length).toBe(64);

    // Initial 32 pieces present
    const pieceMatches = html.match(/data-piece="[wb][KQRBNP]"/g) || [];
    expect(pieceMatches.length).toBe(32);

    // Key starting pieces in place
    expect(html).toContain('chessboard-piece-wQ-d1');
    expect(html).toContain('chessboard-piece-wK-e1');
    expect(html).toContain('chessboard-piece-bQ-d8');
    expect(html).toContain('chessboard-piece-bK-e8');
  });
});

