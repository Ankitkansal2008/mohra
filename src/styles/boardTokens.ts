import type React from 'react';

export type BoardTheme = 'default' | 'slate';

export interface BoardThemeColors {
  readonly light: string;
  readonly dark: string;
}

// Tokenized palettes match the specification in Gambit_UIUX_Design.md section 4.
export const BOARD_THEMES: Record<BoardTheme, BoardThemeColors> = {
  default: {
    light: 'var(--color-board-light)',
    dark: 'var(--color-board-dark)',
  },
  slate: {
    light: 'var(--color-board-slate-light)',
    dark: 'var(--color-board-slate-dark)',
  },
} as const;

// Visual overlay tokens for active channels so color is never the only semantic signal.
export const BOARD_HIGHLIGHTS = {
  selected: {
    backgroundColor: 'var(--board-selected, rgba(247, 236, 116, 0.45))',
  },
  lastMove: {
    backgroundColor: 'var(--board-last-move, rgba(247, 236, 116, 0.28))',
  },
  check: {
    backgroundImage:
      'var(--board-check, radial-gradient(circle, rgba(228, 87, 46, 0.6) 0%, rgba(228, 87, 46, 0) 70%))',
  },
  legalTarget: {
    backgroundImage:
      'radial-gradient(circle, var(--board-legal-dot, rgba(20, 20, 20, 0.16)) 26%, transparent 27%)',
    borderRadius: '50%',
  },
  legalTargetEmpty: {
    backgroundImage:
      'radial-gradient(circle, var(--board-legal-dot, rgba(20, 20, 20, 0.16)) 26%, transparent 27%)',
  },
  legalTargetOccupied: {
    backgroundImage:
      'radial-gradient(circle, transparent 35%, var(--board-legal-dot, rgba(20, 20, 20, 0.16)) 35%, var(--board-legal-dot, rgba(20, 20, 20, 0.16)) 44%, transparent 44.5%)',
  },
} satisfies Record<string, React.CSSProperties>;
