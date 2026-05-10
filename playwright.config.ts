import { defineConfig, devices } from '@playwright/test';

const PORT = 5174;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Run Vite in dev mode with E2E flag + dummy Auth0 vars so the app boots
    // without redirecting to the real Auth0 tenant.
    command: `vite --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      VITE_E2E: 'true',
      VITE_AUTH0_DOMAIN: 'e2e.local',
      VITE_AUTH0_CLIENT_ID: 'e2e-client',
      // Same-origin so route-mocking matches without origin gymnastics.
      VITE_API_BASE_URL: BASE_URL,
    },
  },
});
