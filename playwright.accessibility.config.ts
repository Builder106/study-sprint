import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:5173';

const reporter = process.env.CI
  ? [['list'] as const, ['json', { outputFile: 'audit-output/accessibility.json' }] as const]
  : [['list'] as const, ['html', { outputFolder: 'audit-output/accessibility-report', open: 'never' }] as const];

export default defineConfig({
  testDir: './e2e',
  testMatch: /accessibility\.spec\.ts/,
  outputDir: 'test-results/accessibility-tests',
  fullyParallel: true,
  workers: Number(process.env.PLAYWRIGHT_A11Y_WORKERS ?? 1),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 8_000 },
  reporter,
  use: {
    baseURL,
    headless: true,
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'deno task dev',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 30_000,
        env: {
          VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
          VITE_SUPABASE_PUBLISHABLE_KEY: 'local-a11y-publishable-key',
        },
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
