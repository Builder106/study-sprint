import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { When, Then } = createBdd();

When(
  "I click the {string} filter button",
  async ({ page }, status: string) => {
    await page.getByRole("button", { name: status, exact: true }).click();
  },
);

When(
  "I click the {string} sort option",
  async ({ page }, option: string) => {
    await page.getByRole("button", { name: option, exact: true }).click();
  },
);

Then(
  "I should only see goals with {string} status badges",
  async ({ page }, status: string) => {
    await page.waitForTimeout(500);
    const badges = page.locator("main").getByText(status);
    const count = await badges.count();
    // Either no goals exist for that filter, or every visible badge matches.
    if (count > 0) {
      const nonMatchingGoals = page
        .locator('a[href*="/goal/"]')
        .filter({ hasNot: page.getByText(status) });
      await expect(nonMatchingGoals).toHaveCount(0);
    }
  },
);

Then("the goals list should be displayed", async ({ page }) => {
  await expect(page.locator("main")).toBeVisible();
});
