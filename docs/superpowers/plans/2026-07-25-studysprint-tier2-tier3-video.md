# StudySprint Tier 2 (UI tour) & Tier 3 (trailer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a synthetic-history seeder for the StudySprint demo account, then produce a ~75s Tier 2 "UI tour" video (landscape + vertical social cut) and a ~50s Tier 3 generative trailer, following the shot lists and beat sheets specified below.

**Architecture:** A Deno seeder script plants realistic multi-month history (sessions, streak, achievements, social leaderboard) onto the production Supabase project via the service-role key. Playwright (in a new DEMO-only config) records raw footage of the seeded account performing eight product beats. Two standalone Remotion projects (`ui-demo/` for Tier 2, `trailer/` for Tier 3) assemble that footage — plus, for Tier 3, a from-scratch generative grid/plant animation — into final renders. All Node dependency installs and Remotion renders happen on the `ampere-dev` VM inside `tmux`, never on the Mac (regenerable directories stay off the local disk per the user's global tooling rules); footage and render outputs are rsynced between the two machines.

**Tech Stack:** Deno + `@supabase/supabase-js`, Playwright + `playwright-bdd`, Remotion 4.x + `@remotion/media` + `@remotion/tailwind-v4`, ffmpeg (`freezedetect`/`silencedetect`/`ebur128`).

**Companion reading (not required, background only):** `docs/tier2-3-planning-prompt.md` in this repo is the original prose spec this plan was derived from — every load-bearing value from it is inlined into the tasks below, so no task requires opening it, but it has extra narrative color on *why* if a task's rationale is unclear. MicroMatch's `ui-demo/` and `trailer/` Remotion projects (sibling repo, path given in Task 3 / Task 4) are the structural pattern to mirror — read their actual source rather than guessing the shape.

## Global Constraints

- **No Blender, no screen-recording, no 3D for Tier 3.** Trailer is pure Remotion, generative (grid + plant), driven by `useCurrentFrame()` — never wall-clock/`motion/react` animation, since that breaks deterministic frame rendering.
- **Never modify `playwright.demo.config.ts`.** It is pinned at 1440×900 and produced the 8 committed Tier 1 GIFs already in `docs/gifs/`. Tier 2 recording uses a brand-new `playwright.tour.config.ts` at 2560×1600.
- **All `npm install` / Node dependency installs / Remotion renders run on the `ampere-dev` VM inside `tmux`**, never on the Mac — `node_modules` is a regenerable directory. Rsync footage/assets up, run the build there, rsync renders back. Use `/Users/yinkavaughan/bin/verify-on-vm` for typecheck-only checks; for anything producing a real output artifact (render, recording), the task must SSH into `ampere-dev` and run inside a named `tmux` session so it survives a dropped connection — never a bare one-shot SSH command for a long render.
- **Fixed-seed PRNG only, full delete-and-regenerate every seeder run.** No `Math.random()`. The seeder must delete all of the demo account's existing `study_goals` (and cascaded `study_sessions`) before regenerating, so dark/light recording passes see identical data and re-running the seeder is idempotent.
- **`*.mp4` / `*.webm` are gitignored repo-wide** (see `.gitignore:48-50`). Any task that adds footage/render files that must be committed (`ui-demo/public/*.mp4`, `trailer/public/*.mp4`) must add explicit `!` negation lines to `.gitignore`, mirroring MicroMatch's `ui-demo/.gitignore` / `trailer/.gitignore`.
- **`DEMO=1` must be set on both halves of any recording invocation** (`bddgen` AND `playwright test`) — a mismatch means every DEMO-only hook (cursor, zoom, theme-pin, dwell) silently no-ops.
- **Never pass `--reporter` on the Playwright CLI.** It replaces the config's reporter array; `e2e/reporter.ts` is what converts `.webm` → `.mp4` and does the 00-warmup cleanup. Overriding it means recordings silently never appear as mp4.
- **Any new demo feature file must sort after `e2e/demo/features/00-warmup.feature`** (lexicographic — e.g. `10-tour.feature`), and the reporter's `slug.startsWith("00-warmup")` check (`e2e/reporter.ts:81`) must still match the warmup file's slug, or the first real recording comes back 0 bytes (Playwright/slowMo/video bug the warmup exists to absorb).
- **Synthetic production users are real rows on the live project behind getstudysprint.vercel.app.** Every one must be identifiable by one unambiguous marker (emails at `@demo.studysprint.invalid`, usernames prefixed `ss_demo_`) so teardown can enumerate on that marker alone — never a hardcoded id list. Names must read as obviously fictional. `profiles` cascades from `auth.users`, not the other way around — teardown deletes the `auth.users` row (via `admin.auth.admin.deleteUser`), which cascades everything else.
- **Analytics windowing:** `analytics_summary`'s `totals`/`daily` fields are bounded to 365 days; `hourly`/`weekday`/`by_subject` are all-time (unbounded). Every seeded session must be dated within 365 days of "today" or the on-screen "Total (365d)" figure will visibly disagree with the subject donut / hour chart sums.
- **Heatmap intensity buckets are ratio-of-max** (`frontend/app/pages/Analytics.tsx:70` — confirm exact line when editing). A single outlier day washes every other day into the lowest bucket. Cap daily totals near the seeded max (~240 min) rather than letting one day run away.
- **Streak requires a session dated "today" in the local calendar.** `gamification.ts:135`'s `current_streak_days` reads the last cell of a rolling local-tz window; both the dark and light recording passes must run on the same local calendar day as the seed, or the streak silently reads 0 in whichever pass crosses local midnight.
- **`/garden`'s streak and `/analytics`'s streak use different timezone buckets** (browser-local vs. UTC, per migration `20260507000400`). To keep both readable on camera without contradiction, constrain the most recent ~35 days of `logged_at` timestamps to hours that fall on the same calendar date in both UTC and the recording machine's local timezone (Pacific: local 00:00–16:59), and never show both streak numbers in the same shot.
- **Never fade a Remotion scene's outer `<AbsoluteFill>` to transparent** — it fades to encoder black, not to the next scene. Fade only inner wrapper elements; keep the composition's background at full opacity for its entire duration.
- **Render verification is always at ffmpeg's default log level.** `-v error` silences `freezedetect`/`silencedetect` output and produces a false all-clear — never pass it when checking a render.

---

### Task 1: Synthetic-history seeder + teardown

**Files:**
- Create: `e2e/setup/seed-demo-history.ts`
- Create: `e2e/setup/teardown-demo-history.ts`
- Modify: `deno.json` — add `seed:demo` and `seed:demo:teardown` tasks

**Interfaces:**
- Consumes: `SUPABASE_URL`/`VITE_SUPABASE_URL` + `SUPABASE_SECRET_KEY` env vars (already in `.env`, loaded via `import "jsr:@std/dotenv/load"`, same pattern as `e2e/setup/bootstrap-demo.ts`); the demo account created by `deno task test:setup` (`demo@studysprint.app`); the `create_starter_data_for` RPC pattern (do **not** call it — this script replaces its output for the demo account with real history).
- Produces: a demo account (`demo@studysprint.app`) with seeded goals/sessions/achievements/social profile that Tasks 2–4 read as ground truth. The exact numbers this task produces (XP, streak, subject mix) become the literal values Task 2's recorded session and Task 4's beat-4 counters must match — **write down the actual final numbers you get in the report file**, since Tasks 2 and 4 need them verbatim and cannot re-derive them.

Both new files go in `e2e/setup/` (already in `deno.json`'s `fmt.include` — no edit needed there, it's covered as a directory).

- [ ] **Step 1: Write the fixed-seed PRNG and XP-convergence helpers**

In `e2e/setup/seed-demo-history.ts`, start with a deterministic mulberry32 PRNG (seeded from a fixed constant, e.g. `0x53545559` — "STUY" — any fixed literal is fine, just never `Math.random()` or a time-based seed):

```typescript
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(0x53545559);
```

The target XP formula mirrors `frontend/lib/gamification.ts` exactly (confirmed current as of this plan — `computeGamificationProfile`):

```
sessionXp = round( (duration_minutes + (quality ?? 0) * 10) * (1 + min(streakOnThatDay / 30, 1)) )
level      = floor(sqrt(totalXp / 100))
PET_STAGES: sprout=1, sapling=4, young_tree=8, mature_tree=14, blooming=22 (by level)
```

Tier 2's beat 3 will log a **90-minute session rated Mastered (quality 5)** live during recording: `(90 + 50) × 2 = 280 XP` (streak is maxed by then, multiplier caps at 2×). Seed the account so it sits **just under** the `mature_tree` line (level 14 = 19,600 XP) before that session, and crosses it after.

- **Target seeded XP: 19,450 ± 50** — i.e. anywhere in `[19,320, 19,590]`. That's level 13 (`young_tree`, since young_tree starts at level 8 and mature_tree at level 14) before the recorded session, level 14 (`mature_tree`) after. This is the single most important number in this task — write a comment directly above the constant explaining the coupling to Task 2's 90-minute/quality-5 session, so a future edit to either side doesn't silently break the stage flip with no error anywhere.

- [ ] **Step 2: Generate the goal set (6 goals, 5 subjects)**

Reuse the 5 subject names already seeded by `seed_starter_subjects()` (`Computer Science`, `Mathematics`, `Languages`, `Writing`, `Science`) — query `public.subjects` for their ids rather than inserting new ones. Create 6 `study_goals` rows for the demo user:

| # | Title | Status | Subject(s) |
|---|---|---|---|
| 1 | Data Structures deep dive | Active | Computer Science |
| 2 | Linear algebra review | Active | Mathematics |
| 3 | Spanish conversation practice | Active | Languages |
| 4 | Personal essay revision | Completed | Writing |
| 5 | Intro biology midterm prep | Completed | Science |
| 6 | Algorithms interview prep | Paused | Computer Science |

Insert goals first via the service-role client, keep their returned `id`s in a map keyed by subject name (or by goal index) — `study_sessions` has **no `user_id` column**; every session references a `goal_id`, and ownership is transitive through `study_goals.user_id`.

- [ ] **Step 3: Generate the session history across three windows**

Anchor on `todayLocal` in `America/Los_Angeles` (the recording machine's timezone — confirm this matches the box that will actually record; if it's a different IANA zone, substitute it everywhere in this task and Task 2). Generate `study_sessions` rows (columns: `goal_id`, `duration_minutes` integer `CHECK > 0`, `notes`, `logged_at` timestamptz, `quality` 1–5 or null, `next_review_at`) with this shape, using `rng()` for all randomization:

| Window (days back from today) | Coverage | Sessions/active day | Duration (min) | Quality |
|---|---|---|---|---|
| 0–44 (the streak) | every day, **zero gaps** | 1–2 | 45–150 | mostly 3–5 |
| 45–180 | ~30% of days, clustered in runs | 1 | 30–120 | 2–4 |
| 181–364 | ~12% of days, sparse | 1 | 20–75 | null or 2–3 |

Target overall: roughly 95 sessions over ~85 active days, ~130 total hours. Do **not** hand-place every session — generate the shape from the table via `rng()`-driven day/duration/quality picks, so the day-45→0 window trends visibly denser than day-364→181 (this ramp is itself the readable "getting serious" shape on the heatmap).

**One session must be dated today** (local calendar day) — required for `current_streak_days` to read non-zero (see Global Constraints).

**Timezone-consistency constraint** for the most recent ~35 days only: constrain `logged_at` so the UTC calendar date and the `America/Los_Angeles` calendar date agree — i.e. pick local hours in `00:00–16:59` Pacific for those days (UTC offset means 17:00–23:59 Pacific crosses into the next UTC day). Days 36–364 can use any hour (this is what gives the hour-of-day chart its bimodal, weekday-heavy shape — see Step 4).

`next_review_at` mirrors the spaced-repetition mapping in `frontend/lib/api.ts:198-204` (`QUALITY_REVIEW_DAYS`): quality 1→+1d, 2→+2d, 3→+4d, 4→+7d, 5→+14d from `logged_at`; null quality → `next_review_at` is null.

Cap any single day's total minutes near **240** (4 hours) — the heatmap buckets are ratio-of-max, so one long outlier day (e.g. a 6-hour session) would wash every other day into the lowest intensity bucket.

- [ ] **Step 4: Shape the hour-of-day and weekday distribution, and hit the 5-subject donut split**

For session timestamps, bias generation so mornings (7–9am local) and evenings (7–10pm local) are overrepresented relative to midday — a simple two-Gaussian-ish pick via `rng()` (e.g. 50% pick an hour in `[7,10)`, 35% in `[19,22)`, 15% uniform elsewhere) is sufficient; it doesn't need to be statistically rigorous, just visibly bimodal on the rendered chart. Bias day-of-week so weekdays (Mon–Fri) get roughly 2.5× the session count of weekend days.

Distribute sessions across the 5 goals/subjects so the subject-donut share comes out uneven: roughly Computer Science 35%, Mathematics 25%, Languages 18%, Writing 12%, Science 10% of total logged minutes. This falls out naturally if you weight the Step 3 generation loop by a fixed per-subject weight array `[0.35, 0.25, 0.18, 0.12, 0.10]` when picking which goal a given session belongs to.

- [ ] **Step 5: Compute total XP and run the convergence loop**

After generating the full session set, compute total XP by replicating the exact formula from Step 1 in TypeScript (do not import from `frontend/lib/gamification.ts` — this script runs under Deno against raw generated data, not through the app; re-implement the same three-line formula). Compare to the target band `[19,320, 19,590]`.

If outside the band, add or remove small filler sessions **only in the 181–364-day window** — `duration_minutes: 20–25`, `quality: null`, `next_review_at: null`. Because quality is null and the day-181-364 streak multiplier is ≈1.0, each filler session moves total XP by roughly its `duration_minutes` (~20–25 XP). Loop: recompute total XP after each filler add/remove, stop once inside the band. Use recent-window (0–44) sessions for coarse adjustment only if the filler loop alone can't reach the band after ~30 iterations (it should not need to).

Log the final computed XP, level, pet_stage-before, streak, and per-subject minute totals to stdout — the task report must include these exact numbers verbatim, since Task 2's recorded session and Task 4's beat-4 on-screen counters depend on them.

- [ ] **Step 6: Verify achievement unlock/lock targets**

Cross-check the generated data unlocks exactly 8 of `ACHIEVEMENTS` (`frontend/lib/gamification.ts:62-73`) and leaves exactly 2 locked:
- `first_step` — unlocked (≥1 session, trivially true)
- `hot_streak` — unlocked (streak ≥7)
- `dedicated` — unlocked (streak ≥30 — the 0–44-day window guarantees this)
- `marathon` — unlocked (≥100 total hours — verify the ~130-hour target clears this; if generation shape drifts under 100h, bias Step 3's duration ranges upward slightly)
- `century` — **locked on purpose**: keep total session count under 100 (the ~95-session target from Step 3 already satisfies this; verify after convergence filler additions in Step 5 don't push it to ≥100 — if they would, use larger/fewer filler sessions instead of more small ones)
- `polymath` — unlocked (5 distinct subjects — guaranteed by Step 2's goal set)
- `mastered_five` — unlocked (≥5 sessions with `quality === 5` — the "mostly 3–5" quality range in the 0–44 window must include enough 5s; bias explicitly if `rng()` alone doesn't produce ≥5)
- `dawn_patrol` — unlocked (≥1 session before 07:00 local — force one specific session in the generation loop to e.g. 06:15 local if the bimodal distribution in Step 4 doesn't naturally produce one)
- `night_owl` — unlocked (≥1 session between 00:00–03:00 local — same approach, force one at e.g. 01:30 local)
- `sprint_day` — **locked on purpose**: no single calendar day may accumulate ≥10 sessions (Step 3's "1–2 sessions/active day" cap already satisfies this — verify no day exceeds 9)

- [ ] **Step 7: Social seeding — the demo account's own profile**

Set on the demo account's `profiles` row: `username` (e.g. `demo_studysprint`), `is_public = true`, `display_name`, `bio`. Without this the Community page shows the "pick a username" CTA instead of a profile card.

- [ ] **Step 8: Social seeding — ~8 synthetic public users**

Create 8 `auth.users` via `admin.auth.admin.createUser` (mirror `bootstrap-demo.ts`'s `ensureUser` pattern — check-then-create/update, not blind insert) with:
- Emails at `@demo.studysprint.invalid` (e.g. `ss_demo_maya@demo.studysprint.invalid`) — the sole teardown marker for `auth.users`.
- `profiles.username` prefixed `ss_demo_` (e.g. `ss_demo_maya`), `is_public = true`, obviously fictional `display_name`s (first names + a whimsical or clearly-fake surname — avoid anything that reads as a plausible real stranger).

`leaderboard()` filters `is_public = TRUE AND username IS NOT NULL` and joins sessions from the **last 7 days** — each synthetic user needs a `study_goals` row (any subject) plus a handful of `study_sessions` dated within the last 7 days so their leaderboard minutes are non-zero. Distribute minutes so the **demo account ranks around #3** — give 2 synthetics more last-7-day minutes than the demo account, and 6 fewer.

- [ ] **Step 9: Social seeding — one study room**

Call `create_room` (as the demo account or a synthetic user — whichever the RPC's auth model requires; check the function signature in `supabase/migrations/` if unclear) to create one room, then join 3–4 of the 8 synthetics to it via `room_members`, with `study_sessions` timestamps inside the **last 48 hours** — `get_room`'s activity feed caps at 48h; anything older leaves the feed empty on camera.

- [ ] **Step 10: Wire deno.json tasks**

Add to `deno.json`'s `"tasks"` object:
```json
"seed:demo": "deno run -A e2e/setup/seed-demo-history.ts",
"seed:demo:teardown": "deno run -A e2e/setup/teardown-demo-history.ts"
```

- [ ] **Step 11: Write the teardown script**

`e2e/setup/teardown-demo-history.ts`: enumerate `auth.users` via paginated `admin.auth.admin.listUsers` (same pattern as `findUserByEmail` in `bootstrap-demo.ts`), filter to emails ending `@demo.studysprint.invalid`, and call `admin.auth.admin.deleteUser(id)` for each — this cascades `profiles`, `study_goals`, `study_sessions`, `room_members` for that user. Do **not** touch the demo account itself (`demo@studysprint.app`) — only delete rows for the `@demo.studysprint.invalid` marker. Log each deleted email to stdout. This script is not run as part of this task's verification (the synthetic users must stay live through Tasks 2–4) — it's exercised for real in Task 5.

- [ ] **Step 12: Run and verify**

Run `deno task test:setup && deno task seed:demo`. Then check in a browser (or via `mcp__supabase__execute_sql` against the production project, read-only queries only):
- `/garden` (logged in as `demo@studysprint.app`, password from `.env`'s `E2E_DEMO_PASSWORD` or the `bootstrap-demo.ts` default `demo123`): `pet_stage === "young_tree"`, `current_streak_days ≥ 40`, achievements panel shows 8/10 unlocked with `century` and `sprint_day` locked.
- `/analytics`: heatmap has visible texture across multiple intensity buckets (not a single flat color), subject donut shows 5 slices in the ~35/25/18/12/10 order, hour-of-day and weekday bar charts both have visible shape (not flat).
- `/community`: leaderboard populated with 8 synthetic users + the demo account, demo account ranked ~#3, a study room exists with 3–4 members and a non-empty activity feed.

- [ ] **Step 13: Verify determinism**

Run `deno task seed:demo` a second time. Query `study_sessions` totals (count, sum of `duration_minutes`, computed XP) before and after — they must be identical. If they differ, the PRNG seed or generation loop has a non-deterministic input (system clock leaking into a random choice, `Date.now()` used instead of the fixed `today` anchor for anything other than "what is today" — every other date/time value must derive deterministically from `today` + `rng()`, never from wall-clock at generation time beyond that single anchor point).

- [ ] **Step 14: Verify no QA regression**

Run `deno task test` (the full QA suite) and `deno task test:unit`. Both must stay green — this task's script never touches `demo-settings@studysprint.app` or changes `bootstrap-demo.ts`'s behavior, so a regression here means this task's script incorrectly modified shared state.

- [ ] **Step 15: Commit**

```bash
git add e2e/setup/seed-demo-history.ts e2e/setup/teardown-demo-history.ts deno.json
git commit -m "feat: add synthetic demo-history seeder and teardown"
```

**Report contract:** in addition to the standard DONE/BLOCKED status, the report file MUST include: final total XP, level, pet_stage-before-recording, `current_streak_days`, per-subject minute totals (all 5), and the ranked list of leaderboard minutes (demo account + 8 synthetics) — Tasks 2 and 4 need these numbers verbatim.

---

### Task 2: Tier 2 recording layer (Playwright tour)

**Depends on:** Task 1 (reads its report's final XP/streak numbers).

**Files:**
- Create: `playwright.tour.config.ts`
- Create: `e2e/demo/features/10-tour.feature`
- Create: `e2e/demo/steps/tour.steps.ts`
- Modify: `deno.json` — add `tour` and `tour:seed` tasks
- Modify: `e2e/steps/hooks.ts` — only if Step 2 below finds the cursor is actually offset

**Interfaces:**
- Consumes: Task 1's seeded demo account and its reported XP/streak numbers; `dwellForDemo`/cursor-injection/`Locator.fill` patch/theme-pinning from `e2e/steps/hooks.ts` (reuse, do not duplicate); the login `Given` step from `e2e/steps/goals.steps.ts:26`; the hydration-wait anchor from `e2e/steps/goal-detail.steps.ts:8` (waits on the Stopwatch button — `networkidle` does not mean hydrated in this app).
- Produces: two sets of raw recorded footage (dark + light) in `test-results/videos/`, ready for Task 3 to import into `ui-demo/public/`. The exact beat timings/captions recorded here are the "Notes" column values below — Task 3's Remotion scenes cut to these captions verbatim.

- [ ] **Step 1: Scaffold `playwright.tour.config.ts`**

Copy `playwright.demo.config.ts` verbatim as a starting point (do not modify the original file), then change: `features: "e2e/demo/features/**/*.feature"` stays the same glob (both `00-warmup.feature` and the new `10-tour.feature` live there — the warmup is shared), `outputDir: ".features-gen-tour"` (must not collide with `.features-gen-demo`), viewport `{ width: 2560, height: 1600 }` in both the top-level `use` block AND the `chromium` project's `use` block (per Global Constraints — `devices["Desktop Chrome"]` silently overrides an un-repeated top-level `use`), `video: { mode: "on", size: { width: 2560, height: 1600 } }` likewise in both places. Re-tune `DEMO_ZOOM` for the larger viewport — start at `1.05` (not the demo config's implicit 1.3 default) by setting `DEMO_ZOOM=1.05` when invoking the recording (env var, not a config file change — `DEMO_ZOOM` is read by `hooks.ts`, shared across configs).

- [ ] **Step 2: Verify the cursor-dot / zoom-coordinate risk before recording anything long**

`e2e/steps/hooks.ts`'s injected cursor dot (`CURSOR_SCRIPT`) positions itself from `e.clientX`/`e.clientY` on `mousemove`, while `ZOOM_SCRIPT` applies `html { zoom: <DEMO_ZOOM> }`. CSS `zoom` (unlike `transform: scale`) rescales the layout box model itself, so `getBoundingClientRect()` and mouse-event coordinates are usually already reported in the zoomed pixel space — meaning the dot may already land correctly with no code change needed. This is unverified for this codebase specifically. Do not assume either way:

1. Write one throwaway feature scenario that navigates to `/garden` and clicks one fixed, visually distinctive element (e.g. a nav link).
2. Record it with `DEMO=1 DEMO_ZOOM=1.05` via the new tour config.
3. Extract frame 1 of the click (via `claude-video-vision` MCP `video_analyze` or `ffmpeg -ss <timestamp> -i <file> -frames:v 1 out.png`) and visually confirm the lime cursor dot sits on the clicked element, not offset.
4. If offset: patch `CURSOR_SCRIPT`'s `move` handler in `e2e/steps/hooks.ts` to divide by the zoom factor (`dot.style.left = (e.clientX / ${DEMO_ZOOM}) + 'px'` — but note `DEMO_ZOOM` is a module-level const already interpolated into `ZOOM_SCRIPT`; reuse the same constant in `CURSOR_SCRIPT`'s template string rather than hardcoding). This is a shared file — changing it affects Tier 1 recordings too if they're ever re-run; that's acceptable only if frame 1 proves the dot is actually wrong, not preemptively.
5. Delete the throwaway scenario once verified either way.

- [ ] **Step 3: Add the syllabus-parse DEMO route stub**

`SyllabusImport.tsx` calls the `syllabus-parse` Edge Function, which calls OpenRouter live — real latency (5–15s) and real API dependency the recording can't absorb. In `tour.steps.ts`, add a step usable before beat 6 that does:

```typescript
await page.route('**/functions/v1/syllabus-parse', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      suggestions: [
        { title: 'Midterm review', target_hours: 4, subject: 'Computer Science' },
        { title: 'Problem set 6', target_hours: 3, subject: 'Mathematics' },
        { title: 'Lab report draft', target_hours: 2, subject: 'Science' },
        { title: 'Reading response', target_hours: 2, subject: 'Writing' },
      ],
    }),
  });
});
```

Match the actual response shape `SyllabusImport.tsx` expects — read that component first; if its expected shape differs from the sketch above, use the real shape (this stub must satisfy the component's parser, not an assumed one).

- [ ] **Step 4: Write `e2e/demo/features/10-tour.feature`**

One scenario, sorts after `00-warmup.feature` lexicographically. Eight beats in this exact order (each beat is one or more Gherkin steps backed by `tour.steps.ts` step defs, reusing existing steps from `e2e/steps/**` wherever one already exists for that UI action):

| # | Time | Beat | Visual | Caption |
|---|---|---|---|---|
| 1 | 0:00–0:07 | HOOK | `/garden`. Plant at `young_tree`, swaying. Streak card reads 40+. XP bar near full. | *"45 days of studying looks like this."* |
| 2 | 0:07–0:18 | THE UNIT | `/goal/:id`. Pomodoro pill → `25:00` "Focus". Switch to Stopwatch → Start → counter running (keep this shot short — `TimerCard.tsx` counts `setInterval` ticks, not wall-clock deltas, so it can drift under headless throttling; don't cut away and back expecting continuity). | *"It starts with one timer."* |
| 3 | 0:18–0:29 | THE LOG | Session modal, duration pre-filled at **90**, quality **Mastered**, Save. Modal closes, session lands top of Recent Sessions, progress bar advances. **This exact 90-minute/quality-5 session is what Task 1's seed target is calibrated against — do not change the duration or quality here without also updating Task 1's seed.** | *"Rate it — it schedules the review."* |
| 4 | 0:29–0:42 | THE RECORD | `/analytics`. Heatmap fills frame first, hold longest. Then hour-of-day, day-of-week, subject donut. | *"Every session lands somewhere."* |
| 5 | 0:42–0:53 | THE PAYOFF | `/garden` again (second visit — **must be the same recording session as beat 3**, not a fresh seed/login). XP bar crosses, plant flips `young_tree` → `mature_tree`. Pan to achievements grid, 8/10 lit. **Longest dwell in the piece.** | *"…and the plant grows."* |
| 6 | 0:53–1:03 | THE SHORTCUT | Dashboard → "Import from syllabus" → paste placeholder text → "Suggest goals" (hits the Step 3 stub) → suggestions appear checked → "Create 4 goals" → goals land on dashboard. | *"Or paste a syllabus and skip the setup."* |
| 7 | 1:03–1:11 | THE ROOM | `/community`. Weekly leaderboard populated, champion card, avatar stack. Into the seeded study room: member list + activity feed. | *"Nobody studies alone."* |
| 8 | 1:11–1:16 | ENDCARD | Wordmark on near-black, `getstudysprint.vercel.app`, repo URL. Plant glyph at `mature_tree`, still swaying. Background never fades to black (Remotion composes this, not Playwright — this beat can just be a static hold in the recording). | *"Plant something."* |

Use `dwellForDemo(page, ms)` after every state-change assertion (session save, XP bar landing, achievements reveal) so Remotion has clean hold frames to cut on — pick per-beat dwell values that roughly match the "Time" column's duration budget.

- [ ] **Step 5: Wire `deno.json` tasks**

```json
"tour:seed": "deno task test:setup && deno task seed:demo",
"tour": "DEMO=1 DEMO_ZOOM=1.05 node ./node_modules/.bin/bddgen --config playwright.tour.config.ts && DEMO=1 DEMO_ZOOM=1.05 node ./node_modules/.bin/playwright test --config playwright.tour.config.ts",
"tour:light": "DEMO=1 DEMO_ZOOM=1.05 DEMO_THEME=light node ./node_modules/.bin/bddgen --config playwright.tour.config.ts && DEMO=1 DEMO_ZOOM=1.05 DEMO_THEME=light node ./node_modules/.bin/playwright test --config playwright.tour.config.ts"
```

- [ ] **Step 6: Record on ampere-dev, dark pass**

`node_modules`/Playwright browsers must exist on `ampere-dev`, not the Mac. Rsync this repo (excluding `.git`, `node_modules`, `test-results`) to `~/work/studysprint-tour` on `ampere-dev`, SSH in, start (or reuse) a named `tmux` session (e.g. `tmux new -s studysprint-tour`), `npm install` there, then inside `tmux`:

```
deno task tour:seed
deno task tour
```

**Order matters**: seed, then dark recording. Do not run `demo:both`-style back-to-back dark+light without re-seeding between — beat 3 logs a real 90-minute session each pass, and a second pass without re-seeding starts from an already-flipped XP total.

Rsync `test-results/videos/*-dark.mp4` back to this repo's worktree (a scratch location — these are not committed here, Task 3 imports them into `ui-demo/public/`).

- [ ] **Step 7: Verify the dark take**

Confirm: no 0-byte video files in the synced-back set, all 8 beats are present at roughly their planned durations, and the plant visibly differs between beat 1 (young_tree) and beat 5 (mature_tree) frames — extract and compare one frame from each via `claude-video-vision` `video_analyze`.

- [ ] **Step 8: Re-seed and record the light pass**

On `ampere-dev`, inside the same (or a fresh) `tmux` session:
```
deno task tour:seed
deno task tour:light
```
Rsync `test-results/videos/*-light.mp4` back.

- [ ] **Step 9: Verify dark/light parity**

Both passes must show the same heatmap shape, the same streak number, the same achievement unlock count, and the same subject-donut proportions — since Task 1's seeder is deterministic and both passes re-seeded independently, any difference indicates non-determinism in Task 1's script (flag it as a blocker referencing Task 1, don't try to fix Task 1's script from here).

- [ ] **Step 10: Commit the recording-layer source (not the footage)**

```bash
git add playwright.tour.config.ts e2e/demo/features/10-tour.feature e2e/demo/steps/tour.steps.ts deno.json
git commit -m "feat: add Tier 2 UI-tour recording config and feature"
```

**Report contract:** include the synced-back footage's location (on this machine, e.g. `/tmp/studysprint-tour-footage/`), a per-beat timestamp table for both dark and light passes (Task 3 needs `trimStartSec` values per beat), and confirmation of Step 2's cursor-zoom finding (offset or not, and whether `hooks.ts` was patched).

---

### Task 3: Tier 2 assembly (Remotion `ui-demo/`)

**Depends on:** Task 2 (footage + per-beat timestamps).

**Files:**
- Create: `ui-demo/package.json`, `ui-demo/remotion.config.ts`, `ui-demo/tsconfig.json`
- Create: `ui-demo/src/Root.tsx`, `ui-demo/src/Composition.tsx`, `ui-demo/src/theme.ts`
- Create: `ui-demo/src/scenes/FootageBeat.tsx` (mirrors MicroMatch's, see Step 2)
- Create: `ui-demo/STORYBOARD.md` (the Task 2 shot-list table, copied verbatim)
- Create: `ui-demo/public/CREDITS.md`
- Modify: `.gitignore` — add `!ui-demo/public/*.mp4` exceptions

**Interfaces:**
- Consumes: Task 2's dark/light footage files + per-beat timestamp table (from its report).
- Produces: `StudySprintUiDemo` (1920×1080 @ 30fps, ~2280 frames) and `StudySprintUiDemoSocial` (1080×1920, ~750 frames) compositions, rendered to `out/`.

- [ ] **Step 1: Scaffold the Remotion project**

`ui-demo/package.json` needs Remotion 4.x, `@remotion/media`, `@remotion/tailwind-v4`, `react`, `react-dom`. Do not run `npm install` on the Mac — this step only writes the file; installation happens on `ampere-dev` in Step 7.

- [ ] **Step 2: Read MicroMatch's reference implementation before writing scenes**

Read (don't copy blindly — the API surface matters, the specific look does not) these files in the sibling repo at `/Users/yinkavaughan/My Drive (yvaughan@wesleyan.edu)/CS/Projects/SWE/MicroMatch/ui-demo/src/`:
- `scenes/FootageBeat.tsx` — the `src` + `trimStartSec` + push/drift prop shape, and specifically its `pushCreep`/`preDrift` knobs, which exist because a held shot with zero motion trips ffmpeg's `freezedetect`. Reproduce the same mechanism (a slow, near-imperceptible pan/scale drift on held frames) rather than rediscovering the problem from a failed verification pass later.
- `Composition.tsx` — how it sequences scenes, computes absolute frame offsets from named constants, and layers the single `<Audio>` track with a volume envelope.
- `Root.tsx` — how it registers multiple compositions (needed here for the landscape + social variants).

- [ ] **Step 3: Build `FootageBeat.tsx` and the 8-beat sequence**

One `FootageBeat`-equivalent component taking `src`, `trimStartSec` (from Task 2's per-beat timestamp table), a duration in frames, and drift props matching MicroMatch's pattern. In `Composition.tsx`, sequence the 8 beats from Task 2's shot list at their planned frame ranges (30fps: beat 1 = frames 0–210, beat 2 = 210–540, etc., scaled from the "Time" column in Task 2 Step 4's table — recompute exact frame numbers from the *actual* recorded beat durations in Task 2's report, not the plan's estimates, since real UI interaction timing won't hit the estimates exactly).

Each beat's caption (kinetic on-screen text, since social autoplays muted and text is the only narration reaching most viewers) uses the exact caption strings from Task 2 Step 4's table.

Each scene starts 15–20 frames **inside** the previous scene's fade-out (overlapping crossfade, not a hard cut) — per Global Constraints, MicroMatch shipped a version with a half-second gap of empty background at two cuts because beats butted instead of overlapping.

- [ ] **Step 4: Wire audio**

One `<Audio>` spanning the whole timeline, `interpolate` volume envelope (fade in ~30 frames, out ~60 frames). Pick a track that is forward-pulse, unobtrusive, with no melodic hook competing with the captions, and is **not** any of MicroMatch's four already-auditioned tracks (Inspired, Heartwarming, Wholesome, Almost in F — check `/Users/yinkavaughan/My Drive (yvaughan@wesleyan.edu)/CS/Projects/SWE/MicroMatch/trailer/scratch/*.mp3` filenames to confirm which four to avoid). Pin any SFX to absolute frame numbers, not scene-relative — retiming a scene later must not silently detune its sound.

- [ ] **Step 5: Add the social composition**

`StudySprintUiDemoSocial`: 1080×1920 @ 30fps, ~750 frames, reusing the *same* `FootageBeat`/scene components as the landscape composition (center-cropped inside a window frame, not re-authored), covering only beats 1 / 3 / 5 / 8.

- [ ] **Step 6: Gitignore exceptions and asset placement**

Add to `.gitignore`:
```
!ui-demo/public/*.mp4
```
Copy Task 2's synced-back footage into `ui-demo/public/` under clear names (e.g. `beat1-hook-dark.mp4`, `beat1-hook-light.mp4`, …).

- [ ] **Step 7: Install and render on ampere-dev**

Rsync `ui-demo/` to `ampere-dev` (e.g. `~/work/studysprint-ui-demo`). SSH in, start/reuse a named `tmux` session, `npm install` (Remotion on linux-arm64 needs its Chrome Headless Shell — expect the first install to be slow), then:
```
npx remotion render src/index.ts StudySprintUiDemo out/ui-demo-landscape.mp4
npx remotion render src/index.ts StudySprintUiDemoSocial out/ui-demo-social.mp4
```
Rsync both outputs back to `ui-demo/out/` in this worktree.

- [ ] **Step 8: Verify — this is the gate, not the exit code**

Extract frames at 2–3fps across every cut (a 1fps pass misses half-second gaps) via `claude-video-vision` `video_analyze` on both renders. Then run, at default log level (never `-v error` — see Global Constraints):
```
ffmpeg -i out/ui-demo-landscape.mp4 -vf freezedetect -af silencedetect -f null -
```
`freezedetect` output must be empty. Check loudness:
```
ffmpeg -i out/ui-demo-landscape.mp4 -af ebur128 -f null -
```
Confirm the social cut renders at 1080×1920 with no clipped captions and no horizontal letterboxing.

- [ ] **Step 9: Write STORYBOARD.md and CREDITS.md**

`ui-demo/STORYBOARD.md`: the Task 2 Step 4 shot-list table, verbatim, in the same "Time / Visual / Source / Notes" column shape MicroMatch's storyboards use. `ui-demo/public/CREDITS.md`: the actual track name used in Step 4 — verify it matches what's really in the render (MicroMatch shipped a credits/README mismatch once for a track it had swapped four times; don't repeat that).

- [ ] **Step 10: Commit**

```bash
git add ui-demo/ .gitignore
git commit -m "feat: add Tier 2 UI-tour Remotion assembly"
```

**Report contract:** confirm both render outputs' resolutions/frame counts/durations, the `freezedetect`/`silencedetect`/`ebur128` command outputs (paste the actual ffmpeg stderr, not a paraphrase), and the exact track name/file used.

---

### Task 4: Tier 3 trailer ("The Interval")

**Depends on:** Task 1 only (needs its reported final totals — hours, sessions, streak). Independent of Tasks 2/3 — if either stalls, this can be pulled forward.

**Files:**
- Create: `trailer/package.json`, `trailer/remotion.config.ts`, `trailer/tsconfig.json`
- Create: `trailer/src/Root.tsx`, `trailer/src/Composition.tsx`, `trailer/src/theme.ts`
- Create: `trailer/src/components/PlantGlyphs.tsx` (ported from `VirtualPlant.tsx`)
- Create: `trailer/src/components/Grid.tsx`
- Create: `trailer/src/scenes/EmptyGrid.tsx`, `Gap.tsx`, `Return.tsx`, `Compound.tsx`, `Garden.tsx`, `Invitation.tsx`
- Create: `trailer/STORYBOARD.md`, `trailer/public/CREDITS.md`
- Modify: `.gitignore` — add `!trailer/public/*.mp4`

**Interfaces:**
- Consumes: Task 1's reported final totals (total hours, total sessions, `current_streak_days`, per-subject minute totals) for beat 4's on-screen counters — these must be the real seeded numbers, not invented ones.
- Produces: one ~1500-frame, 1920×1080 @ 30fps render.

- [ ] **Step 1: Port the plant glyphs, frame-driven not wall-clock-driven**

Read `frontend/app/components/shared/VirtualPlant.tsx` in full. Copy the six stage glyphs' raw SVG path/shape data (`Seed`, `Sprout`, `Sapling`, `YoungTree`, `MatureTree`, `BloomingTree` — the JSX inside each function, unchanged) into `trailer/src/components/PlantGlyphs.tsx`. Do **not** port the `motion/react` `AnimatePresence`/`motion.g` wrapper — replace the sway/transition animation with `useCurrentFrame()`-driven `interpolate()` calls (e.g. a sine-based rotation offset computed from the current frame, matching the original's amplitude: `swayAmount` 0 for seed, 1 for sprout, 1.8 for sapling and beyond), since wall-clock (`motion/react`) and deterministic frame rendering don't mix in Remotion.

- [ ] **Step 2: Build the accreting grid component**

`trailer/src/components/Grid.tsx`: a 7×53 grid of cells (7 rows = days of week, 53 columns = weeks — mirrors a GitHub-style contribution grid) on near-black background. Props: `litCount` (how many cells are lit as of the current frame) or a `pattern` array driven by the calling scene. Cell color: lime `#ccff00` accent (matches the app's own palette, confirmed in `VirtualPlant.tsx`'s fill values) at full opacity when lit, a very low-opacity gray/white when unlit.

- [ ] **Step 3: Scene 1 — The Empty Grid (frames 0–210)**

Near-black `AbsoluteFill`, full opacity for the whole scene (never fade the outer wrapper — Global Constraints). Render the empty grid, light exactly one cell partway through, with a soft tick sound pinned to that frame. Type-on caption: *"One session."*

- [ ] **Step 4: Scene 2 — The Gap (frames 195–435)**

Overlapping the previous scene's tail by 15 frames. A few more cells light, then a long visible run of unlit cells. A numeric streak counter animates down to 0. Caption: *"Most people stop here."*

- [ ] **Step 5: Scene 3 — The Return (frames 420–735)**

Cells resume lighting, at a visibly quicker cadence than Scene 1. Below the grid, the plant (Step 1's ported glyphs) transitions `seed` → `sprout` on an `interpolate()`-driven crossfade keyed to frame position within this scene. Caption: *"The only job is making day two easier."*

- [ ] **Step 6: Scene 4 — The Compound (frames 720–1080)**

Grid accelerates to fill out a full year's worth of cells. Plant runs `sprout` → `sapling` → `young_tree` → `mature_tree` in step with the grid's fill progress. An XP-bar-style progress sweep animates alongside. **Numeric counters here must read Task 1's actual reported totals** (total hours, total sessions, `current_streak_days`) — not placeholder numbers, and not the plan's illustrative estimates. Animate each counter counting up to its real final value across this scene's frame range.

- [ ] **Step 7: Scene 5 — The Garden (frames 1065–1305)**

Camera-pull-back equivalent (scale/composition change, not a literal camera). Subject-colored donut arcs resolve around the tree, using Task 1's actual per-subject minute proportions (same ~35/25/18/12/10-shaped split, but the real per-subject numbers from Task 1's report). Caption: *"Every subject. Every hour you actually studied."*

- [ ] **Step 8: Scene 6 — Invitation (frames 1290–1500)**

Wordmark, `getstudysprint.vercel.app`, repo URL, caption *"Plant something."* Final frame holds on the `blooming` stage glyph (Step 1's port) — the only point in the trailer this stage appears, since the seeded account itself only reaches `mature_tree`; this is a deliberate "aspirational" frame, not a claim about the seeded account's actual state.

- [ ] **Step 9: Wire audio and cue-frame constants**

In `Composition.tsx`, export named constants for each scene's start frame (e.g. `const B1 = { from: 0, durationInFrames: 210 }; const B2 = { from: B1.from + 195, ... }`) so retiming one scene retimes everything downstream automatically, including any SFX pinned to absolute frames. Music needs an audible lift/build around frame 720 (Scene 4's start) — again, must not be any of MicroMatch's four already-used tracks (see Task 3 Step 4 for how to check which ones those are).

- [ ] **Step 10: Gitignore exception and STORYBOARD.md**

Add `!trailer/public/*.mp4` to `.gitignore`. Write `trailer/STORYBOARD.md` with the beat sheet above, plus this section verbatim (it must survive into the committed file, not be summarized):

> **Why this isn't MicroMatch's trailer.** MicroMatch's is a transaction between two parties — quarter hour, turn, match, stream, record, invitation. StudySprint's is one person over time; there's no second party in frame at any point. MicroMatch renders discrete cards on cream with a Blender-rendered laptop as furniture; this has two continuously accreting objects on near-black and no 3D asset at all. MicroMatch's spine is an offer; this one names a failure mode in beat 2 — most people quit — and the product is the answer to it, a tension with no counterpart in the MicroMatch piece. The plant art is lifted from the running app, not authored for the video — a re-render of a real component, a different honesty claim than a modelled prop. If a draft storyboard diffs 1:1 against MicroMatch's beat table, it's wrong regardless of the copy.

- [ ] **Step 11: Install and render on ampere-dev**

Rsync `trailer/` to `ampere-dev` (e.g. `~/work/studysprint-trailer`), SSH in, named `tmux` session, `npm install`, then:
```
npx remotion render src/index.ts <CompositionId> out/trailer.mp4
```
Rsync the output back to `trailer/out/`.

- [ ] **Step 12: Verify**

Same protocol as Task 3 Step 8: 2–3fps frame extraction across every cut via `claude-video-vision`, `freezedetect`/`silencedetect` at default log level, `ebur128` loudness check. Additionally: confirm the Scene 4 counters visually match Task 1's reported totals exactly (read the numbers off extracted frames, compare to the report file's numbers).

- [ ] **Step 13: Commit**

```bash
git add trailer/ .gitignore
git commit -m "feat: add Tier 3 generative trailer"
```

**Report contract:** render resolution/frame count/duration, ffmpeg verification output (actual stderr, not paraphrased), and explicit confirmation that Scene 4's on-screen counters match Task 1's reported totals.

---

### Task 5: Publish

**Depends on:** Tasks 3 and 4 (needs both final render paths). Task 1's teardown script runs here, and only here.

**Files:**
- Modify: `README.md` — embed Tier 2 master above the existing Tier 1 GIFs (Tier 1 stays where it is, untouched)
- Modify: `JOURNAL.md` — dated entry
- Verify: `ui-demo/public/CREDITS.md`, `trailer/public/CREDITS.md` already correct (written in Tasks 3/4 — this task only double-checks, doesn't re-author)

- [ ] **Step 1: Embed Tier 2 in the README**

Add the Tier 2 landscape master above the existing 8 Tier 1 GIF embeds in `README.md`, following whatever embed convention the Tier 1 GIFs already use (check the existing markup before choosing a new one — likely an `<video>` tag or a linked thumbnail, matching the surrounding style).

- [ ] **Step 2: Double-check CREDITS.md accuracy in both projects**

Re-open `ui-demo/public/CREDITS.md` and `trailer/public/CREDITS.md`; confirm the track names listed match the actual filenames present in each project's `public/` directory at render time (not what was planned before recording — tracks sometimes get swapped mid-build, per Task 3/4's own cautionary note).

- [ ] **Step 3: Add a JOURNAL.md entry**

Follow this repo's existing `JOURNAL.md` dated-entry format (check the most recent entries for the exact heading/structure convention before writing a new one). Summarize: synthetic-history seeder added, Tier 2 UI tour (landscape + social) recorded and rendered, Tier 3 generative trailer rendered, all verified via frame extraction + freezedetect/silencedetect/ebur128.

- [ ] **Step 4: Run teardown — only now**

```bash
deno task seed:demo:teardown
```
This is the only point in the whole plan where this runs. Verify afterward (read-only query) that no `profiles`/`auth.users` rows remain with `@demo.studysprint.invalid` emails or `ss_demo_` usernames, and that the `demo@studysprint.app` account itself (and its seeded goals/sessions) is untouched.

- [ ] **Step 5: Commit**

```bash
git add README.md JOURNAL.md
git commit -m "docs: publish Tier 2/3 demo videos and journal entry"
```

**Report contract:** confirm teardown's read-only verification query results (zero remaining synthetic rows), and the final embed locations in `README.md`.
