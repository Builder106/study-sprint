# Battery Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the day-streak XP economy (plant/garden themed) with a gradual-drain battery economy (`current_charge_pct`, `days_since_empty`), in both the Postgres `analytics_summary()` RPC and the client-side `gamification.ts`, without redesigning any consumer page beyond what's needed to keep the build compiling.

**Architecture:** Both the SQL RPC and the client function independently walk the same 365-day window day-by-day, applying `charge[day] = clamp(0, 100, charge[day-1] − 8 + gain[day])` where `gain[day] = min(minutes/120, 1) × 20`. The SQL side uses a recursive CTE to carry `charge[day-1]` forward (replacing today's gap-and-island streak CTEs); the client side already loops day-by-day, so the loop body swaps formulas. Three achievements (`charged_up`, `never_empty`, `full_charge`) replace the two streak-based ones. Nothing is stored — both sides derive everything from `study_sessions` per request, so there's no data migration.

**Tech Stack:** Postgres (Supabase migration, `plpgsql`), Deno/TypeScript (`frontend/lib/gamification.ts`), Deno test (`frontend/lib/gamification.test.ts`), React/TSX consumers (`Garden.tsx`, `Analytics.tsx`, `api.ts`).

**Spec:** `docs/specs/2026-08-12-battery-economy-design.md`

## Global Constraints

- Decay = flat `8` points per day, applied unconditionally.
- Gain cap = `20` points, reached at `120` minutes studied in a local calendar day; partial minutes give proportional partial gain (`min(minutes/120, 1) × 20`).
- `charge[0]` (the oldest day in the 365-day window) is a hard anchor at `0` — not derived from that day's own minutes.
- XP multiplier = `1 + charge[day]/100` (range 1.0×–2.0×), using the charge value *after* that day's gain is applied.
- `days_since_empty` = consecutive days ending today with `charge > 0`. `longest_days_since_empty` = the longest such run anywhere in the 365-day window.
- Achievements: `charged_up` (days_since_empty ≥ 7, current or longest), `never_empty` (≥ 30, current or longest), `full_charge` (charge reached 100 at least once in the window). All other achievements (`first_step`, `marathon`, `century`, `polymath`, `mastered_five`, `dawn_patrol`, `night_owl`, `sprint_day`) are unchanged.
- Do not touch `VirtualPlant.tsx`, `Landing.tsx`, `Dashboard.tsx`, `Terms.tsx`, or `DESIGN.md` in this plan — those are later sub-projects (see spec's "Out of scope" section).
- `Garden.tsx` and `Analytics.tsx` may be touched, but only to keep them compiling and showing correct (not redesigned) data — swap the fields they read, not their layout or visual design.

---

### Task 1: Rewrite `analytics_summary()` with the recursive-CTE battery formula

**Files:**

- Create: `supabase/migrations/20260812000000_battery_economy.sql`
- Test (manual, no automated SQL test infra exists in this repo): a scratch verification query, run via `psql`/Supabase SQL editor against the linked project after `deno task supabase:db:push`

**Interfaces:**

- Consumes: `public.study_sessions`, `public.study_goals`, `public.goal_subjects`, `public.subjects` (all unchanged, existing tables)
- Produces: `public.analytics_summary()` returning `json` with `totals.current_charge_pct`, `totals.days_since_empty`, `totals.longest_days_since_empty` (replacing `totals.current_streak_days`/`totals.longest_streak_days`). `daily`, `hourly`, `weekday`, `by_subject`, and `totals.minutes`/`totals.sessions_last_365` are unchanged in shape.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260812000000_battery_economy.sql
--
-- Replaces the day-streak calculation with a gradual-drain battery: charge
-- gains up to 20 points/day (capped at 120 studied minutes) and decays a
-- flat 8 points/day regardless of activity, clamped to [0, 100]. The old
-- gap-and-island streak CTEs are replaced by a recursive CTE that walks the
-- 365-day window carrying charge[day-1] forward into charge[day]. Recursion
-- depth is fixed at 365 (one day per row) — no runaway-recursion risk.
--
-- days_since_empty / longest_days_since_empty reuse the same gap-and-island
-- technique the old migration used for streaks, just applied to `charge > 0`
-- instead of `minutes > 0`.

CREATE OR REPLACE FUNCTION public.analytics_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
   v_user_id uuid := auth.uid();
   v_daily json;
   v_hourly json;
   v_weekday json;
   v_by_subject json;
   v_total_minutes int;
   v_sessions_last_365 int;
   v_current_charge_pct int;
   v_days_since_empty int;
   v_longest_days_since_empty int;
BEGIN
   IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
   END IF;

   WITH RECURSIVE daily AS (
      SELECT d.day::date AS day,
             COALESCE(SUM(s.duration_minutes), 0)::int AS minutes,
             ROW_NUMBER() OVER (ORDER BY d.day::date) AS rn
      FROM generate_series(
         (CURRENT_DATE - INTERVAL '364 days')::date,
         CURRENT_DATE::date,
         '1 day'
      ) AS d(day)
      LEFT JOIN public.study_sessions s
         ON s.goal_id IN (SELECT id FROM public.study_goals WHERE user_id = v_user_id)
        AND (s.logged_at AT TIME ZONE 'UTC')::date = d.day::date
      GROUP BY d.day::date
   ),
   charge_walk AS (
      -- Anchor: the oldest day in the window starts at charge 0, regardless
      -- of that day's own minutes (matches the client-side charge[0] = 0).
      SELECT day, minutes, rn, 0::numeric AS charge
      FROM daily WHERE rn = 1

      UNION ALL

      SELECT d.day, d.minutes, d.rn,
         LEAST(100, GREATEST(0,
            cw.charge - 8 + LEAST(1, d.minutes::numeric / 120) * 20
         )) AS charge
      FROM daily d
      JOIN charge_walk cw ON d.rn = cw.rn + 1
   ),
   charge_with_gaps AS (
      SELECT day, charge,
         SUM(CASE WHEN charge = 0 THEN 1 ELSE 0 END) OVER (ORDER BY day DESC) AS gaps_after
      FROM charge_walk
   ),
   charged_islands AS (
      SELECT day,
         day - (ROW_NUMBER() OVER (ORDER BY day))::int AS grp
      FROM charge_walk WHERE charge > 0
   ),
   charged_run_lengths AS (
      SELECT COUNT(*) AS len FROM charged_islands GROUP BY grp
   )
   SELECT
      (SELECT json_agg(json_build_object(
                  'date', to_char(day, 'YYYY-MM-DD'),
                  'minutes', minutes
              ) ORDER BY day) FROM daily),
      (SELECT COALESCE(SUM(minutes), 0)::int FROM daily),
      (SELECT COUNT(*)::int FROM daily WHERE minutes > 0),
      (SELECT ROUND(charge)::int FROM charge_walk ORDER BY day DESC LIMIT 1),
      (SELECT COALESCE(COUNT(*), 0)::int FROM charge_with_gaps
         WHERE gaps_after = 0 AND charge > 0),
      (SELECT COALESCE(MAX(len), 0)::int FROM charged_run_lengths)
   INTO v_daily, v_total_minutes, v_sessions_last_365,
        v_current_charge_pct, v_days_since_empty, v_longest_days_since_empty;

   SELECT COALESCE(json_agg(json_build_object('hour', hour, 'minutes', minutes) ORDER BY hour), '[]'::json)
   INTO v_hourly
   FROM (
      SELECT EXTRACT(HOUR FROM s.logged_at AT TIME ZONE 'UTC')::int AS hour,
             SUM(s.duration_minutes)::int AS minutes
      FROM public.study_sessions s
      JOIN public.study_goals g ON g.id = s.goal_id
      WHERE g.user_id = v_user_id
      GROUP BY hour
   ) h;

   SELECT COALESCE(json_agg(json_build_object('dow', dow, 'minutes', minutes) ORDER BY dow), '[]'::json)
   INTO v_weekday
   FROM (
      SELECT EXTRACT(DOW FROM s.logged_at AT TIME ZONE 'UTC')::int AS dow,
             SUM(s.duration_minutes)::int AS minutes
      FROM public.study_sessions s
      JOIN public.study_goals g ON g.id = s.goal_id
      WHERE g.user_id = v_user_id
      GROUP BY dow
   ) w;

   SELECT COALESCE(json_agg(json_build_object('subject', subject, 'minutes', minutes) ORDER BY minutes DESC), '[]'::json)
   INTO v_by_subject
   FROM (
      SELECT sub.name AS subject,
             SUM(s.duration_minutes)::int AS minutes
      FROM public.study_sessions s
      JOIN public.study_goals g ON g.id = s.goal_id
      JOIN public.goal_subjects gs ON gs.goal_id = g.id
      JOIN public.subjects sub ON sub.id = gs.subject_id
      WHERE g.user_id = v_user_id
      GROUP BY sub.name
   ) bs;

   RETURN json_build_object(
      'daily', COALESCE(v_daily, '[]'::json),
      'hourly', v_hourly,
      'weekday', v_weekday,
      'by_subject', v_by_subject,
      'totals', json_build_object(
         'minutes', v_total_minutes,
         'sessions_last_365', v_sessions_last_365,
         'current_charge_pct', v_current_charge_pct,
         'days_since_empty', v_days_since_empty,
         'longest_days_since_empty', v_longest_days_since_empty
      )
   );
END;
$$;
```

- [ ] **Step 2: Push the migration**

Run: `deno task supabase:db:push`
Expected: migration applies with no errors (the function `CREATE OR REPLACE`s cleanly over the previous version).

- [ ] **Step 3: Manual verification against a tiny synthetic case**

Before trusting this against real production data, sanity-check the recursive CTE in isolation using a tiny synthetic series. Run this scratch query directly against the linked project (via `psql` or the Supabase SQL editor) — it is NOT part of the migration file, just a one-off check:

```sql
WITH RECURSIVE synthetic AS (
   SELECT * FROM (VALUES
      (1, 0), (2, 0), (3, 120), (4, 120), (5, 0)
   ) AS t(rn, minutes)
),
charge_walk AS (
   SELECT rn, minutes, 0::numeric AS charge FROM synthetic WHERE rn = 1
   UNION ALL
   SELECT s.rn, s.minutes,
      LEAST(100, GREATEST(0, cw.charge - 8 + LEAST(1, s.minutes::numeric / 120) * 20))
   FROM synthetic s JOIN charge_walk cw ON s.rn = cw.rn + 1
)
SELECT rn, minutes, charge FROM charge_walk ORDER BY rn;
```

Expected output (hand-verified): `rn=1: charge=0` (anchor), `rn=2: charge=0` (clamp(0-8+0)=clamp(-8)=0), `rn=3: charge=12` (clamp(0-8+20)=12), `rn=4: charge=24` (clamp(12-8+20)=24), `rn=5: charge=16` (clamp(24-8+0)=16). If any row doesn't match, the recursive CTE has a bug — stop and fix before proceeding to Step 4.

- [ ] **Step 4: Verify against the real function using the seeded demo account**

The demo account (`deno task seed:demo`, if not already seeded) has real session history. Run:

```sql
SELECT (analytics_summary()->'totals') AS totals;
```

authenticated as the demo user (via the Supabase SQL editor's "Run as user" or an equivalent RLS-respecting connection). Expected: a JSON object with `current_charge_pct` (0–100), `days_since_empty` (≥ 0), `longest_days_since_empty` (≥ `days_since_empty`... actually not strictly ≥, since "current" is a suffix of the window and "longest" is the max over the whole window, so `longest_days_since_empty >= days_since_empty` always holds). No errors, no nulls.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260812000000_battery_economy.sql
git commit -m "feat: replace streak analytics with gradual-drain battery charge"
```

---

### Task 2: Rewrite `gamification.ts` with the battery formula

**Files:**

- Modify: `frontend/lib/gamification.ts`

**Interfaces:**

- Consumes: nothing new (same `GamificationSession[]`, `Set<string>` subjectNames, `tz: string` inputs as today)
- Produces: `GamificationProfile` with `current_charge_pct: number`, `days_since_empty: number`, `longest_days_since_empty: number` replacing `pet_stage: PetStage`, `current_streak_days: number`, `longest_streak_days: number`. The `PetStage` type export is deleted. `computeGamificationProfile` keeps its exact name and signature — `Task 5` and `Task 6` depend on the field names above.

- [ ] **Step 1: Replace the type definitions and remove the stage system**

In `frontend/lib/gamification.ts`, replace lines 5–33 (the `PetStage` type through `GamificationProfile` interface) with:

```ts
export interface GamificationSession {
   id: string;
   duration_minutes: number;
   quality: number | null;
   logged_at: string;
}

export interface GamificationProfile {
   level: number;
   xp: number;
   xp_into_level: number;
   xp_for_next_level: number;
   progress_to_next: number;
   current_charge_pct: number;
   days_since_empty: number;
   longest_days_since_empty: number;
   total_sessions: number;
   total_minutes: number;
   mastered_count: number;
   achievements: { id: string; label: string; description: string; unlocked: boolean }[];
}
```

- [ ] **Step 2: Delete the stage-derivation code**

Delete lines 44–60 (the `PET_STAGES` array and `stageForLevel` function) entirely — a continuous charge value has no discrete lifetime stages.

- [ ] **Step 3: Rewrite the achievements list**

Replace the `ACHIEVEMENTS` array (originally lines 62–73) with:

```ts
const ACHIEVEMENTS: { id: string; label: string; description: string }[] = [
   { id: "first_step", label: "First Step", description: "Log your first session." },
   { id: "charged_up", label: "Charged Up", description: "7 days since your battery was last empty." },
   { id: "never_empty", label: "Never Empty", description: "30 days since your battery was last empty." },
   { id: "full_charge", label: "Full Charge", description: "Reach 100% charge." },
   { id: "marathon", label: "Marathon", description: "Log 100 total hours." },
   { id: "century", label: "Century", description: "Log 100 sessions." },
   { id: "polymath", label: "Polymath", description: "Study 5 different subjects." },
   { id: "mastered_five", label: "Sharpened", description: "Rate 5 sessions as Mastered." },
   { id: "dawn_patrol", label: "Dawn Patrol", description: "Study before 7am." },
   { id: "night_owl", label: "Night Owl", description: "Study after midnight." },
   { id: "sprint_day", label: "Sprint Day", description: "Log 10 sessions in a single day." },
];
```

- [ ] **Step 4: Rewrite the core loop**

Replace the body of `computeGamificationProfile` (originally lines 108–159, i.e. everything from the `dayMinutes` bucketing through the XP accumulation loop, but keep the function signature and the final `return` statement for now — that's Step 5) with:

```ts
export function computeGamificationProfile(
   sessions: GamificationSession[],
   subjectNames: Set<string>,
   tz: string,
): GamificationProfile {
   // Bucket sessions into local-tz dates so the charge boundary matches the
   // user's calendar day, not UTC midnight.
   const dayMinutes = new Map<string, number>();
   for (const s of sessions) {
      const key = localDateKey(s.logged_at, tz);
      dayMinutes.set(key, (dayMinutes.get(key) ?? 0) + s.duration_minutes);
   }

   // Build a 365-day window ending today in the user's local tz.
   const todayKey = localDateKey(new Date(), tz);
   const today = new Date(`${todayKey}T00:00:00Z`);
   const daily: { date: string; minutes: number }[] = [];
   for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      daily.push({ date: key, minutes: dayMinutes.get(key) ?? 0 });
   }

   // Battery charge: up to +20 gain/day (capped at 120 studied minutes),
   // minus a flat -8 decay every day regardless of activity, clamped to
   // [0, 100]. charge[0] (365 days ago) anchors at 0, not derived from that
   // day's own minutes.
   const DECAY_PER_DAY = 8;
   const GAIN_CAP = 20;
   const FULL_GAIN_MINUTES = 120;
   const charge = new Array<number>(daily.length).fill(0);
   for (let i = 1; i < daily.length; i++) {
      const gain = Math.min(daily[i].minutes / FULL_GAIN_MINUTES, 1) * GAIN_CAP;
      charge[i] = Math.min(100, Math.max(0, charge[i - 1] - DECAY_PER_DAY + gain));
   }
   const currentChargePct = charge[charge.length - 1];
   const reachedFullCharge = charge.some((c) => c >= 100);

   // days_since_empty: consecutive days (ending today) where charge > 0.
   const daysSinceEmptyEndingOn = new Array<number>(daily.length).fill(0);
   for (let i = 0; i < daily.length; i++) {
      if (charge[i] > 0) {
         daysSinceEmptyEndingOn[i] = (i > 0 ? daysSinceEmptyEndingOn[i - 1] : 0) + 1;
      }
   }
   const daysSinceEmpty = daysSinceEmptyEndingOn[daysSinceEmptyEndingOn.length - 1];
   let longestDaysSinceEmpty = 0;
   for (const v of daysSinceEmptyEndingOn) if (v > longestDaysSinceEmpty) longestDaysSinceEmpty = v;

   const chargeByDate = new Map<string, number>();
   for (let i = 0; i < daily.length; i++) {
      chargeByDate.set(daily[i].date, charge[i]);
   }

   // XP: (minutes + quality bonus) × charge multiplier of the day the
   // session was logged. Multiplier ramps 1.0×-2.0× with that day's charge
   // level (computed *after* that day's own gain, so a session on a
   // just-resumed day already benefits from that day's partial charge-up).
   let totalMinutes = 0;
   let masteredCount = 0;
   let totalXp = 0;
   for (const s of sessions) {
      const base = s.duration_minutes + (s.quality ?? 0) * 10;
      const dateKey = localDateKey(s.logged_at, tz);
      const chargeOnDay = chargeByDate.get(dateKey) ?? 0;
      const multiplier = 1 + chargeOnDay / 100;
      totalMinutes += s.duration_minutes;
      if (s.quality === 5) masteredCount++;
      totalXp += Math.round(base * multiplier);
   }

   const level = levelFromXp(totalXp);
   const currentLevelXp = xpForLevel(level);
   const nextLevelXp = xpForLevel(level + 1);
   const xpIntoLevel = totalXp - currentLevelXp;
   const xpForNextLevel = nextLevelXp - currentLevelXp;
   const progressToNext =
      xpForNextLevel > 0 ? Math.min(1, xpIntoLevel / xpForNextLevel) : 0;

   // Achievement unlocks.
   const totalHours = totalMinutes / 60;
   const hasDawn = sessions.some((s) => localHour(s.logged_at, tz) < 7);
   const hasNight = sessions.some((s) => {
      const h = localHour(s.logged_at, tz);
      return h >= 0 && h < 3;
   });
   const dayCounts = new Map<string, number>();
   for (const s of sessions) {
      const key = localDateKey(s.logged_at, tz);
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
   }
   const maxDay = dayCounts.size === 0 ? 0 : Math.max(...dayCounts.values());

   const unlocked = new Set<string>();
   if (sessions.length >= 1) unlocked.add("first_step");
   if (daysSinceEmpty >= 7 || longestDaysSinceEmpty >= 7) unlocked.add("charged_up");
   if (daysSinceEmpty >= 30 || longestDaysSinceEmpty >= 30) unlocked.add("never_empty");
   if (reachedFullCharge) unlocked.add("full_charge");
   if (totalHours >= 100) unlocked.add("marathon");
   if (sessions.length >= 100) unlocked.add("century");
   if (subjectNames.size >= 5) unlocked.add("polymath");
   if (masteredCount >= 5) unlocked.add("mastered_five");
   if (hasDawn) unlocked.add("dawn_patrol");
   if (hasNight) unlocked.add("night_owl");
   if (maxDay >= 10) unlocked.add("sprint_day");

   return {
      level,
      xp: totalXp,
      xp_into_level: xpIntoLevel,
      xp_for_next_level: xpForNextLevel,
      progress_to_next: progressToNext,
      current_charge_pct: Math.round(currentChargePct),
      days_since_empty: daysSinceEmpty,
      longest_days_since_empty: longestDaysSinceEmpty,
      total_sessions: sessions.length,
      total_minutes: totalMinutes,
      mastered_count: masteredCount,
      achievements: ACHIEVEMENTS.map((a) => ({ ...a, unlocked: unlocked.has(a.id) })),
   };
}
```

This subsumes the old `return` statement — the whole function body is now this single block. `levelFromXp`, `xpForLevel`, `localHour`, `localDateKey` are unchanged and stay above this function exactly as they are today.

- [ ] **Step 5: Confirm the file compiles**

Run: `deno check frontend/lib/gamification.ts`
Expected: no type errors. (This will NOT yet catch errors in `Garden.tsx`/`Analytics.tsx`/`api.ts` — those are Tasks 4–6.)

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/gamification.ts
git commit -m "feat: replace streak XP economy with gradual-drain battery charge"
```

---

### Task 3: Rewrite `gamification.test.ts` with golden-value tests

**Files:**

- Modify: `frontend/lib/gamification.test.ts`

**Interfaces:**

- Consumes: `computeGamificationProfile`, `GamificationSession` from Task 2's `gamification.ts` (unchanged import path/names)
- Produces: nothing consumed by later tasks — this is a leaf.

- [ ] **Step 1: Update the empty-input test**

Replace the `"empty sessions → zeroed profile"` test (originally lines 28–39) with:

```ts
Deno.test("empty sessions → zeroed profile", () => {
  const p = computeGamificationProfile([], new Set(), "UTC");
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
```

- [ ] **Step 2: Update the XP/level tests**

Replace the three tests under `// ── XP and levels ──` (originally lines 67–86: `"single session today earns XP with 1-day streak multiplier"`, `"quality bonus is added to XP base"`, `"level 1 requires 100 XP"`) with:

```ts
Deno.test("single session today earns XP with charge multiplier", () => {
  // gain = min(60/120,1)*20 = 10, charge = clamp(0-8+10) = 2
  // multiplier = 1 + 2/100 = 1.02, xp = round(60 * 1.02) = 61
  const p = computeGamificationProfile([session("a", 0, 60)], new Set(), "UTC");
  assertEquals(p.current_charge_pct, 2);
  assertEquals(p.xp, 61);
  assertEquals(p.level, 0); // 61 < 100 (threshold for level 1)
});

Deno.test("quality bonus is added to XP base", () => {
  // base = 60 + 5*10 = 110, charge = 2 (unaffected by quality), multiplier = 1.02
  // xp = round(110 * 1.02) = round(112.2) = 112
  const p = computeGamificationProfile([session("a", 0, 60, 5)], new Set(), "UTC");
  assertEquals(p.xp, 112);
});

Deno.test("a single 100-minute session crosses into level 1", () => {
  // gain = min(100/120,1)*20 = 16.6667, charge = clamp(0-8+16.6667) = 8.6667
  // multiplier = 1.086667, xp = round(100 * 1.086667) = round(108.667) = 109
  const p = computeGamificationProfile([session("a", 0, 100)], new Set(), "UTC");
  assertEquals(p.xp, 109);
  assertEquals(p.level, 1);
});
```

- [ ] **Step 3: Replace the 30-day accumulation test**

Replace `"30 consecutive days produces level 5 and sapling stage"` (originally lines 88–98) with:

```ts
Deno.test("30 consecutive days of 60 min/day produces level 4", () => {
  // Each day k (1-indexed): gain=10, charge_k = 2k (net +2/day, never clamps
  // since it stays within [2, 60]). xp_k = round(60 * (1 + 2k/100)).
  // Summed over k=1..30: totalXp = 1800 + 558 = 2358.
  // level = floor(sqrt(2358/100)) = floor(sqrt(23.58)) = 4.
  const sessions = Array.from({ length: 30 }, (_, i) =>
    session(String(i), 29 - i, 60)
  );
  const p = computeGamificationProfile(sessions, new Set(), "UTC");
  assertEquals(p.xp, 2358);
  assertEquals(p.level, 4);
});
```

- [ ] **Step 4: Replace the streak section with charge/days-since-empty tests**

Replace the entire `// ── Streaks ──` section (originally lines 100–139: all four tests) with:

```ts
// ── Battery charge ───────────────────────────────────────────────────────────

Deno.test("10 consecutive days of 120 min/day ramps charge to 100", () => {
  const sessions = Array.from({ length: 10 }, (_, i) =>
    session(String(i), 9 - i, 120)
  );
  const p = computeGamificationProfile(sessions, new Set(), "UTC");
  assertEquals(p.current_charge_pct, 100);
});

Deno.test("5 zero-minute days after reaching 100 drains charge to 60", () => {
  // 10 days of 120 min (daysAgo 14..5) ramps to charge=100 by the 9th day
  // and holds; then 5 zero-minute days (daysAgo 4..0) drain -8 each: 60.
  const sessions = Array.from({ length: 10 }, (_, i) =>
    session(String(i), 14 - i, 120)
  );
  const p = computeGamificationProfile(sessions, new Set(), "UTC");
  assertEquals(p.current_charge_pct, 60);
});

Deno.test("charge fully drains to 0 after enough inactive days, resetting days_since_empty", () => {
  // 10 days of 120 min (daysAgo 22..13) ramps to charge=100 and holds.
  // 13 zero-minute days (daysAgo 12..0) drain exactly to 0 by today
  // (100 - 13*8 = -4, clamped to 0).
  const sessions = Array.from({ length: 10 }, (_, i) =>
    session(String(i), 22 - i, 120)
  );
  const p = computeGamificationProfile(sessions, new Set(), "UTC");
  assertEquals(p.current_charge_pct, 0);
  assertEquals(p.days_since_empty, 0);
  // The run from daysAgo=22 through daysAgo=1 (22 days) all had charge > 0
  // before today's drain to exactly 0.
  assertEquals(p.longest_days_since_empty, 22);
});

Deno.test("multiple sessions on the same day are summed into one day's gain", () => {
  const sessions = [
    session("a", 0, 60),
    session("b", 0, 60), // same day, second session — 120 min total
  ];
  const p = computeGamificationProfile(sessions, new Set(), "UTC");
  // gain = min(120/120,1)*20 = 20, charge = clamp(0-8+20) = 12
  assertEquals(p.current_charge_pct, 12);
});
```

- [ ] **Step 5: Update the achievement tests**

Replace `"hot_streak unlocks after 7-day streak"` and `"30-day streak unlocks dedicated (and hot_streak)"` (originally lines 149–164) with:

```ts
Deno.test("charged_up unlocks after 7 days since empty", () => {
  const sessions = Array.from({ length: 7 }, (_, i) =>
    session(String(i), 6 - i, 120)
  );
  const p = computeGamificationProfile(sessions, new Set(), "UTC");
  assertEquals(p.days_since_empty, 7);
  assertEquals(p.achievements.find((x) => x.id === "charged_up")?.unlocked, true);
  assertEquals(p.achievements.find((x) => x.id === "never_empty")?.unlocked, false);
  assertEquals(p.achievements.find((x) => x.id === "full_charge")?.unlocked, false);
});

Deno.test("30 days since empty unlocks never_empty and full_charge", () => {
  const sessions = Array.from({ length: 30 }, (_, i) =>
    session(String(i), 29 - i, 120)
  );
  const p = computeGamificationProfile(sessions, new Set(), "UTC");
  assertEquals(p.days_since_empty, 30);
  assertEquals(p.achievements.find((x) => x.id === "charged_up")?.unlocked, true);
  assertEquals(p.achievements.find((x) => x.id === "never_empty")?.unlocked, true);
  assertEquals(p.achievements.find((x) => x.id === "full_charge")?.unlocked, true);
});
```

- [ ] **Step 6: Leave the remaining tests unchanged**

`"total_minutes and total_sessions are summed correctly"`, `"mastered_count counts quality-5 sessions only"`, `"first_step unlocked after one session"`, `"polymath unlocks with 5 distinct subjects"`, `"polymath does not unlock with fewer than 5 subjects"`, `"mastered_five unlocks after 5 quality-5 sessions"`, `"dawn_patrol unlocks for a session before 7am UTC"`, `"dawn_patrol does not unlock for a session at 7am or later"`, `"night_owl unlocks for a session between midnight and 3am"`, `"sprint_day unlocks for 10 sessions in one day"`, `"xp_for_next_level at level 0 is 100"`, and `"progress_to_next is between 0 and 1 while leveling"` don't reference `pet_stage` or streak fields — leave them exactly as they are.

- [ ] **Step 7: Run the full test file**

Run: `deno test frontend/lib/gamification.test.ts`
Expected: all tests pass. If any golden-value assertion fails, re-derive the arithmetic by hand against the formula in the Global Constraints section before changing the expected value — these numbers were hand-verified during planning, so a failure most likely means Task 2's implementation has a bug, not that the test is wrong.

- [ ] **Step 8: Commit**

```bash
git add frontend/lib/gamification.test.ts
git commit -m "test: rewrite gamification tests for battery charge economy"
```

---

### Task 4: Update `api.ts`'s `AnalyticsResult` type

**Files:**

- Modify: `frontend/lib/api.ts:435-440`

**Interfaces:**

- Consumes: the `totals` shape Task 1's SQL now returns
- Produces: `AnalyticsResult` type consumed by `Analytics.tsx` (Task 6)

- [ ] **Step 1: Update the type**

In `frontend/lib/api.ts`, replace:

```ts
   totals: {
      minutes: number;
      sessions_last_365: number;
      current_streak_days: number;
      longest_streak_days: number;
   };
```

with:

```ts
   totals: {
      minutes: number;
      sessions_last_365: number;
      current_charge_pct: number;
      days_since_empty: number;
      longest_days_since_empty: number;
   };
```

- [ ] **Step 2: Confirm the file compiles**

Run: `deno check frontend/lib/api.ts`
Expected: no type errors from this change (unrelated pre-existing errors, if any, are not this task's concern).

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat: rename AnalyticsResult.totals fields for battery charge economy"
```

---

### Task 5: Update `Garden.tsx` to compile against the new profile shape

**Files:**

- Modify: `frontend/app/components/Garden.tsx`

**Interfaces:**

- Consumes: `GamificationProfile` from Task 2 (`current_charge_pct`, `days_since_empty`)
- Produces: nothing consumed by later tasks

This page still renders `VirtualPlant`, which is untouched in this plan (sub-project 2's job). The fix here is a **temporary bridge**: bucket `current_charge_pct` into the same six stage names `VirtualPlant`/`PlantStage` already expect, purely so this page keeps compiling and showing something coherent. It's marked for removal.

- [ ] **Step 1: Add the temporary stage-from-charge bridge**

In `frontend/app/components/Garden.tsx`, after the `STAGE_LABEL` constant (after line 18), add:

```tsx
// TEMPORARY BRIDGE — remove when sub-project 2 replaces VirtualPlant with a
// battery component. current_charge_pct (0-100) buckets evenly into the old
// six-stage names purely so this page keeps compiling and rendering
// something coherent in the meantime.
function stageFromCharge(pct: number): PlantStage {
  if (pct <= 0) return "seed";
  if (pct <= 20) return "sprout";
  if (pct <= 40) return "sapling";
  if (pct <= 60) return "young_tree";
  if (pct <= 80) return "mature_tree";
  return "blooming";
}
```

- [ ] **Step 2: Update the `VirtualPlant` render**

Replace (originally lines 67–70):

```tsx
                  <VirtualPlant stage={profile.pet_stage} size={160} />
                  <div className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {STAGE_LABEL[profile.pet_stage]}
                  </div>
```

with:

```tsx
                  <VirtualPlant stage={stageFromCharge(profile.current_charge_pct)} size={160} />
                  <div className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {STAGE_LABEL[stageFromCharge(profile.current_charge_pct)]}
                  </div>
```

- [ ] **Step 3: Update the stat boxes**

Replace (originally lines 103–113):

```tsx
                  <StatBox
                    icon={<Flame className="w-4 h-4" />}
                    label="Current streak"
                    value={`${profile.current_streak_days}d`}
                    accent
                  />
                  <StatBox
                    icon={<Flame className="w-4 h-4" />}
                    label="Longest streak"
                    value={`${profile.longest_streak_days}d`}
                  />
```

with:

```tsx
                  <StatBox
                    icon={<Flame className="w-4 h-4" />}
                    label="Current charge"
                    value={`${profile.current_charge_pct}%`}
                    accent
                  />
                  <StatBox
                    icon={<Flame className="w-4 h-4" />}
                    label="Days since empty"
                    value={`${profile.days_since_empty}d`}
                  />
```

No new imports are needed — `Flame` is already imported (line 3), and no other lines in this file reference `pet_stage`, `current_streak_days`, or `longest_streak_days`.

- [ ] **Step 4: Confirm the file compiles**

Run: `deno check frontend/app/components/Garden.tsx`
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/components/Garden.tsx
git commit -m "fix: bridge Garden.tsx to the battery charge profile shape"
```

---

### Task 6: Update `Analytics.tsx` to read the new totals fields

**Files:**

- Modify: `frontend/app/components/Analytics.tsx:155-165`

**Interfaces:**

- Consumes: `AnalyticsResult.totals` from Task 4 (`current_charge_pct`, `days_since_empty`)
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Update the stat cards**

Replace (originally lines 155–165):

```tsx
              <StatCard
                label="Current streak"
                value={`${data.totals.current_streak_days}d`}
                icon={<Flame className="w-4 h-4" />}
                accent
              />
              <StatCard
                label="Longest streak"
                value={`${data.totals.longest_streak_days}d`}
                icon={<Flame className="w-4 h-4" />}
              />
```

with:

```tsx
              <StatCard
                label="Current charge"
                value={`${data.totals.current_charge_pct}%`}
                icon={<Flame className="w-4 h-4" />}
                accent
              />
              <StatCard
                label="Days since empty"
                value={`${data.totals.days_since_empty}d`}
                icon={<Flame className="w-4 h-4" />}
              />
```

`Flame` is already imported in this file (`frontend/app/components/Analytics.tsx:9`, part of the existing `lucide-react` import block) — no import changes needed.

- [ ] **Step 2: Confirm the file compiles**

Run: `deno check frontend/app/components/Analytics.tsx`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/Analytics.tsx
git commit -m "fix: bridge Analytics.tsx to the battery charge totals shape"
```

---

### Task 7: Full test suite + SQL/TS parity check

**Files:** none created or modified — this is a verification-only task.

**Interfaces:**

- Consumes: everything from Tasks 1–6
- Produces: nothing — this is the plan's final gate

- [ ] **Step 1: Run the full unit test suite**

Run: `deno task test:unit`
Expected: all tests pass, including the rewritten `gamification.test.ts` from Task 3 and the untouched `format.test.ts`/`password.test.ts`/`avatar.test.ts`.

- [ ] **Step 2: Typecheck the whole project**

Run: `deno task check`
Expected: no errors. This is the authoritative check that Tasks 4–6 caught every consumer of the removed `pet_stage`/`current_streak_days`/`longest_streak_days` fields — if anything was missed, it surfaces here.

- [ ] **Step 3: SQL/TS parity check against the seeded demo account**

The SQL (Task 1) and TypeScript (Task 2) implementations are independent — they must agree on the same input. Using the existing demo account (seed via `deno task seed:demo` if not already seeded):

1. Query the SQL side: `SELECT analytics_summary()->'totals' AS totals;` (as the demo user).
2. Query the TS side: call `api.gamificationProfile()` from a browser console while signed in as the demo user (or write a small throwaway Deno script that calls `computeGamificationProfile` with the demo account's actual `study_sessions` rows, fetched via the Supabase client).
3. Compare `current_charge_pct` (SQL) against `current_charge_pct` (TS), and `days_since_empty`/`longest_days_since_empty` (SQL) against the same fields (TS).

Expected: identical values. **Caveat:** the SQL side buckets sessions by UTC calendar day (`AT TIME ZONE 'UTC'`, unchanged from before), while the TS side buckets by the caller's local timezone (`localDateKey`, also unchanged from before) — this is a pre-existing divergence in the old streak system too, not something this plan introduces or fixes. For an exact parity check, run the comparison with the demo account's timezone set to UTC (already the case per `playwright.tour.config.ts`'s `timezoneId: "UTC"` pin, per the comment in `e2e/setup/seed-demo-history.ts`).

If the two sides disagree, re-check Task 1's recursive CTE and Task 2's loop against the Global Constraints formula — they must implement identical math.

- [ ] **Step 4: Note the expected e2e/demo breakage (do not fix — out of scope)**

Run: `deno task test:e2e` and separately inspect `e2e/setup/seed-demo-history.ts`'s output.
Expected: failures in tests/scripts that assert `pet_stage` values (e.g. `young_tree`/`mature_tree` transitions) or `current_streak_days`/`longest_streak_days`. This is expected per the spec — these are fixed in sub-project 6 (demo trailer re-shoot), not this plan. Leave them failing/visible; do not skip, silence, or patch them here.

This task has no commit — it's a verification pass. If Steps 1–3 all pass and Step 4's failures are limited to the expected streak/pet_stage references, the battery economy sub-project is complete.
