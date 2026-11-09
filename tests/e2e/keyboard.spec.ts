import { test, expect } from '@playwright/test';

test.describe('Keyboard-only complete game', () => {
  test('plays a complete 4-ply game to checkmate using only keyboard inputs', async ({ page }) => {
    await page.goto('/play');

    // Select Two Players mode so both sides are played locally
    const localModeBtn = page.getByRole('radio', { name: 'Two players, one device' });
    await expect(localModeBtn).toBeVisible();
    await localModeBtn.click();

    // Start game
    const startBtn = page.locator('.gambit-home-start-btn');
    await startBtn.click();

    const board = page.locator('.gambit-board-wrapper');
    await expect(board).toBeVisible();

    // Focus the board grid to activate useBoardKeyboard
    await board.focus();
    await expect(board).toBeFocused();

    // Initial cursor is at 'e4'.
    // Fool's Mate: 1. f3 e5 2. g4 Qh4#

    // Move 1 (White): f2 -> f3
    // From e4 to f2: Right, Down, Down
    await page.keyboard.press('ArrowRight'); // f4
    await page.keyboard.press('ArrowDown');  // f3
    await page.keyboard.press('ArrowDown');  // f2
    await page.keyboard.press('Enter');      // Select f2
    await page.keyboard.press('ArrowUp');    // f3
    await page.keyboard.press('Enter');      // Play f2-f3
    // Cursor is now at f3

    // Move 2 (Black): e7 -> e5
    // From f3 to e7: Left, Up x 4
    await page.keyboard.press('ArrowLeft');  // e3
    await page.keyboard.press('ArrowUp');    // e4
    await page.keyboard.press('ArrowUp');    // e5
    await page.keyboard.press('ArrowUp');    // e6
    await page.keyboard.press('ArrowUp');    // e7
    await page.keyboard.press('Enter');      // Select e7
    await page.keyboard.press('ArrowDown');  // e6
    await page.keyboard.press('ArrowDown');  // e5
    await page.keyboard.press('Enter');      // Play e7-e5
    // Cursor is now at e5

    // Move 3 (White): g2 -> g4
    // From e5 to g2: Right x 2, Down x 3
    await page.keyboard.press('ArrowRight'); // f5
    await page.keyboard.press('ArrowRight'); // g5
    await page.keyboard.press('ArrowDown');  // g4
    await page.keyboard.press('ArrowDown');  // g3
    await page.keyboard.press('ArrowDown');  // g2
    await page.keyboard.press('Enter');      // Select g2
    await page.keyboard.press('ArrowUp');    // g3
    await page.keyboard.press('ArrowUp');    // g4
    await page.keyboard.press('Enter');      // Play g2-g4
    // Cursor is now at g4

    // Move 4 (Black): d8 -> h4#
    // From g4 to d8: Left x 3, Up x 4
    await page.keyboard.press('ArrowLeft');  // f4
    await page.keyboard.press('ArrowLeft');  // e4
    await page.keyboard.press('ArrowLeft');  // d4
    await page.keyboard.press('ArrowUp');    // d5
    await page.keyboard.press('ArrowUp');    // d6
    await page.keyboard.press('ArrowUp');    // d7
    await page.keyboard.press('ArrowUp');    // d8
    await page.keyboard.press('Enter');      // Select d8
    // From d8 to h4: Down x 4, Right x 4
    await page.keyboard.press('ArrowDown');  // d7
    await page.keyboard.press('ArrowDown');  // d6
    await page.keyboard.press('ArrowDown');  // d5
    await page.keyboard.press('ArrowDown');  // d4
    await page.keyboard.press('ArrowRight'); // e4
    await page.keyboard.press('ArrowRight'); // f4
    await page.keyboard.press('ArrowRight'); // g4
    await page.keyboard.press('ArrowRight'); // h4
    await page.keyboard.press('Enter');      // Play d8-h4#

    // Result dialog should appear indicating checkmate with Black winning
    const resultDialog = page.locator('.gambit-result-dialog');
    await expect(resultDialog).toBeVisible();

    const headline = resultDialog.locator('.gambit-result-dialog-headline');
    await expect(headline).toHaveText('Checkmate. Black wins.');

    const detail = resultDialog.locator('.gambit-result-dialog-detail');
    await expect(detail).toHaveText('White has no legal move and the king is attacked.');
  });
});
