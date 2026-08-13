# Battery Visual Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plant/streak visual system (`VirtualPlant`, `PlantStage`, `FlowerPot`) with a battery/lightning-bolt visual system (`BatteryBolt`, `FeatureIcon`) driven by the continuous `current_charge_pct` field, across `Garden.tsx` and a full pivot of `Landing.tsx`.

**Architecture:** One new pure-rendering component (`BatteryBolt`) replaces `VirtualPlant` everywhere; its fill height and color are driven entirely by a `chargePct: number` prop via small pure helper functions (unit-tested directly, no DOM). A second new component (`FeatureIcon`) replaces `FlowerPot` as the feature-grid marker. `Garden.tsx` gets a one-for-one swap; `Landing.tsx` gets a full content pivot (hero copy, stage-walkthrough section, feature grid, closing CTA) since it cannot compile once `PlantStage` is deleted and a half-pivoted page (new icon, old tree copy) is worse than a finished one.

**Tech Stack:** React 19, `motion/react` (already a dependency, already used by `VirtualPlant`), Deno test runner for unit tests, Tailwind utility classes + `frontend/styles/landing.css` for layout.

**Spec:** `docs/specs/2026-08-13-battery-visual-design.md`

## Global Constraints

- Brand lime is `#ccff00` (used throughout the existing codebase, e.g. `Logo.tsx`, `Garden.tsx`'s accent stat box).
- The lightning-bolt shape comes from `frontend/app/components/shared/Logo.tsx`'s path `M23 7L12 22H19.5L17 33L28 18H20.5L23 7Z` (drawn in a 40×40 viewBox) — do not invent a new bolt shape.
- Fill-level transitions use a spring: `{ type: "spring", stiffness: 160, damping: 13, mass: 0.9 }` — the same parameters `VirtualPlant.tsx` already uses for its stage transitions.
- Glow/pulse animation only activates at `chargePct >= 80`; below that, the component is visually static aside from the fill transition.
- All motion respects `useReducedMotion()` from `motion/react` (already imported this way by `VirtualPlant.tsx`) — when true, transitions are instant (`duration: 0`) and the glow loop does not run.
- `aria-label` on `BatteryBolt` must read `` `Battery at ${Math.round(chargePct)}% charge` ``.
- No changes to `/garden`'s route, layout, or the stat-box grid beyond swapping the visual component — page/route restructuring is a separate, later sub-project.
- No changes to `DESIGN.md`, e2e test files, or `trailer/` — a separate, later sub-project.
- `current_charge_pct` is always a finite number in `[0, 100]` at the API boundary (guaranteed by sub-project 1's SQL/TS formulas, already merged to `main`) — components should still clamp defensively since it's cheap and the type system alone doesn't guarantee runtime range.

---

### Task 1: `BatteryBolt` component and its pure helpers

**Files:**
- Create: `frontend/app/components/shared/BatteryBolt.tsx`
- Create: `frontend/app/components/shared/BatteryBolt.test.ts`

**Interfaces:**
- Produces: `BatteryBolt({ chargePct: number, size?: number, className?: string }): JSX.Element` — default export is a named export `BatteryBolt`, matching `VirtualPlant`'s named-export style.
- Produces (exported for the test file, and for reuse if a later sub-project needs the same color logic): `clampCharge(pct: number): number`, `chargeToFillColor(pct: number): string`, `batteryAriaLabel(pct: number): string`.

The Deno test runner (`deno task test:unit`) has no DOM/JSX rendering environment configured — the existing suite (`gamification.test.ts`, `password.test.ts`, `avatar.test.ts`) tests pure functions only, never components. Follow that pattern: the three helpers above are pure and fully testable; the component itself is verified visually in Task 6, not unit-tested.

- [ ] **Step 1: Write the failing tests for the pure helpers**

Create `frontend/app/components/shared/BatteryBolt.test.ts`:

```ts
import { assertEquals } from "jsr:@std/assert";
import { batteryAriaLabel, chargeToFillColor, clampCharge } from "./BatteryBolt.tsx";

Deno.test("clampCharge - clamps below 0 to 0", () => {
  assertEquals(clampCharge(-5), 0);
});

Deno.test("clampCharge - clamps above 100 to 100", () => {
  assertEquals(clampCharge(105), 100);
});

Deno.test("clampCharge - passes through in-range values", () => {
  assertEquals(clampCharge(42), 42);
});

Deno.test("chargeToFillColor - 0% is red-500", () => {
  assertEquals(chargeToFillColor(0), "rgb(239, 68, 68)");
});

Deno.test("chargeToFillColor - 50% is amber-500", () => {
  assertEquals(chargeToFillColor(50), "rgb(245, 158, 11)");
});

Deno.test("chargeToFillColor - 100% is brand lime", () => {
  assertEquals(chargeToFillColor(100), "rgb(204, 255, 0)");
});

Deno.test("chargeToFillColor - 25% is interpolated between red and amber", () => {
  assertEquals(chargeToFillColor(25), "rgb(242, 113, 40)");
});

Deno.test("chargeToFillColor - out-of-range input is clamped first", () => {
  assertEquals(chargeToFillColor(150), chargeToFillColor(100));
  assertEquals(chargeToFillColor(-10), chargeToFillColor(0));
});

Deno.test("batteryAriaLabel - formats and rounds the percentage", () => {
  assertEquals(batteryAriaLabel(72.4), "Battery at 72% charge");
  assertEquals(batteryAriaLabel(72.6), "Battery at 73% charge");
});
```

Check `frontend/lib/gamification.test.ts`'s import line for the exact `@std/assert` specifier already in use in this project before running — copy it verbatim rather than retyping from memory, since Deno import specifiers must match `deno.json`'s import map exactly.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `deno test frontend/app/components/shared/BatteryBolt.test.ts`
Expected: FAIL — `BatteryBolt.tsx` does not exist yet.

- [ ] **Step 3: Implement `BatteryBolt.tsx`**

```tsx
import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";

export interface BatteryBoltProps {
  chargePct: number;
  size?: number;
  className?: string;
}

const BOLT_PATH = "M69 21L36 66H58.5L51 99L84 54H61.5L69 21Z";
const BOLT_TOP = 21;
const BOLT_BOTTOM = 99;
const BOLT_HEIGHT = BOLT_BOTTOM - BOLT_TOP;
const GLOW_THRESHOLD = 80;

const COLOR_STOPS: ReadonlyArray<{ pct: number; rgb: readonly [number, number, number] }> = [
  { pct: 0, rgb: [239, 68, 68] },
  { pct: 50, rgb: [245, 158, 11] },
  { pct: 100, rgb: [204, 255, 0] },
];

export function clampCharge(pct: number): number {
  if (Number.isNaN(pct)) return 0;
  return Math.min(100, Math.max(0, pct));
}

export function chargeToFillColor(pct: number): string {
  const clamped = clampCharge(pct);
  let lower = COLOR_STOPS[0];
  let upper = COLOR_STOPS[COLOR_STOPS.length - 1];
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (clamped >= COLOR_STOPS[i].pct && clamped <= COLOR_STOPS[i + 1].pct) {
      lower = COLOR_STOPS[i];
      upper = COLOR_STOPS[i + 1];
      break;
    }
  }
  const span = upper.pct - lower.pct;
  const t = span === 0 ? 0 : (clamped - lower.pct) / span;
  const rgb = lower.rgb.map((c, i) => Math.round(c + (upper.rgb[i] - c) * t));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export function batteryAriaLabel(pct: number): string {
  return `Battery at ${Math.round(clampCharge(pct))}% charge`;
}

export function BatteryBolt({ chargePct, size = 120, className }: BatteryBoltProps) {
  const pct = clampCharge(chargePct);
  const fillColor = chargeToFillColor(pct);
  const fillHeight = (pct / 100) * BOLT_HEIGHT;
  const fillY = BOLT_BOTTOM - fillHeight;
  const shouldReduceMotion = useReducedMotion();
  const glowing = pct >= GLOW_THRESHOLD;
  const clipId = `battery-bolt-clip-${useId()}`;

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={batteryAriaLabel(pct)}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={BOLT_PATH} />
        </clipPath>
      </defs>
      <path d={BOLT_PATH} fill="currentColor" opacity="0.12" />
      <motion.g
        clipPath={`url(#${clipId})`}
        animate={
          glowing && !shouldReduceMotion
            ? { opacity: [0.75, 1, 0.75] }
            : { opacity: 1 }
        }
        transition={
          glowing && !shouldReduceMotion
            ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0 }
        }
      >
        <motion.rect
          x={36}
          width={48}
          fill={fillColor}
          initial={false}
          animate={{ y: fillY, height: fillHeight }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 160, damping: 13, mass: 0.9 }
          }
        />
      </motion.g>
    </svg>
  );
}
```

The `useId()`-derived `clipId` is required, not decorative: `Landing.tsx` (Task 4) renders five `BatteryBolt` instances on one page, and SVG `id` values are global to the document — a fixed id would make every instance after the first clip against the first instance's `<clipPath>`, silently breaking the fill on every bolt but the first.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `deno test frontend/app/components/shared/BatteryBolt.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/components/shared/BatteryBolt.tsx frontend/app/components/shared/BatteryBolt.test.ts
git commit -m "Add BatteryBolt component and its pure color/label helpers"
```

---

### Task 2: Migrate `Garden.tsx` to `BatteryBolt`

**Files:**
- Modify: `frontend/app/components/Garden.tsx`

**Interfaces:**
- Consumes: `BatteryBolt({ chargePct, size, className })` from Task 1 (`frontend/app/components/shared/BatteryBolt.tsx`).

- [ ] **Step 1: Remove the `VirtualPlant`/`PlantStage` import and the temporary bridge**

In `frontend/app/components/Garden.tsx`, delete this import line:

```ts
import { VirtualPlant, type PlantStage } from "./shared/VirtualPlant";
```

and add in its place:

```ts
import { BatteryBolt } from "./shared/BatteryBolt";
```

Delete the `STAGE_LABEL` map (lines 11-18) and the `stageFromCharge` bridge function and its comment (lines 20-31) entirely — both existed only to keep `VirtualPlant` compiling against the new charge data and are fully replaced by `BatteryBolt` taking `chargePct` directly.

- [ ] **Step 2: Replace the plant render with the battery render**

Replace:

```tsx
<VirtualPlant stage={stageFromCharge(profile.current_charge_pct)} size={160} />
<div className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
  {STAGE_LABEL[stageFromCharge(profile.current_charge_pct)]}
</div>
```

with:

```tsx
<BatteryBolt chargePct={profile.current_charge_pct} size={160} />
<div className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
  {profile.current_charge_pct}% charged
</div>
```

- [ ] **Step 3: Type-check**

Run: `deno task check`
Expected: no errors referencing `Garden.tsx`, `VirtualPlant`, or `PlantStage`. (`VirtualPlant.tsx` itself isn't deleted until Task 4, once `Landing.tsx` also stops importing it, so this step should show zero remaining references from `Garden.tsx` specifically, not zero references project-wide yet.)

- [ ] **Step 4: Commit**

```bash
git add frontend/app/components/Garden.tsx
git commit -m "Migrate Garden.tsx from VirtualPlant/PlantStage to BatteryBolt"
```

---

### Task 3: `FeatureIcon` component (replaces `FlowerPot`)

**Files:**
- Create: `frontend/app/components/shared/FeatureIcon.tsx`

**Interfaces:**
- Produces: `FeatureIcon({ variant: FeatureIconVariant, size?: number, className?: string }): JSX.Element` and the exported type `FeatureIconVariant = "timer" | "syllabus" | "rooms" | "analytics" | "leaderboard" | "achievements" | "opensource"`.

This task creates the component only — nothing consumes it yet (`FlowerPot` still renders in `Landing.tsx` until Task 5). No unit test: like `VirtualPlant`/`FlowerPot`, this is presentational SVG with no branching logic worth a pure-function test: `deno task check` (Task 5) is the compile-correctness gate, and Task 6's browser check is the visual gate.

- [ ] **Step 1: Implement `FeatureIcon.tsx`**

```tsx
export type FeatureIconVariant =
  | "timer"
  | "syllabus"
  | "rooms"
  | "analytics"
  | "leaderboard"
  | "achievements"
  | "opensource";

interface Props {
  variant: FeatureIconVariant;
  size?: number;
  className?: string;
}

/**
 * A small hand-built companion to BatteryBolt — same dark-chip + lime-accent
 * language, used as a per-tile marker in the feature bento instead of a
 * generic icon set. One chip shape, seven glyph variants, echoing how
 * FlowerPot gave the old plant-themed grid one pot shape and seven plantings.
 */
export function FeatureIcon({ variant, size = 56, className }: Props) {
  const Glyph = VARIANTS[variant];

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <ChipBase />
      <Glyph />
    </svg>
  );
}

function ChipBase() {
  return (
    <>
      <rect x="20" y="10" width="4" height="8" fill="#8b8b8b" />
      <rect x="30" y="10" width="4" height="8" fill="#8b8b8b" />
      <rect x="40" y="10" width="4" height="8" fill="#8b8b8b" />
      <rect x="20" y="50" width="4" height="8" fill="#8b8b8b" />
      <rect x="30" y="50" width="4" height="8" fill="#8b8b8b" />
      <rect x="40" y="50" width="4" height="8" fill="#8b8b8b" />
      <rect x="14" y="18" width="36" height="32" rx="4" fill="#1a1a1a" />
      <rect x="14" y="18" width="36" height="6" rx="3" fill="#ccff00" opacity="0.15" />
    </>
  );
}

function Timer() {
  return (
    <>
      <circle cx="32" cy="34" r="9" fill="none" stroke="#ccff00" strokeWidth="2" />
      <line x1="32" y1="34" x2="32" y2="28" stroke="#ccff00" strokeWidth="2" strokeLinecap="round" />
      <line x1="32" y1="34" x2="36" y2="36" stroke="#ccff00" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function Syllabus() {
  return (
    <>
      <rect x="25" y="24" width="14" height="18" rx="1.5" fill="none" stroke="#ccff00" strokeWidth="2" />
      <line x1="32" y1="28" x2="32" y2="37" stroke="#ccff00" strokeWidth="2" strokeLinecap="round" />
      <path d="M28 34 L32 38 L36 34" fill="none" stroke="#ccff00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function Rooms() {
  return (
    <>
      <circle cx="28" cy="33" r="6" fill="none" stroke="#ccff00" strokeWidth="2" />
      <circle cx="37" cy="33" r="6" fill="none" stroke="#ccff00" strokeWidth="2" />
    </>
  );
}

function Analytics() {
  return (
    <>
      <rect x="24" y="36" width="4" height="8" fill="#ccff00" />
      <rect x="30" y="30" width="4" height="14" fill="#ccff00" />
      <rect x="36" y="24" width="4" height="20" fill="#ccff00" />
    </>
  );
}

function Leaderboard() {
  return (
    <>
      <path d="M27 25 h10 v6 a5 5 0 0 1-10 0 z" fill="none" stroke="#ccff00" strokeWidth="2" />
      <line x1="32" y1="36" x2="32" y2="40" stroke="#ccff00" strokeWidth="2" />
      <line x1="27" y1="42" x2="37" y2="42" stroke="#ccff00" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function Achievements() {
  return <path d="M34 24 L27 35 H31.5 L29.5 43 L38 32 H33.5 L34 24 Z" fill="#ccff00" />;
}

function OpenSource() {
  return (
    <>
      <path d="M27 27 L22 34 L27 41" fill="none" stroke="#ccff00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M37 27 L42 34 L37 41" fill="none" stroke="#ccff00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

const VARIANTS: Record<FeatureIconVariant, () => React.ReactElement> = {
  timer: Timer,
  syllabus: Syllabus,
  rooms: Rooms,
  analytics: Analytics,
  leaderboard: Leaderboard,
  achievements: Achievements,
  opensource: OpenSource,
};
```

- [ ] **Step 2: Type-check**

Run: `deno task check`
Expected: no errors in `FeatureIcon.tsx` (it isn't imported anywhere yet, so this only checks the file is internally well-typed).

- [ ] **Step 3: Commit**

```bash
git add frontend/app/components/shared/FeatureIcon.tsx
git commit -m "Add FeatureIcon component (replaces FlowerPot's role in the feature grid)"
```

---

### Task 4: `Landing.tsx` — hero and "How charging works" section

**Files:**
- Modify: `frontend/app/components/Landing.tsx`
- Delete: `frontend/app/components/shared/VirtualPlant.tsx`

**Interfaces:**
- Consumes: `BatteryBolt({ chargePct, size, className })` from Task 1.

This task covers the hero (headline, subhead, hero visual) and the stage-walkthrough section. It deliberately does not touch the feature grid, `FlowerPot`, or the closing CTA line — those are Task 5, so each task stays reviewable as one coherent piece of the page rather than one enormous diff.

- [ ] **Step 1: Update imports**

Replace:

```ts
import { VirtualPlant } from "./shared/VirtualPlant";
import type { PlantStage } from "./shared/VirtualPlant";
```

with:

```ts
import { BatteryBolt } from "./shared/BatteryBolt";
```

(Leave the `FlowerPot`/`PotVariant` imports in place — Task 5 removes those.)

- [ ] **Step 2: Replace the `STAGES` array with `CHARGE_BEATS`**

Replace the `STAGES` constant and its doc comment (originally naming the six `PlantStage` thresholds) with:

```ts
/**
 * Four beats walking through the charge mechanic itself — not milestones,
 * since charge is continuous rather than staged. Each renders BatteryBolt
 * at an illustrative fill level; the numbers themselves come straight from
 * the formula in docs/specs/2026-08-12-battery-economy-design.md.
 */
const CHARGE_BEATS: ReadonlyArray<{
  chargePct: number;
  name: string;
  detail: string;
  note: string;
}> = [
  {
    chargePct: 25,
    name: "Study, and it climbs",
    detail: "+20/day max",
    note: "Every focused minute logged today adds to today's charge, up to +20 at two hours.",
  },
  {
    chargePct: 45,
    name: "Skip a day, and it drains",
    detail: "-8/day",
    note: "Charge falls a flat 8 points on any day with nothing logged — no cliff, just a steady cost.",
  },
  {
    chargePct: 70,
    name: "Stay above zero, and your streak holds",
    detail: "days since empty",
    note: "Every consecutive day your charge stays above zero counts toward your longest run.",
  },
  {
    chargePct: 100,
    name: "Reach 100, and it's full",
    detail: "full charge",
    note: "Hold two hours a day for ten days straight and your battery sits at 100%.",
  },
];
```

- [ ] **Step 3: Update the hero copy and visual**

Replace the headline:

```tsx
<h1 ...>
  Twenty hours of studying looks like a tree.
</h1>
```

with:

```tsx
<h1 ...>
  Twenty hours of studying looks like a full charge.
</h1>
```

(Keep the existing className and `style` props on the `<h1>` unchanged — only the text content changes.)

Replace the subhead sentence:

```
Start a timer, tag it to a goal, and watch the total turn into a plant that will not grow unless you do the work.
```

with:

```
Start a timer, tag it to a goal, and watch the total turn into a charge that will not build unless you do the work.
```

Replace the "See how it grows" anchor link text with "See how it charges" (same `href="#stages"`, same classes — only the visible text changes).

Update the hero visual comment and render. Replace:

```tsx
{/* aria-hidden: the plant repeats what the headline and the stage
    list already say in text, and VirtualPlant's own label is
    written for the signed-in dashboard ("Your study plant"). */}
<div aria-hidden="true" className="text-zinc-900 dark:text-zinc-50">
  <VirtualPlant stage="blooming" size={340} />
</div>
```

with:

```tsx
{/* aria-hidden: the bolt repeats what the headline and the charge
    beats already say in text, and BatteryBolt's own label is
    written for the signed-in dashboard ("Battery at N% charge"). */}
<div aria-hidden="true" className="text-zinc-900 dark:text-zinc-50">
  <BatteryBolt chargePct={100} size={340} />
</div>
```

Also update the comment just above the hero `<section>` (currently "the real VirtualPlant component at its final stage, not an illustration") to say "the real BatteryBolt component at full charge, not an illustration" — same meaning, updated name.

- [ ] **Step 4: Update the stage-walkthrough section**

Replace the section heading:

```tsx
<h2 ...>
  Six stages, and the hours each one costs.
</h2>
<p ...>
  There is no way to skip ahead and no way to buy a bigger tree. The
  only input is logged, validated focus time.
</p>
```

with:

```tsx
<h2 ...>
  How charging works, beat by beat.
</h2>
<p ...>
  There is no way to skip ahead and no way to buy a bigger charge. The
  only input is logged, validated focus time.
</p>
```

(Keep the existing className props on both elements unchanged.)

Replace the nav label "How it grows" (in the header `<nav>`, the link with `href="#stages"`) with "How it charges". Leave `href="#stages"` and `id="stages"` on the section itself unchanged — they're internal anchors, not visible copy.

Replace the `.map` loop body. Replace:

```tsx
{STAGES.map(({ stage, name, threshold, note }, i) => (
  <li key={stage} className="ss-stage grid grid-cols-[auto_1fr] gap-x-5 sm:gap-x-8">
    <div className="ss-stage-marker flex flex-col items-center text-zinc-900 dark:text-zinc-50">
      <div
        aria-hidden="true"
        className="ss-stage-dot bg-white py-2 dark:bg-[#0a0a0a]"
      >
        <VirtualPlant stage={stage} size={88} />
      </div>
    </div>

    <div className="ss-stage-body pb-14">
      <h3 className="ss-display flex flex-wrap items-baseline gap-x-3 text-2xl font-medium tracking-tighter sm:text-3xl">
        <span className="tabular-nums text-zinc-500">
          {String(i + 1).padStart(2, "0")}
        </span>
        <span>{name}</span>
        <span className="text-base font-normal tracking-normal tabular-nums text-[var(--brand-lime-ink)] dark:text-[var(--brand-lime)]">
          {threshold}
        </span>
      </h3>
      <p className="mt-3 max-w-md text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        {note}
      </p>
    </div>
  </li>
))}
```

with:

```tsx
{CHARGE_BEATS.map(({ chargePct, name, detail, note }, i) => (
  <li key={name} className="ss-stage grid grid-cols-[auto_1fr] gap-x-5 sm:gap-x-8">
    <div className="ss-stage-marker flex flex-col items-center text-zinc-900 dark:text-zinc-50">
      <div
        aria-hidden="true"
        className="ss-stage-dot bg-white py-2 dark:bg-[#0a0a0a]"
      >
        <BatteryBolt chargePct={chargePct} size={88} />
      </div>
    </div>

    <div className="ss-stage-body pb-14">
      <h3 className="ss-display flex flex-wrap items-baseline gap-x-3 text-2xl font-medium tracking-tighter sm:text-3xl">
        <span className="tabular-nums text-zinc-500">
          {String(i + 1).padStart(2, "0")}
        </span>
        <span>{name}</span>
        <span className="text-base font-normal tracking-normal tabular-nums text-[var(--brand-lime-ink)] dark:text-[var(--brand-lime)]">
          {detail}
        </span>
      </h3>
      <p className="mt-3 max-w-md text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        {note}
      </p>
    </div>
  </li>
))}
```

The `key` moves from `stage` to `name` since `CHARGE_BEATS` entries no longer have a `stage` field — every `name` in the array above is unique, so this is a safe substitute key.

- [ ] **Step 5: Delete `VirtualPlant.tsx`**

Run: `grep -rn "VirtualPlant\|PlantStage" frontend/` to confirm zero remaining references (both `Garden.tsx` from Task 2 and `Landing.tsx` from this task have dropped them). Then:

```bash
git rm frontend/app/components/shared/VirtualPlant.tsx
```

- [ ] **Step 6: Type-check**

Run: `deno task check`
Expected: no errors. No file should reference `VirtualPlant` or `PlantStage` anymore.

- [ ] **Step 7: Commit**

```bash
git add frontend/app/components/Landing.tsx
git commit -m "Pivot Landing.tsx hero and stage-walkthrough section to BatteryBolt"
```

---

### Task 5: `Landing.tsx` — feature grid, closing CTA, and `FlowerPot` removal

**Files:**
- Modify: `frontend/app/components/Landing.tsx`
- Modify: `frontend/styles/landing.css`
- Delete: `frontend/app/components/shared/FlowerPot.tsx`

**Interfaces:**
- Consumes: `FeatureIcon({ variant, size, className })` and `FeatureIconVariant` from Task 3.

- [ ] **Step 1: Update imports**

Replace:

```ts
import { FlowerPot } from "./shared/FlowerPot";
import type { PotVariant } from "./shared/FlowerPot";
```

with:

```ts
import { FeatureIcon } from "./shared/FeatureIcon";
import type { FeatureIconVariant } from "./shared/FeatureIcon";
```

- [ ] **Step 2: Replace the `FEATURES` array**

Replace the `FEATURES` constant (the "whole garden" entry is dropped; an achievements entry takes its slot; the analytics entry's body copy is updated to charge language; the field is renamed `pot` → `icon` with the new type):

```ts
const FEATURES: ReadonlyArray<{
  title: string;
  body: string;
  span: "wide" | "unit";
  icon: FeatureIconVariant;
}> = [
  {
    title: "A timer that knows what you are working on",
    body: "Stopwatch or Pomodoro, with phase labels and ambient focus sounds. Every session is tagged to a goal and a subject, validated on the server, and folded straight into your charge and your battery — so the time you log is the time that counts.",
    span: "wide",
    icon: "timer",
  },
  {
    title: "Syllabus import",
    body: "Paste a syllabus and get goals and deadlines back, instead of typing the whole term in by hand.",
    span: "unit",
    icon: "syllabus",
  },
  {
    title: "Study rooms",
    body: "Sit in a room with other people working. Nobody talks. That is the point.",
    span: "unit",
    icon: "rooms",
  },
  {
    title: "Analytics that answer a real question",
    body: "Where the hours went, by subject. Which hours of the day you actually focus in. Your current charge against your longest run without hitting empty. It is one Postgres call — analytics_summary — rendered with Recharts.",
    span: "wide",
    icon: "analytics",
  },
  {
    title: "A leaderboard you can opt into",
    body: "Charge and hours, compared across everyone who chose to make their profile public. Your page lives at /u/your-username, or nowhere at all.",
    span: "wide",
    icon: "leaderboard",
  },
  {
    title: "Achievements built on the real thing",
    body: "Charged Up at seven days without hitting empty. Never Empty at thirty. Full Charge the first time you hit 100%. Unlocked from your real history, not a checklist.",
    span: "wide",
    icon: "achievements",
  },
  {
    title: "Open source, MIT",
    body: "Read the schema, the row-level security policies, the tests. Then run your own copy of it.",
    span: "wide",
    icon: "opensource",
  },
];
```

- [ ] **Step 3: Update the feature grid render**

Replace:

```tsx
{FEATURES.map(({ title, body, span, pot }) => (
  <article
    key={title}
    className={`ss-tile flex flex-col p-7 ${SPAN_CLASS[span]}`}
  >
    <div className="ss-planter">
      <FlowerPot variant={pot} size={72} />
    </div>
    <h3 ...>
      {title}
    </h3>
    <p ...>
      {body}
    </p>
  </article>
))}
```

with:

```tsx
{FEATURES.map(({ title, body, span, icon }) => (
  <article
    key={title}
    className={`ss-tile flex flex-col p-7 ${SPAN_CLASS[span]}`}
  >
    <div className="mb-4 flex justify-center">
      <FeatureIcon variant={icon} size={72} />
    </div>
    <h3 ...>
      {title}
    </h3>
    <p ...>
      {body}
    </p>
  </article>
))}
```

(Keep the exact existing `className` values on `<h3>` and `<p>` — only the marker `<div>` and its contents change. The `.ss-planter` wrapper class is dropped here in favor of a plain flex-center wrapper since `.ss-planter` exists solely to draw FlowerPot's soil ledge, which Step 5 removes from the stylesheet.)

- [ ] **Step 4: Update the closing CTA line**

Replace:

```tsx
<p ...>
  Your seed is already in the pot.
</p>
```

with:

```tsx
<p ...>
  Your battery is already charging.
</p>
```

- [ ] **Step 5: Clean up `frontend/styles/landing.css`**

Delete the `.ss-planter` rule block and its `.ss-planter::after` rule (the soil-ledge effect under each pot — no longer referenced after Step 3), along with the section comment above them ("Planter sill — the pot in each tile rests on a soil-toned ledge...").

In the `.ss-tile` rule's comment and value, the terracotta wash exists specifically to read as "a planter box" — update it to a neutral wash matching the new chip/lime language:

Replace:

```css
/* A filled seam behind uniform-width gaps draws a perfect grid over
   asymmetric spans, which reads as a spreadsheet before it reads as a bento.
   Each tile carries its own subtle fill instead — the varied spans do the
   talking, not a border grid. A warm terracotta wash (the same #8b5a3c the
   pots are drawn in) reads as a planter box rather than a neutral card. */
.ss-tile {
  background: color-mix(in oklab, #8b5a3c 5%, transparent);
}
```

with:

```css
/* A filled seam behind uniform-width gaps draws a perfect grid over
   asymmetric spans, which reads as a spreadsheet before it reads as a bento.
   Each tile carries its own subtle fill instead — the varied spans do the
   talking, not a border grid. A faint lime wash keeps the same effect
   without leaning on the pot/soil palette the feature icons no longer use. */
.ss-tile {
  background: color-mix(in oklab, var(--brand-lime) 4%, transparent);
}
```

Also update the two remaining stale comments (identified in Task exploration, not code — comments only, no behavior change):
- Line 2's file-header comment: `enrichment: Tier B reused VirtualPlant` → `enrichment: Tier B reused BatteryBolt`.
- The `.ss-hero-plant` rule's comment: `a soft radial ground behind the VirtualPlant` → `a soft radial ground behind the BatteryBolt`.

- [ ] **Step 6: Delete `FlowerPot.tsx`**

Run: `grep -rn "FlowerPot\|PotVariant" frontend/` to confirm zero remaining references. Then:

```bash
git rm frontend/app/components/shared/FlowerPot.tsx
```

- [ ] **Step 7: Type-check**

Run: `deno task check`
Expected: no errors. No file should reference `FlowerPot` or `PotVariant` anymore.

- [ ] **Step 8: Commit**

```bash
git add frontend/app/components/Landing.tsx frontend/styles/landing.css
git commit -m "Pivot Landing.tsx feature grid and CTA to FeatureIcon, remove FlowerPot"
```

---

### Task 6: Full verification pass

**Files:** none (verification only — no code changes expected; if this step surfaces a bug, fix it in the file it belongs to and fold that fix into this task's commit).

**Interfaces:** none — this task consumes the finished output of Tasks 1-5 as a whole.

- [ ] **Step 1: Run the full unit test suite**

Run: `deno task test:unit`
Expected: all tests pass, including the 9 new `BatteryBolt.test.ts` tests and the untouched `gamification.test.ts`/`password.test.ts`/`avatar.test.ts`/`format.test.ts` suites.

- [ ] **Step 2: Run the type checker**

Run: `deno task check`
Expected: zero errors, zero remaining references to `VirtualPlant`, `PlantStage`, `FlowerPot`, or `PotVariant` anywhere under `frontend/`.

- [ ] **Step 3: Confirm no stray references outside `frontend/`**

Run: `grep -rn "VirtualPlant\|PlantStage\|FlowerPot\|PotVariant" --include="*.ts" --include="*.tsx" --include="*.css" .`
Expected: no output.

- [ ] **Step 4: Visual smoke-check in the browser**

Start the project's dev server (`deno task dev`) and open both:
- `/garden` (signed in) — confirm `BatteryBolt` renders at the current charge level, animates on load, and the "% charged" label matches the number in the stat box beside it.
- `/` (landing, signed out) — confirm the hero bolt renders at full charge with the glow/pulse active, the four charge-beat bolts render at their distinct fill levels (25/45/70/100), the feature grid shows seven distinct `FeatureIcon` glyphs with no leftover pot/soil imagery, and the closing CTA reads "Your battery is already charging."

Also check the OS/browser "reduce motion" setting: with it enabled, confirm the fill transitions are instant and the glow/pulse loop does not run, on both pages.

This step has no automated pass/fail — record what you observed. If anything looks wrong (a bolt not filling, a glow that doesn't stop under reduced motion, a duplicate SVG `id` collision from a missing `useId()`), fix it now rather than deferring, since this is the last task in the plan.

- [ ] **Step 5: Commit any fixes found in Step 4**

Only if Step 4 required a code change:

```bash
git add -A
git commit -m "Fix issues found in battery visual browser verification"
```

If Step 4 required no changes, there is nothing to commit for this task.
