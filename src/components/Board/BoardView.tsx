import React, { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { en } from '../../copy/en.ts';
import { findKingSquare, getFenAtPly, getTurn, isCheck, isGameOver } from '../../game/selectors.ts';
import { useGameStore } from '../../game/store.ts';
import type { GameStatus } from '../../game/types.ts';
import { formatLiveMoveAnnouncement } from '../../lib/moveAnnouncement.ts';
import type { BoardTheme } from '../../styles/boardTokens.ts';
import { BOARD_THEMES } from '../../styles/boardTokens.ts';
import { Toast } from '../ui/Toast.tsx';
import { BoardCoordinates } from './BoardCoordinates.tsx';
import { BoardScreenReaderGrid } from './BoardScreenReaderGrid.tsx';
import { buildSquareStyles } from './boardStyles.ts';
import { PromotionOverlay } from './PromotionOverlay.tsx';
import { useBoardKeyboard } from './useBoardKeyboard.ts';

export interface BoardViewProps {
  readonly fen?: string;
  readonly status?: GameStatus;
  readonly boardOrientation?: 'white' | 'black';
  readonly theme?: BoardTheme;
  readonly selected?: string | null;
  readonly lastMove?: readonly [string, string] | { readonly from: string; readonly to: string } | readonly string[] | null;
  readonly legalTargets?: readonly string[] | null;
  readonly check?: string | null;
  readonly interactive?: boolean;
  readonly className?: string;
  readonly style?: React.CSSProperties;
}

export function BoardView({
  fen: propFen,
  status: propStatus,
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
  const reviewPos = isReviewing ? getFenAtPly(storeGame.moves, storeUi.reviewPly!, storeGame.startFen) : null;
  const fen = propFen ?? (reviewPos ? reviewPos.fen : storeGame.fen);
  const status = propStatus ?? storeGame.status;
  const theme = propTheme ?? storeUi.theme;
  const selected = isReviewing ? null : (propSelected !== undefined ? propSelected : storeUi.selected);
  const lastMove = propLastMove !== undefined ? propLastMove : (reviewPos ? reviewPos.lastMove : storeLastMove);
  const legalTargets = isReviewing ? null : (propLegalTargets !== undefined ? propLegalTargets : storeUi.targets);
  const turn = getTurn(fen);
  const orientation = propBoardOrientation ?? (storeUi.flipped ? 'black' : 'white');
  const isInteractive = interactive && !isReviewing && !isGameOver(status);

  // Keyboard navigation hook provides single-tab-stop board play (UI/UX Section 9).
  const { cursorSquare, isFocused, handleFocus, handleBlur, handleKeyDown } = useBoardKeyboard({
    orientation,
    isInteractive,
    selected,
    onSelectSquare: selectSquare,
    onAttemptMove: attemptMove,
    onCancelPromotion: cancelPromotion,
    hasPendingPromotion: storeUi.pendingPromotion !== null,
  });

  const activeCheck = propCheck !== undefined ? propCheck : isCheck(status) ? findKingSquare(fen, turn) : null;
  const colors = BOARD_THEMES[theme] ?? BOARD_THEMES.default;
  const squareStyles = buildSquareStyles({ lastMove, selected, activeCheck, legalTargets, fen, isFocused, cursorSquare });
  const animationDuration = reducedMotion || !storeUi.animationOn ? 0 : 150;
  const liveAnnouncement = formatLiveMoveAnnouncement(storeAnnounced);

  return (
    <div
      className={`gambit-board-wrapper ${className}`.trim()}
      style={{
        position: 'relative',
        width: 'clamp(320px, 100%, 100%)',
        maxWidth: '100%',
        aspectRatio: '1 / 1',
        pointerEvents: interactive ? 'auto' : 'none',
        touchAction: 'pinch-zoom',
        ...style,
      }}
      tabIndex={interactive ? 0 : -1}
      role={interactive ? 'grid' : 'presentation'}
      aria-hidden={!interactive ? true : undefined}
      aria-label={interactive ? en.boardKeyboardInstructions : undefined}
      aria-rowcount={interactive ? 8 : undefined}
      aria-colcount={interactive ? 8 : undefined}
      aria-activedescendant={interactive && isFocused ? `gambit-cell-${cursorSquare}` : undefined}
      onFocus={interactive ? handleFocus : undefined}
      onBlur={interactive ? handleBlur : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
    >
      {storeToast ? (
        <div style={{ position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)', zIndex: 60, maxWidth: '90%' }}>
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
        {liveAnnouncement}
      </div>

      <BoardScreenReaderGrid fen={fen} selected={selected} orientation={orientation} />

      <BoardCoordinates boardOrientation={orientation} showCoords={storeUi.showCoords}>
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            lightSquareStyle: { backgroundColor: colors.light },
            darkSquareStyle: { backgroundColor: colors.dark },
            squareStyles,
            animationDurationInMs: animationDuration,
            showAnimations: animationDuration > 0,
            showNotation: false,
            boardStyle: { touchAction: 'pinch-zoom', ...(isInteractive ? {} : { pointerEvents: 'none' }) },
            allowDragging: isInteractive,
            canDragPiece: ({ piece }) => (isInteractive ? piece.pieceType[0] === turn : false),
            onPieceDrop: ({ sourceSquare, targetSquare }) => {
              if (!isInteractive || !targetSquare || sourceSquare === targetSquare) return false;
              return attemptMove(sourceSquare, targetSquare);
            },
            onSquareClick: ({ square }) => {
              if (isInteractive) selectSquare(square);
            },
          }}
        />
      </BoardCoordinates>

      {storeUi.pendingPromotion ? (
        <PromotionOverlay
          toSquare={storeUi.pendingPromotion.to}
          side={turn}
          boardOrientation={orientation}
          onSelect={(piece) => confirmPromotion(piece)}
          onCancel={cancelPromotion}
        />
      ) : null}
    </div>
  );
}

export default BoardView;
