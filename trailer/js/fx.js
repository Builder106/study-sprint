// The electrical layer: current on the traces, arcs, sparks and readouts,
// drawn over the Blender render with the same camera.
import { SCENE } from "./scene-data.js";
import { frameAt, matrixAt, project } from "./project.js";
import { hash, lightning, mulberry32 } from "./arcs.js";

const T = SCENE.times;
const LIME = [204, 255, 0];
const HOT = [236, 255, 170];
const TRACE_Z = 0.03;
const SAMPLE_STEP = 0.08;

const clamp01 = (u) => Math.max(0, Math.min(1, u));
const smooth = (u) => {
  const v = clamp01(u);
  return v * v * (3 - 2 * v);
};
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;

// --- Trace geometry -------------------------------------------------------------
function sampleTrace(points) {
  const samples = [];
  let distance = 0;
  for (let index = 1; index < points.length; index += 1) {
    const [x0, y0] = points[index - 1];
    const [x1, y1] = points[index];
    const length = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(length / SAMPLE_STEP));
    for (let step = index === 1 ? 0 : 1; step <= steps; step += 1) {
      const u = step / steps;
      samples.push({ p: [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, TRACE_Z], d: distance + length * u });
    }
    distance += length;
  }
  return { samples, length: distance };
}

const TRACES = SCENE.traces.map((trace) => ({ ...trace, ...sampleTrace(trace.points) }));
const PADS_BY_COLUMN = new Map();
for (const pad of SCENE.gridPads) {
  if (pad.t == null) continue;
  const first = PADS_BY_COLUMN.get(pad.col);
  if (first == null || pad.t < first) PADS_BY_COLUMN.set(pad.col, pad.t);
}

function flowAt(time) {
  return SCENE.flow[frameAt(time)];
}

function sessionFlowAt(time) {
  return SCENE.sessionFlow[frameAt(time)];
}

// Kick-drum pulse on every beat of the surge, decaying over 120 ms.
function beatPulse(time) {
  if (time < T.surge || time >= T.crash) return 0;
  return Math.exp(-((time - T.surge) % 0.5) / 0.12);
}

function crashBoost(time) {
  return time >= T.crash ? 1.6 * Math.exp(-(time - T.crash) / 0.35) : 0;
}

export function traceState(trace, time) {
  if (time >= T.end) return { front: 0, glow: 0, speed: 0 };
  let front = 0;
  let glow = 0;
  if (trace.group === "session") {
    glow = sessionFlowAt(time);
    if (trace.id === "session-in") front = smooth((time - (T.sessionOn - 0.15)) / 0.15);
    else if (time < T.reconnect) front = smooth((time - T.sessionOn) / (T.currentAtTip - T.sessionOn));
    else front = smooth((time - T.reconnect) / 0.45);
    if (time >= T.reconnect && trace.id === "session-in") front = 1;
  } else if (trace.group === "week") {
    const start = T.days[trace.day];
    front = smooth((time - start) / 0.7);
    glow = time >= start ? 0.85 : 0;
  } else if (trace.group === "grid") {
    const start = PADS_BY_COLUMN.get(trace.col);
    front = start == null ? 0 : smooth((time - start) / 0.5);
    glow = start != null && time >= start ? 0.9 : 0;
  } else {
    front = smooth((time - T.gridStart) / 0.8);
    glow = time >= T.gridStart ? 1 : 0;
  }
  const surge = time >= T.surge && time < T.end ? 1 : 0;
  glow *= 1 + 0.55 * beatPulse(time) + crashBoost(time);
  return { front, glow, speed: surge ? 9 : 5.5 };
}

// --- Drawing primitives ----------------------------------------------------------
function strokeLayers(ctx, paths, widthPx, alpha, color = LIME) {
  // Soft glow comes from the bloom pass in composition.js; these are the crisp cores.
  const passes = [
    [widthPx * 1.8, alpha * 0.16, color],
    [widthPx * 0.8, alpha * 0.75, color],
    [Math.max(1, widthPx * 0.3), alpha * 0.95, HOT],
  ];
  for (const [width, a, c] of passes) {
    ctx.lineWidth = width;
    ctx.strokeStyle = rgba(c, a);
    ctx.beginPath();
    for (const path of paths) {
      if (path.length < 2) continue;
      ctx.moveTo(path[0].x, path[0].y);
      for (let index = 1; index < path.length; index += 1) ctx.lineTo(path[index].x, path[index].y);
    }
    ctx.stroke();
  }
}

// The bloom pass spreads these, so the drawn core stays small.
function glowDot(ctx, point, size, strength, color = LIME) {
  const radius = size * 0.32;
  const alpha = strength * 0.55;
  if (radius < 0.5 || alpha <= 0.002) return;
  const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius);
  gradient.addColorStop(0, rgba(HOT, alpha));
  gradient.addColorStop(0.25, rgba(color, alpha * 0.55));
  gradient.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
}

// --- Bolt silhouette ---------------------------------------------------------------
function boltPolygons(m) {
  const { casing, z } = SCENE.bolt;
  const front = casing.map(([x, h]) => project(m, [x, -0.23, z + h]));
  const back = casing.map(([x, h]) => project(m, [x, 0.32, z + h]));
  const quads = front.map((point, index) => {
    const next = (index + 1) % front.length;
    return [point, front[next], back[next], back[index]];
  });
  return [front, back, ...quads];
}

function eraseBolt(ctx, m) {
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "#000";
  for (const polygon of boltPolygons(m)) {
    ctx.beginPath();
    polygon.forEach((point, index) => (index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)));
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalCompositeOperation = "lighter";
}

// Points on the casing rim, used by arcs that crawl over the bolt.
function casingPoint(s) {
  const { casing, z } = SCENE.bolt;
  const n = casing.length;
  const u = (((s % 1) + 1) % 1) * n;
  const index = Math.floor(u);
  const [x0, h0] = casing[index];
  const [x1, h1] = casing[(index + 1) % n];
  const f = u - index;
  return [x0 + (x1 - x0) * f, -0.1, z + h0 + (h1 - h0) * f];
}

// --- Layers ----------------------------------------------------------------------
function drawTraces(ctx, m, time, layer, boltW) {
  for (const trace of TRACES) {
    const state = traceState(trace, time);
    if (state.glow <= 0.002 || state.front <= 0) continue;
    const projected = trace.samples.map((sample) => ({ ...project(m, sample.p), d: sample.d }));
    const inLayer = (point) => point.visible && (layer === "behind" ? point.w > boltW : point.w <= boltW);
    const limit = state.front * trace.length;
    const runs = (from, to) => {
      const paths = [];
      let current = [];
      for (const point of projected) {
        if (point.d < from || point.d > to || !inLayer(point)) {
          if (current.length > 1) paths.push(current);
          current = [];
          continue;
        }
        current.push(point);
      }
      if (current.length > 1) paths.push(current);
      return paths;
    };
    const mid = projected[Math.floor(projected.length / 2)];
    const width = Math.min(9, Math.max(1.2, 0.06 * mid.scale));
    strokeLayers(ctx, runs(0, limit), width, 0.6 * state.glow);
    // Moving charges along the energized part.
    const spacing = 1.6;
    const dash = 0.32;
    const offset = (time * state.speed) % spacing;
    const charges = [];
    for (let start = offset - spacing; start < limit; start += spacing) {
      charges.push(...runs(Math.max(0, start), Math.min(limit, start + dash)));
    }
    strokeLayers(ctx, charges, width * 1.1, 1.0 * state.glow);
    if (state.front < 1) {
      const head = projected.find((point) => point.d >= limit) ?? projected.at(-1);
      if (inLayer(head)) glowDot(ctx, head, 0.9 * head.scale, 0.9 * state.glow);
    }
  }
}

function drawPads(ctx, m, time, layer, boltW) {
  if (time >= T.end) return;
  const pass = (point) => point.visible && (layer === "behind" ? point.w > boltW : point.w <= boltW);
  SCENE.weekX.forEach((x, day) => {
    const start = T.days[day];
    if (time < start) return;
    const point = project(m, [x, SCENE.weekRowY, 0.04]);
    if (!pass(point)) return;
    const age = time - start;
    glowDot(ctx, point, 1.2 * point.scale, 0.55 * (1 + 0.5 * beatPulse(time) + crashBoost(time)));
    if (age < 0.5) {
      ctx.lineWidth = Math.max(1, 0.08 * point.scale);
      ctx.strokeStyle = rgba(HOT, 1 - age / 0.5);
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, (0.6 + 2.6 * age) * point.scale, (0.6 + 2.6 * age) * point.scale * 0.45, 0, 0,
        Math.PI * 2);
      ctx.stroke();
    }
  });
  for (const pad of SCENE.gridPads) {
    if (pad.t == null || time < pad.t) continue;
    const point = project(m, [pad.x, pad.y, 0.04]);
    if (!pass(point)) continue;
    const age = time - pad.t;
    const flash = age < 0.25 ? 1 - age / 0.25 : 0;
    glowDot(ctx, point, (0.7 + 0.6 * flash) * point.scale, 0.5 + 0.5 * flash + 0.3 * beatPulse(time));
  }
  const flow = flowAt(time);
  if (flow > 0 && layer === "front") {
    const socket = project(m, [SCENE.socket[0], SCENE.socket[1], 0.05]);
    glowDot(ctx, socket, (0.9 + 0.25 * Math.min(flow, 2.5)) * socket.scale, Math.min(1, 0.35 + 0.3 * flow));
  }
}

function arcEndpoints(arc, time) {
  const tip = SCENE.bolt.tip;
  const socket = [SCENE.socket[0], SCENE.socket[1], 0.05];
  const [ax] = SCENE.switchA;
  const [bx] = SCENE.switchB;
  const random = mulberry32(hash(arc.seed ?? 0, Math.floor(arc.start * 100)));
  switch (arc.kind) {
    case "tip":
      return [[socket, tip]];
    case "gap-try":
      return [[[ax + 0.2, 0, 0.15], [ax + 0.2 + (bx - ax - 0.4) * arc.reach, 0, 0.13 + 0.05 * random()]]];
    case "gap":
      return [[[ax + 0.18, 0, 0.15], [bx - 0.18, 0, 0.15]], [[ax + 0.1, 0, 0.17], [bx - 0.1, 0, 0.12]]];
    case "terminal": {
      const x = SCENE.weekX[arc.day];
      const y = SCENE.weekRowY;
      return [0, 1, 2].map(() => [[x, y, 0.05], [x + (random() - 0.5) * 1.4, y + (random() - 0.5) * 1.0, 0.7 + random() * 0.7]]);
    }
    case "casing": {
      const s = random();
      return [[casingPoint(s), casingPoint(s + 0.05 + random() * 0.1)]];
    }
    case "storm": {
      const angle = random() * Math.PI * 2;
      const radius = 3 + random() * 5;
      return [[casingPoint(random()), [Math.cos(angle) * radius, Math.sin(angle) * radius * 0.7, 0.05]]];
    }
    default:
      return [];
  }
}

function drawArcs(ctx, m, time) {
  const frame = frameAt(time);
  for (const arc of SCENE.arcs) {
    if (time < arc.start || time > arc.end) continue;
    if (time >= T.end && !(arc.kind === "casing")) continue;
    const life = (time - arc.start) / (arc.end - arc.start);
    const envelope = Math.min(1, life / 0.08) * (life > 0.7 ? (1 - life) / 0.3 : 1);
    const flicker = 0.55 + 0.45 * mulberry32(hash(frame, arc.start * 1000))();
    const steady = arc.kind === "tip";
    const alpha = (steady ? 0.8 : envelope) * flicker * Math.min(1.2, arc.gain);
    arcEndpoints(arc, time).forEach(([a, b], strand) => {
      const p0 = project(m, a);
      const p1 = project(m, b);
      if (!p0.visible || !p1.visible) return;
      const reseed = hash(arc.start * 1000, strand, Math.floor(frame / 2));
      const strands = lightning(p0, p1, reseed, {
        depth: 6,
        jitter: arc.kind === "casing" ? 0.12 : 0.24,
        bulge: arc.kind === "casing" ? 0.18 : 0,
        branches: arc.kind === "tip" ? 1 : 2,
      });
      const width = Math.min(4.5, Math.max(1.1, 0.03 * Math.min(p0.scale, p1.scale))) * Math.min(1.3, arc.gain);
      strokeLayers(ctx, strands, width, alpha);
      glowDot(ctx, p1, 0.5 * p1.scale * arc.gain, alpha * 0.6);
    });
  }
}

const BURST_ORIGINS = {
  switch: () => [(SCENE.switchA[0] + SCENE.switchB[0]) / 2, 0, 0.16],
  gap: () => [(SCENE.switchA[0] + SCENE.switchB[0]) / 2, 0, 0.16],
  tip: () => SCENE.bolt.tip,
};

function burstOrigin(at) {
  if (BURST_ORIGINS[at]) return BURST_ORIGINS[at]();
  const day = Number(at.split("-")[1]);
  return [SCENE.weekX[day], SCENE.weekRowY, 0.06];
}

function particlePosition(origin, velocity, age) {
  return [origin[0] + velocity[0] * age, origin[1] + velocity[1] * age,
    origin[2] + velocity[2] * age - 4.9 * age * age];
}

function drawBursts(ctx, m, time) {
  for (const burst of SCENE.bursts) {
    const age0 = time - burst.t;
    if (age0 < 0 || age0 > 1.1) continue;
    if (time >= T.end) continue;
    const origin = burstOrigin(burst.at);
    const random = mulberry32(hash(burst.t * 1000, burst.n));
    ctx.lineCap = "round";
    for (let index = 0; index < burst.n; index += 1) {
      const angle = random() * Math.PI * 2;
      const speed = (1.5 + random() * 4.5) * burst.gain;
      const lift = 1.5 + random() * 4;
      const lifetime = 0.35 + random() * 0.6;
      if (age0 > lifetime) continue;
      const velocity = [Math.cos(angle) * speed, Math.sin(angle) * speed, lift];
      const a = particlePosition(origin, velocity, Math.max(0, age0 - 0.035));
      const b = particlePosition(origin, velocity, age0);
      if (b[2] < 0) continue;
      const p0 = project(m, a);
      const p1 = project(m, b);
      if (!p0.visible || !p1.visible) continue;
      const fade = 1 - age0 / lifetime;
      ctx.lineWidth = Math.min(2.6, Math.max(1, 0.01 * p1.scale));
      ctx.strokeStyle = rgba(fade > 0.5 ? HOT : LIME, fade);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }
}

// Readouts power up like LED segments: a few stuttering frames, then steady.
export function powerOn(age, seed) {
  if (age < 0) return 0;
  if (age > 0.32) return 1;
  return mulberry32(hash(seed, Math.floor(age * 30)))() > 0.45 ? 0.9 : 0.12;
}

function drawReadouts(ctx, m, time) {
  if (time < T.surge || time >= T.end) return;
  const order = ["hours", "sessions", "days"];
  for (const readout of SCENE.readouts) {
    const start = T.surge + 0.4 + 0.25 * order.indexOf(readout.id);
    const on = powerOn(time - start, readout.x * 100 + readout.y);
    if (on <= 0) continue;
    const progress = 1 - (1 - clamp01((time - start) / 4)) ** 3;
    const value = Math.round(SCENE.stats[readout.id] * progress);
    const origin = project(m, [readout.x, readout.y, 0.02]);
    const ex = project(m, [readout.x + 1, readout.y, 0.02]);
    const ey = project(m, [readout.x, readout.y + 1, 0.02]);
    if (!origin.visible || !ex.visible || !ey.visible) continue;
    const k = 0.01;
    ctx.save();
    ctx.setTransform((ex.x - origin.x) * k, (ex.y - origin.y) * k, -(ey.x - origin.x) * k, -(ey.y - origin.y) * k,
      origin.x, origin.y);
    const glow = on * (1 + 0.35 * beatPulse(time) + crashBoost(time) * 0.5);
    ctx.font = `800 ${readout.size * 100}px "JetBrains Mono"`;
    ctx.textBaseline = "alphabetic";
    const text = String(value);
    ctx.shadowColor = rgba(LIME, 0.9 * glow);
    ctx.shadowBlur = 40;
    ctx.fillStyle = rgba(LIME, 0.95 * glow);
    ctx.fillText(text, 0, 0);
    ctx.shadowBlur = 0;
    ctx.fillStyle = rgba(HOT, 0.55 * glow);
    ctx.fillText(text, 0, 0);
    ctx.font = `600 ${0.5 * 100}px "JetBrains Mono"`;
    ctx.fillStyle = rgba([210, 220, 200], 0.75 * on);
    ctx.fillText(readout.label, 6, 0.85 * 100);
    ctx.restore();
  }
}

// Sparks thrown off the end-card wordmark when "Charge up." finishes powering.
export function drawScreenSparks(ctx, origin, age, seed) {
  if (age < 0 || age > 0.9) return;
  const random = mulberry32(seed);
  ctx.lineCap = "round";
  for (let index = 0; index < 34; index += 1) {
    const angle = -Math.PI / 2 + (random() - 0.5) * Math.PI * 1.6;
    const speed = 380 + random() * 900;
    const lifetime = 0.3 + random() * 0.55;
    if (age > lifetime) continue;
    const at = (a) => ({ x: origin.x + Math.cos(angle) * speed * a, y: origin.y + Math.sin(angle) * speed * a + 900 * a * a });
    const p0 = at(Math.max(0, age - 0.025));
    const p1 = at(age);
    const fade = 1 - age / lifetime;
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = rgba(fade > 0.5 ? HOT : LIME, fade);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
}

export function drawArcBetween(ctx, p0, p1, seed, alpha, width = 2.4) {
  strokeLayers(ctx, lightning(p0, p1, seed, { depth: 6, jitter: 0.2, branches: 2 }), width, alpha);
}

export function tipOnScreen(time) {
  return project(matrixAt(time), SCENE.bolt.tip);
}

export function drawElectrics(ctx, time) {
  const m = matrixAt(time);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const boltW = project(m, [0, 0, SCENE.bolt.z]).w;
  if (time < T.end) {
    drawTraces(ctx, m, time, "behind", boltW);
    drawPads(ctx, m, time, "behind", boltW);
    eraseBolt(ctx, m);
    drawTraces(ctx, m, time, "front", boltW);
    drawPads(ctx, m, time, "front", boltW);
    drawReadouts(ctx, m, time);
    drawBursts(ctx, m, time);
  }
  drawArcs(ctx, m, time);
}
