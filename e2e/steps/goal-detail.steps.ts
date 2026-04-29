import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { Given, When, Then } = createBdd();

// ── Navigation ────────────────────────────────────────────────────────────────

Given("I navigate to the first goal on the dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  const firstGoal = page.locator('a[href*="/goal/"]').first();
  await firstGoal.waitFor({ timeout: 8_000 });
  await firstGoal.click();
  await page.waitForLoadState("networkidle");
  // Wait for the goal detail UI to actually hydrate. Under 4-worker parallelism
  // the page can still be loading when subsequent steps fire — anchor on the
  // mode toggle ("Stopwatch") which is always rendered by TimerCard.
  await page
    .getByRole("button", { name: "Stopwatch", exact: true })
    .waitFor({ state: "visible", timeout: 15_000 });
});

// ── Slide-out details panel ──────────────────────────────────────────────────

When("I click the {string} button", async ({ page }, label: string) => {
  await page.getByRole("button", { name: label }).click();
});

Then("the goal details panel should be visible", async ({ page }) => {
  await expect(
    page.getByRole("complementary", { name: "Goal details panel" }),
  ).toBeVisible({ timeout: 5_000 });
});

Then(
  "I should see the {string} metadata in the panel",
  async ({ page }, label: string) => {
    const panel = page.getByRole("complementary", { name: "Goal details panel" });
    await expect(panel.getByText(label)).toBeVisible();
  },
);

// ── Timer modes ───────────────────────────────────────────────────────────────

When(
  "I click the {string} mode button on the timer",
  async ({ page }, mode: string) => {
    // Don't filter by pressed state — Stopwatch is the default (aria-pressed=true already).
    await page.getByRole("button", { name: mode }).click();
  },
);

Then(
  "the timer should show the {string} phase label",
  async ({ page }, phase: string) => {
    // Use exact: true to avoid matching "Focus tools" button text when phase is "Focus".
    await expect(page.getByText(phase, { exact: true })).toBeVisible({
      timeout: 5_000,
    });
  },
);

Then(
  "the timer display should show {string}",
  async ({ page }, time: string) => {
    await expect(page.getByText(time)).toBeVisible({ timeout: 5_000 });
  },
);

When("I click the Start button on the timer", async ({ page }) => {
  await page.getByRole("button", { name: "Start" }).click();
});

When("I click the Pause button on the timer", async ({ page }) => {
  // "Pause" alone collides with the "Pause goal" button in the side panel.
  await page.getByRole("button", { name: "Pause", exact: true }).click();
});

Then("the timer should be running", async ({ page }) => {
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible({ timeout: 5_000 });
});

Then("the timer should be paused", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible({
    timeout: 5_000,
  });
});
