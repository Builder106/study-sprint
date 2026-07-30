import { sec } from "./theme";

// Every beat is a trim of the SAME continuous take
// (ui-demo-raw/10-tour-...-dark.mp4 / -light.mp4), in the order it was
// recorded — e2e/demo/features/10-tour.feature's eight Gherkin beats map
// 1:1 onto these. Timestamps were read off a 2.5s-interval contact sheet of
// the dark pass, so treat them as approximate: re-check against extracted
// frames before a final render, per the video-production skill.
//
// playbackRate < 1 slows the source slightly (footage recorded at
// DEMO_SLOWMO=1200 is already deliberate, but a touch more give lets
// captions breathe) and stretches the ~56s of raw beats to something closer
// to the ~75s target without needing new footage.
const PLAYBACK_RATE = 0.85;

export type Beat = {
  key: string;
  caption: string;
  srcStart: number; // seconds into the source take
  srcEnd: number; // seconds into the source take
  social: boolean; // included in the 1080x1920 cut
};

export const BEATS: Beat[] = [
  {
    key: "hook",
    caption: "45 days of studying looks like this.",
    srcStart: 8.2,
    srcEnd: 12.5,
    social: true,
  },
  {
    key: "unit",
    caption: "It starts with one timer.",
    srcStart: 14.0,
    srcEnd: 19.4,
    social: false,
  },
  {
    key: "log",
    caption: "Rate it — it schedules the review.",
    srcStart: 19.4,
    srcEnd: 29.4,
    social: true,
  },
  {
    key: "record",
    caption: "Every session lands somewhere.",
    srcStart: 29.6,
    srcEnd: 33.0,
    social: false,
  },
  {
    key: "payoff",
    caption: "…and the plant grows.",
    srcStart: 33.0,
    srcEnd: 40.0,
    social: true,
  },
  {
    key: "shortcut",
    caption: "Or paste a syllabus and skip the setup.",
    srcStart: 44.0,
    srcEnd: 58.0,
    social: false,
  },
  {
    key: "room",
    caption: "Nobody studies alone.",
    srcStart: 62.8,
    srcEnd: 70.4,
    social: false,
  },
];

// 12-frame crossfade between consecutive beats.
const TRANSITION_FRAMES = 12;

type PlacedBeat = Beat & { from: number; durationInFrames: number };

function place(beats: Beat[]): { placed: PlacedBeat[]; endFrame: number } {
  let cursor = 0;
  const placed: PlacedBeat[] = [];
  for (const beat of beats) {
    const durationInFrames = Math.round(
      ((beat.srcEnd - beat.srcStart) / PLAYBACK_RATE) * 30,
    );
    const from = Math.max(0, cursor - TRANSITION_FRAMES);
    placed.push({ ...beat, from, durationInFrames });
    cursor = from + durationInFrames;
  }
  return { placed, endFrame: cursor };
}

const { placed: MASTER_PLACED, endFrame: masterFootageEnd } = place(BEATS);
export const PLACED_BEATS = MASTER_PLACED;
export { PLAYBACK_RATE, TRANSITION_FRAMES };

export const ENDCARD_DURATION = sec(4.5);
export const ENDCARD_FROM = Math.max(0, masterFootageEnd - TRANSITION_FRAMES);
export const TOTAL_FRAMES = ENDCARD_FROM + ENDCARD_DURATION;

const { placed: SOCIAL_PLACED, endFrame: socialFootageEnd } = place(
  BEATS.filter((b) => b.social),
);
export const SOCIAL_PLACED_BEATS = SOCIAL_PLACED;
export const SOCIAL_ENDCARD_FROM = Math.max(
  0,
  socialFootageEnd - TRANSITION_FRAMES,
);
export const SOCIAL_TOTAL_FRAMES = SOCIAL_ENDCARD_FROM + ENDCARD_DURATION;
