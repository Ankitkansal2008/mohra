# Mohra

A clean, fast, offline-first browser chess game. Play against the computer across four difficulty levels, or with a friend on one device.

## Setup

Requires Node.js 20+ and npm.

```bash
# Install exact dependencies from the lockfile
npm ci

# Start local development server
npm run dev

# Open preview of production build
npm run build
npm run preview
```

## Architecture Summary

1. **UI Layer (React 19 + react-chessboard)**: Renders board, controls, and dialogs driven by state tokens; emits user intents without validating move legality.
2. **State Layer (Zustand)**: Single source of truth managing the move pipeline, clocks, UI state, token-disciplined engine requests, and debounced localStorage saves.
3. **Rules Engine (chess.js)**: Wrapped authoritative FIDE referee handling all move validations, check/checkmate/draw evaluations, and FEN/PGN serialization.
4. **Engine Subsystem (Stockfish WASM)**: Runs single-threaded in a dedicated Web Worker speaking UCI over postMessage completely off the main thread.
5. **Persistence & Static Core**: Client-only, zero-backend architecture preserving in-progress games in localStorage and serving static assets.

## Verification

Run the test and verification suite:

```bash
# Typecheck
npx tsc --noEmit

# Lint
npm run lint

# Run unit tests (rules, store, clocks, engine bridge, fixtures, perft)
npm test -- --run

# Build static production bundle
npm run build

# Check bundle performance budgets (app shell gzipped < 400KB, engine brotli < 400KB)
npm run check:budget

# Install Playwright browser binaries (first run only)
npx playwright install chromium

# Run Playwright end-to-end suite against the built output
npm run test:e2e
```

## Deployment

Mohra is designed for static hosting on Cloudflare Pages (or any CDN):

1. **Build the production bundle**:
   ```bash
   npm run build
   ```
2. **Deploy directory**: `dist/`
3. **HTTP Cache Headers**:
   - `dist/engine/*`: `Cache-Control: public, max-age=31536000, immutable`
   - `dist/index.html`: `Cache-Control: no-cache`
4. **Environment Variables**: None required in v1.
5. **Rollback**: Redeploy the previous commit build artifact.

## Budget Status Note

- **App Shell**: ~139 KB gzipped (Passes the 400 KB budget).
- **Engine Assets**: ~1089.82 KB brotli (Raw Wasm binary is 1.8 MB; exceeds the 400 KB brotli budget). In accordance with the performance budget specification, `npm run check:budget` strictly enforces this limit and fails rather than weakening the threshold.
