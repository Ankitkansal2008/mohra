import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResumeBanner } from '../../src/components/Panels/ResumeBanner.tsx';
import { useGameStore } from '../../src/game/store.ts';
import type { GameState, GameStatus } from '../../src/game/types.ts';
import {
  CURRENT_SCHEMA_VERSION,
  STORAGE_KEY_GAME,
  clearSavedGame,
  formatResumeLabel,
  loadSavedGame,
  saveGame,
} from '../../src/lib/persist.ts';

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

function createMockGame(overrides: Partial<GameState> = {}): GameState {
  return {
    id: 'test-game',
    fen: STARTING_FEN,
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
  };
}

describe('Saved game restore and resume banner behavior', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useGameStore.getState().resetGame();
  });

  describe('1. Terminal game handling', () => {
    const terminalStatuses: GameStatus[] = [
      'checkmate',
      'stalemate',
      'draw-repetition',
      'draw-fifty',
      'draw-material',
      'resigned',
      'timeout',
    ];

    it.each(terminalStatuses)(
      'saved terminal game with status "%s" is never offered and clears storage',
      (status) => {
        const terminalGame = createMockGame({
          status,
          moves: ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#'],
          fen: 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4',
          winner: 'w',
        });

        // Directly seed storage with terminal game
        localStorageMock.setItem(
          STORAGE_KEY_GAME,
          JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, game: terminalGame }),
        );

        // loadSavedGame must clear storage and return null
        const loaded = loadSavedGame();
        expect(loaded).toBeNull();
        expect(localStorageMock.getItem(STORAGE_KEY_GAME)).toBeNull();
      },
    );

    it('saveGame refuses to store a terminal game and clears storage immediately', () => {
      const finishedGame = createMockGame({
        status: 'checkmate',
        winner: 'b',
        moves: ['f3', 'e5', 'g4', 'Qh4#'],
      });

      saveGame(finishedGame);
      expect(localStorageMock.getItem(STORAGE_KEY_GAME)).toBeNull();
      expect(loadSavedGame()).toBeNull();
    });
  });

  describe('2. Banner text comes strictly from saved game state, not live store', () => {
    it('derives turn and move count from saved game state', () => {
      // Live store is at starting position (White to move)
      expect(useGameStore.getState().game.moves).toEqual([]);

      // Saved game is after 1. e4 (Black to move)
      const inProgressSave = createMockGame({
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        moves: ['e4'],
        savedAt: Date.now() - 60_000,
      });

      // Banner text reflects Black to move from save, NOT White to move from live board
      const label = formatResumeLabel(inProgressSave);
      expect(label).toBe('Resume game - Black to move, move 1');
    });
  });

  describe('3. In-progress game leaves board untouched until Resume is pressed', () => {
    it('renders resume banner while keeping the live board at starting position', () => {
      const inProgressSave = createMockGame({
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        moves: ['e4'],
        savedAt: Date.now() - 60_000,
      });

      const onDismiss = vi.fn();
      const html = renderToStaticMarkup(
        React.createElement(ResumeBanner, {
          savedGame: inProgressSave,
          onDismiss,
        }),
      );

      // Banner displays resume invitation with correct save metadata
      expect(html).toContain('Resume game - Black to move, move 1');
      expect(html).toContain('class="gambit-btn-resume"');
      expect(html).toContain('class="gambit-btn-discard"');

      // Crucial: The live store remains untouched at starting position
      const liveState = useGameStore.getState();
      expect(liveState.game.moves).toEqual([]);
      expect(liveState.game.fen).toBe(STARTING_FEN);
      expect(liveState.game.status).toBe('playing');
    });

    it('restores saved game into the store only when Resume is clicked', () => {
      const inProgressSave = createMockGame({
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        moves: ['e4'],
        savedAt: Date.now() - 60_000,
      });

      const onDismiss = vi.fn();
      const element = ResumeBanner({
        savedGame: inProgressSave,
        onDismiss,
      });

      // Board is untouched before clicking Resume
      expect(useGameStore.getState().game.moves).toEqual([]);

      // Click Resume
      const actionsDiv = element.props.children[1];
      const [resumeBtn] = actionsDiv.props.children;
      resumeBtn.props.onClick();

      // Now live store has restored the saved game
      expect(useGameStore.getState().game.moves).toEqual(['e4']);
      expect(useGameStore.getState().game.fen).toBe(inProgressSave.fen);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('clears storage and keeps board fresh when Discard is clicked', () => {
      const inProgressSave = createMockGame({
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        moves: ['e4'],
        savedAt: Date.now() - 60_000,
      });

      saveGame(inProgressSave);
      expect(localStorageMock.getItem(STORAGE_KEY_GAME)).not.toBeNull();

      const onDismiss = vi.fn();
      const element = ResumeBanner({
        savedGame: inProgressSave,
        onDismiss,
      });

      // Click Discard
      const actionsDiv = element.props.children[1];
      const [, discardBtn] = actionsDiv.props.children;
      discardBtn.props.onClick();

      // Storage cleared, store stays fresh at starting position
      expect(localStorageMock.getItem(STORAGE_KEY_GAME)).toBeNull();
      expect(useGameStore.getState().game.moves).toEqual([]);
      expect(useGameStore.getState().game.fen).toBe(STARTING_FEN);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });
});
