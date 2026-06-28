import { assert, assertEquals } from "jsr:@std/assert";
import {
  formatClock,
  formatDate,
  formatDuration,
  minutesToHours,
  progressPercent,
} from "./format.ts";

Deno.test("minutesToHours - whole hours", () => {
  assertEquals(minutesToHours(60), 1);
  assertEquals(minutesToHours(120), 2);
  assertEquals(minutesToHours(0), 0);
});

Deno.test("minutesToHours - rounds to one decimal", () => {
  assertEquals(minutesToHours(90), 1.5);
  assertEquals(minutesToHours(75), 1.3); // 75/60*10=12.5 → round→13 → 1.3
  assertEquals(minutesToHours(10), 0.2); // 10/60*10=1.666 → round→2 → 0.2
});

Deno.test("formatDuration - minutes only", () => {
  assertEquals(formatDuration(0), "0m");
  assertEquals(formatDuration(45), "45m");
  assertEquals(formatDuration(59), "59m");
});

Deno.test("formatDuration - hours only", () => {
  assertEquals(formatDuration(60), "1h");
  assertEquals(formatDuration(120), "2h");
});

Deno.test("formatDuration - hours and minutes", () => {
  assertEquals(formatDuration(90), "1h 30m");
  assertEquals(formatDuration(121), "2h 1m");
});

Deno.test("formatClock - zero", () => {
  assertEquals(formatClock(0), "00:00:00");
});

Deno.test("formatClock - seconds only", () => {
  assertEquals(formatClock(59), "00:00:59");
  assertEquals(formatClock(9), "00:00:09");
});

Deno.test("formatClock - minutes and seconds", () => {
  assertEquals(formatClock(90), "00:01:30");
  assertEquals(formatClock(3600), "01:00:00");
});

Deno.test("formatClock - hours minutes seconds", () => {
  assertEquals(formatClock(3661), "01:01:01");
  assertEquals(formatClock(7384), "02:03:04"); // 2*3600 + 3*60 + 4
});

Deno.test("formatDate - returns non-empty string containing the year", () => {
  const result = formatDate("2024-03-15T00:00:00.000Z");
  assert(result.length > 0);
  assert(result.includes("2024"));
});

Deno.test("formatDate - different dates produce different strings", () => {
  const a = formatDate("2024-01-01T00:00:00.000Z");
  const b = formatDate("2024-12-31T00:00:00.000Z");
  assert(a !== b);
});

Deno.test("progressPercent - full and over", () => {
  assertEquals(progressPercent(60, 1), 100); // 60 min = 1 h → 100%
  assertEquals(progressPercent(120, 1), 100); // capped at 100
});

Deno.test("progressPercent - partial", () => {
  assertEquals(progressPercent(30, 1), 50); // 30 of 60 min
  assertEquals(progressPercent(15, 1), 25); // 15 of 60 min
});

Deno.test("progressPercent - zero minutes", () => {
  assertEquals(progressPercent(0, 1), 0);
});

Deno.test("progressPercent - invalid target returns 0", () => {
  assertEquals(progressPercent(60, 0), 0);
  assertEquals(progressPercent(60, -5), 0);
  assertEquals(progressPercent(60, ""), 0);
  assertEquals(progressPercent(60, "abc"), 0);
  assertEquals(progressPercent(60, NaN), 0);
});

Deno.test("progressPercent - string number target works", () => {
  assertEquals(progressPercent(30, "1"), 50);
  assertEquals(progressPercent(60, "2"), 50); // 60 of 120 min
});
