import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/App.tsx';
import { BoardCoordinates } from '../../src/components/Board/BoardCoordinates.tsx';
import { BoardScreenReaderGrid } from '../../src/components/Board/BoardScreenReaderGrid.tsx';
import { BoardView } from '../../src/components/Board/BoardView.tsx';
import { buildSquareStyles } from '../../src/components/Board/boardStyles.ts';
import { en } from '../../src/copy/en.ts';
import { formatLiveMoveAnnouncement, formatMoveAnnouncement } from '../../src/lib/moveAnnouncement.ts';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('Board Accessibility, Coordinates, Keyboard Play & Responsive Pass', () => {
  it('renders coordinates outside the board: files a-h under and ranks 1-8 to the left', () => {
    const html = renderToStaticMarkup(
      React.createElement(BoardCoordinates, {
        boardOrientation: 'white',
        showCoords: true,
        children: React.createElement('div', { id: 'test-board' }),
      }),
    );

    expect(html).toContain('gambit-coords-ranks');
    expect(html).toContain('gambit-coords-files');
    // Ranks 1 to 8 present
    for (let r = 1; r <= 8; r++) {
      expect(html).toContain(`>${r}</span>`);
    }
    // Files a to h present
    for (const f of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      expect(html).toContain(`>${f}</span>`);
    }
    // Board is rendered inside core slot
    expect(html).toContain('id="test-board"');
  });

  it('flips coordinates outside the board when orientation is black', () => {
    const html = renderToStaticMarkup(
      React.createElement(BoardCoordinates, {
        boardOrientation: 'black',
        showCoords: true,
        children: React.createElement('div', { id: 'test-board' }),
      }),
    );

    // When flipped: rank 1 is at top of list, h is first file
    const rankMatch = html.match(/gambit-coord-rank-label">([1-8])<\/span>/g);
    expect(rankMatch).toBeDefined();
    expect(rankMatch![0]).toContain('1');
    expect(rankMatch![7]).toContain('8');

    const fileMatch = html.match(/gambit-coord-file-label">([a-h])<\/span>/g);
    expect(fileMatch).toBeDefined();
    expect(fileMatch![0]).toContain('h');
    expect(fileMatch![7]).toContain('a');
  });

  it('board is one tab stop with role grid and keyboard navigation attributes', () => {
    const html = renderToStaticMarkup(
      React.createElement(BoardView, { fen: STARTING_FEN }),
    );

    expect(html).toContain('tabindex="0"');
    expect(html).toContain('role="grid"');
    expect(html).toContain('aria-rowcount="8"');
    expect(html).toContain('aria-colcount="8"');
    expect(html).toContain(en.boardKeyboardInstructions);
  });

  it('renders 64 gridcells with per-square labels for screen readers', () => {
    const html = renderToStaticMarkup(
      React.createElement(BoardScreenReaderGrid, {
        fen: STARTING_FEN,
        selected: 'e2',
        orientation: 'white',
      }),
    );

    expect(html).toContain('role="gridcell"');
    // e2 has white pawn, selected
    expect(html).toContain('aria-label="e2, white pawn"');
    expect(html).toContain('aria-selected="true"');
    // e4 is empty in start position
    expect(html).toContain('aria-label="e4, empty"');
    expect(html).toContain('aria-selected="false"');
    // e8 has black king
    expect(html).toContain('aria-label="e8, black king"');
  });

  it('announces each move in full via polite live region', () => {
    // Knight move with check per UI/UX Section 9 example
    const announceCheck = formatLiveMoveAnnouncement('White plays Nf3+');
    expect(announceCheck).toBe('White plays knight to f3, check');

    // Checkmate
    const announceMate = formatMoveAnnouncement({
      side: 'w',
      san: 'Qxf7#',
      pieceType: 'q',
      toSquare: 'f7',
      isCheckmate: true,
    });
    expect(announceMate).toBe('White plays queen to f7, checkmate');

    // Kingside castling
    const announceCastle = formatLiveMoveAnnouncement('White plays O-O');
    expect(announceCastle).toBe('White castles kingside');

    // Queenside castling
    const announceCastleQ = formatLiveMoveAnnouncement('Black plays O-O-O');
    expect(announceCastleQ).toBe('Black castles queenside');
  });

  it('applies visible focus ring to cursor square when keyboard focused', () => {
    const styles = buildSquareStyles({
      fen: STARTING_FEN,
      isFocused: true,
      cursorSquare: 'e4',
    });

    expect(styles.e4).toBeDefined();
    expect(styles.e4.outline).toContain('var(--color-focus');
    expect(styles.e4.outlineOffset).toBe('-2px');
  });

  it('mounts App with responsive shell: left-column, board-layout, and sidebar-layout', () => {
    const html = renderToStaticMarkup(React.createElement(App));

    expect(html).toContain('class="app-shell"');
    expect(html).toContain('class="board-container"');
    expect(html).toContain('class="left-column"');
    expect(html).toContain('class="board-layout"');
    expect(html).toContain('class="sidebar-layout');
    expect(html).toContain('class="gambit-move-panel"');
  });
});
