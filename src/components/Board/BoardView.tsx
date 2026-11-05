import React, { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { en } from '../../copy/en.ts';
import {
  getTurn,
  isCheck,
  useGameStore,
} from '../../game/store.ts';
import type { BoardTheme } from '../../styles/boardTokens.ts';
import {
  BOARD_HIGHLIGHTS,
  BOARD_THEMES,
} from '../../styles/boardTokens.ts';
import { Toast } from '../ui/Toast.tsx';
import { PromotionOverlay } from './PromotionOverlay.tsx';

export interface BoardViewProps {
  readonly fen?: string;
  readonly boardOrientation?: 'white' | 'black';
  readonly theme?: BoardTheme;
  readonly selected?: string | null;
  readonly lastMove?:
    | readonly [string, string]
    | { readonly from: string; readonly to: string }
    | readonly string[]
    | null;
  readonly legalTargets?: readonly string[] | null;
  readonly check?: string | null;
  readonly interactive?: boolean;
  readonly className?: string;
  readonly style?: React.CSSProperties;
}

function isSquareOccupied(fen: string, square: string): boolean {
  if (!/^[a-h][1-8]$/.test(square)) return false;
  const placement = fen.split(' ')[0];
  const rows = placement.split('/');
  const fileIndex = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1], 10);
  const rowIndex = 8 - rank;
  const rowStr = rows[rowIndex];
  if (!rowStr) return false;

  let currentFile = 0;
  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    if (char >= '1' && char <= '8') {
      currentFile += parseInt(char, 10);
    } else {
      if (currentFile === fileIndex) return true;
      currentFile += 1;
    }
    if (currentFile > fileIndex) break;
  }
  return false;
}

function findKingSquare(fen: string, color: 'w' | 'b'): string | null {
  const rows = fen.split(' ')[0].split('/');
  const kingChar = color === 'w' ? 'K' : 'k';
  for (let r = 0; r < 8; r++) {
    const rank = 8 - r;
    let file = 0;
    for (const char of rows[r]) {
      if (char >= '1' && char <= '8') {
        file += parseInt(char, 10);
      } else {
        if (char === kingChar) {
          return `${String.fromCharCode('a'.charCodeAt(0) + file)}${rank}`;
        }
        file += 1;
      }
    }
  }
  return null;
}

export function BoardView({
  fen: propFen,
  boardOrientation = 'white',
  theme: propTheme,
  selected: propSelected,
  lastMove: propLastMove,
  legalTargets: propLegalTargets,
  check: propCheck,
  interactive = true,
  className = '',
  style,
}: BoardViewProps): React.JSX.Element {
  const storeGame = useGameStore((s) => s.game);
  const storeUi = useGameStore((s) => s.ui);
  const storeToast = useGameStore((s) => s.toast);
  const storeLastMove = useGameStore((s) => s.lastMove);
  const storeAnnounced = useGameStore((s) => s.announcedMove);

  const attemptMove = useGameStore((s) => s.attemptMove);
  const selectSquare = useGameStore((s) => s.selectSquare);
  const cancelPromotion = useGameStore((s) => s.cancelPromotion);
  const confirmPromotion = useGameStore((s) => s.confirmPromotion);
  const dismissToast = useGameStore((s) => s.dismissToast);

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const fen = propFen ?? storeGame.fen;
  const theme = propTheme ?? storeUi.theme;
  const selected = propSelected !== undefined ? propSelected : storeUi.selected;
  const lastMove = propLastMove !== undefined ? propLastMove : storeLastMove;
  const legalTargets = propLegalTargets !== undefined ? propLegalTargets : storeUi.targets;
  const turn = getTurn(fen);

  const activeCheck =
    propCheck !== undefined
      ? propCheck
      : isCheck(storeGame.status)
        ? findKingSquare(fen, turn)
        : null;

  const colors = BOARD_THEMES[theme] ?? BOARD_THEMES.default;
  const squareStyles: Record<string, React.CSSProperties> = {};

  if (lastMove) {
    const squares: readonly string[] =
      'from' in lastMove ? [lastMove.from, lastMove.to] : lastMove;
    for (const square of squares) {
      if (square) {
        squareStyles[square] = { ...squareStyles[square], ...BOARD_HIGHLIGHTS.lastMove };
      }
    }
  }

  if (selected) {
    squareStyles[selected] = { ...squareStyles[selected], ...BOARD_HIGHLIGHTS.selected };
  }

  if (activeCheck) {
    squareStyles[activeCheck] = { ...squareStyles[activeCheck], ...BOARD_HIGHLIGHTS.check };
  }

  if (legalTargets) {
    for (const target of legalTargets) {
      if (target) {
        const isOccupied = isSquareOccupied(fen, target);
        squareStyles[target] = {
          ...squareStyles[target],
          ...(isOccupied
            ? BOARD_HIGHLIGHTS.legalTargetOccupied
            : BOARD_HIGHLIGHTS.legalTargetEmpty),
        };
      }
    }
  }

  const animationDuration = reducedMotion || !storeUi.animationOn ? 0 : 150;

  return (
    <div
      className={`gambit-board-wrapper ${className}`.trim()}
      style={{
        position: 'relative',
        width: 'clamp(320px, 100%, 100%)',
        maxWidth: '100%',
        aspectRatio: '1 / 1',
        pointerEvents: interactive ? 'auto' : 'none',
        ...style,
      }}
      aria-label={en.boardAriaLabel}
    >
      {storeToast ? (
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 60,
            maxWidth: '90%',
          }}
        >
          <Toast message={storeToast.message} onDismiss={dismissToast} />
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        }}
        aria-live="polite"
        aria-atomic="true"
      >
        {storeAnnounced}
      </div>

      <Chessboard
        options={{
          position: fen,
          boardOrientation,
          lightSquareStyle: { backgroundColor: colors.light },
          darkSquareStyle: { backgroundColor: colors.dark },
          squareStyles,
          animationDurationInMs: animationDuration,
          showAnimations: animationDuration > 0,
          showNotation: storeUi.showCoords,
          alphaNotationStyle: { fontSize: '11px' },
          numericNotationStyle: { fontSize: '11px' },
          darkSquareNotationStyle: { color: 'var(--color-muted, #5A5A5A)', fontSize: '11px' },
          lightSquareNotationStyle: { color: 'var(--color-muted, #5A5A5A)', fontSize: '11px' },
          boardStyle: {
            touchAction: 'none',
            ...(interactive ? {} : { pointerEvents: 'none' }),
          },
          allowDragging: interactive,
          canDragPiece: ({ piece }) => {
            if (!interactive) return false;
            return piece.pieceType[0] === turn;
          },
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (!interactive || !targetSquare || sourceSquare === targetSquare) {
              return false;
            }
            return attemptMove(sourceSquare, targetSquare);
          },
          onSquareClick: ({ square }) => {
            if (!interactive) return;
            selectSquare(square);
          },
        }}
      />

      {storeUi.pendingPromotion ? (
        <PromotionOverlay
          toSquare={storeUi.pendingPromotion.to}
          side={turn}
          boardOrientation={boardOrientation}
          onSelect={(piece) => confirmPromotion(piece)}
          onCancel={cancelPromotion}
        />
      ) : null}
    </div>
  );
}

export default BoardView;
