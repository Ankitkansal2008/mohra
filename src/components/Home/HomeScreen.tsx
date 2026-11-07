import React, { useRef, useState } from 'react';
import { en } from '../../copy/en.ts';
import type { Level, NewGameOptions, Side } from '../../game/types.ts';
import { useFocusTrap } from '../useFocusTrap.ts';
import './HomeScreen.css';

export interface HomeScreenProps {
  readonly isOpen: boolean;
  readonly onClose?: () => void;
  readonly onStart: (options: NewGameOptions) => void;
  readonly canClose?: boolean;
}

type OpponentChoice = 'computer' | 'local';
type ColorChoice = 'w' | 'b' | 'random';

const LEVELS: Array<{ level: Level; label: string }> = [
  { level: 1, label: en.levelBeginner },
  { level: 2, label: en.levelCasual },
  { level: 3, label: en.levelClub },
  { level: 4, label: en.levelStrong },
];

const COLORS: Array<{ value: ColorChoice; label: string }> = [
  { value: 'w', label: en.white },
  { value: 'b', label: en.black },
  { value: 'random', label: en.random },
];

export function HomeScreen({
  isOpen,
  onClose,
  onStart,
  canClose = false,
}: HomeScreenProps): React.JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, canClose ? onClose : undefined, isOpen);

  const [opponent, setOpponent] = useState<OpponentChoice>('computer');
  const [level, setLevel] = useState<Level>(2);
  const [color, setColor] = useState<ColorChoice>('w');
  const [clockEnabled, setClockEnabled] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleStart = (): void => {
    let resolvedSide: Side = 'w';
    if (opponent === 'computer') {
      resolvedSide = color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
    }
    onStart({
      mode: opponent,
      humanSide: resolvedSide,
      level: opponent === 'computer' ? level : 2,
      clockEnabled,
    });
  };

  return (
    <div
      className="gambit-home-backdrop"
      role="presentation"
      onClick={canClose ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        className="gambit-home-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gambit-home-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="gambit-home-header">
          <h2 id="gambit-home-title" className="gambit-home-title">
            {en.newGame}
          </h2>
          {canClose && onClose ? (
            <button
              type="button"
              className="gambit-home-close"
              onClick={onClose}
              aria-label={en.close}
            >
              ×
            </button>
          ) : null}
        </div>

        <div className="gambit-home-body">
          {/* Opponent selection */}
          <div className="gambit-home-section">
            <span className="gambit-home-label" id="gambit-opponent-label">{en.opponent}</span>
            <div className="gambit-home-group gambit-home-group-stack" role="radiogroup" aria-labelledby="gambit-opponent-label">
              <button
                type="button"
                role="radio"
                aria-checked={opponent === 'computer'}
                className={`gambit-home-btn ${opponent === 'computer' ? 'gambit-home-btn-active' : ''}`}
                onClick={() => setOpponent('computer')}
              >
                {en.homePlayComputer}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={opponent === 'local'}
                className={`gambit-home-btn ${opponent === 'local' ? 'gambit-home-btn-active' : ''}`}
                onClick={() => setOpponent('local')}
              >
                {en.homeTwoPlayers}
              </button>
            </div>
          </div>

          {/* Level selection (computer only) */}
          {opponent === 'computer' ? (
            <div className="gambit-home-section">
              <span className="gambit-home-label" id="gambit-level-label">{en.difficulty}</span>
              <div className="gambit-home-group gambit-home-group-grid" role="radiogroup" aria-labelledby="gambit-level-label">
                {LEVELS.map((item) => (
                  <button
                    key={item.level}
                    type="button"
                    role="radio"
                    aria-checked={level === item.level}
                    className={`gambit-home-btn ${level === item.level ? 'gambit-home-btn-active' : ''}`}
                    onClick={() => setLevel(item.level)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {level === 1 ? <p className="gambit-home-help">{en.levelHelpBeginner}</p> : null}
            </div>
          ) : null}

          {/* Colour selection (computer only) */}
          {opponent === 'computer' ? (
            <div className="gambit-home-section">
              <span className="gambit-home-label" id="gambit-color-label">{en.playAs}</span>
              <div className="gambit-home-group" role="radiogroup" aria-labelledby="gambit-color-label">
                {COLORS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={color === item.value}
                    className={`gambit-home-btn ${color === item.value ? 'gambit-home-btn-active' : ''}`}
                    onClick={() => setColor(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Clock option */}
          <div className="gambit-home-section">
            <span className="gambit-home-label" id="gambit-clock-label">{en.clock}</span>
            <div className="gambit-home-group" role="radiogroup" aria-labelledby="gambit-clock-label">
              <button
                type="button"
                role="radio"
                aria-checked={!clockEnabled}
                className={`gambit-home-btn ${!clockEnabled ? 'gambit-home-btn-active' : ''}`}
                onClick={() => setClockEnabled(false)}
              >
                {en.off}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={clockEnabled}
                className={`gambit-home-btn ${clockEnabled ? 'gambit-home-btn-active' : ''}`}
                onClick={() => setClockEnabled(true)}
              >
                {en.tenMinutes}
              </button>
            </div>
          </div>

          {/* Start CTA */}
          <button type="button" className="gambit-home-start-btn" onClick={handleStart}>
            {en.start}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HomeScreen;
