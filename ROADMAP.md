# StudySprint Roadmap

High-level feature roadmap and technical milestones for StudySprint.

The product direction is a study timer that knows your syllabus: focused time
is measured against the deadlines parsed from your courses, and the battery
shows whether you are ready for what is coming. Syllabus import alone is no
longer rare among study apps, so the order below builds the part competitors
lack: focus time measured against parsed deadlines.

## v1.1 — Battery & Economy Mechanics

- **Battery System Integration**: Implement dynamic energy economy and visual battery degradation models per [`docs/specs/2026-08-12-battery-economy-plan.md`](docs/specs/2026-08-12-battery-economy-plan.md).
- **HUD Micro-Interactions**: Real-time energy meters and animated battery state transitions per [`docs/specs/2026-08-13-battery-visual-plan.md`](docs/specs/2026-08-13-battery-visual-plan.md).

## v1.2 — Deadline Pace & Readiness

- **Pace Engine**: For each goal, compare logged minutes against `target_hours` over the days left before `target_date`. Show ahead, on pace, or behind, and the hours per day still needed. Uses existing columns, so no schema change.
- **Today View**: Rank what to study today by urgency from the pace engine.
- **Readiness Battery**: Replace the flat daily drain with drain driven by pace, so a goal that is behind with a close deadline drains faster. Show charge per course as well as overall. Compute it once in SQL to avoid the formula drift described in the battery economy design. Needs its own spec before work starts.

## v1.3 — Course Structure & Rooms

- **Parser Upgrades**: Extend `syllabus-parse` and the schema with a course grouping, a goal type (exam, assignment, reading), and a grade weight, and derive `target_hours` from the weight. Add a review-and-edit step before import if one does not exist.
- **Course-Scoped Rooms**: Extract school, course code, and term from the syllabus, store that key on `study_rooms`, and suggest the matching room after an import. Course codes need normalization ("CS 101" and "COMP101").

## v1.4 — Review & Study Modes

- **Exam-Anchored Review Queue**: Schedule review sessions backward from `target_date`, using the session `quality` rating and `next_review_at` to weight topics. Topics only, with no flashcard content.
- **Tier 2/3 Study Modalities**: Spaced repetition interval timers and pomodoro sprint customization.
- **Offline Sync**: Local IndexedDB caching for distraction-free study sessions without network dependence.
- **Calendar Write-Back**: Push the daily plan to Google Calendar using the existing export flow.

## Out of Scope

- Intrusive notifications or advertising networks
- Complex server-side user data harvesting
- Flashcards, note-taking, and general planner features that compete with Anki and Notion
- Additional streak or XP mechanics beyond the battery

---
For detailed technical specifications, see [`docs/specs/`](docs/specs/).
