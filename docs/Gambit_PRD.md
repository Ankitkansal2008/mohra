PRODUCT REQUIREMENTS DOCUMENT

# Gambit: a chess game you can finish in one sitting

What v1 ships, how we know each feature is done, and what waits for phase 2. Written to be handed to a coding agent without further explanation.

- **Product:** Gambit - browser chess, no install, no account in v1
- **Owner:** Ankit
- **Version / date:** 1.0 / 05 Nov 2026
- **Status:** Approved for build
- **Read with:** TRD (how), UI/UX Design (look and flow), Vibe-Coding Prompts (build order)

---

## 1. What we are shipping

V1 is a single-page web app where one person plays a complete, correctly ruled game of chess against a computer opponent on three difficulty levels, or against a friend on the same device. No sign-up, no server, no network calls after the page loads. Phase 2 adds online play.

The differentiator is not features - it is rule correctness and finishability. Every mainstream free chess site assumes you already know the game. Gambit targets the player who knows the pieces move but is unsure about castling through check, or when en passant is legal. So the board teaches while it plays: legal moves are shown, illegal drags are refused with a reason, and the end of a game is explained in one plain sentence rather than a result code.

| Area | V1 (build now) | Phase 2 (design only) |
| --- | --- | --- |
| Opponents | Computer at 3 levels; local 2-player on one device | Online human vs human, rated |
| Rules | Full FIDE move legality, all draw conditions | Same, enforced server-side |
| Accounts | None. Progress in localStorage | Email + Google sign-in, rating history |
| Clock | Optional per-side clock, off by default | Server-authoritative clock, increments |
| Board | 2D, drag or click-to-move, responsive 360px to 1920px | Spectator mode, board flip per side |
| Output | PGN export, move list in algebraic notation | Shareable game links, game archive |
| Hosting | Static files on Cloudflare Pages | Static app + Postgres + realtime channel |

## 2. Who plays it, and what each of them needs

Three personas drive every requirement below. If a feature does not serve one of them, it is not in v1.

| Persona | Situation | What breaks for them today | V1 must give them |
| --- | --- | --- | --- |
| The returning beginner | Plays 3-5 games a week on a phone, 10-minute sessions, learned the rules years ago | Loses to the engine in 12 moves, cannot tell a blunder from a bad plan, forgets which openings are legal | A beatable level 1 opponent, legal-move hints, and an undo that lets them take a move back and try again |
| Two friends, one laptop | Wants a board right now, no accounts, no invite links | Every free site pushes sign-up or online matchmaking | Local 2-player mode that starts in two clicks and flips the board between turns |
| The improver | Wants to replay a game and see where it went wrong | Sites hide the PGN behind an account | Move list in algebraic notation, click any move to jump back, one-click PGN copy |

## 3. Goals and non-goals

### Goals for v1

- A first-time visitor reaches a playable board in under 10 seconds and two clicks.
- The rules engine is correct: no illegal move can be made by any input path, and every draw condition is detected.
- The engine never freezes the interface. Interaction stays responsive while it thinks.
- The game is finishable on a 360px-wide phone without pinch-zoom or horizontal scrolling.
- Any game can be exported as valid PGN that loads back into the app unchanged.

### Explicit non-goals for v1

- Chess variants (960, atomic, three-check), tournaments, puzzles, opening explorer, analysis engine arrows.
- Native iOS or Android apps. The web app is the product.
- Monetisation, ads, subscriptions. Nothing to pay for, nothing to gate.
- Server-side anything. V1 is static files; there is no backend to operate.

## 4. Functional requirements

Priority is P0 (blocks release), P1 (ships in v1 if the schedule holds), P2 (next version). The acceptance column is the test the build is judged against - not a restatement of the requirement.

| ID | Requirement | Pri | Acceptance test |
| --- | --- | --- | --- |
| FR-01 | New game: choose opponent (computer or local), difficulty, and colour, then start | P0 | From page load, three clicks reach a board with the chosen side at the bottom |
| FR-02 | Render a standard 8x8 board with correct coordinates, ranks 1-8 and files a-h | P0 | a1 is bottom-left for white; flipping the board moves h1 to bottom-left |
| FR-03 | Move a piece by drag-and-drop, with the piece following the pointer | P0 | Dropping on an illegal square returns the piece to its origin with no state change |
| FR-04 | Move a piece by click origin then click destination | P0 | Two taps complete any legal move; tapping the same square deselects |
| FR-05 | Show legal destinations as dots when a piece is selected or picked up | P0 | A rook on an empty board shows 14 dots; a blocked bishop shows none beyond the blocker |
| FR-06 | Refuse illegal moves with a visible reason, not silence | P0 | Dragging a pinned piece shows 'That piece is pinned - moving it would expose your king' |
| FR-07 | Castling both sides, king and rook moving in one action | P0 | O-O and O-O-O both work; castling out of, through, or into check is refused |
| FR-08 | En passant capture, legal only on the immediate reply | P0 | Capture works on the next move only; the option disappears afterwards |
| FR-09 | Pawn promotion with a four-piece picker, including underpromotion | P0 | Choosing a knight produces a knight; dismissing the picker cancels the move |
| FR-10 | Detect and announce check, checkmate and stalemate | P0 | Fool's mate in 2 ends the game with 'Checkmate - Black wins'; a stalemate position ends as a draw |
| FR-11 | Detect draws: threefold repetition, fifty-move rule, insufficient material | P0 | Each triggers a game-over panel naming the specific rule |
| FR-12 | Resign, with a confirmation step | P0 | Resigning ends the game immediately after confirming; cancelling resumes play |
| FR-13 | Undo: take back one move (computer mode takes back the pair) | P0 | After undo in computer mode it is the human's turn again, board matches the earlier position |
| FR-14 | Computer opponent at three levels, thinking indicator while it plays | P0 | Level 1 responds within 1.5s p95; the board stays draggable while it thinks |
| FR-15 | Move list in standard algebraic notation, grouped by move number | P0 | A game starting 1.e4 e5 2.Nf3 renders as '1. e4 e5' then '2. Nf3' |
| FR-16 | Click a move in the list to view that position; return to live position | P1 | Reviewing move 5 and pressing 'return to game' restores the current position |
| FR-17 | Copy or download the game as PGN | P0 | Exported PGN re-imports into the app to the identical final position |
| FR-18 | Optional clock per side, default 10 minutes, off by default | P1 | Clock counts down only for the side to move; flagging ends the game as a loss on time |
| FR-19 | Flip the board manually at any time | P1 | Flipping mid-game does not change the position or whose turn it is |
| FR-20 | Sound for move, capture, check and game end, with a mute toggle | P1 | Mute persists across reloads; no sound plays when muted |
| FR-21 | Auto-save the game in progress and restore it on reload | P1 | Reloading mid-game restores the exact position, move list and clock |
| FR-22 | Settings: sound, board theme (2 options), piece animation, coordinate labels | P1 | Every setting persists in localStorage and applies without a reload |
| FR-23 | Keyboard-only play: focus the board, arrows move the cursor, Enter selects and drops | P1 | A full move is playable with no pointer input |
| FR-24 | Announce every move to assistive technology in algebraic notation | P1 | A screen reader announces 'White plays knight f3, check' as a live region update |
| FR-25 | Shareable result card image after a game | P2 | Not built in v1; listed so it is not mistaken for a v1 omission |

## 5. Chess rules: the edge cases that decide whether this ships

Chess looks simple and is not. These are the cases that break naive implementations, and each is a release blocker because a wrong result destroys trust faster than a missing feature.

| Rule | Correct behaviour | Common wrong build |
| --- | --- | --- |
| Castling | King moves two squares toward the rook, rook jumps over. Refused if the king is in check, passes through an attacked square, lands on an attacked square, or either piece has already moved. | Checking only the destination square, or allowing castling after the king moved and returned |
| En passant | Available only on the single move immediately after an enemy pawn's two-square advance. The captured pawn is removed from a square the capturing pawn never occupies. | Leaving the option open for a later move, or removing the wrong pawn |
| Promotion | Pawn reaching the last rank must become queen, rook, bishop or knight. Underpromotion is legal and must be offered. | Auto-queening with no picker, or blocking underpromotion |
| Pins | A move that exposes the mover's own king to check is illegal even if it captures something valuable. | Validating only the moving piece's own movement pattern |
| Checkmate vs stalemate | Checkmate: side to move is in check and has no legal move. Stalemate: not in check and no legal move - a draw, not a loss. | Treating both as a win, or missing stalemate entirely |
| Threefold repetition | Same position, same side to move, same castling and en passant rights, occurring three times - claimable draw. | Comparing only piece placement, so castling rights differences are missed |
| Fifty-move rule | Fifty moves by each side with no capture and no pawn move - claimable draw. | Counting half-moves, or resetting the counter on captures only |
| Insufficient material | King vs king, king and bishop vs king, king and knight vs king, king and bishop vs king and bishop on same colour. | Only handling the bare-kings case |
| Time control | Clock runs only for the side to move; running out loses on time unless the opponent has insufficient material to mate. | Running both clocks, or declaring a loss on time in a position that is a dead draw |

> Do not hand-write the rules engine. Use chess.js (or an equivalent vetted library) and spend the effort on verifying it. Perft counts from the starting position - 20, 400, 8,902, 197,281 at depths 1 to 4 - are the fastest proof that move generation is correct. If depth 4 does not equal 197,281, castling, en passant or promotion is wrong.

## 6. The computer opponent

One engine, four personalities. Difficulty comes from three dials together - skill level, search depth and thinking time - because skill level alone produces erratic play at low settings.

| Level | Label | Engine settings | Move time | Plays like | Behaviour rule |
| --- | --- | --- | --- | --- | --- |
| 1 | Beginner | Skill 0-3, depth 2, one random pick among the top 5 moves | 200-500 ms | ~700 rating | Must miss mate in 2 about half the time, so a beginner can win |
| 2 | Casual | Skill 5-8, depth 4 | 400-800 ms | ~1200 rating | Punishes free pieces, misses deep tactics |
| 3 | Club | Skill 12-15, depth 6-8 | 700-1200 ms | ~1600 rating | Never blunders a piece without compensation |
| 4 | Strong (P1) | Skill 20, depth 10+ | 1200-1500 ms | ~2000 rating | Off by default; shown only behind a 'more levels' expander |

- The engine runs in a Web Worker. A blocked main thread during search is the single most likely cause of a 'broken' feel.
- A 'thinking' indicator appears after 150 ms of search - not instantly, which would flicker on fast moves.
- Requests are cancelled when the human starts a new game or undoes. A stale engine reply must never move a piece.
- Hard ceiling of 5 seconds on any single engine move; on timeout, play the best move found so far.
- The engine never plays an illegal move and never resigns on the human's behalf.

## 7. Non-functional requirements

| Area | Requirement | How it is checked |
| --- | --- | --- |
| Load | Interactive board under 1.5 s on a throttled 4G profile; app shell under 400 KB gzipped, engine asset lazy-loaded separately | Lighthouse mobile run on the deployed build |
| Interaction | 60 fps during drag; move animation 150 ms; no frame over 50 ms while the engine searches | Performance profile, one 60-move game on a mid-range Android |
| Responsiveness | Playable at 360x640 and at 1920x1080; no horizontal scroll at any width from 320px up | Manual check at 320, 360, 414, 768, 1024, 1440 |
| Browser support | Latest two versions of Chrome, Safari, Firefox, Edge; iOS Safari 16+; Android Chrome 110+ | Cross-browser smoke test of FR-01 to FR-10 |
| Accessibility | WCAG 2.1 AA: 4.5:1 text contrast, full keyboard play, visible focus, respect prefers-reduced-motion, moves announced as live regions | Lighthouse a11y score 95+, keyboard-only run of a full game |
| Reliability | No uncaught errors in a 30-move game; a corrupted saved game falls back to a fresh game rather than a blank screen | Console clean in e2e; localStorage tamper test |
| Privacy | No account, no personal data, no third-party trackers in v1. Any analytics must be cookieless and aggregate | Network tab shows no requests beyond the app's own assets |
| Localisation | All user-facing strings in one file; date and number formatting locale-aware. English only in v1 | Grep for hardcoded strings outside the copy file |

## 8. Success metrics

V1 is judged on whether games get finished, not on how many people open it. All metrics are computable from local events, so no account is needed to measure them.

| Metric | Definition | Target at 4 weeks |
| --- | --- | --- |
| Game completion rate | Games reaching a natural end / games started | 55% or higher |
| Time to first move | Page load to first legal move made | Median under 20 s |
| Level-1 winnability | Human wins at level 1 / games at level 1 | Between 35% and 55% |
| Rule-error reports | Games where a user reports an illegal or mis-scored move | Zero confirmed |
| Undo usage | Games with at least one undo | Tracked, no target - a signal of learning, not failure |
| Mobile share | Sessions on a viewport under 500px | Tracked to validate the mobile-first layout |
| Crash-free sessions | Sessions with no uncaught error | 99.5% or higher |

## 9. Release criteria

V1 ships when every line below is true. Nothing on this list is optional or negotiable at the end of the build.

1. All P0 requirements pass their acceptance test in a deployed build, on desktop Chrome and on a real phone.
2. Move generation passes perft to depth 4 (197,281 nodes) as an automated test.
3. A full game can be played to checkmate, to stalemate, and by resigning, without a console error.
4. PGN exported from a finished game re-imports to the identical position.
5. The board is fully playable with the keyboard alone and with the pointer alone.
6. Lighthouse mobile: performance 85+, accessibility 95+, best practices 95+.
7. No layout break at 320px width, and no horizontal scrollbar at any tested width.
8. The engine's worst observed move latency in a 40-move game is under 5 seconds.

## 10. Phase 2: online multiplayer

Designed now, built after v1 ships. The v1 architecture must not block it - which is why game state is a serialisable object and the rules engine is isolated behind a single module.

| Capability | Requirement |
| --- | --- |
| Accounts | Email magic link plus Google sign-in. A display name and an optional avatar. No password storage of our own. |
| Matchmaking | Queue by rating band of plus or minus 200, widening by 100 every 10 seconds up to 600. Casual unrated queue available. |
| Game transport | WebSocket channel; every move validated on the server with the same rules library. The client is never trusted. |
| Clock | Server holds the authoritative remaining time; client renders an interpolation and reconciles on every server message. |
| Disconnect | 30-second reconnect grace with a resume token. Beyond that, the disconnected side loses on time. |
| Rating | Elo with K=32 for the first 30 games, K=16 after. Separate rating per time control. |
| Rematch | One-tap rematch offer with colours swapped; expires after 30 seconds. |
| Fair play | Rate limiting, move-time telemetry, and a report button. Chat is preset messages only in phase 2a. |
| Spectating | Watch any live game as a read-only viewer, with a 3-second delay to prevent live assistance. |

## 11. Risks and open questions

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Engine asset is heavy or needs special headers | Stockfish WASM with threads requires cross-origin isolation headers, which complicates static hosting | Ship the single-threaded lite build first; it runs on plain static hosting with no headers |
| Safari quirks on iOS | Audio needs a user gesture; workers and storage can be evicted | Unlock audio on first tap; treat localStorage as best-effort and never depend on it for correctness |
| Rule edge cases surface late | A single mis-scored draw discredits the whole app | Library engine plus perft tests plus a written fixture list of 30 end positions |
| Scope creep toward a chess platform | Analysis, puzzles and variants would triple the build | Non-goals list in section 3 is binding for v1 |
| Mobile board too small to drag accurately | Drag is unreliable under 44px targets on a 360px screen | Click-to-move is a first-class input, not a fallback; squares never drop below 40px |

### Open questions, decided at kickoff

- Do we show an evaluation bar in v1? Recommendation: no. It changes the game from play into study and needs engine analysis of every position.
- Should level 1 be able to lose on purpose? Recommendation: no. Weakening the search is honest; deliberately throwing moves is not.
- Do we keep the clock off by default? Recommendation: yes. A first game should never end on time.

These are recommendations, not decisions. Confirm or overrule them before stage 5 of the build.
