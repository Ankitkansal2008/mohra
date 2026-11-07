import { create } from 'zustand';
import { en } from '../copy/en.ts';
import { track } from '../lib/analytics.ts';
import { clearSavedGame, loadSavedSettings, saveGame, saveGameDebounced, saveSettings } from '../lib/persist.ts';
import { playMoveSound, playSound, resolveGameEndOutcome, setReviewingProvider } from '../lib/sound.ts';
import { createClockState, DEFAULT_CLOCK_MS } from './clock.ts';
import { emitGameEvent } from './events.ts';
import { rules } from './rules.ts';
import { canUndo, createInitialGameState, getRejectionMessage, getTurn, isGameOver, STARTING_FEN } from './selectors.ts';
import {
  buildAppliedMoveState, buildFreshGameState, buildResignedGameState, buildRestoredGameState,
  executeClockTick, executeUndoPlies, getInitialBootUiState, persistUiSettings, toggleClockEnabled, validateMoveIntent,
} from './storeHelpers.ts';
import type { GameState, GameStoreState, Level, NewGameOptions, RejectionReason } from './types.ts';

export { STARTING_FEN, canUndo, getPliesToUndo, getRejectionMessage, getTurn, isCheck, isGameOver } from './selectors.ts';
export type { GameStoreState, NewGameOptions } from './types.ts';

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function trackGameEnded(game: GameState): void {
  const result: 'win' | 'loss' | 'draw' = !game.winner ? 'draw' : game.winner === game.humanSide ? 'win' : 'loss';
  track('game_ended', { result, reason: game.status, plies: game.moves.length });
}

export const useGameStoreBase = create<GameStoreState>((set, get) => ({
  game: createInitialGameState(), clock: null, ui: getInitialBootUiState(), toast: null,
  lastMove: null, announcedMove: null, engineToken: 0, isThinking: false, engineFailed: false,

  attemptMove: (from: string, to?: string, promotion?: string, isEngine?: boolean): boolean => {
    let resolvedFrom = from;
    let resolvedTo = to;
    let resolvedPromotion = promotion;

    if (!resolvedTo) {
      const legal = rules.findLegalMove(from);
      if (!legal) {
        console.warn(`[Move] Rejected illegal move: ${from}`);
        get().setRejectionToast('illegal-shape');
        return false;
      }
      resolvedFrom = legal.from;
      resolvedTo = legal.to;
      resolvedPromotion = legal.promotion;
    }

    const state = get();
    const check = validateMoveIntent(state.game, state.ui, resolvedFrom, resolvedTo, isEngine);
    if (!check.valid) {
      console.warn(`[Move] Rejected move ${resolvedFrom}->${resolvedTo}:`, check.reason);
      if (check.reason && check.reason !== 'game-over') get().setRejectionToast(check.reason);
      set((s) => ({ ui: { ...s.ui, selected: null, targets: [] } }));
      return false;
    }
    if (check.isPromotion && !resolvedPromotion) {
      set((s) => ({ ui: { ...s.ui, pendingPromotion: { from: resolvedFrom, to: resolvedTo! }, selected: null, targets: [] } }));
      return false;
    }

    try {
      const currentClock = state.clock ?? state.game.clock;
      const { nextGame, san, sideLabel } = buildAppliedMoveState(state.game, resolvedFrom, resolvedTo, resolvedPromotion, currentClock);

      if (nextGame.fen !== rules.fen()) {
        console.error(`[FATAL] FEN divergence detected! nextGame="${nextGame.fen}", rules="${rules.fen()}"`);
      }

      playMoveSound(san, nextGame.status, state.ui.soundOn, nextGame);
      saveGameDebounced(nextGame);
      if (isGameOver(nextGame.status) && !isGameOver(state.game.status)) trackGameEnded(nextGame);

      set((s) => ({
        game: nextGame, clock: nextGame.clock,
        ui: { ...s.ui, selected: null, targets: [], pendingPromotion: null },
        lastMove: [resolvedFrom, resolvedTo!], announcedMove: `${sideLabel} plays ${san}`,
        engineToken: isEngine ? s.engineToken : s.engineToken + 1, isThinking: false,
      }));

      if (!isEngine) {
        emitGameEvent({ type: 'human-move', fen: nextGame.fen, level: state.game.level, uciMoves: nextGame.uciMoves });
      }
      return true;
    } catch (err: unknown) {
      console.error(`[Move] Error applying move ${resolvedFrom}->${resolvedTo}:`, err);
      get().setRejectionToast('illegal-shape');
      set((s) => ({ ui: { ...s.ui, selected: null, targets: [] } }));
      return false;
    }
  },

  applyEngineMove: (token: number, uci: string): boolean => {
    const state = get();
    if (state.ui.reviewPly !== null || token !== state.engineToken) return false;
    const turn = getTurn(state.game.fen);
    if (state.game.mode !== 'computer' || turn === state.game.humanSide) return false;
    if (state.game.status !== 'playing' && state.game.status !== 'check') return false;

    set((s) => ({ engineToken: s.engineToken + 1, isThinking: false }));
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
    return get().attemptMove(from, to, promotion, true);
  },

  setThinking: (isThinking: boolean) => set({ isThinking }),
  setEngineFailed: (failed: boolean) => set((s) => ({ engineFailed: failed, isThinking: false, game: failed ? { ...s.game, mode: 'local' } : s.game })),
  setEngineToken: (engineToken: number) => set({ engineToken }),
  requestEngineToken: (): number => { const next = get().engineToken + 1; set({ engineToken: next }); return next; },
  setLevel: (level: Level): void => {
    saveSettings({ ...loadSavedSettings(), level });
    set((s) => ({ game: { ...s.game, level } }));
    emitGameEvent({ type: 'level-change', level });
  },

  selectSquare: (square: string): void => {
    const state = get();
    if (isGameOver(state.game.status) || state.ui.reviewPly !== null) return;
    const turn = getTurn(state.game.fen);
    if (state.game.mode === 'computer' && turn !== state.game.humanSide) return;
    rules.syncTo(state.game.fen);
    const piece = rules.getPiece(square);
    if (state.ui.selected === square) return get().clearSelection();
    if (state.ui.selected && (!piece || piece.color !== turn)) return void get().attemptMove(state.ui.selected, square);
    if (piece && piece.color === turn) set((s) => ({ ui: { ...s.ui, selected: square, targets: rules.legalFrom(square) } }));
    else get().clearSelection();
  },

  clearSelection: () => set((s) => ({ ui: { ...s.ui, selected: null, targets: [] } })),
  cancelPromotion: () => set((s) => ({ ui: { ...s.ui, pendingPromotion: null, selected: null, targets: [] } })),
  confirmPromotion: (piece) =>
    get().ui.pendingPromotion ? get().attemptMove(get().ui.pendingPromotion!.from, get().ui.pendingPromotion!.to, piece) : false,
  showToast: (message: string, reason?: RejectionReason, type?: 'notify' | 'refuse'): void => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: { id: String(Date.now()), message, ...(reason ? { reason } : {}) } });
    toastTimer = setTimeout(() => get().dismissToast(), 3000);
    const soundOn = get().ui.soundOn;
    if (reason && reason !== 'wrong-turn') playSound('refuse', soundOn);
    else if (!reason && (type === 'notify' || message === en.pgnCopied || message === en.linkCopied)) playSound('notify', soundOn);
    else if (type === 'refuse') playSound('refuse', soundOn);
  },
  setRejectionToast: (reason: RejectionReason) => get().showToast(getRejectionMessage(reason), reason),
  dismissToast: () => { if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; } set({ toast: null }); },

  resetGame: (customFen?: string): void => {
    const initial = buildFreshGameState(customFen);
    clearSavedGame();
    set((s) => ({
      game: initial, clock: null, ui: { ...s.ui, reviewPly: null, selected: null, targets: [] },
      toast: null, lastMove: null, announcedMove: null, engineToken: s.engineToken + 1, isThinking: false, engineFailed: false,
    }));
    emitGameEvent({ type: 'new-game', fen: initial.fen, level: initial.level, uciMoves: initial.uciMoves });
  },

  rematch: (): void => {
    const cur = get().game;
    const curClock = get().clock ?? cur.clock;
    const ms = curClock ? (curClock.initialMs ?? DEFAULT_CLOCK_MS) : null;
    get().startNewGame({ mode: cur.mode, humanSide: cur.humanSide, level: cur.level, clockEnabled: curClock !== null, timeControlMs: ms });
  },

  startNewGame: (options?: NewGameOptions): void => {
    const mode = options?.mode ?? 'computer';
    const humanSide = options?.humanSide ?? 'w';
    const level = options?.level ?? 2;
    const ms = options?.timeControlMs !== undefined ? options.timeControlMs : (options?.clockEnabled ? DEFAULT_CLOCK_MS : null);
    const clock = ms !== null ? createClockState('w', ms) : null;
    const initial = buildFreshGameState(STARTING_FEN, { mode, humanSide, level, clock });
    clearSavedGame();
    set((s) => ({
      game: initial, clock, ui: { ...s.ui, reviewPly: null, selected: null, targets: [], flipped: humanSide === 'b' },
      toast: null, lastMove: null, announcedMove: null, engineToken: s.engineToken + 1, isThinking: false, engineFailed: false,
    }));
    emitGameEvent({ type: 'new-game', fen: initial.fen, level: initial.level, uciMoves: initial.uciMoves });
    track('game_started', { mode, level, colour: humanSide === 'b' ? 'black' : 'white' });
  },

  loadFen: (fen: string): boolean => {
    const trimmed = fen.trim();
    try { rules.reset(trimmed); } catch { rules.reset(get().game.fen); get().showToast(en.invalidPosition); return false; }
    const { mode, humanSide, level } = get().game;
    const newGame = buildFreshGameState(trimmed, { mode, humanSide, level });
    clearSavedGame();
    set((s) => ({ game: newGame, clock: null, ui: { ...s.ui, reviewPly: null, selected: null, targets: [] }, toast: null, lastMove: null, announcedMove: null, engineToken: s.engineToken + 1, isThinking: false }));
    emitGameEvent({ type: 'new-game', fen: newGame.fen, level: newGame.level, uciMoves: newGame.uciMoves });
    return true;
  },

  undo: (): boolean => {
    const state = get();
    if (!canUndo(state.game)) { get().showToast(en.undoStart); return false; }
    const undone = executeUndoPlies(state.game);
    const nextGame = { ...state.game, ...undone, savedAt: Date.now() };
    saveGameDebounced(nextGame);
    set((s) => ({ game: nextGame, ui: { ...s.ui, selected: null, targets: [], pendingPromotion: null, reviewPly: null }, lastMove: undone.lastMove, announcedMove: null, engineToken: s.engineToken + 1, isThinking: false }));
    emitGameEvent({ type: 'undo' });
    return true;
  },

  resignGame: (): void => {
    const state = get();
    if (isGameOver(state.game.status)) return;
    const resignedGame = buildResignedGameState(state.game);
    playSound('gameEnd', state.ui.soundOn, state.game.mode === 'computer' ? 'loss' : 'win');
    saveGame(resignedGame);
    trackGameEnded(resignedGame);
    set((s) => ({ game: resignedGame, clock: resignedGame.clock, ui: { ...s.ui, selected: null, targets: [], pendingPromotion: null }, announcedMove: null, engineToken: s.engineToken + 1, isThinking: false }));
  },

  toggleFlip: () => set((s) => ({ ui: { ...s.ui, flipped: !s.ui.flipped } })),
  setReviewPly: (ply: number | null) => set((s) => ({ ui: { ...s.ui, reviewPly: ply, selected: null, targets: [] } })),

  tickClock: (now: number = Date.now()): void => {
    const state = get();
    const { updatedGame, updatedClock, flagged } = executeClockTick(state.game, state.clock, now);
    if (!updatedClock) return;
    if (flagged && updatedGame) {
      playSound('gameEnd', state.ui.soundOn, resolveGameEndOutcome(updatedGame));
      trackGameEnded(updatedGame);
      set({ game: updatedGame, clock: updatedClock });
    } else set({ clock: updatedClock });
  },

  setTheme: (theme) => set((s) => ({ ui: persistUiSettings(s.ui, { theme }) })), setSoundOn: (soundOn) => set((s) => ({ ui: persistUiSettings(s.ui, { soundOn }) })),
  setAnimationOn: (animationOn) => set((s) => ({ ui: persistUiSettings(s.ui, { animationOn }) })), setShowCoords: (showCoords) => set((s) => ({ ui: persistUiSettings(s.ui, { showCoords }) })),
  setClockEnabled: (enabled) => set((s) => { const nextGame = toggleClockEnabled(s.game, s.ui, enabled); return { game: nextGame, clock: nextGame.clock }; }),

  restoreGame: (savedGame: GameState) => {
    const { game, lastMove } = buildRestoredGameState(savedGame);
    set((s) => ({ game, clock: game.clock, ui: { ...s.ui, reviewPly: null, selected: null, targets: [] }, lastMove, engineToken: s.engineToken + 1, isThinking: false }));
    emitGameEvent({ type: 'restored', fen: game.fen, level: game.level, uciMoves: game.uciMoves });
  },
}));

setReviewingProvider(() => isGameOver(useGameStoreBase.getState().game.status) && useGameStoreBase.getState().ui.reviewPly !== null);

export const useGameStore = Object.assign(
  <U = GameStoreState>(selector?: (state: GameStoreState) => U): U =>
    typeof window === 'undefined'
      ? (selector ? selector(useGameStoreBase.getState()) : (useGameStoreBase.getState() as unknown as U))
      : useGameStoreBase(selector as (state: GameStoreState) => U),
  useGameStoreBase,
);

export default useGameStore;
