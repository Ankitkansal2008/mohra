TECHNICAL REQUIREMENTS DOCUMENT

# Gambit: how it is built, and why each piece was chosen

Stack, module boundaries, engine integration, state model, phase 2 backend contract, and the test plan that proves the rules are right.

- **System:** Single-page web application, static hosting, no backend in v1
- **Version / date:** 1.0 / 05 Nov 2026
- **Audience:** The build agent, and any developer who picks this up later
- **Read with:** PRD (what), UI/UX Design (look), Vibe-Coding Prompts (order of work)

---

## 1. Stack: five decisions that carry the project

Every choice below is the boring, well-trodden option. A chess game has exactly one hard part - correct move generation - and the stack is picked so nothing else competes for attention.

| Layer | Choice | Why this one | Rejected |
| --- | --- | --- | --- |
| App shell | React 19 + TypeScript + Vite | Typed game state catches the majority of move-handling bugs at compile time; Vite's dev server and static build are one command each | Next.js - server rendering buys nothing for a client-only board and adds routing and deployment weight |
| Rules engine | chess.js | Complete FIDE legality including castling rights, en passant, threefold and fifty-move; FEN and PGN in and out; widely used so its bugs are known | Hand-written generator - weeks of work and the likeliest source of a wrong result |
| Board rendering | react-chessboard with an SVG piece set | Drag, click-to-move, animations, arrows and custom square styles out of the box; SVG pieces stay sharp at every size | Canvas - loses accessibility and text selection for no measurable gain; chessground is excellent but assumes lichess's conventions |
| Computer opponent | Stockfish compiled to WebAssembly, single-threaded 'lite' build, inside a Web Worker | Runs offline, no server cost, no API keys. The lite build avoids SharedArrayBuffer, so it deploys to any static host without cross-origin isolation headers | Cloud engine API - adds a backend, latency and a key; multi-threaded WASM - needs COOP/COEP headers that break simple static hosting |
| Client state | Zustand | One small store, no provider tree, easy to serialise for save and restore | Redux Toolkit - more ceremony than a single-screen app needs |
| Styling | Tailwind CSS with design tokens as CSS variables | Token-driven theming (board colours, piece animation) without a runtime CSS-in-JS cost | styled-components - runtime cost during drag |
| Tests | Vitest + Testing Library, Playwright for end-to-end | Same runner as Vite; Playwright drives real drag gestures | Cypress - heavier install for the same coverage |
| Hosting (v1) | Cloudflare Pages, static | Free, global CDN, correct cache headers for the 1 MB engine asset | Netlify or Vercel - equally fine, pick one and stop |
| Hosting (phase 2) | Supabase: Postgres, Auth, Realtime channels | Server-side row-level rules, presence and broadcast without writing a socket server | Node + Socket.IO - full control, but it is a service to operate and patch |

> Pin versions, do not float them. Commit the lockfile. chess.js and react-chessboard both change their APIs across major versions, and an agent that installs 'latest' mid-build will produce code that does not match the rest of the file. Record the resolved versions in the README on day one.

## 2. Architecture in one picture

Four layers, one direction of data. The board never mutates game state directly; it emits an intent, the store validates it through the rules engine, and the resulting position flows back out.

```
  +--------------------- UI layer (React) ----------------------+
  |  BoardView      MoveList     GameOverDialog    Settings      |
  |  drag / click   SAN history   result + reason   preferences  |
  +---------------------------+---------------------------------+
                              | intents: move, undo, resign, flip
                              v
  +--------------------- State layer (Zustand) -----------------+
  |  gameSlice   : position, history, turn, status, clocks       |
  |  uiSlice     : selection, legal targets, theme, sound        |
  |  engineSlice : level, thinking, lastMove, request token      |
  +---------------------------+---------------------------------+
             | validates                       | asks for a move
             v                                 v
  +--------------------+            +---------------------------+
  | Rules (chess.js)   |            | Engine bridge             |
  | single instance,   |            | postMessage <-> Worker    |
  | never in UI code   |            | Stockfish WASM + UCI      |
  +--------------------+            +---------------------------+
             |                                 |
             +--------> Persistence <-----------+
                   localStorage (state + PGN) / export
```

| Module | Owns | Must never |
| --- | --- | --- |
| src/game/rules.ts | The single chess.js instance; apply, undo, legal moves, status, FEN/PGN | Touch React, DOM, storage or the engine |
| src/game/store.ts | Zustand store, slices, derived selectors | Call the engine directly - it dispatches to the bridge |
| src/engine/bridge.ts | Worker lifecycle, request tokens, timeouts, level-to-UCI mapping | Know anything about the board or the UI |
| src/engine/worker.ts | Stockfish WASM, UCI line protocol, search lifecycle | Import React or app state |
| src/components/Board | Rendering, drag and click input, legal-target dots, animation | Validate moves itself; it asks the store |
| src/components/Panels | Move list, clocks, controls, dialogs | Hold game state in local component state |
| src/lib/persist.ts | Save, load, version, migrate, corrupt-state fallback | Block the first render - load after mount |

## 3. Repository layout

```
gambit/
  public/engine/stockfish-lite.js          engine asset, cached immutably
  src/
    main.tsx  App.tsx
    game/      rules.ts  store.ts  types.ts  clock.ts  pgn.ts  perft.test.ts
    engine/    bridge.ts  worker.ts  levels.ts  uci.ts
    components/ Board/  Panels/  Dialogs/  ui/
    lib/       persist.ts  sound.ts  format.ts  analytics.ts
    styles/    tokens.css  globals.css
    copy/      en.ts                        every user-facing string
  tests/       e2e/  fixtures/positions.json
  docs/        PRD.md  TRD.md  UIUX.md  PROMPTS.md
```

## 4. Game state: one serialisable object

The rules engine is the source of truth for the position; the store is the source of truth for everything around it. Nothing derived is stored, because two copies of the same fact drift.

```
type Side = "w" | "b";
type Level = 1 | 2 | 3 | 4;

interface ClockState {
  whiteMs: number; blackMs: number;
  running: Side | null;          // null when paused or off
  lastTickAt: number | null;     // epoch ms, for interpolation only
}

interface GameState {
  id: string;                    // crypto.randomUUID()
  fen: string;                   // current position
  pgn: string;                   // growing SAN history
  moves: string[];               // SAN, one per ply
  uciMoves: string[];            // e2e4 style, for engine replay
  turn: Side;
  status: "playing" | "check" | "checkmate" | "stalemate"
        | "draw-repetition" | "draw-fifty" | "draw-material"
        | "resigned" | "timeout";
  winner: Side | null;           // null on any draw
  mode: "computer" | "local";
  humanSide: Side;               // ignored in local mode
  level: Level;
  clock: ClockState | null;      // null when clock is off
  startedAt: number;
  savedAt: number;               // for stale-game prompts
}

interface UiState {
  selected: string | null;       // square like "e2"
  targets: string[];             // legal destinations for the selection
  pendingPromotion: { from: string; to: string } | null;
  reviewPly: number | null;      // null = live position
  flipped: boolean;
  theme: "green" | "slate";
  soundOn: boolean;
  animationOn: boolean;
  showCoords: boolean;
}
```

- Derived values - is the king in check, whose move, is the game over - are recomputed from fen, never stored.
- Review mode renders a position read from the move list; it never mutates the live game.
- The whole GameState is JSON-serialisable, which is what makes save, restore and (in phase 2) server sync one mechanism.

## 5. The move pipeline

Every input path - drag, click, keyboard, engine - enters at step 1. There is no second path that skips validation.

1. Intent. The board emits { type: 'move', from, to, promotion? }. Nothing has changed yet.
2. Pre-check. If the game is over, or it is not that side's turn, or review mode is active, reject and return. No error toast for a wrong-turn tap; just no-op.
3. Validate. Ask rules.legalMoves(from) whether the target is in the set. If not, reject with a reason code (pinned, wrong-turn, illegal-shape, in-check).
4. Promotion gate. If the move is a pawn reaching the last rank and no piece was chosen, set pendingPromotion and stop - do not apply the move.
5. Apply. rules.applyMove() returns the new SAN, new FEN, and a status. Commit to the store in one update, so React renders once.
6. Animate and announce. Play the 150 ms slide, update the ARIA live region with the SAN, play the sound.
7. Persist. Debounced 400 ms write of GameState to localStorage.
8. Engine turn. If mode is computer and it is the engine's side and status is playing or check, dispatch an engine request with a fresh token.

### Rejection reasons are copy, not codes

The reason code maps to one sentence in copy/en.ts. Silence on an illegal move is the single most common complaint on chess apps, and it is cheap to fix: the refusal must say which rule stopped it.

| Reason code | When it fires | Shown to the player |
| --- | --- | --- |
| pinned | Moving would expose the mover's own king | That piece is pinned - moving it would expose your king. |
| wrong-turn | The other side is to move | (no message - the piece simply does not lift) |
| illegal-shape | The destination is not reachable by that piece | A bishop cannot reach that square from here. |
| in-check | The move leaves the king in check | You are in check - that move leaves your king attacked. |
| castling-blocked | Castling attempted while in, through or into check, or after the pieces moved | You cannot castle out of, through, or into check. |
| game-over | Any input after the game ended | (board is inert; the result panel is shown instead) |

## 6. Rules engine: wrap it, then prove it

chess.js is used through a thin adapter so the rest of the app never touches its API. That keeps a future swap (to a different library or a server-side engine) to one file, and gives one place to put the app's own status vocabulary.

```
// src/game/rules.ts
export interface MoveResult {
  san: string; fen: string; uci: string;
  status: GameStatus; winner: Side | null;
}

export const rules = {
  reset(fen?: string): void,
  legalFrom(square: string): string[],        // destinations for one piece
  legalMovesAll(): Array<{ from: string; to: string; promotion?: string }>,
  apply(from: string, to: string, promotion?: string): MoveResult,
  undo(): MoveResult | null,                  // one ply
  fen(): string,
  pgn(): string,
  loadPgn(pgn: string): void,
  status(): { status: GameStatus; winner: Side | null },
  isAttacked(square: string, by: Side): boolean,
};
```

### Correctness gate: perft

Move generation is verified by counting nodes, not by eyeballing games. These numbers are fixed facts about chess and belong in an automated test that runs on every commit.

| Depth | Nodes from the starting position | What a failure usually means |
| --- | --- | --- |
| 1 | 20 | A piece is missing from the opening setup |
| 2 | 400 | Side-to-move alternation is wrong |
| 3 | 8,902 | Pins or check evasion are incomplete |
| 4 | 197,281 | Castling rights, en passant or promotion is wrong |
| 5 | 4,865,609 | Run nightly only - it is slow and depth 4 already proves the generator |

### Thirty fixtures, not thirty opinions

tests/fixtures/positions.json holds one FEN per rule edge case with its expected outcome: castling through check, en passant that expired, underpromotion to a knight giving mate, stalemate, threefold repetition with differing castling rights, king and bishop versus king, and so on. The suite asserts status and winner for each. This file is the acceptance evidence for PRD section 5.

## 7. Engine integration

Stockfish runs in a Worker and speaks UCI over postMessage. The bridge owns the protocol so no component ever sees a UCI string.

```
main thread                          worker
-----------                          ------
new Worker('engine/worker.ts')
  { type: 'init' }              ->   load stockfish-lite.js, wait for 'uciok'
  { type: 'go', token,          ->   position fen <fen> moves <uci...>
    level, fen, uciMoves }           setoption name Skill Level value <n>
                                     go depth <d> movetime <ms>
                                <-   { type: 'bestmove', token, uci, depth }
  { type: 'stop' }              ->   stop searching, emit bestmove so far
  { type: 'quit' }              ->   terminate
```

| Concern | Rule |
| --- | --- |
| Token discipline | Every request carries an incrementing token. Any reply whose token is not the current one is dropped. This is what stops a stale move landing after undo or a new game. |
| Timeout | Hard 5 s ceiling per request. On timeout send 'stop', accept the bestmove that arrives, and if none arrives within another 500 ms, fall back to a random legal move. |
| First-move latency | Initialise the worker on idle after first paint, not on page load, so the board is interactive first. Warm it up with a depth-1 search during that idle period. |
| Level mapping | levels.ts holds one object per level: skill, depth, movetime, randomness. Level 1 samples among the top 5 root moves; levels 2 to 4 take the engine's best. |
| Failure | If the worker fails to load or throws, the game continues in local two-player mode with a one-line notice: 'The computer opponent could not start. You can keep playing on this device.' |
| Threading | Single-threaded lite build only. Do not add SharedArrayBuffer paths in v1 - they require COOP/COEP headers and break simple static hosting. |
| Asset size | The engine file is loaded with a separate cache header and is never bundled into the app chunk. Target under 1.2 MB uncompressed, under 400 KB brotli. |

> The engine must never be able to move twice. Before applying an engine move, re-check three things: the token is current, it is still the engine's turn, and the game status is playing or check. All three guards, in that order, inside the store - not in the bridge.

## 8. Persistence

| Item | Key / format | Rule |
| --- | --- | --- |
| Game in progress | gambit:game:v1 - JSON GameState | Written debounced 400 ms after each move; on load, if savedAt is older than 24 h, offer 'resume' rather than auto-resuming |
| Settings | gambit:settings:v1 - theme, sound, animation, coords, level | Read once at boot, applied before first paint to avoid a theme flash |
| Schema version | The :v1 suffix plus a schemaVersion field inside the object | A mismatch discards the save and starts fresh - never attempt a partial migration in v1 |
| Corrupt state | try/catch around parse and validate | Fall back to a new game silently, log once. A blank screen is never an acceptable outcome |
| Export | PGN via Blob download and clipboard copy | Headers: Event, Site, Date, White, Black, Result. Result must be 1-0, 0-1 or 1/2-1/2 |

## 9. Rendering and interaction rules

- Board sizing: the board is a square whose side is min(container width, viewport height minus chrome). Compute it in CSS with aspect-ratio and clamp, not with a resize listener, so it never lags a rotation.
- Minimum square: 40px at 320px viewport. Below that, drop coordinate labels before dropping square size.
- Drag: pointer events only (pointerdown, pointermove, pointerup, pointercancel), never HTML5 drag-and-drop, which does not work on touch.
- Touch targets: a piece is grabbable anywhere in its square, but the drop target is the square under the pointer with a 4px tolerance.
- Click-to-move is equal in status to drag: first tap selects and shows dots, second tap moves. Tapping an own piece switches selection.
- Promotion: a small overlay anchored on the destination file, four large targets, keyboard reachable, Escape cancels.
- Animation: transform only, 150 ms, cubic-bezier(0.2, 0, 0, 1). Disabled entirely under prefers-reduced-motion.
- Highlighting: last move, selected square, legal dots and check are four distinct visual channels - never colour alone.
- The engine thinking indicator must not shift layout; reserve its space.

## 10. Phase 2: server contract

The server is authoritative. The client sends an intent, the server validates it with the same rules library, and broadcasts the resulting position to both players. A client that lies about a move gets its message dropped.

| Direction | Event | Payload |
| --- | --- | --- |
| client to server | queue.join | { ratingBand, timeControl, rated } |
| client to server | game.move | { gameId, seq, from, to, promotion? } |
| client to server | game.resign | { gameId } |
| client to server | game.rematch | { gameId } |
| client to server | presence.ping | { gameId, clientTime } |
| server to client | queue.matched | { gameId, colour, opponent, clockMs } |
| server to client | game.state | { fen, moves, turn, clocks, seq, status, winner } |
| server to client | game.reject | { seq, reason } - client rolls back optimistic state |
| server to client | game.over | { result, reason, ratingDelta } |
| server to client | opponent.connection | { state: 'left' / 'back', graceMs } |

### Clock authority

```
// server, on receiving a valid move from side S at time t:
elapsed      = t - game.lastMoveAt
game.clock[S] -= elapsed
if game.clock[S] <= 0:  game.over('timeout', winner = opposite(S))
else:                   game.lastMoveAt = t; broadcast(clock = game.clock)

// client: render remaining = clock[S] - (now - lastMessageAt), clamp at 0,
// and re-sync on every server message. Never let the client decide a flag.
```

### Rating

```
expected = 1 / (1 + 10 ** ((opponentRating - playerRating) / 400))
newRating = playerRating + K * (score - expected)
// score: 1 win, 0.5 draw, 0 loss.  K = 32 for the first 30 rated games, then 16.
// Provisional players (<10 games) may move up to 100 points per game.
```

| Table | Columns |
| --- | --- |
| profiles | id (uuid, = auth.uid), display_name, avatar_url, created_at |
| ratings | profile_id, time_control, rating, games_played, updated_at - primary key (profile_id, time_control) |
| games | id, white_id, black_id, time_control, rated, result, reason, pgn, started_at, ended_at |
| moves | game_id, seq, from, to, promotion, san, clock_white_ms, clock_black_ms, created_at |
| queue | profile_id, time_control, rating, joined_at - row deleted on match |

- Row-level security: a player reads only games they are part of, plus games flagged live for spectating.
- Reconnect: the client presents a resume token bound to gameId and playerId; the server holds the seat for 30 s, then flags the game.
- Move ordering: every move carries a sequence number. Out-of-order or duplicate seq is rejected, which is what makes reconnect safe.
- Anti-cheat signals logged, not acted on automatically: median move time, engine-correlation score, win rate versus rating. A human reviews flags.

## 11. Security, privacy and failure behaviour

| Risk | Control |
| --- | --- |
| Client-side trust (phase 2) | Every move re-validated server-side with the same rules library. Never trust a client-sent FEN or result. |
| Injection through PGN or display names | Render as text, never as HTML. Escape on output; cap lengths (name 24 chars, PGN 20 KB). |
| Denial of service on the socket | Per-connection rate limit of 10 messages per second, 1 move per 500 ms, hard cap on room count per IP. |
| Secrets in the bundle | No API keys in the client at all in v1. In phase 2 the Supabase anon key is the only public value, and row-level security does the work. |
| Dependency risk | Lockfile committed, npm audit in CI, no new dependency without a stated reason in the PR. |
| Data loss | localStorage may be evicted; the app must behave correctly with an empty or corrupt store, and PGN export is always available. |
| Privacy | V1 collects nothing. Phase 2 stores email, display name and game history, with account deletion that removes all rows. |

## 12. Test plan

| Level | Scope | Representative cases | Tool |
| --- | --- | --- | --- |
| Unit - rules | rules.ts and perft | Perft depths 1 to 4; 30 position fixtures; PGN round-trip | Vitest |
| Unit - logic | clock.ts, levels.ts, pgn.ts | Flag on zero, increment applied once, level mapping, PGN headers | Vitest |
| Component | Board, MoveList, dialogs | Dot count for each piece, promotion overlay keyboard path, focus order | Testing Library |
| Integration | Store with a mocked engine | Undo returns turn to human; stale token ignored; game-over blocks input | Vitest + jsdom |
| End-to-end | Real browser, real worker | Full game to mate; resign; reload mid-game; keyboard-only game; 360px viewport | Playwright |
| Manual | Real devices | iOS Safari audio unlock, Android drag, board rotation | Checklist in the UI/UX doc |

The end-to-end suite is the one that matters for release. Five Playwright specs cover the whole of PRD section 9, and they run against the built static bundle - not the dev server - so asset paths and worker loading are exercised exactly as deployed.

## 13. Performance budgets

| Metric | Budget | Where it is measured |
| --- | --- | --- |
| App shell, gzipped | under 400 KB | Build output report in CI |
| Engine asset, brotli | under 400 KB | Build output report in CI |
| Time to interactive board | under 1.5 s on 4G throttling | Lighthouse mobile |
| Longest frame during drag | under 16 ms | Performance trace, mid-range Android |
| Engine move p95, level 3 | under 1.2 s | In-app timing recorded to console in dev builds |
| Memory after 60 moves | under 150 MB | Chrome memory panel |

> Budgets are checked in CI, not remembered. A pull request that pushes the shell over 400 KB fails the build, because bundle creep is invisible until the board takes four seconds to appear on a phone.

## 14. Deployment and CI

1. Push to main triggers: install from lockfile, typecheck, lint, unit tests, build, bundle-size check, Playwright against the built output.
2. Static deploy to Cloudflare Pages. public/engine gets Cache-Control: public, max-age=31536000, immutable with a hashed filename; index.html gets no-cache.
3. Preview deploy per pull request, with the URL posted back to the PR.
4. No environment variables in v1. That is a feature: there is nothing to misconfigure.
5. Rollback is a redeploy of the previous commit - the app has no server state to migrate.

## 15. Known risks and the decision log

| Risk | Likelihood | Impact | Response |
| --- | --- | --- | --- |
| Library major-version API change mid-build | Medium | Medium | Pin exact versions in the lockfile on day one |
| iOS Safari worker or audio quirks | Medium | High | Test on a real iPhone at stage 6, not at the end |
| Engine asset too large for the budget | Low | Medium | Ship the lite build; drop to depth 4 at level 3 before shrinking the engine further |
| Rules edge case discovered late | Medium | High | Perft plus 30 fixtures gate every merge from stage 2 onward |
| Scope creep toward analysis features | High | Medium | PRD non-goals are binding; evaluation bars are phase 3 at the earliest |

### Decisions worth remembering

- Single-threaded engine over multi-threaded: we trade roughly 3x search speed for deployability on any static host.
- chess.js over a hand-written generator: correctness is bought, not built.
- Zustand over Redux: one screen, one store, no ceremony.
- Click-to-move is a first-class input, not an accessibility fallback - it is faster on a phone than dragging.
- No backend in v1, which is why phase 2 is additive rather than a rewrite: state is serialisable and validation is already in one module.
