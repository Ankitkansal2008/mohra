import { useState } from 'react';
import type React from 'react';
import { useGameStore } from '../../game/store.ts';

interface UseBoardKeyboardProps {
  readonly orientation: 'white' | 'black';
  readonly isInteractive: boolean;
  readonly selected: string | null;
  readonly onSelectSquare: (square: string) => void;
  readonly onAttemptMove: (from: string, to: string) => boolean;
  readonly onCancelPromotion: () => void;
  readonly hasPendingPromotion: boolean;
}

export function useBoardKeyboard({
  orientation,
  isInteractive,
  selected,
  onSelectSquare,
  onAttemptMove,
  onCancelPromotion,
  hasPendingPromotion,
}: UseBoardKeyboardProps): {
  cursorSquare: string;
  isFocused: boolean;
  handleFocus: () => void;
  handleBlur: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
} {
  const [cursorSquare, setCursorSquare] = useState<string>('e4');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const toggleFlip = useGameStore((s) => s.toggleFlip);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const fileChar = cursorSquare[0];
    const rankNum = parseInt(cursorSquare[1], 10);
    const fileIdx = fileChar.charCodeAt(0) - 'a'.charCodeAt(0);

    const isWhite = orientation === 'white';

    switch (e.key) {
      case 'ArrowUp': {
        e.preventDefault();
        const nextRank = isWhite ? Math.min(8, rankNum + 1) : Math.max(1, rankNum - 1);
        setCursorSquare(`${fileChar}${nextRank}`);
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        const nextRank = isWhite ? Math.max(1, rankNum - 1) : Math.min(8, rankNum + 1);
        setCursorSquare(`${fileChar}${nextRank}`);
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        const nextFileIdx = isWhite ? Math.max(0, fileIdx - 1) : Math.min(7, fileIdx + 1);
        setCursorSquare(`${String.fromCharCode('a'.charCodeAt(0) + nextFileIdx)}${rankNum}`);
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        const nextFileIdx = isWhite ? Math.min(7, fileIdx + 1) : Math.max(0, fileIdx - 1);
        setCursorSquare(`${String.fromCharCode('a'.charCodeAt(0) + nextFileIdx)}${rankNum}`);
        break;
      }
      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (!isInteractive) return;
        if (!selected) {
          onSelectSquare(cursorSquare);
        } else if (selected === cursorSquare) {
          onSelectSquare(cursorSquare);
        } else {
          onAttemptMove(selected, cursorSquare);
        }
        break;
      }
      case 'Escape': {
        e.preventDefault();
        if (hasPendingPromotion) {
          onCancelPromotion();
        } else if (selected) {
          onSelectSquare(selected);
        }
        break;
      }
      case 'f':
      case 'F': {
        e.preventDefault();
        toggleFlip();
        break;
      }
    }
  };

  return {
    cursorSquare,
    isFocused,
    handleFocus: () => setIsFocused(true),
    handleBlur: () => setIsFocused(false),
    handleKeyDown,
  };
}

export default useBoardKeyboard;

