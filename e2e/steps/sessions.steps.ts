import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { When, Then } = createBdd();

// SessionModal is a custom fixed-overlay component with no role="dialog".
// Locate it by the heading text it always renders.
const modalHeading = (page: import("@playwright/test").Page) =>
  page.getByRole("heading", { name: /Log Study Session|Edit Session/ });

When("I open the log session modal", async ({ page }) => {
  await page.getByRole("button", { name: "Log session" }).click();
  await expect(modalHeading(page)).toBeVisible({ timeout: 5_000 });
});

When(
  "I set the session duration to {string}",
  async ({ page }, duration: string) => {
    await page.locator('input[type="number"]').first().fill(duration);
  },
);

When("I save the session", async ({ page }) => {
  await page.getByRole("button", { name: /Save session|Save changes/ }).click();
});

Then("the session modal should close", async ({ page }) => {
  await expect(modalHeading(page)).not.toBeVisible({ timeout: 8_000 });
});

Then("the recent sessions list should be visible", async ({ page }) => {
  await expect(page.getByText("Recent Sessions")).toBeVisible({
    timeout: 8_000,
  });
});

Then(
  "I should see the session duration error {string}",
  async ({ page }, message: string) => {
    await expect(page.locator('[role="alert"]')).toContainText(message, {
      timeout: 5_000,
    });
  },
);

Then("the session modal should remain open", async ({ page }) => {
  await expect(modalHeading(page)).toBeVisible();
});
