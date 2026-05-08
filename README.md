# StudySprint

[![CI](https://github.com/Builder106/StudySprint/actions/workflows/ci.yml/badge.svg)](https://github.com/Builder106/StudySprint/actions/workflows/ci.yml)

A study tracker that turns focus sessions into a growing garden. Set goals, run a focus timer, watch plants grow with time logged, and compare streaks on a public leaderboard.

**Live app:** https://getstudysprint.vercel.app

![StudySprint — register, set a goal, log a session, watch the garden grow](docs/gifs/01-core-new-student-registers-and-logs-their-first-session.gif)

## Features

<details>
<summary><b>Focus timer + session logging</b></summary>

![Timer modes and focus tools](docs/gifs/02-timer-demonstrate-timer-modes-and-focus-tools.gif)

Stopwatch and Pomodoro modes with phase labels, ambient-sound focus tools, and a slide-out goal-detail panel. Sessions are tagged by goal and subject, validated server-side, and feed into the streak counter and garden.

</details>

<details>
<summary><b>Gamified garden + analytics</b></summary>

![Analytics dashboard and growing garden](docs/gifs/03-analytics-demonstrate-analytics-heatmap-and-garden-plant.gif)

Every focused minute grows a plant; streaks unlock new species. Analytics view shows per-subject time distribution, hour-of-day heatmap, day-of-week breakdown, and current/longest streak — all computed server-side via a single Postgres RPC (`analytics_summary`) and rendered with Recharts.

</details>

<details>
<summary><b>AI syllabus parser + co-study rooms</b></summary>

![Syllabus parser extracts goals; study rooms for accountability](docs/gifs/04-power-demonstrate-syllabus-parser-and-study-rooms.gif)

Paste a syllabus or upload a PDF; an OpenRouter-backed Edge Function returns structured study goals with target dates and subject tags. Co-study rooms let you join other users' sessions in real time; opt-in public profiles and a weekly leaderboard surface the social layer.

</details>

Also: **Google Calendar integration** (export sessions, import events) via a dedicated OAuth flow; **dark mode** with theme persistence; **one-click account reset** that wipes your data and reseeds starter goals.

## Tech stack

| Layer | Tools |
|---|---|
| Runtime | Deno 2 — single TS toolchain across frontend + edge functions, npm specifiers via `deno.json` |
| Frontend | React 18, TypeScript, Vite (run via `deno run -A npm:vite`), Tailwind CSS v4, Radix UI, Framer Motion, Recharts |
| Backend | Supabase — Postgres + Auth + Row Level Security + RPCs + Edge Functions (Deno) |
| AI | OpenRouter (multi-model fallback chain for syllabus parsing) |
| Integrations | Google Calendar API (REST, called from Edge Function) |
| Testing | Playwright + playwright-bdd (Gherkin scenarios, demo-mode video capture) |
| Deploy | Vercel / Deno Deploy (static site) + Supabase (database, auth, edge functions) |

## Architecture

```
frontend/  React + Vite SPA
  app/components/   page-level components (Dashboard, Garden, StudyRoom, ...)
  lib/              Supabase client, API wrappers, hooks, utilities
supabase/
  migrations/       SQL schema, views, and RPC definitions
  functions/        Deno Edge Functions
    syllabus-parse/   syllabus → structured goals via OpenRouter
    google-calendar/  OAuth + Calendar export/import
e2e/       Playwright + Gherkin BDD suite (QA + demo-recording configs)
```

`backend/` (Express + node-postgres) is retained for reference only — every
endpoint has been ported to Supabase RPCs or Edge Functions, and the frontend
no longer talks to it. Safe to delete (`rm -rf backend/`) once you've verified
the deployed app and don't need to consult the original handlers anymore.

## Local setup

Requires [Deno 2.x](https://deno.com/) and the [Supabase CLI](https://supabase.com/docs/guides/cli).
There is no `package.json` — `deno.json` is the source of truth for tasks and
npm dependencies. Deno auto-creates a `node_modules/` directory when needed
(so Vite can resolve plugins), but you don't manage it directly.

```bash
deno install                        # materialize node_modules from deno.json
cp .env.example .env                # fill in VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY

# One-time: link this repo to your Supabase project, push migrations,
# deploy edge functions, and set their secrets.
deno task supabase:link             # supabase link --project-ref <your-project-ref>
deno task supabase:db:push
deno task supabase:functions:deploy
supabase secrets set \
  OPENROUTER_API_KEY=... \
  GOOGLE_CLIENT_ID=... \
  GOOGLE_CLIENT_SECRET=... \
  GOOGLE_REDIRECT_URI=https://<project-ref>.supabase.co/functions/v1/google-calendar/callback \
  CLIENT_ORIGIN=http://localhost:5173

deno task dev                       # frontend on :5173 (Vite via Deno)
```

If `deno install` warns about ignored build scripts, re-run with
`deno install --allow-scripts=npm:supabase,npm:@tailwindcss/oxide` — the
Supabase CLI's binary download and Tailwind's native binding both run
postinstall scripts.

Sign up via the in-app register flow to create your account; a `profiles` row
is created automatically by an `auth.users` trigger.

### Environment variables

**Frontend** (`.env` in repo root)

| Key | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (from Project Settings → API) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (`sb_publishable_…`) — safe to ship; RLS guards data |

**Edge Functions** (set via `supabase secrets set ...`)

| Key | Description |
|---|---|
| `OPENROUTER_API_KEY` | API key for the syllabus parser |
| `OPENROUTER_MODEL` | Optional override (single id or comma-separated chain, max 3) |
| `GOOGLE_CLIENT_ID` | Google OAuth client id |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | `https://<project-ref>.functions.supabase.co/google-calendar/callback` |
| `CLIENT_ORIGIN` | Frontend origin (used for OAuth post-callback redirect) |

## Tests

```bash
deno task test            # Gherkin E2E suite, headless (Playwright via Deno)
deno task test:e2e:ui     # Playwright UI mode
deno task demo            # records narrated walkthrough videos (DEMO=1)
deno task gif             # convert videos/*.mp4 → docs/gifs/*.gif for the README
```

Playwright runs under Deno's Node compatibility layer — its browser drivers
are still Node binaries, but the test runner and step definitions execute
through `deno run -A npm:@playwright/test`. No separate `npm install` is
required.

The same suite runs on every push to `main` via
[GitHub Actions](.github/workflows/ci.yml) (alongside `deno fmt --check`,
`deno lint`, `deno check`, and a build smoke test). The CI badge above
reflects the most recent run. See
[CONTRIBUTING.md](CONTRIBUTING.md#ci) for the secrets the e2e job needs.

## License

MIT — see [LICENSE](LICENSE).
