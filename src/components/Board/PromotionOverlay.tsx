import React, { useEffect, useRef } from 'react';
import { defaultPieces } from 'react-chessboard';
import { en } from '../../copy/en.ts';
import type { Side } from '../../game/types.ts';

export interface PromotionOverlayProps {
  readonly toSquare: string;
  readonly side: Side;
  readonly boardOrientation?: 'white' | 'black';
  readonly onSelect: (piece: 'q' | 'r' | 'b' | 'n') => void;
  readonly onCancel: () => void;
}

interface Choice {
  readonly piece: 'q' | 'n' | 'r' | 'b';
  readonly labelKey: string;
}

const CHOICES: readonly Choice[] = [
  { piece: 'q', labelKey: 'promoteToQueen' },
  { piece: 'n', labelKey: 'promoteToKnight' },
  { piece: 'r', labelKey: 'promoteToRook' },
  { piece: 'b', labelKey: 'promoteToBishop' },
];

export function PromotionOverlay({
  toSquare,
  side,
  boardOrientation = 'white',
  onSelect,
  onCancel,
}: PromotionOverlayProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus first choice immediately so keyboard interaction requires zero pointer inputs
    firstButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const fileChar = toSquare[0];
  const rawFileIndex = fileChar.charCodeAt(0) - 'a'.charCodeAt(0);
  const fileIndex =
    boardOrientation === 'white' ? rawFileIndex : 7 - rawFileIndex;

  const isTop =
    (boardOrientation === 'white' && toSquare.endsWith('8')) ||
    (boardOrientation === 'black' && toSquare.endsWith('1'));

  // Render SVG pieces matching the promoting pawn's color
  const renderPiece = (piece: 'q' | 'n' | 'r' | 'b') => {
    const key = `${side}${piece.toUpperCase()}` as keyof typeof defaultPieces;
    const Component = defaultPieces[key];
    return Component ? Component({ svgStyle: { width: '48px', height: '48px' } }) : null;
  };

  return (
    <div
      className="gambit-promotion-backdrop"
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 50,
        display: 'flex',
      }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={en.promotionDialogAriaLabel}
    >
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          left: `clamp(8px, calc(${(fileIndex + 0.5) * 12.5}% - 32px), calc(100% - 72px))`,
          top: isTop ? '8px' : 'auto',
          bottom: !isTop ? '8px' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          backgroundColor: 'var(--color-surface, #FFFFFF)',
          borderRadius: 'var(--radius-6, 6px)',
          boxShadow: '0 2px 8px rgba(20, 26, 20, 0.10)',
          border: '1px solid var(--color-border, #E2E6DE)',
          padding: '4px',
          zIndex: 51,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {CHOICES.map((choice, index) => (
          <button
            key={choice.piece}
            ref={index === 0 ? firstButtonRef : undefined}
            type="button"
            style={{
              width: '64px',
              height: '64px',
              minWidth: '64px',
              minHeight: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-6, 6px)',
              cursor: 'pointer',
              padding: 0,
            }}
            aria-label={en[choice.labelKey]}
            title={en[choice.labelKey]}
            onClick={() => onSelect(choice.piece)}
          >
            {renderPiece(choice.piece)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default PromotionOverlay;

