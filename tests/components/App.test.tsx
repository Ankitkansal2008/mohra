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

  it('renders turn indicators above and below board with correct player names', () => {
    // Computer mode: Top is Mohra (Black), Bottom is You (White)
    const htmlComputer = renderToStaticMarkup(React.createElement(App));
    expect(htmlComputer).toContain('data-testid="turn-indicator-top"');
    expect(htmlComputer).toContain('data-testid="turn-indicator-bottom"');
    expect(htmlComputer).toContain('Mohra');
    expect(htmlComputer).toContain('You');
  });

  it('renders move list panel with initial empty state', () => {
    const html = renderToStaticMarkup(React.createElement(App));
    expect(html).toContain('class="gambit-move-panel"');
    expect(html).toContain('No moves yet. White to play.');
  });

  it('renders version marker footer below board with v1.2.0 and build date', () => {
    const html = renderToStaticMarkup(React.createElement(App));
    expect(html).toContain('class="gambit-footer"');
    expect(html).toContain('v1.2.0');
  });
});

