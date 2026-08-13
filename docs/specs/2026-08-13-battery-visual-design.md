# Battery visual — design

**Status:** approved, ready for implementation planning
**Sub-project:** 2 of 6 in the plant→electricity pivot (see
`2026-08-12-battery-economy-design.md`), now also absorbing sub-project 4
(landing page pivot) for this component's surface area — decided during
brainstorming because `Landing.tsx` cannot compile once `PlantStage`/
`VirtualPlant` are removed, and half-pivoting its copy (a battery icon
inside tree-metaphor prose) reads worse than finishing the story.
**Depends on:** sub-project 1 (merged to `main` at `c7c31868`) —
`GamificationProfile.current_charge_pct: number` (0-100) is the only new
data this sub-project consumes.

## Why

Sub-project 1 replaced the streak/plant XP economy with the battery-charge
economy at the data layer. `Garden.tsx` currently bridges the gap with a
temporary `stageFromCharge()` function that buckets the continuous charge
percentage back into the old six `PlantStage` names, purely to keep
`VirtualPlant` rendering something. This spec deletes that bridge and
`VirtualPlant` itself, replacing them with a battery component whose fill
level is driven directly by `current_charge_pct` — no discrete stages.

`Landing.tsx` is the only other consumer of `VirtualPlant`/`PlantStage`
(the design doc for sub-project 1 also listed `Dashboard.tsx`, but that
consumer reference was stale — `Dashboard.tsx` does not import either).
Removing the type breaks `Landing.tsx`'s build, and `Landing.tsx` is deep
in plant metaphor: the hero headline, a full six-stage walkthrough section,
a hand-drawn flowerpot icon set in the feature grid, a "the whole garden"
feature tile, and a "seed... in the pot" closing line. This spec pivots all
of it in one pass rather than leaving a battery icon stranded in tree copy
until a later sub-project catches up.

## Component: `BatteryBolt`

Replaces `frontend/app/components/shared/VirtualPlant.tsx` with
`frontend/app/components/shared/BatteryBolt.tsx`.

```ts
interface Props {
  chargePct: number; // 0-100
  size?: number;      // default 120, matching VirtualPlant's default
  className?: string;
}
```

**Shape:** the lightning-bolt path already used in `Logo.tsx`
(`M23 7L12 22H19.5L17 33L28 18H20.5L23 7Z`, in a 40×40 viewBox — rescaled
to this component's 120×120 viewBox to match `VirtualPlant`'s coordinate
space) becomes an SVG `<clipPath>`. Inside the clip, a `<rect>` fills from
the bottom upward to `chargePct%` of the bolt's height — the same
"fill a silhouette from the bottom" language `VirtualPlant` used for
growth, now continuous instead of six discrete glyphs.

**Color:** the fill rect's color interpolates across the charge range —
low charge reads as depleted (amber/red), high charge resolves to the
brand lime (`#ccff00`) at 100%. Implemented as a small lookup/interpolation
function, not a discrete threshold table, so the color shifts smoothly as
`chargePct` changes.

**Motion (via `motion/react`, matching `VirtualPlant`'s existing usage):**
- The fill height always animates on `chargePct` change — a spring
  transition (reuse `VirtualPlant`'s spring parameters: stiffness 160,
  damping 13, mass 0.9), not a hard cut.
- At `chargePct >= 80`, a recurring glow/pulse (opacity or drop-shadow
  animate, looping) layers on top of the bolt.
- Below 80%, no idle animation — the component is visually static aside
  from fill transitions, reading as "charged enough to glow" vs. "just
  sitting there."
- `useReducedMotion()` (already imported by `VirtualPlant`) disables both
  the spring's oscillation and the pulse loop, matching the existing
  reduced-motion contract.

**Accessibility:** `role="img"`, `aria-label` describing the charge in
words, e.g. `` `Battery at ${Math.round(chargePct)}% charge` ``  — same
pattern as `VirtualPlant`'s `aria-label={\`Your study plant, ${stage}\`}`.

## `Garden.tsx` changes

- Delete `stageFromCharge()`, the `STAGE_LABEL` map, and the `PlantStage`
  import.
- Replace `<VirtualPlant stage={stageFromCharge(profile.current_charge_pct)} size={160} />`
  with `<BatteryBolt chargePct={profile.current_charge_pct} size={160} />`.
- The label under the visual (currently `STAGE_LABEL[stageFromCharge(...)]`)
  becomes the charge percentage itself, e.g. `${profile.current_charge_pct}% charged`.
- No other structural change to the page — route, layout, and the rest of
  the stat boxes are untouched. `/garden` page restructuring stays
  sub-project 3's scope.

## `Landing.tsx` changes

- **Hero headline:** "Twenty hours of studying looks like a tree." becomes
  an electric-charge equivalent. Exact copy is an implementation-time
  writing decision, not a design-level one — the implementer should aim
  for the same register (short, concrete, second-person-adjacent) and the
  final line should be shown for approval before landing.
- **Hero visual:** `<VirtualPlant stage="blooming" size={340} />` becomes
  `<BatteryBolt chargePct={100} size={340} />`.
- **"Six stages" section → "How charging works":** the `STAGES` array (six
  `PlantStage` entries with hour thresholds) is replaced by 3-4 beats
  describing the mechanic itself, not milestones:
  1. Study → charge gains (up to +20/day, capped at 120 min).
  2. Skip a day → charge drains (-8 flat).
  3. Stay above zero → `days_since_empty` grows.
  4. Reach 100 → full charge.
  Each beat renders `<BatteryBolt>` at an illustrative fill level (e.g.
  25/60/85/100) instead of a named stage glyph. Section heading and intro
  copy ("There is no way to skip ahead...") get light rewording to match;
  the underlying claim (no shortcuts, only logged focus time) still holds
  and doesn't need to change.
- **Feature grid icons:** a new small hand-drawn SVG icon set replaces
  `FlowerPot`'s seven pot/soil variants — same craft level and the bolt's
  electric/lime visual language instead of terracotta/soil. One icon per
  remaining feature tile (see next point for the count change).
- **"The whole garden" tile:** dropped — a collected-plants concept has no
  battery equivalent. Its grid slot is replaced by a tile describing the
  achievement/charge-streak system (`days_since_empty`, `charged_up`,
  `never_empty`, `full_charge` achievements from sub-project 1), written
  fresh rather than adapted from the old copy.
- **Closing CTA line:** "Your seed is already in the pot." becomes an
  electric-themed equivalent — same implementation-time copy note as the
  headline.
- **Footer line "Focus. Track. Grow."** is left as-is — "Grow" reads fine
  against a charge metaphor (charge grows too) and isn't exclusively a
  plant word.
- `PotVariant` and `frontend/app/components/shared/FlowerPot.tsx` are
  deleted once the feature grid no longer references them.
- `frontend/styles/landing.css` — audit for any class rules that exist
  only to support `FlowerPot`/pot imagery (e.g. `.ss-planter`) and remove
  what's no longer used; leave layout-structural classes (`.ss-bento`,
  `.ss-tile`, `.ss-stage*`) alone since the new content reuses the same
  layout shapes.

## Out of scope (unchanged from sub-project 1's list, renumbered)

- `/garden` page/route restructuring — sub-project 3.
- `DESIGN.md` rewrite and e2e test copy sweep — sub-project 5.
- Demo trailer re-shoot and `seed-demo-history.ts`'s duplicated formula —
  sub-project 6.

## Testing

1. **Component test** for `BatteryBolt` (new `BatteryBolt.test.tsx` or
   equivalent, following the project's existing component-test
   conventions if any exist — otherwise a plain render/assert test is
   acceptable): renders at 0%, 50%, and 100% charge without throwing;
   `aria-label` reflects the rounded percentage; reduced-motion path
   doesn't crash.
2. **Visual smoke-check in the browser** (per this project's UI-change
   testing convention) of both `Garden.tsx` and `Landing.tsx` after the
   change — golden path (varying charge values) and the reduced-motion
   media query.
3. Existing `gamification.test.ts` and other unit tests are unaffected —
   this sub-project touches only rendering, not the economy formula.

## Rollout

No data or API changes — this is a pure rendering-layer swap consuming
data sub-project 1 already ships. Takes effect immediately on deploy, same
as sub-project 1.
