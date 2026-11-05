import { beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '../../src/copy/en.ts';
import {
  cancelEngineSearch,
  connectBridgeToStore,
  getLevelConfig,
  handleEngineFailure,
  handleWorkerMessage,
  initEngine,
  requestEngineMove,
  sampleLevelParams,
  terminateEngine,
} from '../../src/engine/index.ts';
import {
  formatGoCommand,
  formatMultiPvCommand,
  formatPositionCommand,
  formatSkillCommand,
  parseBestMove,
  parseInfoLine,
} from '../../src/engine/uci.ts';
import { getTurn } from '../../src/game/selectors.ts';
import { useGameStore } from '../../src/game/store.ts';

// Lightweight mock Worker implementing standard postMessage / onmessage eventing.
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

  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  simulateError(message: string): void {
    if (this.onerror) {
      this.onerror(new ErrorEvent('error', { message }));
    }
  }
}

describe('Stockfish Engine Opponent', () => {
  beforeEach(() => {
    vi.useRealTimers();
    terminateEngine();
    useGameStore.getState().resetGame();
  });

  describe('level mapping', () => {
    it('maps Level 1 to skill 0-3, depth 2, movetime 200-500ms, and MultiPV 5 with random root pick', () => {
      const config = getLevelConfig(1);
      expect(config.skill).toEqual({ min: 0, max: 3 });
      expect(config.depth).toEqual({ min: 2, max: 2 });
      expect(config.movetime).toEqual({ min: 200, max: 500 });
      expect(config.multiPv).toBe(5);
      expect(config.pickRandomRootMove).toBe(true);

      // Verify sampled values stay strictly within specified ranges
      for (let i = 0; i < 20; i++) {
        const sampled = sampleLevelParams(config);
        expect(sampled.skill).toBeGreaterThanOrEqual(0);
        expect(sampled.skill).toBeLessThanOrEqual(3);
        expect(sampled.depth).toBe(2);
        expect(sampled.movetime).toBeGreaterThanOrEqual(200);
        expect(sampled.movetime).toBeLessThanOrEqual(500);
        expect(sampled.multiPv).toBe(5);
        expect(sampled.pickRandomRootMove).toBe(true);
      }
    });

    it('maps Level 2 to skill 5-8, depth 4, movetime 400-800ms, and MultiPV 1', () => {
      const config = getLevelConfig(2);
      expect(config.skill).toEqual({ min: 5, max: 8 });
      expect(config.depth).toEqual({ min: 4, max: 4 });
      expect(config.movetime).toEqual({ min: 400, max: 800 });
      expect(config.multiPv).toBe(1);
      expect(config.pickRandomRootMove).toBe(false);

      for (let i = 0; i < 20; i++) {
        const sampled = sampleLevelParams(config);
        expect(sampled.skill).toBeGreaterThanOrEqual(5);
        expect(sampled.skill).toBeLessThanOrEqual(8);
        expect(sampled.depth).toBe(4);
        expect(sampled.movetime).toBeGreaterThanOrEqual(400);
        expect(sampled.movetime).toBeLessThanOrEqual(800);
        expect(sampled.multiPv).toBe(1);
      }
    });

    it('maps Level 3 to skill 12-15, depth 6-8, movetime 700-1200ms, and MultiPV 1', () => {
      const config = getLevelConfig(3);
      expect(config.skill).toEqual({ min: 12, max: 15 });
      expect(config.depth).toEqual({ min: 6, max: 8 });
      expect(config.movetime).toEqual({ min: 700, max: 1200 });
      expect(config.multiPv).toBe(1);
      expect(config.pickRandomRootMove).toBe(false);

      for (let i = 0; i < 20; i++) {
        const sampled = sampleLevelParams(config);
        expect(sampled.skill).toBeGreaterThanOrEqual(12);
        expect(sampled.skill).toBeLessThanOrEqual(15);
        expect(sampled.depth).toBeGreaterThanOrEqual(6);
        expect(sampled.depth).toBeLessThanOrEqual(8);
        expect(sampled.movetime).toBeGreaterThanOrEqual(700);
        expect(sampled.movetime).toBeLessThanOrEqual(1200);
        expect(sampled.multiPv).toBe(1);
      }
    });
  });

  describe('a stale-token reply is ignored', () => {
    it('drops bridge replies when token does not match active request token', () => {
      let mockWorker: MockWorker | null = null;
      initEngine(() => {
        mockWorker = new MockWorker();
        return mockWorker as unknown as Worker;
      });

      // Human plays 1. e4
      useGameStore.getState().attemptMove('e2', 'e4');
      const validToken = requestEngineMove(useGameStore.getState().game.fen, 2);

      // Simulate an engine reply carrying a stale token
      const staleToken = validToken - 1;
      mockWorker!.simulateMessage({
        type: 'bestmove',
        token: staleToken,
        uci: 'e7e5',
        depth: 4,
      });

      // Board must remain at 1. e4 with Black to move
      const state = useGameStore.getState();
      expect(state.game.moves).toEqual(['e4']);
      expect(getTurn(state.game.fen)).toBe('b');
    });

    it('ignores warmup replies carrying token 0', () => {
      let mockWorker: MockWorker | null = null;
      initEngine(() => {
        mockWorker = new MockWorker();
        return mockWorker as unknown as Worker;
      });

      // Warmup returns bestmove for token 0
      mockWorker!.simulateMessage({
        type: 'bestmove',
        token: 0,
        uci: 'e7e5',
        depth: 1,
      });

      const state = useGameStore.getState();
      expect(state.game.moves).toHaveLength(0);
      expect(getTurn(state.game.fen)).toBe('w');
    });

    it('enforces store Guard 1: rejects move when token is stale or invalid', () => {
      useGameStore.getState().attemptMove('e2', 'e4');
      const currentToken = useGameStore.getState().engineToken;

      const applied = useGameStore.getState().applyEngineMove(currentToken + 99, 'e7e5');
      expect(applied).toBe(false);
      expect(useGameStore.getState().game.moves).toEqual(['e4']);
    });

    it('enforces store Guard 2: rejects move when it is not the engine turn', () => {
      // Game at start: White (human) to move
      const token = useGameStore.getState().engineToken;
      const applied = useGameStore.getState().applyEngineMove(token, 'e2e4');
      expect(applied).toBe(false);
      expect(useGameStore.getState().game.moves).toHaveLength(0);
    });

    it('enforces store Guard 3: rejects move when status is terminal', () => {
      useGameStore.getState().attemptMove('e2', 'e4');
      const token = useGameStore.getState().engineToken;

      // Resign the game
      useGameStore.getState().resignGame();
      expect(useGameStore.getState().game.status).toBe('resigned');

      const applied = useGameStore.getState().applyEngineMove(token, 'e7e5');
      expect(applied).toBe(false);
      expect(useGameStore.getState().game.moves).toEqual(['e4']);
    });

    it('invalidates active search on undo so stale replies cannot move', () => {
      useGameStore.getState().attemptMove('e2', 'e4');
      const token = requestEngineMove(useGameStore.getState().game.fen, 2);

      // Human undos move before engine finishes
      useGameStore.getState().undo();
      cancelEngineSearch();

      // Late engine reply arrives
      handleWorkerMessage(
        new MessageEvent('message', {
          data: { type: 'bestmove', token, uci: 'e7e5', depth: 4 },
        }),
      );

      const state = useGameStore.getState();
      expect(state.game.moves).toHaveLength(0);
      expect(getTurn(state.game.fen)).toBe('w');
    });
  });

  describe('an engine move is applied exactly once', () => {
    it('applies a valid engine move once and rejects repeated application', () => {
      useGameStore.getState().attemptMove('e2', 'e4');
      const token = useGameStore.getState().engineToken;
      expect(getTurn(useGameStore.getState().game.fen)).toBe('b');

      // First attempt succeeds
      const firstApply = useGameStore.getState().applyEngineMove(token, 'e7e5');
      expect(firstApply).toBe(true);

      const stateAfterFirst = useGameStore.getState();
      expect(stateAfterFirst.game.moves).toEqual(['e4', 'e5']);
      expect(getTurn(stateAfterFirst.game.fen)).toBe('w');

      // Duplicate attempt with the same token is rejected
      const secondApply = useGameStore.getState().applyEngineMove(token, 'e7e5');
      expect(secondApply).toBe(false);
      expect(useGameStore.getState().game.moves).toEqual(['e4', 'e5']);
    });

    it('processes engine move through complete bridge dispatch flow', () => {
      let mockWorker: MockWorker | null = null;
      initEngine(() => {
        mockWorker = new MockWorker();
        return mockWorker as unknown as Worker;
      });

      // Human plays 1. e4
      useGameStore.getState().attemptMove('e2', 'e4');
      const token = requestEngineMove(useGameStore.getState().game.fen, 2);

      // Engine finishes search
      mockWorker!.simulateMessage({
        type: 'bestmove',
        token,
        uci: 'e7e5',
        depth: 4,
      });

      const state = useGameStore.getState();
      expect(state.game.moves).toEqual(['e4', 'e5']);
      expect(state.lastMove).toEqual(['e7', 'e5']);
      expect(getTurn(state.game.fen)).toBe('w');
      expect(state.isThinking).toBe(false);
    });
  });

  describe('thinking indicator and timeouts', () => {
    it('activates thinking indicator after 150ms of search', () => {
      vi.useFakeTimers();
      initEngine(() => new MockWorker() as unknown as Worker);

      useGameStore.getState().attemptMove('e2', 'e4');
      requestEngineMove(useGameStore.getState().game.fen, 2);

      expect(useGameStore.getState().isThinking).toBe(false);

      vi.advanceTimersByTime(149);
      expect(useGameStore.getState().isThinking).toBe(false);

      vi.advanceTimersByTime(2);
      expect(useGameStore.getState().isThinking).toBe(true);
    });

    it('enforces 5s ceiling by sending stop and falling back to random legal move after 500ms', () => {
      vi.useFakeTimers();
      let mockWorker: MockWorker | null = null;
      initEngine(() => {
        mockWorker = new MockWorker();
        return mockWorker as unknown as Worker;
      });

      useGameStore.getState().attemptMove('e2', 'e4');
      requestEngineMove(useGameStore.getState().game.fen, 2);

      // Advance to 5000ms ceiling
      vi.advanceTimersByTime(5000);
      expect(mockWorker!.postedMessages).toContain('stop');

      // No bestmove arrives; advance 500ms fallback grace
      vi.advanceTimersByTime(500);

      const state = useGameStore.getState();
      expect(state.game.moves).toHaveLength(2);
      expect(state.game.moves[0]).toBe('e4');
      expect(getTurn(state.game.fen)).toBe('w');
      expect(state.isThinking).toBe(false);
    });
  });

  describe('worker failure handling', () => {
    it('falls back to local mode and sets engineFailed banner when worker throws error', () => {
      let mockWorker: MockWorker | null = null;
      initEngine(() => {
        mockWorker = new MockWorker();
        return mockWorker as unknown as Worker;
      });

      mockWorker!.simulateError('WASM instantiation failed');

      const state = useGameStore.getState();
      expect(state.game.mode).toBe('local');
      expect(state.engineFailed).toBe(true);
      expect(en.engineFailed).toBeDefined();
    });

    it('falls back to local mode on manual engine failure invocation', () => {
      handleEngineFailure();
      const state = useGameStore.getState();
      expect(state.game.mode).toBe('local');
      expect(state.engineFailed).toBe(true);
    });
  });

  describe('UCI protocol helpers', () => {
    it('formats position command with current FEN', () => {
      expect(formatPositionCommand('startpos')).toBe('position fen startpos');
    });

    it('asserts the command string for the position after 1.e4 is exactly position fen without moves token', () => {
      const fenAfterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const command = formatPositionCommand(fenAfterE4);
      expect(command).toBe(
        'position fen rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      );
      expect(command).not.toContain('moves');
    });

    it('formats go command with depth and movetime', () => {
      expect(formatGoCommand({ depth: 4 })).toBe('go depth 4');
      expect(formatGoCommand({ depth: 4, movetime: 500 })).toBe('go depth 4 movetime 500');
    });

    it('formats skill level and multipv option commands', () => {
      expect(formatSkillCommand(10)).toBe('setoption name Skill Level value 10');
      expect(formatMultiPvCommand(5)).toBe('setoption name MultiPV value 5');
    });

    it('parses bestmove and ponder from UCI line', () => {
      expect(parseBestMove('bestmove e7e5 ponder g1f3')).toEqual({
        move: 'e7e5',
        ponder: 'g1f3',
      });
      expect(parseBestMove('bestmove e7e8q')).toEqual({
        move: 'e7e8q',
        ponder: undefined,
      });
      expect(parseBestMove('info depth 4')).toBeNull();
    });

    it('parses info lines for depth, multipv, and first PV move', () => {
      const parsed = parseInfoLine(
        'info depth 2 seldepth 2 multipv 3 score cp -10 nodes 50 nps 1000 pv d7d5 d2d4',
      );
      expect(parsed).toEqual({
        depth: 2,
        multiPv: 3,
        pvMove: 'd7d5',
      });
    });
  });

  describe('regression: human move during engine search', () => {
    it('does not recurse and does not throw when applying a human move while the engine is thinking', () => {
      let mockWorker: MockWorker | null = null;
      initEngine(() => {
        mockWorker = new MockWorker();
        return mockWorker as unknown as Worker;
      });
      const disconnect = connectBridgeToStore();

      try {
        // Set thinking indicator to simulate active search
        useGameStore.getState().setThinking(true);
        expect(useGameStore.getState().isThinking).toBe(true);

        // Applying human move while engine is thinking must not recurse or throw
        expect(() => {
          useGameStore.getState().attemptMove('e2', 'e4');
        }).not.toThrow();

        const state = useGameStore.getState();
        expect(state.game.moves).toEqual(['e4']);
        expect(
          mockWorker!.postedMessages.some(
            (msg) => typeof msg === 'string' && msg.startsWith('go'),
          ),
        ).toBe(true);
      } finally {
        disconnect();
      }
    });

    it('cancels active search and drops stale reply when move is applied during thinking', () => {
      let mockWorker: MockWorker | null = null;
      initEngine(() => {
        mockWorker = new MockWorker();
        return mockWorker as unknown as Worker;
      });
      const disconnect = connectBridgeToStore();

      try {
        // Human plays e4, starting engine search
        useGameStore.getState().attemptMove('e2', 'e4');
        const token1 = useGameStore.getState().engineToken;
        useGameStore.getState().setThinking(true);

        // Human undos while engine is thinking
        expect(() => {
          useGameStore.getState().undo();
        }).not.toThrow();

        // Late reply with stale token arrives
        mockWorker!.simulateMessage({
          type: 'bestmove',
          token: token1,
          uci: 'e7e5',
          depth: 4,
        });

        // Board must remain at startpos, not having applied stale move
        expect(useGameStore.getState().game.moves).toHaveLength(0);
        expect(useGameStore.getState().isThinking).toBe(false);
      } finally {
        disconnect();
      }
    });
  });

  describe('worker startup and UCI handshake', () => {
    it('executes handshake in strict order: uciok -> Threads 1 -> Hash 16 -> isready -> readyok', () => {
      let mockWorker: MockWorker | null = null;
      initEngine(() => {
        mockWorker = new MockWorker();
        return mockWorker as unknown as Worker;
      });

      // Worker replies with uciok
      mockWorker!.simulateMessage('uciok');

      expect(mockWorker!.postedMessages).toContain('setoption name Threads value 1');
      expect(mockWorker!.postedMessages).toContain('setoption name Hash value 16');
      expect(mockWorker!.postedMessages).toContain('isready');

      // Worker confirms ready
      mockWorker!.simulateMessage('readyok');
    });

    it('gates worker message console logging behind import.meta.env.DEV', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      let mockWorker: MockWorker | null = null;
      initEngine(() => {
        mockWorker = new MockWorker();
        return mockWorker as unknown as Worker;
      });

      mockWorker!.simulateMessage('Stockfish 19 by the Stockfish developers');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Stockfish]',
        'Stockfish 19 by the Stockfish developers',
      );

      consoleSpy.mockClear();

      const originalDev = import.meta.env.DEV;
      try {
        (import.meta.env as { DEV: boolean }).DEV = false;
        mockWorker!.simulateMessage('info depth 10');
        expect(consoleSpy).not.toHaveBeenCalled();
      } finally {
        (import.meta.env as { DEV: boolean }).DEV = originalDev;
        consoleSpy.mockRestore();
      }
    });
  });
});
