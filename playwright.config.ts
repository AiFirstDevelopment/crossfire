import { defineConfig, devices } from '@playwright/test';

/**
 * Crossfire E2E Test Configuration
 *
 * Run against local dev server: npm run test:e2e
 * Run against production: npm run test:e2e:prod
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Retry flaky tests (network issues common against production)
  retries: process.env.E2E_BASE_URL ? 2 : (process.env.CI ? 2 : 0),
  // Reduce parallelism to avoid tests matching with each other during matchmaking
  workers: process.env.E2E_BASE_URL ? 2 : 1,
  // Increase overall timeout for production
  timeout: process.env.E2E_BASE_URL ? 60000 : 30000,
  reporter: 'html',

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    // Increase timeout for production (network latency)
    navigationTimeout: process.env.E2E_BASE_URL ? 60000 : 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run local dev servers before tests (when not testing production)
  webServer: process.env.E2E_BASE_URL ? undefined : [
    {
      command: 'npm run dev --workspace=worker',
      url: 'http://localhost:8787/api/health',
      reuseExistingServer: true,
      timeout: 120000,
      stdout: 'pipe',
    },
    {
      command: 'npm run dev --workspace=frontend',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120000,
      stdout: 'pipe',
    },
  ],
});
