# Planning prompt for Opus: StudySprint Tier 2 & Tier 3 demo videos

## Context

StudySprint is a study tracker (React + Vite + Supabase) that turns focus sessions into a growing garden — timer, goal tracking, streaks, per-subject analytics with a heatmap, an AI syllabus parser, and social features (leaderboard, study rooms). Live at https://getstudysprint.vercel.app.

Tier 1 already exists and is done: four README GIFs (dark/light) covering the core loop, timer modes, analytics/garden, and syllabus-parser/study-rooms, recorded via a Playwright + playwright-bdd suite (`e2e/demo/features/*.feature`, `deno task demo`). No changes needed there.

Tier 2 and Tier 3 do not exist yet — this is greenfield planning, not a refresh.

## Reference model (scaffold, not a template to clone)

A sibling project, MicroMatch, uses a three-tier content model:
- Tier 1: README GIFs (Playwright-recorded, `.spec.ts`, not Gherkin).
- Tier 2: a longer Playwright-recorded "UI tour" with B-roll clips assembled per a written script, no voiceover, backed by a music bed.
- Tier 3: a produced trailer (Remotion + Blender compositing, transitions, its own music bed) built from footage/assets rather than live-recorded UI.

Use this as a structural scaffold only. Do not scene-for-scene clone MicroMatch's beats, shot list, or copy — StudySprint's actual flows, pacing, and hook need to come from its own feature set. If a storyboard ends up matching MicroMatch 1:1, it's too close.

## The seed-data gap (must be addressed in the plan)

The current e2e seed (`e2e/setup/bootstrap-demo.ts` → `create_starter_data_for` RPC) only creates two empty goals — no `study_sessions` rows. That means the demo account starts with a bare analytics heatmap, no streak, and a seedling-stage garden. Tier 1's GIFs get away with this because they show the *first* session being logged. Tier 2/3 need the opposite: a garden with grown plants, a multi-week streak, and a populated heatmap, to make growth/gamification legible on camera.

Decision made: seed synthetic backdated session history for the demo account (weeks of `study_sessions` rows with varied subjects/times), not organic real usage. Plan should scope this as its own seed script/migration path — likely a new RPC or a one-off Deno script using the service-role key, separate from `create_starter_data_for` so the e2e suite's deterministic starter-goal behavior isn't disturbed. Needs to cover: enough session volume to hit a visible streak length and at least one garden growth-stage transition, spread across subjects so the heatmap and per-subject breakdown aren't flat, and timestamps recent enough that the streak counter (which is presumably "current" not just "longest") still reads as live at recording time.

## Purpose / distribution

Both of:
1. README + portfolio showcase (same audience as Tier 1).
2. Social/marketing push (LinkedIn/X) — needs a strong hook in the first few seconds and should work shortened/cut down for that context.

No hard deadline — plan can be open-ended, no WesFest-style "wait for real data" hold.

## What the plan should produce

1. A Tier 2 script/shot list (in the same spirit as MicroMatch's `content-pipeline/posts/drafts/*.SCRIPT.md`) covering which flows to show, in what order, and why that order sells the product.
2. A Tier 3 trailer concept/beat sheet — tone, music direction, whether it's UI-recording-based or asset/compositing-based like MicroMatch's, and how it differs enough from MicroMatch's trailer to not read as a template.
3. A concrete plan for the seed-data script described above, including where it lives and how it's invoked.
4. A list of any StudySprint-specific technical risks/gotchas Opus can identify from the codebase that would trip up recording (the equivalent of MicroMatch's `waitForAuthHydration()` or reporter-flag traps) — flag unknowns as unknowns rather than guessing.
5. A build sequence Sonnet can execute step by step (seed script → Tier 2 recording/assembly → Tier 3 production), since Sonnet will implement whatever this plan specifies.

Do not write any code or scripts in this planning pass — output a plan document only.
