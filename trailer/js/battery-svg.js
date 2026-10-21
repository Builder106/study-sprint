// Static port of frontend/app/components/shared/BatteryBolt.tsx. The trailer
// seeks frame by frame, so the pulse is passed in as an opacity instead of
// being animated by Motion.
export const BOLT_PATH = "M69 21L36 66H58.5L51 99L84 54H61.5L69 21Z";
const BOLT_BOTTOM = 99;
const BOLT_HEIGHT = 78;
const COLOR_STOPS = [
  { pct: 0, rgb: [239, 68, 68] },
  { pct: 50, rgb: [245, 158, 11] },
  { pct: 100, rgb: [204, 255, 0] },
];
export const PULSE_THRESHOLD = 80;

export function clampCharge(pct) {
  if (!Number.isFinite(pct)) return 0;
  return Math.min(100, Math.max(0, pct));
}

export function chargeToFillColor(pct) {
  const value = clampCharge(pct);
  // value is clamped to 100 and the last stop is 100, so a match always exists.
  const upperIndex = COLOR_STOPS.findIndex((stop) => stop.pct >= value);
  const upper = COLOR_STOPS[upperIndex];
  const lower = COLOR_STOPS[Math.max(0, upperIndex - 1)];
  const t = lower.pct === upper.pct ? 0 : (value - lower.pct) / (upper.pct - lower.pct);
  const rgb = lower.rgb.map((channel, index) => Math.round(channel + (upper.rgb[index] - channel) * t));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

// Mirrors the app's 2s easeInOut pulse between 0.72 and 1 opacity.
export function pulseOpacity(pct, time) {
  if (clampCharge(pct) < PULSE_THRESHOLD) return 1;
  return 0.86 - 0.14 * Math.cos((2 * Math.PI * time) / 2);
}

export function buildBatterySvg(pct, { size = 120, time = 0, id = "bolt" } = {}) {
  const value = clampCharge(pct);
  const fillHeight = (value / 100) * BOLT_HEIGHT;
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" style="color:white"><defs><clipPath id="${id}-clip"><path d="${BOLT_PATH}"></path></clipPath></defs><path d="${BOLT_PATH}" fill="currentColor" opacity="0.13"></path><g clip-path="url(#${id}-clip)" opacity="${pulseOpacity(value, time).toFixed(3)}"><rect x="36" width="48" y="${BOLT_BOTTOM - fillHeight}" height="${fillHeight}" fill="${chargeToFillColor(value)}"></rect></g></svg>`;
}
