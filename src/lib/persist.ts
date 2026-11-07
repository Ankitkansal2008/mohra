import { en } from '../copy/en.ts';
import { getTurn, isGameOver } from '../game/selectors.ts';
import type { GameState, Level, UiState } from '../game/types.ts';

export const STORAGE_KEY_GAME = 'mohra:game:v1';
export const STORAGE_KEY_SETTINGS = 'mohra:settings:v1';
export const CURRENT_SCHEMA_VERSION = 1;
export const MAX_RESUME_AGE_MS = 24 * 60 * 60 * 1000;

export interface PersistedGameEnvelope {
  schemaVersion: number;
  game: GameState;
}

export interface PersistedSettings {
  schemaVersion: number;
  theme: 'default' | 'slate';
  soundOn: boolean;
  animationOn: boolean;
  showCoords: boolean;
  level?: Level;
  clockEnabled?: boolean;
  timeControlMs?: number | null;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function isSaveUnder24Hours(savedAt: number, now: number = Date.now()): boolean {
  return now - savedAt < MAX_RESUME_AGE_MS;
}

export function formatResumeLabel(game: GameState): string {
  const turn = getTurn(game.fen);
  const turnLabel = turn === 'w' ? en.white : en.black;
  const moveNumber = Math.floor(game.moves.length / 2) + 1;
  return en.resumeGame
    .replace('{turn}', turnLabel)
    .replace('{move}', String(moveNumber));
}

function isValidGameState(obj: unknown): obj is GameState {
  if (!obj || typeof obj !== 'object') return false;
  const candidate = obj as Record<string, unknown>;
  return (
    typeof candidate.fen === 'string' &&
    Array.isArray(candidate.moves) &&
    Array.isArray(candidate.uciMoves) &&
    typeof candidate.mode === 'string' &&
    typeof candidate.savedAt === 'number'
  );
}

export function saveGame(game: GameState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  // Finished games must not be offered for resume; clean storage immediately.
  if (isGameOver(game.status)) {
    clearSavedGame();
    return;
  }
  try {
    const envelope: PersistedGameEnvelope = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      game,
    };
    window.localStorage.setItem(STORAGE_KEY_GAME, JSON.stringify(envelope));
  } catch {
    // QuotaExceeded or disabled storage handled silently per TRD Section 8
  }
}

// PRD FR-21 / TRD Section 8: Written debounced 400 ms after each move.
export function saveGameDebounced(game: GameState, delayMs: number = 400): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    saveGame(game);
  }, delayMs);
}

export function cancelDebouncedSave(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

export function loadSavedGame(): GameState | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_GAME);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      clearSavedGame();
      return null;
    }

    const envelope = parsed as Record<string, unknown>;
    if (envelope.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      clearSavedGame();
      return null;
    }

    const game = envelope.game;
    if (!isValidGameState(game)) {
      clearSavedGame();
      return null;
    }

    // Only in-progress games may be resumed; terminal games must be cleared silently.
    if (isGameOver(game.status)) {
      clearSavedGame();
      return null;
    }

    return game;
  } catch {
    clearSavedGame();
    return null;
  }
}

export function clearSavedGame(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY_GAME);
  } catch {}
}

export function saveSettings(settings: Partial<Omit<PersistedSettings, 'schemaVersion'>>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const existing = loadSavedSettings() ?? {};
    const envelope: PersistedSettings = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      theme: 'default',
      soundOn: false,
      animationOn: true,
      showCoords: true,
      ...existing,
      ...settings,
    };
    window.localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(envelope));
  } catch {}
}

export function loadSavedSettings(): (Partial<UiState> & {
  level?: Level;
  clockEnabled?: boolean;
  timeControlMs?: number | null;
}) | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      return null;
    }
    return {
      theme: parsed.theme === 'slate' ? 'slate' : 'default',
      soundOn: typeof parsed.soundOn === 'boolean' ? parsed.soundOn : false,
      animationOn: typeof parsed.animationOn === 'boolean' ? parsed.animationOn : true,
      showCoords: typeof parsed.showCoords === 'boolean' ? parsed.showCoords : true,
      ...(typeof parsed.level === 'number' ? { level: parsed.level as Level } : {}),
      ...(typeof parsed.clockEnabled === 'boolean' ? { clockEnabled: parsed.clockEnabled } : {}),
      ...(parsed.timeControlMs === null || typeof parsed.timeControlMs === 'number'
        ? { timeControlMs: parsed.timeControlMs as number | null }
        : {}),
    };
  } catch {
    return null;
  }
}
