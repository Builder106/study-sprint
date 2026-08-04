# StudySprint Tier 2 — "The compounding loop"

~60–65s landscape master (`StudySprintUiDemo`, 1920×1080 @30fps) plus a shorter
vertical social cut (`StudySprintUiDemoSocial`, 1080×1920) built from the same
raw take. Both are trimmed slices of a single continuous Playwright recording
(`e2e/demo/features/10-tour.feature`); see `src/timeline.ts` for exact
in/out points and `../e2e/setup/seed-demo-history.ts` for the seeded account
the recording runs against.

| # | Beat | Visual | Caption | Social cut |
| --- | --- | --- | --- | --- |
| 1 | HOOK | `/garden`, plant at `young_tree`, streak card, XP bar | "45 days of studying looks like this." | yes |
| 2 | THE UNIT | Pomodoro → 25:00 Focus, switch to Stopwatch, Start | "It starts with one timer." | no |
| 3 | THE LOG | Session modal, 90min / Mastered, save, lands in recent sessions | "Rate it — it schedules the review." | yes |
| 4 | THE RECORD | `/analytics` heatmap | "Every session lands somewhere." | no |
| 5 | THE PAYOFF | `/garden` again — plant flips to `mature_tree`, achievements grid | "…and the plant grows." | yes |
| 6 | THE SHORTCUT | Syllabus import: paste → suggest → create goals | "Or paste a syllabus and skip the setup." | no |
| 7 | THE ROOM | `/community` leaderboard + study room members/activity | "Nobody studies alone." | no |
| 8 | ENDCARD | Wordmark, URL | — | yes |

Because every beat is a trim of one continuous take in recording order, beat
boundaries are all continuous cuts, not skip cuts, so no push/swipe transition
is needed; a 12-frame crossfade (`TRANSITION_FRAMES` in `timeline.ts`) plus a
slow scale drift on each shot (keeps `freezedetect` and real viewers from
reading a held frame as a stall) is enough.

Music bed: `public/music-bed.mp3`, credited in `public/CREDITS.md`.
