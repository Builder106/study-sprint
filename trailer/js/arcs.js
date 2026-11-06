// Seeded randomness and lightning shapes. Every value is a pure function of
// its seed, so any frame renders the same arc no matter the seek order.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(...values) {
  let h = 2166136261;
  for (const value of values) {
    h ^= Math.floor(value) | 0;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Midpoint displacement between two screen points. `bulge` pushes the arc to
// one side (used for arcs that crawl along the casing). Returns the main
// strand and its branches as point lists.
export function lightning(p0, p1, seed, { depth = 6, jitter = 0.26, bulge = 0, branches = 2 } = {}) {
  const random = mulberry32(seed);
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  let points = [p0, p1];
  let amplitude = length * jitter;
  for (let level = 0; level < depth; level += 1) {
    const next = [points[0]];
    for (let index = 1; index < points.length; index += 1) {
      const a = points[index - 1];
      const b = points[index];
      const offset = (random() * 2 - 1) * amplitude;
      next.push({ x: (a.x + b.x) / 2 + nx * offset, y: (a.y + b.y) / 2 + ny * offset }, b);
    }
    points = next;
    amplitude *= 0.52;
  }
  if (bulge) {
    points = points.map((point, index) => {
      const u = index / (points.length - 1);
      const lift = Math.sin(Math.PI * u) * bulge * length;
      return { x: point.x + nx * lift, y: point.y + ny * lift };
    });
  }
  const strands = [points];
  for (let k = 0; k < branches; k += 1) {
    const start = Math.floor(points.length * (0.2 + random() * 0.5));
    const origin = points[start];
    const angle = Math.atan2(dy, dx) + (random() < 0.5 ? -1 : 1) * (0.5 + random() * 0.7);
    const reach = length * (0.18 + random() * 0.25);
    const end = { x: origin.x + Math.cos(angle) * reach, y: origin.y + Math.sin(angle) * reach };
    strands.push(lightning(origin, end, hash(seed, k, 99), { depth: depth - 2, jitter: 0.3, branches: 0 })[0]);
  }
  return strands;
}
