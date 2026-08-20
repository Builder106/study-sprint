// Seeds multi-week study history + social fixtures onto the demo account so
// Tier 2/3 recordings show a full battery, a long charge run, a textured
// heatmap, and a populated leaderboard. `create_starter_data_for`
// provides (that RPC seeds 2 goals and zero sessions, by design, so the QA
// suite's "first session" scenarios stay deterministic). Run this AFTER
// `deno task test:setup`, which must have already created the demo account.
//
// ── Coupled to the Tier 2 recording ──────────────────────────────────────
// e2e/demo/features/10-tour.feature logs a 90-minute, quality-5 ("Mastered")
// session during recording. This script seeds total XP to TARGET_XP_BEFORE_LOG
// so the recording has a realistic XP total. The 45-day history reaches full
// charge before recording and stays above empty throughout the tour.
//
// ── Timezone ──────────────────────────────────────────────────────────────
// All date math here is UTC. The recording VM's system tz is Etc/UTC, and
// playwright.tour.config.ts pins timezoneId: "UTC" to match, so the
// browser-side charge calculation and the server-side analytics calculation
// agree. Do not
// introduce a non-UTC tz on either side without re-deriving the generation
// windows below.
//
// ── Determinism ───────────────────────────────────────────────────────────
// Every run fully deletes and regenerates the demo account's goals/sessions
// and the synthetic social fixtures, using a fixed-seed PRNG, so two runs on
// the same calendar day (the dark + light recording passes) produce
// byte-identical session data. A run on a later calendar day shifts the
// whole 45-day charge window forward. That is expected because the current
// charge run always ends today.
//
// ── Production data ───────────────────────────────────────────────────────
// The social fixtures (~8 profiles + a study room) are real rows on the
// live Supabase project behind getstudysprint.vercel.app, so the leaderboard
// and study room read as populated. They're marked unambiguously
// (emails at @demo.studysprint.invalid — an IANA-reserved, non-resolving
// TLD per RFC 2606 — usernames prefixed ss_demo_) so
// deno task seed:demo:teardown can remove them precisely. Run teardown only
// when you're done recording — the fixtures need to be live while filming.
//
// Usage:
//   deno task seed:demo             — seed for real
//   deno task seed:demo -- --dry-run — compute + print the profile without
//                                      writing anything (use this to verify
//                                      acceptance criteria before touching
//                                      production data)

import 'jsr:@std/dotenv/load';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('VITE_SUPABASE_URL');
const SECRET_KEY = Deno.env.get('SUPABASE_SECRET_KEY');
const DEMO_EMAIL = Deno.env.get('E2E_DEMO_EMAIL') ?? 'demo@studysprint.app';
const DRY_RUN = Deno.args.includes('--dry-run');

if (!DRY_RUN && (!SUPABASE_URL || !SECRET_KEY)) {
  console.error(
    'seed-demo-history: SUPABASE_URL and SUPABASE_SECRET_KEY must be set.\n' +
      'Pull them from the Supabase dashboard (Project Settings → API Keys).',
  );
  Deno.exit(1);
}

// ============================================================================
// Tunables — see the prototype these were empirically converged against at
// /private/tmp/.../scratchpad/seed-prototype.mjs (Node, zero deps, iterate
// there before touching these — every constant below was tuned by running
// the exact same generation+scoring algorithm many times against real
// output, not derived analytically).
// ============================================================================

const SESSION_LOG_MINUTES = 90;
const SESSION_LOG_QUALITY = 5;
const TARGET_XP_BEFORE_LOG = 19_450;
const XP_TOLERANCE = 130;

const STREAK_DAYS = 45; // days 44..0 ago inclusive of today
const MID_START = STREAK_DAYS; // 45
const MID_END = 180;
const OLD_START = 181;
const OLD_END = 364;
const DAY_CAP_MIN = 240; // heatmap intensity is ratio-of-max — one outlier day washes the rest out

const MID_DENSITY = 0.18;
const OLD_DENSITY = 0.05;

const FILLER_MIN_DURATION = 15;
const FILLER_MAX_DURATION = 235; // just under the day cap; isolated day, no conflict
const FILLER_MAX_ITER = 30;

const SUBJECTS = ['Computer Science', 'Mathematics', 'Languages', 'Writing', 'Science'] as const;
type Subject = (typeof SUBJECTS)[number];
// Target shares ~35/25/18/12/10, in SUBJECTS order.
const SUBJECT_WEIGHTS = [0.35, 0.25, 0.18, 0.12, 0.1];

const PRNG_SEED = 1337;

// ============================================================================
// Deterministic PRNG + generation — mirrors frontend/lib/gamification.ts's
// computeGamificationProfile exactly (UTC date buckets). Any drift here from
// that file breaks the XP convergence silently.
// ============================================================================

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(PRNG_SEED);
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function weightedSubject(): Subject {
  const r = rand();
  let acc = 0;
  for (let i = 0; i < SUBJECTS.length; i++) {
    acc += SUBJECT_WEIGHTS[i];
    if (r < acc) return SUBJECTS[i];
  }
  return SUBJECTS[SUBJECTS.length - 1];
}

const MS_PER_DAY = 86_400_000;
const TODAY = new Date();
TODAY.setUTCHours(12, 0, 0, 0);
function daysAgo(n: number): Date {
  return new Date(TODAY.getTime() - n * MS_PER_DAY);
}
function dateKeyUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface GenSession {
  subject: Subject;
  duration_minutes: number;
  quality: number | null;
  logged_at: Date;
  dateKey: string;
  dayIndex: number; // days-ago at generation time, for goal routing
}

let sessions: GenSession[] = [];
const dayMinutes = new Map<string, number>();
const usedDayKeys = new Set<string>();

function addSession(
  dayIndex: number,
  subject: Subject,
  duration: number,
  quality: number | null,
  hourUTC: number,
): GenSession | null {
  const day = daysAgo(dayIndex);
  const key = dateKeyUTC(day);
  const used = dayMinutes.get(key) ?? 0;
  const capped = Math.min(duration, Math.max(0, DAY_CAP_MIN - used));
  if (capped <= 0) return null;
  dayMinutes.set(key, used + capped);
  usedDayKeys.add(key);
  const loggedAt = new Date(day);
  loggedAt.setUTCHours(hourUTC, randInt(0, 59), 0, 0);
  const s: GenSession = {
    subject,
    duration_minutes: capped,
    quality,
    logged_at: loggedAt,
    dateKey: key,
    dayIndex,
  };
  sessions.push(s);
  return s;
}

function generateShape() {
  // Phase 1: streak window — every day, exactly 1 session/day. Session COUNT
  // doesn't affect the heatmap, only per-day minutes do, so a second
  // same-day session is pure session-count cost with no visual benefit.
  let dawnDone = false;
  let nightDone = false;
  for (let i = STREAK_DAYS - 1; i >= 0; i--) {
    let hour = randInt(9, 22);
    if (!dawnDone && i === 33) {
      hour = randInt(5, 6); // dawn_patrol: before 07:00 UTC
      dawnDone = true;
    } else if (!nightDone && i === 21) {
      hour = randInt(0, 2); // night_owl: 00:00-03:00 UTC
      nightDone = true;
    }
    const duration = randInt(55, 170);
    const quality = pick([3, 3, 4, 4, 5, 5, 5]);
    addSession(i, weightedSubject(), duration, quality, hour);
  }

  // Phase 2: mid window (45-180 days ago) — sparser, longer sessions carry
  // XP without inflating session count.
  for (let i = MID_END; i >= MID_START; i--) {
    if (rand() < MID_DENSITY) {
      const duration = randInt(55, 175);
      const quality = pick([2, 3, 3, 4, null]);
      addSession(i, weightedSubject(), duration, quality, randInt(7, 23));
    }
  }

  // Phase 3: old window (181-364 days ago) — sparse.
  for (let i = OLD_END; i >= OLD_START; i--) {
    if (rand() < OLD_DENSITY) {
      const duration = randInt(45, 120);
      const quality = pick([null, null, 2, 3]);
      addSession(i, weightedSubject(), duration, quality, randInt(6, 23));
    }
  }
}

// ---- Profile computation, mirroring gamification.ts exactly (UTC) --------
function levelFromXp(xp: number): number {
  return Math.max(0, Math.floor(Math.sqrt(xp / 100)));
}
interface Profile {
  level: number;
  xp: number;
  current_charge_pct: number;
  days_since_empty: number;
  longest_days_since_empty: number;
  total_sessions: number;
  total_minutes: number;
  total_hours: number;
  mastered_count: number;
  subjects_used: number;
  max_session_day: number;
  has_dawn: boolean;
  has_night: boolean;
}

function computeProfile(list: GenSession[]): Profile {
  const dayMin = new Map<string, number>();
  for (const s of list) dayMin.set(s.dateKey, (dayMin.get(s.dateKey) ?? 0) + s.duration_minutes);

  const daily: { date: string; minutes: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const key = dateKeyUTC(daysAgo(i));
    daily.push({ date: key, minutes: dayMin.get(key) ?? 0 });
  }
  const chargeByDate = new Map<string, number>();
  let charge = 0;
  let currentRun = 0;
  let longestRun = 0;
  for (let i = 0; i < daily.length; i++) {
    if (i > 0) charge = Math.min(100, Math.max(0, charge - 8 + Math.min(daily[i].minutes / 120, 1) * 20));
    chargeByDate.set(daily[i].date, charge);
    currentRun = charge > 0 ? currentRun + 1 : 0;
    longestRun = Math.max(longestRun, currentRun);
  }

  let totalMinutes = 0;
  let masteredCount = 0;
  let totalXp = 0;
  const subjectsUsed = new Set<string>();
  const dayCounts = new Map<string, number>();
  let hasDawn = false;
  let hasNight = false;
  for (const s of list) {
    const base = s.duration_minutes + (s.quality ?? 0) * 10;
    const multiplier = 1 + (chargeByDate.get(s.dateKey) ?? 0) / 100;
    totalMinutes += s.duration_minutes;
    if (s.quality === 5) masteredCount++;
    totalXp += Math.round(base * multiplier);
    subjectsUsed.add(s.subject);
    dayCounts.set(s.dateKey, (dayCounts.get(s.dateKey) ?? 0) + 1);
    const h = s.logged_at.getUTCHours();
    if (h < 7) hasDawn = true;
    if (h >= 0 && h < 3) hasNight = true;
  }
  const maxDay = dayCounts.size === 0 ? 0 : Math.max(...dayCounts.values());
  const level = levelFromXp(totalXp);
  return {
    level,
    xp: totalXp,
    current_charge_pct: Math.round(charge),
    days_since_empty: currentRun,
    longest_days_since_empty: longestRun,
    total_sessions: list.length,
    total_minutes: totalMinutes,
    total_hours: totalMinutes / 60,
    mastered_count: masteredCount,
    subjects_used: subjectsUsed.size,
    max_session_day: maxDay,
    has_dawn: hasDawn,
    has_night: hasNight,
  };
}

// ---- Filler pass -----------------------------------------------------------
// Only ever places a filler on a day whose immediate neighbors (±1 day) are
// both unused, so filler sessions do not change the visible 45-day charge run.
// Candidate order is deterministically
// shuffled so fillers spread across the window instead of clumping at one
// edge. Capped at a small iteration count: filler closes the last stretch of
// the gap, it doesn't carry the shape.
function isIsolatedCandidate(i: number): boolean {
  const key = dateKeyUTC(daysAgo(i));
  if (usedDayKeys.has(key)) return false;
  if (usedDayKeys.has(dateKeyUTC(daysAgo(i + 1)))) return false;
  if (usedDayKeys.has(dateKeyUTC(daysAgo(i - 1)))) return false;
  return true;
}

function runFillerPass(target: number): Profile {
  let profile = computeProfile(sessions);
  const candidateOrder: number[] = [];
  for (let i = OLD_END; i >= OLD_START; i--) candidateOrder.push(i);
  for (let i = candidateOrder.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [candidateOrder[i], candidateOrder[j]] = [candidateOrder[j], candidateOrder[i]];
  }
  let iter = 0;
  for (const i of candidateOrder) {
    if (iter >= FILLER_MAX_ITER) break;
    const delta = target - profile.xp;
    if (Math.abs(delta) <= 15) break;
    if (delta < 0) break; // overshot — stop rather than dig deeper; shouldn't happen with isolated-only fillers
    if (!isIsolatedCandidate(i)) continue;
    const multiplier = 1;
    const duration = Math.max(
      FILLER_MIN_DURATION,
      Math.min(FILLER_MAX_DURATION, Math.round(delta / multiplier)),
    );
    addSession(i, weightedSubject(), duration, null, randInt(6, 23));
    profile = computeProfile(sessions);
    iter++;
  }
  return profile;
}

// ============================================================================
// Goals — 6 total, 3 Active / 2 Completed / 1 Paused, across the 5 subjects.
// Sessions route to a goal by (subject, dayIndex): Computer Science has two
// goals (an active one and a paused one) — sessions older than the old-window
// boundary have a 50% chance of landing on the paused goal, everything else
// goes to the active one, so the paused goal reads as "started, then
// abandoned" rather than actively accumulating today's sessions.
// ============================================================================

interface GoalDef {
  key: string;
  title: string;
  subject: Subject;
  status: 'Active' | 'Completed' | 'Paused';
  target_hours: number;
  target_date_days: number | null; // days from today, null = no target date
  description: string;
}

const GOAL_DEFS: GoalDef[] = [
  {
    key: 'cs_active',
    title: 'CS 201: Data Structures & Algorithms',
    subject: 'Computer Science',
    status: 'Active',
    target_hours: 80,
    target_date_days: 40,
    description: 'Trees, graphs, and the algorithms that live on them, before the midterm.',
  },
  {
    key: 'math_active',
    title: 'Linear Algebra Review',
    subject: 'Mathematics',
    status: 'Active',
    target_hours: 60,
    target_date_days: 30,
    description: 'Eigenvalues, decompositions, and the proofs I keep forgetting.',
  },
  {
    key: 'lang_active',
    title: 'Spanish B2 Immersion',
    subject: 'Languages',
    status: 'Active',
    target_hours: 50,
    target_date_days: 60,
    description: 'Daily listening + conversation practice toward a B2 certificate.',
  },
  {
    key: 'writing_completed',
    title: 'Technical Writing Practice',
    subject: 'Writing',
    status: 'Completed',
    target_hours: 20,
    target_date_days: null,
    description: 'Clear, short documentation. Wrapped up ahead of schedule.',
  },
  {
    key: 'science_completed',
    title: 'Intro to Physics',
    subject: 'Science',
    status: 'Completed',
    target_hours: 30,
    target_date_days: null,
    description: 'Mechanics through waves — finished last semester.',
  },
  {
    key: 'cs_paused',
    title: 'Machine Learning Specialization',
    subject: 'Computer Science',
    status: 'Paused',
    target_hours: 100,
    target_date_days: null,
    description: 'On hold until CS 201 wraps up.',
  },
];

// Session-log target for the Tier 2 recording — the active goal it logs
// against. Kept stable/deterministic so e2e/demo/steps/tour.steps.ts can
// reference it by title.
const RECORDING_TARGET_GOAL_KEY = 'cs_active';

function goalKeyForSession(subject: Subject, dayIndex: number): string {
  if (subject === 'Computer Science') {
    return dayIndex >= OLD_START && rand() < 0.5 ? 'cs_paused' : 'cs_active';
  }
  const bySubject: Record<Subject, string> = {
    'Computer Science': 'cs_active',
    Mathematics: 'math_active',
    Languages: 'lang_active',
    Writing: 'writing_completed',
    Science: 'science_completed',
  };
  return bySubject[subject];
}

// ============================================================================
// Social fixtures — ~8 synthetic public profiles + one shared study room.
// Marker: email @demo.studysprint.invalid (RFC 2606 reserved, never
// resolves), username prefix ss_demo_. Teardown enumerates on this marker,
// never a hardcoded id list.
// ============================================================================

const SOCIAL_DOMAIN = 'demo.studysprint.invalid';

// These are real, email-confirmed accounts on the live Supabase project, so
// their password must never be a literal in this file — the repo is public,
// and anyone could then sign in as them for the whole window between seed and
// teardown. Generated fresh per run by default and printed once; nothing here
// or in the recording ever needs to sign in as a social fixture, so a password
// nobody records is fine. Set SEED_SOCIAL_PASSWORD only if you actually need
// to log in as one of them to debug.
const SOCIAL_PASSWORD = Deno.env.get('SEED_SOCIAL_PASSWORD') ??
  `ss-demo-${crypto.randomUUID()}`;

interface SocialUserDef {
  slug: string; // used in email + username
  displayName: string;
  bio: string;
  subject: Subject;
  weeklyMinuteMultiplier: number; // relative to the demo account's own weekly minutes
  inRoom: boolean;
}

// Multipliers are relative to the demo account's actual last-7-day minutes
// (computed at runtime from the generated sessions, not hardcoded) — two
// land above it, five below, so the demo account ranks #3 on the leaderboard
// regardless of the exact PRNG output.
const SOCIAL_USERS: SocialUserDef[] = [
  {
    slug: 'priya',
    displayName: 'Priya K.',
    bio: 'Chasing a 4.0, one pomodoro at a time.',
    subject: 'Computer Science',
    weeklyMinuteMultiplier: 1.6,
    inRoom: true,
  },
  {
    slug: 'marcus',
    displayName: 'Marcus T.',
    bio: 'MCAT prep, mostly at 6am.',
    subject: 'Science',
    weeklyMinuteMultiplier: 1.25,
    inRoom: true,
  },
  {
    slug: 'elena',
    displayName: 'Elena R.',
    bio: 'Learning German for a semester abroad.',
    subject: 'Languages',
    weeklyMinuteMultiplier: 0.75,
    inRoom: true,
  },
  {
    slug: 'davidk',
    displayName: 'David K.',
    bio: 'Bar prep, one outline at a time.',
    subject: 'Writing',
    weeklyMinuteMultiplier: 0.55,
    inRoom: true,
  },
  {
    slug: 'sofia',
    displayName: 'Sofia M.',
    bio: 'Calc II study group organizer.',
    subject: 'Mathematics',
    weeklyMinuteMultiplier: 0.4,
    inRoom: false,
  },
  {
    slug: 'jamal',
    displayName: 'Jamal B.',
    bio: 'Self-taught, building in public.',
    subject: 'Computer Science',
    weeklyMinuteMultiplier: 0.28,
    inRoom: false,
  },
  {
    slug: 'wei',
    displayName: 'Wei L.',
    bio: 'Grad school apps + GRE review.',
    subject: 'Mathematics',
    weeklyMinuteMultiplier: 0.15,
    inRoom: false,
  },
  {
    slug: 'amara',
    displayName: 'Amara O.',
    bio: 'Studying between shifts.',
    subject: 'Science',
    weeklyMinuteMultiplier: 0.08,
    inRoom: false,
  },
];

const ROOM_SLUG = 'ss-demo-study-squad';
const ROOM_NAME = 'Study Squad';
const ROOM_DESCRIPTION = 'Evening check-ins, mostly CS and pre-med.';

// ============================================================================
// Supabase IO
// ============================================================================

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

async function ensureUser(admin: SupabaseClient, email: string, password: string): Promise<string> {
  const existing = await findUserByEmail(admin, email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`updateUserById(${email}) failed: ${error.message}`);
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser(${email}) failed: ${error?.message}`);
  return data.user.id;
}

async function main() {
  generateShape();
  let profile = runFillerPass(TARGET_XP_BEFORE_LOG);

  const demoWeeklyMinutes = sessions
    .filter((s) => TODAY.getTime() - s.logged_at.getTime() <= 7 * MS_PER_DAY)
    .reduce((sum, s) => sum + s.duration_minutes, 0);

  const postLog = computeProfile([
    ...sessions,
    {
      subject: 'Computer Science',
      duration_minutes: SESSION_LOG_MINUTES,
      quality: SESSION_LOG_QUALITY,
      logged_at: new Date(TODAY.getTime() + 60_000),
      dateKey: dateKeyUTC(TODAY),
      dayIndex: 0,
    },
  ]);

  console.log('seed-demo-history: pre-log profile:', profile);
  console.log('seed-demo-history: demo weekly (7d) minutes:', demoWeeklyMinutes);
  console.log('seed-demo-history: post-recorded-session profile:', postLog);
  console.log(
    `seed-demo-history: charge ${profile.current_charge_pct}% -> ${postLog.current_charge_pct}%`,
  );

  const checks: Record<string, boolean> = {
    'days_since_empty >= 40': profile.days_since_empty >= 40,
    [`xp within ${XP_TOLERANCE} of ${TARGET_XP_BEFORE_LOG}`]:
      Math.abs(profile.xp - TARGET_XP_BEFORE_LOG) <= XP_TOLERANCE,
    'current_charge_pct === 100 (pre-log)': profile.current_charge_pct === 100,
    'current_charge_pct === 100 (post-log)': postLog.current_charge_pct === 100,
    'total_sessions < 100 (century locked)': profile.total_sessions < 100,
    'max_session_day < 10 (sprint_day locked)': profile.max_session_day < 10,
    'total_hours >= 100 (marathon)': profile.total_hours >= 100,
    'mastered_count >= 5': profile.mastered_count >= 5,
    'subjects_used === 5 (polymath)': profile.subjects_used === 5,
    'has_dawn (dawn_patrol)': profile.has_dawn,
    'has_night (night_owl)': profile.has_night,
  };
  let allPass = true;
  for (const [k, v] of Object.entries(checks)) {
    console.log(`  ${v ? 'PASS' : 'FAIL'}  ${k}`);
    if (!v) allPass = false;
  }
  if (!allPass) {
    console.error(
      'seed-demo-history: acceptance checks failed — not writing anything. Retune the generator constants.',
    );
    Deno.exit(1);
  }

  if (DRY_RUN) {
    console.log('seed-demo-history: --dry-run, no writes performed.');
    return;
  }

  const admin = createClient(SUPABASE_URL!, SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Demo account: subjects, goals, sessions, public profile ──────────────
  const demoUser = await findUserByEmail(admin, DEMO_EMAIL);
  if (!demoUser) {
    console.error(
      `seed-demo-history: ${DEMO_EMAIL} not found — run \`deno task test:setup\` first.`,
    );
    Deno.exit(1);
  }
  const demoUserId = demoUser.id;

  console.log('seed-demo-history: upserting subjects…');
  for (const name of SUBJECTS) {
    const { error } = await admin.from('subjects').upsert({ name }, { onConflict: 'name' });
    if (error) throw new Error(`subjects upsert(${name}) failed: ${error.message}`);
  }
  const { data: subjectRows, error: subjectsErr } = await admin.from('subjects').select('id, name')
    .in('name', SUBJECTS);
  if (subjectsErr || !subjectRows) {
    throw new Error(`subjects select failed: ${subjectsErr?.message}`);
  }
  const subjectIdByName = new Map(subjectRows.map((r) => [r.name as string, r.id as string]));

  console.log('seed-demo-history: wiping existing demo-account goals/sessions…');
  const { error: wipeGoalsErr } = await admin.from('study_goals').delete().eq(
    'user_id',
    demoUserId,
  );
  if (wipeGoalsErr) throw new Error(`wipe study_goals failed: ${wipeGoalsErr.message}`);

  console.log('seed-demo-history: creating goals…');
  const goalIdByKey = new Map<string, string>();
  for (const g of GOAL_DEFS) {
    const target_date = g.target_date_days == null
      ? null
      : dateKeyUTC(new Date(TODAY.getTime() + g.target_date_days * MS_PER_DAY));
    const { data, error } = await admin
      .from('study_goals')
      .insert({
        user_id: demoUserId,
        title: g.title,
        description: g.description,
        target_hours: g.target_hours,
        status: g.status,
        target_date,
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(`insert goal ${g.key} failed: ${error?.message}`);
    goalIdByKey.set(g.key, data.id as string);
    const subjectId = subjectIdByName.get(g.subject);
    if (subjectId) {
      const { error: tagErr } = await admin.from('goal_subjects').insert({
        goal_id: data.id,
        subject_id: subjectId,
      });
      if (tagErr) throw new Error(`goal_subjects insert for ${g.key} failed: ${tagErr.message}`);
    }
  }

  const QUALITY_REVIEW_DAYS: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 };
  console.log(`seed-demo-history: inserting ${sessions.length} sessions…`);
  const rows = sessions.map((s) => {
    const goalKey = goalKeyForSession(s.subject, s.dayIndex);
    const next_review_at = s.quality != null
      ? new Date(s.logged_at.getTime() + QUALITY_REVIEW_DAYS[s.quality] * MS_PER_DAY).toISOString()
      : null;
    return {
      goal_id: goalIdByKey.get(goalKey),
      duration_minutes: s.duration_minutes,
      quality: s.quality,
      logged_at: s.logged_at.toISOString(),
      next_review_at,
    };
  });
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await admin.from('study_sessions').insert(rows.slice(i, i + BATCH));
    if (error) throw new Error(`study_sessions insert batch @${i} failed: ${error.message}`);
  }

  console.log('seed-demo-history: setting demo profile public…');
  const { error: profileErr } = await admin
    .from('profiles')
    .update({
      username: 'demo_sprinter',
      display_name: 'Demo Sprinter',
      bio: 'The account behind the README GIFs.',
      is_public: true,
    })
    .eq('id', demoUserId);
  if (profileErr) throw new Error(`profiles update failed: ${profileErr.message}`);

  // ── Social fixtures ────────────────────────────────────────────────────
  console.log('seed-demo-history: seeding synthetic public profiles…');
  if (!Deno.env.get('SEED_SOCIAL_PASSWORD')) {
    console.log(`seed-demo-history: generated social-fixture password: ${SOCIAL_PASSWORD}`);
    console.log('seed-demo-history: not stored anywhere — re-run to rotate it.');
  }
  const socialUserIds: string[] = [];
  const roomMemberIds: string[] = [demoUserId];
  for (const u of SOCIAL_USERS) {
    const email = `ss-demo-${u.slug}@${SOCIAL_DOMAIN}`;
    const userId = await ensureUser(admin, email, SOCIAL_PASSWORD);
    socialUserIds.push(userId);
    const { error: pErr } = await admin
      .from('profiles')
      .update({
        username: `ss_demo_${u.slug}`,
        display_name: u.displayName,
        bio: u.bio,
        is_public: true,
      })
      .eq('id', userId);
    if (pErr) throw new Error(`social profile update(${u.slug}) failed: ${pErr.message}`);

    // Wipe this user's prior goals (cascades sessions) and give them one
    // active goal + a handful of sessions inside the last 7 days, sized so
    // their weekly total is a fixed multiple of the demo account's — this
    // is what pins the demo account's leaderboard rank, not luck.
    await admin.from('study_goals').delete().eq('user_id', userId);
    const subjectId = subjectIdByName.get(u.subject);
    const { data: goalRow, error: gErr } = await admin
      .from('study_goals')
      .insert({ user_id: userId, title: `${u.subject} sprint`, target_hours: 20, status: 'Active' })
      .select('id')
      .single();
    if (gErr || !goalRow) throw new Error(`social goal insert(${u.slug}) failed: ${gErr?.message}`);
    if (subjectId) {
      await admin.from('goal_subjects').insert({ goal_id: goalRow.id, subject_id: subjectId });
    }

    // One session per day across the last 7 days, each capped at 180min, so
    // up to 1260min/week of capacity — comfortably above the highest
    // multiplier's target (~1.6x demoWeeklyMinutes). A fixed 3-session
    // budget previously hard-capped every user at ~540min regardless of
    // target, which silently broke the "demo ranks #3" guarantee: the two
    // users meant to outrank it (1.6x, 1.25x) both landed under it instead.
    const targetWeekly = Math.max(30, Math.round(demoWeeklyMinutes * u.weeklyMinuteMultiplier));
    let remaining = targetWeekly;
    const socialSessions = [];
    for (let d = 0; d < 7 && remaining > 0; d++) {
      const duration = Math.min(180, remaining);
      const loggedAt = new Date(TODAY.getTime() - d * MS_PER_DAY);
      loggedAt.setUTCHours(randInt(8, 22), randInt(0, 59), 0, 0);
      socialSessions.push({
        goal_id: goalRow.id,
        duration_minutes: duration,
        quality: pick([3, 4, 5]),
        logged_at: loggedAt.toISOString(),
      });
      remaining -= duration;
    }
    if (socialSessions.length > 0) {
      const { error: sErr } = await admin.from('study_sessions').insert(socialSessions);
      if (sErr) throw new Error(`social sessions insert(${u.slug}) failed: ${sErr.message}`);
    }
    if (u.inRoom) roomMemberIds.push(userId);
  }

  // ── Study room ──────────────────────────────────────────────────────────
  console.log('seed-demo-history: seeding study room…');
  await admin.from('study_rooms').delete().eq('slug', ROOM_SLUG);
  const { data: roomRow, error: roomErr } = await admin
    .from('study_rooms')
    .insert({
      slug: ROOM_SLUG,
      name: ROOM_NAME,
      description: ROOM_DESCRIPTION,
      passcode_hash: null,
      created_by: demoUserId,
    })
    .select('id')
    .single();
  if (roomErr || !roomRow) throw new Error(`study_rooms insert failed: ${roomErr?.message}`);
  const { error: membersErr } = await admin
    .from('room_members')
    .insert(roomMemberIds.map((user_id) => ({ room_id: roomRow.id, user_id })));
  if (membersErr) throw new Error(`room_members insert failed: ${membersErr.message}`);

  // get_room()'s activity feed only looks back 48h — give a few room
  // members a session inside that window so it's non-empty.
  const { data: memberGoals, error: mgErr } = await admin
    .from('study_goals')
    .select('id, user_id')
    .in('user_id', roomMemberIds.filter((id) => id !== demoUserId))
    .limit(3);
  if (mgErr) throw new Error(`member goals lookup failed: ${mgErr.message}`);
  if (memberGoals && memberGoals.length > 0) {
    const activityRows = memberGoals.map((g, i) => ({
      goal_id: g.id,
      duration_minutes: randInt(25, 60),
      quality: pick([3, 4, 5]),
      logged_at: new Date(TODAY.getTime() - i * 3 * 60 * 60 * 1000).toISOString(), // within the last ~9h
    }));
    const { error: actErr } = await admin.from('study_sessions').insert(activityRows);
    if (actErr) throw new Error(`room activity session insert failed: ${actErr.message}`);
  }

  console.log(
    `seed-demo-history: done. Recording target goal: "${
      GOAL_DEFS.find((g) => g.key === RECORDING_TARGET_GOAL_KEY)?.title
    }"`,
  );
}

main().catch((err) => {
  console.error('seed-demo-history: fatal:', err);
  Deno.exit(1);
});
