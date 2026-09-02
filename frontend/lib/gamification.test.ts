import { assert, assertEquals } from 'jsr:@std/assert';
import { computeGamificationProfile, type GamificationSession } from './gamification.ts';

// Build a UTC ISO timestamp N days before today at a given UTC hour.
// All tests use tz="UTC" so localDateKey(ts, "UTC") == the UTC calendar date.
function isoAt(daysAgo: number, utcHour = 12): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(utcHour, 0, 0, 0);
  return d.toISOString();
}

function session(
  id: string,
  daysAgo: number,
  minutes: number,
  quality: number | null = null,
  utcHour = 12,
): GamificationSession {
  return { id, duration_minutes: minutes, quality, logged_at: isoAt(daysAgo, utcHour) };
}

// ── Empty input ─────────────────────────────────────────────────────────────

Deno.test('empty sessions → zeroed profile', () => {
  const p = computeGamificationProfile([], new Set(), 'UTC');
  assertEquals(p.level, 0);
  assertEquals(p.xp, 0);
  assertEquals(p.total_sessions, 0);
  assertEquals(p.total_minutes, 0);
  assertEquals(p.current_charge_pct, 0);
  assertEquals(p.days_since_empty, 0);
  assertEquals(p.longest_days_since_empty, 0);
  assertEquals(p.mastered_count, 0);
  assert(p.achievements.every((a) => !a.unlocked));
});

// ── Basic accumulation ───────────────────────────────────────────────────────

Deno.test('total_minutes and total_sessions are summed correctly', () => {
  const sessions = [
    session('a', 0, 30),
    session('b', 1, 45),
    session('c', 2, 60),
  ];
  const p = computeGamificationProfile(sessions, new Set(), 'UTC');
  assertEquals(p.total_sessions, 3);
  assertEquals(p.total_minutes, 135);
});

Deno.test('mastered_count counts quality-5 sessions only', () => {
  const sessions = [
    session('a', 0, 30, 5),
    session('b', 1, 30, 4),
    session('c', 2, 30, 5),
    session('d', 3, 30, null),
  ];
  const p = computeGamificationProfile(sessions, new Set(), 'UTC');
  assertEquals(p.mastered_count, 2);
});

// ── XP and levels ────────────────────────────────────────────────────────────

Deno.test('single session today earns XP with charge multiplier', () => {
  // gain = min(60/120,1)*20 = 10, charge = clamp(0-8+10) = 2
  // multiplier = 1 + 2/100 = 1.02, xp = round(60 * 1.02) = 61
  const p = computeGamificationProfile([session('a', 0, 60)], new Set(), 'UTC');
  assertEquals(p.current_charge_pct, 2);
  assertEquals(p.xp, 61);
  assertEquals(p.level, 0); // 61 < 100 (threshold for level 1)
});

Deno.test('quality bonus is added to XP base', () => {
  // base = 60 + 5*10 = 110, charge = 2 (unaffected by quality), multiplier = 1.02
  // xp = round(110 * 1.02) = round(112.2) = 112
  const p = computeGamificationProfile([session('a', 0, 60, 5)], new Set(), 'UTC');
  assertEquals(p.xp, 112);
});

Deno.test('a single 100-minute session crosses into level 1', () => {
  // gain = min(100/120,1)*20 = 16.6667, charge = clamp(0-8+16.6667) = 8.6667
  // multiplier = 1.086667, xp = round(100 * 1.086667) = round(108.667) = 109
  const p = computeGamificationProfile([session('a', 0, 100)], new Set(), 'UTC');
  assertEquals(p.xp, 109);
  assertEquals(p.level, 1);
});

Deno.test('30 consecutive days of 60 min/day produces level 4', () => {
  // Each day k (1-indexed): gain=10, charge_k = 2k (net +2/day, never clamps
  // since it stays within [2, 60]). xp_k = round(60 * (1 + 2k/100)).
  // Summed over k=1..30: totalXp = 1800 + 558 = 2358.
  // level = floor(sqrt(2358/100)) = floor(sqrt(23.58)) = 4.
  const sessions = Array.from({ length: 30 }, (_, i) => session(String(i), 29 - i, 60));
  const p = computeGamificationProfile(sessions, new Set(), 'UTC');
  assertEquals(p.xp, 2358);
  assertEquals(p.level, 4);
});

// ── Battery charge ───────────────────────────────────────────────────────────

Deno.test('10 consecutive days of 120 min/day ramps charge to 100', () => {
  const sessions = Array.from({ length: 10 }, (_, i) => session(String(i), 9 - i, 120));
  const p = computeGamificationProfile(sessions, new Set(), 'UTC');
  assertEquals(p.current_charge_pct, 100);
});

Deno.test('5 zero-minute days after reaching 100 drains charge to 60', () => {
  // 10 days of 120 min (daysAgo 14..5) ramps to charge=100 by the 9th day
  // and holds; then 5 zero-minute days (daysAgo 4..0) drain -8 each: 60.
  const sessions = Array.from({ length: 10 }, (_, i) => session(String(i), 14 - i, 120));
  const p = computeGamificationProfile(sessions, new Set(), 'UTC');
  assertEquals(p.current_charge_pct, 60);
});

Deno.test('charge fully drains to 0 after enough inactive days, resetting days_since_empty', () => {
  // 10 days of 120 min (daysAgo 22..13) ramps to charge=100 and holds.
  // 13 zero-minute days (daysAgo 12..0) drain exactly to 0 by today
  // (100 - 13*8 = -4, clamped to 0).
  const sessions = Array.from({ length: 10 }, (_, i) => session(String(i), 22 - i, 120));
  const p = computeGamificationProfile(sessions, new Set(), 'UTC');
  assertEquals(p.current_charge_pct, 0);
  assertEquals(p.days_since_empty, 0);
  // The run from daysAgo=22 through daysAgo=1 (22 days) all had charge > 0
  // before today's drain to exactly 0.
  assertEquals(p.longest_days_since_empty, 22);
});

Deno.test("multiple sessions on the same day are summed into one day's gain", () => {
  const sessions = [
    session('a', 0, 60),
    session('b', 0, 60), // same day, second session — 120 min total
  ];
  const p = computeGamificationProfile(sessions, new Set(), 'UTC');
  // gain = min(120/120,1)*20 = 20, charge = clamp(0-8+20) = 12
  assertEquals(p.current_charge_pct, 12);
});

// ── Achievements ─────────────────────────────────────────────────────────────

Deno.test('first_step unlocked after one session', () => {
  const p = computeGamificationProfile([session('a', 0, 30)], new Set(), 'UTC');
  const a = p.achievements.find((x) => x.id === 'first_step');
  assertEquals(a?.unlocked, true);
});

Deno.test('charged_up unlocks after 7 days since empty', () => {
  const sessions = Array.from({ length: 7 }, (_, i) => session(String(i), 6 - i, 120));
  const p = computeGamificationProfile(sessions, new Set(), 'UTC');
  assertEquals(p.days_since_empty, 7);
  assertEquals(p.achievements.find((x) => x.id === 'charged_up')?.unlocked, true);
  assertEquals(p.achievements.find((x) => x.id === 'never_empty')?.unlocked, false);
  assertEquals(p.achievements.find((x) => x.id === 'full_charge')?.unlocked, false);
});

Deno.test('30 days since empty unlocks never_empty and full_charge', () => {
  const sessions = Array.from({ length: 30 }, (_, i) => session(String(i), 29 - i, 120));
  const p = computeGamificationProfile(sessions, new Set(), 'UTC');
  assertEquals(p.days_since_empty, 30);
  assertEquals(p.achievements.find((x) => x.id === 'charged_up')?.unlocked, true);
  assertEquals(p.achievements.find((x) => x.id === 'never_empty')?.unlocked, true);
  assertEquals(p.achievements.find((x) => x.id === 'full_charge')?.unlocked, true);
});

Deno.test('polymath unlocks with 5 distinct subjects', () => {
  const p = computeGamificationProfile(
    [session('a', 0, 30)],
    new Set(['Math', 'Physics', 'CS', 'History', 'Art']),
    'UTC',
  );
  assertEquals(p.achievements.find((x) => x.id === 'polymath')?.unlocked, true);
});

Deno.test('polymath does not unlock with fewer than 5 subjects', () => {
  const p = computeGamificationProfile(
    [session('a', 0, 30)],
    new Set(['Math', 'Physics']),
    'UTC',
  );
  assertEquals(p.achievements.find((x) => x.id === 'polymath')?.unlocked, false);
});

Deno.test('mastered_five unlocks after 5 quality-5 sessions', () => {
  const sessions = Array.from({ length: 5 }, (_, i) => session(String(i), i, 30, 5));
  const p = computeGamificationProfile(sessions, new Set(), 'UTC');
  assertEquals(p.achievements.find((x) => x.id === 'mastered_five')?.unlocked, true);
});

Deno.test('dawn_patrol unlocks for a session before 7am UTC', () => {
  const p = computeGamificationProfile(
    [session('a', 0, 30, null, 5)], // 5am UTC
    new Set(),
    'UTC',
  );
  assertEquals(p.achievements.find((x) => x.id === 'dawn_patrol')?.unlocked, true);
});

Deno.test('dawn_patrol does not unlock for a session at 7am or later', () => {
  const p = computeGamificationProfile(
    [session('a', 0, 30, null, 9)], // 9am UTC
    new Set(),
    'UTC',
  );
  assertEquals(p.achievements.find((x) => x.id === 'dawn_patrol')?.unlocked, false);
});

Deno.test('night_owl unlocks for a session between midnight and 3am', () => {
  const p = computeGamificationProfile(
    [session('a', 0, 30, null, 1)], // 1am UTC
    new Set(),
    'UTC',
  );
  assertEquals(p.achievements.find((x) => x.id === 'night_owl')?.unlocked, true);
});

Deno.test('sprint_day unlocks for 10 sessions in one day', () => {
  const sessions = Array.from({ length: 10 }, (_, i) => session(String(i), 0, 30) // all today
  );
  const p = computeGamificationProfile(sessions, new Set(), 'UTC');
  assertEquals(p.achievements.find((x) => x.id === 'sprint_day')?.unlocked, true);
});

// ── Level display fields ─────────────────────────────────────────────────────

Deno.test('xp_for_next_level at level 0 is 100', () => {
  const p = computeGamificationProfile([], new Set(), 'UTC');
  assertEquals(p.xp_for_next_level, 100); // xpForLevel(1) - xpForLevel(0) = 100
  assertEquals(p.xp_into_level, 0);
  assertEquals(p.progress_to_next, 0);
});

Deno.test('progress_to_next is between 0 and 1 while leveling', () => {
  const p = computeGamificationProfile([session('a', 0, 60)], new Set(), 'UTC');
  assert(p.progress_to_next >= 0 && p.progress_to_next <= 1);
  assert(p.xp_into_level >= 0);
  assert(p.xp_for_next_level > 0);
});

Deno.test('marathon and century achievements unlock at thresholds', () => {
  const sessions = Array.from({ length: 100 }, (_, i) => session(String(i), 0, 60)); // 100 sessions * 1 hr = 100 hrs
  const p = computeGamificationProfile(sessions, new Set(), 'UTC');
  assertEquals(p.achievements.find((x) => x.id === 'marathon')?.unlocked, true);
  assertEquals(p.achievements.find((x) => x.id === 'century')?.unlocked, true);
});

Deno.test('charged_up and never_empty unlock on past longest streak even if current streak is broken', () => {
  // 35 consecutive days, then 20 zero-minute days (draining current streak to 0: 20 * 8 > 100)
  const sessions = Array.from({ length: 35 }, (_, i) => session(String(i), 20 + i, 120));
  const p = computeGamificationProfile(sessions, new Set(), 'UTC');
  assertEquals(p.days_since_empty, 0);
  assert(p.longest_days_since_empty >= 30);
  assertEquals(p.achievements.find((x) => x.id === 'charged_up')?.unlocked, true);
  assertEquals(p.achievements.find((x) => x.id === 'never_empty')?.unlocked, true);
});

Deno.test('invalid timezone falls back to UTC gracefully', () => {
  const p = computeGamificationProfile([session('a', 0, 60)], new Set(), 'Invalid/Timezone_Name');
  assertEquals(p.total_sessions, 1);
  assertEquals(p.total_minutes, 60);
});

Deno.test('charge > 0 on day 1 handles streak accumulation correctly', () => {
  // Session logged 363 days ago (index 1 of the 365-day window)
  const p = computeGamificationProfile([session('a', 363, 120)], new Set(), 'UTC');
  assertEquals(p.longest_days_since_empty >= 1, true);
});

Deno.test('session older than 365 days falls back to charge 0 default', () => {
  // Session logged 400 days ago (outside 365-day window)
  const p = computeGamificationProfile([session('old', 400, 60)], new Set(), 'UTC');
  assertEquals(p.total_sessions, 1);
  assertEquals(p.xp, 60); // multiplier 1.0
});
