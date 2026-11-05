// Bridge orchestrating the Web Worker engine lifecycle, tokens, and move timeouts.
import { rules } from '../game/rules.ts';
import { STARTING_FEN, getTurn, isGameOver } from '../game/selectors.ts';
import { useGameStore } from '../game/store.ts';
import type { Level } from '../game/types.ts';
import type { WorkerInMessage, WorkerOutMessage } from './worker.ts';

let worker: Worker | null = null;
let activeToken = 0;
let isInitialized = false;

let thinkingTimeout: ReturnType<typeof setTimeout> | null = null;
let ceilingTimeout: ReturnType<typeof setTimeout> | null = null;
let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;

function clearAllTimers(): void {
  if (thinkingTimeout) { clearTimeout(thinkingTimeout); thinkingTimeout = null; }
  if (ceilingTimeout) { clearTimeout(ceilingTimeout); ceilingTimeout = null; }
  if (fallbackTimeout) { clearTimeout(fallbackTimeout); fallbackTimeout = null; }
}

// Fallback to random legal move when engine fails to reply after 5s ceiling and 500ms grace.
function playFallbackMove(token: number): void {
  clearAllTimers();
  useGameStore.getState().setThinking(false);
  rules.reset(useGameStore.getState().game.fen);
  const legal = rules.legalMovesAll();
  if (legal.length === 0) return;

  const pick = legal[Math.floor(Math.random() * legal.length)];
  if (!pick) return;
  const uci = `${pick.from}${pick.to}${pick.promotion ?? ''}`;
  useGameStore.getState().applyEngineMove(token, uci);
}

// Handle engine failure by cleaning up, falling back to local mode, and showing the error banner.
export function handleEngineFailure(): void {
  clearAllTimers();
  if (worker) {
    try { worker.terminate(); } catch {}
    worker = null;
  }
  isInitialized = false;
  useGameStore.getState().setEngineFailed(true);
}

// Processes messages coming from the Stockfish Web Worker.
export function handleWorkerMessage(e: MessageEvent<WorkerOutMessage>): void {
  const msg = e.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'error') {
    handleEngineFailure();
    return;
  }

  if (msg.type === 'bestmove') {
    // Protocol ownership: any reply with a stale token (or warmup token 0) is dropped.
    if (msg.token !== activeToken || msg.token === 0) {
      return;
    }

    clearAllTimers();
    useGameStore.getState().setThinking(false);
    useGameStore.getState().applyEngineMove(msg.token, msg.uci);
  }
}

// Dispatches a move request with incrementing token, 150ms thinking delay, and 5s hard ceiling.
export function requestEngineMove(fen: string, level: Level, uciMoves?: string[]): number {
  clearAllTimers();
  activeToken += 1;
  const token = activeToken;
  useGameStore.getState().setEngineToken(token);

  // Show thinking indicator after 150ms of search so fast moves do not flicker
  thinkingTimeout = setTimeout(() => {
    if (token === activeToken) {
      useGameStore.getState().setThinking(true);
    }
  }, 150);

  // Hard 5-second ceiling: send stop, wait 500ms for bestmove, then play random legal move
  ceilingTimeout = setTimeout(() => {
    if (token !== activeToken) return;
    worker?.postMessage({ type: 'stop' } satisfies WorkerInMessage);

    fallbackTimeout = setTimeout(() => {
      if (token !== activeToken) return;
      playFallbackMove(token);
    }, 500);
  }, 5000);

  worker?.postMessage({
    type: 'go',
    token,
    level,
    fen,
    uciMoves,
  } satisfies WorkerInMessage);

  return token;
}

// Cancels the active search, invalidates token in store, and stops timers.
export function cancelEngineSearch(): void {
  clearAllTimers();
  if (worker) {
    worker.postMessage({ type: 'stop' } satisfies WorkerInMessage);
  }
  activeToken += 1;
  useGameStore.getState().setThinking(false);
  useGameStore.getState().setEngineToken(activeToken);
}

// Initialise the worker on idle after first paint, not at load, and warm it up with depth-1 search.
export function initEngine(workerFactory?: () => Worker): void {
  if (isInitialized && worker) return;

  const start = (): void => {
    try {
      worker = workerFactory
        ? workerFactory()
        : new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = handleWorkerMessage;
      worker.onerror = () => handleEngineFailure();

      worker.postMessage({ type: 'init' } satisfies WorkerInMessage);
      // Warm up with depth-1 search during idle period
      worker.postMessage({
        type: 'go',
        token: 0,
        level: 1,
        fen: STARTING_FEN,
        uciMoves: [],
      } satisfies WorkerInMessage);
      isInitialized = true;
    } catch {
      handleEngineFailure();
    }
  };

  if (workerFactory || typeof window === 'undefined') {
    start();
  } else {
    window.requestAnimationFrame(() => {
      const scheduleIdle = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1));
      scheduleIdle(start);
    });
  }
}

// Connects the bridge reactively to store state changes.
export function connectBridgeToStore(): () => void {
  let prevFen = useGameStore.getState().game.fen;
  let prevTurn = getTurn(prevFen);
  let prevMode = useGameStore.getState().game.mode;

  return useGameStore.subscribe((state) => {
    const turn = getTurn(state.game.fen);
    const isEngineTurn =
      state.game.mode === 'computer' &&
      turn !== state.game.humanSide &&
      (state.game.status === 'playing' || state.game.status === 'check') &&
      state.ui.reviewPly === null;

    if (isEngineTurn) {
      if (state.game.fen !== prevFen || turn !== prevTurn || state.game.mode !== prevMode) {
        requestEngineMove(state.game.fen, state.game.level, state.game.uciMoves);
      }
    } else if (prevMode === 'computer' && (isGameOver(state.game.status) || state.ui.reviewPly !== null || turn === state.game.humanSide)) {
      cancelEngineSearch();
    }

    prevFen = state.game.fen;
    prevTurn = turn;
    prevMode = state.game.mode;
  });
}

// Exported token accessor for test verification
export function getActiveToken(): number {
  return activeToken;
}

// Terminate bridge instance and clean up resources
export function terminateEngine(): void {
  clearAllTimers();
  if (worker) {
    try {
      worker.postMessage({ type: 'quit' } satisfies WorkerInMessage);
      worker.terminate();
    } catch {}
    worker = null;
  }
  isInitialized = false;
}
