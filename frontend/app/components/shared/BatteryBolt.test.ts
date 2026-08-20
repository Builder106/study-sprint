import { assertEquals } from 'jsr:@std/assert';
import { batteryAriaLabel, chargeToFillColor, clampCharge } from './BatteryBolt.tsx';

Deno.test('BatteryBolt helpers clamp charge values', () => {
  assertEquals(clampCharge(-5), 0);
  assertEquals(clampCharge(42), 42);
  assertEquals(clampCharge(105), 100);
  assertEquals(clampCharge(Number.NaN), 0);
});

Deno.test('BatteryBolt helpers interpolate the charge color', () => {
  assertEquals(chargeToFillColor(0), 'rgb(239, 68, 68)');
  assertEquals(chargeToFillColor(25), 'rgb(242, 113, 40)');
  assertEquals(chargeToFillColor(50), 'rgb(245, 158, 11)');
  assertEquals(chargeToFillColor(100), 'rgb(204, 255, 0)');
});

Deno.test('BatteryBolt helpers describe the clamped rounded charge', () => {
  assertEquals(batteryAriaLabel(72.4), 'Battery at 72% charge');
  assertEquals(batteryAriaLabel(72.6), 'Battery at 73% charge');
  assertEquals(batteryAriaLabel(120), 'Battery at 100% charge');
});
