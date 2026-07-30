import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FootageBeat } from "./scenes/FootageBeat";
import { Caption } from "./scenes/Caption";
import { Endcard } from "./scenes/Endcard";
import {
  ENDCARD_DURATION,
  ENDCARD_FROM,
  PLACED_BEATS,
  PLAYBACK_RATE,
  TOTAL_FRAMES,
} from "./timeline";

const MusicBed: React.FC = () => {
  const frame = useCurrentFrame();
  const volume = interpolate(
    frame,
    [0, 30, TOTAL_FRAMES - 60, TOTAL_FRAMES],
    [0, 0.55, 0.55, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return <Audio src={staticFile("music-bed.mp3")} volume={volume} />;
};

export const StudySprintUiDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <MusicBed />
      {PLACED_BEATS.map((beat) => (
        <Sequence key={beat.key} from={beat.from} durationInFrames={beat.durationInFrames}>
          <FootageBeat
            src="tour-dark.mp4"
            srcStart={beat.srcStart}
            durationInFrames={beat.durationInFrames}
            playbackRate={PLAYBACK_RATE}
          />
          <Caption text={beat.caption} />
        </Sequence>
      ))}
      <Sequence from={ENDCARD_FROM} durationInFrames={ENDCARD_DURATION}>
        <Endcard />
      </Sequence>
    </AbsoluteFill>
  );
};
