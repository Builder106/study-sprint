# JOURNAL — StudySprint

> Dated log of decisions, pivots, incidents, and quotes. Add entries as
> things happen — retrospectives need this raw material to land.
> Reverse-chronological; one paragraph max per entry.

## 2026-05-11 — Hand-rolled a password validator because HIBP is Pro-tier #decision

Added the change-password flow on `/settings`, which meant deciding how strict to be about weak passwords. Supabase's leaked-password protection (HIBP lookup) is gated behind the Pro plan, and this project runs on the free tier. Rather than ship nothing, I wrote a shared client-side validator (min 8 chars, reject all-numeric, block `password*`/`123456*`/`qwerty*` prefixes) used by both Register and Settings as a compensating control. It's not a substitute for HIBP — a determined user can still pick a leaked password not on the prefix list — but it catches the lazy 90%. Five e2e scenarios cover it: happy path plus four failure modes. Worth noting if the project ever moves to Pro: delete the custom validator, don't stack it.

## 2026-05-07 — `.env` loader broke because the repo lives under a path with spaces #incident

The e2e suite passed locally but the goal-deletion scenario stayed red in CI, and the root cause was the project path: `My Drive (yvaughan@wesleyan.edu)`. Both `playwright.config.ts` and `teardown.ts` resolved `.env` relative to themselves via `new URL().pathname` — but `pathname` returns the percent-encoded path, so the spaces and parens became `%20` / `%28` / `%29`, `existsSync` silently reported false, the loader bailed, and worker processes couldn't find `SUPABASE_URL`. Switched to `fileURLToPath`, which decodes. Lesson: never use `URL.pathname` to touch the filesystem — it's a URL component, not a path. This bug is invisible on any repo that lives under a clean path, which is most of them, which is why it survived to CI.

## 2026-05-07 — Migrated the whole toolchain to Deno #pivot

`deno.json` is now the source of truth for tasks and npm dependencies — one TS toolchain across the React frontend and the Supabase Edge Functions, no more Node/npm split. Entry points became `deno task dev/build/test`. Two snags worth remembering: Playwright probes `process.versions.node` and rejects the value Deno's Node-compat layer reports, so the test runner has to be invoked node-direct (`node ./node_modules/.bin/playwright`) even though everything else runs through Deno; and the MCP deploy tool doesn't bundle relative `../` imports cleanly, so the shared auth helper got inlined into each Edge Function body. A slim `package.json` mirroring `deno.json#imports` stays around purely so IDE tooling and the Vercel build path have something to probe.

## 2026-05-07 — Retired the entire Express backend for Supabase #pivot #milestone

Finished a multi-phase rewrite that deleted `backend/` wholesale. Every endpoint moved either to a Supabase RPC (goals, sessions, profile, leaderboard, public profile, room CRUD, account reset) or to a Deno Edge Function (syllabus parser, Google Calendar). The architectural bet: lean on Row Level Security as the authoritative ownership guard so most CRUD goes direct from the browser to PostgREST with no server in the middle. Cross-user reads that RLS necessarily denies (leaderboard, another user's public profile) became `SECURITY DEFINER` RPCs with explicit `auth.uid()` checks. Gamification stayed client-side on purpose — the streak/achievement logic is timezone-aware JS and porting it to plpgsql would've been lossy, and the input is only the caller's own RLS-protected sessions anyway. One sharp edge: `REVOKE FROM PUBLIC` wasn't enough, because Supabase separately auto-grants new functions to the `anon` role on creation — had to explicitly `REVOKE FROM anon` on every cross-user RPC.

## 2026-04-29 — The free-model 429 carousel, and why we went back to where we started #incident #decision

Spent a full day chasing OpenRouter free-tier rate limits on the syllabus parser and rotated through nearly every option: pinned Llama 3.3 70B (429'd within seconds), Qwen 2.5 72B, gpt-oss-120b (a reasoning model that wrote chain-of-thought prose instead of JSON), a 3-model fallback chain (`models: [...]`, capped at 3 because OpenRouter 400s on longer arrays), then the `openrouter/free` meta-router. The trap: pairing `json_schema` `strict:true` with `provider.require_parameters:true` filtered the free pool to *zero* endpoints and returned a 404 "No endpoints found." Final answer was to revert to `openrouter/free` with the schema sent only as a hint (`strict:false`), and lean on a hand-rolled `extractJsonObject` (direct parse → fenced-block → greedy `{...}`) plus an explicit "respond with ONE JSON object and nothing else" prompt to handle the tail cases. The honest lesson: with free models you don't control which model answers, so the only durable fix is to be liberal in what you accept on the response side, not strict in what you demand on the request side.

## 2026-04-24 — `_redirects` file beat the Render blueprint #incident

`/dashboard` and every client-routed path 404'd in production. The `render.yaml` SPA rewrite rule never took effect because the actually-deployed service (`studysprint-frontend`) didn't match the blueprint's service name (`study-sprint-web`) — the rule was attached to a service that didn't exist. Rather than reconcile the names, shipped a `_redirects` file inside the build itself, which Render's static hosting reads verbatim and bypasses blueprint/dashboard config entirely. Lesson: when infra-as-config silently no-ops, prefer the convention-based file that lives next to the artifact over the named-resource indirection that can drift.

## 2026-04-24 — Express route order silently swallowed `/profiles/me` #incident

`GET /api/profiles/me` was returning 404 because Express matches routes in declaration order, and the public `/profiles/:username` handler was registered first — so it caught `/me` with `username = "me"`, looked up a non-existent public user, and 404'd. Fix was to register `/profiles/me` (with `requireAuth`) *before* the public `:username` route. Classic ordering footgun; worth remembering that literal path segments must always precede param segments that could capture them.

## 2026-04-23 — Built nine features in one day off existing schema #milestone #decision

Shipped the Pomodoro timer + spaced-repetition hints, focus-tools panel (Web Audio ambient noise so nothing ships as an audio asset), the analytics dashboard with a hand-rolled SVG contribution heatmap, the AI syllabus parser, Google Calendar OAuth, gamification (XP/levels/virtual plant), and the social layer (profiles/leaderboard/study rooms) — all in a single dense day. The throughline decision: derive everything from the existing `study_sessions` table instead of adding counters. XP, levels, plant stage, streaks, and all 10 achievements are computed on demand from session rows, so there's no stale state to reconcile — log a session and every number updates consistently. Same instinct kept dashboard filtering/sorting client-side: the goals list is small and doesn't warrant a round-trip.

## 2026-04-21 — Renamed StudyQuill to StudySprint on day one #decision

The project shipped its first commits as "StudyQuill" and got renamed to "StudySprint" within the same day, across the README and the API token. Noting it because the old name still lurks in early git history and could confuse anyone archaeologizing the repo — "Quill" was never the real product, "Sprint" (focus sessions, streaks, the garden filling in fast) is.
