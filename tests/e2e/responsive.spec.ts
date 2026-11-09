import { test, expect } from '@playwright/test';

test.describe('Responsive layout at 360px viewport', () => {
  test.use({
    viewport: { width: 360, height: 740 },
  });

  test('home page renders hero and CTA at 360px without overflow', async ({ page }) => {
    await page.goto('/');

    const hero = page.locator('.home-hero');
    await expect(hero).toBeVisible();

    const heroCta = page.locator('[data-testid="hero-play-cta"]');
    await expect(heroCta).toBeVisible();

    const heroBoard = page.locator('[data-testid="hero-board-card"]');
    await expect(heroBoard).toBeVisible();

    // Verify document does not horizontally overflow on home page
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(360);
  });

  test('picks a mode on new-game screen, starts, and board fits without overflow', async ({ page }) => {
    await page.goto('/play');

    // New-game setup panel is open
    const homeDialog = page.locator('.gambit-home-dialog');
    await expect(homeDialog).toBeVisible();

    const homeTitle = page.locator('.gambit-home-title');
    await expect(homeTitle).toHaveText('New game');

    // Pick mode (e.g. Two players, one device)
    const localOption = page.getByRole('radio', { name: 'Two players, one device' });
    await expect(localOption).toBeVisible();
    await localOption.click();
    await expect(localOption).toHaveAttribute('aria-checked', 'true');

    // Start the game
    const startBtn = page.locator('.gambit-home-start-btn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // New-game setup panel closes (replaced by game board)
    await expect(homeDialog).not.toBeVisible();

    // Board is rendered and fits inside 360px viewport without horizontal page overflow
    const board = page.locator('.gambit-board-wrapper');
    await expect(board).toBeVisible();

    const box = await board.boundingBox();
    expect(box).not.toBeNull();
    // Board width must fit within 360px
    expect(box!.width).toBeLessThanOrEqual(360);
    // Board is responsive and maintains playable size
    expect(box!.width).toBeGreaterThanOrEqual(300);
    // Board is horizontally contained within the viewport boundaries
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);

    // Verify document does not horizontally overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(360);
  });
});
