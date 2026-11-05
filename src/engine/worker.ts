// Web Worker hosting Stockfish engine and translating between typed messages and UCI.
import type { Level } from '../game/types.ts';
import { getLevelConfig, sampleLevelParams } from './levels.ts';
import {
  formatGoCommand,
  formatMultiPvCommand,
  formatPositionCommand,
  formatSkillCommand,
  parseBestMove,
  parseInfoLine,
} from './uci.ts';

export type WorkerInMessage =
  | { type: 'init' }
  | { type: 'go'; token: number; level: Level; fen: string; uciMoves?: string[] }
  | { type: 'stop' }
  | { type: 'quit' };

export type WorkerOutMessage =
  | { type: 'bestmove'; token: number; uci: string; depth: number }
  | { type: 'ready' }
  | { type: 'error'; error: string };

let engineWorker: Worker | null = null;
let currentToken = 0;
let currentDepth = 2;
let pickRandomRoot = false;
let candidateMoves: string[] = [];
let isReady = false;
let pendingGo: (() => void) | null = null;

// Post typed message back to the main thread.
function postToMain(msg: WorkerOutMessage): void {
  if (typeof self !== 'undefined' && 'postMessage' in self) {
    self.postMessage(msg);
  }
}

// Handles output lines from Stockfish UCI.
function handleEngineLine(rawLine: string): void {
  const line = rawLine.trim();
  if (!line) return;

  if (line === 'uciok') {
    isReady = true;
    postToMain({ type: 'ready' });
    if (pendingGo) {
      const run = pendingGo;
      pendingGo = null;
      run();
    }
    return;
  }

  // Level 1 MultiPV collection: remember distinct root candidate moves
  if (pickRandomRoot) {
    const info = parseInfoLine(line);
    if (info?.pvMove && !candidateMoves.includes(info.pvMove)) {
      candidateMoves.push(info.pvMove);
    }
  }

  if (line.startsWith('bestmove')) {
    const parsed = parseBestMove(line);
    if (!parsed || parsed.move === '(none)') return;

    let chosenMove = parsed.move;
    if (pickRandomRoot && candidateMoves.length > 0) {
      // Pick randomly among top 5 root moves per Level 1 specification
      const topFive = candidateMoves.slice(0, 5);
      const chosen = topFive[Math.floor(Math.random() * topFive.length)];
      if (chosen) chosenMove = chosen;
    }

    postToMain({
      type: 'bestmove',
      token: currentToken,
      uci: chosenMove,
      depth: currentDepth,
    });
  }
}

// Initialise Stockfish by URL without bundler intervention.
function initEngine(): void {
  if (engineWorker) return;
  try {
    const scriptUrl = '/engine/stockfish-19-lite-single.js';
    engineWorker = new Worker(scriptUrl);
    engineWorker.onmessage = (e: MessageEvent<string>) => {
      handleEngineLine(String(e.data));
    };
    engineWorker.onerror = (err: ErrorEvent) => {
      postToMain({ type: 'error', error: err.message || 'Engine worker error' });
    };
    engineWorker.postMessage('uci');
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    postToMain({ type: 'error', error: errorMsg });
  }
}

// Executes search request once UCI engine reports ready.
function handleGo(token: number, level: Level, fen: string, uciMoves?: string[]): void {
  if (!engineWorker) {
    initEngine();
  }

  const execute = (): void => {
    currentToken = token;
    candidateMoves = [];
    const config = getLevelConfig(level);
    const params = sampleLevelParams(config);
    currentDepth = params.depth;
    pickRandomRoot = config.pickRandomRootMove;

    engineWorker?.postMessage(formatSkillCommand(params.skill));
    engineWorker?.postMessage(formatMultiPvCommand(params.multiPv));
    engineWorker?.postMessage(formatPositionCommand(fen, uciMoves));
    engineWorker?.postMessage(
      formatGoCommand({ depth: params.depth, movetime: params.movetime }),
    );
  };

  if (!isReady) {
    pendingGo = execute;
  } else {
    execute();
  }
}

// Listen to commands from main thread bridge.
if (typeof self !== 'undefined' && 'onmessage' in self) {
  self.onmessage = (e: MessageEvent<WorkerInMessage>): void => {
    const msg = e.data;
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      case 'init':
        initEngine();
        break;
      case 'go':
        handleGo(msg.token, msg.level, msg.fen, msg.uciMoves);
        break;
      case 'stop':
        engineWorker?.postMessage('stop');
        break;
      case 'quit':
        engineWorker?.postMessage('quit');
        engineWorker?.terminate();
        engineWorker = null;
        if (typeof self.close === 'function') {
          self.close();
        }
        break;
    }
  };
}

export { initEngine, handleGo, handleEngineLine };
