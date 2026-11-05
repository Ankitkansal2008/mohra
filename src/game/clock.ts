import type { ClockState, Side } from './types.ts';

// PRD FR-18: Default time control is 10 minutes (600,000 ms) per side, off by default.
export const DEFAULT_CLOCK_MS = 10 * 60 * 1000;

export function createClockState(running: Side | null = null, initialMs: number = DEFAULT_CLOCK_MS): ClockState {
  return {
    whiteMs: initialMs,
    blackMs: initialMs,
    running,
    lastTickAt: running ? Date.now() : null,
  };
}

// Advances the active clock by elapsed time since last tick; flags if time hits zero.
export function tickClock(
  clock: ClockState | null,
  now: number = Date.now(),
): { clock: ClockState | null; flagged: Side | null } {
  if (!clock || !clock.running || clock.lastTickAt === null) {
    return { clock, flagged: null };
  }

  const elapsed = Math.max(0, now - clock.lastTickAt);
  if (clock.running === 'w') {
    const nextWhite = clock.whiteMs - elapsed;
    if (nextWhite <= 0) {
      return {
        clock: { ...clock, whiteMs: 0, running: null, lastTickAt: now },
        flagged: 'w',
      };
    }
    return {
      clock: { ...clock, whiteMs: nextWhite, lastTickAt: now },
      flagged: null,
    };
  }

  const nextBlack = clock.blackMs - elapsed;
  if (nextBlack <= 0) {
    return {
      clock: { ...clock, blackMs: 0, running: null, lastTickAt: now },
      flagged: 'b',
    };
  }
  return {
    clock: { ...clock, blackMs: nextBlack, lastTickAt: now },
    flagged: null,
  };
}

// Hands the active clock to the next turn, deducting elapsed time from the completed move.
export function switchClockTurn(
  clock: ClockState | null,
  nextTurn: Side,
  now: number = Date.now(),
): ClockState | null {
  if (!clock) {
    return null;
  }
  const { clock: updatedClock, flagged } = tickClock(clock, now);
  if (!updatedClock || flagged) {
    return updatedClock;
  }
  return {
    ...updatedClock,
    running: nextTurn,
    lastTickAt: now,
  };
}

export function stopClock(clock: ClockState | null): ClockState | null {
  if (!clock) return null;
  return { ...clock, running: null, lastTickAt: null };
}
