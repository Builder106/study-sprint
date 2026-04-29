import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { When, Then } = createBdd();

// Filter buttons render with a count badge: e.g. "Active 3". Use a regex to match
// the status name at the start so the count doesn't break the lookup.
When(
  "I click the {string} filter button",
  async ({ page }, status: string) => {
    const toolbar = page.getByRole("group", { name: "Filter by status" });
    await toolbar.getByRole("button", { name: new RegExp(`^${status}`) }).click();
  },
);

// Sort is a Radix Select (custom UI). Click the trigger, then the option.
When(
  "I click the {string} sort option",
  async ({ page }, option: string) => {
    await page.getByRole("combobox", { name: "Sort" }).click();
    await page.getByRole("option", { name: option }).click();
  },
);

Then(
  "I should only see goals with {string} status badges",
  async ({ page }, status: string) => {
    await page.waitForTimeout(500);
    const goalLinks = page.locator('a[href*="/goal/"]');
    const count = await goalLinks.count();
    if (count > 0) {
      // Every visible goal row must contain the expected status badge text.
      const nonMatching = goalLinks.filter({
        hasNot: page.getByText(status, { exact: true }),
      });
      await expect(nonMatching).toHaveCount(0);
    }
  },
);

Then("the goals list should be displayed", async ({ page }) => {
  await expect(page.locator("main")).toBeVisible();
});
