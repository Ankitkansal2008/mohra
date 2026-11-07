import type React from 'react';
import { isSquareOccupied } from '../../game/selectors.ts';
import { BOARD_HIGHLIGHTS } from '../../styles/boardTokens.ts';

export interface BuildSquareStylesParams {
  readonly lastMove?: readonly string[] | readonly [string, string] | { readonly from: string; readonly to: string } | null;
  readonly selected?: string | null;
  readonly activeCheck?: string | null;
  readonly legalTargets?: readonly string[] | null;
  readonly fen: string;
  readonly isFocused?: boolean;
  readonly cursorSquare?: string | null;
}

// Visual highlights for board squares combining active channels without color reliance.
export function buildSquareStyles(params: BuildSquareStylesParams): Record<string, React.CSSProperties> {
  const { lastMove, selected, activeCheck, legalTargets, fen, isFocused, cursorSquare } = params;
  const styles: Record<string, React.CSSProperties> = {};

  if (lastMove) {
    const squares: readonly string[] = 'from' in lastMove ? [lastMove.from, lastMove.to] : lastMove;
    for (const square of squares) {
      if (square) styles[square] = { ...styles[square], ...BOARD_HIGHLIGHTS.lastMove };
    }
  }

  if (selected) {
    styles[selected] = { ...styles[selected], ...BOARD_HIGHLIGHTS.selected };
  }

  if (activeCheck) {
    styles[activeCheck] = { ...styles[activeCheck], ...BOARD_HIGHLIGHTS.check };
  }

  if (legalTargets) {
    for (const target of legalTargets) {
      if (target) {
        const isOccupied = isSquareOccupied(fen, target);
        styles[target] = {
          ...styles[target],
          ...(isOccupied ? BOARD_HIGHLIGHTS.legalTargetOccupied : BOARD_HIGHLIGHTS.legalTargetEmpty),
        };
      }
    }
  }

  if (isFocused && cursorSquare) {
    styles[cursorSquare] = {
      ...styles[cursorSquare],
      outline: '2px solid var(--color-focus)',
      outlineOffset: '-2px',
      zIndex: 10,
    };
  }

  return styles;
}

export default buildSquareStyles;

