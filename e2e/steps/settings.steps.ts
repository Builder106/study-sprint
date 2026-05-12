import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";
import { supabaseUrl } from "./supabase";

const { When, Then } = createBdd();

When("I navigate to the settings page", async ({ page }) => {
  await page.goto("/settings");
  await page.waitForLoadState("networkidle");
  // The page is gated on AuthProvider hydration — anchor on the heading so
  // assertions don't race the React mount.
  await expect(page.getByRole("heading", { name: "Settings." })).toBeVisible();
});

When(
  "I enter the current password {string}, new password {string}, and confirmation {string}",
  async ({ page }, current: string, next: string, confirm: string) => {
    await page.locator("#current-password").fill(current);
    await page.locator("#new-password").fill(next);
    await page.locator("#confirm-password").fill(confirm);
  },
);

When("I submit the password change form", async ({ page }) => {
  await page.getByRole("button", { name: /update password/i }).click();
});

Then("I should see the toast {string}", async ({ page }, message: string) => {
  // sonner renders toasts inside a region with role="status" (assertive
  // updates use role="alert" for errors but the success path uses status).
  // Use a generous timeout — the toast appears after the Supabase round-trip.
  await expect(page.getByText(message, { exact: true })).toBeVisible({
    timeout: 8_000,
  });
});

Then("I should remain on the settings page", async ({ page }) => {
  expect(page.url()).toContain("/settings");
});

// Restore the settings-only user's password via the admin API so subsequent
// scenarios in this file (and re-runs) can still log in. The toggle "Require
// current password when updating" doesn't apply to admin operations — this
// bypasses it intentionally for teardown. Idempotent.
Then(
  "my password is restored to {string} via admin",
  async ({}, password: string) => {
    const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? supabaseUrl();
    const secret = process.env.SUPABASE_SECRET_KEY;
    const email = "demo-settings@studysprint.app";
    if (!secret) {
      throw new Error(
        "settings.steps: SUPABASE_SECRET_KEY is required to reset the demo " +
          "password after a successful password-change scenario. Set it in " +
          ".env or skip this scenario.",
      );
    }

    const headers = { apikey: secret, Authorization: `Bearer ${secret}` };

    // Find the user id (admin /users has no email filter — paginate).
    let userId: string | null = null;
    for (let p = 1; p < 20 && !userId; p++) {
      const list = await fetch(`${url}/auth/v1/admin/users?page=${p}&per_page=200`, {
        headers,
      });
      if (!list.ok) {
        throw new Error(`admin listUsers page=${p} ${list.status}: ${await list.text()}`);
      }
      const data = (await list.json()) as {
        users?: Array<{ id: string; email?: string | null }>;
      };
      const hit = data.users?.find((u) => u.email?.toLowerCase() === email);
      if (hit) userId = hit.id;
      if (!data.users || data.users.length < 200) break;
    }
    if (!userId) throw new Error(`admin listUsers: user ${email} not found`);

    const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      throw new Error(`admin updateUser ${res.status}: ${await res.text()}`);
    }
  },
);
