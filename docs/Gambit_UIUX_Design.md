UI/UX DESIGN SPECIFICATION

# Gambit: a board that teaches while it plays

Layouts, tokens, components, every string the player reads, and the accessibility rules that are not optional. A developer should be able to build the interface from this document alone.

- **Surface:** Responsive web, 320px to 1920px, portrait and landscape
- **Version / date:** 1.0 / 05 Nov 2026
- **Design intent:** Quiet, confident, legible. The board is the interface; everything else recedes.
- **Read with:** PRD (what it does), TRD (how it is wired), Vibe-Coding Prompts (build order)

---

## 1. Five principles, each with a consequence

These are not aspirations. Each one forbids a specific thing a chess app usually does, and the build is reviewed against them.

| Principle | What it forbids |
| --- | --- |
| The board is the interface | No dashboard, no stats strip, no promotional banner above the board. On mobile the board starts within the first viewport height. |
| Never leave the player guessing | No silent refusals. Every refused action says why in one sentence. Every legal destination is visible before the player commits. |
| One decision at a time | The new-game flow is three taps and never shows difficulty and clock and colour on one crowded screen. Promotion blocks everything else until answered. |
| Thumb first, pointer second | No target under 44px on touch. No hover-only affordance. No drag-only interaction: click-to-move is equal in status. |
| Explain the end, not just the result | Every finished game states which rule ended it, in plain language, not 'Result: 0-1'. |

## 2. Screen map

```
  Home / New game  --[Start]-->  Game  --[result]-->  Game over panel
        |                          |                        |
        |                          +--[resign]--------------+
        |                          +--[undo]--- back to Game
        +--[How to play]           +--[settings sheet]
        +--[Resume saved game] ----+
```

| Screen | Purpose | Entry points |
| --- | --- | --- |
| Home | Pick opponent, level, colour, clock. Start. Also offers 'Resume game' when a save exists | App load, New game, end of a game |
| Game | The board, clocks, move list, controls | Start, Resume |
| Game over | Result, the rule that caused it, rematch, review, copy PGN | Any terminal status |
| Settings | Sound, theme, animation, coordinates, level default | Header icon, game menu |
| How to play | Four short cards: how pieces move, castling, en passant, promotion. Static | Home footer, first-run hint |

## 3. Layouts

### Desktop and tablet landscape: three columns

```
+--------------------------------------------------------------------+
|  Gambit                                       [New game]  [gear]   |
+-------------------+-----------------------------+------------------+
|  BLACK            |    a  b  c  d  e  f  g  h  |  Moves           |
|  Level 3   09:42  |  8 #  .  #  .  #  .  #  .   |  1. e4    e5     |
|                   |  7 .  #  .  #  .  #  .  #   |  2. Nf3   Nc6    |
|  captured: p n    |  6 #  .  #  .  #  .  #  .   |  3. Bb5   a6     |
|                   |  5 .  #  .  #  .  #  .  #   |  4. Ba4   Nf6    |
|                   |  4 .  .  .  .  .  .  .  .   |  5. O-O   Be7    |
|                   |  3 .  .  .  .  .  .  .  .   |  6. Re1   b5     |
|                   |  2 P  P  P  P  P  P  P  P   |                  |
|                   |  1 R  N  B  Q  K  B  N  R   |  [Copy PGN]      |
|                   |    a  b  c  d  e  f  g  h  |  [Download]      |
|  YOU              |                             |                  |
|  White     09:58  |  [Undo] [Flip] [Resign]     |                  |
+-------------------+-----------------------------+------------------+
       240px                    board                    280px
```

The board is the largest square that fits its column. Columns are fixed at 240 and 280 on wide screens; the board takes the remainder and stays square. Below 1100px the right column collapses into a drawer behind a 'Moves' button.

### Mobile portrait: one column, board first

```
+--------------------------+
|  Gambit        [menu]    |
+--------------------------+
|  BLACK   Level 2  09:42  |
+--------------------------+
|   a  b  c  d  e  f  g  h |
| 8 #  .  #  .  #  .  #  . |
| 7 .  #  .  #  .  #  .  # |
| 6 #  .  #  .  #  .  #  . |
| 5 .  #  .  #  .  #  .  # |
| 4 .  .  .  .  .  .  .  . |
| 3 .  .  .  .  .  .  .  . |
| 2 P  P  P  P  P  P  P  P |
| 1 R  N  B  Q  K  B  N  R |
+--------------------------+
|  YOU  White        09:58 |
+--------------------------+
|  [Undo]  [Flip]  [Resign]|
+--------------------------+
```

At 360px the board is 328px wide after 16px page gutters, giving 41px squares - above the 40px floor. The clock row sits above and below the board so each player's time is on their own side. The move list lives in a bottom sheet, not below the fold.

## 4. Board specification

| Element | Spec |
| --- | --- |
| Light square | #EBECD0 |
| Dark square | #779556 |
| Slate theme (alt) | #DEE3E6 light, #8CA2AD dark |
| Piece set | SVG, cburnett-style. White pieces #FFFFFF with a #333 fill outline; black pieces #2B2B2B with a #111 outline. No drop shadows on pieces. |
| Coordinates | Files a-h under the board, ranks 1-8 to the left. 11px, #5A5A5A, hidden below 360px wide. |
| Selected square | #F7EC74 at 45% over the square colour |
| Last move | #F7EC74 at 28% on both origin and destination |
| Legal-move dot | Solid circle, 26% of square width, rgba(20,20,20,0.16). On a piece, a hollow ring at 88% of the square with a 9% stroke instead of a dot |
| Check | Radial gradient, #E4572E at 60% centre fading to transparent at the square edge |
| Drag | Piece lifts to 110% scale with a 2px soft shadow; the origin square shows an empty ghost |
| Focus ring | 2px #1A73E8, offset 2px inside the square, only for keyboard focus |
| Animation | Piece slides 150ms cubic-bezier(0.2, 0, 0, 1); board flip is an instant re-render, never an animated spin |

> Colour is never the only signal. Selection carries a lift plus a fill, legal moves are shapes (dot or ring), check is a gradient plus an announcement, last move is a fill plus a 1px inset border. A player with deuteranopia can read every one of these states.

## 5. Design tokens

| Token group | Values |
| --- | --- |
| Colour - surface | bg #FAFAF7, panel #FFFFFF, border #E2E6DE, ink #1A1A1A, muted #5A5A5A |
| Colour - brand | primary #2F4F3E (buttons, header), primary-hover #253F31, accent #8A9A5B |
| Colour - state | success #3F7D4E, warning #C8892E, danger #C0392B, info #2F6F9F |
| Type | System stack: -apple-system, Segoe UI, Roboto, Helvetica, Arial. Scale 12 / 14 / 16 / 20 / 26 / 34. Body 16px on mobile, 15px on desktop, line height 1.5 |
| Space | 4 / 8 / 12 / 16 / 24 / 32 / 48. Nothing between these values |
| Radius | 6px controls, 10px panels, 14px dialogs, 999px pills |
| Elevation | One shadow only: 0 2px 8px rgba(20,26,20,0.10). No layered shadows |
| Motion | Fast 120ms, base 180ms, slow 260ms. Ease-out entering, ease-in leaving. All disabled under prefers-reduced-motion |
| Touch | Minimum 44x44 target, 8px minimum gap between adjacent targets |

## 6. Components and their states

| Component | States that must exist |
| --- | --- |
| Button (primary / secondary / ghost) | Default, hover, active, focus-visible, disabled, loading (spinner replaces label, width preserved) |
| Segmented control (difficulty) | Four segments; selected segment is filled, not just outlined; disabled when a game is in progress |
| Clock | Running, paused, under 60s (turns #C0392B and shows seconds only), flagged (00:00, game over) |
| Move list row | Live (last row, subtle fill), reviewable (hover fill), reviewing (strong left border), future move (muted) |
| Dialog | Entering, open, closing; focus trapped; Escape closes; backdrop click closes only for non-destructive dialogs |
| Promotion overlay | Four pieces, 64px each on mobile, keyboard reachable in a row, Escape cancels the move entirely |
| Toast | Info, error; 4s auto-dismiss for info, manual dismiss for error; max two stacked |
| Thinking indicator | Three dots pulsing at 1.2s, fixed 24px height so nothing shifts; appears after 150ms of search |
| Empty state (move list) | One line: 'No moves yet. White to play.' |
| Error state (engine) | Inline banner in the panel: 'The computer opponent could not start. You can keep playing on this device.' with a Retry |

## 7. Key flows

### First game, from cold load to first move

1. Home renders with 'Play the computer' pre-selected, level 2 and white already chosen. Nothing is empty or disabled by default.
2. Tap Start. The board appears with white's pieces at the bottom, clocks hidden if the clock toggle is off.
3. A one-line hint sits under the board: 'Tap a piece to see where it can go.' It disappears after the first move and never returns.
4. Player taps e2: the square fills, three dots appear. Taps e4: the pawn slides, the move list gains '1. e4', the engine indicator starts, and within about a second black replies.

Three taps from load to a piece in motion. That is the number the design is optimised for.

### Refused move

1. Player drags a pinned knight. The piece lifts, follows the pointer, and on release returns to its square over 150ms.
2. A toast appears at the top of the board for 3s: 'That piece is pinned - moving it would expose your king.'
3. No state changes, no sound, no move in the list.

### Promotion

1. The pawn reaches the last rank. The board dims to 40% and four pieces appear in a column above the destination square.
2. Choosing queen applies the move instantly. Choosing knight is equally easy - underpromotion is never hidden behind a 'more' menu.
3. Escape or a backdrop tap cancels and the pawn returns; the move is not played.

### Game over

1. The result panel slides up over the board area, not over the whole screen, so the final position stays visible.
2. Headline states the outcome; a second line states the rule: 'Checkmate. Black wins.' / 'White has no legal move and the king is attacked.'
3. Actions: Rematch, Review moves, Copy PGN. Review enters the move list with the final position loaded.

### Resume after reload

If a saved game is under 24 hours old, the Home screen shows 'Resume game - White to move, move 14' above the Start button. Older saves are offered in a quieter line with a Discard action. A corrupt save shows nothing at all and starts clean.

## 8. Every string the player reads

All copy lives in src/copy/en.ts. These are the strings, verbatim - the build should not invent its own.

| Context | Copy |
| --- | --- |
| Home, primary action | Play the computer |
| Home, secondary | Two players, one device |
| Home, level labels | Beginner / Casual / Club / Strong |
| Home, level help | Beginner makes mistakes on purpose so you can win. |
| Home, colour | Play as White / Play as Black / Random |
| Board hint, first run | Tap a piece to see where it can go. |
| Thinking | Thinking... |
| Undo, computer mode | Take back your move and the computer's reply. |
| Undo, at the start | Nothing to undo yet. |
| Resign confirm | Resign this game? The result is final. |
| Resign confirm action | Resign |
| Checkmate | Checkmate. {Winner} wins. |
| Checkmate detail | {Loser} has no legal move and the king is attacked. |
| Stalemate | Stalemate. It's a draw. |
| Stalemate detail | {Side} has no legal move, but the king is not attacked. |
| Repetition | Draw by repetition. |
| Repetition detail | The same position occurred three times. |
| Fifty move | Draw by the fifty-move rule. |
| Fifty move detail | Fifty moves each with no capture and no pawn move. |
| Insufficient material | Draw. Not enough material to checkmate. |
| Resigned | {Player} resigned. {Winner} wins. |
| Timeout | {Player} ran out of time. {Winner} wins. |
| PGN copied | Game copied as PGN. |
| Engine failed | The computer opponent could not start. You can keep playing on this device. |
| Save corrupt | (no message - start a fresh game silently) |
| Offline | You are offline. The game still works; only the online features will not. |

> Voice rules. Second person, present tense, no exclamation marks. Name the rule, not the error code. Never say 'invalid move' - say what is wrong with it. Buttons are verbs ('Resign', 'Copy PGN'), never 'OK'.

## 9. Accessibility, treated as a build requirement

| Requirement | Implementation |
| --- | --- |
| Keyboard play | Tab reaches the board as one stop. Arrow keys move a cursor square (announced as 'e4, white pawn'). Enter or Space selects; arrows then move the target; Enter plays. Escape cancels. F flips the board. |
| Screen reader | The board is a grid with aria-rowcount/colcount and per-square labels. A polite live region announces each move in full: 'White plays knight to f3, check.' |
| Focus visible | Every interactive element has a visible focus ring; the board cursor is a distinct 2px inset outline, never a hover style. |
| Contrast | Body text 4.5:1 minimum; clock and coordinate text 4.5:1 against their own background; never white text on the light square colour. |
| Reduced motion | prefers-reduced-motion removes piece slide, toast slide and dialog scale; state changes become instant. |
| Colour independence | Every board state carries a shape or texture as well as a colour (section 4). |
| Zoom | Layout survives 200% browser zoom without horizontal scroll; the board shrinks, panels collapse to a drawer. |
| Sound | Sound is additive only. Muting loses no information - the move list and live region carry everything. |

## 10. Responsive breakpoints and motion

| Breakpoint | Layout | Board size |
| --- | --- | --- |
| 320-479px | Single column, board full width minus 32px gutters, controls in a 3-button row, move list in a bottom sheet | 288-447px |
| 480-767px | Single column, controls and clocks in one row above and below the board | 448-735px |
| 768-1099px | Board plus a right panel as a collapsible drawer | up to 600px |
| 1100px and up | Three columns: 240 / board / 280 | up to 620px |
| Landscape phone (height < 500px) | Board left, panels right, header collapses to a single row | min(60vw, viewport height - 80px) |

| Motion | Duration | Easing | Reduced motion |
| --- | --- | --- | --- |
| Piece slide | 150ms | cubic-bezier(0.2, 0, 0, 1) | Instant |
| Piece lift on drag | 90ms | ease-out | Instant |
| Dialog in | 180ms | ease-out, 8px rise | Instant |
| Toast in / out | 120ms | ease-out | Instant |
| Panel drawer | 220ms | ease-out | Instant |
| Legal dots appear | 80ms fade | linear | Instant |

## 11. Design QA checklist

Run this before calling the interface done. Each line is pass or fail, with no partial credit.

1. At 320px, 360px, 414px, 768px, 1024px and 1440px: no horizontal scroll, no clipped text, board stays square.
2. The board is fully playable with the keyboard alone: a complete move, a promotion, and an undo.
3. Every state in section 4 is visible on a screenshot, and none relies on colour alone.
4. A refused move always produces a sentence, never silence.
5. The thinking indicator never shifts layout.
6. The promotion overlay is reachable and dismissible by keyboard.
7. With prefers-reduced-motion on, nothing animates and nothing breaks.
8. Contrast check passes on the clock text over both themes.
9. Every string in the interface appears in copy/en.ts - no hardcoded English in components.
10. The first game is startable in three taps from a cold load.
11. The result panel leaves the final board position visible.
12. Sound is muted by default on first load and the mute state persists.
