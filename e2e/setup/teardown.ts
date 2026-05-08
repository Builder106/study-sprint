// Playwright globalTeardown — wipes the demo_signup_<ts>@... auth.users
// rows that the registration scenario leaves behind.
//
// The running test suite uses the publishable key and can't delete its own
// auth.users rows; cleanup needs service-role access. This runs after every
// suite invocation. Best-effort: if SUPABASE_SECRET_KEY isn't set (e.g. CI
// running on a fork that doesn't have the secret), we log and exit cleanly
// instead of failing the build.

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// Mirror playwright.config.ts's .env loader so this works whether the user
// exports vars or relies on .env. Existing process.env wins. fileURLToPath
// handles project paths that contain spaces / parens.
const envPath = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SIGNUP_PREFIX = process.env.E2E_SIGNUP_PREFIX ?? "demo_signup_";

export default async function teardown() {
  if (!SUPABASE_URL || !SECRET_KEY) {
    console.warn(
      "[teardown] SUPABASE_SECRET_KEY not set; skipping demo_signup_* cleanup. " +
        "Sweep manually with: delete from auth.users where email like 'demo_signup_%@studysprint.app';",
    );
    return;
  }

  const admin = createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // listUsers paginates and has no server-side email filter; enumerate.
  let page = 1;
  let deleted = 0;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.warn(`[teardown] listUsers failed on page ${page}: ${error.message}`);
      return;
    }
    for (const user of data.users) {
      if (!user.email?.startsWith(SIGNUP_PREFIX)) continue;
      const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
      if (delErr) {
        console.warn(`[teardown] deleteUser ${user.email} failed: ${delErr.message}`);
        continue;
      }
      deleted += 1;
    }
    if (data.users.length < 200) break;
    page += 1;
  }

  if (deleted > 0) {
    console.log(`[teardown] deleted ${deleted} demo_signup_* user(s)`);
  }
}
