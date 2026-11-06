import { CAMERA } from "./camera-data.js";

export const WIDTH = CAMERA.width;
export const HEIGHT = CAMERA.height;
export const FPS = CAMERA.fps;
export const FRAME_COUNT = CAMERA.frames.length;

export function frameAt(time) {
  return Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(time * FPS)));
}

export function matrixAt(time) {
  return CAMERA.frames[frameAt(time)];
}

// Row-major view-projection from Blender. Returns pixel coordinates, the clip
// w (distance along the view axis) and pixels per world unit at that depth.
export function project(m, point) {
  const [x, y, z] = point;
  const cx = m[0] * x + m[1] * y + m[2] * z + m[3];
  const cy = m[4] * x + m[5] * y + m[6] * z + m[7];
  const cw = m[12] * x + m[13] * y + m[14] * z + m[15];
  const focal = Math.hypot(m[4], m[5], m[6]);
  return {
    x: ((cx / cw + 1) / 2) * WIDTH,
    y: ((1 - cy / cw) / 2) * HEIGHT,
    w: cw,
    scale: (focal * HEIGHT) / 2 / cw,
    visible: cw > 0.05,
  };
}
