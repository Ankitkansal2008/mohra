import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BoardView } from '../../src/components/Board/BoardView.tsx';
import { PromotionOverlay } from '../../src/components/Board/PromotionOverlay.tsx';
import { Toast } from '../../src/components/ui/Toast.tsx';
import { en } from '../../src/copy/en.ts';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('Board interaction visual tokens and overlays', () => {
  it('differentiates empty squares with 26% dot and occupied squares with 88% ring', () => {
    // In STARTING_FEN, e3 is empty, but e7 is occupied by black pawn
    const html = renderToStaticMarkup(
      React.createElement(BoardView, {
        fen: STARTING_FEN,
        legalTargets: ['e3', 'e7'],
      }),
    );

    // Empty square target contains legal dot
    expect(html).toContain('radial-gradient(circle, var(--board-legal-dot, rgba(20, 20, 20, 0.16)) 26%');
    // Occupied target contains hollow ring at 88%
    expect(html).toContain('radial-gradient(circle, transparent 35%, var(--board-legal-dot, rgba(20, 20, 20, 0.16)) 35%, var(--board-legal-dot, rgba(20, 20, 20, 0.16)) 44%');
  });

  it('renders Toast with alert role and exact copy from en.ts', () => {
    const html = renderToStaticMarkup(
      React.createElement(Toast, {
        message: en.rejectionPinned,
      }),
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('That piece is pinned - moving it would expose your king.');
  });

  it('renders PromotionOverlay with 4 choices and 64px targets', () => {
    const html = renderToStaticMarkup(
      React.createElement(PromotionOverlay, {
        toSquare: 'a8',
        side: 'w',
        boardOrientation: 'white',
        onSelect: () => {},
        onCancel: () => {},
      }),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="Pawn promotion choices"');
    expect(html).toContain('aria-label="Promote to Queen"');
    expect(html).toContain('aria-label="Promote to Knight"');
    expect(html).toContain('aria-label="Promote to Rook"');
    expect(html).toContain('aria-label="Promote to Bishop"');
    expect(html).toContain('min-width:64px');
    expect(html).toContain('min-height:64px');
  });
});
