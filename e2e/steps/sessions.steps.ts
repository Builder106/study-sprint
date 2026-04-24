import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { When, Then } = createBdd();

When("I open the log session modal", async ({ page }) => {
  await page.getByRole("button", { name: "Log session" }).click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
});

When(
  "I set the session duration to {string}",
  async ({ page }, duration: string) => {
    const input = page.getByRole("dialog").locator('input[type="number"]');
    await input.fill(duration);
  },
);

When("I save the session", async ({ page }) => {
  await page.getByRole("dialog").getByRole("button", { name: /save/i }).click();
});

Then("the session modal should close", async ({ page }) => {
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 8_000 });
});

Then("the recent sessions list should be visible", async ({ page }) => {
  await expect(page.getByText("Recent Sessions")).toBeVisible({
    timeout: 8_000,
  });
});

Then(
  "I should see the session duration error {string}",
  async ({ page }, message: string) => {
    await expect(
      page.getByRole("dialog").locator('[role="alert"]'),
    ).toContainText(message, { timeout: 5_000 });
  },
);

Then("the session modal should remain open", async ({ page }) => {
  await expect(page.getByRole("dialog")).toBeVisible();
});
