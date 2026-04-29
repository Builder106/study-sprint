import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";
import { dwellForDemo } from "./hooks";

const { When, Then } = createBdd();

When("I navigate to the community page", async ({ page }) => {
  await page.goto("/community");
  await page.waitForLoadState("networkidle");
  await dwellForDemo(page);
});

// Community modals are custom fixed-overlay divs with no role="dialog".
// Locate by the heading text they always render.
Then("the create room modal should appear", async ({ page }) => {
  await expect(page.getByText("New study room")).toBeVisible({ timeout: 5_000 });
  await dwellForDemo(page);
});

When(
  "I enter the room name {string}",
  async ({ page }, name: string) => {
    await page.getByPlaceholder("Finals week sprint").fill(name);
  },
);

When("I submit the create room form", async ({ page }) => {
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("New study room")).not.toBeVisible({ timeout: 8_000 });
  await dwellForDemo(page);
});

Then(
  "I should see {string} in the rooms list",
  async ({ page }, name: string) => {
    await expect(page.getByText(name)).toBeVisible({ timeout: 8_000 });
    await dwellForDemo(page, 2_500);
  },
);
