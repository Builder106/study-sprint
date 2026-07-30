import "./e2e/setup/load-env";
import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

// Tier 2 "UI tour" recording config — produces the ~75s raw footage for
// ui-demo/. Separate from playwright.demo.config.ts (Tier 1's 4 README
// GIFs, pinned at 1440×900) so re-tuning the tour's larger canvas can't
// disturb the already-shipped GIFs. Same step libraries, same DEMO=1
// convention, same reporter (webm→mp4 conversion, 0-byte-video handling).
//
// Run via npm, not `deno task` — playwright-bdd's compiled CJS resolves
// `playwright` by walking the physical node_modules tree, and Deno's
// nodeModulesDir:auto hoisting currently resolves that to a mismatched
// version (see JOURNAL.md).
//
//   npm install --legacy-peer-deps --ignore-scripts
//
// --ignore-scripts matters: some transitive dependency's postinstall hook
// invokes `deno` directly, which reconciles node_modules its own way and
// rewrites node_modules/.bin/{bddgen,playwright} into a broken .deno/
// subtree (pinned to a stale, incompatible playwright version) — even
// though the install itself was run through plain npm. Browsers are
// already cached under ~/.cache/ms-playwright, so skipping postinstall
// doesn't lose anything needed here.
const testDir = defineBddConfig({
  features: ["e2e/demo/features/00-warmup.feature", "e2e/demo/features/10-tour.feature"],
  steps: ["e2e/steps/**/*.ts", "e2e/demo/steps/**/*.ts"],
  outputDir: ".features-gen-tour",
});

const slowMo = Number(process.env.DEMO_SLOWMO ?? 1200);
const VIEWPORT = { width: 2560, height: 1600 };

export default defineConfig({
  testDir,
  timeout: 180_000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["./e2e/reporter.ts"]],
  use: {
    // See playwright.config.ts for why 127.0.0.1 instead of localhost.
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:5173",
    headless: true,
    viewport: VIEWPORT,
    video: { mode: "on", size: VIEWPORT },
    launchOptions: { slowMo },
    // Pins the browser's Intl/Date timezone to UTC — must match the demo
    // account's seeded data (e2e/setup/seed-demo-history.ts is UTC-anchored)
    // and analytics_summary()'s SQL (hardcoded `AT TIME ZONE 'UTC'`).
    // frontend/lib/gamification.ts buckets streak days by the BROWSER's
    // local tz, so a mismatch here makes /garden and /analytics disagree
    // about the streak — confirmed by hand: an unpinned (non-UTC) browser
    // showed a completely different level/streak/XP than what was seeded.
    timezoneId: "UTC",
  },
  webServer: process.env.BASE_URL ? undefined : {
    // NOT "deno task dev" — `deno run -A npm:vite` reconciles node_modules
    // against deno.json on every invocation and deletes files npm's flat
    // install put there (confirmed: playwright/lib/worker/workerProcessEntry.js
    // vanished after the deno-launched dev server ran once). node_modules/.bin
    // is the npm-installed vite directly, no Deno involved.
    command: "node_modules/.bin/vite",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        // devices["Desktop Chrome"] silently overrides the top-level `use`
        // block — viewport and video must be re-pinned here too.
        ...devices["Desktop Chrome"],
        viewport: VIEWPORT,
        video: { mode: "on", size: VIEWPORT },
        timezoneId: "UTC",
      },
    },
  ],
});
