import { test, expect } from '@playwright/test';

test.describe('Mid-game reload persistence', () => {
  test('reload mid-game restores the position via resume banner', async ({ page }) => {
    await page.goto('/');

    // Select Two Players mode so no background engine moves interfere
    const localModeBtn = page.getByRole('radio', { name: 'Two players, one device' });
    await expect(localModeBtn).toBeVisible();
    await localModeBtn.click();

    // Start game
    const startBtn = page.locator('.gambit-home-start-btn');
    await startBtn.click();

    const board = page.locator('.gambit-board-wrapper');
    await expect(board).toBeVisible();

    // Play move 1. e4 (click e2, click e4)
    const squareE2 = page.locator('[data-square="e2"]');
    const squareE4 = page.locator('[data-square="e4"]');
    await squareE2.click();
    await squareE4.click();

    // Verify pawn is on e4
    await expect(page.locator('[data-square="e4"] [data-piece="wP"]')).toBeVisible();

    // Wait for debounced localStorage save (400ms debounce)
    await page.waitForTimeout(600);

    // Reload page mid-game
    await page.reload();

    // Resume banner should offer resume
    const resumeBanner = page.locator('.gambit-resume-banner');
    await expect(resumeBanner).toBeVisible();
    await expect(resumeBanner.locator('.gambit-resume-label')).toContainText('Resume game - Black to move, move 1');

    // Click Resume button
    const resumeBtn = resumeBanner.locator('.gambit-btn-resume');
    await resumeBtn.click();

    // Resume banner dismisses
    await expect(resumeBanner).not.toBeVisible();

    // Board position is restored with e4 pawn in place
    await expect(page.locator('[data-square="e4"] [data-piece="wP"]')).toBeVisible();

    // Black (top player indicator) is now active to move
    const topTurnIndicator = page.locator('[data-testid="turn-indicator-top"]');
    await expect(topTurnIndicator).toContainText('Black');
    await expect(topTurnIndicator.locator('.gambit-turn-badge')).toHaveText('To move');
  });
});
