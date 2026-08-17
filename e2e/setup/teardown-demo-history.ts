// Removes the synthetic public profiles + study room created by
// seed-demo-history.ts from the live Supabase project. Run this only after
// you're done recording — the leaderboard and study room need to be
// populated while filming.
//
// Enumerates strictly by the @demo.studysprint.invalid email marker (never
// a hardcoded id list), so it's safe to re-run and won't touch any other
// account.
//
// The demo account's own goals/sessions are left alone — those are reset by
// `deno task test:setup` and re-seeded by `deno task seed:demo`. Its profile
// visibility is not: seeding flips demo@studysprint.app to is_public so it
// appears on the live weekly leaderboard, and leaving it public after
// recording parks a signed-in-able account with a committed password on a
// public board. That flag gets reverted here.
//
// Usage: `deno task seed:demo:teardown`

import 'jsr:@std/dotenv/load';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL');
const SECRET_KEY = Deno.env.get('SUPABASE_SECRET_KEY');
const SOCIAL_DOMAIN = 'demo.studysprint.invalid';
const ROOM_SLUG = 'ss-demo-study-squad';
const DEMO_EMAIL = Deno.env.get('E2E_DEMO_EMAIL') ?? 'demo@studysprint.app';

if (!SUPABASE_URL || !SECRET_KEY) {
  console.error('teardown-demo-history: SUPABASE_URL and SUPABASE_SECRET_KEY must be set.');
  Deno.exit(1);
}

const admin = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// One pass over the user list picks up both the synthetic fixtures and the
// demo account, rather than paginating the whole project twice.
async function findUsers() {
  const synthetic: { id: string; email: string }[] = [];
  let demoUserId: string | null = null;
  const demoTarget = DEMO_EMAIL.toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) {
      const email = u.email?.toLowerCase();
      if (email?.endsWith(`@${SOCIAL_DOMAIN}`)) synthetic.push({ id: u.id, email: u.email! });
      else if (email === demoTarget) demoUserId = u.id;
    }
    if (data.users.length < 200) break;
    page += 1;
  }
  return { synthetic, demoUserId };
}

async function main() {
  const { synthetic: users, demoUserId } = await findUsers();
  console.log(
    `teardown-demo-history: found ${users.length} synthetic user(s) at @${SOCIAL_DOMAIN}`,
  );

  const { error: roomErr } = await admin.from('study_rooms').delete().eq('slug', ROOM_SLUG);
  if (roomErr) console.warn(`teardown-demo-history: study_rooms delete failed: ${roomErr.message}`);
  else {console.log(
      `teardown-demo-history: deleted study room "${ROOM_SLUG}" (room_members cascades)`,
    );}

  for (const u of users) {
    // study_goals cascade -> study_sessions, goal_subjects. profiles cascade
    // from auth.users on user deletion. room_members already gone with the
    // room above, but delete defensively in case membership in some other
    // room was ever added by hand.
    const { error: goalsErr } = await admin.from('study_goals').delete().eq('user_id', u.id);
    if (goalsErr) {
      console.warn(
        `teardown-demo-history: study_goals delete(${u.email}) failed: ${goalsErr.message}`,
      );
    }
    const { error: membersErr } = await admin.from('room_members').delete().eq('user_id', u.id);
    if (membersErr) {
      console.warn(
        `teardown-demo-history: room_members delete(${u.email}) failed: ${membersErr.message}`,
      );
    }

    const { error: userErr } = await admin.auth.admin.deleteUser(u.id);
    if (userErr) {
      console.error(`teardown-demo-history: deleteUser(${u.email}) failed: ${userErr.message}`);
      continue;
    }
    console.log(`teardown-demo-history: removed ${u.email}`);
  }

  // Take the demo account back off the public leaderboard. Its goals and
  // sessions stay put; only the visibility flag seeding set is reverted.
  if (demoUserId) {
    const { error: visErr } = await admin
      .from('profiles')
      .update({ is_public: false })
      .eq('id', demoUserId);
    if (visErr) {
      console.warn(`teardown-demo-history: un-publishing ${DEMO_EMAIL} failed: ${visErr.message}`);
    } else console.log(`teardown-demo-history: ${DEMO_EMAIL} is_public -> false`);
  } else {
    console.warn(`teardown-demo-history: ${DEMO_EMAIL} not found — left as-is.`);
  }

  console.log('teardown-demo-history: done.');
}

main().catch((err) => {
  console.error('teardown-demo-history: fatal:', err);
  Deno.exit(1);
});
