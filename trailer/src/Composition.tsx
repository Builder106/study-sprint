import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Grid, LIT_ORDER } from "./Grid";
import { Battery } from "./Plant";
import { BeatText } from "./scenes/BeatText";
import { LIME, NEAR_BLACK } from "./theme";
import { B1, B2, B3, B4, B5, B6, TOTAL_FRAMES, REAL_STATS } from "./timeline";

const TOTAL_LIT = LIT_ORDER.length;

// Cumulative lit-cell count across the whole piece — the grid keeps growing
// through beats 1-4 rather than resetting per scene, so litCount is driven
// off the absolute frame, not each Sequence's local frame.
function litCountForFrame(frame: number): number {
  return Math.round(
    interpolate(
      frame,
      [0, B1.from + B1.duration, B2.from + B2.duration, B3.from + B3.duration, B4.from + B4.duration],
      [0, 1, 8, 32, TOTAL_LIT],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    ),
  );
}

// Charge rises with early sessions, drains through the gap, then fills again.
function chargeForFrame(frame: number): number {
  if (frame < B1.from + B1.duration) {
    return Math.round(interpolate(frame, [0, B1.from + B1.duration], [0, 1]));
  }
  const gapMid = B2.from + B2.duration * 0.55;
  if (frame < gapMid) {
    return Math.round(interpolate(frame, [B1.from + B1.duration, gapMid], [1, 0]));
  }
  if (frame < B4.from + B4.duration) {
    return Math.round(
      interpolate(frame, [gapMid, B4.from + B4.duration], [0, REAL_STATS.chargePct], {
        extrapolateLeft: "clamp",
      }),
    );
  }
  return REAL_STATS.chargePct;
}

const GridLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const litCount = litCountForFrame(frame);
  const inGardenBeat = frame >= B5.from;
  const opacity = interpolate(frame, [B4.from + B4.duration, B5.from + B5.duration * 0.4], [1, 0.22], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [B4.from, B4.from + B4.duration], [1, 0.72], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame, [B4.from, B4.from + B4.duration], [0, -260], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (frame >= B6.from) return null;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          transform: `scale(${scale}) translateY(${translateY}px)`,
          opacity: inGardenBeat ? opacity : 1,
        }}
      >
        <Grid litCount={litCount} />
      </div>
    </AbsoluteFill>
  );
};

const ChargeReadout: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame >= B4.from) return null;
  const charge = chargeForFrame(frame);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: 260 }}>
      <div
        style={{
          fontFamily: "Inter, sans-serif",
          fontWeight: 800,
          fontSize: 96,
          color: charge === 0 ? "rgba(255,255,255,0.35)" : LIME,
        }}
      >
        {charge}%
        <span style={{ fontSize: 32, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>
          {" "}
          charge
        </span>
      </div>
    </AbsoluteFill>
  );
};

const PlantLayer: React.FC = () => {
  const frame = useCurrentFrame();
  // Beats 5 and 6 render their own Plant (GardenBeat / InvitationBeat) —
  // stop here or the tree doubles up on screen.
  if (frame >= B5.from) return null;
  let charge = 0;
  if (frame >= B3.from) charge = interpolate(frame, [B3.from, B4.from + B4.duration], [8, 100], { extrapolateRight: "clamp" });
  else return null;

  const inCompound = frame >= B4.from;
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: inCompound ? 60 : 90,
      }}
    >
      <Battery charge={charge} size={inCompound ? 220 : 200} />
    </AbsoluteFill>
  );
};

const CounterRow: React.FC = () => {
  // Rendered inside <Sequence from={B4.from}>, so useCurrentFrame() is
  // already local to that sequence — don't subtract B4.from again.
  const frame = useCurrentFrame();
  const p = interpolate(frame, [40, B4.duration - 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hours = Math.round(REAL_STATS.totalHours * p);
  const sessions = Math.round(REAL_STATS.totalSessions * p);

  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 560 }}>
      <div style={{ display: "flex", gap: 72 }}>
        <Stat value={`${hours}h`} label="studied" />
        <Stat value={`${sessions}`} label="sessions" />
        <Stat value={`${REAL_STATS.chargePct}%`} label="charge" />
      </div>
    </AbsoluteFill>
  );
};

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 800, fontSize: 64, color: LIME }}>
      {value}
    </div>
    <div
      style={{
        fontFamily: "Inter, sans-serif",
        fontWeight: 500,
        fontSize: 22,
        color: "rgba(255,255,255,0.55)",
        letterSpacing: 1,
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
  </div>
);

const SUBJECT_COLORS = ["#ccff00", "#8fd6ff", "#ff9ecb", "#ffd166", "#9d8dff"];

const SubjectDonut: React.FC = () => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const r = 210;
  const circumference = 2 * Math.PI * r;
  const shares = [0.35, 0.25, 0.18, 0.12, 0.1];
  let acc = 0;

  return (
    <svg width={520} height={520} style={{ position: "absolute" }}>
      <g transform="translate(260,260) rotate(-90)">
        {shares.map((share, i) => {
          const len = share * circumference * p;
          const dasharray = `${len} ${circumference - len}`;
          const dashoffset = -acc * circumference;
          acc += share * p;
          return (
            <circle
              key={i}
              r={r}
              fill="none"
              stroke={SUBJECT_COLORS[i]}
              strokeWidth={18}
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              strokeLinecap="round"
              opacity={0.9}
            />
          );
        })}
      </g>
    </svg>
  );
};

const GardenBeat: React.FC = () => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
    <SubjectDonut />
    <Battery charge={100} size={260} />
    <div style={{ position: "absolute", bottom: 140 }}>
      <BeatText text="Every subject. Every hour you actually studied." size={38} />
    </div>
  </AbsoluteFill>
);

const InvitationBeat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateLeft: "clamp" });
  // Plant's own sway is too subtle at this size to escape freezedetect on a
  // held closing shot — a slow breathing scale on the whole block keeps it
  // reading as alive (same fix as ui-demo's Endcard.tsx).
  const breathe = 1 + Math.sin((frame / fps) * (Math.PI * 2 / 4)) * 0.012;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ opacity, transform: `scale(${breathe})`, textAlign: "center" }}>
        <Battery charge={100} size={180} />
        <div
          style={{
            marginTop: 24,
            fontFamily: "Inter, sans-serif",
            fontWeight: 800,
            fontSize: 76,
            color: "white",
            letterSpacing: -1,
          }}
        >
          Charge <span style={{ color: LIME }}>something.</span>
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: "Inter, sans-serif",
            fontWeight: 500,
            fontSize: 26,
            color: "rgba(255,255,255,0.7)",
          }}
        >
          getstudysprint.vercel.app
        </div>
      </div>
    </AbsoluteFill>
  );
};

const MusicBed: React.FC = () => {
  const frame = useCurrentFrame();
  const volume = interpolate(
    frame,
    [0, 30, B4.from - 10, B4.from + 40, TOTAL_FRAMES - 60, TOTAL_FRAMES],
    [0, 0.5, 0.5, 0.62, 0.62, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return <Audio src={staticFile("music-bed.mp3")} volume={volume} />;
};

export const TheInterval: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: NEAR_BLACK }}>
      <MusicBed />
      <GridLayer />
      <ChargeReadout />
      <PlantLayer />
      <Sequence from={B1.from} durationInFrames={B1.duration}>
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 120 }}>
          <BeatText text="One session." />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={B2.from} durationInFrames={B2.duration}>
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 120 }}>
          <BeatText text="Most people stop here." delay={40} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={B3.from} durationInFrames={B3.duration}>
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 120 }}>
          <BeatText text="The only job is making day two easier." delay={30} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={B4.from} durationInFrames={B4.duration}>
        <CounterRow />
      </Sequence>
      <Sequence from={B5.from} durationInFrames={B5.duration}>
        <GardenBeat />
      </Sequence>
      <Sequence from={B6.from} durationInFrames={B6.duration}>
        <InvitationBeat />
      </Sequence>
    </AbsoluteFill>
  );
};
