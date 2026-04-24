import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { When, Then } = createBdd();

When("I navigate to the garden page", async ({ page }) => {
  await page.goto("/garden");
  await page.waitForLoadState("networkidle");
});

Then("I should see the XP progress bar", async ({ page }) => {
  // The XP bar is a div with bg-[#ccff00] inside a progress track.
  await expect(page.locator(".bg-\\[\\#ccff00\\]").first()).toBeVisible({
    timeout: 8_000,
  });
});

Then("I should see the current level displayed", async ({ page }) => {
  await expect(page.getByText("Level")).toBeVisible({ timeout: 8_000 });
});

Then("I should see the achievements section", async ({ page }) => {
  await expect(page.getByText(/Achievements/)).toBeVisible({ timeout: 8_000 });
});
