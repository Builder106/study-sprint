import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FootageBeat } from "./scenes/FootageBeat";
import { Caption } from "./scenes/Caption";
import { Endcard } from "./scenes/Endcard";
import {
  ENDCARD_DURATION,
  PLAYBACK_RATE,
  SOCIAL_ENDCARD_FROM,
  SOCIAL_PLACED_BEATS,
  SOCIAL_TOTAL_FRAMES,
} from "./timeline";

// Same footage, same beat components as StudySprintUiDemo — just the
// hook/log/payoff/endcard beats (timeline.ts filters on Beat.social),
// laid out for a 1080x1920 frame. FootageBeat's objectFit:cover center-crops
// the same source automatically at the taller aspect ratio.
const MusicBed: React.FC = () => {
  const frame = useCurrentFrame();
  const volume = interpolate(
    frame,
    [0, 20, SOCIAL_TOTAL_FRAMES - 40, SOCIAL_TOTAL_FRAMES],
    [0, 0.55, 0.55, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return <Audio src={staticFile("music-bed.mp3")} volume={volume} />;
};

export const StudySprintUiDemoSocial: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <MusicBed />
      {SOCIAL_PLACED_BEATS.map((beat) => (
        <Sequence key={beat.key} from={beat.from} durationInFrames={beat.durationInFrames}>
          <FootageBeat
            src="tour-dark.mp4"
            srcStart={beat.srcStart}
            durationInFrames={beat.durationInFrames}
            playbackRate={PLAYBACK_RATE}
          />
          <Caption text={beat.caption} align="center" />
        </Sequence>
      ))}
      <Sequence from={SOCIAL_ENDCARD_FROM} durationInFrames={ENDCARD_DURATION}>
        <Endcard />
      </Sequence>
    </AbsoluteFill>
  );
};
