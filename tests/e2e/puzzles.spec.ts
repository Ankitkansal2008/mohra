import { test, expect } from '@playwright/test';

test.describe('Puzzles section end-to-end', () => {
  test('navigates to /puzzles, displays daily puzzle and 6 theme cards, and plays puzzle', async ({ page }) => {
    await page.goto('/');

    // Verify streak badge is rendered on home page next to play CTA
    const streakBadge = page.locator('[data-testid="home-streak-badge"]');
    await expect(streakBadge).toBeVisible();

    // Verify daily puzzle card is rendered above closing CTA on home page
    const homeDailyCta = page.locator('[data-testid="home-daily-puzzle-cta"]');
    await expect(homeDailyCta).toBeVisible();

    // Navigate to /puzzles
    await page.goto('/puzzles');

    // Hub elements
    await expect(page.locator('.puzzles-main-title')).toHaveText('Puzzles');
    await expect(page.locator('[data-testid="puzzles-streak-badge"]')).toBeVisible();

    // Daily card
    const dailyBtn = page.locator('[data-testid="play-daily-puzzle-btn"]');
    await expect(dailyBtn).toBeVisible();

    // 6 practice theme cards
    const themeCards = page.locator('.puzzles-theme-card');
    await expect(themeCards).toHaveCount(6);

    // Start daily puzzle
    await dailyBtn.click();

    // Verify puzzle player view renders with header line and board
    const headerLine = page.locator('.puzzle-header-line');
    await expect(headerLine).toBeVisible();
    await expect(headerLine).toContainText('to move - find the best move');

    const board = page.locator('.gambit-board-wrapper');
    await expect(board).toBeVisible();

    // Verify back button is present
    const backBtn = page.locator('.puzzle-back-btn');
    await expect(backBtn).toBeVisible();
  });

  test('displays show solution after wrong moves and completes puzzle', async ({ page }) => {
    // Navigate with a known mateIn1 puzzle
    await page.goto('/puzzles?id=6y9a0');

    await expect(page.locator('.puzzle-header-line')).toHaveText('Black to move - find the best move');
    await expect(page.locator('.gambit-board-wrapper')).toBeVisible();

    // Use keyboard navigation to make a wrong attempt: c3 to c2 instead of c3f3
    // Focus board wrapper
    const board = page.locator('.gambit-board-wrapper');
    await board.focus();

    // Press 'c3' selection and try invalid destination
    // Or click "Show solution" after 2 wrong attempts
    // Let's click wrong squares on board or trigger wrong moves via keyboard
    // Arrow keys from default e4 to c3: left 2, down 1
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowDown');
    // Select c3
    await page.keyboard.press('Enter');
    // Move to c2 (down 1)
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Toast appears
    await expect(page.getByRole('alert')).toContainText('Not the best move - try again');

    // Second wrong move: select c3 and try c1
    await page.keyboard.press('ArrowUp'); // back to c3
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown'); // to c1
    await page.keyboard.press('Enter');

    // After 2 wrong attempts, "Show solution" button is shown
    const solutionBtn = page.locator('.puzzle-solution-btn');
    await expect(solutionBtn).toBeVisible();
    await expect(solutionBtn).toHaveText('Show solution');

    // Click "Show solution"
    await solutionBtn.click();

    // Puzzle solved status card appears with rating and Next puzzle button
    const solvedBadge = page.locator('.puzzle-solved-badge');
    await expect(solvedBadge).toBeVisible();
    await expect(solvedBadge).toHaveText('Solved');

    const nextBtn = page.locator('.puzzle-next-btn');
    await expect(nextBtn).toBeVisible();
    await expect(nextBtn).toHaveText('Next puzzle');
  });

  test('responsive layout at 320px viewport without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 600 });
    await page.goto('/puzzles');

    await expect(page.locator('.puzzles-main-title')).toBeVisible();
    await expect(page.locator('[data-testid="play-daily-puzzle-btn"]')).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(320);

    // Enter daily puzzle at 320px
    await page.locator('[data-testid="play-daily-puzzle-btn"]').click();
    await expect(page.locator('.gambit-board-wrapper')).toBeVisible();

    const boardBox = await page.locator('.gambit-board-wrapper').boundingBox();
    expect(boardBox).not.toBeNull();
    expect(boardBox!.width).toBeLessThanOrEqual(320);

    const playScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(playScrollWidth).toBeLessThanOrEqual(320);
  });
});

