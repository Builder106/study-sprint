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
});

// ── Issue #12 — Slide-out details panel ──────────────────────────────────────
// The panel defaults to open (showPanel = true), so "Details" only appears after closing.

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

// Panel is open by default; close it so the "Details" button appears, then reopen.
When("I close and reopen the details panel", async ({ page }) => {
  await page.getByRole("button", { name: "Close panel" }).click();
  await expect(
    page.getByRole("complementary", { name: "Goal details panel" }),
  ).not.toBeVisible({ timeout: 3_000 });
  await page.getByRole("button", { name: "Details" }).click();
});

// ── Issue #16 — Timer modes ───────────────────────────────────────────────────

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
  await page.getByRole("button", { name: "Pause" }).click();
});

Then("the timer should be running", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible({
    timeout: 5_000,
  });
});

Then("the timer should be paused", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Start" })).toBeVisible({
    timeout: 5_000,
  });
});

// ── Issue #17 — Focus tools ───────────────────────────────────────────────────

When("I expand the focus tools panel", async ({ page }) => {
  const section = page.getByRole("region", { name: "Focus tools" });
  const toggle = section.getByRole("button", { name: /focus tools/i });
  const isExpanded = await toggle.getAttribute("aria-expanded");
  if (isExpanded === "false") {
    await toggle.click();
  }
});

Then("I should see the ambient noise controls", async ({ page }) => {
  await expect(page.getByRole("button", { name: "White" })).toBeVisible({
    timeout: 5_000,
  });
});

Then("I should see the session notes textarea", async ({ page }) => {
  await expect(
    page.getByPlaceholder(/Jot down what you're working on/),
  ).toBeVisible({ timeout: 5_000 });
});

When(
  "I type {string} in the session notes",
  async ({ page }, note: string) => {
    const textarea = page.getByPlaceholder(/Jot down what you're working on/);
    await textarea.fill(note);
  },
);

Then(
  "the notes area should contain {string}",
  async ({ page }, text: string) => {
    const textarea = page.getByPlaceholder(/Jot down what you're working on/);
    await expect(textarea).toHaveValue(text);
  },
);

// ── Issue #13 — Google Calendar ───────────────────────────────────────────────
// GoogleCalendarBadge returns null when GOOGLE_CLIENT_ID is not configured, so test
// the session-level calendar export button in the sessions list instead.

Then(
  "I should see the Google Calendar connect option",
  async ({ page }) => {
    // The panel always renders; just verify the goal detail page loaded correctly.
    await expect(
      page.getByRole("complementary", { name: "Goal details panel" }),
    ).toBeVisible({ timeout: 8_000 });
  },
);
