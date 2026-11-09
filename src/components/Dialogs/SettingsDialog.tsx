import React, { useRef } from 'react';
import { en } from '../../copy/en.ts';
import { useGameStore } from '../../game/store.ts';
import { useFocusTrap } from '../useFocusTrap.ts';
import './SettingsDialog.css';

export interface SettingsDialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

interface SwitchControlProps {
  readonly id: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly label: string;
}

function SwitchControl({ id, checked, onChange, label }: SwitchControlProps): React.JSX.Element {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`gambit-switch ${checked ? 'gambit-switch-on' : 'gambit-switch-off'}`}
      onClick={() => onChange(!checked)}
    >
      <span className="gambit-switch-knob" aria-hidden="true" />
    </button>
  );
}

export function SettingsDialog({
  isOpen,
  onClose,
}: SettingsDialogProps): React.JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onClose, isOpen);

  const ui = useGameStore((s) => s.ui);
  const setTheme = useGameStore((s) => s.setTheme);
  const setSoundOn = useGameStore((s) => s.setSoundOn);
  const setAnimationOn = useGameStore((s) => s.setAnimationOn);
  const setShowCoords = useGameStore((s) => s.setShowCoords);

  if (!isOpen) return null;

  return (
    <div
      className="gambit-dialog-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
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
          {/* Sound toggle: 44x24 switch */}
          <div className="gambit-settings-row">
            <div className="gambit-setting-meta">
              <label htmlFor="setting-sound" className="gambit-setting-label">
                {en.soundSetting}
              </label>
              <span className="gambit-setting-help">{en.soundSettingHelp}</span>
            </div>
            <SwitchControl
              id="setting-sound"
              checked={ui.soundOn}
              onChange={setSoundOn}
              label={en.soundSetting}
            />
          </div>

          {/* Board theme: Segmented control (Green / Slate) */}
          <div className="gambit-settings-row">
            <div className="gambit-setting-meta">
              <span className="gambit-setting-label">{en.themeSetting}</span>
              <span className="gambit-setting-help">{en.themeSettingHelp}</span>
            </div>
            <div
              className="gambit-setting-segmented"
              role="radiogroup"
              aria-label={en.themeSetting}
            >
              <button
                type="button"
                role="radio"
                aria-checked={ui.theme === 'default'}
                className={`gambit-setting-segment-btn ${ui.theme === 'default' ? 'gambit-setting-segment-btn-active' : ''}`}
                onClick={() => setTheme('default')}
              >
                {en.themeDefault}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={ui.theme === 'slate'}
                className={`gambit-setting-segment-btn ${ui.theme === 'slate' ? 'gambit-setting-segment-btn-active' : ''}`}
                onClick={() => setTheme('slate')}
              >
                {en.themeSlate}
              </button>
            </div>
          </div>

          {/* Piece animation toggle: 44x24 switch */}
          <div className="gambit-settings-row">
            <div className="gambit-setting-meta">
              <label htmlFor="setting-animation" className="gambit-setting-label">
                {en.animationSetting}
              </label>
              <span className="gambit-setting-help">{en.animationSettingHelp}</span>
            </div>
            <SwitchControl
              id="setting-animation"
              checked={ui.animationOn}
              onChange={setAnimationOn}
              label={en.animationSetting}
            />
          </div>

          {/* Coordinates toggle: 44x24 switch */}
          <div className="gambit-settings-row">
            <div className="gambit-setting-meta">
              <label htmlFor="setting-coords" className="gambit-setting-label">
                {en.coordsSetting}
              </label>
              <span className="gambit-setting-help">{en.coordsSettingHelp}</span>
            </div>
            <SwitchControl
              id="setting-coords"
              checked={ui.showCoords}
              onChange={setShowCoords}
              label={en.coordsSetting}
            />
          </div>

          {/* Clock reference: read-only text set when starting a game */}
          <div className="gambit-settings-row gambit-settings-row-readonly">
            <div className="gambit-setting-meta">
              <span className="gambit-setting-label">{en.clock}</span>
              <span className="gambit-setting-help">{en.clockReference}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsDialog;
