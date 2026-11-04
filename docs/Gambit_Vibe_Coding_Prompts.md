PROMPT PACK FOR AI-ASSISTED BUILDING

# Vibe-coding Gambit: ten prompts, in order, that end in a working game

Each prompt is self-contained, has an acceptance check you run yourself, and a recovery prompt for the three ways it usually goes wrong. Paste one stage per session.

- **Works with:** Claude Code, Cursor, Codex, Windsurf, Replit Agent - any agent that edits files and runs commands
- **Version / date:** 1.0 / 05 Nov 2026
- **Rule of the pack:** One stage per prompt. Commit after each. Never ask for two stages at once.
- **Read with:** PRD (what), TRD (how), UI/UX Design (look) - paste the relevant section into the prompt

---

## 1. Why staged prompts beat one big prompt

A single 'build me a chess game' prompt produces a board that renders and a game that breaks on castling. Ten small prompts each end in something you can verify, so a failure is localised to the stage that caused it.

The order matters more than the wording. Rules before rendering, because a board with no validated moves is a picture. Engine last among the core features, because an engine on top of a broken move pipeline hides the break. Polish after function, because styling an unfinished interface wastes both.

| Stage | Goal | Done when | Effort |
| --- | --- | --- | --- |
| 0 | Scaffold and pin dependencies | npm run dev shows a page; lockfile committed | 20 min |
| 1 | Rules adapter plus perft proof | Perft depth 4 equals 197,281 | 45 min |
| 2 | Static board, correct orientation | Starting position renders at 60fps | 45 min |
| 3 | Move interaction with legal-move hints | Every illegal drag is refused with a reason | 2-3 h |
| 4 | Game end states and dialogs | Mate, stalemate and all draws are detected and explained | 1-2 h |
| 5 | Computer opponent | Level 1 replies under 1.5s without freezing the board | 2-3 h |
| 6 | Panels, move list, PGN, save and restore | Reload mid-game restores the position | 2 h |
| 7 | Responsive, accessible, on-token polish | Playable at 360px and by keyboard alone | 3-4 h |
| 8 | Tests, CI and deploy | Green pipeline, live URL | 1-2 h |
| 9 | Online multiplayer (phase 2) | Two browsers, one game, server-validated | later |

## 2. Paste this once: the standing project brief

Every session starts with the same context. Put this in a file called AGENTS.md at the repository root so the agent reads it automatically, and paste it at the top of any session where it does not.

```
# Gambit - project rules

## What we are building
A browser chess game: play the computer at 3 levels, or a friend on one device.
React 19 + TypeScript + Vite. chess.js for rules. react-chessboard for the board.
Stockfish WASM (single-threaded lite) in a Web Worker. Zustand for state.
Tailwind with tokens as CSS variables. Vitest + Playwright.

## Non-negotiables
1. The rules engine is the only authority on legality. No component validates a move.
2. Every move path goes through the store. Board -> intent -> store -> rules -> render.
3. The engine never runs on the main thread.
4. Every user-facing string lives in src/copy/en.ts. No English literals in components.
5. No new dependency without a stated reason in the commit message.
6. No backend, no accounts, no network calls in v1.
7. TypeScript strict. No `any` in src/game or src/engine.
8. Commit after each working stage. Never leave main broken.

## Style
- Small files. One responsibility per module. No file over 250 lines.
- Functions over classes. Pure functions in src/game.
- Comment the why, never the what.
- Design tokens only - no raw hex in components.

## How to respond
- State the plan in 3 lines before editing files.
- After editing, list files changed and how to verify.
- If a test fails, fix it before adding anything new.
- Do not refactor code unrelated to the request.
```

## 3. Stage 0: scaffold

### Prompt

```

Create a new Vite project called gambit using the React + TypeScript template. Install chess.js, react-chessboard, zustand and tailwindcss, and set up Tailwind with a tokens.css file that defines the colour, spacing, radius and motion variables from the design spec. Create this folder structure and empty index files: src/game (rules, store, types, clock, pgn), src/engine (bridge, worker, levels, uci), src/components (Board, Panels, Dialogs, ui), src/lib (persist, sound, format), src/copy/en.ts. Set TypeScript to strict. Add npm scripts for dev, build, preview, test and lint. Do not write any chess logic yet. Show me the resolved versions of the four libraries and commit the lockfile.

```

### Done when

- npm run dev serves a page with no console errors.
- The lockfile is committed and the four library versions are printed in your reply.
- src/copy/en.ts exists and exports an empty object typed as a record of strings.

### If it goes wrong

Agent installs a pre-release or an incompatible major: "Pin chess.js and react-chessboard to the latest stable major, reinstall, and show me the API of the board component's props so we agree before stage 2."

## 4. Stage 1: rules adapter and the perft proof

This is the stage that decides whether the product works. It produces no visible output, and it is the one stage not to skip or merge.

### Prompt

```

Implement src/game/rules.ts as a thin adapter over chess.js, exporting exactly this interface: reset(fen), legalFrom(square), legalMovesAll(), apply(from, to, promotion), undo(), fen(), pgn(), loadPgn(pgn), status(), isAttacked(square, by). apply() returns { san, fen, uci, status, winner }. Map chess.js status values to our vocabulary: playing, check, checkmate, stalemate, draw-repetition, draw-fifty, draw-material. Nothing else in the app may import chess.js. Then write src/game/perft.test.ts that counts nodes from the starting position at depths 1 to 4 and asserts 20, 400, 8902 and 197281. Then create tests/fixtures/positions.json with one entry per edge case: castling both sides, castling refused through check, castling refused after the king moved, en passant legal and expired, promotion to each of the four pieces, pin, checkmate, stalemate, threefold repetition, fifty-move, king and bishop versus king, king and knight versus king. Each entry is { name, fen, moves, expectedStatus, expectedWinner }. Write a test that walks every fixture. Run the tests and paste the output.

```

### Done when

- Perft 1 to 4 passes exactly.
- All fixtures pass, or a fixture's expectation is corrected with a one-line written justification.
- grep for 'chess.js' outside src/game/rules.ts returns nothing.

### If it goes wrong

- Depth 4 gives a number near but not equal to 197,281: castling rights or en passant is wrong. Say so and ask the agent to debug move generation before continuing - do not accept 'close enough'.
- The agent writes its own move generator: refuse it. "Use the library. Delete the custom generator."

## 5. Stage 2: a board that renders the truth

### Prompt

```

Build src/components/Board/BoardView.tsx. It takes a FEN and renders an 8x8 board using react-chessboard with our SVG piece set, white at the bottom by default. Size the board as a square that fills its container using CSS aspect-ratio, with a minimum square size of 40px and coordinate labels that hide below 360px viewport width. Apply the board colours from tokens.css: #EBECD0 light, #779556 dark, with a slate theme alternative. Add the four square-style channels now, as props, even if nothing sets them yet: selected, lastMove, legalTargets and check. No interaction yet - pointer events are disabled in this stage. Write a component test that renders the starting FEN and asserts 64 squares and the correct square colours at a1 and h1.

```

### Done when

- The starting position is visually correct: white on ranks 1 and 2, black on 7 and 8, queen on d1.
- Resizing the window keeps the board square with no layout jump.
- The component test passes.

### If it goes wrong

Board is not square or jumps on resize: "Replace any JavaScript resize listener with CSS aspect-ratio and a clamp-based size. The board must never need a measurement to lay out."

## 6. Stage 3: interaction, the stage players judge you on

### Prompt

```

Add move interaction, routed through the store, never through the board component. Create src/game/store.ts with a Zustand store holding GameState and UiState as specified in the TRD. The board emits intents only: select(square), clearSelection(), attemptMove(from, to, promotion). attemptMove runs this pipeline: reject if the game is over or the wrong side is to move; ask rules whether the target is legal; if a pawn reaches the last rank and no promotion is given, set pendingPromotion and return without applying; otherwise apply and commit in a single store update. On rejection, set a reason code and show it as a toast for 3 seconds. Reason codes and their exact sentences are in the UI/UX spec, section 7 and section 8 - use them verbatim from src/copy/en.ts. Support both inputs as equals: drag with pointer events (pointerdown, pointermove, pointerup, pointercancel, never HTML5 drag-and-drop), and click-to-move where the first tap selects and the second plays. Show legal destinations as dots on empty squares and rings on occupied squares, using the sizes in the design spec. Animate the moving piece with a 150ms transform, disabled under prefers-reduced-motion. Add the promotion overlay: four pieces anchored above the destination file, keyboard reachable, Escape cancels the move entirely.

```

### Done when

- Every illegal drag returns the piece and shows a sentence - never silence.
- A pinned piece cannot be moved, and the message names the pin.
- Castling moves both pieces in one action, by drag and by click.
- En passant removes the correct pawn.
- Promotion offers four pieces and Escape cancels without playing.
- The board stays interactive at all times.

### If it goes wrong

- Illegal moves get through: the board is validating instead of the store. "Move all validation into the store's attemptMove. The board may only emit intents."
- Drag works on desktop, not on touch: "Replace HTML5 drag events with pointer events and set touch-action: none on the board."
- Piece snaps back with no message: "Every rejection path must set a reason code and render its sentence."

## 7. Stage 4: endings, explained

### Prompt

```

Implement every terminal state and its dialog. Statuses: checkmate, stalemate, draw-repetition, draw-fifty, draw-material, resigned, timeout. When status changes to a terminal value, freeze the board (no input accepted), stop the clocks, and show the result panel over the board area only - the final position must stay visible. The headline and the one-line explanation come verbatim from src/copy/en.ts, section 8 of the UI/UX spec. Example: 'Checkmate. Black wins.' with 'White has no legal move and the king is attacked.' Add resign with a confirmation dialog, and undo that takes back one ply in local mode and two plies in computer mode so the human is always to move after an undo. Undo must be disabled with the sentence 'Nothing to undo yet.' when there is nothing to take back. Write tests for each terminal status using the fixtures from stage 1.

```

### Done when

- Fool's mate ends the game and names the winner.
- A stalemate position reports a draw, not a loss.
- Each of the three draw rules produces its own distinct sentence.
- After undo in computer mode it is the human's turn and the position matches the earlier one.

### If it goes wrong

Board still accepts moves after the game ends: "Add a single guard at the top of attemptMove: if status is terminal, return immediately. Add a test that asserts no state change after checkmate."

## 8. Stage 5: the opponent

### Prompt

```

Add the Stockfish opponent. Put the single-threaded lite WASM build in public/engine/ and load it from a Web Worker at src/engine/worker.ts, speaking UCI over postMessage. The bridge in src/engine/bridge.ts owns the protocol: init, go (with token, level, fen, uciMoves), stop, quit. Every request carries an incrementing token and any reply with a stale token is dropped. Map levels in src/engine/levels.ts: level 1 skill 0-3, depth 2, 200-500ms, random pick among the top 5 root moves; level 2 skill 5-8, depth 4, 400-800ms; level 3 skill 12-15, depth 6-8, 700-1200ms. Initialise the worker on idle after first paint, not at load. Show a thinking indicator after 150ms of search, in a fixed-height slot so nothing shifts. Enforce a 5-second ceiling: send stop, accept the bestmove that arrives, and if none arrives within 500ms play a random legal move. Before applying any engine move, re-check three things in the store: the token is current, it is still the engine's turn, and the status is playing or check. If the worker fails to load, fall back to local two-player mode with the engine-failed banner.

```

### Done when

- Level 1 replies in under 1.5 seconds at p95 and is beatable by a beginner.
- Dragging a piece while the engine thinks stays smooth.
- Undo during the engine's search never results in a double move.
- Killing the engine asset produces the fallback banner, not a blank screen.

### If it goes wrong

- Page freezes while the engine thinks: it is running on the main thread. "Move Stockfish into the Worker. The main thread must only post messages."
- The engine moves twice, or moves after undo: "Implement token invalidation on every undo, new game and level change, and add the three guards inside the store before applying."

## 9. Stage 6: the parts around the board

### Prompt

```

Build the side panel: move list in algebraic notation grouped by move number, clocks above and below the board, and the controls Undo, Flip and Resign. Clicking a move in the list loads that position in review mode; a 'Return to game' button restores the live position. Review mode must never mutate the game. Add PGN export with headers Event, Site, Date, White, Black, Result, available as copy and as download. Add persistence in src/lib/persist.ts: save GameState to localStorage debounced 400ms after each move, restore on mount, and treat any parse failure as a fresh game. Include a schemaVersion field and discard the save on mismatch. Add the optional clock: 10 minutes per side, off by default, running only for the side to move, ending the game as a loss on time. Add sound for move, capture, check and game end, muted by default, with the mute state persisted.

```

### Done when

- A finished game's PGN re-imports to the identical position.
- Reloading mid-game restores the position, move list and clocks.
- A deliberately corrupted localStorage value starts a clean game with no error screen.
- Reviewing move 5 then returning restores the live position without changing it.

## 10. Stage 7: make it feel designed

### Prompt

```

Apply the UI/UX specification. Work only from design tokens - no raw hex values in components. Implement the three layouts: three columns at 1100px and up (240 / board / 280), board plus drawer from 768px, single column below 768px with the move list in a bottom sheet. Verify at 320, 360, 414, 768, 1024 and 1440px: no horizontal scroll, board stays square, minimum square size 40px. Implement keyboard play: the board is one tab stop, arrows move a cursor, Enter or Space selects, arrows move the target, Enter plays, Escape cancels, F flips. Add a polite live region that announces every move in full, for example 'White plays knight to f3, check'. Add prefers-reduced-motion handling that removes all animation. Move every remaining English string into src/copy/en.ts. Run the design QA checklist from section 11 of the UI/UX spec and report each line as pass or fail.

```

### Done when

- A complete game is playable with the keyboard alone.
- Nothing animates under reduced motion and nothing breaks.
- Lighthouse accessibility is 95 or higher.
- No hardcoded English strings remain in components.

## 11. Stage 8: prove it and ship it

### Prompt

```

Write five Playwright end-to-end specs against the built output, not the dev server: a full game to checkmate, a resign flow, a reload mid-game that restores, a keyboard-only game, and a 360px viewport pass through the new-game flow. Add a CI workflow that installs from the lockfile, typechecks, lints, runs unit tests, builds, checks the bundle budget (app shell under 400KB gzipped, engine under 400KB brotli) and runs the Playwright suite. Configure static deployment with immutable caching for public/engine and no-cache for index.html. Write a README with setup, architecture in five lines, and the verification commands.

```

### Done when

- All five specs pass in CI against the production build.
- The bundle budget check fails the build when exceeded - prove it by temporarily adding a large import.
- The README lets a new person run and deploy without asking a question.

## 12. Recovery prompts for the five failures you will hit

| Symptom | Prompt to send |
| --- | --- |
| A rule is wrong and the agent cannot find it | "Write a failing test first: [describe the position and expected outcome]. Then fix the smallest thing that makes it pass. Do not touch other files." |
| The agent rewrites files you did not ask about | "Revert every change outside [files]. Then make only the requested change. I will review a diff before you continue." |
| It works but feels laggy | "Profile the drag interaction. Find anything that re-renders the board on pointermove and memoise it. Report the frame time before and after." |
| The engine is unbeatable at level 1 | "Reduce level 1 to skill 0, depth 2, and pick randomly among the top 5 root moves. Then play 10 self-games at level 1 and report the move list of the worst blunder." |
| Everything is styled but nothing is tested | "Stop adding features. Add the five Playwright specs listed in stage 8 and run them. Fix failures before anything else." |

## 13. Prompt hygiene: seven rules that save hours

1. One stage per prompt. If a prompt has two 'and then' clauses, split it.
2. Name the files. 'Create src/game/rules.ts' gets a better result than 'add the rules'.
3. Paste the spec section rather than describing it. The agent has no memory of these documents.
4. Demand verification, not confidence. 'Run the tests and paste the output' beats 'make sure it works'.
5. Ask for a plan in three lines before edits. It is far cheaper to correct a plan than a diff.
6. Never accept 'done' without the acceptance check. The checklist in each stage exists because that failure is common.
7. Commit after every green stage. A working commit is the only undo that survives a bad session.

```

What not to ask for. 'Build a chess game with AI analysis, puzzles, online play and a nice UI' is four products. Each one is a stage here or is not in v1. The fastest way to a broken build is a prompt that asks for the whole product at once.

```
