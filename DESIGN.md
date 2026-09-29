# StudySprint design system

StudySprint combines focused study timing with a battery that charges from focused work and drains
gradually when idle. The interface uses a clean monochromatic base paired with electric lime
(`#ccff00`) for progress, active timers, and achievements.

## Design principles

1. **Focus first layout** The interface minimizes visual noise so students can concentrate on their
   work. Primary interactions like timer controls and goal selection take central visual priority.
   Supporting elements stay muted until hovered or activated.

2. **Visible charge feedback** Time logged converts into battery charge and experience points (XP).
   The battery fill changes continuously with a spring transition and gains a quiet pulse at high
   charge.

3. **High contrast theme balance** Light mode uses clean white cards over soft gray backgrounds.
   Dark mode uses deep dark backgrounds (`#0a0a0a` / `oklch(0.145 0 0)`) with subtle border outlines
   (`white/10`). Electric lime serves as the unified highlight color across both modes.

## Color architecture

### Core brand tokens

| Token          | Hex / Value | Usage                                                                                                                                                                                                                                                                                 |
| -------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary dark   | `#030213`   | Main dark background in light mode text, brand elements                                                                                                                                                                                                                               |
| Electric lime  | `#ccff00`   | Signature accent for XP, level counters, charge, active tabs                                                                                                                                                                                                                          |
| Lime hover     | `#b3e600`   | Interactive hover state for electric lime buttons and links                                                                                                                                                                                                                           |
| Lime highlight | `#e5ff4d`   | Charge highlights and active glows                                                                                                                                                                                                                                                    |
| Lime ink       | `#3d5200`   | Lime as _text_ on a light surface. Use electric lime as a fill with dark text on light surfaces; `#ccff00` as text on white measures 1.18:1. This ink measures 8.73:1 on white. Dark mode keeps `#ccff00`, which measures 16.85:1 on `#0a0a0a`. |

### Surface tokens (Light vs. Dark mode)

The app supports dynamic theme switching using OKLCH and standard CSS variables defined in
`theme.css`.

| Token                | Light mode           | Dark mode                       | Application                    |
| -------------------- | -------------------- | ------------------------------- | ------------------------------ |
| `--background`       | `#ffffff`            | `oklch(0.145 0 0)` (`#0a0a0a`)  | Page background                |
| `--foreground`       | `oklch(0.145 0 0)`   | `oklch(0.985 0 0)`              | Primary body text              |
| `--card`             | `#ffffff`            | `oklch(0.145 0 0)`              | Card containers                |
| `--muted`            | `#ececf0`            | `oklch(0.269 0 0)`              | Disabled states, empty slots   |
| `--muted-foreground` | `#717182`            | `oklch(0.708 0 0)`              | Secondary labels, descriptions |
| `--border`           | `rgba(0, 0, 0, 0.1)` | `oklch(0.269 0 0)` / `white/10` | Divider lines, card borders    |
| `--destructive`      | `#d4183d`            | `oklch(0.396 0.141 25.723)`     | Danger actions, delete buttons |

### Battery palette

The charge bolt fills from the bottom and interpolates across these stops:

| Charge | Color               | Visual meaning |
| ------ | ------------------- | -------------- |
| 0%     | `rgb(239, 68, 68)`  | Depleted       |
| 50%    | `rgb(245, 158, 11)` | Recovering     |
| 100%   | `#ccff00`           | Fully charged  |

### Data visualization palette

Recharts charts use a 5-color categorical palette for subject time distributions:

- Chart 1: Warm amber / Indigo (`oklch(0.646 0.222 41.116)` / `oklch(0.488 0.243 264.376)`)
- Chart 2: Teal / Emerald (`oklch(0.6 0.118 184.704)` / `oklch(0.696 0.17 162.48)`)
- Chart 3: Deep blue / Bright lime (`oklch(0.398 0.07 227.392)` / `oklch(0.769 0.188 70.08)`)
- Chart 4: Yellow gold / Violet (`oklch(0.828 0.189 84.429)` / `oklch(0.627 0.265 303.9)`)
- Chart 5: Lime green / Rose (`oklch(0.769 0.188 70.08)` / `oklch(0.645 0.246 16.439)`)

## Typography and scale

StudySprint uses **Inter** for body and UI text and **Space Grotesk** for display headings, loaded
via the existing Google Fonts stylesheet. Tabular numbers (`tabular-nums`) ensure timer digits and
XP values stay visually aligned without shifting layout during countdowns.

### Type hierarchy

| Class / Level           | Size            | Weight          | Tracking           | Case      | Application                            |
| ----------------------- | --------------- | --------------- | ------------------ | --------- | -------------------------------------- |
| `text-6xl`              | 3.75rem (60px)  | Medium (500)    | `tracking-tighter` | Default   | Level numbers, giant stat highlights   |
| `text-4xl` / `text-5xl` | 2.25rem - 3rem  | Medium (500)    | `tracking-tighter` | Default   | Main page headings                     |
| `text-2xl`              | 1.5rem (24px)   | Medium (500)    | `tracking-tighter` | Default   | Card titles, modal headers             |
| `text-lg`               | 1.125rem (18px) | Normal (400)    | Normal             | Default   | Subtitles, intro body text             |
| `text-base`             | 1.0rem (16px)   | Normal / Medium | Normal             | Default   | Body prose, inputs, button text        |
| `text-xs`               | 0.75rem (12px)  | Bold (700)      | `tracking-widest`  | Uppercase | Category tags, badges, section headers |
| `text-[10px]`           | 0.625rem (10px) | Bold (700)      | `tracking-widest`  | Uppercase | Stat box labels, metadata tags         |

## Layout, radii, and grid

### Grid system

- Main content width: `max-w-5xl` (1024px) centered with `mx-auto`
- Horizontal padding: `px-8` (32px) on desktop, `px-4` on mobile
- Section spacing: `space-y-16` (64px) between main content blocks
- Component grid: 1 column on mobile, 2 columns on tablet (`md:grid-cols-2`), 3 columns on desktop
  (`lg:grid-cols-3`)

### Corner radii scale

The base border radius is defined as `--radius: 0.625rem` (10px).

- `rounded-sm`: 6px (`calc(var(--radius) - 4px)`)
- `rounded-md`: 8px (`calc(var(--radius) - 2px)`)
- `rounded-lg`: 10px (`var(--radius)`)
- `rounded-xl`: 14px (`calc(var(--radius) + 4px)`)
- `rounded-2xl`: 16px (1rem)
- `rounded-full`: 9999px for pill buttons and avatars

## Component specifications

### Focus timer card

The central timer card displays the current mode (Stopwatch or Pomodoro), elapsed time, active goal
title, and control buttons.

- Background: Card surface (`bg-white` or `dark:bg-[#0a0a0a]`) with
  `border border-zinc-200 dark:border-white/10`
- Timer display: `text-6xl font-medium tracking-tighter tabular-nums`
- Control actions: Primary action button styled with electric lime accent or solid fill, secondary
  controls using muted ghost icons

### Battery bolt

Renders a continuous 0% to 100% study charge within a centered 120px to 160px viewport.

- Fill changes use spring physics (`stiffness: 160`, `damping: 13`, `mass: 0.9`).
- At 80% or higher, the fill pulses gently. Reduced motion disables the pulse and uses instant
  changes.
- The SVG has `role="img"` and a label such as `Battery at 72% charge`.

### Stat boxes and achievement cards

- Unlocked achievements: `border-[#ccff00]/30 bg-[#ccff00]/5` with electric lime icon accent
- Locked achievements: `border-zinc-200 dark:border-white/10 opacity-50` with muted gray icon
- Stat counters: Uppercase `text-[10px] font-bold text-zinc-500 tracking-widest` label paired with
  `text-2xl font-medium tracking-tighter tabular-nums`

## Motion and interaction

StudySprint uses **Framer Motion** for React component animations:

- **Spring transitions**: Used for modal reveals, tab switches, and battery-fill changes
  (`type: "spring"`, `stiffness: 160`, `damping: 13`, `mass: 0.9`).
- **Battery pulse**: The battery fill uses a 2-second opacity loop at 80% charge or higher.
- **Hover micro-interactions**: Navigation arrows translate horizontally
  (`group-hover:-translate-x-1`), buttons scale slightly, link colors shift to electric lime.

## Accessibility guidelines

1. **Color contrast**: Text elements maintain high contrast against backgrounds in both light and
   dark modes. Electric lime (`#ccff00`) is paired with dark text when used as a background fill for
   legibility.
2. **Focus management**: Interactive elements use `outline-ring/50` for clear keyboard focus rings.
3. **Screen readers**: Battery SVGs include `role="img"` and descriptive `aria-label` tags (for
   example, `aria-label="Battery at 72% charge"`).
4. **Tabular numbers**: Numerical counters use `tabular-nums` so screen readers and layout engines
   process stat updates smoothly.

## Public landing experience (2026-09-26)

The public page centers on one interactive 3D bolt. The goal label is attached to its upper tip, and
becomes a selector only when at least two saved goals provide a real choice. The 30, 60, and 90
minute choices sit around the elliptical orbit. Their bubbles and connector ends use points
calculated from the SVG ellipse, so they stay attached when the scene resizes. The nearby orbit
segment moves to the selected duration. Charge follows the face fill, and seven marks beneath the
bolt reveal the visitor's current study week. Tapping the bolt starts a real countdown for the
selected duration. Further taps pause and resume it. After at least one minute, visitors can finish
early and save elapsed whole minutes; reaching the selected duration saves automatically. Dragging
only tilts the bolt and never starts the timer. Vertical touch scrolling remains available.

The bolt reflects saved charge and history. Guests start empty and save goals and sessions in
versioned browser local storage. Signed-in users see account data and save sessions through the
existing API. The account's charge rules remain authoritative; guest charge rises by one point per
six logged minutes until full. The uncharged image is only the loading and WebGL fallback. An active
countdown is saved under a separate browser storage key for its guest or account owner, so
refreshing the page restores its deadline or paused elapsed time. No study minutes are logged until
a session finishes and its save succeeds.

In light mode, the uncharged face and loading poster are neutral gray; study charge fills upward in
the logo's lime. Dark mode keeps its existing uncharged surface and charge treatment.

Unauthenticated visitors can also open `/guest` for real local study. They can create and select
goals, run the stopwatch or Pomodoro timer, log sessions, and revisit their charge and history after
a refresh. This guest data stays separate from signed-in account data and does not sync to an
account. The landing page now works for both guests and signed-in users; it no longer redirects
signed-in visitors to the dashboard.

`design/charge-sculpture.py` exports the existing casing, inset, and enamel face as a 68,064-byte
GLB with 1,932 triangles. Run it in Blender background mode with an output directory and
`--export-only` to skip the still render. Three.js loads separately from the landing bundle. A
material shader fills the face from bottom to top. Theme-specific WebPs captured from the same
Three.js camera and materials appear first and remain the fallback for failed loading or
unavailable/lost WebGL. Regenerate them with `design/capture-charge-poster.mjs` after changing the
scene camera or materials. The earlier Lottie source remains in the repository; this page no longer
loads its player or animation.

The page applies the saved theme before its first paint and preloads the WebP poster. Once that
poster loads, a short lime current follows its bevel while the deferred scene loads. On the first
rendered frame, the poster gives way to the 3D bolt at the same orientation. A fast bevel spark leads
into short procedural electrical arcs, a lime rim pulse, and one small recoil over 1.2 seconds. Each
burst generates new edge origins, lengths, and bends six times over about 300 milliseconds. Arcs
stay near the casing rather than pointing to fixed orbit locations. The
face keeps its actual charge throughout the entrance. The orbit draws in and
the duration bubbles settle at their calculated points. Reduced motion and the pause control skip the
sequence; a failed load keeps the poster and controls available.

HTML controls provide keyboard navigation, visible focus, and readable labels over the decorative
canvas. Desktop goal and charge labels follow projected model anchors. Below 700px their positions
are fixed around the object to keep text readable. The headline and neutral signup button support
the bolt; the preview card and chapter navigation are removed. Both themes use the existing tokens.

At rest, the bolt floats five pixels upward and back over 5.6 seconds and occasionally emits one or
two short procedural edge sparks. Clicking compresses the bolt,
rebounds once, and emits a stronger procedural burst over 480 milliseconds. These effects preserve
the actual charge reading. The idle cycle pauses offscreen
and in hidden tabs, stops during sessions, and respects paused and reduced motion. Hover and
keyboard focus give it a springy tilt and lift, with a crisp
green rim and tighter outer halo in the same accent color as the selected orbit mark. Its metal
shading stays intact. Pressing settles it back down with a quick scale response. During a session,
the orbit traces elapsed time from its selected point and freezes on pause. After a successful save
changes charge, the face fills over 700ms with a soft highlight along its fill boundary. Goal and day
details fade in when selected. Reduced motion and
the pause control skip these effects. The Three.js renderer has no idle loop and sleeps while hidden
or offscreen; it limits pixel ratio to 1.5 and releases GPU resources on unmount.

Native is the primary static reference for a brand shape occupying the page. Turn.io contributes
direct product explanation; Vooban contributes asymmetry and fine rules. Preparation verified all
three as dated Awwwards Site of the Day winners: Native (June 6, 2025), Turn.io (June 7, 2025), and
Vooban (November 25, 2020). Their indexed images are research, not live-site recordings or shipped
assets. The earlier poster and conventional landing structures were rejected; the workspace replaces
them.

Token extraction measured the Turn.io Awwwards page shell, not its live CSS: #222222 text, #f8f8f8
surfaces, an 8px spacing scale, 1px rules, and display type with a 1.0 line height. Font readiness
was false, and Native extraction timed out. These findings inform hierarchy; they do not replace
StudySprint's tokens.

The inspiration workflow is partial. Search calls returned no results or an upstream error. Live
capture and temporal analysis remain blocked after runner recovery attempts. Video analysis is
approved, but no recording was uploaded. The Open Design connection and effect-extractor plugin now
pass their checks; the required evidence-dependent handoff has not run. Lottie Creator's native page
tools now work through Chrome's WebMCP domain, and the charge sequence was authored and exported
through them. No completed Open Design artifact is claimed. The user approved a capture waiver on
September 26 and directed finalization with the existing Blender and Creator assets. No further live
reference captures or capture VM provisioning are authorized. The workflow remains partial; the
waiver does not establish missing capture, analysis, or Open Design evidence. Details remain in
ignored `artifacts/design-inspiration/` records.

Verification covers 320, 390, 621, 768, and 1440px widths in both themes. Browser checks cover
duration selection, the landing timer, guest persistence without backend writes, authenticated
session writes, goal and history selection, keyboard focus, drag suppression, reduced motion, visual
pause, model failure, unavailable WebGL, and context loss. Registration, theme, and account
navigation checks remain in the smoke suite. Asset generation, dependency installation, builds, and
tests run in the prescribed remote environment.
