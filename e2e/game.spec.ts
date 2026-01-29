import { test, expect, Page } from '@playwright/test';

/**
 * Crossfire E2E Tests
 *
 * These tests verify the core game functionality:
 * 1. Page loads and displays correctly
 * 2. Bot game can be played start to finish
 * 3. Matchmaking works
 * 4. Friend rooms work
 * 5. Player stats display correctly
 */

// Helper to wait for WebSocket connection
async function waitForConnection(page: Page) {
  // Wait for stats to load (indicates WebSocket connected)
  await expect(page.locator('#active-games')).toContainText(/\d+ game/);
}

// Helper to fill in word inputs
async function fillWords(page: Page, words: string[]) {
  const inputs = page.locator('.word-input');
  for (let i = 0; i < words.length; i++) {
    await inputs.nth(i).fill(words[i]);
    // Blur to trigger validation
    await inputs.nth(i).blur();
  }
}

// Sample valid words that should work (common English words with shared letters)
const VALID_WORDS = ['APPLE', 'PLANE', 'EAGLE', 'PLATE'];

test.describe('Page Load', () => {
  test('should load the menu screen with all elements', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/Crossfire/);

    // Check menu elements are visible
    await expect(page.locator('#screen-menu')).toBeVisible();
    await expect(page.locator('#find-match-btn')).toBeVisible();
    await expect(page.locator('#room-id-input')).toBeVisible();
    await expect(page.locator('#join-room-btn')).toBeVisible();

    // Check stats display
    await expect(page.locator('#active-games')).toBeVisible();
    await expect(page.locator('#total-games')).toBeVisible();
    await expect(page.locator('#total-players')).toBeVisible();

    // Check player info
    await expect(page.locator('#player-level')).toBeVisible();
    await expect(page.locator('#player-wins')).toBeVisible();
  });

  test('should connect to WebSocket and show stats', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Stats should show numbers
    await expect(page.locator('#active-games')).toContainText(/\d+ games? in progress/);
    await expect(page.locator('#total-games')).toContainText(/\d+ games played/);
    await expect(page.locator('#total-players')).toContainText(/Players: \d+/);
  });

  test('should have player ID assigned', async ({ page }) => {
    await page.goto('/');

    // Player ID should be visible
    const playerId = page.locator('#player-id');
    await expect(playerId).toBeVisible();
    await expect(playerId).not.toBeEmpty();
  });
});

test.describe('Bot Game', () => {
  test('should start bot game after matchmaking timeout', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Click find match
    await page.locator('#find-match-btn').click();

    // Should show "In queue" status
    await expect(page.locator('#status-text')).toContainText(/queue|Finding/i);

    // Wait for bot game to start (10 second timeout + buffer)
    await expect(page.locator('#status-text')).toContainText(/Playing against/i, { timeout: 15000 });

    // Should show submit screen
    await expect(page.locator('#screen-submit')).toBeVisible({ timeout: 2000 });
  });

  test('should complete a full bot game', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for full game

    await page.goto('/');
    await waitForConnection(page);

    // Start matchmaking and wait for bot
    await page.locator('#find-match-btn').click();
    await expect(page.locator('#screen-submit')).toBeVisible({ timeout: 15000 });

    // Fill in words
    await fillWords(page, VALID_WORDS);

    // Submit button should be enabled
    const submitBtn = page.locator('#word-form button[type="submit"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Should show waiting section
    await expect(page.locator('#submit-waiting-section')).toBeVisible();

    // Wait for solving phase
    await expect(page.locator('#screen-solve')).toBeVisible({ timeout: 10000 });

    // Crossword grid should be visible
    await expect(page.locator('#crossword-container')).toBeVisible();
    await expect(page.locator('.crossword-grid')).toBeVisible();

    // Progress displays should be visible
    await expect(page.locator('#your-progress')).toBeVisible();
    await expect(page.locator('#opponent-progress')).toBeVisible();

    // Timer should be running
    await expect(page.locator('#timer-solve')).toContainText(/\d+:\d+/);

    // Game should eventually end (either win, lose, or timeout)
    await expect(page.locator('#screen-results')).toBeVisible({ timeout: 310000 }); // 5 min + buffer

    // Result should show
    await expect(page.locator('#result-title')).toContainText(/Win|Lose|Tie/i);
  });

  test('should validate words before submission', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Start matchmaking and wait for bot
    await page.locator('#find-match-btn').click();
    await expect(page.locator('#screen-submit')).toBeVisible({ timeout: 15000 });

    // Try invalid word
    const firstInput = page.locator('.word-input').first();
    await firstInput.fill('XYZQW');
    await firstInput.blur();

    // Should show error
    await expect(firstInput).toHaveClass(/invalid/);
    await expect(page.locator('.word-error').first()).toContainText(/dictionary/i);

    // Submit button should be disabled
    const submitBtn = page.locator('#word-form button[type="submit"]');
    await expect(submitBtn).toBeDisabled();

    // Fix with valid word
    await firstInput.fill('APPLE');
    await firstInput.blur();
    await expect(firstInput).not.toHaveClass(/invalid/);
  });

  test('should allow leaving during bot game', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Start bot game
    await page.locator('#find-match-btn').click();
    await expect(page.locator('#screen-submit')).toBeVisible({ timeout: 15000 });

    // Leave game
    await page.locator('#leave-submit-btn').click();

    // Should return to menu
    await expect(page.locator('#screen-menu')).toBeVisible();
  });
});

test.describe('Matchmaking', () => {
  test('should show matchmaking status when finding match', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Click find match
    await page.locator('#find-match-btn').click();

    // Button should be disabled
    await expect(page.locator('#find-match-btn')).toBeDisabled();

    // Status should update
    await expect(page.locator('#status-text')).toContainText(/queue|Finding|match/i);
  });

  test('should be able to cancel matchmaking', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Start matchmaking
    await page.locator('#find-match-btn').click();
    await expect(page.locator('#status-text')).toContainText(/queue/i);

    // Wait a bit then cancel via navigation
    await page.waitForTimeout(1000);

    // Refresh to cancel (simulates leaving)
    await page.reload();

    // Should be back at menu
    await expect(page.locator('#screen-menu')).toBeVisible();
    await expect(page.locator('#find-match-btn')).toBeEnabled();
  });
});

test.describe('Friend Rooms', () => {
  test('should join a room by ID', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Enter room ID
    const roomId = `test-room-${Date.now()}`;
    await page.locator('#room-id-input').fill(roomId);
    await page.locator('#join-room-btn').click();

    // Should go to waiting screen
    await expect(page.locator('#screen-waiting')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#waiting-info')).toContainText(/Waiting for opponent/i);
  });

  test('should be able to leave waiting room', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Join a room
    const roomId = `test-room-leave-${Date.now()}`;
    await page.locator('#room-id-input').fill(roomId);
    await page.locator('#join-room-btn').click();

    await expect(page.locator('#screen-waiting')).toBeVisible({ timeout: 5000 });

    // Leave
    await page.locator('#leave-waiting-btn').click();

    // Should return to menu
    await expect(page.locator('#screen-menu')).toBeVisible();
  });

  test('should prevent joining same room twice', async ({ page, context }) => {
    const roomId = `test-room-duplicate-${Date.now()}`;

    // First tab joins room
    await page.goto('/');
    await waitForConnection(page);
    await page.locator('#room-id-input').fill(roomId);
    await page.locator('#join-room-btn').click();
    await expect(page.locator('#screen-waiting')).toBeVisible({ timeout: 5000 });

    // Second tab with same player tries to join
    const page2 = await context.newPage();
    await page2.goto('/');
    await waitForConnection(page2);
    await page2.locator('#room-id-input').fill(roomId);
    await page2.locator('#join-room-btn').click();

    // Should show error (already in room)
    await expect(page2.locator('#error-toast')).toBeVisible({ timeout: 5000 });
    await expect(page2.locator('#error-toast')).toContainText(/already/i);
  });
});

test.describe('Two Player Game', () => {
  test('should match two players and start game', async ({ context }) => {
    test.setTimeout(60000);

    // Create two browser contexts for two players
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    const roomId = `two-player-${Date.now()}`;

    // Player 1 joins room
    await page1.goto('/');
    await waitForConnection(page1);
    await page1.locator('#room-id-input').fill(roomId);
    await page1.locator('#join-room-btn').click();
    await expect(page1.locator('#screen-waiting')).toBeVisible({ timeout: 5000 });

    // Player 2 joins same room
    await page2.goto('/');
    await waitForConnection(page2);
    await page2.locator('#room-id-input').fill(roomId);
    await page2.locator('#join-room-btn').click();

    // Both should go to submit screen
    await expect(page1.locator('#screen-submit')).toBeVisible({ timeout: 10000 });
    await expect(page2.locator('#screen-submit')).toBeVisible({ timeout: 5000 });

    // Both should see opponent info
    await expect(page1.locator('#submit-opponent-name')).toBeVisible();
    await expect(page2.locator('#submit-opponent-name')).toBeVisible();
  });

  test('should complete two-player game', async ({ context }) => {
    test.setTimeout(180000); // 3 minutes

    const page1 = await context.newPage();
    const page2 = await context.newPage();

    const roomId = `two-player-complete-${Date.now()}`;

    // Both join room
    await page1.goto('/');
    await waitForConnection(page1);
    await page1.locator('#room-id-input').fill(roomId);
    await page1.locator('#join-room-btn').click();

    await page2.goto('/');
    await waitForConnection(page2);
    await page2.locator('#room-id-input').fill(roomId);
    await page2.locator('#join-room-btn').click();

    // Wait for submit screen
    await expect(page1.locator('#screen-submit')).toBeVisible({ timeout: 10000 });
    await expect(page2.locator('#screen-submit')).toBeVisible({ timeout: 5000 });

    // Both submit words
    await fillWords(page1, VALID_WORDS);
    await fillWords(page2, ['WATER', 'TOWER', 'TRAWL', 'ALERT']);

    await page1.locator('#word-form button[type="submit"]').click();
    await page2.locator('#word-form button[type="submit"]').click();

    // Both should go to solving phase
    await expect(page1.locator('#screen-solve')).toBeVisible({ timeout: 15000 });
    await expect(page2.locator('#screen-solve')).toBeVisible({ timeout: 5000 });

    // Both should have crossword grids
    await expect(page1.locator('.crossword-grid')).toBeVisible();
    await expect(page2.locator('.crossword-grid')).toBeVisible();

    // Let one player leave to end the game
    await page1.locator('#leave-solve-btn').click();

    // Player 2 should see results (opponent left)
    await expect(page2.locator('#screen-results')).toBeVisible({ timeout: 10000 });
    await expect(page2.locator('#result-title')).toContainText(/Win/i);
    await expect(page2.locator('#result-details')).toContainText(/Opponent left/i);
  });
});

test.describe('Player Identity', () => {
  test('should persist player ID across sessions', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Get player ID
    const playerId = await page.locator('#player-id').textContent();
    expect(playerId).toBeTruthy();

    // Reload page
    await page.reload();
    await waitForConnection(page);

    // Should have same ID
    const playerIdAfterReload = await page.locator('#player-id').textContent();
    expect(playerIdAfterReload).toBe(playerId);
  });

  test('should show change ID form', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Click change ID button
    await page.locator('#change-id-btn').click();

    // Form should be visible
    await expect(page.locator('#change-id-form')).toBeVisible();
    await expect(page.locator('#new-id-input')).toBeVisible();
    await expect(page.locator('#save-id-btn')).toBeVisible();
    await expect(page.locator('#cancel-id-btn')).toBeVisible();

    // Cancel should hide form
    await page.locator('#cancel-id-btn').click();
    await expect(page.locator('#change-id-form')).toBeHidden();
  });
});

test.describe('Theme', () => {
  test('should toggle theme', async ({ page }) => {
    await page.goto('/');

    // Default is dark mode (no light-mode class)
    await expect(page.locator('body')).not.toHaveClass(/light-mode/);

    // Click theme toggle
    await page.locator('#theme-toggle').click();

    // Should be light mode
    await expect(page.locator('body')).toHaveClass(/light-mode/);

    // Click again
    await page.locator('#theme-toggle').click();

    // Should be dark mode again
    await expect(page.locator('body')).not.toHaveClass(/light-mode/);
  });

  test('should persist theme preference', async ({ page }) => {
    await page.goto('/');

    // Switch to light mode
    await page.locator('#theme-toggle').click();
    await expect(page.locator('body')).toHaveClass(/light-mode/);

    // Reload
    await page.reload();

    // Should still be light mode
    await expect(page.locator('body')).toHaveClass(/light-mode/);
  });
});

test.describe('Results Screen', () => {
  test('should show Find New Match button after game ends', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('/');
    await waitForConnection(page);

    // Start bot game and complete it quickly by leaving during solve
    await page.locator('#find-match-btn').click();
    await expect(page.locator('#screen-submit')).toBeVisible({ timeout: 15000 });

    await fillWords(page, VALID_WORDS);
    await page.locator('#word-form button[type="submit"]').click();

    await expect(page.locator('#screen-solve')).toBeVisible({ timeout: 10000 });

    // Leave during solve to trigger loss
    await page.locator('#leave-solve-btn').click();

    // Should return to menu with Find New Match option ready
    await expect(page.locator('#screen-menu')).toBeVisible();
    await expect(page.locator('#find-match-btn')).toBeEnabled();
  });
});
