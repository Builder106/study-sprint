// Cue-frame constants for "The Interval". Beats overlap by 15-20 frames so
// each starts inside the previous one's fade (see video-production skill —
// beats that butt instead of overlap leave dead-air gaps at the cut).
export const B1 = { from: 0, duration: 210 }; // THE EMPTY GRID
export const B2 = { from: 195, duration: 240 }; // THE GAP
export const B3 = { from: 420, duration: 315 }; // THE RETURN
export const B4 = { from: 720, duration: 360 }; // THE COMPOUND
export const B5 = { from: 1065, duration: 240 }; // THE GARDEN
export const B6 = { from: 1290, duration: 210 }; // INVITATION

export const TOTAL_FRAMES = B6.from + B6.duration;

// The real seeded account's post-recording totals (confirmed via
// `deno task seed:demo:dry-run` against production — see
// e2e/setup/seed-demo-history.ts). Beat 4 must show real numbers, not
// invented ones.
export const REAL_STATS = {
  totalHours: 199,
  totalSessions: 97,
  streakDays: 45,
  subjects: 5,
};
