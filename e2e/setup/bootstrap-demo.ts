// Bootstrap the shared E2E test accounts.
//
// Provisions two users:
//   1. demo@studysprint.app          — the workhorse account for all
//      non-auth, non-settings scenarios. Reseeded with starter goals each
//      run so scenarios that assume baseline state are deterministic.
//   2. demo-settings@studysprint.app — used only by `settings.feature`,
//      which mutates its own password (current → new). Isolating it from
//      the workhorse account prevents a race where another parallel worker
//      tries to log in as the workhorse while its password is temporarily
//      the "new" value. No starter data needed — the settings scenarios
//      never look at the dashboard's goal state.
//
// Usage: `deno task test:setup`
//
// Required env vars (loaded automatically from `.env` if present):
//   SUPABASE_URL         — same as VITE_SUPABASE_URL
//   SUPABASE_SECRET_KEY  — secret, never commit. Pull from the Supabase
//                          dashboard under Project Settings → API Keys
//                          (sb_secret_… prefix). Replaces the legacy
//                          service_role JWT.
//
// Idempotent — safe to re-run. Run this once on each new dev machine + as
// the first step in CI before invoking `deno task test`.

import "jsr:@std/dotenv/load";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL");
const SECRET_KEY = Deno.env.get("SUPABASE_SECRET_KEY");

const DEMO_EMAIL = Deno.env.get("E2E_DEMO_EMAIL") ?? "demo@studysprint.app";
const DEMO_PASSWORD = Deno.env.get("E2E_DEMO_PASSWORD") ?? "demo123";
const SETTINGS_EMAIL = Deno.env.get("E2E_SETTINGS_EMAIL") ?? "demo-settings@studysprint.app";
const SETTINGS_PASSWORD = Deno.env.get("E2E_SETTINGS_PASSWORD") ?? "demo123";

if (!SUPABASE_URL || !SECRET_KEY) {
  console.error(
    "bootstrap-demo: SUPABASE_URL and SUPABASE_SECRET_KEY must be set.\n" +
      "Pull them from the Supabase dashboard (Project Settings → API Keys).",
  );
  Deno.exit(1);
}

const admin = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Page through admin.listUsers (default page size is 50) looking for the demo
// email. listUsers doesn't have a server-side filter; we have to enumerate.
async function findUserByEmail(client: SupabaseClient, email: string) {
  const target = email.toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

// Create-or-update the user and reset its password to a known value.
// Returns the user's UUID so callers can clean up dependent rows.
async function ensureUser(email: string, password: string): Promise<string> {
  const existing = await findUserByEmail(admin, email);

  if (existing) {
    console.log(`bootstrap-demo: ${email} exists (${existing.id}); resetting password`);
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) {
      console.error(`bootstrap-demo: updateUserById(${email}) failed:`, error.message);
      Deno.exit(1);
    }
    return existing.id;
  }

  console.log(`bootstrap-demo: ${email} does not exist; creating`);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    console.error(`bootstrap-demo: createUser(${email}) failed:`, error?.message);
    Deno.exit(1);
  }
  return data.user.id;
}

// Wipe prior test residue (goals/sessions cascade, google tokens, room
// memberships, rooms the user created). Cheaper to do via service-role here
// than to call reset_account, which is SECURITY DEFINER + scoped to auth.uid()
// and so unreachable from this script.
async function wipeUserData(userId: string) {
  for (const table of ["study_goals", "user_google_tokens", "room_members"]) {
    const { error } = await admin.from(table).delete().eq("user_id", userId);
    if (error) {
      console.error(`bootstrap-demo: delete from ${table} failed:`, error.message);
      Deno.exit(1);
    }
  }
  const { error: roomErr } = await admin.from("study_rooms").delete().eq("created_by", userId);
  if (roomErr) {
    console.error("bootstrap-demo: delete from study_rooms failed:", roomErr.message);
    Deno.exit(1);
  }
}

async function seedStarterGoals(userId: string) {
  const { error } = await admin.rpc("create_starter_data_for", { p_user_id: userId });
  if (error) {
    // Service-role doesn't carry an auth.uid(), and create_starter_data_for
    // doesn't strictly need one (it takes p_user_id). The REVOKE FROM
    // anon, authenticated still permits postgres + service_role to call it.
    console.warn(
      `bootstrap-demo: create_starter_data_for failed (${error.message}); ` +
        "skipping starter goals — scenarios that assume them will need to be " +
        "updated.",
    );
  }
}

async function main() {
  // ── Workhorse demo user ──────────────────────────────────────────────────
  console.log(`bootstrap-demo: target user is ${DEMO_EMAIL}`);
  const demoId = await ensureUser(DEMO_EMAIL, DEMO_PASSWORD);
  await wipeUserData(demoId);
  await seedStarterGoals(demoId);
  console.log(`bootstrap-demo: ready. user_id=${demoId} email=${DEMO_EMAIL}`);

  // ── Settings-only user ───────────────────────────────────────────────────
  // No starter data — settings.feature never inspects dashboard state.
  console.log(`bootstrap-demo: target user is ${SETTINGS_EMAIL}`);
  const settingsId = await ensureUser(SETTINGS_EMAIL, SETTINGS_PASSWORD);
  await wipeUserData(settingsId);
  console.log(`bootstrap-demo: ready. user_id=${settingsId} email=${SETTINGS_EMAIL}`);
}

main().catch((err) => {
  console.error("bootstrap-demo: fatal:", err);
  Deno.exit(1);
});
