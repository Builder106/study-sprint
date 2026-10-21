import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBatterySvg, chargeToFillColor, clampCharge, pulseOpacity } from "./battery-svg.js";

test("fill color matches the app's red, amber, lime stops", () => {
  assert.equal(chargeToFillColor(0), "rgb(239, 68, 68)");
  assert.equal(chargeToFillColor(50), "rgb(245, 158, 11)");
  assert.equal(chargeToFillColor(100), "rgb(204, 255, 0)");
});

test("charge is clamped to 0-100", () => {
  assert.equal(clampCharge(-5), 0);
  assert.equal(clampCharge(140), 100);
  assert.equal(clampCharge(Number.NaN), 0);
});

test("only a charge at or above 80% pulses", () => {
  assert.equal(pulseOpacity(79, 0.5), 1);
  assert.equal(pulseOpacity(80, 0), 0.72);
  assert.equal(pulseOpacity(80, 1), 1);
});

test("the fill rect grows from the bolt's base", () => {
  assert.match(buildBatterySvg(0), /y="99" height="0"/);
  assert.match(buildBatterySvg(100, { size: 180 }), /width="180" height="180"/);
  assert.match(buildBatterySvg(100), /y="21" height="78"/);
});
