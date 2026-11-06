import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { Header } from '../../src/components/Header/Header.tsx';
import { en } from '../../src/copy/en.ts';
import { useGameStore } from '../../src/game/store.ts';

describe('Header component', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('renders Header with brand, New game button, and settings button when callback provided', () => {
    const html = renderToStaticMarkup(
      React.createElement(Header, {
        onOpenSettings: () => {},
        onNewGame: () => {},
      }),
    );

    expect(html).toContain('class="gambit-header"');
    expect(html).toContain(en.gambit);
    expect(html).toContain(en.newGame);
    expect(html).toContain(en.settings);
  });

  it('never renders any testing-only FEN loader control anywhere in desktop or mobile UI', () => {
    const html = renderToStaticMarkup(
      React.createElement(Header, {
        onOpenSettings: () => {},
        onNewGame: () => {},
      }),
    );

    expect(html).not.toContain('fen-loader');
    expect(html).not.toContain('Load FEN');
    expect(html).not.toContain('Paste FEN');
    expect(html).not.toContain('load-fen-input');
  });

  it('renders New game button with accessible label and semantic button element', () => {
    const html = renderToStaticMarkup(
      React.createElement(Header, {
        onNewGame: () => {},
      }),
    );

    expect(html).toContain('type="button"');
    expect(html).toContain(`aria-label="${en.newGame}"`);
    expect(html).toContain(en.newGame);
  });
});
