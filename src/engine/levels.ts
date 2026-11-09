// Level difficulty mappings for the Stockfish engine opponent.
import type { Level } from '../game/types.ts';

export interface ThinkingDelayRange {
  min: number;
  max: number;
}

// Delays per level: longer for weaker levels to reflect human deliberation pace
export const THINKING_DELAY_RANGES: Record<Level, ThinkingDelayRange> = {
  1: { min: 2600, max: 3600 },
  2: { min: 1600, max: 2200 },
  3: { min: 900, max: 1300 },
  4: { min: 400, max: 700 },
};

export const MIN_THINKING_TIMES: Record<Level, number> = {
  1: THINKING_DELAY_RANGES[1].min,
  2: THINKING_DELAY_RANGES[2].min,
  3: THINKING_DELAY_RANGES[3].min,
  4: THINKING_DELAY_RANGES[4].min,
};

export const MIN_THINKING_TIME_LEVEL_1_MS = THINKING_DELAY_RANGES[1].min;
export const MIN_THINKING_TIME_LEVEL_2_3_MS = THINKING_DELAY_RANGES[2].min;

export const MAX_ARTIFICIAL_DELAY_MS = 4000;

export interface LevelConfig {
  skill: { min: number; max: number };
  depth: { min: number; max: number };
  movetime: { min: number; max: number };
  multiPv: number;
  pickRandomRootMove: boolean;
  minThinkingMs?: number;
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
    minThinkingMs: THINKING_DELAY_RANGES[1].min,
  },
  2: {
    skill: { min: 5, max: 8 },
    depth: { min: 4, max: 4 },
    movetime: { min: 400, max: 800 },
    multiPv: 1,
    pickRandomRootMove: false,
    minThinkingMs: THINKING_DELAY_RANGES[2].min,
  },
  3: {
    skill: { min: 12, max: 15 },
    depth: { min: 6, max: 8 },
    movetime: { min: 700, max: 1200 },
    multiPv: 1,
    pickRandomRootMove: false,
    minThinkingMs: THINKING_DELAY_RANGES[3].min,
  },
  4: {
    skill: { min: 20, max: 20 },
    depth: { min: 10, max: 10 },
    movetime: { min: 1200, max: 1500 },
    multiPv: 1,
    pickRandomRootMove: false,
    minThinkingMs: THINKING_DELAY_RANGES[4].min,
  },
};

// Returns the minimum visible thinking delay in milliseconds for a given level.
export function getMinThinkingTime(level: Level): number {
  return THINKING_DELAY_RANGES[level]?.min ?? 1600;
}

// Samples random thinking delay within the level's range for realistic pacing.
export function sampleThinkingDelay(level: Level): number {
  const range = THINKING_DELAY_RANGES[level] ?? THINKING_DELAY_RANGES[2];
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

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
