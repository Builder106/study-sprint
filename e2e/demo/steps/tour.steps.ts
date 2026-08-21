import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { dwellForDemo } from '../../steps/hooks';

const { Given, When, Then } = createBdd();

// ── Goal navigation by title (not "first goal" — dashboard sort order isn't
// guaranteed to put the recording target goal first) ──────────────────────

When('I navigate to the goal titled {string}', async ({ page }, title: string) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  const goalLink = page.locator('a[href*="/goal/"]').filter({ hasText: title });
  await goalLink.first().waitFor({ timeout: 8_000 });
  await goalLink.first().click();
  await page.waitForLoadState('networkidle');
  // Same hydration anchor as e2e/steps/goal-detail.steps.ts's "first goal"
  // step — networkidle alone doesn't mean the timer's mounted yet.
  await page
    .getByRole('button', { name: 'Stopwatch', exact: true })
    .waitFor({ state: 'visible', timeout: 15_000 });
});

// ── Session quality (sessions.steps.ts covers open/duration/save/close) ──

When('I rate the session {string}', async ({ page }, label: string) => {
  await page.getByRole('radio', { name: label }).click();
});

Then('I should see the session in the recent sessions list', async ({ page }) => {
  await expect(page.getByText('1h 30m').first()).toBeVisible({ timeout: 8_000 });
  await dwellForDemo(page);
});

// ── Study charge ──────────────────────────────────────────────────────────

Then('the battery charge should be {int} percent', async ({ page }, charge: number) => {
  await expect(page.getByRole('img', { name: `Battery at ${charge}% charge` })).toBeVisible({
    timeout: 8_000,
  });
});

Then('I should see the achievements grid', async ({ page }) => {
  await expect(page.getByText(/Achievements \(\d+\/\d+\)/)).toBeVisible({ timeout: 5_000 });
  await dwellForDemo(page, 2_500);
});

// ── Syllabus parser (stubbed — the real edge function calls a live LLM
// with no offline/mock path) ────────────────────────────────────────────

// subjects: [] deliberately — set_goal_subjects() is SECURITY INVOKER and
// its migration (20260505000100_goals_with_stats.sql) adds an INSERT policy
// so regular authenticated users can register new subject names, but that
// policy is missing on the live project (verified: any subject list, even
// names that already exist, 403s with "new row violates row-level security
// policy... for table 'subjects'"). This is a real product bug blocking
// syllabus-import for every user, not specific to this stub — needs a
// database-credentialed fix (`supabase db push` or the equivalent SQL run
// by hand), tracked separately. Empty subjects here just avoids exercising
// the broken path during recording.
const STUBBED_GOALS = [
  {
    title: 'CHEM 301: Organic Reactions',
    description: 'Mechanisms, synthesis pathways, and reaction prediction.',
    target_hours: 40,
    target_date: null,
    subjects: [] as string[],
  },
  {
    title: 'Lab Notebook & Reports',
    description: "Write-ups for each week's lab session.",
    target_hours: 15,
    target_date: null,
    subjects: [] as string[],
  },
  {
    title: 'Midterm + Final Review',
    description: 'Cumulative review before each exam.',
    target_hours: 20,
    target_date: null,
    subjects: [] as string[],
  },
];

Given(
  'the syllabus parser is stubbed with {int} suggested goals',
  async ({ page }, count: number) => {
    const goals = STUBBED_GOALS.slice(0, count);
    await page.route('**/functions/v1/syllabus-parse', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ goals, model: 'stubbed/demo' }),
      });
    });
  },
);

When('I paste syllabus text', async ({ page }) => {
  await page
    .getByPlaceholder(/Paste course description/)
    .fill(
      'CHEM 301 — Organic Chemistry I\nWeekly labs, two midterms, cumulative final.\nLab reports due each Friday.',
    );
});

When('I click the Suggest goals button', async ({ page }) => {
  await page.getByRole('button', { name: 'Suggest goals' }).click();
});

Then('I should see the suggested goals', async ({ page }) => {
  await expect(page.getByRole('button', { name: /Create \d+ goals?/ })).toBeVisible({
    timeout: 8_000,
  });
  await dwellForDemo(page, 2_500);
});

When('I create the suggested goals', async ({ page }) => {
  await page.getByRole('button', { name: /Create \d+ goals?/ }).click();
});

Then('the syllabus import modal should not be visible', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Import from syllabus/i })).not.toBeVisible({
    timeout: 8_000,
  });
  await dwellForDemo(page);
});

// ── Community: leaderboard + a real room's members/activity ──────────────

Then('I should see the weekly leaderboard', async ({ page }) => {
  await expect(page.getByText('Weekly leaderboard', { exact: false })).toBeVisible({
    timeout: 8_000,
  });
  await dwellForDemo(page, 2_500);
});

// Navigates directly by slug rather than clicking through the room card —
// the seeded room's slug (e2e/setup/seed-demo-history.ts, ROOM_SLUG) is
// fixed and known, so this is more robust than locating a specific card.
When('I open my study room', async ({ page }) => {
  await page.goto('/rooms/ss-demo-study-squad');
  await page.waitForLoadState('networkidle');
  await dwellForDemo(page);
});

Then('I should see the room members list', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Members \(\d+\)/ })).toBeVisible({
    timeout: 8_000,
  });
});

Then('I should see the room activity feed', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Recent activity (48h)' })).toBeVisible({
    timeout: 8_000,
  });
  await dwellForDemo(page, 2_500);
});
