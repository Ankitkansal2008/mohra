import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../src/App.tsx';
import { HomeScreen } from '../../src/components/Home/HomeScreen.tsx';
import { en } from '../../src/copy/en.ts';
import { connectBridgeToStore, initEngine, terminateEngine } from '../../src/engine/index.ts';
import { useGameStore } from '../../src/game/store.ts';

class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  postedMessages: unknown[] = [];
  terminated = false;
  postMessage(message: unknown): void { this.postedMessages.push(message); }
  terminate(): void { this.terminated = true; }
}

describe('HomeScreen and new-game flow', () => {
  beforeEach(() => {
    terminateEngine();
    useGameStore.getState().resetGame();
  });

  describe('1. Default selection and rendering', () => {
    it('renders with Play the computer, Level 2 (Casual), White, and Clock off', () => {
      const html = renderToStaticMarkup(React.createElement(HomeScreen, { isOpen: true, onStart: () => {} }));
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain(en.homePlayComputer);
      expect(html).toContain(en.homeTwoPlayers);
      expect(html).toContain(en.levelCasual);
      expect(html).toContain(en.white);
      expect(html).toContain(en.off);
      expect(html).toContain(en.start);
    });

    it('renders level help text when beginner level is selected', () => {
      const html = renderToStaticMarkup(React.createElement(HomeScreen, { isOpen: true, onStart: () => {} }));
      expect(html).not.toContain(en.levelHelpBeginner);
    });
  });

  describe('2. Mode choices produce correct initial store state', () => {
    it('computer mode with White: White to move, engine does NOT move first', () => {
      let mockWorker: MockWorker | null = null;
      initEngine(() => { mockWorker = new MockWorker(); return mockWorker as unknown as Worker; });
      const disconnect = connectBridgeToStore();
      try {
        useGameStore.getState().startNewGame({ mode: 'computer', humanSide: 'w', level: 3, clockEnabled: true });
        const state = useGameStore.getState();
        expect(state.game.mode).toBe('computer');
        expect(state.game.humanSide).toBe('w');
        expect(state.game.level).toBe(3);
        expect(state.game.clock?.whiteMs).toBe(600_000);
        expect(state.ui.flipped).toBe(false);
        expect(mockWorker!.postedMessages.some((m) => typeof m === 'string' && m.startsWith('go'))).toBe(false);
      } finally {
        disconnect();
      }
    });

    it('computer mode with Black: board is flipped and engine moves first immediately', () => {
      let mockWorker: MockWorker | null = null;
      initEngine(() => { mockWorker = new MockWorker(); return mockWorker as unknown as Worker; });
      const disconnect = connectBridgeToStore();
      try {
        useGameStore.getState().startNewGame({ mode: 'computer', humanSide: 'b', level: 2, clockEnabled: false });
        const state = useGameStore.getState();
        expect(state.game.mode).toBe('computer');
        expect(state.game.humanSide).toBe('b');
        expect(state.game.level).toBe(2);
        expect(state.game.clock).toBeNull();
        expect(state.ui.flipped).toBe(true);
        expect(mockWorker!.postedMessages.some((m) => typeof m === 'string' && m.startsWith('go'))).toBe(true);
      } finally {
        disconnect();
      }
    });

    it('local mode: both sides playable on device, engine is NEVER called', () => {
      let mockWorker: MockWorker | null = null;
      initEngine(() => { mockWorker = new MockWorker(); return mockWorker as unknown as Worker; });
      const disconnect = connectBridgeToStore();
      try {
        useGameStore.getState().startNewGame({ mode: 'local', clockEnabled: false });
        const state = useGameStore.getState();
        expect(state.game.mode).toBe('local');
        expect(state.game.humanSide).toBe('w');
        expect(useGameStore.getState().attemptMove('e2', 'e4')).toBe(true);
        expect(useGameStore.getState().attemptMove('e7', 'e5')).toBe(true);
        expect(useGameStore.getState().game.moves).toEqual(['e4', 'e5']);
        expect(mockWorker!.postedMessages.some((m) => typeof m === 'string' && (m.startsWith('go') || m.startsWith('position')))).toBe(false);
      } finally {
        disconnect();
      }
    });
  });

  describe('3. Rematch and New Game return', () => {
    it('rematch after a game reuses the exact same settings', () => {
      useGameStore.getState().startNewGame({ mode: 'computer', humanSide: 'b', level: 4, clockEnabled: true });
      useGameStore.getState().attemptMove('e2', 'e4', undefined, true);
      expect(useGameStore.getState().game.moves.length).toBe(1);

      useGameStore.getState().rematch();
      const postRematch = useGameStore.getState();
      expect(postRematch.game.mode).toBe('computer');
      expect(postRematch.game.humanSide).toBe('b');
      expect(postRematch.game.level).toBe(4);
      expect(postRematch.game.clock).not.toBeNull();
      expect(postRematch.ui.flipped).toBe(true);
      expect(postRematch.game.moves).toEqual([]);
    });

    it('Header renders New game trigger which opens the HomeScreen', () => {
      const html = renderToStaticMarkup(React.createElement(App));
      expect(html).toContain(en.newGame);
      expect(html).toContain('gambit-home-dialog');
    });
  });

  describe('4. DEV-only ?fen= URL query parameter loading', () => {
    it('silently ignores invalid FEN without throwing or showing errors', () => {
      const stateBefore = useGameStore.getState().game.fen;
      const hadWindow = typeof globalThis.window !== 'undefined';
      const prevWindow = (globalThis as unknown as { window?: unknown }).window;
      try {
        (globalThis as unknown as { window: unknown }).window = { location: { search: '?fen=not-a-valid-fen' } };
        renderToStaticMarkup(React.createElement(App));
        expect(useGameStore.getState().game.fen).toBe(stateBefore);
        expect(useGameStore.getState().toast).toBeNull();
      } finally {
        if (hadWindow) (globalThis as unknown as { window: unknown }).window = prevWindow;
        else delete (globalThis as unknown as { window?: unknown }).window;
      }
    });

    it('loads valid FEN when provided via DEV URL query parameter', () => {
      const customFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      const hadWindow = typeof globalThis.window !== 'undefined';
      const prevWindow = (globalThis as unknown as { window?: unknown }).window;
      try {
        (globalThis as unknown as { window: unknown }).window = { location: { search: `?fen=${encodeURIComponent(customFen)}` } };
        renderToStaticMarkup(React.createElement(App));
        expect(useGameStore.getState().game.fen).toBe(customFen);
      } finally {
        if (hadWindow) (globalThis as unknown as { window: unknown }).window = prevWindow;
        else delete (globalThis as unknown as { window?: unknown }).window;
      }
    });
  });
});
