import { assertEquals } from 'jsr:@std/assert';
import {
  type LandingEasterEggEffect,
  type LandingEasterEggSnapshot,
  LandingEasterEggTriggers,
  shouldShowLandingEasterEggPreview,
} from './landingEasterEggs.ts';

const EMPTY: LandingEasterEggSnapshot = { weekMinutes: [0, 0, 0, 0, 0, 0, 0], charge: 0 };
const FULL_WEEK: LandingEasterEggSnapshot = {
  weekMinutes: [1, 1, 1, 1, 1, 1, 1],
  charge: 0,
};
const FULL_CHARGE: LandingEasterEggSnapshot = {
  weekMinutes: [0, 0, 0, 0, 0, 0, 0],
  charge: 100,
};
const COMPLETE: LandingEasterEggSnapshot = {
  weekMinutes: [1, 1, 1, 1, 1, 1, 1],
  charge: 100,
};

function effect(type: LandingEasterEggEffect['type']): LandingEasterEggEffect[] {
  return [{ type }];
}

Deno.test('Easter egg preview requires the opt-in query and an allowed environment', () => {
  assertEquals(shouldShowLandingEasterEggPreview('?easter-eggs=1', true, undefined), true);
  assertEquals(shouldShowLandingEasterEggPreview('', true, 'true'), false);
  assertEquals(shouldShowLandingEasterEggPreview('?easter-eggs=1', false, undefined), false);
  assertEquals(shouldShowLandingEasterEggPreview('?easter-eggs=1', false, 'false'), false);
  assertEquals(shouldShowLandingEasterEggPreview('?easter-eggs=1', false, 'true'), true);
});

Deno.test('preloaded milestones do not trigger on initialization or a later save', () => {
  const triggers = new LandingEasterEggTriggers();
  triggers.initialize(COMPLETE);

  assertEquals(triggers.successfulSave(COMPLETE), []);
  assertEquals(triggers.successfulSave(EMPTY), []);
  assertEquals(triggers.successfulSave(COMPLETE), []);
});

Deno.test('refreshing the baseline consumes external milestone changes without resetting visit flags', () => {
  const triggers = new LandingEasterEggTriggers();
  triggers.initialize(EMPTY);
  for (let activation = 0; activation < 9; activation++) triggers.activate();
  triggers.selectDuration(30, 1_000, 'first-30');
  triggers.selectDuration(60, 2_000, 'first-60');

  triggers.initialize(COMPLETE);
  assertEquals(triggers.successfulSave(COMPLETE), []);
  assertEquals(triggers.activate(), effect('overcharge'));
  assertEquals(triggers.selectDuration(90, 3_000, 'first-90'), effect('duration-sequence'));
});

Deno.test('first successful save seeds state without treating it as a new milestone', () => {
  const triggers = new LandingEasterEggTriggers();

  assertEquals(triggers.successfulSave(COMPLETE), []);
  assertEquals(triggers.successfulSave(EMPTY), []);
  assertEquals(triggers.successfulSave(COMPLETE), []);
});

Deno.test('week circuit fires only when a successful save completes all seven days', () => {
  const triggers = new LandingEasterEggTriggers();
  triggers.initialize(EMPTY);

  assertEquals(
    triggers.successfulSave({ weekMinutes: [1, 1, 1, 1, 1, 1, 0], charge: 0 }),
    [],
  );
  assertEquals(triggers.successfulSave(FULL_WEEK), effect('week-circuit'));
  assertEquals(triggers.successfulSave(FULL_WEEK), []);
});

Deno.test('full charge fires only on a successful crossing to 100 percent', () => {
  const triggers = new LandingEasterEggTriggers();
  triggers.initialize(EMPTY);

  assertEquals(triggers.successfulSave({ ...EMPTY, charge: 99 }), []);
  assertEquals(triggers.successfulSave(FULL_CHARGE), effect('full-charge'));
  assertEquals(triggers.successfulSave(EMPTY), []);
  assertEquals(triggers.successfulSave(FULL_CHARGE), []);
});

Deno.test('one save crossing both milestones returns one combined effect', () => {
  const triggers = new LandingEasterEggTriggers();
  triggers.initialize(EMPTY);

  assertEquals(triggers.successfulSave(COMPLETE), effect('week-and-charge'));
});

Deno.test('failed saves do not update milestone state or emit effects', () => {
  const triggers = new LandingEasterEggTriggers();
  triggers.initialize(EMPTY);

  assertEquals(triggers.save(COMPLETE, false), []);
  assertEquals(triggers.successfulSave(COMPLETE), effect('week-and-charge'));
});

Deno.test('tenth accepted activation emits overcharge exactly once', () => {
  const triggers = new LandingEasterEggTriggers();

  for (let activation = 1; activation < 10; activation++) {
    assertEquals(triggers.activate(), []);
  }
  assertEquals(triggers.activate(), effect('overcharge'));
  assertEquals(triggers.activate(), []);
});

Deno.test('duration sequence fires for 30 then 60 then 90 within five seconds', () => {
  const triggers = new LandingEasterEggTriggers();

  assertEquals(triggers.selectDuration(30, 1_000, 'pointer-30'), []);
  assertEquals(triggers.selectDuration(60, 3_000, 'pointer-60'), []);
  assertEquals(
    triggers.selectDuration(90, 6_000, 'pointer-90'),
    effect('duration-sequence'),
  );
  assertEquals(triggers.selectDuration(30, 7_000, 'pointer-30-again'), []);
});

Deno.test('duplicate duration events with the same event key are ignored', () => {
  const triggers = new LandingEasterEggTriggers();

  assertEquals(triggers.selectDuration(30, 1_000, 'gesture-1'), []);
  assertEquals(triggers.selectDuration(60, 2_000, 'gesture-2'), []);
  assertEquals(triggers.selectDuration(60, 2_001, 'gesture-2'), []);
  assertEquals(triggers.selectDuration(90, 3_000, 'gesture-3'), effect('duration-sequence'));
});

Deno.test('out-of-order duration clears progress and a new 30 restarts the sequence', () => {
  const triggers = new LandingEasterEggTriggers();

  assertEquals(triggers.selectDuration(30, 1_000), []);
  assertEquals(triggers.selectDuration(90, 1_500), []);
  assertEquals(triggers.selectDuration(60, 2_000), []);
  assertEquals(triggers.selectDuration(30, 2_500), []);
  assertEquals(triggers.selectDuration(60, 3_000), []);
  assertEquals(triggers.selectDuration(90, 3_500), effect('duration-sequence'));
});

Deno.test('duration sequence expires after five seconds and restarts at 30', () => {
  const triggers = new LandingEasterEggTriggers();

  assertEquals(triggers.selectDuration(30, 1_000), []);
  assertEquals(triggers.selectDuration(60, 6_001), []);
  assertEquals(triggers.selectDuration(90, 6_100), []);
  assertEquals(triggers.selectDuration(30, 6_200), []);
  assertEquals(triggers.selectDuration(60, 6_300), []);
  assertEquals(triggers.selectDuration(90, 6_400), effect('duration-sequence'));
});
