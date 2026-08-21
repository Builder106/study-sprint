# StudySprint design system

StudySprint combines focused study timing with a battery that charges from focused work and drains gradually when idle. The interface uses a clean monochromatic base paired with electric lime (`#ccff00`) for progress, active timers, and achievements.

## Design principles

1. **Focus first layout**
   The interface minimizes visual noise so students can concentrate on their work. Primary interactions like timer controls and goal selection take central visual priority. Supporting elements stay muted until hovered or activated.

2. **Visible charge feedback**
   Time logged converts into battery charge and experience points (XP). The battery fill changes continuously with a spring transition and gains a quiet pulse at high charge.

3. **High contrast theme balance**
   Light mode uses clean white cards over soft gray backgrounds. Dark mode uses deep dark backgrounds (`#0a0a0a` / `oklch(0.145 0 0)`) with subtle border outlines (`white/10`). Electric lime serves as the unified highlight color across both modes.

## Color architecture

### Core brand tokens

| Token | Hex / Value | Usage |
| --- | --- | --- |
| Primary dark | `#030213` | Main dark background in light mode text, brand elements |
| Electric lime | `#ccff00` | Signature accent for XP, level counters, charge, active tabs |
| Lime hover | `#b3e600` | Interactive hover state for electric lime buttons and links |
| Lime highlight | `#e5ff4d` | Foliage highlights and active glows |
| Lime ink | `#526d00` | Lime as *text* on a light surface. The brand limes are background fills; as foreground text on white they measure 1.18:1 (`#ccff00`) and 1.48:1 (`#b3e600`), well under the 4.5:1 AA floor. This one measures 5.92:1. Dark mode keeps `#ccff00`, which measures 16.85:1 on `#0a0a0a`. |

### Surface tokens (Light vs. Dark mode)

The app supports dynamic theme switching using OKLCH and standard CSS variables defined in `theme.css`.

| Token | Light mode | Dark mode | Application |
| --- | --- | --- | --- |
| `--background` | `#ffffff` | `oklch(0.145 0 0)` (`#0a0a0a`) | Page background |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Primary body text |
| `--card` | `#ffffff` | `oklch(0.145 0 0)` | Card containers |
| `--muted` | `#ececf0` | `oklch(0.269 0 0)` | Disabled states, empty slots |
| `--muted-foreground` | `#717182` | `oklch(0.708 0 0)` | Secondary labels, descriptions |
| `--border` | `rgba(0, 0, 0, 0.1)` | `oklch(0.269 0 0)` / `white/10` | Divider lines, card borders |
| `--destructive` | `#d4183d` | `oklch(0.396 0.141 25.723)` | Danger actions, delete buttons |

### Battery palette

The charge bolt fills from the bottom and interpolates across these stops:

| Charge | Color | Visual meaning |
| --- | --- | --- |
| 0% | `rgb(239, 68, 68)` | Depleted |
| 50% | `rgb(245, 158, 11)` | Recovering |
| 100% | `#ccff00` | Fully charged |

### Data visualization palette

Recharts charts use a 5-color categorical palette for subject time distributions:

- Chart 1: Warm amber / Indigo (`oklch(0.646 0.222 41.116)` / `oklch(0.488 0.243 264.376)`)
- Chart 2: Teal / Emerald (`oklch(0.6 0.118 184.704)` / `oklch(0.696 0.17 162.48)`)
- Chart 3: Deep blue / Bright lime (`oklch(0.398 0.07 227.392)` / `oklch(0.769 0.188 70.08)`)
- Chart 4: Yellow gold / Violet (`oklch(0.828 0.189 84.429)` / `oklch(0.627 0.265 303.9)`)
- Chart 5: Lime green / Rose (`oklch(0.769 0.188 70.08)` / `oklch(0.645 0.246 16.439)`)

## Typography and scale

StudySprint uses **Inter** for all UI typography, loaded via Google Fonts. Tabular numbers (`tabular-nums`) ensure timer digits and XP values stay visually aligned without shifting layout during countdowns.

### Type hierarchy

| Class / Level | Size | Weight | Tracking | Case | Application |
| --- | --- | --- | --- | --- | --- |
| `text-6xl` | 3.75rem (60px) | Medium (500) | `tracking-tighter` | Default | Level numbers, giant stat highlights |
| `text-4xl` / `text-5xl` | 2.25rem - 3rem | Medium (500) | `tracking-tighter` | Default | Main page headings |
| `text-2xl` | 1.5rem (24px) | Medium (500) | `tracking-tighter` | Default | Card titles, modal headers |
| `text-lg` | 1.125rem (18px) | Normal (400) | Normal | Default | Subtitles, intro body text |
| `text-base` | 1.0rem (16px) | Normal / Medium | Normal | Default | Body prose, inputs, button text |
| `text-xs` | 0.75rem (12px) | Bold (700) | `tracking-widest` | Uppercase | Category tags, badges, section headers |
| `text-[10px]` | 0.625rem (10px) | Bold (700) | `tracking-widest` | Uppercase | Stat box labels, metadata tags |

## Layout, radii, and grid

### Grid system

- Main content width: `max-w-5xl` (1024px) centered with `mx-auto`
- Horizontal padding: `px-8` (32px) on desktop, `px-4` on mobile
- Section spacing: `space-y-16` (64px) between main content blocks
- Component grid: 1 column on mobile, 2 columns on tablet (`md:grid-cols-2`), 3 columns on desktop (`lg:grid-cols-3`)

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

The central timer card displays the current mode (Stopwatch or Pomodoro), elapsed time, active goal title, and control buttons.

- Background: Card surface (`bg-white` or `dark:bg-[#0a0a0a]`) with `border border-zinc-200 dark:border-white/10`
- Timer display: `text-6xl font-medium tracking-tighter tabular-nums`
- Control actions: Primary action button styled with electric lime accent or solid fill, secondary controls using muted ghost icons

### Battery bolt

Renders a continuous 0% to 100% study charge within a centered 120px to 160px viewport.

- Fill changes use spring physics (`stiffness: 160`, `damping: 13`, `mass: 0.9`).
- At 80% or higher, the fill pulses gently. Reduced motion disables the pulse and uses instant changes.
- The SVG has `role="img"` and a label such as `Battery at 72% charge`.

### Stat boxes and achievement cards

- Unlocked achievements: `border-[#ccff00]/30 bg-[#ccff00]/5` with electric lime icon accent
- Locked achievements: `border-zinc-200 dark:border-white/10 opacity-50` with muted gray icon
- Stat counters: Uppercase `text-[10px] font-bold text-zinc-500 tracking-widest` label paired with `text-2xl font-medium tracking-tighter tabular-nums`

## Motion and interaction

StudySprint uses **Framer Motion** for React component animations:

- **Spring transitions**: Used for modal reveals, tab switches, and battery-fill changes (`type: "spring"`, `stiffness: 160`, `damping: 13`, `mass: 0.9`).
- **Battery pulse**: The battery fill uses a 2-second opacity loop at 80% charge or higher.
- **Hover micro-interactions**: Navigation arrows translate horizontally (`group-hover:-translate-x-1`), buttons scale slightly, link colors shift to electric lime.

## Accessibility guidelines

1. **Color contrast**: Text elements maintain high contrast against backgrounds in both light and dark modes. Electric lime (`#ccff00`) is paired with dark text when used as a background fill for legibility.
2. **Focus management**: Interactive elements use `outline-ring/50` for clear keyboard focus rings.
3. **Screen readers**: Battery SVGs include `role="img"` and descriptive `aria-label` tags (for example, `aria-label="Battery at 72% charge"`).
4. **Tabular numbers**: Numerical counters use `tabular-nums` so screen readers and layout engines process stat updates smoothly.
