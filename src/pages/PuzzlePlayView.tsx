// Puzzle player board view with move validation, animations, hints, and solved banners.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BoardView } from '../components/Board/BoardView.tsx';
import { en } from '../copy/en.ts';
import { track } from '../lib/analytics.ts';
import { loadSavedSettings } from '../lib/persist.ts';
import { playSound } from '../lib/sound.ts';
import { createPuzzlePlayer } from '../puzzles/player.ts';
import { recordPuzzleSolved } from '../puzzles/streak.ts';
import type { Puzzle } from '../puzzles/types.ts';

export interface PuzzlePlayViewProps {
  readonly puzzle: Puzzle;
  readonly themeName: string;
  readonly onBack: () => void;
  readonly onNext: () => void;
  readonly onSolved: () => void;
}

export function PuzzlePlayView({
  puzzle,
  themeName,
  onBack,
  onNext,
  onSolved,
}: PuzzlePlayViewProps): React.JSX.Element {
  const player = useMemo(() => createPuzzlePlayer(), []);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fen, setFen] = useState<string>('');
  const [lastMove, setLastMove] = useState<[string, string] | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[] | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState<number>(0);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [flashSquare, setFlashSquare] = useState<string | null>(null);

  // Initialize player state when puzzle changes
  useEffect(() => {
    player.load(puzzle);
    setFen(player.getFen());
    setLastMove(player.getLastMove());
    setSelectedSquare(null);
    setLegalTargets(null);
    setWrongAttempts(0);
    setIsSolved(false);
    setIsRevealed(false);
    setIsShaking(false);
    setToastMessage(null);
    setFlashSquare(null);

    track('puzzle_started', { theme: themeName });

    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, [puzzle, themeName, player]);

  const soundOn = loadSavedSettings()?.soundOn ?? true;

  const handleAttemptMove = (from: string, to: string): boolean => {
    if (isSolved) return false;

    setSelectedSquare(null);
    setLegalTargets(null);

    const result = player.tryMove(from, to, undefined, { autoReply: false });

    if (result === 'wrong') {
      const attempts = player.getWrongAttempts();
      setWrongAttempts(attempts);
      setToastMessage(en.puzzleNotBestMove);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 350);
      playSound('refuse', soundOn);
      return false;
    }

    // Correct move played by player
    setFlashSquare(to);
    setFen(player.getFen());
    setLastMove([from, to]);
    playSound('move', soundOn);

    if (player.isSolved()) {
      setIsSolved(true);
      playSound('gameEnd', soundOn, 'win');
      recordPuzzleSolved();
      track('puzzle_solved', {
        theme: themeName,
        rating: puzzle.rating,
        attempts: wrongAttempts + 1,
      });
      onSolved();
      return true;
    }

    // Auto-play opponent reply after short green-flash delay
    replyTimerRef.current = setTimeout(() => {
      player.playOpponentReply();
      setFen(player.getFen());
      setLastMove(player.getLastMove());
      setFlashSquare(null);
      playSound('move', soundOn);

      if (player.isSolved()) {
        setIsSolved(true);
        playSound('gameEnd', soundOn, 'win');
        recordPuzzleSolved();
        track('puzzle_solved', {
          theme: themeName,
          rating: puzzle.rating,
          attempts: wrongAttempts + 1,
        });
        onSolved();
      }
    }, 400);

    return true;
  };

  const handleSelectSquare = (square: string): void => {
    if (isSolved) return;
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setLegalTargets(null);
      return;
    }
    if (selectedSquare) {
      handleAttemptMove(selectedSquare, square);
      return;
    }
    setSelectedSquare(square);
    setLegalTargets(player.getLegalTargets(square));
  };

  const handleReveal = (): void => {
    if (isSolved) return;
    player.reveal();
    setFen(player.getFen());
    setLastMove(player.getLastMove());
    setIsRevealed(true);
    setIsSolved(true);
    track('puzzle_failed', { theme: themeName, rating: puzzle.rating });
  };

  const headerLine = puzzle.side === 'w' ? en.puzzleWhiteToMove : en.puzzleBlackToMove;

  const customSquareStyles = flashSquare
    ? {
        [flashSquare]: {
          backgroundColor: 'var(--color-success)',
          opacity: 0.85,
        },
      }
    : undefined;

  return (
    <div className="puzzle-play-view">
      <div className="puzzle-play-nav">
        <button
          type="button"
          className="puzzle-back-btn"
          onClick={onBack}
          aria-label={en.backToPuzzles}
        >
          ← {en.backToPuzzles}
        </button>
      </div>

      <div className="puzzle-header-line" aria-live="polite">
        {headerLine}
      </div>

      <div className="puzzle-board-container">
        <BoardView
          fen={fen}
          boardOrientation={puzzle.side === 'w' ? 'white' : 'black'}
          playerSide={puzzle.side}
          interactive={!isSolved}
          lastMove={lastMove}
          selected={selectedSquare}
          legalTargets={legalTargets}
          onMove={handleAttemptMove}
          onSelectSquare={handleSelectSquare}
          toastMessage={toastMessage}
          onDismissToast={() => setToastMessage(null)}
          customSquareStyles={customSquareStyles}
          isShaking={isShaking}
        />
      </div>

      <div className="puzzle-actions">
        {wrongAttempts >= 2 && !isSolved && !isRevealed && (
          <button
            type="button"
            className="puzzle-solution-btn"
            onClick={handleReveal}
          >
            {en.puzzleShowSolution}
          </button>
        )}

        {isSolved && (
          <div className="puzzle-solved-card" role="status">
            <div className="puzzle-solved-info">
              <span className="puzzle-solved-badge">{en.puzzleSolved}</span>
              <span className="puzzle-solved-rating">
                {en.puzzleRating.replace('{rating}', String(puzzle.rating))}
              </span>
            </div>
            <button
              type="button"
              className="puzzle-next-btn"
              onClick={onNext}
            >
              {en.puzzleNext}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
