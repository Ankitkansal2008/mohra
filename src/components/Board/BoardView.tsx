import type React from 'react';
import {
  Chessboard,
  type PieceDropHandlerArgs,
  type SquareHandlerArgs,
} from 'react-chessboard';
import {
  BOARD_HIGHLIGHTS,
  BOARD_THEMES,
  type BoardTheme,
} from '../../styles/boardTokens.ts';
import { en } from '../../copy/en.ts';

export interface BoardViewProps {
  /** The position string in FEN notation */
  readonly fen: string;
  /** Primary perspective of the board */
  readonly boardOrientation?: 'white' | 'black';
  /** Token-backed board palette */
  readonly theme?: BoardTheme;
  /** Current selected square */
  readonly selected?: string | null;
  /** Origin and destination of the most recent move */
  readonly lastMove?:
    | readonly [string, string]
    | { readonly from: string; readonly to: string }
    | readonly string[]
    | null;
  /** Candidate destinations for the currently selected piece */
  readonly legalTargets?: readonly string[] | null;
  /** Square of the king currently under check */
  readonly check?: string | null;
  /** Optional custom styling or container overrides */
  readonly className?: string;
  readonly style?: React.CSSProperties;
}

export function BoardView({
  fen,
  boardOrientation = 'white',
  theme = 'default',
  selected,
  lastMove,
  legalTargets,
  check,
  className = '',
  style,
}: BoardViewProps): React.JSX.Element {
  const colors = BOARD_THEMES[theme] ?? BOARD_THEMES.default;

  // Visual state channels are combined into square-specific styles before passing to react-chessboard.
  const squareStyles: Record<string, React.CSSProperties> = {};

  if (lastMove) {
    const squares: readonly string[] =
      'from' in lastMove ? [lastMove.from, lastMove.to] : lastMove;
    for (const square of squares) {
      if (square) {
        squareStyles[square] = {
          ...squareStyles[square],
          ...BOARD_HIGHLIGHTS.lastMove,
        };
      }
    }
  }

  if (selected) {
    squareStyles[selected] = {
      ...squareStyles[selected],
      ...BOARD_HIGHLIGHTS.selected,
    };
  }

  if (check) {
    squareStyles[check] = {
      ...squareStyles[check],
      ...BOARD_HIGHLIGHTS.check,
    };
  }

  if (legalTargets) {
    for (const square of legalTargets) {
      if (square) {
        squareStyles[square] = {
          ...squareStyles[square],
          ...BOARD_HIGHLIGHTS.legalTarget,
        };
      }
    }
  }

  return (
    // Sizing via clamp and aspect-ratio ensures pure-CSS layout stability across viewport changes.
    <div
      className={`gambit-board-wrapper ${className}`.trim()}
      style={{
        width: 'clamp(320px, 100%, 100%)',
        maxWidth: '100%',
        aspectRatio: '1 / 1',
        pointerEvents: 'none',
        ...style,
      }}
      aria-label={en.boardAriaLabel}
    >
      <Chessboard
        options={{
          position: fen,
          boardOrientation,
          lightSquareStyle: {
            backgroundColor: colors.light,
          },
          darkSquareStyle: {
            backgroundColor: colors.dark,
          },
          squareStyles,
          animationDurationInMs: 150,
          showAnimations: true,
          showNotation: true,
          alphaNotationStyle: {
            fontSize: '11px',
          },
          numericNotationStyle: {
            fontSize: '11px',
          },
          darkSquareNotationStyle: {
            color: 'var(--color-muted, #5A5A5A)',
            fontSize: '11px',
          },
          lightSquareNotationStyle: {
            color: 'var(--color-muted, #5A5A5A)',
            fontSize: '11px',
          },
          boardStyle: {
            pointerEvents: 'none',
          },
          // Pointer events are strictly disabled in this stage to avoid unvalidated user actions.
          allowDragging: false,
          canDragPiece: () => false,
          onPieceDrop: (_args: PieceDropHandlerArgs) => false,
          onSquareClick: (_args: SquareHandlerArgs) => {},
        }}
      />
    </div>
  );
}

export default BoardView;
