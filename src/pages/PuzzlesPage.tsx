// Puzzles hub page: displays daily puzzle, streak badge, and tactical theme practice cards.
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { en } from '../copy/en.ts';
import { usePageMetadata } from '../hooks/usePageMetadata.ts';
import { getDailyPuzzle } from '../puzzles/daily.ts';
import { getCachedPuzzles, loadPuzzles } from '../puzzles/loader.ts';
import { getStreak } from '../puzzles/streak.ts';
import { countPuzzlesForTheme, getPuzzlesForTheme, PRACTICE_THEMES } from '../puzzles/themes.ts';
import type { Puzzle } from '../puzzles/types.ts';
import { PuzzlePlayView } from './PuzzlePlayView.tsx';
import './PuzzlesPage.css';

export function PuzzlesPage(): React.JSX.Element {
  usePageMetadata(en.puzzlesDocTitle, en.puzzlesMetaDescription);
  const [searchParams, setSearchParams] = useSearchParams();

  const [puzzles, setPuzzles] = useState<Puzzle[]>(() => getCachedPuzzles()?.puzzles ?? []);
  const [loading, setLoading] = useState<boolean>(() => !getCachedPuzzles());
  const [error, setError] = useState<boolean>(false);
  const [activePuzzle, setActivePuzzle] = useState<Puzzle | null>(null);
  const [activeTheme, setActiveTheme] = useState<string>('daily');
  const [streak, setStreak] = useState<number>(() => getStreak());

  useEffect(() => {
    let mounted = true;
    loadPuzzles()
      .then((data) => {
        if (!mounted) return;
        setPuzzles(data.puzzles);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const dailyPuzzle = useMemo(() => getDailyPuzzle(puzzles), [puzzles]);

  // Handle URL query parameters (?daily=1, ?theme=..., ?id=...)
  useEffect(() => {
    if (puzzles.length === 0) return;

    const puzzleId = searchParams.get('id');
    const themeParam = searchParams.get('theme');
    const dailyParam = searchParams.get('daily');

    if (puzzleId) {
      const match = puzzles.find((p) => p.id === puzzleId);
      if (match) {
        setActivePuzzle(match);
        setActiveTheme(themeParam ?? match.themes[0] ?? 'custom');
        return;
      }
    }

    if (dailyParam && dailyPuzzle) {
      setActivePuzzle(dailyPuzzle);
      setActiveTheme('daily');
      return;
    }

    if (themeParam) {
      const themePuzzles = getPuzzlesForTheme(puzzles, themeParam);
      if (themePuzzles.length > 0) {
        setActivePuzzle(themePuzzles[0]);
        setActiveTheme(themeParam);
      }
    }
  }, [puzzles, dailyPuzzle, searchParams]);

  const handleStartDaily = (): void => {
    if (!dailyPuzzle) return;
    setActivePuzzle(dailyPuzzle);
    setActiveTheme('daily');
    setSearchParams({ daily: '1' });
  };

  const handleSelectTheme = (themeKey: string): void => {
    const list = getPuzzlesForTheme(puzzles, themeKey);
    if (list.length === 0) return;
    // Start with a random puzzle in the chosen theme for variety
    const randomIndex = Math.floor(Math.random() * list.length);
    setActivePuzzle(list[randomIndex]);
    setActiveTheme(themeKey);
    setSearchParams({ theme: themeKey, id: list[randomIndex].id });
  };

  const handleBackToHub = (): void => {
    setActivePuzzle(null);
    setSearchParams({});
    setStreak(getStreak());
  };

  const handleNextPuzzle = (): void => {
    if (activeTheme === 'daily') {
      handleBackToHub();
      return;
    }
    const list = getPuzzlesForTheme(puzzles, activeTheme);
    if (list.length <= 1) {
      handleBackToHub();
      return;
    }
    const currentIndex = list.findIndex((p) => p.id === activePuzzle?.id);
    const nextIndex = (currentIndex + 1) % list.length;
    const nextPuzzle = list[nextIndex];
    setActivePuzzle(nextPuzzle);
    setSearchParams({ theme: activeTheme, id: nextPuzzle.id });
  };

  if (loading) {
    return (
      <main className="puzzles-page" role="main">
        <p>{en.puzzleLoading}</p>
      </main>
    );
  }

  if (error || puzzles.length === 0) {
    return (
      <main className="puzzles-page" role="main">
        <p>{en.puzzleError}</p>
      </main>
    );
  }

  if (activePuzzle) {
    return (
      <main className="puzzles-page" role="main">
        <PuzzlePlayView
          puzzle={activePuzzle}
          themeName={activeTheme}
          onBack={handleBackToHub}
          onNext={handleNextPuzzle}
          onSolved={() => setStreak(getStreak())}
        />
      </main>
    );
  }

  const streakDisplay = en.puzzleStreak.replace('{count}', String(streak));

  return (
    <main className="puzzles-page" role="main">
      <div className="puzzles-header">
        <div className="puzzles-title-row">
          <h1 className="puzzles-main-title">{en.puzzlesTitle}</h1>
          <div className="puzzles-streak-badge" data-testid="puzzles-streak-badge">
            <span aria-hidden="true">🔥</span> {streakDisplay}
          </div>
        </div>
      </div>

      {dailyPuzzle && (
        <section className="puzzles-daily-card" aria-label={en.puzzleDailyTitle}>
          <div className="puzzles-daily-content">
            <h2 className="puzzles-daily-title">{en.puzzleDailyTitle}</h2>
            <p className="puzzles-daily-desc">{en.puzzleDailySubheading}</p>
            <div className="puzzles-daily-rating">
              {en.puzzleRating.replace('{rating}', String(dailyPuzzle.rating))}
            </div>
          </div>
          <button
            type="button"
            className="puzzles-daily-btn"
            data-testid="play-daily-puzzle-btn"
            onClick={handleStartDaily}
          >
            {en.puzzlePlayDaily}
          </button>
        </section>
      )}

      <section aria-label={en.puzzlePracticeByTheme}>
        <h2 className="puzzles-section-title">{en.puzzlePracticeByTheme}</h2>
        <div className="puzzles-themes-grid">
          {PRACTICE_THEMES.map((theme) => {
            const count = countPuzzlesForTheme(puzzles, theme.themeKey);
            const countLabel = en.puzzleCount.replace('{count}', String(count));
            const themeTitle = en[theme.nameKey] ?? theme.id;
            return (
              <button
                type="button"
                key={theme.id}
                className="puzzles-theme-card"
                onClick={() => handleSelectTheme(theme.themeKey)}
                aria-label={`${themeTitle}, ${countLabel}`}
              >
                <span className="puzzles-theme-name">{themeTitle}</span>
                <span className="puzzles-theme-count">{countLabel}</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default PuzzlesPage;
