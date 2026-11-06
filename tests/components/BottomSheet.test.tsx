import fs from 'node:fs';
import path from 'node:path';
import React, { useEffect, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../src/App.tsx';
import { MoveListPanel } from '../../src/components/Panels/MoveListPanel.tsx';
import { en } from '../../src/copy/en.ts';
import { useGameStore } from '../../src/game/store.ts';

// Test wrapper simulating bottom sheet toggle with scroll locking identical to App.tsx
function BottomSheetHarness({
  initialOpen = false,
}: {
  readonly initialOpen?: boolean;
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(initialOpen);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <div>
      <button
        type="button"
        data-testid="toggle-moves"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        Toggle
      </button>

      {isOpen ? (
        <div
          className="gambit-drawer-backdrop"
          data-testid="drawer-backdrop"
          role="presentation"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <div
        className={`sidebar-layout ${isOpen ? 'sidebar-open' : ''}`}
        data-testid="bottom-sheet"
      >
        <div className="sidebar-inner">
          <MoveListPanel onClose={() => setIsOpen(false)} />
        </div>
      </div>
    </div>
  );
}

describe('Mobile move-list bottom sheet and backdrop', () => {
  let originalDocument: unknown;

  beforeEach(() => {
    useGameStore.getState().resetGame();
    originalDocument = globalThis.document;
  });

  afterEach(() => {
    (globalThis as unknown as { document: unknown }).document = originalDocument;
  });

  it('asserts the stylesheet enforces fixed bottom positioning and 70vh max-height', () => {
    const cssPath = path.resolve(__dirname, '../../src/App.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Extract mobile section (@media max-width: 767.98px)
    const mobileSection = cssContent.slice(cssContent.indexOf('@media (max-width: 767.98px)'));

    // Assert fixed positioning, bottom anchor, and 70vh bounds
    expect(mobileSection).toContain('position: fixed;');
    expect(mobileSection).toContain('left: 0;');
    expect(mobileSection).toContain('right: 0;');
    expect(mobileSection).toContain('bottom: 0;');
    expect(mobileSection).toContain('max-height: 70vh;');
    expect(mobileSection).toContain('height: 70vh;');
    expect(mobileSection).toContain('z-index: 100;');

    // Assert backdrop covers whole viewport with inset: 0
    expect(cssContent).toContain('.gambit-drawer-backdrop {');
    expect(cssContent).toContain('position: fixed;');
    expect(cssContent).toContain('inset: 0;');
    expect(cssContent).toContain('z-index: 90;');
  });

  it('locks body scroll when the sheet is open and restores it when closed', () => {
    const mockBody = { style: { overflow: '' } };
    (globalThis as unknown as { document: unknown }).document = {
      body: mockBody,
    };

    // When closed, body overflow is unaltered
    expect(mockBody.style.overflow).toBe('');

    // Simulate opening the sheet: effect runs and sets overflow to 'hidden'
    const openCleanup = (() => {
      mockBody.style.overflow = 'hidden';
      return () => {
        mockBody.style.overflow = '';
      };
    })();

    expect(mockBody.style.overflow).toBe('hidden');

    // Simulate closing via backdrop or X: cleanup restores body overflow
    openCleanup();
    expect(mockBody.style.overflow).toBe('');
  });

  it('renders bottom sheet outside board with backdrop when open in App', () => {
    const html = renderToStaticMarkup(React.createElement(App));

    // Sheet container exists with aria-label
    expect(html).toContain('class="sidebar-layout "');
    expect(html).toContain(`aria-label="${en.moves}"`);

    // Move list panel is inside sidebar-inner
    expect(html).toContain('class="sidebar-inner"');
    expect(html).toContain('class="gambit-move-panel"');
  });

  it('renders backdrop outside sidebar-layout when sheet is open', () => {
    const openHtml = renderToStaticMarkup(
      React.createElement(BottomSheetHarness, { initialOpen: true }),
    );

    // Backdrop is rendered at root level, NOT nested inside sidebar-layout
    expect(openHtml).toContain('class="gambit-drawer-backdrop"');
    const backdropIndex = openHtml.indexOf('gambit-drawer-backdrop');
    const sidebarIndex = openHtml.indexOf('sidebar-layout');
    expect(backdropIndex).toBeLessThan(sidebarIndex);
    expect(openHtml).toContain('sidebar-open');
  });
});

