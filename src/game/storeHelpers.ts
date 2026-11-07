// Pure helper functions for game store move and undo operations.
import { loadSavedSettings, saveGame, saveSettings } from '../lib/persist.ts';
import { createClockState, stopClock, switchClockTurn, tickClock } from './clock.ts';
import { syncPgnHeaders } from './pgn.ts';
import { rules } from './rules.ts';
import { createInitialGameState, createInitialUiState, getPliesToUndo, getResignWinner, getTurn, isGameOver, STARTING_FEN } from './selectors.ts';
import type { GameState, RejectionReason, Side, UiState } from './types.ts';

export interface MoveValidation {
  valid: boolean;
  reason?: RejectionReason;
  isPromotion?: boolean;
}

export function getInitialBootUiState(): UiState {
  const saved = typeof window !== 'undefined' ? loadSavedSettings() : null;
  const base = createInitialUiState();
  if (saved) {
    if (saved.theme) base.theme = saved.theme;
    if (typeof saved.soundOn === 'boolean') base.soundOn = saved.soundOn;
    if (typeof saved.animationOn === 'boolean') base.animationOn = saved.animationOn;
    if (typeof saved.showCoords === 'boolean') base.showCoords = saved.showCoords;
  }
  return base;
}

export function persistUiSettings(ui: UiState, delta: Partial<UiState>): UiState {
  const next = { ...ui, ...delta };
  saveSettings({
    theme: next.theme,
    soundOn: next.soundOn,
    animationOn: next.animationOn,
    showCoords: next.showCoords,
  });
  return next;
}

// Validates turn, piece presence, and target square legality before committing a move.
export function validateMoveIntent(
  game: GameState,
  ui: UiState,
  from: string,
  to: string,
  isEngine?: boolean,
): MoveValidation {
  const currentTurn = getTurn(game.fen);
  if (isGameOver(game.status) || ui.reviewPly !== null) {
    return { valid: false, reason: 'game-over' };
  }
  if (game.mode === 'computer') {
    if (isEngine && currentTurn === game.humanSide) return { valid: false, reason: 'wrong-turn' };
    if (!isEngine && currentTurn !== game.humanSide) return { valid: false, reason: 'wrong-turn' };
  }

  // Ensure rules instance matches current authoritative game position
  if (rules.fen() !== game.fen) {
    console.warn(`[Rules] Syncing rules instance before validation: ${game.fen}`);
    rules.reset(game.fen);
  }

  const piece = rules.getPiece(from);
  if (!piece || piece.color !== currentTurn) {
    return { valid: false, reason: 'wrong-turn' };
  }

  const legalTargets = rules.legalFrom(from);
  if (!legalTargets.includes(to)) {
    return { valid: false, reason: rules.getRejectionReason(from, to) };
  }

  const isPromotion =
    piece.type === 'p' &&
    ((piece.color === 'w' && to.endsWith('8')) || (piece.color === 'b' && to.endsWith('1')));

  return { valid: true, isPromotion };
}

// Executes a validated move through the rules engine and updates clock and PGN headers.
export function buildAppliedMoveState(
  game: GameState,
  from: string,
  to: string,
  promotion?: string,
): {
  nextGame: GameState;
  san: string;
  uci: string;
  sideLabel: string;
} {
  const currentTurn = getTurn(game.fen);
  if (rules.fen() !== game.fen) {
    console.warn(`[Rules] Syncing rules instance before apply: ${game.fen}`);
    rules.reset(game.fen);
  }

  const result = rules.apply(from, to, promotion);
  const sideLabel = currentTurn === 'w' ? 'White' : 'Black';
  syncPgnHeaders({
    mode: game.mode,
    humanSide: game.humanSide,
    status: result.status,
    winner: result.winner,
  });

  const nextTurn = getTurn(result.fen);
  const nextClock = isGameOver(result.status)
    ? stopClock(game.clock)
    : switchClockTurn(game.clock, nextTurn);

  const nextGame: GameState = {
    ...game,
    fen: result.fen,
    status: result.status,
    winner: result.winner,
    moves: [...game.moves, result.san],
    uciMoves: [...game.uciMoves, result.uci],
    pgn: rules.pgn(),
    clock: nextClock,
    savedAt: Date.now(),
  };

  // Assert FEN consistency: rules instance FEN must exactly match nextGame.fen
  if (nextGame.fen !== rules.fen()) {
    console.error(
      `[FATAL] FEN divergence after apply! nextGame.fen="${nextGame.fen}", rules.fen="${rules.fen()}"`,
    );
  }

  return { nextGame, san: result.san, uci: result.uci, sideLabel };
}

// Handles timeout flag when clock expires for active side.
export function handleClockFlag(game: GameState, flagged: Side): GameState {
  const winner: Side = flagged === 'w' ? 'b' : 'w';
  syncPgnHeaders({
    mode: game.mode,
    humanSide: game.humanSide,
    status: 'timeout',
    winner,
  });
  return {
    ...game,
    status: 'timeout',
    winner,
    clock: game.clock ? { ...game.clock, running: null } : null,
    pgn: rules.pgn(),
    savedAt: Date.now(),
  };
}

// Reverts plies by replaying surviving move history in rules engine from start.
export function executeUndoPlies(game: GameState): {
  fen: string;
  status: GameState['status'];
  winner: Side | null;
  moves: string[];
  uciMoves: string[];
  pgn: string;
  lastMove: [string, string] | null;
} {
  const plies = getPliesToUndo(game);
  const moves = game.moves.slice(0, game.moves.length - plies);
  const uciMoves = game.uciMoves.slice(0, game.uciMoves.length - plies);

  rules.reset();
  for (const move of moves) {
    rules.apply(move);
  }

  const cur = rules.status();
  syncPgnHeaders({
    mode: game.mode,
    humanSide: game.humanSide,
    status: cur.status,
    winner: cur.winner,
  });
  const last = uciMoves[uciMoves.length - 1];
  const lastMove: [string, string] | null = last ? [last.slice(0, 2), last.slice(2, 4)] : null;

  return {
    fen: rules.fen(),
    status: cur.status,
    winner: cur.winner,
    moves,
    uciMoves,
    pgn: rules.pgn(),
    lastMove,
  };
}

export function buildResignedGameState(game: GameState): GameState {
  const winner = getResignWinner(game);
  syncPgnHeaders({ mode: game.mode, humanSide: game.humanSide, status: 'resigned', winner });
  return {
    ...game,
    status: 'resigned',
    winner,
    pgn: rules.pgn(),
    clock: stopClock(game.clock),
    savedAt: Date.now(),
  };
}

export function buildRestoredGameState(savedGame: GameState, now: number = Date.now()): { game: GameState; lastMove: [string, string] | null } {
  if (savedGame.moves.length > 0) {
    rules.reset();
    for (const move of savedGame.moves) rules.apply(move);
  } else {
    rules.reset(savedGame.fen);
  }
  syncPgnHeaders(savedGame);
  const clock = savedGame.clock ? { ...savedGame.clock, lastTickAt: savedGame.clock.running ? now : null } : null;
  const lastUci = savedGame.uciMoves[savedGame.uciMoves.length - 1];
  return {
    game: { ...savedGame, clock, pgn: rules.pgn() },
    lastMove: lastUci ? [lastUci.slice(0, 2), lastUci.slice(2, 4)] : null,
  };
}

export function buildFreshGameState(fen?: string, overrides?: Partial<GameState>): GameState {
  const targetFen = (fen ?? STARTING_FEN).trim();
  rules.reset(targetFen);
  const initial = { ...createInitialGameState(targetFen), ...overrides };
  syncPgnHeaders(initial);
  return initial;
}

export function executeClockTick(game: GameState, now: number = Date.now()): { updatedGame: GameState | null; flagged: boolean } {
  if (!game.clock || !game.clock.running || isGameOver(game.status)) return { updatedGame: null, flagged: false };
  const { clock, flagged } = tickClock(game.clock, now);
  if (flagged) {
    const flaggedGame = handleClockFlag({ ...game, clock }, flagged);
    saveGame(flaggedGame);
    return { updatedGame: flaggedGame, flagged: true };
  }
  return { updatedGame: clock ? { ...game, clock } : null, flagged: false };
}

export function toggleClockEnabled(game: GameState, ui: UiState, enabled: boolean): GameState {
  const turn = getTurn(game.fen);
  const clock = enabled ? createClockState(turn) : null;
  saveSettings({
    theme: ui.theme, soundOn: ui.soundOn, animationOn: ui.animationOn,
    showCoords: ui.showCoords, clockEnabled: enabled,
  });
  return { ...game, clock };
}
