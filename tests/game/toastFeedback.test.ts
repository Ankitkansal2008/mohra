import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '../../src/copy/en.ts';
import { useGameStore } from '../../src/game/store.ts';
import * as soundModule from '../../src/lib/sound.ts';

describe('Toast feedback audio integration', () => {
  let playSoundSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useGameStore.getState().resetGame();
    useGameStore.getState().setSoundOn(true);
    useGameStore.getState().dismissToast();
    soundModule.resetAudioForTesting();
    playSoundSpy = vi.spyOn(soundModule, 'playSound').mockImplementation(() => {});
  });

  afterEach(() => {
    playSoundSpy.mockRestore();
    soundModule.resetAudioForTesting();
  });

  it('an error toast triggers "refuse" exactly once', () => {
    // 1. Illegal shape move triggers "refuse" exactly once
    useGameStore.getState().attemptMove('e2', 'f3');
    expect(useGameStore.getState().toast?.reason).toBe('illegal-shape');
    expect(playSoundSpy).toHaveBeenCalledTimes(1);
    expect(playSoundSpy).toHaveBeenCalledWith('refuse', true);

    // 2. Direct rejection toasts for pinned, in-check, castling-blocked, game-over trigger refuse
    useGameStore.getState().setRejectionToast('pinned');
    expect(playSoundSpy).toHaveBeenLastCalledWith('refuse', true);

    useGameStore.getState().setRejectionToast('in-check');
    expect(playSoundSpy).toHaveBeenLastCalledWith('refuse', true);

    useGameStore.getState().setRejectionToast('castling-blocked');
    expect(playSoundSpy).toHaveBeenLastCalledWith('refuse', true);

    useGameStore.getState().setRejectionToast('game-over');
    expect(playSoundSpy).toHaveBeenLastCalledWith('refuse', true);
  });

  it('wrong-turn triggers no sound', () => {
    // Black piece attempted on White turn
    useGameStore.getState().attemptMove('e7', 'e5');
    expect(useGameStore.getState().toast?.reason).toBe('wrong-turn');
    expect(playSoundSpy).not.toHaveBeenCalled();

    // Direct wrong-turn toast remains silent
    useGameStore.getState().setRejectionToast('wrong-turn');
    expect(playSoundSpy).not.toHaveBeenCalled();
  });

  it('the mute setting suppresses both refuse and notify sounds', () => {
    useGameStore.getState().setSoundOn(false);

    // Error toast when muted
    useGameStore.getState().attemptMove('e2', 'f3');
    expect(playSoundSpy).toHaveBeenCalledWith('refuse', false);

    // Confirmation toast when muted
    useGameStore.getState().showToast(en.pgnCopied);
    expect(playSoundSpy).toHaveBeenCalledWith('notify', false);
  });

  it('plays "notify" for confirmation toasts', () => {
    useGameStore.getState().showToast(en.pgnCopied);
    expect(playSoundSpy).toHaveBeenCalledWith('notify', true);

    useGameStore.getState().showToast(en.linkCopied);
    expect(playSoundSpy).toHaveBeenCalledWith('notify', true);
  });
});
