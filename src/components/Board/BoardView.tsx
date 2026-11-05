import React, { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { en } from '../../copy/en.ts';
import {
  findKingSquare,
  getFenAtPly,
  getTurn,
  isCheck,
  isGameOver,
  isSquareOccupied,
} from '../../game/selectors.ts';
import { useGameStore } from '../../game/store.ts';
import type { GameStatus, Side } from '../../game/types.ts';
import type { BoardTheme } from '../../styles/boardTokens.ts';
import {
  BOARD_HIGHLIGHTS,
  BOARD_THEMES,
} from '../../styles/boardTokens.ts';
import { ResultDialog } from '../Dialogs/ResultDialog.tsx';
import { Toast } from '../ui/Toast.tsx';
import { PromotionOverlay } from './PromotionOverlay.tsx';

export interface BoardViewProps {
  readonly fen?: string;
  readonly status?: GameStatus;
  readonly winner?: Side | null;
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

export function BoardView({
  fen: propFen,
  status: propStatus,
  winner: propWinner,
  boardOrientation: propBoardOrientation,
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

  const isReviewing = storeUi.reviewPly !== null;
  const reviewPos = isReviewing ? getFenAtPly(storeGame.moves, storeUi.reviewPly!) : null;
  const fen = propFen ?? (reviewPos ? reviewPos.fen : storeGame.fen);
  const status = propStatus ?? storeGame.status;
  const winner = propWinner !== undefined ? propWinner : storeGame.winner;
  const theme = propTheme ?? storeUi.theme;
  const selected = isReviewing ? null : (propSelected !== undefined ? propSelected : storeUi.selected);
  const lastMove = propLastMove !== undefined ? propLastMove : (reviewPos ? reviewPos.lastMove : storeLastMove);
  const legalTargets = isReviewing ? null : (propLegalTargets !== undefined ? propLegalTargets : storeUi.targets);
  const turn = getTurn(fen);
  const orientation = propBoardOrientation ?? (storeUi.flipped ? 'black' : 'white');
  const isInteractive = interactive && !isReviewing && !isGameOver(status);

  const activeCheck =
    propCheck !== undefined
      ? propCheck
      : isCheck(status)
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
          boardOrientation: orientation,
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
            ...(isInteractive ? {} : { pointerEvents: 'none' }),
          },
          allowDragging: isInteractive,
          canDragPiece: ({ piece }) => {
            if (!isInteractive) return false;
            return piece.pieceType[0] === turn;
          },
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (!isInteractive || !targetSquare || sourceSquare === targetSquare) {
              return false;
            }
            return attemptMove(sourceSquare, targetSquare);
          },
          onSquareClick: ({ square }) => {
            if (!isInteractive) return;
            selectSquare(square);
          },
        }}
      />

      {storeUi.pendingPromotion ? (
        <PromotionOverlay
          toSquare={storeUi.pendingPromotion.to}
          side={turn}
          boardOrientation={orientation}
          onSelect={(piece) => confirmPromotion(piece)}
          onCancel={cancelPromotion}
        />
      ) : null}

      {isGameOver(status) && !isReviewing ? (
        <ResultDialog
          status={status}
          winner={winner}
          fen={fen}
        />
      ) : null}
    </div>
  );
}

export default BoardView;
