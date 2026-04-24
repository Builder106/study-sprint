import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { When, Then } = createBdd();

When("I navigate to the analytics page", async ({ page }) => {
  await page.goto("/analytics");
  await page.waitForLoadState("networkidle");
});

Then(
  "I should see the heading {string}",
  async ({ page }, heading: string) => {
    await expect(
      page.getByRole("heading", { name: heading }),
    ).toBeVisible({ timeout: 8_000 });
  },
);

Then("I should see the contribution heatmap", async ({ page }) => {
  await expect(
    page.locator('[aria-label="Daily study contribution heatmap"]'),
  ).toBeVisible({ timeout: 8_000 });
});

Then(
  "I should see the {string} stat card",
  async ({ page }, label: string) => {
    await expect(page.getByText(label)).toBeVisible({ timeout: 8_000 });
  },
);
