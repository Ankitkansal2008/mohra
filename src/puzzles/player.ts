// Pure state machine for executing chess puzzles with automatic opponent replies.
import { Chess, type Square } from 'chess.js';
import type { MoveResult, Puzzle } from './types.ts';

export interface TryMoveOptions {
  readonly autoReply?: boolean;
}

export class PuzzlePlayer {
  private chess: Chess = new Chess();
  private puzzle: Puzzle | null = null;
  private currentMoveIndex: number = 0;
  private lastMove: [string, string] | null = null;
  private revealed: boolean = false;
  private wrongAttempts: number = 0;

  public load(puzzle: Puzzle): void {
    this.puzzle = puzzle;
    this.chess = new Chess(puzzle.fen);
    this.currentMoveIndex = 0;
    this.lastMove = null;
    this.revealed = false;
    this.wrongAttempts = 0;

    // Apply moves[0] automatically (the opponent's setup move)
    if (puzzle.moves.length > 0) {
      this.applyUciMove(puzzle.moves[0]);
      this.currentMoveIndex = 1;
    }
  }

  public tryMove(
    from: string,
    to: string,
    promotion?: string,
    options: TryMoveOptions = {},
  ): MoveResult {
    if (!this.puzzle || this.isSolved()) {
      return 'wrong';
    }

    const { autoReply = true } = options;
    const expectedUci = this.puzzle.moves[this.currentMoveIndex];
    if (!expectedUci) return 'wrong';

    const expectedFrom = expectedUci.slice(0, 2);
    const expectedTo = expectedUci.slice(2, 4);
    const expectedPromotion = expectedUci.length > 4 ? expectedUci[4].toLowerCase() : undefined;

    // Reject move immediately if destination or origin square does not match
    if (from !== expectedFrom || to !== expectedTo) {
      this.wrongAttempts++;
      return 'wrong';
    }

    // Reject move if promotion was explicitly given but differs from expected promotion
    if (expectedPromotion && promotion && promotion.toLowerCase() !== expectedPromotion) {
      this.wrongAttempts++;
      return 'wrong';
    }

    // Attempt applying player's move through chess rules engine
    const fenBefore = this.chess.fen();
    try {
      const resolvedPromotion = expectedPromotion || (expectedUci.length > 4 ? promotion || 'q' : undefined);
      this.chess.move(
        resolvedPromotion
          ? { from: from as Square, to: to as Square, promotion: resolvedPromotion }
          : { from: from as Square, to: to as Square },
      );
    } catch {
      // Revert if rules engine rejects the move
      this.chess.load(fenBefore);
      this.wrongAttempts++;
      return 'wrong';
    }

    this.lastMove = [from, to];
    this.currentMoveIndex++;

    // When autoReply is enabled, auto-play opponent reply if moves remain
    if (autoReply && !this.isSolved()) {
      this.playOpponentReply();
    }

    return 'correct';
  }

  public playOpponentReply(): boolean {
    if (!this.puzzle || this.isSolved()) return false;

    const opponentUci = this.puzzle.moves[this.currentMoveIndex];
    if (!opponentUci) return false;

    this.applyUciMove(opponentUci);
    this.currentMoveIndex++;
    return true;
  }

  public isSolved(): boolean {
    if (!this.puzzle) return false;
    return this.currentMoveIndex >= this.puzzle.moves.length;
  }

  public reveal(): void {
    if (!this.puzzle) return;
    while (this.currentMoveIndex < this.puzzle.moves.length) {
      const uci = this.puzzle.moves[this.currentMoveIndex];
      this.applyUciMove(uci);
      this.currentMoveIndex++;
    }
    this.revealed = true;
  }

  public getFen(): string {
    return this.chess.fen();
  }

  public getLastMove(): [string, string] | null {
    return this.lastMove;
  }

  public getPuzzle(): Puzzle | null {
    return this.puzzle;
  }

  public getCurrentMoveIndex(): number {
    return this.currentMoveIndex;
  }

  public isRevealed(): boolean {
    return this.revealed;
  }

  public getWrongAttempts(): number {
    return this.wrongAttempts;
  }

  public getTurn(): 'w' | 'b' {
    return this.chess.turn();
  }

  public getLegalTargets(square: string): string[] {
    try {
      const moves = this.chess.moves({ square: square as Square, verbose: true });
      return Array.from(new Set(moves.map((m) => m.to)));
    } catch {
      return [];
    }
  }

  private applyUciMove(uci: string): void {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4].toLowerCase() : undefined;
    this.chess.move(
      promotion
        ? { from: from as Square, to: to as Square, promotion }
        : { from: from as Square, to: to as Square },
    );
    this.lastMove = [from, to];
  }
}

export function createPuzzlePlayer(): PuzzlePlayer {
  return new PuzzlePlayer();
}
