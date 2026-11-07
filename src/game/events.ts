// Typed explicit game events to decouple store updates from engine side-effects.
import type { Level } from './types.ts';

export type GameEvent =
  | { type: 'human-move'; fen: string; level: Level; uciMoves: string[] }
  | { type: 'undo' }
  | { type: 'new-game'; fen: string; level: Level; uciMoves: string[] }
  | { type: 'restored'; fen: string; level: Level; uciMoves: string[] }
  | { type: 'level-change'; level: Level };

export type GameEventListener = (event: GameEvent) => void;

const listeners = new Set<GameEventListener>();

export function subscribeGameEvents(listener: GameEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitGameEvent(event: GameEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}

