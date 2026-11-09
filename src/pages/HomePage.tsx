import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BoardView } from '../components/Board/BoardView.tsx';
import { AppLink } from '../components/Common/AppLink.tsx';
import { en } from '../copy/en.ts';
import { usePageMetadata } from '../hooks/usePageMetadata.ts';
import { track } from '../lib/analytics.ts';
import './HomePage.css';

const HERO_FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5';

export function HomePage(): React.JSX.Element {
  usePageMetadata(en.homeTitle, en.homeMetaDescription);
  const navigate = useNavigate();

  const handleHeroPlay = (): void => {
    track('play_clicked', { from: 'home_hero' });
    navigate('/play');
  };

  const handleClosingPlay = (): void => {
    track('play_clicked', { from: 'home_closing' });
    navigate('/play');
  };

  return (
    <main className="home-page" role="main">
      {/* 1. Hero Section: 2 columns on desktop, stacked on mobile */}
      <section className="home-hero" aria-label={en.homeHeading}>
        <div className="home-hero-content">
          <span className="home-eyebrow" data-testid="hero-eyebrow">
            {en.homeEyebrow}
          </span>
          <h1 className="home-title">{en.homeHeading}</h1>
          <p className="home-subheading">{en.homeSubheading}</p>
          <div className="home-cta-group">
            <button
              type="button"
              className="home-cta-primary"
              data-testid="hero-play-cta"
              onClick={handleHeroPlay}
            >
              {en.playNow}
            </button>
            <AppLink to="/how-to-play" className="home-cta-secondary">
              {en.howToPlay}
            </AppLink>
          </div>
        </div>

        <div className="home-hero-board-card" data-testid="hero-board-card">
          <div className="home-hero-board-inner">
            <BoardView fen={HERO_FEN} interactive={false} />
          </div>
        </div>
      </section>

      {/* 2. Three Feature Rows */}
      <section className="home-features" aria-label={en.homeHeading}>
        <div className="home-feature-row">
          <div className="home-feature-badge">01</div>
          <div className="home-feature-body">
            <h2 className="home-feature-title">{en.homeFeatureLegalMoves}</h2>
          </div>
        </div>

        <div className="home-feature-row">
          <div className="home-feature-badge">02</div>
          <div className="home-feature-body">
            <h2 className="home-feature-title">{en.homeFeatureRefusedMoves}</h2>
          </div>
        </div>

        <div className="home-feature-row">
          <div className="home-feature-badge">03</div>
          <div className="home-feature-body">
            <h2 className="home-feature-title">{en.homeFeatureNoSignup}</h2>
          </div>
        </div>
      </section>

      {/* 3. Closing CTA Band */}
      <section className="home-closing-band" aria-label={en.homeClosingHeading}>
        <h2 className="home-closing-title">{en.homeClosingHeading}</h2>
        <button
          type="button"
          className="home-cta-primary home-closing-cta"
          data-testid="closing-play-cta"
          onClick={handleClosingPlay}
        >
          {en.playNow}
        </button>
      </section>
    </main>
  );
}

export default HomePage;
