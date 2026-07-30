import { Composition } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { TheInterval } from "./Composition";
import { TOTAL_FRAMES } from "./timeline";
import { FPS } from "./theme";

loadFont();

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="TheInterval"
      component={TheInterval}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
