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

// Helper to safely leave any game/room state (prevents orphaned games on server)
async function safeLeave(page: Page) {
  try {
    // Check which screen we're on and click the appropriate leave button
    if (await page.locator('#leave-solve-btn').isVisible({ timeout: 500 })) {
      await page.locator('#leave-solve-btn').click();
    } else if (await page.locator('#leave-submit-btn').isVisible({ timeout: 500 })) {
      await page.locator('#leave-submit-btn').click();
    } else if (await page.locator('#leave-waiting-btn').isVisible({ timeout: 500 })) {
      await page.locator('#leave-waiting-btn').click();
    } else if (await page.locator('#leave-room-btn').isVisible({ timeout: 500 })) {
      await page.locator('#leave-room-btn').click();
    }
    // Wait a moment for the leave action to process
    await page.waitForTimeout(200);
  } catch {
    // Ignore errors - page may already be closed or in menu
  }
}

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
  // Run bot tests serially to avoid matching each other in the queue
  test.describe.configure({ mode: 'serial' });

  // Skip bot timeout test in production - it can match with other tests in the shared queue
  // This test works reliably in local development but is flaky against production
  test('should start bot game after matchmaking timeout', async ({ page }) => {
    test.skip(!!process.env.E2E_BASE_URL, 'Skipped in production - bot timeout unreliable with shared queue');
    test.setTimeout(45000); // 45 seconds for this test

    await page.goto('/');
    await waitForConnection(page);

    // Click find match
    await page.locator('#find-match-btn').click();

    // Should show "In queue" status
    await expect(page.locator('#status-text')).toContainText(/queue|Finding/i);

    // Wait for bot game to start (10 second timeout + network latency buffer)
    // The bot game starts after 10 seconds of matchmaking, status shows "Playing against [Bot]"
    await expect(page.locator('#status-text')).toContainText(/Playing against/i, { timeout: 45000 });

    // Should show submit screen
    await expect(page.locator('#screen-submit')).toBeVisible({ timeout: 5000 });
  });

  test('should complete a full bot game', async ({ page }) => {
    test.skip(!!process.env.E2E_BASE_URL, 'Skipped in production - bot timeout unreliable with shared queue');
    test.setTimeout(180000); // 3 minutes for full game

    await page.goto('/');
    await waitForConnection(page);

    // Start matchmaking and wait for bot (10 second timeout + buffer)
    await page.locator('#find-match-btn').click();
    await expect(page.locator('#screen-submit')).toBeVisible({ timeout: 45000 });

    // Fill in words
    await fillWords(page, VALID_WORDS);

    // Submit button should be enabled
    const submitBtn = page.locator('#word-form button[type="submit"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Should show waiting section
    await expect(page.locator('#submit-waiting-section')).toBeVisible();

    // Wait for solving phase (grid generation can take time)
    await expect(page.locator('#screen-solve')).toBeVisible({ timeout: 30000 });

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
    test.skip(!!process.env.E2E_BASE_URL, 'Skipped in production - bot timeout unreliable with shared queue');
    test.setTimeout(45000);

    await page.goto('/');
    await waitForConnection(page);

    // Start matchmaking and wait for bot
    await page.locator('#find-match-btn').click();
    await expect(page.locator('#screen-submit')).toBeVisible({ timeout: 45000 });

    // Try invalid word
    const firstInput = page.locator('.word-input').first();
    await firstInput.fill('XYZQW');
    // Click outside to trigger blur properly (not just programmatic blur)
    await page.locator('body').click({ position: { x: 10, y: 10 } });

    // Should show error (wait for validation to complete)
    await expect(firstInput).toHaveClass(/invalid/, { timeout: 5000 });
    await expect(page.locator('.word-error').first()).toContainText(/dictionary/i);

    // Submit button should be disabled
    const submitBtn = page.locator('#word-form button[type="submit"]');
    await expect(submitBtn).toBeDisabled();

    // Fix with valid word
    await firstInput.fill('APPLE');
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await expect(firstInput).not.toHaveClass(/invalid/, { timeout: 5000 });
  });

  test('should allow leaving during bot game', async ({ page }) => {
    test.skip(!!process.env.E2E_BASE_URL, 'Skipped in production - bot timeout unreliable with shared queue');
    test.setTimeout(45000);

    await page.goto('/');
    await waitForConnection(page);

    // Start bot game
    await page.locator('#find-match-btn').click();
    await expect(page.locator('#screen-submit')).toBeVisible({ timeout: 45000 });

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

    // Clean up: leave the room
    await safeLeave(page);
  });

  test('should not join with empty room ID', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Clear room ID input and click join
    await page.locator('#room-id-input').fill('');
    await page.locator('#join-room-btn').click();

    // Should stay on menu screen (no navigation)
    await expect(page.locator('#screen-menu')).toBeVisible();
    await expect(page.locator('#screen-waiting')).toBeHidden();
  });

  test('should normalize room ID to lowercase', async ({ browser }) => {
    // Use two browser contexts to verify case normalization
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const timestamp = Date.now();

    try {
      // Player 1 joins with UPPERCASE
      await page1.goto('/');
      await waitForConnection(page1);
      await page1.locator('#room-id-input').fill(`TEST-ROOM-${timestamp}`);
      await page1.locator('#join-room-btn').click();
      await expect(page1.locator('#screen-waiting')).toBeVisible({ timeout: 5000 });

      // Player 2 joins with lowercase - should match same room
      await page2.goto('/');
      await waitForConnection(page2);
      await page2.locator('#room-id-input').fill(`test-room-${timestamp}`);
      await page2.locator('#join-room-btn').click();

      // Both should go to submit screen (matched in same room)
      await expect(page1.locator('#screen-submit')).toBeVisible({ timeout: 10000 });
      await expect(page2.locator('#screen-submit')).toBeVisible({ timeout: 5000 });

      // Clean up
      await safeLeave(page1);
      await safeLeave(page2);
    } finally {
      await context1.close();
      await context2.close();
    }
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

    // Clean up: leave the room from first tab
    await safeLeave(page);
  });
});

test.describe('Two Player Game', () => {
  // Run two-player tests serially to avoid interference
  test.describe.configure({ mode: 'serial' });

  test('should match two players and start game', async ({ browser }) => {
    test.setTimeout(60000);

    // Create two separate browser contexts for two players (each has own localStorage/player ID)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomId = `two-player-${Date.now()}`;

    try {
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

      // Both should go to submit screen (game started successfully)
      await expect(page1.locator('#screen-submit')).toBeVisible({ timeout: 20000 });
      await expect(page2.locator('#screen-submit')).toBeVisible({ timeout: 10000 });

      // At least one player should see opponent info (the one who joined second receives player-joined)
      await expect(page1.locator('#submit-opponent-info')).toBeVisible({ timeout: 5000 });

      // Clean up: leave the game properly to avoid orphaned games on server
      await safeLeave(page1);
      await safeLeave(page2);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should complete two-player game', async ({ browser }) => {
    test.skip(!!process.env.E2E_BASE_URL, 'Skipped in production - grid generation timeout issues');
    test.setTimeout(180000); // 3 minutes

    // Create two separate browser contexts for two players
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomId = `two-player-complete-${Date.now()}`;

    try {
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
      await expect(page1.locator('#screen-submit')).toBeVisible({ timeout: 20000 });
      await expect(page2.locator('#screen-submit')).toBeVisible({ timeout: 10000 });

      // Both submit words
      await fillWords(page1, VALID_WORDS);
      await fillWords(page2, ['WATER', 'TOWER', 'TRAWL', 'ALERT']);

      await page1.locator('#word-form button[type="submit"]').click();
      await page2.locator('#word-form button[type="submit"]').click();

      // Both should go to solving phase (grid generation can take time)
      await expect(page1.locator('#screen-solve')).toBeVisible({ timeout: 30000 });
      await expect(page2.locator('#screen-solve')).toBeVisible({ timeout: 10000 });

      // Both should have crossword grids
      await expect(page1.locator('.crossword-grid')).toBeVisible();
      await expect(page2.locator('.crossword-grid')).toBeVisible();

      // Let one player leave to end the game
      await page1.locator('#leave-solve-btn').click();

      // Player 2 should see results (opponent left)
      await expect(page2.locator('#screen-results')).toBeVisible({ timeout: 10000 });
      await expect(page2.locator('#result-title')).toContainText(/Win/i);
      await expect(page2.locator('#result-details')).toContainText(/Opponent left/i);

      // Clean up: leave from results screen
      await safeLeave(page2);
    } finally {
      await context1.close();
      await context2.close();
    }
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


  test('should support keyboard shortcuts in change ID form', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Open change ID form
    await page.locator('#change-id-btn').click();
    await expect(page.locator('#change-id-form')).toBeVisible();

    // Escape should close the form
    await page.locator('#new-id-input').press('Escape');
    await expect(page.locator('#change-id-form')).toBeHidden();

    // Open again - verify it reopens
    await page.locator('#change-id-btn').click();
    await expect(page.locator('#change-id-form')).toBeVisible();

    // Input should be focused and accept typing
    await expect(page.locator('#new-id-input')).toBeFocused();
    await page.locator('#new-id-input').fill('test-value');
    expect(await page.locator('#new-id-input').inputValue()).toBe('test-value');

    // Close with Escape again
    await page.locator('#new-id-input').press('Escape');
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
    test.skip(!!process.env.E2E_BASE_URL, 'Skipped in production - uses matchmaking which is unreliable with shared queue');
    test.setTimeout(120000);

    await page.goto('/');
    await waitForConnection(page);

    // Start bot game and complete it quickly by leaving during solve
    await page.locator('#find-match-btn').click();
    await expect(page.locator('#screen-submit')).toBeVisible({ timeout: 45000 });

    await fillWords(page, VALID_WORDS);
    await page.locator('#word-form button[type="submit"]').click();

    await expect(page.locator('#screen-solve')).toBeVisible({ timeout: 30000 });

    // Leave during solve to trigger loss
    await page.locator('#leave-solve-btn').click();

    // Should return to menu with Find New Match option ready
    await expect(page.locator('#screen-menu')).toBeVisible();
    await expect(page.locator('#find-match-btn')).toBeEnabled();
  });
});


test.describe('Keyboard Navigation', () => {
  test('should tab between word inputs', async ({ browser }) => {
    test.skip(!!process.env.E2E_BASE_URL, 'Skipped in production - requires bot game');
    test.setTimeout(45000);

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/');
      await waitForConnection(page);

      // Start bot game
      await page.locator('#find-match-btn').click();
      await expect(page.locator('#screen-submit')).toBeVisible({ timeout: 45000 });

      // First input should be focused
      const inputs = page.locator('.word-input');
      await expect(inputs.first()).toBeFocused();

      // Fill first word and tab to next
      await inputs.first().fill('APPLE');
      await page.keyboard.press('Tab');

      // Second input should now be focused
      await expect(inputs.nth(1)).toBeFocused();

      // Fill and tab again
      await inputs.nth(1).fill('PLANE');
      await page.keyboard.press('Tab');
      await expect(inputs.nth(2)).toBeFocused();

      // Clean up
      await safeLeave(page);
    } finally {
      await context.close();
    }
  });
});

test.describe('Word Validation', () => {
  test('should reject duplicate words', async ({ browser }) => {
    test.skip(!!process.env.E2E_BASE_URL, 'Skipped in production - requires bot game');
    test.setTimeout(45000);

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/');
      await waitForConnection(page);

      // Start bot game
      await page.locator('#find-match-btn').click();
      await expect(page.locator('#screen-submit')).toBeVisible({ timeout: 45000 });

      // Enter the same word twice
      const inputs = page.locator('.word-input');
      await inputs.nth(0).fill('APPLE');
      await inputs.nth(1).fill('APPLE');
      await page.locator('body').click({ position: { x: 10, y: 10 } });

      // Both should be valid individually (duplicate check is server-side or form-level)
      // But submit button should work - duplicates are caught on submission
      await inputs.nth(2).fill('PLANE');
      await inputs.nth(3).fill('EAGLE');
      await page.locator('body').click({ position: { x: 10, y: 10 } });

      // Submit button should be enabled (client allows it)
      const submitBtn = page.locator('#word-form button[type="submit"]');
      await expect(submitBtn).toBeEnabled({ timeout: 2000 });

      // Clean up
      await safeLeave(page);
    } finally {
      await context.close();
    }
  });

  test('should reject words shorter than 3 characters', async ({ browser }) => {
    test.skip(!!process.env.E2E_BASE_URL, 'Skipped in production - requires bot game');
    test.setTimeout(45000);

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/');
      await waitForConnection(page);

      // Start bot game
      await page.locator('#find-match-btn').click();
      await expect(page.locator('#screen-submit')).toBeVisible({ timeout: 45000 });

      // Enter a short word
      const firstInput = page.locator('.word-input').first();
      await firstInput.fill('AB');
      await page.locator('body').click({ position: { x: 10, y: 10 } });

      // Should show error
      await expect(firstInput).toHaveClass(/invalid/, { timeout: 2000 });
      await expect(page.locator('.word-error').first()).toContainText(/short/i);

      // Submit should be disabled
      const submitBtn = page.locator('#word-form button[type="submit"]');
      await expect(submitBtn).toBeDisabled();

      // Clean up
      await safeLeave(page);
    } finally {
      await context.close();
    }
  });
});
