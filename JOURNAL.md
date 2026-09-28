# JOURNAL — StudySprint

> Dated log of decisions, pivots, incidents, and quotes. Add entries as things happen —
> retrospectives need this raw material to land. Reverse-chronological; one paragraph max per entry.

## 2026-09-28: Corrected accessibility audit follow-up #fix

CI showed that Axe stores canvas references on individual contrast checks,
not their parent nodes. The audit reads those references there, and legal
pages use explicit dark text colors Axe can parse.

## 2026-09-28: Stabilized transient landing egg smoke checks #test

Milestone smoke checks wait for the renderer after reloading seeded browser data,
then observe the brief effect while save-result assertions run.

## 2026-09-28: Tightened public-page accessibility checks #fix

Dark auth-page colors now use explicit values the audit can parse, legal update labels meet 7:1 contrast in both themes, and the landing utility controls form a named group. The landing audit filters only unresolved contrast checks that explicitly reference its decorative WebGL canvas.

## 2026-09-28: Added four landing-page Easter eggs #decision

The landing now rewards a completed study week, full charge, choosing 30, then 60, then 90 minutes, and the tenth bolt activation. Effects are decorative, procedural, serialized, and consumed when motion is paused or reduced. Timer behavior and saved progress stay unchanged.

## 2026-09-28: Added a safe Easter egg preview #decision

A collapsed Egg preview panel is available on local development and staging when the URL includes `?easter-eggs=1`. Its buttons enqueue visuals directly, without changing timer state, browser storage, or Supabase data. Playback is disabled when motion is paused or reduced. Vercel's preview flag is scoped to the staging branch and unset in production.

## 2026-09-27: Synchronized the landing entrance #decision

The bolt, headline, orbit, duration markers, bevel trace, and procedural arcs now share a two-second
entrance window. Their staggered starts still build in sequence, while the final spark and all other
motion settle at the same time.

## 2026-09-27: Powered up the landing headline #decision

The headline now joins the bolt entrance: “Focus in.” settles into place, then a tapered neon-lime
wipe powers “Charge up.” from left to right and ends with a brief spark. The powered text stays
visible after the entrance; reduced motion shows the final state without animation.

## 2026-09-27: Confirm guest data deletion in the app #decision

Clear guest data now uses the shared confirmation modal instead of the browser prompt. The copy
names the saved goals, study history, and active guest timer affected by clearing. Cancel leaves
the browser data intact.

## 2026-09-27: Styled the landing page scrollbar #decision

The page uses the browser's native thin scrollbar with a dark lime thumb in light mode and a
muted lime thumb in dark mode. Higher contrast settings restore the system scrollbar. The styling
only applies while the landing page is mounted; scrolling remains native.

## 2026-09-27: Made weekday marks read as charge terminals #decision

Study minutes set each mark's height. Studied days have a lime segment; hover and focus light the
tip, selecting a day flickers its mark once, and saving a session pulses today's mark. The selected
day stays lit. Reduced motion and the animation pause control disable the flicker.

## 2026-09-27: Made paused sessions explicit #decision

The countdown now has a pause icon, a Paused label, and a nearby resume hint. Paused orbit progress
stays in place and turns neutral. Pause and resume announce their state once through the existing
status region. Idle electricity remains disabled during sessions; resuming uses the activation burst.

## 2026-09-27: Added electrical click and idle feedback #decision

Bolt activation now compresses and rebounds over 480 milliseconds with a brief procedural arc
burst. Idle emits one or two smaller edge sparks at random intervals. Neither changes charge.
Idle generation stops outside the viewport, in hidden tabs, during sessions, and with reduced or
paused motion. Effects clear their timers on cleanup.

## 2026-09-27: Added a quiet bolt idle #decision

After ignition, the resting bolt floats five pixels upward and back over 5.6 seconds. CSS moves the
rendered surface without a continuous WebGL loop. The animation pauses offscreen and in hidden
tabs, stops during sessions, and is disabled by paused or reduced motion. Hover feedback still
works independently of the float.

## 2026-09-27: Made the electrical discharge procedural #decision

Fixed long branches and endpoint circles looked too illustrative. The entrance now generates two
to four short filaments from random points along the casing, with fresh lengths and bends every
48 milliseconds during a bounded burst. Arcs stay close to the bolt. Motion preferences disable
generation, and effect cleanup clears pending timers.

## 2026-09-27: Replaced the reveal with electrical ignition #decision

The slow rise and halo felt generic. The entrance now sends a spark along the bevel, briefly shows
branching lime arcs around the bolt, and gives the body one quick recoil before settling. The
sequence lasts 1.2 seconds and leaves the face charge unchanged. Reduced motion and paused motion
skip the decorative effects.

## 2026-09-27: Slowed the bolt entrance #decision

The rise and lime pulse now last 1.1 seconds so the entrance has more time to register. The renderer
stays in its entrance state until the animation finishes.

## 2026-09-27: Made the bolt entrance more visible #decision

The matched-poster handoff was too quiet to register as an entrance. The bolt now rises 20 pixels
from a slightly smaller resting image, settles once, and emits a short lime rim glow over 760
milliseconds. Its orientation stays fixed through the handoff. Paused and reduced motion skip the
movement and pulse. A reload recording shows the rise and glow without the earlier double turn.

## 2026-09-27: Matched the loading poster to the 3D scene #decision

The static Blender render still caused a visible change in color and lighting when the live bolt
appeared. The dark and light posters now come from the Three.js scene at its resting pose. Both are
small transparent WebPs, and the bevel trace follows their outline. Reload recordings in both themes
show the bolt keeping its silhouette and material through the handoff.

## 2026-09-27: Removed the double turn on entrance #decision

The poster fold and the later 3D turn looked like two separate movements. The first rendered frame
now replaces the poster with a front-facing bolt in the same position. The bevel trace and orbit
entrance remain, while the bolt no longer twists during loading.

## 2026-09-27: Loaded nonlanding routes on demand #decision

A warm landing reload requested 77 scripts, including dashboard and study-room code that the page
did not show. React Router now loads those route modules only when visited and provides a loading
fallback for direct entry. A subsequent warm capture requested 46 scripts and painted content in
about 0.9 seconds. The preview tunnel had also disconnected during reloads; that transport issue
was separate from the page's script cost.

## 2026-09-27: Refined the entrance after watching recordings #decision

Dark and light recordings exposed a white first paint, a trace before its poster, an offset lime
outline, doubled bolt silhouettes, and labels crossing the turning model. The page now sets its
theme before React starts, preloads the poster, waits for its image before tracing, folds the poster
before the 3D turn, and holds the goal and charge labels at their resting positions until that turn
finishes.

## 2026-09-27: Added a bolt power-on entrance #decision

The fallback poster stays visible while the 3D scene loads. A lime trace follows the bevel twice;
the poster then folds edge-on before the rendered bolt turns into its resting view.
The orbit draws on before the duration bubbles settle at their calculated points. Paused or reduced
motion skips the sequence, and a failed load leaves the poster and controls available.

## 2026-09-26: Refined bolt hover feedback #decision

Hover and keyboard focus give the bolt a short, springy tilt and lift, with a crisp green rim and a
tighter outer halo matching the selected orbit mark. The metallic finish stays intact. Pressing it
settles back down. Paused or reduced-motion mode skips the animation.

## 2026-09-26: Tied bolt motion to timer state #decision

The bolt stays still at rest. Hover and keyboard focus brighten it slightly; pressing it gives a
small visual response. The orbit tracks elapsed time from the selected duration point and stops on
pause. After a saved session changes charge, the face fills in 700ms with a soft highlight along the
fill boundary. Goal and day details fade in. Reduced motion and the pause control skip these
effects.

## 2026-09-26: Snap duration bubbles to the orbit #decision

The 30, 60, and 90 minute bubbles now use points calculated from the SVG ellipse. ResizeObserver
keeps the HTML radio controls in place as the scene resizes, and each connector ends on its ring
point. The 90-minute bubble and its active arc sit on the lower-right to clear the bolt and charge
readout.

## 2026-09-26: Show goal selection only when it offers a choice #decision

The bolt's attached goal label stays plain text with zero or one saved goal. With two or more goals,
it becomes a keyboard-accessible selector. This removes the empty dropdown that appeared beside
“Focus session” before a visitor had added a goal.

## 2026-09-26: Made the landing bolt a real study timer #decision

The user wanted both guests and signed-in users to study without leaving the landing page and chose
tapping the bolt as the timer start action. The selected 30, 60, or 90-minute duration now starts a
countdown; taps pause and resume. Finishing after one minute saves elapsed time, and reaching the
duration saves automatically. The bolt displays saved charge and the current week. Guest sessions
write to browser storage, signed-in sessions use the existing account API, and neither route uses
the former instant-completion sample. Active countdowns also restore after refresh using a separate
browser key scoped to the guest or account owner.

## 2026-09-26: Added persistent local study for guests #decision

The user wanted unauthenticated visitors to use basic study features and keep their data in browser
storage. A separate guest route now holds local goals, timed study, logged sessions, charge, and
history. The landing bolt remains an instant sample. Guest records stay in versioned local storage
and never merge silently with signed-in account data or write to the backend.

## 2026-09-26: Removed the public demo's daily charge cap #decision

The demo now earns the full 5, 10, or 15 charge for each sample session until the bolt reaches 100%.
The +20 daily cap remains part of the signed-in account battery economy. The public demo still
starts at 0% and keeps all changes in memory.

## 2026-09-26: Started the public demo uncharged #decision

The user found a 60% starting charge confusing for an unauthenticated first visit. The sample now
starts at 0%, with an uncharged Blender render during loading and as the image fallback. The first
sample session creates the first visible fill. The existing account battery cap is unchanged; the
demo omits the account's daily charge cap and drain.

## 2026-09-26: Made the bolt the landing interaction #decision

The user chose a real 3D bolt with attached goal, duration, charge, and history controls. Replaced
the competing preview card and chapters with a single scene. Sample sessions stay local, start at
60%, and add up to 20 charge per day; drag only tilts the object. Exported the existing Blender
source to a 68 KB GLB with 1,932 triangles and corrected its face normals after screenshot review
exposed a missing front surface. Three.js loads separately, renders on demand, and falls back to the
existing image without losing controls. Keyboard, reduced-motion, pause, and failure behavior passed
along with all 22 smoke tests, 64 unit tests, 4 battery component tests, the existing coverage gate,
formatting, type, lint, and production-build checks. Reviewed both themes across five viewport
widths; mobile controls and history fit without overflow. The build still warns about large chunks,
including the deferred 154 KB gzipped 3D module. No backend, publication, or deployment changes were
made.

## 2026-09-26: Approved the reference capture waiver #decision

The user waived the egress-cleanup attestation blocker and directed finalization with the existing
Blender battery render and Lottie Creator charge sequence. Further live reference captures and
capture VM provisioning are out of scope. The reference workflow remains partial: no recordings,
temporal analyses, selected reference frames, or Open Design effect artifact were produced. The
ignored workflow manifest records the waiver without claiming those evidence gates passed. Final
formatting, type, lint, build, 4 battery component tests, 64 unit tests, 8 smoke tests, and 14
browser review checks passed. The battery test now renders through React instead of calling a
component with hooks as a plain function.

## 2026-09-26: Connected Creator and added charge feedback #milestone

The restored browser bridge exposed Creator tools through Chrome's native WebMCP CDP domain, even
though `navigator.modelContext` was absent. Created ten editable shape layers and a 2.4-second
charge sequence in the supplied empty project, then exported Lottie JSON. The landing page loads the
light SVG player only when the sample session is logged. Reduced motion skips the player; pausing or
an asset failure keeps the battery and charge status usable. Added playback, pause, no-request, and
failure checks. Reference capture and the Open Design handoff remain blocked under the user's
instruction to continue without another rental.

## 2026-09-26: Made the public page an interactive study workspace #decision

The user rejected the conventional landing and poster layouts and requested more animation. Replaced
the section stack with four scenes around an original Blender battery sculpture: choose a sample
goal, explore the timer, preview charge, and inspect a sample week. Scene changes retain the
selected goal; the preview never saves data. Added a motion pause control and a full reduced-motion
presentation. The optimized sculpture is about 19 KB and requires no 3D runtime. Visual review
caught implicit grid columns on narrow screens and an incorrect static-asset path; both were fixed
and the review checks now detect them. Open Design connectivity is repaired, but the
capture-dependent handoff remains blocked. After GPU recovery attempts, the user chose to continue
implementation without further rental time. No deployment or publication was requested.

## 2026-09-25: Rebuilt the public page around study charge #decision

Replaced the placeholder with a plan, focus, charge, and analytics narrative using the existing
battery, fonts, and lime tokens. The preview models a 30-minute log below the charge cap, without
starting a timer or saving a session; reduced motion changes the fill immediately. After the initial
quiet composition was rejected in review, Native became the primary static reference for oversized
brand geometry, with Turn.io and Vooban as secondary references, all verified as dated SOTD winners.
Live CPU/GPU/egress preflight passed, but capture acceptance remains unverified and the Open Design
daemon was unreachable, so those workflow stages remain blocked. Research and screenshots stay in
ignored artifacts. Keyboard review reproduced missing arrow navigation and focus return in the
shared theme menu; the existing Radix dependency now handles both. Garden-based landing styles and
metadata were removed. Validation results are recorded separately from the incomplete reference
workflow in the local review report.

## 2026-09-17 — Separated frontend and Deno typechecking #maintenance

The root `check` task now runs strict frontend TypeScript for application code, then Deno
typechecking for all authored browser tests, followed by the existing Supabase Edge Function check
under its native Deno configuration. No runtime or dependency changes were made. Subagent execution
was unavailable in this session, so the configuration repair and verification were completed
directly.

## 2026-08-29: Git deployment branches restricted #decision

Git-triggered Vercel deployments now run only for `main` and `staging`. The project keeps `main` as
its Production Branch, so `staging` is the only Preview branch. Replaced the old `ignoreCommand`,
which created canceled deployment records for blocked branches, with `git.deploymentEnabled`.

## 2026-08-21 — Ported StudySprint demo compositions to HyperFrames #milestone #decision

Added canonical HyperFrames source projects for TheInterval (`trailer/`) and the 9:16 social cut
(`ui-demo/`). The landscape UI demo remains local but is excluded from the canonical set. The UI
footage uses preconformed 30 fps video with the original 0.85x playback rate baked into the file;
this avoids HyperFrames' partial-source coverage failure without lowering the coverage gate. The
three 30 fps renders completed successfully and passed lint, pilot unit tests, stream checks, and
visual review. TheInterval retains a 0.88-second silence that is present in its supplied music bed
rather than introduced by the renderer.

## 2026-08-20 — Restored Deno as the VM workflow for StudySprint #maintenance

Installed Deno 2.9.5 on ampere-dev and confirmed `deno task check` passes there. The root
`package-lock.json` remains for Vercel's Node-only build environment, as documented in the existing
toolchain decision. StudySprint's local tasks and dependency resolution on the VM now run through
`deno.json` and Deno's `npm:` imports.

## 2026-08-20 — Replaced the plant visual system with continuous study charge #decision #milestone

The battery economy now has a matching interface. `BatteryBolt` fills a familiar lightning-bolt
silhouette from red through amber to lime, pulses only at 80% charge or higher, and respects
reduced-motion settings. Garden and landing views use it directly, while the old stage bridge,
`VirtualPlant`, and `FlowerPot` are gone. The remaining `/garden` route stays stable for existing
links, but its visible navigation and copy now say study charge. The Deno component tests need an
ampere-dev image with Deno available to run, while TypeScript checking and the Vite production build
passed on the VM.

## 2026-07-26 — Built Tier 2/3 demo videos, and hit a production RLS gap along the way #milestone #incident

Shipped a synthetic-history seeder (`e2e/setup/seed-demo-history.ts`) that backdates 96 sessions
across a 45-day streak to exactly 19,438 XP, close enough under the plant's level-14 threshold that
logging one real 90-minute "Mastered" session during recording flips `young_tree` → `mature_tree` on
camera, which is the money shot both videos are built around. Recorded a single continuous
Playwright take (`e2e/demo/features/10-tour.feature`) and cut it into a ~63s `ui-demo/` Remotion
piece (landscape master plus a vertical social cut) and a ~50s generative `trailer/` piece ("The
Interval": an accreting contribution grid plus the app's own `VirtualPlant` SVGs, re-driven off
`useCurrentFrame()` instead of their normal `motion/react` wall-clock animation). Along the way,
unblocked a genuinely broken Playwright/npm toolchain: missing test deps in `package.json`, a
`recharts`-pinned `playwright@1.59.1` conflict, a broken `1.62.0` registry release, and a transitive
postinstall hook that silently ran `deno` against the npm-installed `node_modules` and corrupted it
(fixed with `--ignore-scripts` plus exact version pins). Also found a live production bug: the
`subjects_insert_authenticated` RLS policy from migration `20260505000100_goals_with_stats.sql` was
never applied, so syllabus-import's subject-tagging 403s for every real user, not just the demo
account. Worked around it for recording by tagging the stubbed syllabus goals with empty subject
lists; the actual fix needs someone with database credentials to run the missing migration.

## 2026-07-24 — Synchronized Deno/Node dependency manifests & documented Supabase API #decision #maintenance

Synchronized version pins between `deno.json#imports` and `package.json` (`react` 19.2.8,
`@supabase/supabase-js` 2.110.8, `react-router` 8.3.0, `@tailwindcss/vite` 4.3.3) to resolve package
version drift between local Deno development and Node-based Vercel deployment runners. Authored
comprehensive Supabase backend API documentation at `docs/API-SUPABASE.md` covering all 5 custom
PostgreSQL stored procedures (`analytics_summary`, `set_goal_subjects`, `get_public_profile`,
`get_weekly_leaderboard`, `reset_account_data`) and Edge Functions.

## 2026-05-11 — Hand-rolled a password validator because HIBP is Pro-tier #decision

Added the change-password flow on `/settings`, which meant deciding how strict to be about weak
passwords. Supabase's leaked-password protection (HIBP lookup) is gated behind the Pro plan, and
this project runs on the free tier. Rather than ship nothing, I wrote a shared client-side validator
(min 8 chars, reject all-numeric, block `password*`/`123456*`/`qwerty*` prefixes) used by both
Register and Settings as a compensating control. It's not a substitute for HIBP — a determined user
can still pick a leaked password not on the prefix list — but it catches the lazy 90%. Five e2e
scenarios cover it: happy path plus four failure modes. Worth noting if the project ever moves to
Pro: delete the custom validator, don't stack it.

## 2026-05-07 — `.env` loader broke because the repo lives under a path with spaces #incident

The e2e suite passed locally but the goal-deletion scenario stayed red in CI, and the root cause was
the project path: `My Drive (yvaughan@wesleyan.edu)`. Both `playwright.config.ts` and `teardown.ts`
resolved `.env` relative to themselves via `new URL().pathname` — but `pathname` returns the
percent-encoded path, so the spaces and parens became `%20` / `%28` / `%29`, `existsSync` silently
reported false, the loader bailed, and worker processes couldn't find `SUPABASE_URL`. Switched to
`fileURLToPath`, which decodes. Lesson: never use `URL.pathname` to touch the filesystem — it's a
URL component, not a path. This bug is invisible on any repo that lives under a clean path, which is
most of them, which is why it survived to CI.

## 2026-05-07 — Migrated the whole toolchain to Deno #pivot

`deno.json` is now the source of truth for tasks and npm dependencies — one TS toolchain across the
React frontend and the Supabase Edge Functions, no more Node/npm split. Entry points became
`deno task dev/build/test`. Two snags worth remembering: Playwright probes `process.versions.node`
and rejects the value Deno's Node-compat layer reports, so the test runner has to be invoked
node-direct (`node ./node_modules/.bin/playwright`) even though everything else runs through Deno;
and the MCP deploy tool doesn't bundle relative `../` imports cleanly, so the shared auth helper got
inlined into each Edge Function body. A slim `package.json` mirroring `deno.json#imports` stays
around purely so IDE tooling and the Vercel build path have something to probe.

## 2026-05-07 — Retired the entire Express backend for Supabase #pivot #milestone

Finished a multi-phase rewrite that deleted `backend/` wholesale. Every endpoint moved either to a
Supabase RPC (goals, sessions, profile, leaderboard, public profile, room CRUD, account reset) or to
a Deno Edge Function (syllabus parser, Google Calendar). The architectural bet: lean on Row Level
Security as the authoritative ownership guard so most CRUD goes direct from the browser to PostgREST
with no server in the middle. Cross-user reads that RLS necessarily denies (leaderboard, another
user's public profile) became `SECURITY DEFINER` RPCs with explicit `auth.uid()` checks.
Gamification stayed client-side on purpose — the streak/achievement logic is timezone-aware JS and
porting it to plpgsql would've been lossy, and the input is only the caller's own RLS-protected
sessions anyway. One sharp edge: `REVOKE FROM PUBLIC` wasn't enough, because Supabase separately
auto-grants new functions to the `anon` role on creation — had to explicitly `REVOKE FROM anon` on
every cross-user RPC.

## 2026-04-29 — The free-model 429 carousel, and why we went back to where we started #incident #decision

Spent a full day chasing OpenRouter free-tier rate limits on the syllabus parser and rotated through
nearly every option: pinned Llama 3.3 70B (429'd within seconds), Qwen 2.5 72B, gpt-oss-120b (a
reasoning model that wrote chain-of-thought prose instead of JSON), a 3-model fallback chain
(`models: [...]`, capped at 3 because OpenRouter 400s on longer arrays), then the `openrouter/free`
meta-router. The trap: pairing `json_schema` `strict:true` with `provider.require_parameters:true`
filtered the free pool to _zero_ endpoints and returned a 404 "No endpoints found." Final answer was
to revert to `openrouter/free` with the schema sent only as a hint (`strict:false`), and lean on a
hand-rolled `extractJsonObject` (direct parse → fenced-block → greedy `{...}`) plus an explicit
"respond with ONE JSON object and nothing else" prompt to handle the tail cases. The honest lesson:
with free models you don't control which model answers, so the only durable fix is to be liberal in
what you accept on the response side, not strict in what you demand on the request side.

## 2026-04-24 — `_redirects` file beat the Render blueprint #incident

`/dashboard` and every client-routed path 404'd in production. The `render.yaml` SPA rewrite rule
never took effect because the actually-deployed service (`studysprint-frontend`) didn't match the
blueprint's service name (`study-sprint-web`) — the rule was attached to a service that didn't
exist. Rather than reconcile the names, shipped a `_redirects` file inside the build itself, which
Render's static hosting reads verbatim and bypasses blueprint/dashboard config entirely. Lesson:
when infra-as-config silently no-ops, prefer the convention-based file that lives next to the
artifact over the named-resource indirection that can drift.

## 2026-04-24 — Express route order silently swallowed `/profiles/me` #incident

`GET /api/profiles/me` was returning 404 because Express matches routes in declaration order, and
the public `/profiles/:username` handler was registered first — so it caught `/me` with
`username = "me"`, looked up a non-existent public user, and 404'd. Fix was to register
`/profiles/me` (with `requireAuth`) _before_ the public `:username` route. Classic ordering footgun;
worth remembering that literal path segments must always precede param segments that could capture
them.

## 2026-04-23 — Built nine features in one day off existing schema #milestone #decision

Shipped the Pomodoro timer + spaced-repetition hints, focus-tools panel (Web Audio ambient noise so
nothing ships as an audio asset), the analytics dashboard with a hand-rolled SVG contribution
heatmap, the AI syllabus parser, Google Calendar OAuth, gamification (XP/levels/virtual plant), and
the social layer (profiles/leaderboard/study rooms) — all in a single dense day. The throughline
decision: derive everything from the existing `study_sessions` table instead of adding counters. XP,
levels, plant stage, streaks, and all 10 achievements are computed on demand from session rows, so
there's no stale state to reconcile — log a session and every number updates consistently. Same
instinct kept dashboard filtering/sorting client-side: the goals list is small and doesn't warrant a
round-trip.

## 2026-04-21 — Renamed StudyQuill to StudySprint on day one #decision

The project shipped its first commits as "StudyQuill" and got renamed to "StudySprint" within the
same day, across the README and the API token. Noting it because the old name still lurks in early
git history and could confuse anyone archaeologizing the repo — "Quill" was never the real product,
"Sprint" (focus sessions, streaks, the garden filling in fast) is.
