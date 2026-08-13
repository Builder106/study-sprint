# Battery economy — design

**Status:** approved, ready for implementation planning
**Sub-project:** 1 of 6 in the plant→electricity pivot (see decomposition below)
**Depends on:** nothing (this is the foundation everything else reads from)

## Why

StudySprint's name and logo (a lightning bolt) don't match its current core
metaphor: a plant that grows through six lifetime stages, fed by a
day-streak habit tracker. This spec replaces the streak/plant XP economy
with a battery that charges from studying and drains gradually when idle.
It is scoped to data and math only — no new SVG art, no page renames, no
copy changes. Those are separate sub-projects (2–6, listed at the bottom)
that consume this one's output.

## Current system (for reference)

Two independent implementations compute a "streak" today:

- `supabase/migrations/20260507000400_analytics_summary_date_cast.sql` —
  a Postgres RPC using a gap-and-island CTE over a 365-day window, feeding
  `Analytics.tsx`.
- `frontend/lib/gamification.ts` — a client-side day-by-day loop feeding
  `Dashboard.tsx` / `Garden.tsx`, which also derives the XP multiplier,
  `pet_stage`, and streak-based achievements.

Both are fully derived from `study_sessions` on every request — nothing is
stored. That's why this migration needs no backfill.

## The formula

Computed once per local calendar day, walking forward across the same
365-day window both implementations already use:

```
gain[day]   = min(minutes_studied_that_day / 120, 1) × 20
charge[day] = clamp(0, 100, charge[day-1] − 8 + gain[day])
```

- `charge[0]` (365 days ago) starts at 0.
- Decay is a flat −8 applied every day, whether or not the user studied.
- Gain caps at +20, reached at 120 minutes (2 hours) studied that day;
  partial minutes give proportional partial gain.
- Net effect: studying ≥ ~53 min/day on average holds charge steady;
  more than that ramps toward 100; less drains toward 0. All three
  constants (`DECAY = 8`, `GAIN_CAP = 20`, `FULL_GAIN_MINUTES = 120`) are
  named and isolated so they can be retuned without touching the formula
  shape.

### Streak-equivalent

- `days_since_empty` — count of consecutive days (ending today) where
  `charge[day] > 0`. Replaces `current_streak_days`.
- `longest_days_since_empty` — longest such run in the 365-day window.
  Replaces `longest_streak_days`.

This is more forgiving than today's hard streak-break (missing one day
costs 8 points, not the whole run) while still rewarding consistency.

### XP multiplier

Replaces `1 + streakOnDay/30` (old, ramped 1.0×–2.0× over 30 streak days)
with:

```
multiplier[day] = 1 + charge[day] / 100
```

Same 1.0×–2.0× range, now driven by that day's charge level (computed
*after* applying that day's gain, matching the old system's
"streak-as-of-that-day" behavior — a session on a day you're studying
already benefits from that day's partial charge-up).

### Achievements

| Old (streak-based) | New (charge-based) | Threshold |
|---|---|---|
| Hot Streak — 7 days in a row | **Charged Up** | `days_since_empty >= 7` (current or longest) |
| Dedicated — 30 days in a row | **Never Empty** | `days_since_empty >= 30` (current or longest) |
| *(none)* | **Full Charge** *(new)* | `charge[day] >= 100` reached at least once in the window |

All other achievements (`first_step`, `marathon`, `century`, `polymath`,
`mastered_five`, `dawn_patrol`, `night_owl`, `sprint_day`) are untouched —
none of them reference streak.

## Data flow

**Postgres (`analytics_summary` RPC):** the gap-and-island CTEs are
replaced by a recursive CTE that walks the 365-day `daily` series in
order, carrying `charge[day-1]` forward into `charge[day]`. This is more
structurally novel than the current window-function trick, but recursive
CTEs are standard Postgres and the recursion depth is fixed at 365 —
no runaway-recursion risk. Returned totals become `current_charge_pct`,
`days_since_empty`, `longest_days_since_empty` (renaming
`current_streak_days`/`longest_streak_days`).

**Client (`gamification.ts`):** already loops the 365-day window
day-by-day for the old streak calc; the loop body swaps from streak
increment/reset to the gain/decay/clamp formula. `PetStage` and
`stageForLevel`/`PET_STAGES` are deleted — a continuous charge value has
no discrete lifetime stages. `GamificationProfile.pet_stage: PetStage` is
replaced by `current_charge_pct: number`.

**Consolidation:** because both implementations need rewriting anyway,
this spec is the single source of truth for the math. Both must implement
it identically — see parity testing below.

## API contract changes

`GamificationProfile` (client) and the `totals` object returned by
`analytics_summary()` (SQL):

| Removed | Added |
|---|---|
| `pet_stage: PetStage` | `current_charge_pct: number` (0–100) |
| `current_streak_days: number` | `days_since_empty: number` |
| `longest_streak_days: number` | `longest_days_since_empty: number` |

`level`, `xp`, `xp_into_level`, `xp_for_next_level`, `progress_to_next`,
`total_sessions`, `total_minutes`, `mastered_count`, `achievements` are
unchanged in shape (achievement `id`/`label`/`description` values change
per the table above, but the array shape doesn't).

The `PetStage` type export is deleted from `gamification.ts`. Any
consumer importing it (checked: `VirtualPlant.tsx`, `Landing.tsx`,
`Dashboard.tsx`) is out of scope for this sub-project — sub-project 2
(battery visual component) replaces those consumers as its own unit of
work. This spec's implementation plan should NOT touch those files beyond
what's needed to keep the build compiling (e.g., a consumer may need a
temporary local stage derivation from `current_charge_pct` until
sub-project 2 lands — implementation plan to decide the least-churn
option).

## Error handling

No new error-handling surface. Local-calendar-day bucketing
(`localDateKey` / `AT TIME ZONE`) and its DST/timezone-shift handling
carry over unchanged from the existing implementation — this spec only
changes what happens *within* each day's bucket, not how buckets are
formed.

## Testing

1. **Golden-value unit tests** (client formula, `gamification.ts`):
   - 10 consecutive days of 120+ min/day → charge ramps to 100 and holds.
   - 5 consecutive zero-minute days from charge=100 → charge lands at 60
     (100 − 5×8).
   - A session pattern that produces `days_since_empty` crossing 7 and 30
     → `charged_up` / `never_empty` unlock at the right day.
   - A session pattern reaching `charge == 100` → `full_charge` unlocks.
2. **SQL/TS parity check:** run both implementations against the same
   seeded `study_sessions` fixture (the existing demo-seed data in
   `e2e/setup/seed-demo-history.ts` is a reasonable source) and assert
   identical `current_charge_pct` / `days_since_empty` output. This is
   the guard against the two implementations drifting, same risk that
   already existed with the old duplicated streak logic.
3. **Out of scope for this sub-project's tests:** existing e2e specs and
   `trailer/` demo assertions that reference streak-day numbers will fail
   the moment this ships. That's expected — they're fixed in sub-project
   6 (demo trailer re-shoot), not here. The implementation plan for this
   sub-project should leave those failures visible (not silence or skip
   them), so sub-project 6 has an accurate list of what needs updating.

## Rollout

No data migration. Both implementations are fully derived from
`study_sessions` on every request, so the change takes effect immediately
for all users' full history the moment the RPC and client function ship —
there's no "day zero" transition state to design for.

## Out of scope (tracked as separate sub-projects)

1. **Data model & XP economy** — this document.
2. **Battery visual component** — replaces `VirtualPlant`/`PetStage`
   rendering with a battery (fill/glow, motion, a11y labels) driven by
   `current_charge_pct`.
3. **Dashboard & `/garden` page rework** — rename/restructure; decide
   what "the whole garden" (collected plants over time) becomes in a
   battery world.
4. **Landing page pivot** — copy and hero visual, replacing tonight's
   pot/soil/tree work with electric language.
5. **Copy & docs sweep** — `Terms.tsx`, `DESIGN.md` rewrite, e2e test
   copy.
6. **Demo trailer re-shoot** — `trailer/Composition.tsx` etc. reference
   real seeded streak stats; re-cut once 1–3 are real.
