# Gambit - project rules

## What we are building
A browser chess game: play the computer at 4 levels, or a friend on one device.
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

