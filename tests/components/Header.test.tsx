import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { FenLoader } from '../../src/components/Header/FenLoader.tsx';
import { Header } from '../../src/components/Header/Header.tsx';
import { en } from '../../src/copy/en.ts';
import { useGameStore } from '../../src/game/store.ts';

describe('Header and FenLoader component', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('renders Header with FenLoader input labelled "Load FEN" in development', () => {
    const html = renderToStaticMarkup(React.createElement(Header));

    expect(html).toContain('class="gambit-header"');
    expect(html).toContain('class="fen-loader-form"');
    expect(html).toContain('for="load-fen-input"');
    expect(html).toContain(en.loadFen);
    expect(html).toContain('aria-label="Load FEN"');
    expect(html).toContain('type="submit"');
  });

  it('renders small input with placeholder and accessible attributes', () => {
    const html = renderToStaticMarkup(React.createElement(FenLoader));

    expect(html).toContain('id="load-fen-input"');
    expect(html).toContain('placeholder="Paste FEN..."');
    expect(html).toContain('class="fen-loader-input"');
    expect(html).toContain('class="fen-loader-button"');
  });
});
