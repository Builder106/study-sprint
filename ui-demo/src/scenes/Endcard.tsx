import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { LIME, NEAR_BLACK } from "../theme";

// Background stays fully opaque for the whole scene — fading the root
// AbsoluteFill composites to encoder black instead of a clean cut.
export const Endcard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200, mass: 0.7 } });
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  // A held wordmark reads as a stalled player to freezedetect (and viewers)
  // without some continuous motion — a slow breathing scale is enough.
  const breathe = 1 + Math.sin((frame / fps) * (Math.PI * 2 / 4)) * 0.012;
  const scale = interpolate(enter, [0, 1], [0.94, 1]) * breathe;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: NEAR_BLACK,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ opacity, transform: `scale(${scale})`, textAlign: "center" }}>
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 800,
            fontSize: 88,
            color: "white",
            letterSpacing: -1,
          }}
        >
          Study<span style={{ color: LIME }}>Sprint</span>
        </div>
        <div
          style={{
            marginTop: 22,
            fontFamily: "Inter, sans-serif",
            fontWeight: 500,
            fontSize: 30,
            color: "rgba(255,255,255,0.75)",
            letterSpacing: 1,
          }}
        >
          getstudysprint.vercel.app
        </div>
      </div>
    </AbsoluteFill>
  );
};
