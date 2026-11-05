import React, { useEffect } from 'react';
import { en } from '../../copy/en.ts';
import { useGameStore } from '../../game/store.ts';
import './SettingsDialog.css';

export interface SettingsDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function SettingsDialog({
  isOpen,
  onClose,
}: SettingsDialogProps): React.JSX.Element | null {
  const ui = useGameStore((s) => s.ui);
  const isClockEnabled = useGameStore((s) => s.game.clock !== null);

  const setTheme = useGameStore((s) => s.setTheme);
  const setSoundOn = useGameStore((s) => s.setSoundOn);
  const setAnimationOn = useGameStore((s) => s.setAnimationOn);
  const setShowCoords = useGameStore((s) => s.setShowCoords);
  const setClockEnabled = useGameStore((s) => s.setClockEnabled);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="gambit-dialog-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="gambit-settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gambit-settings-header">
          <h2 id="settings-dialog-title" className="gambit-settings-title">
            {en.settingsTitle}
          </h2>
          <button
            type="button"
            className="gambit-settings-close"
            onClick={onClose}
            aria-label={en.close}
          >
            ×
          </button>
        </div>

        <div className="gambit-settings-body">
          {/* Sound toggle: Muted by default, persisted */}
          <div className="gambit-setting-row">
            <span className="gambit-setting-label">{en.soundSetting}</span>
            <div className="gambit-setting-group">
              <button
                type="button"
                className={`gambit-setting-btn ${ui.soundOn ? 'gambit-setting-btn-active' : ''}`}
                onClick={() => setSoundOn(true)}
              >
                {en.on}
              </button>
              <button
                type="button"
                className={`gambit-setting-btn ${!ui.soundOn ? 'gambit-setting-btn-active' : ''}`}
                onClick={() => setSoundOn(false)}
              >
                {en.off}
              </button>
            </div>
          </div>

          {/* Board theme toggle: Green / Slate */}
          <div className="gambit-setting-row">
            <span className="gambit-setting-label">{en.themeSetting}</span>
            <div className="gambit-setting-group">
              <button
                type="button"
                className={`gambit-setting-btn ${ui.theme === 'default' ? 'gambit-setting-btn-active' : ''}`}
                onClick={() => setTheme('default')}
              >
                {en.themeDefault}
              </button>
              <button
                type="button"
                className={`gambit-setting-btn ${ui.theme === 'slate' ? 'gambit-setting-btn-active' : ''}`}
                onClick={() => setTheme('slate')}
              >
                {en.themeSlate}
              </button>
            </div>
          </div>

          {/* Piece animation toggle */}
          <div className="gambit-setting-row">
            <span className="gambit-setting-label">{en.animationSetting}</span>
            <div className="gambit-setting-group">
              <button
                type="button"
                className={`gambit-setting-btn ${ui.animationOn ? 'gambit-setting-btn-active' : ''}`}
                onClick={() => setAnimationOn(true)}
              >
                {en.on}
              </button>
              <button
                type="button"
                className={`gambit-setting-btn ${!ui.animationOn ? 'gambit-setting-btn-active' : ''}`}
                onClick={() => setAnimationOn(false)}
              >
                {en.off}
              </button>
            </div>
          </div>

          {/* Coordinates toggle */}
          <div className="gambit-setting-row">
            <span className="gambit-setting-label">{en.coordsSetting}</span>
            <div className="gambit-setting-group">
              <button
                type="button"
                className={`gambit-setting-btn ${ui.showCoords ? 'gambit-setting-btn-active' : ''}`}
                onClick={() => setShowCoords(true)}
              >
                {en.on}
              </button>
              <button
                type="button"
                className={`gambit-setting-btn ${!ui.showCoords ? 'gambit-setting-btn-active' : ''}`}
                onClick={() => setShowCoords(false)}
              >
                {en.off}
              </button>
            </div>
          </div>

          {/* Clocks toggle */}
          <div className="gambit-setting-row">
            <span className="gambit-setting-label">{en.clockSetting}</span>
            <div className="gambit-setting-group">
              <button
                type="button"
                className={`gambit-setting-btn ${isClockEnabled ? 'gambit-setting-btn-active' : ''}`}
                onClick={() => setClockEnabled(true)}
              >
                {en.on}
              </button>
              <button
                type="button"
                className={`gambit-setting-btn ${!isClockEnabled ? 'gambit-setting-btn-active' : ''}`}
                onClick={() => setClockEnabled(false)}
              >
                {en.off}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsDialog;

