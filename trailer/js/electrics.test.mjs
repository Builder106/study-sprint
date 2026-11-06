import { test } from "node:test";
import assert from "node:assert/strict";
import { SCENE } from "./scene-data.js";
import { CAMERA } from "./camera-data.js";
import { frameAt, project } from "./project.js";
import { hash, lightning, mulberry32 } from "./arcs.js";
import { powerOn, traceState } from "./fx.js";

test("the camera export covers every frame of the 50 s cut", () => {
  assert.equal(CAMERA.frames.length, SCENE.duration * SCENE.fps);
  assert.ok(CAMERA.frames.every((matrix) => matrix.length === 16));
  assert.equal(frameAt(-1), 0);
  assert.equal(frameAt(99), CAMERA.frames.length - 1);
});

test("the bolt tip projects inside the frame in every shot that shows it", () => {
  for (const time of [6, 20, 30, 40, 47]) {
    const point = project(CAMERA.frames[frameAt(time)], SCENE.bolt.tip);
    assert.ok(point.visible, `tip behind the camera at ${time}s`);
    assert.ok(point.x > 0 && point.x < 1920 && point.y > 0 && point.y < 1080, `tip off frame at ${time}s`);
  }
});

test("seeded arcs repeat exactly and change with the seed", () => {
  const a = { x: 100, y: 100 };
  const b = { x: 600, y: 300 };
  assert.deepEqual(lightning(a, b, 42), lightning(a, b, 42));
  assert.notDeepEqual(lightning(a, b, 42), lightning(a, b, 43));
  assert.deepEqual(lightning(a, b, 7)[0][0], a);
  assert.deepEqual(lightning(a, b, 7)[0].at(-1), b);
  assert.equal(mulberry32(hash(1, 2))(), mulberry32(hash(1, 2))());
});

test("the session circuit is dead while the switch is open and live after the arc", () => {
  const out = SCENE.traces.find((trace) => trace.id === "session-out");
  assert.equal(traceState(out, 0.5).front, 0);
  assert.equal(traceState(out, 10).glow, 0);
  assert.ok(traceState(out, 5).glow > 0.9);
  assert.ok(traceState(out, 16).front > 0.99);
  assert.equal(traceState(out, SCENE.times.end + 0.1).glow, 0);
});

test("each weekday terminal energizes on its own beat", () => {
  SCENE.times.days.forEach((day, index) => {
    const trace = SCENE.traces.find((candidate) => candidate.id === `week-${index}`);
    assert.equal(traceState(trace, day - 0.01).glow, 0);
    assert.ok(traceState(trace, day + 1).front > 0.99);
  });
});

test("charge follows the app model: 12% after one session, empty in the gap, full by the crash", () => {
  const charge = new Map(SCENE.charge);
  assert.equal(charge.get(SCENE.times.timerEnd), 12);
  assert.equal(charge.get(SCENE.times.dead), 0);
  assert.equal(SCENE.charge.at(-1)[1], 100);
});

test("the day grid lights exactly the seeded account's 52 days above empty", () => {
  assert.equal(SCENE.gridPads.filter((pad) => pad.t != null).length, SCENE.stats.days);
  assert.deepEqual(SCENE.stats, { hours: 173, sessions: 93, days: 52 });
});

test("readouts stutter on, then hold", () => {
  assert.equal(powerOn(-0.1, 1), 0);
  assert.equal(powerOn(0.5, 1), 1);
});
