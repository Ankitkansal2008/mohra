// UCI command formatting and line parsing helpers.

export interface ParsedBestMove {
  move: string;
  ponder?: string;
}

export interface ParsedInfoLine {
  depth?: number;
  multiPv?: number;
  pvMove?: string;
}

// Formats position command for Stockfish: position fen <fen> [moves <m1> <m2> ...]
export function formatPositionCommand(fen: string, uciMoves?: string[]): string {
  if (uciMoves && uciMoves.length > 0) {
    return `position fen ${fen} moves ${uciMoves.join(' ')}`;
  }
  return `position fen ${fen}`;
}

// Formats search go command with depth and optional movetime limit.
export function formatGoCommand(options: { depth: number; movetime?: number }): string {
  const parts = [`go depth ${options.depth}`];
  if (options.movetime !== undefined) {
    parts.push(`movetime ${options.movetime}`);
  }
  return parts.join(' ');
}

// Formats Skill Level option command (0 to 20).
export function formatSkillCommand(skill: number): string {
  return `setoption name Skill Level value ${skill}`;
}

// Formats MultiPV option command for multi-line search.
export function formatMultiPvCommand(multiPv: number): string {
  return `setoption name MultiPV value ${multiPv}`;
}

// Parses a bestmove output line from Stockfish (e.g. "bestmove e7e5 ponder g1f3").
export function parseBestMove(line: string): ParsedBestMove | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('bestmove')) return null;

  const tokens = trimmed.split(/\s+/);
  const move = tokens[1];
  if (!move) return null;

  const ponderIdx = tokens.indexOf('ponder');
  const ponder = ponderIdx !== -1 && tokens[ponderIdx + 1] ? tokens[ponderIdx + 1] : undefined;

  return { move, ponder };
}

// Parses depth, multipv index, and root move from an info line during search.
export function parseInfoLine(line: string): ParsedInfoLine | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('info')) return null;

  const result: ParsedInfoLine = {};

  const depthMatch = /\bdepth\s+(\d+)\b/.exec(trimmed);
  if (depthMatch && depthMatch[1]) {
    result.depth = parseInt(depthMatch[1], 10);
  }

  const multiPvMatch = /\bmultipv\s+(\d+)\b/.exec(trimmed);
  if (multiPvMatch && multiPvMatch[1]) {
    result.multiPv = parseInt(multiPvMatch[1], 10);
  }

  const pvMatch = /\bpv\s+([a-h][1-8][a-h][1-8][qrbn]?)\b/.exec(trimmed);
  if (pvMatch && pvMatch[1]) {
    result.pvMove = pvMatch[1];
  }

  return result;
}
