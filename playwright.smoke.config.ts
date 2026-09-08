import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: '.',
  testMatch: 'e2e/smoke.spec.ts',
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: {
    command: 'node_modules/.bin/vite --host 127.0.0.1 --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'local-smoke-publishable-key',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
  ],
});
