// Level difficulty mappings for the Stockfish engine opponent.
import type { Level } from '../game/types.ts';

export interface LevelConfig {
  skill: { min: number; max: number };
  depth: { min: number; max: number };
  movetime: { min: number; max: number };
  multiPv: number;
  pickRandomRootMove: boolean;
}

export interface SampledLevelParams {
  skill: number;
  depth: number;
  movetime: number;
  multiPv: number;
  pickRandomRootMove: boolean;
}

export const LEVEL_CONFIGS: Record<Level, LevelConfig> = {
  1: {
    skill: { min: 0, max: 3 },
    depth: { min: 2, max: 2 },
    movetime: { min: 200, max: 500 },
    multiPv: 5,
    pickRandomRootMove: true,
  },
  2: {
    skill: { min: 5, max: 8 },
    depth: { min: 4, max: 4 },
    movetime: { min: 400, max: 800 },
    multiPv: 1,
    pickRandomRootMove: false,
  },
  3: {
    skill: { min: 12, max: 15 },
    depth: { min: 6, max: 8 },
    movetime: { min: 700, max: 1200 },
    multiPv: 1,
    pickRandomRootMove: false,
  },
  4: {
    skill: { min: 20, max: 20 },
    depth: { min: 10, max: 10 },
    movetime: { min: 1200, max: 1500 },
    multiPv: 1,
    pickRandomRootMove: false,
  },
};

// Returns the configuration object for a specific difficulty level.
export function getLevelConfig(level: Level): LevelConfig {
  return LEVEL_CONFIGS[level] ?? LEVEL_CONFIGS[2];
}

// Samples random values within each dial's configured range for variety and realism.
export function sampleLevelParams(config: LevelConfig): SampledLevelParams {
  const randomInt = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  return {
    skill: randomInt(config.skill.min, config.skill.max),
    depth: randomInt(config.depth.min, config.depth.max),
    movetime: randomInt(config.movetime.min, config.movetime.max),
    multiPv: config.multiPv,
    pickRandomRootMove: config.pickRandomRootMove,
  };
}
