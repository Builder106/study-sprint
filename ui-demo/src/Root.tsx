import { Composition } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { StudySprintUiDemo } from "./Composition";
import { StudySprintUiDemoSocial } from "./CompositionSocial";
import { TOTAL_FRAMES, SOCIAL_TOTAL_FRAMES } from "./timeline";
import { FPS } from "./theme";

loadFont();

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="StudySprintUiDemo"
        component={StudySprintUiDemo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="StudySprintUiDemoSocial"
        component={StudySprintUiDemoSocial}
        durationInFrames={SOCIAL_TOTAL_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
