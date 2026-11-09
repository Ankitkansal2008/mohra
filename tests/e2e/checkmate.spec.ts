import { test, expect } from '@playwright/test';

test.describe('Checkmate using ?fen= dev parameter', () => {
  test('loads position and plays to checkmate displaying result panel', async ({ page }) => {
    // Back rank mate in 1: 1. Ra8#
    const fen = '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1';
    await page.goto(`/play?fen=${encodeURIComponent(fen)}`);

    // Board should be visible and home screen modal should not block
    const board = page.locator('.gambit-board-wrapper');
    await expect(board).toBeVisible();

    // Execute checkmate move Ra8# via click-to-move
    const squareA1 = page.locator('[data-square="a1"]');
    const squareA8 = page.locator('[data-square="a8"]');

    await squareA1.click();
    await squareA8.click();

    // Result panel renders below board in place of controls
    const resultDialog = page.locator('.gambit-result-dialog');
    await expect(resultDialog).toBeVisible();

    const headline = resultDialog.locator('.gambit-result-dialog-headline');
    await expect(headline).toHaveText('Checkmate. White wins.');

    const detail = resultDialog.locator('.gambit-result-dialog-detail');
    await expect(detail).toHaveText('Black has no legal move and the king is attacked.');

    // Rematch button is present and active
    const rematchBtn = resultDialog.getByRole('button', { name: 'Rematch' });
    await expect(rematchBtn).toBeVisible();
  });
});
