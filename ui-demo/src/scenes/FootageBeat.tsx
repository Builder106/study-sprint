import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TRANSITION_FRAMES } from "../timeline";

// A trimmed slice of the raw screen recording. The crossfade lives on this
// inner wrapper's opacity, never on the composition's root AbsoluteFill —
// fading the root fades to encoder black instead of the next beat.
// A slow scale drift keeps the shot alive during long dwells: freezedetect
// (and a real viewer) reads a fully static hold as a stalled player.
export const FootageBeat: React.FC<{
  src: "tour-dark.mp4" | "tour-light.mp4";
  srcStart: number;
  durationInFrames: number;
  playbackRate: number;
  driftTo?: number;
}> = ({ src, srcStart, durationInFrames, playbackRate, driftTo = 1.045 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const opacity = interpolate(
    frame,
    [0, TRANSITION_FRAMES, durationInFrames - TRANSITION_FRAMES, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const scale = interpolate(frame, [0, durationInFrames], [1, driftTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <AbsoluteFill style={{ opacity }}>
        <AbsoluteFill
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "50% 42%",
          }}
        >
          <OffthreadVideo
            src={staticFile(src)}
            startFrom={Math.round(srcStart * fps)}
            playbackRate={playbackRate}
            style={{
              width,
              height,
              objectFit: "cover",
            }}
          />
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
