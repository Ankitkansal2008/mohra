import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BoardView } from '../../src/components/Board/BoardView.tsx';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function parseSquares(html: string): Map<string, string> {
  const squares = new Map<string, string>();
  // Match elements that carry data-square="<coord>" and extract their style attribute
  const regex = /<div[^>]*data-square="([a-h][1-8])"[^>]*style="([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const squareId = match[1];
    const style = match[2];
    squares.set(squareId, style);
  }

  // Also support matching when style appears before data-square in DOM serialization
  if (squares.size === 0) {
    const fallbackRegex = /<div[^>]*style="([^"]*)"[^>]*data-square="([a-h][1-8])"/g;
    while ((match = fallbackRegex.exec(html)) !== null) {
      const style = match[1];
      const squareId = match[2];
      squares.set(squareId, style);
    }
  }

  return squares;
}

describe('BoardView component', () => {
  it('renders starting FEN with 64 squares and correct colours at a1 and h1', () => {
    const html = renderToStaticMarkup(
      React.createElement(BoardView, { fen: STARTING_FEN }),
    );

    const squares = parseSquares(html);

    // Chess board must have exactly 64 squares
    expect(squares.size).toBe(64);

    // a1 is a dark square (#779556 in tokens)
    const a1Style = squares.get('a1');
    expect(a1Style).toBeDefined();
    expect(a1Style).toContain('#779556');

    // h1 is a light square (#EBECD0 in tokens)
    const h1Style = squares.get('h1');
    expect(h1Style).toBeDefined();
    expect(h1Style).toContain('#EBECD0');
  });

  it('renders alternative slate theme with correct colours at a1 and h1', () => {
    const html = renderToStaticMarkup(
      React.createElement(BoardView, {
        fen: STARTING_FEN,
        theme: 'slate',
      }),
    );

    const squares = parseSquares(html);
    expect(squares.size).toBe(64);

    // Under slate theme: a1 dark is #8CA2AD, h1 light is #DEE3E6
    const a1Style = squares.get('a1');
    expect(a1Style).toBeDefined();
    expect(a1Style).toContain('#8CA2AD');

    const h1Style = squares.get('h1');
    expect(h1Style).toBeDefined();
    expect(h1Style).toContain('#DEE3E6');
  });

  it('enforces pure CSS square aspect-ratio and clamp sizing with disabled pointer events', () => {
    const html = renderToStaticMarkup(
      React.createElement(BoardView, { fen: STARTING_FEN }),
    );

    expect(html).toContain('gambit-board-wrapper');
    expect(html).toContain('aspect-ratio:1/1');
    expect(html).toContain('width:clamp(320px, 100%, 100%)');
    expect(html).toContain('pointer-events:none');
  });

  it('accepts and applies square-style channels for selected, lastMove, legalTargets and check', () => {
    const html = renderToStaticMarkup(
      React.createElement(BoardView, {
        fen: STARTING_FEN,
        selected: 'e2',
        lastMove: ['e2', 'e4'],
        legalTargets: ['e3', 'e4'],
        check: 'e1',
      }),
    );

    // Selected square e2 receives selection styling
    expect(html).toContain('var(--board-selected');
    // Last move squares receive last-move styling
    expect(html).toContain('var(--board-last-move');
    // Check square receives radial check highlight
    expect(html).toContain('var(--board-check');
    // Legal destinations receive legal target styling
    expect(html).toContain('var(--board-legal-dot');
  });
});
