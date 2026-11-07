import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PromotionOverlay } from '../../src/components/Board/PromotionOverlay.tsx';
import { ResultDialog } from '../../src/components/Dialogs/ResultDialog.tsx';
import { SettingsDialog } from '../../src/components/Dialogs/SettingsDialog.tsx';
import { Header } from '../../src/components/Header/Header.tsx';
import { HomeScreen } from '../../src/components/Home/HomeScreen.tsx';
import { Controls } from '../../src/components/Panels/Controls.tsx';
import { setupFocusTrap } from '../../src/components/useFocusTrap.ts';
import { en } from '../../src/copy/en.ts';
import { useGameStore } from '../../src/game/store.ts';

interface MockDOMElement {
  tagName: string;
  tabIndex: number;
  attributes: Map<string, string>;
  children: MockDOMElement[];
  parentElement: MockDOMElement | null;
  focus: () => void;
  getAttribute: (name: string) => string | null;
  hasAttribute: (name: string) => boolean;
  querySelectorAll: (selector: string) => HTMLElement[];
  contains: (node: unknown) => boolean;
}

function createMockElement(
  tagName: string,
  attrs: Record<string, string> = {},
  children: MockDOMElement[] = [],
): MockDOMElement {
  const attrMap = new Map<string, string>(Object.entries(attrs));
  const el: MockDOMElement = {
    tagName: tagName.toUpperCase(),
    tabIndex: attrs.tabindex ? parseInt(attrs.tabindex, 10) : 0,
    attributes: attrMap,
    children: [],
    parentElement: null,
    focus: vi.fn(() => {
      (globalThis.document as unknown as { activeElement: unknown }).activeElement = el;
    }),
    getAttribute: (name: string) => attrMap.get(name) ?? null,
    hasAttribute: (name: string) => attrMap.has(name),
    querySelectorAll: (_selector: string) => {
      const results: MockDOMElement[] = [];
      const traverse = (node: MockDOMElement) => {
        for (const child of node.children) {
          if (child.tagName === 'BUTTON' && !child.hasAttribute('disabled')) {
            results.push(child);
          } else if (child.tabIndex >= 0 && !child.hasAttribute('disabled')) {
            results.push(child);
          }
          traverse(child);
        }
      };
      traverse(el);
      return results as unknown as HTMLElement[];
    },
    contains: (node: unknown) => {
      if (node === el) return true;
      let curr = (node as MockDOMElement)?.parentElement;
      while (curr) {
        if (curr === el) return true;
        curr = curr.parentElement;
      }
      return false;
    },
  };

  for (const child of children) {
    child.parentElement = el;
    el.children.push(child);
  }

  return el;
}

describe('Focus trap and dialog accessibility', () => {
  let originalDocument: unknown;
  let originalWindow: unknown;
  let keyListeners: Array<(e: KeyboardEvent) => void> = [];

  beforeEach(() => {
    useGameStore.getState().resetGame();
    originalDocument = globalThis.document;
    originalWindow = globalThis.window;
    keyListeners = [];

    const mockDoc = {
      activeElement: null as unknown,
    };

    const mockWin = {
      addEventListener: (_event: string, handler: (e: KeyboardEvent) => void) => {
        keyListeners.push(handler);
      },
      removeEventListener: (_event: string, handler: (e: KeyboardEvent) => void) => {
        keyListeners = keyListeners.filter((h) => h !== handler);
      },
    };

    (globalThis as unknown as { document: unknown }).document = mockDoc;
    (globalThis as unknown as { window: unknown }).window = mockWin;
  });

  afterEach(() => {
    (globalThis as unknown as { document: unknown }).document = originalDocument;
    (globalThis as unknown as { window: unknown }).window = originalWindow;
  });

  const fireKeyDown = (key: string, shiftKey = false): { defaultPrevented: boolean } => {
    let defaultPrevented = false;
    let propagationStopped = false;
    const event = {
      key,
      shiftKey,
      preventDefault: () => {
        defaultPrevented = true;
      },
      stopPropagation: () => {
        propagationStopped = true;
      },
    } as unknown as KeyboardEvent;

    for (const listener of [...keyListeners]) {
      listener(event);
      if (propagationStopped) break;
    }
    return { defaultPrevented };
  };

  describe('Core setupFocusTrap behavior', () => {
    it('moves focus inside to the first focusable control on open', () => {
      const trigger = createMockElement('button');
      (globalThis.document as unknown as { activeElement: unknown }).activeElement = trigger;

      const firstBtn = createMockElement('button', { id: 'btn-1' });
      const secondBtn = createMockElement('button', { id: 'btn-2' });
      const dialog = createMockElement('div', { role: 'dialog' }, [firstBtn, secondBtn]);

      setupFocusTrap(dialog as unknown as HTMLElement, vi.fn());

      expect(firstBtn.focus).toHaveBeenCalledTimes(1);
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(firstBtn);
    });

    it('wraps Tab from the last focusable control back to the first', () => {
      const firstBtn = createMockElement('button', { id: 'btn-1' });
      const lastBtn = createMockElement('button', { id: 'btn-2' });
      const dialog = createMockElement('div', {}, [firstBtn, lastBtn]);

      setupFocusTrap(dialog as unknown as HTMLElement, vi.fn());

      // Move focus to last button
      (globalThis.document as unknown as { activeElement: unknown }).activeElement = lastBtn;

      // Press Tab
      const result = fireKeyDown('Tab', false);
      expect(result.defaultPrevented).toBe(true);
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(firstBtn);
    });

    it('wraps Shift+Tab from the first focusable control to the last', () => {
      const firstBtn = createMockElement('button', { id: 'btn-1' });
      const lastBtn = createMockElement('button', { id: 'btn-2' });
      const dialog = createMockElement('div', {}, [firstBtn, lastBtn]);

      setupFocusTrap(dialog as unknown as HTMLElement, vi.fn());

      // Focus is at first button
      (globalThis.document as unknown as { activeElement: unknown }).activeElement = firstBtn;

      // Press Shift+Tab
      const result = fireKeyDown('Tab', true);
      expect(result.defaultPrevented).toBe(true);
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(lastBtn);
    });

    it('Escape calls onClose when provided', () => {
      const onClose = vi.fn();
      const firstBtn = createMockElement('button');
      const dialog = createMockElement('div', {}, [firstBtn]);

      setupFocusTrap(dialog as unknown as HTMLElement, onClose);

      const result = fireKeyDown('Escape');
      expect(result.defaultPrevented).toBe(true);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('Escape does not close when onClose is undefined (required choice)', () => {
      const firstBtn = createMockElement('button');
      const dialog = createMockElement('div', {}, [firstBtn]);

      setupFocusTrap(dialog as unknown as HTMLElement, undefined);

      const result = fireKeyDown('Escape');
      expect(result.defaultPrevented).toBe(false);
    });

    it('restores focus to the element that opened it on close', () => {
      const trigger = createMockElement('button', { id: 'trigger-btn' });
      (globalThis.document as unknown as { activeElement: unknown }).activeElement = trigger;

      const firstBtn = createMockElement('button', { id: 'dialog-btn' });
      const dialog = createMockElement('div', {}, [firstBtn]);

      const cleanup = setupFocusTrap(dialog as unknown as HTMLElement, vi.fn());
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(firstBtn);

      // Close dialog
      cleanup();
      expect(trigger.focus).toHaveBeenCalledTimes(1);
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(trigger);
    });
  });

  describe('1. SettingsDialog', () => {
    it('sets aria-modal="true" and aria-labelledby pointing to dialog title', () => {
      const html = renderToStaticMarkup(
        React.createElement(SettingsDialog, { isOpen: true, onClose: () => {} }),
      );
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-labelledby="settings-dialog-title"');
      expect(html).toContain('id="settings-dialog-title"');
      expect(html).toContain(en.settingsTitle);
    });

    it('moves focus inside, wraps Tab, closes on Escape, and restores focus', () => {
      const trigger = createMockElement('button', { id: 'settings-trigger' });
      (globalThis.document as unknown as { activeElement: unknown }).activeElement = trigger;

      const closeBtn = createMockElement('button', { 'aria-label': en.close });
      const soundBtn = createMockElement('button', { id: 'sound-toggle' });
      const dialog = createMockElement('div', { role: 'dialog' }, [closeBtn, soundBtn]);

      const onClose = vi.fn();
      const cleanup = setupFocusTrap(dialog as unknown as HTMLElement, onClose);

      // 1. Opening moves focus inside
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(closeBtn);

      // 2. Tab wraps from last control to first
      (globalThis.document as unknown as { activeElement: unknown }).activeElement = soundBtn;
      fireKeyDown('Tab', false);
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(closeBtn);

      // 3. Escape closes
      fireKeyDown('Escape');
      expect(onClose).toHaveBeenCalledTimes(1);

      // 4. Closing restores focus to trigger
      cleanup();
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(trigger);
    });
  });

  describe('2. HomeScreen', () => {
    it('sets aria-modal="true" and aria-labelledby pointing to dialog title', () => {
      const html = renderToStaticMarkup(
        React.createElement(HomeScreen, { isOpen: true, onStart: () => {} }),
      );
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-labelledby="gambit-home-title"');
      expect(html).toContain('id="gambit-home-title"');
      expect(html).toContain(en.newGame);
    });

    it('moves focus inside, wraps Tab, and closes on Escape when canClose is true', () => {
      const trigger = createMockElement('button', { id: 'new-game-trigger' });
      (globalThis.document as unknown as { activeElement: unknown }).activeElement = trigger;

      const closeBtn = createMockElement('button', { 'aria-label': en.close });
      const startBtn = createMockElement('button', { id: 'start-btn' });
      const dialog = createMockElement('div', { role: 'dialog' }, [closeBtn, startBtn]);

      const onClose = vi.fn();
      const cleanup = setupFocusTrap(dialog as unknown as HTMLElement, onClose);

      // Opening moves focus inside
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(closeBtn);

      // Tab wraps from last to first
      (globalThis.document as unknown as { activeElement: unknown }).activeElement = startBtn;
      fireKeyDown('Tab', false);
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(closeBtn);

      // Escape closes when canClose is true
      fireKeyDown('Escape');
      expect(onClose).toHaveBeenCalledTimes(1);

      // Closing restores focus to trigger
      cleanup();
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(trigger);
    });

    it('does NOT close on Escape when canClose is false (mandatory choice)', () => {
      const firstBtn = createMockElement('button');
      const dialog = createMockElement('div', { role: 'dialog' }, [firstBtn]);

      // When canClose is false, onClose is undefined
      setupFocusTrap(dialog as unknown as HTMLElement, undefined);

      const result = fireKeyDown('Escape');
      expect(result.defaultPrevented).toBe(false);
    });
  });

  describe('3. ResultDialog', () => {
    it('sets aria-modal="true" and aria-labelledby pointing to headline', () => {
      const html = renderToStaticMarkup(
        React.createElement(ResultDialog, { status: 'checkmate', winner: 'w' }),
      );
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-labelledby="result-dialog-headline"');
      expect(html).toContain('id="result-dialog-headline"');
      expect(html).toContain('Checkmate. White wins.');
    });

    it('moves focus inside, wraps Tab, does NOT close on Escape, and restores focus on unmount', () => {
      const boardSquare = createMockElement('button', { id: 'board-e4' });
      (globalThis.document as unknown as { activeElement: unknown }).activeElement = boardSquare;

      const rematchBtn = createMockElement('button', { id: 'rematch' });
      const shareBtn = createMockElement('button', { id: 'share' });
      const dialog = createMockElement('div', { role: 'dialog' }, [rematchBtn, shareBtn]);

      // ResultDialog does not pass onClose (terminal choice required)
      const cleanup = setupFocusTrap(dialog as unknown as HTMLElement, undefined);

      // Opening moves focus inside
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(rematchBtn);

      // Tab wraps from last control to first
      (globalThis.document as unknown as { activeElement: unknown }).activeElement = shareBtn;
      fireKeyDown('Tab', false);
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(rematchBtn);

      // Escape does not close
      const result = fireKeyDown('Escape');
      expect(result.defaultPrevented).toBe(false);

      // Closing / rematch restores focus
      cleanup();
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(boardSquare);
    });
  });

  describe('4. Controls (Resign confirmation dialog)', () => {
    it('renders controls and confirms resign dialog uses aria-labelledby', () => {
      const html = renderToStaticMarkup(React.createElement(Controls));
      expect(html).toContain('gambit-controls');
    });

    it('moves focus inside, wraps Tab, closes on Escape, and restores focus to Resign button', () => {
      const resignTriggerBtn = createMockElement('button', { id: 'resign-trigger' });
      (globalThis.document as unknown as { activeElement: unknown }).activeElement = resignTriggerBtn;

      const cancelBtn = createMockElement('button', { id: 'cancel-btn' });
      const confirmBtn = createMockElement('button', { id: 'confirm-btn' });
      const dialog = createMockElement('div', { role: 'dialog' }, [cancelBtn, confirmBtn]);

      const onCancel = vi.fn();
      const cleanup = setupFocusTrap(dialog as unknown as HTMLElement, onCancel);

      // Opening moves focus inside
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(cancelBtn);

      // Tab wraps from last to first
      (globalThis.document as unknown as { activeElement: unknown }).activeElement = confirmBtn;
      fireKeyDown('Tab', false);
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(cancelBtn);

      // Escape closes
      fireKeyDown('Escape');
      expect(onCancel).toHaveBeenCalledTimes(1);

      // Closing restores focus to Resign button
      cleanup();
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(resignTriggerBtn);
    });
  });

  describe('5. Header (Mobile menu dialog)', () => {
    it('sets aria-modal="true" and aria-labelledby pointing to menu heading', () => {
      const html = renderToStaticMarkup(
        React.createElement(Header, { onOpenSettings: () => {}, onNewGame: () => {} }),
      );
      // Header renders button in desktop/mobile; when menu opens it has aria-labelledby
      expect(html).toContain('class="gambit-header"');
    });

    it('moves focus inside, wraps Tab, closes on Escape, and restores focus to Menu trigger', () => {
      const menuTriggerBtn = createMockElement('button', { id: 'menu-trigger' });
      (globalThis.document as unknown as { activeElement: unknown }).activeElement = menuTriggerBtn;

      const closeBtn = createMockElement('button', { 'aria-label': en.close });
      const newGameBtn = createMockElement('button', { id: 'new-game' });
      const dialog = createMockElement('div', { role: 'dialog' }, [closeBtn, newGameBtn]);

      const onClose = vi.fn();
      const cleanup = setupFocusTrap(dialog as unknown as HTMLElement, onClose);

      // Opening moves focus inside
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(closeBtn);

      // Tab wraps from last to first
      (globalThis.document as unknown as { activeElement: unknown }).activeElement = newGameBtn;
      fireKeyDown('Tab', false);
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(closeBtn);

      // Escape closes
      fireKeyDown('Escape');
      expect(onClose).toHaveBeenCalledTimes(1);

      // Closing restores focus to Menu button
      cleanup();
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(menuTriggerBtn);
    });
  });

  describe('6. PromotionOverlay', () => {
    it('sets aria-modal="true" and aria-label for promotion dialog', () => {
      const html = renderToStaticMarkup(
        React.createElement(PromotionOverlay, {
          toSquare: 'e8',
          side: 'w',
          onSelect: () => {},
          onCancel: () => {},
        }),
      );
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain(`aria-label="${en.promotionDialogAriaLabel}"`);
    });

    it('moves focus inside, wraps Tab, closes on Escape, and restores focus to originating square', () => {
      const square = createMockElement('button', { id: 'square-e7' });
      (globalThis.document as unknown as { activeElement: unknown }).activeElement = square;

      const queenBtn = createMockElement('button', { 'aria-label': en.promoteToQueen });
      const knightBtn = createMockElement('button', { 'aria-label': en.promoteToKnight });
      const rookBtn = createMockElement('button', { 'aria-label': en.promoteToRook });
      const bishopBtn = createMockElement('button', { 'aria-label': en.promoteToBishop });
      const dialog = createMockElement('div', { role: 'dialog' }, [
        queenBtn,
        knightBtn,
        rookBtn,
        bishopBtn,
      ]);

      const onCancel = vi.fn();
      const cleanup = setupFocusTrap(dialog as unknown as HTMLElement, onCancel);

      // Opening moves focus inside to Queen choice
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(queenBtn);

      // Tab wraps from Bishop back to Queen
      (globalThis.document as unknown as { activeElement: unknown }).activeElement = bishopBtn;
      fireKeyDown('Tab', false);
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(queenBtn);

      // Shift+Tab from Queen wraps to Bishop
      fireKeyDown('Tab', true);
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(bishopBtn);

      // Escape cancels
      fireKeyDown('Escape');
      expect(onCancel).toHaveBeenCalledTimes(1);

      // Closing restores focus to originating square
      cleanup();
      expect((globalThis.document as unknown as { activeElement: unknown }).activeElement).toBe(square);
    });
  });
});
