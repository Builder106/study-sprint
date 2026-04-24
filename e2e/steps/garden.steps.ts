import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { When, Then } = createBdd();

When("I navigate to the garden page", async ({ page }) => {
  await page.goto("/garden");
  await page.waitForLoadState("networkidle");
});

Then("I should see the XP progress bar", async ({ page }) => {
  // The progress track always renders; the fill may be zero-width for a new account.
  // Check for the "X / Y XP" fraction text which is always present.
  await expect(page.getByText(/\d+ \/ \d+ XP/)).toBeVisible({ timeout: 8_000 });
});

Then("I should see the current level displayed", async ({ page }) => {
  await expect(page.getByText("Level")).toBeVisible({ timeout: 8_000 });
});

Then("I should see the achievements section", async ({ page }) => {
  await expect(page.getByText(/Achievements/)).toBeVisible({ timeout: 8_000 });
});
