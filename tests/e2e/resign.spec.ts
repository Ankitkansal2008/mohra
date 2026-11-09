import { test, expect } from '@playwright/test';

test.describe('Resign workflow', () => {
  test('confirms resignation in dialog, then displays the result panel', async ({ page }) => {
    await page.goto('/play');

    // Start a game from the home modal
    const startBtn = page.locator('.gambit-home-start-btn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Verify board is displayed with controls
    const board = page.locator('.gambit-board-wrapper');
    await expect(board).toBeVisible();

    // Click Resign button in the controls row
    const resignControlBtn = page.locator('.gambit-control-btn-danger');
    await expect(resignControlBtn).toBeVisible();
    await resignControlBtn.click();

    // Resign confirm modal appears
    const resignDialog = page.locator('.gambit-resign-dialog');
    await expect(resignDialog).toBeVisible();

    const resignTitle = resignDialog.locator('.gambit-resign-dialog-title');
    await expect(resignTitle).toHaveText('Resign this game? The result is final.');

    // Confirm the resignation
    const confirmBtn = resignDialog.locator('.gambit-resign-btn-confirm');
    await confirmBtn.click();

    // Confirm modal should disappear
    await expect(resignDialog).not.toBeVisible();

    // Result panel should now render in place of controls
    const resultDialog = page.locator('.gambit-result-dialog');
    await expect(resultDialog).toBeVisible();

    const headline = resultDialog.locator('.gambit-result-dialog-headline');
    await expect(headline).toHaveText('White resigned. Black wins.');

    // Board controls row is gone, Rematch button is available
    await expect(resignControlBtn).not.toBeVisible();
    const rematchBtn = resultDialog.getByRole('button', { name: 'Rematch' });
    await expect(rematchBtn).toBeVisible();
  });
});
