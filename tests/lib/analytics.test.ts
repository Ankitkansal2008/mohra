import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { track } from '../../src/lib/analytics.ts';
import { useGameStore } from '../../src/game/store.ts';
import { ResultDialog } from '../../src/components/Dialogs/ResultDialog.tsx';

describe('Analytics module (src/lib/analytics.ts)', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  afterEach(() => {
    if (originalWindow !== undefined) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as unknown as { window?: unknown }).window;
    }
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('Requirement 1: Umami script tag in index.html', () => {
    it('contains the Umami script before </body> reading import.meta.env.VITE_UMAMI_ID', () => {
      const html = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf-8');

      expect(html).toContain('https://cloud.umami.is/script.js');
      expect(html).toContain('import.meta.env.VITE_UMAMI_ID');

      const scriptIdx = html.indexOf('https://cloud.umami.is/script.js');
      const bodyCloseIdx = html.indexOf('</body>');
      expect(scriptIdx).toBeGreaterThan(0);
      expect(bodyCloseIdx).toBeGreaterThan(scriptIdx);
    });
  });

  describe('Requirement 5: track() resilience when script is absent', () => {
    it('does not throw when window is undefined', () => {
      expect(typeof window).toBe('undefined');

      expect(() => {
        track('game_started', { mode: 'computer', level: 2, colour: 'white' });
      }).not.toThrow();

      expect(() => {
        track('game_ended', { result: 'win', reason: 'checkmate', plies: 10 });
      }).not.toThrow();

      expect(() => {
        track('new_game', { from: 'header' });
      }).not.toThrow();

      expect(() => {
        track('event_without_data');
      }).not.toThrow();
    });

    it('does not throw when window is defined but window.umami is absent', () => {
      (globalThis as unknown as { window: unknown }).window = {};

      expect(() => {
        track('game_started', { mode: 'computer', level: 2, colour: 'white' });
      }).not.toThrow();

      expect(() => {
        track('game_ended', { result: 'draw', reason: 'stalemate', plies: 20 });
      }).not.toThrow();

      expect(() => {
        track('new_game', { from: 'result_panel' });
      }).not.toThrow();
    });

    it('does not throw when window.umami.track throws an error', () => {
      (globalThis as unknown as { window: unknown }).window = {
        umami: {
          track: () => {
            throw new Error('Network error or tracker blocked');
          },
        },
      };

      vi.stubEnv('DEV', false);

      expect(() => {
        track('game_started', { mode: 'computer', level: 1, colour: 'white' });
      }).not.toThrow();
    });
  });

  describe('Requirement 2: DEV mode and dispatch behavior', () => {
    it('is a no-op when import.meta.env.DEV is true even if window.umami exists', () => {
      const mockTrack = vi.fn();
      (globalThis as unknown as { window: unknown }).window = {
        umami: { track: mockTrack },
      };

      // In Vitest default test environment, import.meta.env.DEV is true
      expect(import.meta.env.DEV).toBe(true);

      track('game_started', { mode: 'computer', level: 2, colour: 'white' });
      expect(mockTrack).not.toHaveBeenCalled();
    });

    it('calls window.umami.track when DEV is false and script is present', () => {
      const mockTrack = vi.fn();
      (globalThis as unknown as { window: unknown }).window = {
        umami: { track: mockTrack },
      };

      vi.stubEnv('DEV', false);

      track('game_started', { mode: 'computer', level: 2, colour: 'white' });
      expect(mockTrack).toHaveBeenCalledTimes(1);
      expect(mockTrack).toHaveBeenCalledWith('game_started', {
        mode: 'computer',
        level: 2,
        colour: 'white',
      });
    });
  });

  describe('Requirement 3 & 4: Exact events, payload validation, and no PII/FEN', () => {
    it('tracks game_started with mode, level, and colour upon startNewGame', () => {
      const mockTrack = vi.fn();
      (globalThis as unknown as { window: unknown }).window = {
        umami: { track: mockTrack },
      };
      vi.stubEnv('DEV', false);

      useGameStore.getState().startNewGame({
        mode: 'computer',
        level: 3,
        humanSide: 'b',
        clockEnabled: false,
      });

      expect(mockTrack).toHaveBeenCalledWith('game_started', {
        mode: 'computer',
        level: 3,
        colour: 'black',
      });

      const payload = mockTrack.mock.calls[0][1];
      expect(payload).not.toHaveProperty('fen');
      expect(payload).not.toHaveProperty('moves');
      expect(payload).not.toHaveProperty('uciMoves');
      expect(payload).not.toHaveProperty('pgn');
    });

    it('tracks game_ended on resignation with result, reason, and plies', () => {
      const mockTrack = vi.fn();
      (globalThis as unknown as { window: unknown }).window = {
        umami: { track: mockTrack },
      };
      vi.stubEnv('DEV', false);

      useGameStore.getState().startNewGame({ mode: 'computer', humanSide: 'w', level: 2 });
      mockTrack.mockClear();

      useGameStore.getState().attemptMove('e2', 'e4');
      useGameStore.getState().resignGame();

      expect(mockTrack).toHaveBeenCalledWith('game_ended', {
        result: 'loss',
        reason: 'resigned',
        plies: 1,
      });

      const payload = mockTrack.mock.calls[0][1];
      expect(payload).not.toHaveProperty('fen');
      expect(payload).not.toHaveProperty('moves');
      expect(payload).not.toHaveProperty('uciMoves');
    });

    it('tracks game_ended on checkmate with result, reason, and plies', () => {
      const mockTrack = vi.fn();
      (globalThis as unknown as { window: unknown }).window = {
        umami: { track: mockTrack },
      };
      vi.stubEnv('DEV', false);

      // Scholar's Mate: 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#
      useGameStore.getState().startNewGame({ mode: 'computer', humanSide: 'w', level: 1 });
      mockTrack.mockClear();

      useGameStore.getState().attemptMove('e2', 'e4');
      useGameStore.getState().attemptMove('e7', 'e5', undefined, true);
      useGameStore.getState().attemptMove('d1', 'h5');
      useGameStore.getState().attemptMove('b8', 'c6', undefined, true);
      useGameStore.getState().attemptMove('f1', 'c4');
      useGameStore.getState().attemptMove('g8', 'f6', undefined, true);
      useGameStore.getState().attemptMove('h5', 'f7');

      expect(useGameStore.getState().game.status).toBe('checkmate');
      expect(mockTrack).toHaveBeenCalledWith('game_ended', {
        result: 'win',
        reason: 'checkmate',
        plies: 7,
      });

      const payload = mockTrack.mock.calls[mockTrack.mock.calls.length - 1][1];
      expect(payload).not.toHaveProperty('fen');
      expect(payload).not.toHaveProperty('moves');
      expect(payload).not.toHaveProperty('uciMoves');
    });

    it('tracks new_game with from: result_panel when rematch is clicked in ResultDialog', () => {
      const mockTrack = vi.fn();
      // Ensure window is undefined during ResultDialog render so Zustand works without hooks
      delete (globalThis as unknown as { window?: unknown }).window;

      const onRematch = vi.fn();
      const dialog = ResultDialog({
        status: 'checkmate',
        winner: 'w',
        onRematch,
      });

      const actionsDiv = dialog!.props.children[2];
      const rematchBtn = actionsDiv.props.children[0];

      // Now set window for tracking invocation
      (globalThis as unknown as { window: unknown }).window = {
        umami: { track: mockTrack },
      };
      vi.stubEnv('DEV', false);

      rematchBtn.props.onClick();

      expect(mockTrack).toHaveBeenCalledWith('new_game', { from: 'result_panel' });
      expect(onRematch).toHaveBeenCalledTimes(1);
    });

    it('tracks new_game with from: header', () => {
      const mockTrack = vi.fn();
      (globalThis as unknown as { window: unknown }).window = {
        umami: { track: mockTrack },
      };
      vi.stubEnv('DEV', false);

      track('new_game', { from: 'header' });
      expect(mockTrack).toHaveBeenCalledWith('new_game', { from: 'header' });

      const payload = mockTrack.mock.calls[0][1];
      expect(payload).toEqual({ from: 'header' });
      expect(payload).not.toHaveProperty('fen');
    });
  });
});
