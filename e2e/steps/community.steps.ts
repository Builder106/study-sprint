import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { When, Then } = createBdd();

When("I navigate to the community page", async ({ page }) => {
  await page.goto("/community");
  await page.waitForLoadState("networkidle");
});

Then(
  "I should see the {string} section",
  async ({ page }, heading: string) => {
    await expect(
      page.getByRole("heading", { name: heading }),
    ).toBeVisible({ timeout: 8_000 });
  },
);

Then("I should see the {string} button", async ({ page }, label: string) => {
  await expect(
    page.getByRole("button", { name: label }),
  ).toBeVisible({ timeout: 8_000 });
});

Then("the create room modal should appear", async ({ page }) => {
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
  await expect(
    page.getByRole("dialog").getByText("New study room"),
  ).toBeVisible();
});

When(
  "I enter the room name {string}",
  async ({ page }, name: string) => {
    await page
      .getByRole("dialog")
      .getByPlaceholder("Finals week sprint")
      .fill(name);
  },
);

When("I submit the create room form", async ({ page }) => {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 8_000 });
});

Then(
  "I should see {string} in the rooms list",
  async ({ page }, name: string) => {
    await expect(page.getByText(name)).toBeVisible({ timeout: 8_000 });
  },
);
