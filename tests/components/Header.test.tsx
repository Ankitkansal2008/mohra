import fs from 'node:fs';
import path from 'node:path';
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
    expect(html).toContain(en.mohra);
    expect(html).toContain(en.newGame);
    expect(html).toContain(en.settings);
  });

  it('renders mark and wordmark "Mohra" in header', () => {
    const html = renderToStaticMarkup(React.createElement(Header));
    expect(html).toContain('class="gambit-brand-mark"');
    expect(html).toContain('src="/favicon.svg"');
    expect(html).toContain('width="24"');
    expect(html).toContain('height="24"');
    expect(html).toContain('Mohra');
  });

  it('asserts document title is "Mohra" in index.html', () => {
    const indexHtml = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf-8');
    expect(indexHtml).toContain('<title>Mohra</title>');
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
