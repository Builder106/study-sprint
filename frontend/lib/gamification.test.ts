import { assert, assertEquals } from "jsr:@std/assert";
import {
  computeGamificationProfile,
  type GamificationSession,
} from "./gamification.ts";

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

Deno.test("empty sessions → zeroed profile", () => {
  const p = computeGamificationProfile([], new Set(), "UTC");
  assertEquals(p.level, 0);
  assertEquals(p.xp, 0);
  assertEquals(p.total_sessions, 0);
  assertEquals(p.total_minutes, 0);
  assertEquals(p.pet_stage, "seed");
  assertEquals(p.current_streak_days, 0);
  assertEquals(p.longest_streak_days, 0);
  assertEquals(p.mastered_count, 0);
  assert(p.achievements.every((a) => !a.unlocked));
});

// ── Basic accumulation ───────────────────────────────────────────────────────

Deno.test("total_minutes and total_sessions are summed correctly", () => {
  const sessions = [
    session("a", 0, 30),
    session("b", 1, 45),
    session("c", 2, 60),
  ];
  const p = computeGamificationProfile(sessions, new Set(), "UTC");
  assertEquals(p.total_sessions, 3);
  assertEquals(p.total_minutes, 135);
});

Deno.test("mastered_count counts quality-5 sessions only", () => {
  const sessions = [
    session("a", 0, 30, 5),
    session("b", 1, 30, 4),
    session("c", 2, 30, 5),
    session("d", 3, 30, null),
  ];
  const p = computeGamificationProfile(sessions, new Set(), "UTC");
  assertEquals(p.mastered_count, 2);
});

// ── XP and levels ────────────────────────────────────────────────────────────

Deno.test("single session today earns XP with 1-day streak multiplier", () => {
  // base = 60, streak = 1, multiplier = 1 + 1/30, xp = round(60 * 31/30) = 62
  const p = computeGamificationProfile([session("a", 0, 60)], new Set(), "UTC");
  assertEquals(p.xp, 62);
  assertEquals(p.level, 0); // 62 < 100 (threshold for level 1)
});

Deno.test("quality bonus is added to XP base", () => {
  // base = 60 + 5*10 = 110, streak = 1, multiplier = 31/30, xp = round(110 * 31/30) = 114
  const p = computeGamificationProfile([session("a", 0, 60, 5)], new Set(), "UTC");
  assertEquals(p.xp, 114); // round(110 * 31/30) = round(113.67) = 114
});

Deno.test("level 1 requires 100 XP", () => {
  // 100 XP needs base ≥ 97 with today's 1-day multiplier (31/30):
  // round(97 * 31/30) = round(100.23) = 100 → level 1
  const p = computeGamificationProfile([session("a", 0, 97)], new Set(), "UTC");
  assertEquals(p.level, 1);
  assertEquals(p.pet_stage, "sprout");
});

Deno.test("30 consecutive days produces level 5 and sapling stage", () => {
  // XP = sum_{i=1}^{30} round(60 * (1 + i/30)) = sum (60 + 2i) = 1800 + 2*465 = 2730
  // level = floor(sqrt(2730/100)) = floor(sqrt(27.3)) = floor(5.22) = 5
  const sessions = Array.from({ length: 30 }, (_, i) =>
    session(String(i), 29 - i, 60)
  );
  const p = computeGamificationProfile(sessions, new Set(), "UTC");
  assertEquals(p.xp, 2730);
  assertEquals(p.level, 5);
  assertEquals(p.pet_stage, "sapling"); // levels 4–7
});

// ── Streaks ──────────────────────────────────────────────────────────────────

Deno.test("session today gives current_streak of 1", () => {
  const p = computeGamificationProfile([session("a", 0, 30)], new Set(), "UTC");
  assertEquals(p.current_streak_days, 1);
});

Deno.test("no session today resets current streak to 0", () => {
  const p = computeGamificationProfile([session("a", 1, 30)], new Set(), "UTC");
  assertEquals(p.current_streak_days, 0);
  assertEquals(p.longest_streak_days, 1);
});

Deno.test("7 consecutive days ending today", () => {
  const sessions = Array.from({ length: 7 }, (_, i) =>
    session(String(i), 6 - i, 30)
  );
  const p = computeGamificationProfile(sessions, new Set(), "UTC");
  assertEquals(p.current_streak_days, 7);
  assertEquals(p.longest_streak_days, 7);
});

Deno.test("longest_streak is preserved after a break", () => {
  // 5 consecutive days ending 3 days ago, then nothing
  const sessions = Array.from({ length: 5 }, (_, i) =>
    session(String(i), 7 - i, 30) // days 7,6,5,4,3 ago
  );
  const p = computeGamificationProfile(sessions, new Set(), "UTC");
  assertEquals(p.current_streak_days, 0);
  assertEquals(p.longest_streak_days, 5);
});

Deno.test("multiple sessions on the same day count as one streak day", () => {
  const sessions = [
    session("a", 0, 30),
    session("b", 0, 45), // same day, second session
  ];
  const p = computeGamificationProfile(sessions, new Set(), "UTC");
  assertEquals(p.current_streak_days, 1); // still just 1 day
});

// ── Achievements ─────────────────────────────────────────────────────────────

Deno.test("first_step unlocked after one session", () => {
  const p = computeGamificationProfile([session("a", 0, 30)], new Set(), "UTC");
  const a = p.achievements.find((x) => x.id === "first_step");
  assertEquals(a?.unlocked, true);
});

Deno.test("hot_streak unlocks after 7-day streak", () => {
  const sessions = Array.from({ length: 7 }, (_, i) =>
    session(String(i), 6 - i, 30)
  );
  const p = computeGamificationProfile(sessions, new Set(), "UTC");
  assertEquals(p.achievements.find((x) => x.id === "hot_streak")?.unlocked, true);
});

Deno.test("30-day streak unlocks dedicated (and hot_streak)", () => {
  const sessions = Array.from({ length: 30 }, (_, i) =>
    session(String(i), 29 - i, 30)
  );
  const p = computeGamificationProfile(sessions, new Set(), "UTC");
  assertEquals(p.achievements.find((x) => x.id === "dedicated")?.unlocked, true);
  assertEquals(p.achievements.find((x) => x.id === "hot_streak")?.unlocked, true);
});

Deno.test("polymath unlocks with 5 distinct subjects", () => {
  const p = computeGamificationProfile(
    [session("a", 0, 30)],
    new Set(["Math", "Physics", "CS", "History", "Art"]),
    "UTC",
  );
  assertEquals(p.achievements.find((x) => x.id === "polymath")?.unlocked, true);
});

Deno.test("polymath does not unlock with fewer than 5 subjects", () => {
  const p = computeGamificationProfile(
    [session("a", 0, 30)],
    new Set(["Math", "Physics"]),
    "UTC",
  );
  assertEquals(p.achievements.find((x) => x.id === "polymath")?.unlocked, false);
});

Deno.test("mastered_five unlocks after 5 quality-5 sessions", () => {
  const sessions = Array.from({ length: 5 }, (_, i) =>
    session(String(i), i, 30, 5)
  );
  const p = computeGamificationProfile(sessions, new Set(), "UTC");
  assertEquals(p.achievements.find((x) => x.id === "mastered_five")?.unlocked, true);
});

Deno.test("dawn_patrol unlocks for a session before 7am UTC", () => {
  const p = computeGamificationProfile(
    [session("a", 0, 30, null, 5)], // 5am UTC
    new Set(),
    "UTC",
  );
  assertEquals(p.achievements.find((x) => x.id === "dawn_patrol")?.unlocked, true);
});

Deno.test("dawn_patrol does not unlock for a session at 7am or later", () => {
  const p = computeGamificationProfile(
    [session("a", 0, 30, null, 9)], // 9am UTC
    new Set(),
    "UTC",
  );
  assertEquals(p.achievements.find((x) => x.id === "dawn_patrol")?.unlocked, false);
});

Deno.test("night_owl unlocks for a session between midnight and 3am", () => {
  const p = computeGamificationProfile(
    [session("a", 0, 30, null, 1)], // 1am UTC
    new Set(),
    "UTC",
  );
  assertEquals(p.achievements.find((x) => x.id === "night_owl")?.unlocked, true);
});

Deno.test("sprint_day unlocks for 10 sessions in one day", () => {
  const sessions = Array.from({ length: 10 }, (_, i) =>
    session(String(i), 0, 30) // all today
  );
  const p = computeGamificationProfile(sessions, new Set(), "UTC");
  assertEquals(p.achievements.find((x) => x.id === "sprint_day")?.unlocked, true);
});

// ── Level display fields ─────────────────────────────────────────────────────

Deno.test("xp_for_next_level at level 0 is 100", () => {
  const p = computeGamificationProfile([], new Set(), "UTC");
  assertEquals(p.xp_for_next_level, 100); // xpForLevel(1) - xpForLevel(0) = 100
  assertEquals(p.xp_into_level, 0);
  assertEquals(p.progress_to_next, 0);
});

Deno.test("progress_to_next is between 0 and 1 while leveling", () => {
  const p = computeGamificationProfile([session("a", 0, 60)], new Set(), "UTC");
  assert(p.progress_to_next >= 0 && p.progress_to_next <= 1);
  assert(p.xp_into_level >= 0);
  assert(p.xp_for_next_level > 0);
});
