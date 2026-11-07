import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App.tsx';
import { ResultDialog } from '../../src/components/Dialogs/ResultDialog.tsx';
import { en } from '../../src/copy/en.ts';
import { useGameStore } from '../../src/game/store.ts';

describe('Result dialog in game view', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  // 1. checkmate
  it('renders checkmate panel with correct copy when White wins', () => {
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        status: 'checkmate',
        winner: 'w',
      },
    });

    const html = renderToStaticMarkup(React.createElement(App));
    expect(html).toContain('Checkmate. White wins.');
    expect(html).toContain('Black has no legal move and the king is attacked.');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('gambit-result-dialog');
    expect(html).toContain(en.rematch);
    expect(html).toContain(en.reviewMoves);
    expect(html).toContain(en.copyPgn);
  });

  it('renders checkmate panel with correct copy when Black wins', () => {
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        status: 'checkmate',
        winner: 'b',
      },
    });

    const html = renderToStaticMarkup(React.createElement(App));
    expect(html).toContain('Checkmate. Black wins.');
    expect(html).toContain('White has no legal move and the king is attacked.');
  });

  // 2. stalemate
  it('renders stalemate panel with correct copy', () => {
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        status: 'stalemate',
        winner: null,
      },
    });

    const html = renderToStaticMarkup(React.createElement(App));
    expect(html).toContain("Stalemate. It&#x27;s a draw.");
    expect(html).toContain('White has no legal move, but the king is not attacked.');
  });

  // 3. draw-repetition
  it('renders draw by repetition panel with exact copy', () => {
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        status: 'draw-repetition',
        winner: null,
      },
    });

    const html = renderToStaticMarkup(React.createElement(App));
    expect(html).toContain('Draw by repetition.');
    expect(html).toContain('The same position occurred three times.');
  });

  // 4. draw-fifty
  it('renders draw by fifty-move rule panel with exact copy', () => {
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        status: 'draw-fifty',
        winner: null,
      },
    });

    const html = renderToStaticMarkup(React.createElement(App));
    expect(html).toContain('Draw by the fifty-move rule.');
    expect(html).toContain('Fifty moves each with no capture and no pawn move.');
  });

  // 5. draw-material
  it('renders insufficient material panel with exact copy', () => {
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        status: 'draw-material',
        winner: null,
      },
    });

    const html = renderToStaticMarkup(React.createElement(App));
    expect(html).toContain('Draw. Not enough material to checkmate.');
  });

  // 6. resigned
  it('renders resigned panel when Black resigns and White wins', () => {
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        status: 'resigned',
        winner: 'w',
      },
    });

    const html = renderToStaticMarkup(React.createElement(App));
    expect(html).toContain('Black resigned. White wins.');
  });

  it('renders resigned panel when White resigns and Black wins', () => {
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        status: 'resigned',
        winner: 'b',
      },
    });

    const html = renderToStaticMarkup(React.createElement(App));
    expect(html).toContain('White resigned. Black wins.');
  });

  // 7. timeout
  it('renders timeout panel when Black flags and White wins', () => {
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        status: 'timeout',
        winner: 'w',
      },
    });

    const html = renderToStaticMarkup(React.createElement(App));
    expect(html).toContain('Black ran out of time. White wins.');
  });

  it('renders timeout panel when White flags and Black wins', () => {
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game,
        status: 'timeout',
        winner: 'b',
      },
    });

    const html = renderToStaticMarkup(React.createElement(App));
    expect(html).toContain('White ran out of time. Black wins.');
  });

  // Active play guard
  it('does not render result panel during active play', () => {
    const html = renderToStaticMarkup(React.createElement(App));
    expect(html).not.toContain('gambit-result-dialog');
    expect(html).not.toContain('Checkmate');
  });

  // Actions and keyboard reachability
  it('renders keyboard-reachable action buttons: Rematch, Review moves, Copy PGN, Share', () => {
    const html = renderToStaticMarkup(
      React.createElement(ResultDialog, {
        status: 'checkmate',
        winner: 'w',
      }),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain(`>${en.rematch}</button>`);
    expect(html).toContain(`>${en.reviewMoves}</button>`);
    expect(html).toContain(`>${en.copyPgn}</button>`);
    expect(html).toContain(`>${en.share}</button>`);
    // Review moves is disabled until Stage 6 with explanatory title & aria-label
    expect(html).toContain('disabled=""');
    expect(html).toContain(`title="${en.reviewMovesDisabled}"`);
    expect(html).toContain(`aria-label="${en.reviewMovesDisabled}"`);
  });

  it('invokes action handlers when provided via props', () => {
    const onRematch = vi.fn();
    const onCopyPgn = vi.fn();
    const onShare = vi.fn();

    const element = ResultDialog({
      status: 'checkmate',
      winner: 'w',
      onRematch,
      onCopyPgn,
      onShare,
    });

    expect(element).not.toBeNull();
    const actionsDiv = element?.props.children[2];
    expect(actionsDiv.props.className).toBe('gambit-result-dialog-actions');

    const [rematchBtn, reviewBtn, copyBtn, shareBtn] = actionsDiv.props.children;
    expect(reviewBtn.props.disabled).toBe(true);
    expect(reviewBtn.props.title).toBe('Available once the move list is built');

    rematchBtn.props.onClick();
    expect(onRematch).toHaveBeenCalledTimes(1);

    copyBtn.props.onClick();
    expect(onCopyPgn).toHaveBeenCalledTimes(1);

    shareBtn.props.onClick();
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('invokes navigator.share when available and does not show copy toast', () => {
    const originalNavigator = globalThis.navigator;
    const shareMock = vi.fn().mockResolvedValue(undefined);
    const showToastSpy = vi.spyOn(useGameStore.getState(), 'showToast');

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        share: shareMock,
        clipboard: { writeText: vi.fn() },
      },
      configurable: true,
      writable: true,
    });

    const element = ResultDialog({
      status: 'checkmate',
      winner: 'w',
    });
    const actionsDiv = element?.props.children[2];
    const shareBtn = actionsDiv.props.children[3];

    shareBtn.props.onClick();

    expect(shareMock).toHaveBeenCalledTimes(1);
    expect(shareMock).toHaveBeenCalledWith({
      title: en.mohra,
      text: en.shareText,
      url: en.shareUrl,
    });
    expect(shareMock.mock.calls[0][0].text).not.toContain('http');
    expect(showToastSpy).not.toHaveBeenCalledWith(en.linkCopied);

    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('copies text and URL to clipboard and shows toast when navigator.share is unavailable', () => {
    const originalNavigator = globalThis.navigator;
    const writeTextMock = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        clipboard: { writeText: writeTextMock },
      },
      configurable: true,
      writable: true,
    });

    const element = ResultDialog({
      status: 'checkmate',
      winner: 'w',
    });
    const actionsDiv = element?.props.children[2];
    const shareBtn = actionsDiv.props.children[3];

    shareBtn.props.onClick();

    expect(writeTextMock).toHaveBeenCalledWith(`${en.shareText}\n${en.shareUrl}`);
    expect(useGameStore.getState().toast?.message).toBe(en.linkCopied);

    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('asserts en.shareText does not include http and clipboard payload contains the URL exactly once', () => {
    expect(en.shareText).not.toContain('http');

    const originalNavigator = globalThis.navigator;
    const writeTextMock = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        clipboard: { writeText: writeTextMock },
      },
      configurable: true,
      writable: true,
    });

    const element = ResultDialog({
      status: 'checkmate',
      winner: 'w',
    });
    const actionsDiv = element?.props.children[2];
    const shareBtn = actionsDiv.props.children[3];

    shareBtn.props.onClick();

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const payload = writeTextMock.mock.calls[0][0] as string;
    const occurrences = payload.split(en.shareUrl).length - 1;
    expect(occurrences).toBe(1);
    expect(payload).toBe(`${en.shareText}\n${en.shareUrl}`);

    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('enables Review moves when moves exist and enters review mode on click', () => {
    useGameStore.setState((s) => ({
      game: { ...s.game, moves: ['e4', 'e5'], status: 'checkmate', winner: 'w' },
    }));

    const onReviewMoves = vi.fn();
    const element = ResultDialog({
      status: 'checkmate',
      winner: 'w',
      onReviewMoves,
    });

    const actionsDiv = element?.props.children[2];
    const [, reviewBtn] = actionsDiv.props.children;
    expect(reviewBtn.props.disabled).toBe(false);

    reviewBtn.props.onClick();
    expect(onReviewMoves).toHaveBeenCalledTimes(1);

    // When clicked without custom callback, enters review mode at last ply
    const elementDefault = ResultDialog({
      status: 'checkmate',
      winner: 'w',
    });
    const actionsDivDefault = elementDefault?.props.children[2];
    const [, reviewBtnDefault] = actionsDivDefault.props.children;
    reviewBtnDefault.props.onClick();
    expect(useGameStore.getState().ui.reviewPly).toBe(1);
  });
});
