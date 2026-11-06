// Bridge orchestrating the Web Worker engine lifecycle, tokens, UCI protocol, and timeouts.
import { subscribeGameEvents } from '../game/events.ts';
import { rules } from '../game/rules.ts';
import { getTurn } from '../game/selectors.ts';
import { useGameStore } from '../game/store.ts';
import type { Level } from '../game/types.ts';
import { getLevelConfig, sampleLevelParams } from './levels.ts';
import {
  formatGoCommand, formatMultiPvCommand, formatPositionCommand,
  formatSkillCommand, parseBestMove, parseInfoLine,
} from './uci.ts';

let worker: Worker | null = null;
let activeToken = 0;
let isInitialized = false, isReady = false, isUciOk = false;

let uciTimeout: ReturnType<typeof setTimeout> | null = null;
let thinkingTimeout: ReturnType<typeof setTimeout> | null = null;
let ceilingTimeout: ReturnType<typeof setTimeout> | null = null;
let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingGo: (() => void) | null = null;
let pickRandomRoot = false;
let candidateMoves: string[] = [];

function clearAllTimers(): void {
  if (uciTimeout) { clearTimeout(uciTimeout); uciTimeout = null; }
  if (thinkingTimeout) { clearTimeout(thinkingTimeout); thinkingTimeout = null; }
  if (ceilingTimeout) { clearTimeout(ceilingTimeout); ceilingTimeout = null; }
  if (fallbackTimeout) { clearTimeout(fallbackTimeout); fallbackTimeout = null; }
}

function playFallbackMove(token: number): void {
  clearAllTimers();
  useGameStore.getState().setThinking(false);
  rules.reset(useGameStore.getState().game.fen);
  const legal = rules.legalMovesAll();
  if (legal.length === 0) return;
  const pick = legal[Math.floor(Math.random() * legal.length)];
  if (!pick) return;
  useGameStore.getState().applyEngineMove(token, `${pick.from}${pick.to}${pick.promotion ?? ''}`);
}

export function handleEngineFailure(): void {
  clearAllTimers();
  pendingGo = null; isReady = false; isUciOk = false;
  if (worker) { try { worker.terminate(); } catch {} worker = null; }
  isInitialized = false;
  useGameStore.getState().setEngineFailed(true);
}

export function handleWorkerMessage(e: MessageEvent<unknown>): void {
  // Forward worker messages to console in development to observe engine chatter
  if (import.meta.env.DEV) console.log('[Stockfish]', e.data);

  if (typeof e.data === 'string') {
    const line = e.data.trim();
    if (!line) return;

    if (line === 'uciok') {
      isUciOk = true;
      if (uciTimeout) { clearTimeout(uciTimeout); uciTimeout = null; }
      worker?.postMessage('setoption name Threads value 1');
      worker?.postMessage('setoption name Hash value 16');
      worker?.postMessage('isready');
      return;
    }

    if (line === 'readyok') {
      isReady = true;
      if (pendingGo) { const run = pendingGo; pendingGo = null; run(); }
      return;
    }

    if (pickRandomRoot) {
      const info = parseInfoLine(line);
      if (info?.pvMove && !candidateMoves.includes(info.pvMove)) candidateMoves.push(info.pvMove);
    }

    if (line.startsWith('bestmove')) {
      const currentToken = useGameStore.getState().engineToken;
      if (activeToken !== currentToken || activeToken === 0) return;
      const parsed = parseBestMove(line);
      if (!parsed || parsed.move === '(none)') return;

      let chosenMove = parsed.move;
      if (pickRandomRoot && candidateMoves.length > 0) {
        const topFive = candidateMoves.slice(0, 5);
        const chosen = topFive[Math.floor(Math.random() * topFive.length)];
        if (chosen) chosenMove = chosen;
      }

      clearAllTimers();
      useGameStore.getState().setThinking(false);
      useGameStore.getState().applyEngineMove(activeToken, chosenMove);
      return;
    }
  }

  // Support typed object mock messages in unit tests
  if (typeof e.data === 'object' && e.data !== null) {
    const msg = e.data as { type?: string; token?: number; uci?: string };
    if (msg.type === 'error') { handleEngineFailure(); return; }
    if (msg.type === 'bestmove' && typeof msg.token === 'number' && typeof msg.uci === 'string') {
      const currentToken = useGameStore.getState().engineToken;
      if (msg.token !== activeToken || msg.token !== currentToken || msg.token === 0) return;
      clearAllTimers();
      useGameStore.getState().setThinking(false);
      useGameStore.getState().applyEngineMove(msg.token, msg.uci);
    }
  }
}

export function requestEngineMove(fen: string, level: Level): number {
  clearAllTimers();
  const currentToken = useGameStore.getState().engineToken;
  activeToken = Math.max(activeToken, currentToken) + 1;
  const token = activeToken;
  useGameStore.getState().setEngineToken(token);

  thinkingTimeout = setTimeout(() => {
    if (token === activeToken) useGameStore.getState().setThinking(true);
  }, 150);

  ceilingTimeout = setTimeout(() => {
    if (token !== activeToken) return;
    worker?.postMessage('stop');
    fallbackTimeout = setTimeout(() => {
      if (token !== activeToken) return;
      playFallbackMove(token);
    }, 500);
  }, 5000);

  const execute = (): void => {
    const config = getLevelConfig(level);
    const params = sampleLevelParams(config);
    pickRandomRoot = config.pickRandomRootMove;
    candidateMoves = [];

    worker?.postMessage(formatSkillCommand(params.skill));
    worker?.postMessage(formatMultiPvCommand(params.multiPv));
    worker?.postMessage(formatPositionCommand(fen));
    worker?.postMessage(formatGoCommand({ depth: params.depth, movetime: params.movetime }));
  };

  if (!isReady) pendingGo = execute;
  else execute();

  return token;
}

export function cancelEngineSearch(): void {
  clearAllTimers();
  pendingGo = null;
  const currentToken = useGameStore.getState().engineToken;
  activeToken = Math.max(activeToken + 1, currentToken);
  if (worker) {
    worker.postMessage('stop');
  }
}

export function getEngineUrl(baseUri?: string): string {
  const base = baseUri ?? (typeof document !== 'undefined' ? document.baseURI : 'http://localhost/');
  return new URL('engine/stockfish-19-lite-single.js', base).href;
}

export function initEngine(workerFactory?: () => Worker): void {
  if (isInitialized && worker) return;

  const start = (): void => {
    try {
      const engineUrl = getEngineUrl();
      worker = workerFactory ? workerFactory() : new Worker(engineUrl);
      worker.onmessage = handleWorkerMessage;
      worker.onerror = (err) => {
        console.error('[Stockfish error]', err);
        handleEngineFailure();
      };

      if (workerFactory) {
        isReady = true;
        isUciOk = true;
      } else {
        isReady = false;
        isUciOk = false;
        worker.postMessage('uci');
        uciTimeout = setTimeout(() => { if (!isUciOk) handleEngineFailure(); }, 5000);
      }

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

function shouldEnginePlay(fen: string): boolean {
  const state = useGameStore.getState();
  const turn = getTurn(fen);
  return state.game.mode === 'computer' && turn !== state.game.humanSide &&
    (state.game.status === 'playing' || state.game.status === 'check') && state.ui.reviewPly === null;
}

export function connectBridgeToStore(): () => void {
  return subscribeGameEvents((event) => {
    switch (event.type) {
      case 'human-move':
        if (shouldEnginePlay(event.fen)) requestEngineMove(event.fen, event.level);
        else cancelEngineSearch();
        break;
      case 'undo':
        cancelEngineSearch();
        break;
      case 'new-game':
        cancelEngineSearch();
        if (shouldEnginePlay(event.fen)) requestEngineMove(event.fen, event.level);
        break;
      case 'level-change':
        cancelEngineSearch();
        if (shouldEnginePlay(useGameStore.getState().game.fen)) {
          requestEngineMove(useGameStore.getState().game.fen, event.level);
        }
        break;
    }
  });
}

export function getActiveToken(): number {
  return activeToken;
}

export function terminateEngine(): void {
  clearAllTimers();
  pendingGo = null; isReady = false; isUciOk = false;
  if (worker) {
    try { worker.postMessage('quit'); worker.terminate(); } catch {}
    worker = null;
  }
  isInitialized = false;
}
