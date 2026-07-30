import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const BeatText: React.FC<{ text: string; size?: number; delay?: number }> = ({
  text,
  size = 40,
  delay = 0,
}) => {
  const frame = useCurrentFrame() - delay;
  const { fps, durationInFrames } = useVideoConfig();
  const enter = spring({ frame: Math.max(frame, 0), fps, config: { damping: 200, mass: 0.6 } });
  const exitOpacity = interpolate(
    frame,
    [durationInFrames - delay - 18, durationInFrames - delay],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const opacity = frame < 0 ? 0 : Math.min(interpolate(enter, [0, 1], [0, 1]), exitOpacity);
  const translateY = interpolate(enter, [0, 1], [14, 0]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        fontFamily: "Inter, sans-serif",
        fontWeight: 600,
        fontSize: size,
        color: "white",
        letterSpacing: -0.5,
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
};
