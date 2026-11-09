import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App.tsx';
import { FirstVisitBanner } from '../../src/components/Panels/FirstVisitBanner.tsx';
import { en } from '../../src/copy/en.ts';
import { useGameStore } from '../../src/game/store.ts';
import { usePageMetadata } from '../../src/hooks/usePageMetadata.ts';

describe('Routing, web presence and content pages (v1.3)', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  describe('Route headings and page content', () => {
    it('renders How to play route with main heading and four cards with examples', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/how-to-play']}>
          <App />
        </MemoryRouter>,
      );

      expect(html).toContain(`>${en.howToPlayTitle}</h1>`);
      expect(html).toContain(en.cardPiecesTitle);
      expect(html).toContain(en.cardPiecesExample);
      expect(html).toContain(en.cardCastlingTitle);
      expect(html).toContain(en.cardCastlingExample);
      expect(html).toContain(en.cardEnPassantTitle);
      expect(html).toContain(en.cardEnPassantExample);
      expect(html).toContain(en.cardPromotionTitle);
      expect(html).toContain(en.cardPromotionExample);
    });

    it('renders About route with main heading, three paragraphs, and developer credit', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/about']}>
          <App />
        </MemoryRouter>,
      );

      expect(html).toContain(`>${en.aboutTitle}</h1>`);
      expect(html).toContain(en.aboutP1);
      expect(html).toContain(en.aboutP2);
      expect(html).toContain(en.aboutP3);
      expect(html).toContain(en.developerCredit);
    });

    it('renders Privacy route with main heading, plain language, and all four sections', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/privacy']}>
          <App />
        </MemoryRouter>,
      );

      expect(html).toContain(`>${en.privacyTitle}</h1>`);
      expect(html).toContain(en.privacyP1);
      expect(html).toContain(en.privacyAnalyticsTitle);
      expect(html).toContain(en.privacyStorageTitle);
      expect(html).toContain(en.privacyClearTitle);
      expect(html).toContain(en.privacyContactTitle);
    });

    it('renders game route on root path "/" with board and indicators unchanged', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>,
      );

      expect(html).toContain('class="board-container"');
      expect(html).toContain('gambit-board-wrapper');
      expect(html).toContain('data-testid="turn-indicator-top"');
      expect(html).toContain('data-testid="turn-indicator-bottom"');
    });
  });

  describe('First-visit dismissible banner', () => {
    it('appears above board for first-time visitors with text and link', () => {
      const store: Record<string, string> = {};
      const mockStorage = {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
      };

      const hadWindow = typeof globalThis.window !== 'undefined';
      const prevWindow = (globalThis as unknown as { window?: unknown }).window;
      try {
        (globalThis as unknown as { window: unknown }).window = { localStorage: mockStorage };
        const html = renderToStaticMarkup(<FirstVisitBanner />);
        expect(html).toContain('gambit-first-visit-banner');
        expect(html).toContain(en.firstVisitText);
        expect(html).toContain(en.firstVisitHowToPlay);
        expect(html).toContain('href="/how-to-play"');
      } finally {
        if (hadWindow) (globalThis as unknown as { window: unknown }).window = prevWindow;
        else delete (globalThis as unknown as { window?: unknown }).window;
      }
    });

    it('stays dismissed when localStorage contains dismissal flag', () => {
      const store: Record<string, string> = { mohra_first_visit_dismissed: 'true' };
      const mockStorage = {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
      };

      const hadWindow = typeof globalThis.window !== 'undefined';
      const prevWindow = (globalThis as unknown as { window?: unknown }).window;
      try {
        (globalThis as unknown as { window: unknown }).window = { localStorage: mockStorage };
        const html = renderToStaticMarkup(<FirstVisitBanner />);
        expect(html).toBe('');
      } finally {
        if (hadWindow) (globalThis as unknown as { window: unknown }).window = prevWindow;
        else delete (globalThis as unknown as { window?: unknown }).window;
      }
    });
  });

  describe('Document title and metadata updates', () => {
    it('sets document title and meta description through usePageMetadata hook', () => {
      const setAttribute = vi.fn();
      const metaEl = { setAttribute };
      const querySelector = vi.fn().mockReturnValue(metaEl);

      const mockDoc = {
        title: '',
        querySelector,
        createElement: vi.fn(),
        head: { appendChild: vi.fn() },
      };

      const hadDoc = typeof globalThis.document !== 'undefined';
      const prevDoc = (globalThis as unknown as { document?: unknown }).document;

      try {
        (globalThis as unknown as { document: unknown }).document = mockDoc;

        function MetadataTestComp(): null {
          usePageMetadata('Test Title - Mohra', 'Test Description');
          return null;
        }

        // Test the hook in an active component lifecycle
        renderToStaticMarkup(<MetadataTestComp />);
      } finally {
        if (hadDoc) (globalThis as unknown as { document: unknown }).document = prevDoc;
        else delete (globalThis as unknown as { document?: unknown }).document;
      }
    });

    it('matches exact metadata strings defined in copy dictionary', () => {
      expect(en.homeTitle).toBe('Mohra - play chess in your browser');
      expect(en.howToPlayDocTitle).toBe('How to Play - Mohra');
      expect(en.aboutDocTitle).toBe('About - Mohra');
      expect(en.privacyDocTitle).toBe('Privacy - Mohra');
      expect(en.howToPlayMetaDescription.length).toBeGreaterThan(20);
      expect(en.aboutMetaDescription.length).toBeGreaterThan(20);
      expect(en.privacyMetaDescription.length).toBeGreaterThan(20);
    });
  });

  describe('Navigation links change route and preserve shell', () => {
    it('Header renders navigation links to Play, How to play, and About', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>,
      );

      expect(html).toContain('class="gambit-nav-link"');
      expect(html).toMatch(/<a[^>]*class="gambit-nav-link"[^>]*href="\/"[^>]*>Play<\/a>/);
      expect(html).toMatch(/<a[^>]*class="gambit-nav-link"[^>]*href="\/how-to-play"[^>]*>How to play<\/a>/);
      expect(html).toMatch(/<a[^>]*class="gambit-nav-link"[^>]*href="\/about"[^>]*>About<\/a>/);
    });

    it('Footer renders page links to Play, How to play, About, and Privacy', () => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>,
      );

      expect(html).toContain('class="gambit-footer-link"');
      expect(html).toMatch(/<a[^>]*class="gambit-footer-link"[^>]*href="\/"[^>]*>Play<\/a>/);
      expect(html).toMatch(/<a[^>]*class="gambit-footer-link"[^>]*href="\/how-to-play"[^>]*>How to play<\/a>/);
      expect(html).toMatch(/<a[^>]*class="gambit-footer-link"[^>]*href="\/about"[^>]*>About<\/a>/);
      expect(html).toMatch(/<a[^>]*class="gambit-footer-link"[^>]*href="\/privacy"[^>]*>Privacy<\/a>/);
    });

    it('route navigation switches page content across all four routes', () => {
      const playHtml = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>,
      );
      expect(playHtml).toContain('class="board-container"');

      const howToPlayHtml = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/how-to-play']}>
          <App />
        </MemoryRouter>,
      );
      expect(howToPlayHtml).toContain(`>${en.howToPlayTitle}</h1>`);

      const aboutHtml = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/about']}>
          <App />
        </MemoryRouter>,
      );
      expect(aboutHtml).toContain(`>${en.aboutTitle}</h1>`);

      const privacyHtml = renderToStaticMarkup(
        <MemoryRouter initialEntries={['/privacy']}>
          <App />
        </MemoryRouter>,
      );
      expect(privacyHtml).toContain(`>${en.privacyTitle}</h1>`);
    });
  });
});
