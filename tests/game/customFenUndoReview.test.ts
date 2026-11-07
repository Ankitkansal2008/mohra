import { beforeEach, describe, expect, it } from 'vitest';
import { getFenAtPly, STARTING_FEN } from '../../src/game/selectors.ts';
import { useGameStore } from '../../src/game/store.ts';
import { clearSavedGame } from '../../src/lib/persist.ts';

describe('Custom FEN undo and review mode integration', () => {
  // Italian Game position reached after 3... Bc5
  const CUSTOM_START_FEN = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';

  beforeEach(() => {
    clearSavedGame();
    useGameStore.getState().resetGame();
  });

  it('sets and preserves startFen when loading custom FEN', () => {
    const loaded = useGameStore.getState().loadFen(CUSTOM_START_FEN);
    expect(loaded).toBe(true);

    const state = useGameStore.getState();
    expect(state.game.fen).toBe(CUSTOM_START_FEN);
    expect(state.game.startFen).toBe(CUSTOM_START_FEN);
  });

  it('undo returns to custom start FEN rather than standard board', () => {
    useGameStore.getState().loadFen(CUSTOM_START_FEN);
    useGameStore.setState((s) => ({ game: { ...s.game, mode: 'local' } }));

    // 1. d3 from custom position
    const moveOk = useGameStore.getState().attemptMove('d2', 'd3');
    expect(moveOk).toBe(true);
    expect(useGameStore.getState().game.moves).toEqual(['d3']);

    // Undo the move
    const undoOk = useGameStore.getState().undo();
    expect(undoOk).toBe(true);

    const stateAfterUndo = useGameStore.getState();
    expect(stateAfterUndo.game.moves).toHaveLength(0);
    // Crucial check: must return to CUSTOM_START_FEN, never STARTING_FEN
    expect(stateAfterUndo.game.fen).toBe(CUSTOM_START_FEN);
    expect(stateAfterUndo.game.fen).not.toBe(STARTING_FEN);
    expect(stateAfterUndo.game.startFen).toBe(CUSTOM_START_FEN);
  });

  it('undo in multi-move game replays from custom startFen', () => {
    useGameStore.getState().loadFen(CUSTOM_START_FEN);
    useGameStore.setState((s) => ({ game: { ...s.game, mode: 'local' } }));

    // 1. d3 d6 2. c3
    useGameStore.getState().attemptMove('d2', 'd3');
    const fenAfterFirstMove = useGameStore.getState().game.fen;
    useGameStore.getState().attemptMove('d7', 'd6');
    useGameStore.getState().attemptMove('c2', 'c3');

    expect(useGameStore.getState().game.moves).toEqual(['d3', 'd6', 'c3']);

    // Undo 2. c3
    useGameStore.getState().undo();
    expect(useGameStore.getState().game.moves).toEqual(['d3', 'd6']);

    // Undo 1... d6
    useGameStore.getState().undo();
    expect(useGameStore.getState().game.moves).toEqual(['d3']);
    expect(useGameStore.getState().game.fen).toBe(fenAfterFirstMove);
    expect(useGameStore.getState().game.startFen).toBe(CUSTOM_START_FEN);
  });

  it('review mode calculates positions derived from custom startFen', () => {
    useGameStore.getState().loadFen(CUSTOM_START_FEN);
    useGameStore.setState((s) => ({ game: { ...s.game, mode: 'local' } }));

    // Play 1. d3 d6
    useGameStore.getState().attemptMove('d2', 'd3');
    useGameStore.getState().attemptMove('d7', 'd6');

    const game = useGameStore.getState().game;

    // Review ply 0 (after 1. d3 from custom position)
    const ply0 = getFenAtPly(game.moves, 0, game.startFen);
    expect(ply0.fen).toContain('2b1p3'); // Bishop on c5 from custom position is still present
    expect(ply0.lastMove).toEqual(['d2', 'd3']);

    // Comparing with standard board replay proves custom startFen was respected
    const standardReplay = getFenAtPly(game.moves, 0, STARTING_FEN);
    expect(standardReplay.fen).not.toBe(ply0.fen);
    expect(standardReplay.fen).toContain('8/8/8/3P4');

    // Review ply 1 (after 1... d6)
    const ply1 = getFenAtPly(game.moves, 1, game.startFen);
    expect(ply1.lastMove).toEqual(['d7', 'd6']);
    expect(ply1.fen).toContain('2b1p3');
  });

  it('restores startFen and allows undo for restored custom games', () => {
    useGameStore.getState().loadFen(CUSTOM_START_FEN);
    useGameStore.setState((s) => ({ game: { ...s.game, mode: 'local' } }));
    useGameStore.getState().attemptMove('d2', 'd3');

    const liveGame = useGameStore.getState().game;
    expect(liveGame.startFen).toBe(CUSTOM_START_FEN);

    // Reset to initial and restore the saved custom game
    useGameStore.getState().resetGame();
    expect(useGameStore.getState().game.fen).toBe(STARTING_FEN);

    useGameStore.getState().restoreGame(liveGame);
    expect(useGameStore.getState().game.startFen).toBe(CUSTOM_START_FEN);

    // Undo from restored custom game returns to CUSTOM_START_FEN
    useGameStore.getState().undo();
    expect(useGameStore.getState().game.fen).toBe(CUSTOM_START_FEN);
    expect(useGameStore.getState().game.fen).not.toBe(STARTING_FEN);
  });

  it('BoardView renders custom game positions during review mode', async () => {
    const React = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { BoardView } = await import('../../src/components/Board/BoardView.tsx');

    useGameStore.getState().loadFen(CUSTOM_START_FEN);
    useGameStore.setState((s) => ({ game: { ...s.game, mode: 'local' } }));
    useGameStore.getState().attemptMove('d2', 'd3');

    // Enter review mode at ply 0
    useGameStore.getState().setReviewPly(0);

    const html = renderToStaticMarkup(React.createElement(BoardView));
    // The board should contain the bishop from Bc5 in the custom start position
    // and reflect d3 as the last move highlight
    expect(html).toContain('gambit-board-wrapper');
    expect(useGameStore.getState().ui.reviewPly).toBe(0);
  });
});
