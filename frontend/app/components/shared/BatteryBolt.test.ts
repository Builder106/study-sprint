import { assertEquals, assertStringIncludes } from 'jsr:@std/assert';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BatteryBolt, batteryAriaLabel, chargeToFillColor, clampCharge } from './BatteryBolt.tsx';

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

Deno.test('BatteryBolt component produces SVG element tree', () => {
  const markup = renderToStaticMarkup(
    createElement(BatteryBolt, { chargePct: 85, size: 100, className: 'custom-bolt' }),
  );
  assertStringIncludes(markup, 'width="100"');
  assertStringIncludes(markup, 'height="100"');
  assertStringIncludes(markup, 'class="custom-bolt"');
  assertStringIncludes(markup, 'aria-label="Battery at 85% charge"');

  const defaultMarkup = renderToStaticMarkup(createElement(BatteryBolt, { chargePct: 40 }));
  assertStringIncludes(defaultMarkup, 'width="120"');
  assertStringIncludes(defaultMarkup, 'height="120"');
});
