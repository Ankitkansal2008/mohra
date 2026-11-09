import { beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadPgnFile } from '../../src/game/pgn.ts';
import { getResultExplanation } from '../../src/game/selectors.ts';
import { useGameStore } from '../../src/game/store.ts';
import { formatClock } from '../../src/lib/format.ts';
import {
  STORAGE_KEY_GAME,
  formatResumeLabel,
  isSaveUnder24Hours,
  loadSavedGame,
  loadSavedSettings,
} from '../../src/lib/persist.ts';

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

describe('Parts around the board: Review mode, clocks, persistence, settings', () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorageMock.clear();
    useGameStore.getState().resetGame();
  });

  describe('Review mode', () => {
    it('review mode does not mutate the game', () => {
      useGameStore.setState((s) => ({ game: { ...s.game, mode: 'local' } }));
      const store = useGameStore.getState();

      // Play 1. e4 e5
      expect(store.attemptMove('e2', 'e4')).toBe(true);
      expect(store.attemptMove('e7', 'e5')).toBe(true);

      const stateBefore = useGameStore.getState();
      const movesBefore = [...stateBefore.game.moves];
      const fenBefore = stateBefore.game.fen;
      const statusBefore = stateBefore.game.status;

      // Enter review mode at move 1 (ply 0: e4)
      store.setReviewPly(0);
      expect(useGameStore.getState().ui.reviewPly).toBe(0);

      // Attempting any move while in review mode MUST be rejected
      const moveAttempt = useGameStore.getState().attemptMove('g1', 'f3');
      expect(moveAttempt).toBe(false);

      // Square selection while in review mode must not select or produce targets
      useGameStore.getState().selectSquare('g1');
      expect(useGameStore.getState().ui.selected).toBeNull();
      expect(useGameStore.getState().ui.targets).toEqual([]);

      // Attempting an engine move while in review mode MUST be rejected
      const engineAttempt = useGameStore.getState().applyEngineMove(useGameStore.getState().engineToken, 'g1f3');
      expect(engineAttempt).toBe(false);

      // Game state must remain completely unmutated
      const stateDuring = useGameStore.getState();
      expect(stateDuring.game.moves).toEqual(movesBefore);
      expect(stateDuring.game.fen).toBe(fenBefore);
      expect(stateDuring.game.status).toBe(statusBefore);

      // Returning to game restores live interaction
      store.setReviewPly(null);
      expect(useGameStore.getState().ui.reviewPly).toBeNull();
    });

    it('undo exits review mode', () => {
      useGameStore.setState((s) => ({ game: { ...s.game, mode: 'local' } }));
      const store = useGameStore.getState();

      store.attemptMove('e2', 'e4');
      store.attemptMove('e7', 'e5');

      // Enter review mode
      store.setReviewPly(0);
      expect(useGameStore.getState().ui.reviewPly).toBe(0);

      // Executing undo must exit review mode and reset reviewPly to null
      const undoResult = store.undo();
      expect(undoResult).toBe(true);
      expect(useGameStore.getState().ui.reviewPly).toBeNull();
      expect(useGameStore.getState().game.moves).toEqual(['e4']);
    });
  });

  describe('Clock management', () => {
    it('clock flags correctly', () => {
      const store = useGameStore.getState();
      // Enable 10-minute clock for White to move
      store.setClockEnabled(true);
      const stateWithClock = useGameStore.getState();
      expect(stateWithClock.game.clock).not.toBeNull();
      expect(stateWithClock.game.clock?.whiteMs).toBe(600_000);
      expect(stateWithClock.game.clock?.blackMs).toBe(600_000);
      expect(stateWithClock.game.clock?.running).toBe('w');

      const startTick = stateWithClock.game.clock!.lastTickAt!;
      // Advance by 600,001 ms (exceeds White's 10 minutes)
      const flagTime = startTick + 600_001;
      store.tickClock(flagTime);

      const flaggedState = useGameStore.getState();
      expect(flaggedState.game.status).toBe('timeout');
      expect(flaggedState.game.winner).toBe('b');
      expect(flaggedState.game.clock?.whiteMs).toBe(0);
      expect(flaggedState.game.clock?.running).toBeNull();

      // Explanation copy must report White running out of time
      const explanation = getResultExplanation(flaggedState.game.status, flaggedState.game.winner);
      expect(explanation?.headline).toContain('White ran out of time. Black wins.');
    });

    it('formats clock as mm:ss and seconds only under 60s', () => {
      expect(formatClock(600_000)).toBe('10:00');
      expect(formatClock(582_000)).toBe('09:42');
      expect(formatClock(60_000)).toBe('01:00');
      expect(formatClock(59_000)).toBe('59s');
      expect(formatClock(45_200)).toBe('46s');
      expect(formatClock(5_000)).toBe('5s');
      expect(formatClock(0)).toBe('00:00');
      expect(formatClock(-100)).toBe('00:00');
    });
  });

  describe('Persistence and error recovery', () => {
    it('corrupt localStorage starts a clean game', () => {
      // 1. Invalid JSON string
      localStorage.setItem(STORAGE_KEY_GAME, 'corrupt-not-json{{{');
      expect(loadSavedGame()).toBeNull();

      // 2. Schema version mismatch
      localStorage.setItem(
        STORAGE_KEY_GAME,
        JSON.stringify({ schemaVersion: 999, game: { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' } }),
      );
      expect(loadSavedGame()).toBeNull();

      // 3. Corrupt object payload missing required fields
      localStorage.setItem(
        STORAGE_KEY_GAME,
        JSON.stringify({ schemaVersion: 1, game: { notAValidGame: true } }),
      );
      expect(loadSavedGame()).toBeNull();

      // Store remains clean and playable
      expect(useGameStore.getState().game.moves).toEqual([]);
      expect(useGameStore.getState().game.status).toBe('playing');
    });

    it('persists and restores valid GameState debounced', async () => {
      vi.useFakeTimers();
      const store = useGameStore.getState();
      store.attemptMove('e2', 'e4');

      // Debounce period is 400ms
      expect(localStorage.getItem(STORAGE_KEY_GAME)).toBeNull();
      vi.advanceTimersByTime(400);

      const saved = loadSavedGame();
      expect(saved).not.toBeNull();
      expect(saved?.moves).toEqual(['e4']);
      vi.useRealTimers();
    });

    it('formats resume label correctly for games under 24 hours old', () => {
      const now = Date.now();
      const mockGame = {
        ...useGameStore.getState().game,
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        moves: ['e4', 'e5'],
        savedAt: now - 3600_000, // 1 hour ago
      };

      expect(isSaveUnder24Hours(mockGame.savedAt, now)).toBe(true);
      expect(isSaveUnder24Hours(now - 90_000_000, now)).toBe(false);

      const label = formatResumeLabel(mockGame);
      expect(label).toBe('Resume game - White to move, move 2');
    });

    it('persists and reloads user settings', () => {
      const store = useGameStore.getState();
      store.setTheme('slate');
      store.setSoundOn(true);
      store.setAnimationOn(false);
      store.setShowCoords(false);

      const loaded = loadSavedSettings();
      expect(loaded?.theme).toBe('slate');
      expect(loaded?.soundOn).toBe(true);
      expect(loaded?.animationOn).toBe(false);
      expect(loaded?.showCoords).toBe(false);
    });
  });

  describe('PGN export', () => {
    it('creates Blob and downloads PGN file without throwing', () => {
      const clickMock = vi.fn();
      const appendChildMock = vi.fn();
      const removeChildMock = vi.fn();
      const createObjectURLMock = vi.fn().mockReturnValue('blob:test');
      const revokeObjectURLMock = vi.fn();

      const originalDoc = globalThis.document;
      const originalWindow = globalThis.window;
      const originalUrl = globalThis.URL;

      (globalThis as unknown as { window: unknown }).window = {};
      (globalThis as unknown as { document: unknown }).document = {
        createElement: () => ({ click: clickMock, href: '', download: '' }),
        body: { appendChild: appendChildMock, removeChild: removeChildMock },
      };
      globalThis.URL.createObjectURL = createObjectURLMock;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock;

      try {
        downloadPgnFile('1. e4 e5 *', 'test.pgn');
        expect(createObjectURLMock).toHaveBeenCalledTimes(1);
        expect(clickMock).toHaveBeenCalledTimes(1);
        expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
      } finally {
        globalThis.document = originalDoc;
        globalThis.window = originalWindow;
        globalThis.URL = originalUrl;
      }
    });
  });
});
