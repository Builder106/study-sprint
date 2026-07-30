import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { LIME } from "../theme";

export const Caption: React.FC<{ text: string; align?: "left" | "center" }> = ({
  text,
  align = "left",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200, mass: 0.6 } });
  const exitStart = durationInFrames - 14;
  const exitOpacity = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(enter, [0, 1], [18, 0]);
  const opacity = Math.min(interpolate(enter, [0, 1], [0, 1]), exitOpacity);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: align === "center" ? "center" : "flex-start",
      }}
    >
      <AbsoluteFill
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.55) 20%, rgba(0,0,0,0) 46%)",
        }}
      />
      <div style={{ position: "relative", padding: "0 90px 84px" }}>
        <div
          style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            fontSize: 46,
            lineHeight: 1.25,
            color: "white",
            textShadow: "0 2px 24px rgba(0,0,0,0.55)",
            maxWidth: 900,
            textAlign: align,
          }}
        >
          <span style={{ color: LIME }}>▍</span> {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};
