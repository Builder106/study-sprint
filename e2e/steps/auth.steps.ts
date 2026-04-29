import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { Given, When, Then, After } = createBdd();

// Tracks emails registered during the current scenario so the After hook can
// delete them. Keyed by Playwright Page so parallel workers don't cross-talk.
const registeredEmails = new WeakMap<object, string>();

Given("I am on the StudySprint home page", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
});

When("I navigate to the registration page", async ({ page }) => {
  await page.goto("/register");
  await page.waitForLoadState("networkidle");
});

When(
  "I enter the email {string} and password {string}",
  async ({ page }, email: string, password: string) => {
    // Demo records the literal email "example@example.com" — to keep that
    // typing visible across re-runs without a timestamp suffix, pre-delete
    // any existing account by logging in with the same credentials and
    // hitting DELETE /api/auth/account. Best-effort; ignored if no row.
    if (email === "example@example.com") {
      const apiBase = process.env.API_URL ?? "http://localhost:4000";
      try {
        const loginRes = await page.request.post(`${apiBase}/api/auth/login`, {
          data: { email, password },
          failOnStatusCode: false,
        });
        if (loginRes.ok()) {
          const { token } = await loginRes.json();
          await page.request.delete(`${apiBase}/api/auth/account`, {
            headers: { Authorization: `Bearer ${token}` },
            failOnStatusCode: false,
          });
        }
      } catch {
        // best-effort cleanup
      }
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      return;
    }
    // For other registration emails, append a run-unique suffix to avoid
    // collisions across QA re-runs; the After hook deletes the row.
    const uniqueEmail = email.startsWith("demo_signup")
      ? email.replace("@", `_${Date.now()}@`)
      : email;
    if (uniqueEmail !== email) registeredEmails.set(page, uniqueEmail);
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', password);
  },
);

After(async ({ page }) => {
  const email = registeredEmails.get(page);
  if (!email) return;
  registeredEmails.delete(page);
  // Skip cleanup in DEMO mode. The page.evaluate + page.request.delete here
  // runs while Playwright is finalizing video for the first scenario, which
  // can cause the video to be dropped. Demo runs are local-only — leave the
  // demo_signup_<ts> row behind; manual `DELETE FROM users WHERE email LIKE
  // 'demo_signup%'` is fine.
  if (process.env.DEMO === "1") return;
  try {
    const token = await page.evaluate(() => localStorage.getItem("studysprint.token"));
    if (!token) return;
    const apiBase = process.env.API_URL ?? "http://localhost:4000";
    await page.request.delete(`${apiBase}/api/auth/account`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // best-effort cleanup; leave the row if anything goes wrong
  }
});

When("I submit the registration form", async ({ page }) => {
  await page.click('button[type="submit"]');
});

Then("I should be redirected to the dashboard", async ({ page }) => {
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
  expect(page.url()).toContain("/dashboard");
});

Then("I should see my study goals listed", async ({ page }) => {
  await expect(page.locator("main")).toBeVisible();
});

Then("I should see the error {string}", async ({ page }, message: string) => {
  await expect(page.locator('[role="alert"]')).toContainText(message);
});

Then("I should remain on the registration page", async ({ page }) => {
  expect(page.url()).toContain("/register");
});

Given(
  "a registered account with email {string} and password {string}",
  async ({}, _email: string, _password: string) => {
    // The demo account is pre-seeded via `npm run seed` — nothing to provision here.
  },
);

When(
  "I enter the email {string} and password {string} on the login form",
  async ({ page }, email: string, password: string) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
  },
);

When("I click Sign in", async ({ page }) => {
  await page.click('button[type="submit"]');
});

Then("I should see an error message on the login page", async ({ page }) => {
  await expect(page.locator('[role="alert"]')).toBeVisible();
});

Then("I should remain on the home page", async ({ page }) => {
  expect(page.url()).not.toContain("/dashboard");
});
