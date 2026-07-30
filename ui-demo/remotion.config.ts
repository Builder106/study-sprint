import { Config } from "@remotion/cli/config";

// No Tailwind wiring — every scene here uses inline styles (theme.ts's LIME/
// NEAR_BLACK constants), so skip @remotion/tailwind-v4 rather than carry an
// unused dependency and its v3-directive footgun (see video-production skill).
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setHardwareAcceleration("if-possible");
Config.setChromiumOpenGlRenderer("angle");
