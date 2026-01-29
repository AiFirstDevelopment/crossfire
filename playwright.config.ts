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
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run local dev server before tests (when not testing production)
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: 'npm run dev --workspace=frontend',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
    stdout: 'pipe',
  },
});
