// Idempotent demo seed for the Community page video.
// Talks to the HTTP API — works against localhost or the deployed Render URL.
//
//   API_URL=https://study-sprint-api.onrender.com \
//   DEMO_PASSWORD=demo1234 \
//   node scripts/seed-demo.js
//
// Re-runs are safe: existing users are reused (login), the per-user "Demo focus"
// goal is reused, and any session whose notes contain [demo-seed] is wiped before
// re-logging this week's minutes. Rooms with matching names are reused; new ones
// are created if absent. Members re-join idempotently.

import process from "node:process";

const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const PASSWORD = process.env.DEMO_PASSWORD ?? "demo1234";
const NOTE_MARKER = "[demo-seed]";

const NAMED = [
  {
    email: "yinka@example.com",
    username: "yinka",
    display: "Yinka Vaughan",
    bio: "Econ + CS '26 @ Wesleyan. Capstone + thesis + sleep, pick two.",
    weekly: 705,
  },
  {
    email: "maya@example.com",
    username: "maya",
    display: "Maya Okafor",
    bio: "Bio @ Wesleyan. Premed grind, MCAT in August.",
    weekly: 1110,
  },
  {
    email: "priya@example.com",
    username: "priya",
    display: "Priya Iyer",
    bio: "Math + Econ. Pset addict, will not survive without coffee.",
    weekly: 855,
  },
  {
    email: "jordan@example.com",
    username: "jordan",
    display: "Jordan Goldstein",
    bio: "Gov major. Senior thesis on labor markets.",
    weekly: 560,
  },
  {
    email: "sam@example.com",
    username: "sam",
    display: "Sam Reyes",
    bio: "Music + CS. Building demos and playing guitar.",
    weekly: 470,
  },
  {
    email: "liam@example.com",
    username: "liam",
    display: "Liam Park",
    bio: "Phil + Stats. Reading too much Heidegger.",
    weekly: 330,
  },
];

// Anonymous fillers exist only to inflate room member counts.
const FILLERS = Array.from({ length: 5 }, (_, i) => ({
  email: `filler${i + 1}@example.com`,
  weekly: 0,
}));

const ROOMS = [
  {
    name: "Senior thesis writing room",
    description: "Quiet hours, weekdays 9–noon. Bring your draft and shut up.",
    passcode: null,
    members: ["yinka", "maya", "priya", "jordan", "sam", "liam", "filler1", "filler2"], // 8
  },
  {
    name: "Econometrics pset crew",
    description: "Pset 6 due Friday. Stata + R only, no spreadsheets.",
    passcode: "econ301",
    members: ["yinka", "priya", "jordan", "filler1", "filler2"], // 5
  },
  {
    name: "Algorithms finals sprint",
    description: "Dynamic programming + graphs. Two weeks until the final.",
    passcode: null,
    members: [
      "yinka", "maya", "priya", "jordan", "sam", "liam",
      "filler1", "filler2", "filler3", "filler4", "filler5",
    ], // 11
  },
];

async function api(token, path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : null;
  if (!res.ok) {
    const err = new Error(
      `${opts.method || "GET"} ${path} → ${res.status} ${data?.error || ""}`.trim(),
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function loginOrRegister(email) {
  try {
    const r = await api(null, "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    return { token: r.token, userId: r.user.id, created: false };
  } catch (e) {
    if (e.status !== 401) throw e;
    const r = await api(null, "/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    return { token: r.token, userId: r.user.id, created: true };
  }
}

async function setProfile(token, { username, display, bio, isPublic }) {
  return api(token, "/api/profiles/me", {
    method: "PUT",
    body: JSON.stringify({
      username,
      display_name: display,
      bio,
      is_public: isPublic,
    }),
  });
}

async function ensureGoal(token) {
  const { goals } = await api(token, "/api/goals");
  const existing = goals.find((g) => g.title === "Demo focus");
  if (existing) return existing.id;
  const r = await api(token, "/api/goals", {
    method: "POST",
    body: JSON.stringify({
      title: "Demo focus",
      target_hours: 60,
      status: "active",
      subjects: [],
    }),
  });
  return r.goal.id;
}

async function clearDemoSessions(token, goalId) {
  const { sessions } = await api(token, `/api/goals/${goalId}/sessions`);
  for (const s of sessions) {
    if ((s.notes || "").includes(NOTE_MARKER)) {
      await api(token, `/api/sessions/${s.id}`, { method: "DELETE" });
    }
  }
}

async function logWeeklyMinutes(token, goalId, totalMinutes) {
  if (totalMinutes <= 0) return;
  // Spread across three sessions in the past week so the data looks realistic
  // and weekly_minutes (sum over last 7 days) lands on the target.
  const a = Math.round(totalMinutes * 0.4);
  const b = Math.round(totalMinutes * 0.35);
  const c = totalMinutes - a - b;
  const chunks = [a, b, c];
  const offsetsHours = [26, 74, 122]; // ~1, 3, 5 days ago — comfortably inside 7d window
  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i] <= 0) continue;
    const loggedAt = new Date(Date.now() - offsetsHours[i] * 60 * 60 * 1000).toISOString();
    await api(token, `/api/goals/${goalId}/sessions`, {
      method: "POST",
      body: JSON.stringify({
        duration_minutes: chunks[i],
        notes: `${NOTE_MARKER} demo session`,
        logged_at: loggedAt,
      }),
    });
  }
}

async function seedUser(spec, { isPublic }) {
  const { token, created } = await loginOrRegister(spec.email);
  if (spec.username) {
    try {
      await setProfile(token, {
        username: spec.username,
        display: spec.display,
        bio: spec.bio,
        isPublic,
      });
    } catch (e) {
      // Username may be claimed on a fresh DB by a prior user with a different
      // email — surface but continue, leaderboard slot just won't fill.
      console.warn(`  profile (${spec.email}): ${e.message}`);
    }
  }
  const goalId = await ensureGoal(token);
  await clearDemoSessions(token, goalId);
  await logWeeklyMinutes(token, goalId, spec.weekly ?? 0);
  return { token, created };
}

async function ensureRoom(ownerToken, room, tokensByKey) {
  const { rooms: ownerRooms } = await api(ownerToken, "/api/rooms");
  let slug = ownerRooms.find((r) => r.name === room.name)?.slug;
  if (!slug) {
    const r = await api(ownerToken, "/api/rooms", {
      method: "POST",
      body: JSON.stringify({
        name: room.name,
        description: room.description,
        passcode: room.passcode || undefined,
      }),
    });
    slug = r.slug;
  }
  for (const member of room.members) {
    if (member === "yinka") continue; // owner is already a member
    const token = tokensByKey[member];
    if (!token) {
      console.warn(`  no token for member "${member}"`);
      continue;
    }
    try {
      await api(token, `/api/rooms/${encodeURIComponent(slug)}/join`, {
        method: "POST",
        body: JSON.stringify({ passcode: room.passcode || undefined }),
      });
    } catch (e) {
      // 400/409 → already a member, that's fine
      if (e.status !== 400 && e.status !== 409) {
        console.warn(`  join ${member} → ${slug}: ${e.message}`);
      }
    }
  }
  return slug;
}

async function main() {
  console.log(`Seeding demo data → ${API_URL}`);

  const tokensByKey = {};
  console.log("Named users:");
  for (const spec of NAMED) {
    process.stdout.write(`  ${spec.email} ... `);
    const { token, created } = await seedUser(spec, { isPublic: true });
    tokensByKey[spec.username] = token;
    console.log(created ? "created" : "logged in");
  }

  console.log("Filler users:");
  for (const spec of FILLERS) {
    process.stdout.write(`  ${spec.email} ... `);
    const { token, created } = await seedUser(spec, { isPublic: false });
    tokensByKey[spec.email.split("@")[0]] = token;
    console.log(created ? "created" : "logged in");
  }

  const yinkaToken = tokensByKey.yinka;
  if (!yinkaToken) throw new Error("Yinka token missing — cannot create rooms.");

  console.log("Rooms:");
  for (const room of ROOMS) {
    const slug = await ensureRoom(yinkaToken, room, tokensByKey);
    console.log(`  ${room.name} → ${slug} (${room.members.length} members)`);
  }

  console.log(`\nDone. Login: yinka@example.com / ${PASSWORD}`);
}

main().catch((e) => {
  console.error("\nSEED FAILED:", e.message);
  if (e.data) console.error(e.data);
  process.exit(1);
});
