import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResumeBanner } from '../../src/components/Panels/ResumeBanner.tsx';
import { connectBridgeToStore, initEngine, terminateEngine } from '../../src/engine/bridge.ts';
import { rules } from '../../src/game/rules.ts';
import { useGameStore } from '../../src/game/store.ts';
import type { GameState } from '../../src/game/types.ts';
import { loadSavedGame, saveGame } from '../../src/lib/persist.ts';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

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
  (globalThis as unknown as { window: unknown }).window = { localStorage: localStorageMock };
} else {
  Object.defineProperty(globalThis.window, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}

class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  postedMessages: unknown[] = [];
  terminated = false;

  postMessage(message: unknown): void {
    this.postedMessages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }
}

function createMockGame(overrides: Partial<GameState> = {}): GameState {
  return {
    id: 'test-resume-bug',
    fen: STARTING_FEN,
    startFen: STARTING_FEN,
    pgn: '',
    moves: [],
    uciMoves: [],
    status: 'playing',
    winner: null,
    mode: 'computer',
    humanSide: 'w',
    level: 2,
    clock: null,
    startedAt: Date.now(),
    savedAt: Date.now(),
    ...overrides,
    ...(overrides.startFen !== undefined ? { startFen: overrides.startFen } : {}),
  };
}

function clickResumeFromBanner(savedGame: GameState): void {
  const element = ResumeBanner({ savedGame, onDismiss: vi.fn() });
  const actionsDiv = element.props.children[1];
  const [resumeBtn] = actionsDiv.props.children;
  resumeBtn.props.onClick();
}

describe('Three resume bugs in restoreGame regression suite', () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorageMock.clear();
    terminateEngine();
    useGameStore.getState().resetGame();
  });

  it('1. Timed game: preserves remaining time and avoids timeout flag after 45 minutes simulated elapse', () => {
    const t0 = 1_700_000_000_000;
    vi.useFakeTimers();
    vi.setSystemTime(t0);

    const initialWhiteMs = 450_000;
    const initialBlackMs = 500_000;
    const timedGame = createMockGame({
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      moves: ['e4'],
      uciMoves: ['e2e4'],
      clock: {
        whiteMs: initialWhiteMs,
        blackMs: initialBlackMs,
        running: 'b',
        lastTickAt: t0,
      },
      savedAt: t0,
    });

    saveGame(timedGame);

    // Simulate 45 minutes passing while the tab is closed
    const fortyFiveMinutesMs = 45 * 60 * 1000;
    vi.setSystemTime(t0 + fortyFiveMinutesMs);

    const saved = loadSavedGame();
    expect(saved).not.toBeNull();
    clickResumeFromBanner(saved!);

    const restoredGame = useGameStore.getState().game;
    expect(restoredGame.status).toBe('playing');
    expect(restoredGame.clock).not.toBeNull();
    expect(restoredGame.clock?.blackMs).toBe(initialBlackMs);
    expect(restoredGame.clock?.whiteMs).toBe(initialWhiteMs);

    // Immediate clock tick must not deduct elapsed offline time
    useGameStore.getState().tickClock();
    const afterTickGame = useGameStore.getState().game;
    expect(afterTickGame.status).toBe('playing');
    expect(afterTickGame.clock?.blackMs).toBe(initialBlackMs);
    expect(afterTickGame.clock?.whiteMs).toBe(initialWhiteMs);
  });

  it('2. Engine turn: triggers bridge engine search when resuming on engine side to move', () => {
    let mockWorker: MockWorker | null = null;
    initEngine(() => {
      mockWorker = new MockWorker();
      return mockWorker as unknown as Worker;
    });
    const disconnect = connectBridgeToStore();

    try {
      // Saved position where Black (computer) is to move
      const engineTurnGame = createMockGame({
        mode: 'computer',
        humanSide: 'w',
        moves: ['e4'],
        uciMoves: ['e2e4'],
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        level: 2,
        status: 'playing',
      });

      saveGame(engineTurnGame);
      const saved = loadSavedGame();
      expect(saved).not.toBeNull();

      clickResumeFromBanner(saved!);

      expect(mockWorker).not.toBeNull();
      const hasPositionCommand = mockWorker!.postedMessages.some(
        (msg) => typeof msg === 'string' && msg.startsWith('position fen rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'),
      );
      const hasGoCommand = mockWorker!.postedMessages.some(
        (msg) => typeof msg === 'string' && msg.startsWith('go'),
      );

      expect(hasPositionCommand).toBe(true);
      expect(hasGoCommand).toBe(true);
    } finally {
      disconnect();
    }
  });

  it('3. PGN continuity: retains all four plies in pgn() after resuming 1.e4 e5 2.Nf3 and playing one move', () => {
    // 1.e4 e5 2.Nf3 (3 plies total)
    const fenAfterNf3 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
    const threePlyGame = createMockGame({
      mode: 'local',
      fen: fenAfterNf3,
      moves: ['e4', 'e5', 'Nf3'],
      uciMoves: ['e2e4', 'e7e5', 'g1f3'],
      status: 'playing',
    });

    saveGame(threePlyGame);
    const saved = loadSavedGame();
    expect(saved).not.toBeNull();

    clickResumeFromBanner(saved!);

    // Play 4th ply: 2...Nc6 via authoritative move intent pipeline
    const moveAccepted = useGameStore.getState().attemptMove('b8', 'c6');
    expect(moveAccepted).toBe(true);

    const finalGame = useGameStore.getState().game;
    expect(finalGame.moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);

    const exportedPgn = rules.pgn();
    expect(exportedPgn).toContain('1. e4 e5 2. Nf3 Nc6');
    expect(finalGame.pgn).toContain('1. e4 e5 2. Nf3 Nc6');
  });
});
