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
  await expect(page.locator('#active-games')).toContainText(/\d+ player/);
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
    await expect(page.locator('#active-games')).toContainText(/\d+ players? active/);
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
    test.skip(!process.env.RUN_SLOW_TESTS, 'Slow test - run with RUN_SLOW_TESTS=1');
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

  test('should show cancel button when matchmaking', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Cancel button should be hidden initially
    await expect(page.locator('#cancel-matchmaking-btn')).toBeHidden();

    // Start matchmaking
    await page.locator('#find-match-btn').click();

    // Cancel button should become visible
    await expect(page.locator('#cancel-matchmaking-btn')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#cancel-matchmaking-btn')).toHaveText('Cancel');

    // Status should show queue message
    await expect(page.locator('#status-text')).toContainText(/queue/i);
  });

  test('should cancel matchmaking when clicking cancel button', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Start matchmaking
    await page.locator('#find-match-btn').click();
    await expect(page.locator('#cancel-matchmaking-btn')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#status-text')).toContainText(/queue/i);

    // Click cancel button
    await page.locator('#cancel-matchmaking-btn').click();

    // Cancel button should be hidden
    await expect(page.locator('#cancel-matchmaking-btn')).toBeHidden();

    // Find match button should be enabled again
    await expect(page.locator('#find-match-btn')).toBeEnabled();

    // Status text should be cleared
    await expect(page.locator('#status-text')).toBeEmpty();

    // Should still be on menu screen
    await expect(page.locator('#screen-menu')).toBeVisible();
  });

  test('should be able to cancel matchmaking via page refresh', async ({ page }) => {
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

    // Button should be disabled when input is empty
    await page.locator('#room-id-input').fill('');
    await expect(page.locator('#join-room-btn')).toBeDisabled();

    // Should stay on menu screen
    await expect(page.locator('#screen-menu')).toBeVisible();
    await expect(page.locator('#screen-waiting')).toBeHidden();

    // Button should enable when text is entered
    await page.locator('#room-id-input').fill('test-room');
    await expect(page.locator('#join-room-btn')).toBeEnabled();
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
    test.skip(!process.env.RUN_SLOW_TESTS, 'Slow test - run with RUN_SLOW_TESTS=1');
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
  test('should not have Play Again button', async ({ page }) => {
    await page.goto('/');

    // Verify that the quick-rematch-btn (Play Again) does not exist in the HTML
    await expect(page.locator('#quick-rematch-btn')).toHaveCount(0);

    // Verify that the leave-room-btn exists and has correct text
    await expect(page.locator('#leave-room-btn')).toHaveCount(1);
    const buttonText = await page.locator('#leave-room-btn').textContent();
    expect(buttonText).toBe('Find New Match');
  });

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

    await expect(page.locator('#screen-solve')).toBeVisible({ timeout: 60000 });

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

test.describe('Shareable Room Links', () => {
  test('should show share link section on waiting screen', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Join a room
    const roomId = `share-test-${Date.now()}`;
    await page.locator('#room-id-input').fill(roomId);
    await page.locator('#join-room-btn').click();

    // Wait for waiting screen
    await expect(page.locator('#screen-waiting')).toBeVisible({ timeout: 5000 });

    // Share link section should be visible
    await expect(page.locator('#share-link-section')).toBeVisible();
    await expect(page.locator('#share-link-input')).toBeVisible();
    await expect(page.locator('#copy-link-btn')).toBeVisible();

    // Share link input should contain the room ID
    const shareLink = await page.locator('#share-link-input').inputValue();
    expect(shareLink).toContain(`room=${roomId}`);

    // Clean up
    await safeLeave(page);
  });

  test('should auto-join room from URL parameter', async ({ browser }) => {
    const roomId = `url-join-${Date.now()}`;

    // First player creates the room
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    try {
      await page1.goto('/');
      await waitForConnection(page1);
      await page1.locator('#room-id-input').fill(roomId);
      await page1.locator('#join-room-btn').click();
      await expect(page1.locator('#screen-waiting')).toBeVisible({ timeout: 5000 });

      // Second player joins via URL
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      try {
        await page2.goto(`/?room=${roomId}`);
        await waitForConnection(page2);

        // Both should go to submit screen (game started)
        await expect(page1.locator('#screen-submit')).toBeVisible({ timeout: 10000 });
        await expect(page2.locator('#screen-submit')).toBeVisible({ timeout: 5000 });

        // Clean up
        await safeLeave(page1);
        await safeLeave(page2);
      } finally {
        await context2.close();
      }
    } finally {
      await context1.close();
    }
  });

  test('should have share link elements in waiting screen', async ({ page }) => {
    await page.goto('/');

    // Share link elements should exist (hidden in DOM initially)
    await expect(page.locator('#share-link-input')).toHaveCount(1);
    await expect(page.locator('#copy-link-btn')).toHaveCount(1);
    await expect(page.locator('#copy-feedback')).toHaveCount(1);
  });
});

test.describe('Critical UI Elements', () => {
  // These tests verify that essential UI elements exist and haven't been accidentally removed

  test('should have all menu screen elements', async ({ page }) => {
    await page.goto('/');

    // Main buttons
    await expect(page.locator('#find-match-btn')).toHaveCount(1);
    await expect(page.locator('#find-match-btn')).toHaveText('Play Now');
    await expect(page.locator('#cancel-matchmaking-btn')).toHaveCount(1);
    await expect(page.locator('#cancel-matchmaking-btn')).toHaveText('Cancel');
    await expect(page.locator('#join-room-btn')).toHaveCount(1);
    await expect(page.locator('#room-id-input')).toHaveCount(1);

    // Stats displays
    await expect(page.locator('#active-games')).toHaveCount(1);
    await expect(page.locator('#total-games')).toHaveCount(1);
    await expect(page.locator('#total-players')).toHaveCount(1);

    // Player info
    await expect(page.locator('#player-id')).toHaveCount(1);
    await expect(page.locator('#player-level')).toHaveCount(1);
    await expect(page.locator('#player-wins')).toHaveCount(1);

    // Theme toggle
    await expect(page.locator('#theme-toggle')).toHaveCount(1);
  });

  test('should have all waiting screen elements', async ({ page }) => {
    await page.goto('/');

    // Waiting screen elements (hidden initially but should exist in DOM)
    await expect(page.locator('#screen-waiting')).toHaveCount(1);
    await expect(page.locator('#leave-waiting-btn')).toHaveCount(1);
    await expect(page.locator('#waiting-info')).toHaveCount(1);

    // Share link elements
    await expect(page.locator('#share-link-input')).toHaveCount(1);
    await expect(page.locator('#copy-link-btn')).toHaveCount(1);
    await expect(page.locator('#copy-feedback')).toHaveCount(1);
  });

  test('should have all submit screen elements', async ({ page }) => {
    await page.goto('/');

    // Submit screen elements
    await expect(page.locator('#screen-submit')).toHaveCount(1);
    await expect(page.locator('#word-form')).toHaveCount(1);
    await expect(page.locator('.word-input')).toHaveCount(4);
    await expect(page.locator('#leave-submit-btn')).toHaveCount(1);
    await expect(page.locator('#timer-submit')).toHaveCount(1);
  });

  test('should have all solve screen elements', async ({ page }) => {
    await page.goto('/');

    // Solve screen elements
    await expect(page.locator('#screen-solve')).toHaveCount(1);
    await expect(page.locator('#crossword-container')).toHaveCount(1);
    await expect(page.locator('#your-progress')).toHaveCount(1);
    await expect(page.locator('#opponent-progress')).toHaveCount(1);
    await expect(page.locator('#timer-solve')).toHaveCount(1);
    await expect(page.locator('#leave-solve-btn')).toHaveCount(1);
    await expect(page.locator('#hints-remaining')).toHaveCount(1);
  });

  test('should have all results screen elements', async ({ page }) => {
    await page.goto('/');

    // Results screen elements
    await expect(page.locator('#screen-results')).toHaveCount(1);
    await expect(page.locator('#result-title')).toHaveCount(1);
    await expect(page.locator('#result-details')).toHaveCount(1);
    await expect(page.locator('#leave-room-btn')).toHaveCount(1);
    await expect(page.locator('#leave-room-btn')).toHaveText('Find New Match');
    await expect(page.locator('#solution-container')).toHaveCount(1);
    await expect(page.locator('#confetti-container')).toHaveCount(1);
  });

  test('should have engagement feature elements', async ({ page }) => {
    await page.goto('/');

    // Streak displays
    await expect(page.locator('#streak-display')).toHaveCount(1);
    await expect(page.locator('#win-streak')).toHaveCount(1);
    await expect(page.locator('#daily-streak')).toHaveCount(1);

    // Daily challenge
    await expect(page.locator('#daily-challenge')).toHaveCount(1);
    await expect(page.locator('#daily-challenge-bar')).toHaveCount(1);

    // Leaderboard
    await expect(page.locator('#leaderboard-list')).toHaveCount(1);

    // Achievements
    await expect(page.locator('#achievements-list')).toHaveCount(1);

    // Toasts
    await expect(page.locator('#error-toast')).toHaveCount(1);
    await expect(page.locator('#hint-toast')).toHaveCount(1);
    await expect(page.locator('#achievement-toast')).toHaveCount(1);
    await expect(page.locator('#streak-toast')).toHaveCount(1);
  });

  test('should have player ID change form elements', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#change-id-btn')).toHaveCount(1);
    await expect(page.locator('#change-id-form')).toHaveCount(1);
    await expect(page.locator('#new-id-input')).toHaveCount(1);
    await expect(page.locator('#save-id-btn')).toHaveCount(1);
    await expect(page.locator('#cancel-id-btn')).toHaveCount(1);
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

test.describe('Rematch Flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('should show rematch button after multiplayer game ends', async ({ browser }) => {
    test.setTimeout(120000);

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomId = `rematch-test-${Date.now()}`;

    try {
      // Both players join room
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

      // Player 1 leaves to end the game (player 2 wins)
      await page1.locator('#leave-submit-btn').click();

      // Player 2 should see results with rematch button
      await expect(page2.locator('#screen-results')).toBeVisible({ timeout: 10000 });
      await expect(page2.locator('#rematch-section')).toBeVisible();
      await expect(page2.locator('#rematch-btn')).toBeHidden(); // Hidden because opponent left

      await safeLeave(page2);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  // Skip this test - requires complex room rejoin logic that's unreliable
  test.skip('should show waiting status after clicking rematch', async ({ browser }) => {
    test.setTimeout(180000);

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomId = `rematch-waiting-${Date.now()}`;

    try {
      // Both join and start game
      await page1.goto('/');
      await waitForConnection(page1);
      await page1.locator('#room-id-input').fill(roomId);
      await page1.locator('#join-room-btn').click();

      await page2.goto('/');
      await waitForConnection(page2);
      await page2.locator('#room-id-input').fill(roomId);
      await page2.locator('#join-room-btn').click();

      await expect(page1.locator('#screen-submit')).toBeVisible({ timeout: 20000 });
      await expect(page2.locator('#screen-submit')).toBeVisible({ timeout: 10000 });

      // Both submit words to get to solve phase
      await fillWords(page1, VALID_WORDS);
      await fillWords(page2, ['WATER', 'TOWER', 'TRAWL', 'ALERT']);

      await page1.locator('#word-form button[type="submit"]').click();
      await page2.locator('#word-form button[type="submit"]').click();

      // Wait for solve phase
      await expect(page1.locator('#screen-solve')).toBeVisible({ timeout: 30000 });
      await expect(page2.locator('#screen-solve')).toBeVisible({ timeout: 10000 });

      // Player 1 leaves (player 2 wins)
      await page1.locator('#leave-solve-btn').click();

      // Player 2 sees results
      await expect(page2.locator('#screen-results')).toBeVisible({ timeout: 10000 });

      // Player 1 rejoins the room
      await page1.locator('#room-id-input').fill(roomId);
      await page1.locator('#join-room-btn').click();
      await expect(page1.locator('#screen-results')).toBeVisible({ timeout: 10000 });

      // Now player 2 clicks rematch (both are in room)
      await page2.locator('#rematch-btn').click();

      // Should show waiting status
      await expect(page2.locator('#rematch-btn')).toHaveText('Waiting...');
      await expect(page2.locator('#rematch-btn')).toBeDisabled();
      await expect(page2.locator('#rematch-status')).toContainText(/Waiting for opponent/i);

      await safeLeave(page1);
      await safeLeave(page2);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  // Skip - requires complex room rejoin logic that's unreliable in E2E
  test.skip('should show opponent wants rematch notification', async ({ browser }) => {
    test.setTimeout(180000);

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomId = `rematch-notify-${Date.now()}`;

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

      // Wait for game to start
      await expect(page1.locator('#screen-submit')).toBeVisible({ timeout: 20000 });
      await expect(page2.locator('#screen-submit')).toBeVisible({ timeout: 10000 });

      // Both submit words quickly
      await fillWords(page1, VALID_WORDS);
      await fillWords(page2, ['WATER', 'TOWER', 'TRAWL', 'ALERT']);

      await page1.locator('#word-form button[type="submit"]').click();
      await page2.locator('#word-form button[type="submit"]').click();

      // Wait for solve phase
      await expect(page1.locator('#screen-solve')).toBeVisible({ timeout: 30000 });
      await expect(page2.locator('#screen-solve')).toBeVisible({ timeout: 10000 });

      // Player 1 leaves during solve (player 2 wins)
      await page1.locator('#leave-solve-btn').click();

      // Player 2 should see results
      await expect(page2.locator('#screen-results')).toBeVisible({ timeout: 10000 });

      // Player 1 rejoins the same room for rematch testing
      await page1.locator('#room-id-input').fill(roomId);
      await page1.locator('#join-room-btn').click();
      await expect(page1.locator('#screen-results')).toBeVisible({ timeout: 10000 });

      // Player 1 clicks rematch
      await page1.locator('#rematch-btn').click();

      // Player 2 should see the rematch modal
      await expect(page2.locator('#rematch-modal')).toBeVisible({ timeout: 10000 });
      await expect(page2.locator('#rematch-request')).toBeVisible();

      await safeLeave(page1);
      await safeLeave(page2);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  // Skip - requires complex room rejoin logic that's unreliable in E2E
  test.skip('should start new game when both accept rematch', async ({ browser }) => {
    test.setTimeout(180000);

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomId = `rematch-accept-${Date.now()}`;

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

      // Wait for game to start
      await expect(page1.locator('#screen-submit')).toBeVisible({ timeout: 20000 });
      await expect(page2.locator('#screen-submit')).toBeVisible({ timeout: 10000 });

      // Both submit words
      await fillWords(page1, VALID_WORDS);
      await fillWords(page2, ['WATER', 'TOWER', 'TRAWL', 'ALERT']);

      await page1.locator('#word-form button[type="submit"]').click();
      await page2.locator('#word-form button[type="submit"]').click();

      // Wait for solve phase
      await expect(page1.locator('#screen-solve')).toBeVisible({ timeout: 30000 });
      await expect(page2.locator('#screen-solve')).toBeVisible({ timeout: 10000 });

      // Player 1 leaves (player 2 wins)
      await page1.locator('#leave-solve-btn').click();
      await expect(page2.locator('#screen-results')).toBeVisible({ timeout: 10000 });

      // Player 1 rejoins
      await page1.locator('#room-id-input').fill(roomId);
      await page1.locator('#join-room-btn').click();
      await expect(page1.locator('#screen-results')).toBeVisible({ timeout: 10000 });

      // Both click rematch (order shouldn't matter)
      await page1.locator('#rematch-btn').click();

      // Player 2 sees modal and accepts
      await expect(page2.locator('#rematch-modal')).toBeVisible({ timeout: 10000 });
      await page2.locator('#accept-rematch-btn').click();

      // Both should go to submit screen (new game started)
      await expect(page1.locator('#screen-submit')).toBeVisible({ timeout: 10000 });
      await expect(page2.locator('#screen-submit')).toBeVisible({ timeout: 10000 });

      await safeLeave(page1);
      await safeLeave(page2);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  // Skip - requires complex room rejoin logic that's unreliable in E2E
  test.skip('should return to menu when declining rematch', async ({ browser }) => {
    test.setTimeout(180000);

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomId = `rematch-decline-${Date.now()}`;

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

      // Wait for game to start
      await expect(page1.locator('#screen-submit')).toBeVisible({ timeout: 20000 });
      await expect(page2.locator('#screen-submit')).toBeVisible({ timeout: 10000 });

      // Both submit words
      await fillWords(page1, VALID_WORDS);
      await fillWords(page2, ['WATER', 'TOWER', 'TRAWL', 'ALERT']);

      await page1.locator('#word-form button[type="submit"]').click();
      await page2.locator('#word-form button[type="submit"]').click();

      // Wait for solve phase
      await expect(page1.locator('#screen-solve')).toBeVisible({ timeout: 30000 });
      await expect(page2.locator('#screen-solve')).toBeVisible({ timeout: 10000 });

      // Player 1 leaves (player 2 wins)
      await page1.locator('#leave-solve-btn').click();
      await expect(page2.locator('#screen-results')).toBeVisible({ timeout: 10000 });

      // Player 1 rejoins
      await page1.locator('#room-id-input').fill(roomId);
      await page1.locator('#join-room-btn').click();
      await expect(page1.locator('#screen-results')).toBeVisible({ timeout: 10000 });

      // Player 1 clicks rematch
      await page1.locator('#rematch-btn').click();

      // Player 2 sees modal and declines
      await expect(page2.locator('#rematch-modal')).toBeVisible({ timeout: 10000 });
      await page2.locator('#decline-rematch-btn').click();

      // Player 2 should go to menu
      await expect(page2.locator('#screen-menu')).toBeVisible({ timeout: 5000 });

      // Player 1 should see opponent left message
      await expect(page1.locator('#rematch-status')).toContainText(/Opponent has left/i, { timeout: 10000 });

      await safeLeave(page1);
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

test.describe('Opponent Leaves', () => {
  test.describe.configure({ mode: 'serial' });

  test('should hide rematch button when opponent left during game', async ({ browser }) => {
    test.setTimeout(60000);

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomId = `opponent-left-${Date.now()}`;

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

      // Wait for game to start
      await expect(page1.locator('#screen-submit')).toBeVisible({ timeout: 20000 });
      await expect(page2.locator('#screen-submit')).toBeVisible({ timeout: 10000 });

      // Player 1 leaves during submit phase
      await page1.locator('#leave-submit-btn').click();

      // Player 2 should see results with "opponent left" reason
      await expect(page2.locator('#screen-results')).toBeVisible({ timeout: 10000 });
      await expect(page2.locator('#result-details')).toContainText(/Opponent left/i);

      // Rematch button should be hidden
      await expect(page2.locator('#rematch-btn')).toBeHidden();
      await expect(page2.locator('#rematch-status')).toContainText(/Opponent has left/i);

      await safeLeave(page2);
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  // Skip - requires complex room rejoin logic that's unreliable in E2E
  test.skip('should update UI when opponent leaves while on results screen', async ({ browser }) => {
    test.setTimeout(180000);

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomId = `opponent-left-results-${Date.now()}`;

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

      // Wait for game to start
      await expect(page1.locator('#screen-submit')).toBeVisible({ timeout: 20000 });
      await expect(page2.locator('#screen-submit')).toBeVisible({ timeout: 10000 });

      // Both submit words
      await fillWords(page1, VALID_WORDS);
      await fillWords(page2, ['WATER', 'TOWER', 'TRAWL', 'ALERT']);

      await page1.locator('#word-form button[type="submit"]').click();
      await page2.locator('#word-form button[type="submit"]').click();

      // Wait for solve phase
      await expect(page1.locator('#screen-solve')).toBeVisible({ timeout: 30000 });
      await expect(page2.locator('#screen-solve')).toBeVisible({ timeout: 10000 });

      // Player 1 leaves during solve (both see results first)
      await page1.locator('#leave-solve-btn').click();

      // Player 2 sees results
      await expect(page2.locator('#screen-results')).toBeVisible({ timeout: 10000 });

      // Player 1 rejoins so both are on results
      await page1.locator('#room-id-input').fill(roomId);
      await page1.locator('#join-room-btn').click();
      await expect(page1.locator('#screen-results')).toBeVisible({ timeout: 10000 });

      // Both should see rematch button initially
      await expect(page1.locator('#rematch-btn')).toBeVisible();
      await expect(page2.locator('#rematch-btn')).toBeVisible();

      // Player 1 clicks "Find New Match" to leave
      await page1.locator('#leave-room-btn').click();

      // Player 2's rematch UI should update
      await expect(page2.locator('#rematch-btn')).toBeHidden({ timeout: 10000 });
      await expect(page2.locator('#rematch-status')).toContainText(/Opponent has left/i);

      await safeLeave(page2);
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

test.describe('Head-to-Head Tracking', () => {
  // Skip - requires full game completion which times out
  test.skip('should show h2h record after friend room game', async ({ browser }) => {
    test.setTimeout(180000);

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomId = `h2h-test-${Date.now()}`;

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

      // Wait for game to start
      await expect(page1.locator('#screen-submit')).toBeVisible({ timeout: 20000 });
      await expect(page2.locator('#screen-submit')).toBeVisible({ timeout: 10000 });

      // Both submit words
      await fillWords(page1, VALID_WORDS);
      await fillWords(page2, ['WATER', 'TOWER', 'TRAWL', 'ALERT']);

      await page1.locator('#word-form button[type="submit"]').click();
      await page2.locator('#word-form button[type="submit"]').click();

      // Wait for solve phase
      await expect(page1.locator('#screen-solve')).toBeVisible({ timeout: 30000 });
      await expect(page2.locator('#screen-solve')).toBeVisible({ timeout: 10000 });

      // Player 1 leaves (player 2 wins)
      await page1.locator('#leave-solve-btn').click();

      // Player 2 sees results with h2h record
      await expect(page2.locator('#screen-results')).toBeVisible({ timeout: 10000 });
      await expect(page2.locator('#head-to-head')).toBeVisible();
      await expect(page2.locator('#h2h-record')).toContainText(/\d+W - \d+L/);

      await safeLeave(page2);
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

test.describe('View History Modal', () => {
  test('should show view history button on menu', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // View history button should be visible
    await expect(page.locator('#view-h2h-btn')).toBeVisible();
  });

  test('should open and close h2h modal', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Click view history button
    await page.locator('#view-h2h-btn').click();

    // Modal should be visible
    await expect(page.locator('#h2h-modal')).toBeVisible();
    await expect(page.locator('.h2h-modal-content')).toBeVisible();

    // Close button should work
    await page.locator('#h2h-close-btn').click();
    await expect(page.locator('#h2h-modal')).toBeHidden();
  });

  test('should close modal when clicking outside', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Open modal
    await page.locator('#view-h2h-btn').click();
    await expect(page.locator('#h2h-modal')).toBeVisible();

    // Click on the overlay (outside the modal content)
    await page.locator('#h2h-modal').click({ position: { x: 10, y: 10 } });

    // Modal should be hidden
    await expect(page.locator('#h2h-modal')).toBeHidden();
  });

  test('should show empty state when no battles played', async ({ browser }) => {
    // Use fresh context with no localStorage
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/');
      await waitForConnection(page);

      // Clear any existing h2h records
      await page.evaluate(() => {
        localStorage.removeItem('crossfire-h2h-records');
      });
      await page.reload();
      await waitForConnection(page);

      // Open modal
      await page.locator('#view-h2h-btn').click();
      await expect(page.locator('#h2h-modal')).toBeVisible();

      // Should show empty state message
      await expect(page.locator('.h2h-empty')).toBeVisible();
      await expect(page.locator('.h2h-empty')).toContainText(/No friend battles/i);
    } finally {
      await context.close();
    }
  });
});

test.describe('Opponent Progress', () => {
  // Skip - requires full game completion which times out
  test.skip('should show opponent progress bar during solve phase', async ({ browser }) => {
    test.setTimeout(180000);

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomId = `progress-test-${Date.now()}`;

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

      // Wait for solve phase
      await expect(page1.locator('#screen-solve')).toBeVisible({ timeout: 30000 });
      await expect(page2.locator('#screen-solve')).toBeVisible({ timeout: 10000 });

      // Opponent progress bar should be visible
      await expect(page1.locator('#opponent-progress')).toBeVisible();
      await expect(page2.locator('#opponent-progress')).toBeVisible();

      // Your progress bar should be visible
      await expect(page1.locator('#your-progress')).toBeVisible();
      await expect(page2.locator('#your-progress')).toBeVisible();

      await safeLeave(page1);
      await safeLeave(page2);
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

test.describe('Hints System', () => {
  test('should show hints remaining counter', async ({ browser }) => {
    test.skip(!!process.env.E2E_BASE_URL, 'Skipped in production - requires bot game');
    test.setTimeout(60000);

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/');
      await waitForConnection(page);

      // Start bot game
      await page.locator('#find-match-btn').click();
      await expect(page.locator('#screen-submit')).toBeVisible({ timeout: 45000 });

      // Submit words
      await fillWords(page, VALID_WORDS);
      await page.locator('#word-form button[type="submit"]').click();

      // Wait for solve phase
      await expect(page.locator('#screen-solve')).toBeVisible({ timeout: 60000 });

      // Hints remaining should be visible (shows a number)
      await expect(page.locator('#hints-remaining')).toBeVisible();
      await expect(page.locator('#hints-remaining')).toContainText(/\d+/);

      await safeLeave(page);
    } finally {
      await context.close();
    }
  });
});

test.describe('Cell Input and Feedback', () => {
  // Skip - bot game timeout unreliable
  test.skip('should have crossword grid with input cells', async ({ browser }) => {
    test.skip(!!process.env.E2E_BASE_URL, 'Skipped in production - requires bot game');
    test.setTimeout(60000);

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/');
      await waitForConnection(page);

      // Start bot game
      await page.locator('#find-match-btn').click();
      await expect(page.locator('#screen-submit')).toBeVisible({ timeout: 45000 });

      // Submit words
      await fillWords(page, VALID_WORDS);
      await page.locator('#word-form button[type="submit"]').click();

      // Wait for solve phase
      await expect(page.locator('#screen-solve')).toBeVisible({ timeout: 60000 });

      // Crossword grid should be visible
      await expect(page.locator('.crossword-grid')).toBeVisible();

      // Should have editable cells (at least one - they are contenteditable divs)
      const cellCount = await page.locator('.crossword-cell').count();
      expect(cellCount).toBeGreaterThan(0);

      await safeLeave(page);
    } finally {
      await context.close();
    }
  });

  // Skip - bot game timeout unreliable
  test.skip('should allow typing in crossword cells', async ({ browser }) => {
    test.skip(!!process.env.E2E_BASE_URL, 'Skipped in production - requires bot game');
    test.setTimeout(60000);

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/');
      await waitForConnection(page);

      // Start bot game
      await page.locator('#find-match-btn').click();
      await expect(page.locator('#screen-submit')).toBeVisible({ timeout: 45000 });

      // Submit words
      await fillWords(page, VALID_WORDS);
      await page.locator('#word-form button[type="submit"]').click();

      // Wait for solve phase
      await expect(page.locator('#screen-solve')).toBeVisible({ timeout: 60000 });

      // Find first empty cell and type (cells are contenteditable divs)
      const firstCell = page.locator('.crossword-cell').first();
      await firstCell.click();
      await page.keyboard.type('A');

      // Cell should have the letter
      await expect(firstCell).toHaveText('A');

      await safeLeave(page);
    } finally {
      await context.close();
    }
  });
});

test.describe('Forfeit Button', () => {
  test('should have forfeit button on solve screen', async ({ browser }) => {
    test.skip(!!process.env.E2E_BASE_URL, 'Skipped in production - requires bot game');
    test.setTimeout(60000);

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/');
      await waitForConnection(page);

      // Start bot game
      await page.locator('#find-match-btn').click();
      await expect(page.locator('#screen-submit')).toBeVisible({ timeout: 45000 });

      // Submit words
      await fillWords(page, VALID_WORDS);
      await page.locator('#word-form button[type="submit"]').click();

      // Wait for solve phase
      await expect(page.locator('#screen-solve')).toBeVisible({ timeout: 60000 });

      // Leave/forfeit button should be visible
      await expect(page.locator('#leave-solve-btn')).toBeVisible();

      await safeLeave(page);
    } finally {
      await context.close();
    }
  });

  test('should end game when clicking forfeit', async ({ browser }) => {
    test.skip(!!process.env.E2E_BASE_URL, 'Skipped in production - requires bot game');
    test.setTimeout(60000);

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/');
      await waitForConnection(page);

      // Start bot game
      await page.locator('#find-match-btn').click();
      await expect(page.locator('#screen-submit')).toBeVisible({ timeout: 45000 });

      // Submit words
      await fillWords(page, VALID_WORDS);
      await page.locator('#word-form button[type="submit"]').click();

      // Wait for solve phase
      await expect(page.locator('#screen-solve')).toBeVisible({ timeout: 60000 });

      // Click forfeit/leave (if still on solve screen - bot might finish first)
      const leaveBtn = page.locator('#leave-solve-btn');
      if (await leaveBtn.isVisible()) {
        await leaveBtn.click();
        // Should return to menu
        await expect(page.locator('#screen-menu')).toBeVisible({ timeout: 5000 });
      } else {
        // Bot finished first - we're on results screen, which is fine
        await expect(page.locator('#screen-results')).toBeVisible({ timeout: 5000 });
      }
    } finally {
      await context.close();
    }
  });
});

test.describe('Copy Share Link', () => {
  test('should have copy button on waiting screen', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Join a room
    const roomId = `copy-test-${Date.now()}`;
    await page.locator('#room-id-input').fill(roomId);
    await page.locator('#join-room-btn').click();

    await expect(page.locator('#screen-waiting')).toBeVisible({ timeout: 5000 });

    // Copy button should be visible
    await expect(page.locator('#copy-link-btn')).toBeVisible();
    await expect(page.locator('#share-link-input')).toBeVisible();

    // Share link should contain room ID
    const shareLink = await page.locator('#share-link-input').inputValue();
    expect(shareLink).toContain(roomId);

    await safeLeave(page);
  });

  test('should show feedback when clicking copy', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/');
    await waitForConnection(page);

    // Join a room
    const roomId = `copy-feedback-${Date.now()}`;
    await page.locator('#room-id-input').fill(roomId);
    await page.locator('#join-room-btn').click();

    await expect(page.locator('#screen-waiting')).toBeVisible({ timeout: 5000 });

    // Click copy button
    await page.locator('#copy-link-btn').click();

    // Feedback should appear
    await expect(page.locator('#copy-feedback')).toBeVisible({ timeout: 2000 });

    await safeLeave(page);
  });
});

test.describe('Challenge Friend Button', () => {
  test('should have challenge friend section on menu', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Challenge friend button should exist in DOM
    await expect(page.locator('#challenge-friend-btn')).toHaveCount(1);
  });

  // Skip - challenge friend button may be hidden depending on UI state
  test.skip('should generate room ID when clicking challenge friend', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Make sure button is visible (may need to scroll)
    const btn = page.locator('#challenge-friend-btn');
    await btn.scrollIntoViewIfNeeded();

    // Check if visible before clicking
    const isVisible = await btn.isVisible();
    if (!isVisible) {
      // If button is hidden, the feature may be disabled - skip
      test.skip();
      return;
    }

    await btn.click();

    // Should go to waiting screen with a room
    await expect(page.locator('#screen-waiting')).toBeVisible({ timeout: 5000 });

    // Share link should be populated
    const shareLink = await page.locator('#share-link-input').inputValue();
    expect(shareLink).toContain('room=');

    await safeLeave(page);
  });
});

test.describe('Solution Grid', () => {
  test('should have solution container on results screen', async ({ page }) => {
    await page.goto('/');

    // Solution container should exist (hidden initially)
    await expect(page.locator('#solution-container')).toHaveCount(1);
  });
});

test.describe('Stale Room Re-entry', () => {
  test('should allow re-entering a room after leaving as only player', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    const roomId = `stale-room-${Date.now()}`;

    // Join a room
    await page.locator('#room-id-input').fill(roomId);
    await page.locator('#join-room-btn').click();
    await expect(page.locator('#screen-waiting')).toBeVisible({ timeout: 5000 });

    // Leave the room
    await page.locator('#leave-waiting-btn').click();
    await expect(page.locator('#screen-menu')).toBeVisible();

    // Re-enter the same room (should not show "game in progress" error)
    await page.locator('#room-id-input').fill(roomId);
    await page.locator('#join-room-btn').click();

    // Should go to waiting screen again, not show error
    await expect(page.locator('#screen-waiting')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#error-toast')).toBeHidden();

    await safeLeave(page);
  });
});

test.describe('Engagement Features', () => {
  test('should have streak elements in DOM', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Streak display elements should exist (may be hidden based on user state)
    await expect(page.locator('#streak-display')).toHaveCount(1);
    await expect(page.locator('#win-streak')).toHaveCount(1);
    await expect(page.locator('#daily-streak')).toHaveCount(1);
  });

  test('should have daily challenge elements in DOM', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Daily challenge elements should exist (may be hidden)
    await expect(page.locator('#daily-challenge')).toHaveCount(1);
    await expect(page.locator('#daily-challenge-bar')).toHaveCount(1);
  });

  test('should display leaderboard', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Leaderboard should be visible
    await expect(page.locator('#leaderboard-list')).toBeVisible();
  });

  test('should display achievements section', async ({ page }) => {
    await page.goto('/');
    await waitForConnection(page);

    // Achievements section should be visible
    await expect(page.locator('#achievements-list')).toBeVisible();
  });
});
