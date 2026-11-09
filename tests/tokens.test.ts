import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Theme tokens and color palette', () => {
  const tokensPath = path.resolve(__dirname, '../src/styles/tokens.css');
  const tokensCss = fs.readFileSync(tokensPath, 'utf-8');

  it('tokens.css defines the warm editorial theme palette', () => {
    // --color-bg #F8F5EE
    expect(tokensCss).toMatch(/--color-bg:\s*#F8F5EE/i);
    // --color-surface #FFFFFF
    expect(tokensCss).toMatch(/--color-surface:\s*#FFFFFF/i);
    // --color-border #E6E0D4
    expect(tokensCss).toMatch(/--color-border:\s*#E6E0D4/i);
    // --color-ink #16211B
    expect(tokensCss).toMatch(/--color-ink:\s*#16211B/i);
    // --color-muted #6B7268
    expect(tokensCss).toMatch(/--color-muted:\s*#6B7268/i);
    // --color-primary #2F4F3E
    expect(tokensCss).toMatch(/--color-primary:\s*#2F4F3E/i);
    // --color-primary-hover #253F31
    expect(tokensCss).toMatch(/--color-primary-hover:\s*#253F31/i);
    // --color-accent #C4694A
    expect(tokensCss).toMatch(/--color-accent:\s*#C4694A/i);
    // --color-accent-hover #AE5740
    expect(tokensCss).toMatch(/--color-accent-hover:\s*#AE5740/i);
  });

  it('body uses the bg token and cards use the surface token', () => {
    expect(tokensCss).toMatch(/body\s*\{[^}]*background-color:\s*var\(--color-bg\)/);

    const appCss = fs.readFileSync(path.resolve(__dirname, '../src/App.css'), 'utf-8');
    expect(appCss).toMatch(/\.app-shell\s*\{[^}]*background-color:\s*var\(--color-bg\)/);

    const contentCss = fs.readFileSync(path.resolve(__dirname, '../src/pages/ContentPages.css'), 'utf-8');
    expect(contentCss).toMatch(/\.content-card\s*\{[^}]*background-color:\s*var\(--color-surface\)/);

    const homeCss = fs.readFileSync(path.resolve(__dirname, '../src/pages/HomePage.css'), 'utf-8');
    expect(homeCss).toMatch(/\.home-hero-board-card\s*\{[^}]*background-color:\s*var\(--color-surface\)/);
  });

  it('defines the type scale 14 / 16 / 18 / 22 / 30 / 44 and radius / shadow tokens', () => {
    expect(tokensCss).toContain('--font-size-14: 14px;');
    expect(tokensCss).toContain('--font-size-16: 16px;');
    expect(tokensCss).toContain('--font-size-18: 18px;');
    expect(tokensCss).toContain('--font-size-22: 22px;');
    expect(tokensCss).toContain('--font-size-30: 30px;');
    expect(tokensCss).toContain('--font-size-44: 44px;');
    expect(tokensCss).toContain('--radius-button: 12px;');
    expect(tokensCss).toContain('--radius-card: 16px;');
    expect(tokensCss).toContain('--radius-pill: 999px;');
    expect(tokensCss).toContain('--shadow-sm: 0 1px 2px rgba(22, 33, 27, 0.05);');
    expect(tokensCss).toContain('--shadow-lg: 0 10px 30px rgba(22, 33, 27, 0.07);');
  });
});

