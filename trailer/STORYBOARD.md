# StudySprint Tier 3 — "The Interval"

~50s, 1920×1080 @30fps, ~1500 frames. Pure Remotion, generative, battery-driven.
No screenshots, no UI chrome, no 3D. Near-black ground, lime `#ccff00` accent.

| # | Frames | Beat | Content |
| --- | --- | --- | --- |
| 1 | 0–210 | THE EMPTY GRID | 7×53 grid on near-black. One cell lights lime. Type: "One session." |
| 2 | 195–435 | THE GAP | A few more cells light, then a long empty run. Battery charge falls to 0. Type: "Most people stop here." |
| 3 | 420–735 | THE RETURN | Cells resume, quicker. A low battery starts filling below the grid. Type: "The only job is making day two easier." |
| 4 | 720–1080 | THE COMPOUND | Grid accelerates to a full year. Battery charge climbs from low to full. Counters show the seeded totals (`timeline.ts#REAL_STATS`, sourced from `deno task seed:demo:dry-run`). |
| 5 | 1065–1305 | THE CHARGE | Pull back. Subject-colored donut arcs resolve around a full battery. Type: "Every subject. Every hour you actually studied." |
| 6 | 1290–1500 | INVITATION | Wordmark, URL, "Charge something." Final frame holds on the full battery. |

Each beat starts 15–20 frames inside the previous one's fade (see `timeline.ts`'s
`B1`..`B6` overlap) rather than butting cleanly, per the video-production skill.

## Why this isn't MicroMatch's trailer

- MicroMatch's is a transaction between two parties: quarter hour, turn,
  match, stream, record, invitation. This is one person over time; there's no
  second party in frame at any point.
- MicroMatch renders discrete cards on cream with a Blender-rendered laptop
  as furniture. This has two continuously accreting objects (grid + plant) on
  near-black and no 3D asset at all.
- MicroMatch's spine is an offer. This one names a failure mode in beat 2,
  that most people quit, and the product is the answer to it.
- The battery art follows the running app's `BatteryBolt.tsx` component rather
  than using a modelled prop.

Music: `public/music-bed.mp3`, credited in `public/CREDITS.md`, deliberately
not one of the four tracks already auditioned for MicroMatch or Tier 2's
"Undaunted".
