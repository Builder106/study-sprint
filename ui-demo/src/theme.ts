export const LIME = "#ccff00";
export const NEAR_BLACK = "#0a0a0a";
export const FPS = 30;

// Frame count is fps-native — do the arithmetic in seconds, not "eyeballed" frames.
export const sec = (s: number) => Math.round(s * FPS);
