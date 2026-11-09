import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/App.tsx';
import { en } from '../../src/copy/en.ts';
import { useGameStore } from '../../src/game/store.ts';

function renderApp(initialPath = '/'): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App component and routing', () => {
  it('renders Home page on root "/" with hero CTA and static board card', () => {
    const html = renderApp('/');

    expect(html).toContain('class="home-hero"');
    expect(html).toContain(en.homeHeading);
    expect(html).toContain(en.playNow);
    expect(html).toContain('data-testid="hero-play-cta"');
    expect(html).toContain('data-testid="hero-board-card"');
  });

  it('/play shows the setup panel with no board until Start', () => {
    useGameStore.getState().resetGame();
    const html = renderApp('/play');

    expect(html).toContain('class="board-container setup-mode"');
    expect(html).toContain('gambit-setup-inline-card');
    expect(html).toContain(en.newGame);
    expect(html).toContain(en.start);
    expect(html).not.toContain('class="gambit-board-wrapper"');
  });

  it('mounts BoardView inside centered board-container with starting position once game started', () => {
    useGameStore.getState().startNewGame();
    const html = renderApp('/play');

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

  it('renders turn indicators above and below board with correct player names when playing', () => {
    useGameStore.getState().startNewGame();
    // Computer mode: Top is Mohra (Black), Bottom is You (White)
    const htmlComputer = renderApp('/play');
    expect(htmlComputer).toContain('data-testid="turn-indicator-top"');
    expect(htmlComputer).toContain('data-testid="turn-indicator-bottom"');
    expect(htmlComputer).toContain('Mohra');
    expect(htmlComputer).toContain('You');
  });

  it('renders move list panel with initial empty state when playing', () => {
    useGameStore.getState().startNewGame();
    const html = renderApp('/play');
    expect(html).toContain('class="gambit-move-panel"');
    expect(html).toContain('No moves yet. White to play.');
  });

  it('renders version marker footer below board with v1.4.0 and build date', () => {
    const html = renderApp('/');
    expect(html).toContain('class="gambit-footer"');
    expect(html).toContain('v1.4.0');
  });
});
