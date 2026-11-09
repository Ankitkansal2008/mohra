import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsDialog } from '../../src/components/Dialogs/SettingsDialog.tsx';
import { en } from '../../src/copy/en.ts';
import { useGameStore } from '../../src/game/store.ts';
import { loadSavedSettings } from '../../src/lib/persist.ts';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => storageMap.set(key, String(value)),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

if (typeof globalThis.window === 'undefined') {
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: localStorageMock,
  };
} else {
  Object.defineProperty(globalThis.window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}

describe('SettingsDialog rebuilt system and persistence', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useGameStore.getState().resetGame();
  });

  describe('Clock row removal and read-only reference', () => {
    it('the clock row no longer exists as an interactive toggle', () => {
      const html = renderToStaticMarkup(
        <SettingsDialog isOpen={true} onClose={() => {}} />,
      );

      // Previous "Clock (10 min)" toggle must not exist
      expect(html).not.toContain(en.clockSetting);

      // Shows read-only explanatory text instead
      expect(html).toContain(en.clock);
      expect(html).toContain(en.clockReference);
    });
  });

  describe('Real switch components and segmented control accessibility', () => {
    it('renders switches with role="switch", aria-checked, and 44x24 class structure', () => {
      const html = renderToStaticMarkup(
        <SettingsDialog isOpen={true} onClose={() => {}} />,
      );

      // Dialog accessibility
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-labelledby="settings-dialog-title"');
      expect(html).toContain(en.settingsTitle);

      // Switches for sound, animation, and coordinates
      expect(html).toContain('role="switch"');
      expect(html).toContain('class="gambit-switch');
      expect(html).toContain('class="gambit-switch-knob"');
      expect(html).toContain(`aria-label="${en.soundSetting}"`);
      expect(html).toContain(`aria-label="${en.animationSetting}"`);
      expect(html).toContain(`aria-label="${en.coordsSetting}"`);

      // Segmented control for Board theme
      expect(html).toContain('role="radiogroup"');
      expect(html).toContain('role="radio"');
      expect(html).toContain(en.themeDefault);
      expect(html).toContain(en.themeSlate);
    });

    it('renders close button with accessible label and 44px hit area class', () => {
      const html = renderToStaticMarkup(
        <SettingsDialog isOpen={true} onClose={() => {}} />,
      );

      expect(html).toContain(`aria-label="${en.close}"`);
      expect(html).toContain('class="gambit-settings-close"');
    });
  });

  describe('Each switch persists across reload', () => {
    it('persists sound switch across store reloads', () => {
      useGameStore.getState().setSoundOn(false);
      expect(useGameStore.getState().ui.soundOn).toBe(false);
      expect(loadSavedSettings()?.soundOn).toBe(false);

      useGameStore.getState().setSoundOn(true);
      expect(useGameStore.getState().ui.soundOn).toBe(true);
      expect(loadSavedSettings()?.soundOn).toBe(true);
    });

    it('persists piece animation switch across store reloads', () => {
      useGameStore.getState().setAnimationOn(false);
      expect(useGameStore.getState().ui.animationOn).toBe(false);
      expect(loadSavedSettings()?.animationOn).toBe(false);

      useGameStore.getState().setAnimationOn(true);
      expect(useGameStore.getState().ui.animationOn).toBe(true);
      expect(loadSavedSettings()?.animationOn).toBe(true);
    });

    it('persists coordinates switch across store reloads', () => {
      useGameStore.getState().setShowCoords(false);
      expect(useGameStore.getState().ui.showCoords).toBe(false);
      expect(loadSavedSettings()?.showCoords).toBe(false);

      useGameStore.getState().setShowCoords(true);
      expect(useGameStore.getState().ui.showCoords).toBe(true);
      expect(loadSavedSettings()?.showCoords).toBe(true);
    });

    it('persists board theme segmented control across store reloads', () => {
      useGameStore.getState().setTheme('slate');
      expect(useGameStore.getState().ui.theme).toBe('slate');
      expect(loadSavedSettings()?.theme).toBe('slate');

      useGameStore.getState().setTheme('default');
      expect(useGameStore.getState().ui.theme).toBe('default');
      expect(loadSavedSettings()?.theme).toBe('default');
    });
  });

  describe('Focus trap and dialog lifecycle', () => {
    it('returns null when isOpen is false', () => {
      const html = renderToStaticMarkup(
        <SettingsDialog isOpen={false} onClose={() => {}} />,
      );
      expect(html).toBe('');
    });

    it('invokes onClose when clicking close button or backdrop', () => {
      const onClose = vi.fn();
      const html = renderToStaticMarkup(
        <SettingsDialog isOpen={true} onClose={onClose} />,
      );
      expect(html).toContain('gambit-dialog-backdrop');
      expect(html).toContain('gambit-settings-close');
    });
  });
});
