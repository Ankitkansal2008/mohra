# Mohra

A clean, fast, offline-first browser chess game. Play against the computer across three difficulty levels, or with a friend on one device.

## Architecture

- **Rules Authority**: `chess.js` wrapped as the single source of truth for move legality.
- **Engine Subsystem**: Single-threaded Stockfish WASM running in a dedicated Web Worker off the main thread.
- **Store & Event Pipeline**: Zustand store orchestrating board intent, move execution, clocks, and persistence.
- **UI & Presentation**: React 19 + TypeScript + Vite with custom tokens and mobile-first responsive layout.
- **Testing & Verification**: Vitest unit/component suite and Playwright end-to-end integration tests.

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run build
npm test
npm run lint
```
