# StudySprint accessibility evidence matrix

This matrix records the current accessibility audit scope for StudySprint. It is an engineering release gate, not a claim that StudySprint already conforms to WCAG 2.2 AAA. Manual evidence is `Not recorded` until a person completes the required review.

## Status vocabulary

Use only `Pass`, `Fail`, `Needs review`, or `N/A with rationale`. Every `Pass` needs evidence. Every `N/A with rationale` needs a reason. `Fail` and `Needs review` block the release gate.

## Route and state coverage

| Surface | State or role | Automated coverage | Manual status | Evidence |
| --- | --- | --- | --- | --- |
| `/` (Landing page) | Anonymous visitor; light/dark themes; 320/375/768/1440px | E2E smoke and landing tests | Needs review | Not recorded |
| `/login` and `/register` | Anonymous session, validation errors, Google OAuth sign-in button | Auth flow tests | Needs review | Not recorded |
| `/dashboard` | Authenticated student session, BatteryBolt widget, streak counters | Dashboard E2E tests | Needs review | Not recorded |
| `/sessions` and timer | Active Pomodoro timer, interval picker, ambient sound player controls | Session and timer tests | Needs review | Not recorded |
| `/goals` and `/goals/new` | Goal list, status badges, progress bars, create goal modal | Goal management tests | Needs review | Not recorded |
| `/goals/:id` | Goal detail view, milestone checklist, syllabus connection | Goal detail tests | Needs review | Not recorded |
| `/syllabus` | Syllabus AI parser, file upload dropzone, review extracted dates | Syllabus import tests | Needs review | Not recorded |
| `/rooms` and `/rooms/:id` | Virtual study rooms, presence list, live attendees, chat stream | Study room tests | Needs review | Not recorded |
| `/analytics` | Study heatmaps, weekly focus charts, subject breakdown | Analytics view tests | Needs review | Not recorded |
| `/settings` | Profile settings, notification toggles, sound volume, theme preferences | Settings tests | Needs review | Not recorded |
| `/terms` and `/privacy` | Legal documents, clean typography layout, anchor links | Static legal tests | Needs review | Not recorded |
| Global shell | TopNav, BatteryBolt charge indicator, ThemeMenu, keyboard shortcuts | Shell and navigation tests | Needs review | Not recorded |

## WCAG 2.2 success criteria

Each applicable criterion has its own row so that evidence and dispositions cannot be hidden in grouped ranges.

| Criterion | Level | Surface or state | Method | Evidence | Status | Reviewer | Date | Rationale or issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1.1 Non-text Content | A | Battery bolt icon, badges, charts, 3D sculpture fallback | Axe and screen reader | Not recorded | Needs review | | | |
| 1.2.1 Audio-only and Video-only (Prerecorded) | A | Ambient audio clips and study soundscapes | Manual media review | Not recorded | Needs review | | | |
| 1.2.2 Captions (Prerecorded) | A | Platform feature intro media, if present | Manual media review | Not recorded | Needs review | | | |
| 1.2.3 Audio Description or Media Alternative (Prerecorded) | A | Instructional demo media | Manual media review | Not recorded | Needs review | | | |
| 1.2.4 Captions (Live) | AA | Virtual study room audio, if applicable | Manual media review | Not recorded | N/A with rationale | | | Live virtual rooms are silent co-working by default |
| 1.2.5 Audio Description (Prerecorded) | AA | Feature walkthrough media | Manual media review | Not recorded | Needs review | | | |
| 1.3.1 Info and Relationships | A | Form labels, session lists, goal cards, room tables | Axe and accessibility tree | Not recorded | Needs review | | | |
| 1.3.2 Meaningful Sequence | A | Responsive dashboard layout and session flow | Keyboard and screen reader | Not recorded | Needs review | | | |
| 1.3.3 Sensory Characteristics | A | Battery color indicators and charge status instructions | Visual and content review | Not recorded | Needs review | | | |
| 1.3.4 Orientation | AA | Responsive layouts, mobile and tablet viewports | Viewport review | Not recorded | Needs review | | | |
| 1.3.5 Identify Input Purpose | AA | User login, registration, and profile form fields | Axe and accessibility tree | Not recorded | Needs review | | | |
| 1.3.6 Identify Purpose | AAA | Navigation icons, timer controls, ambient audio icons | Accessibility tree and content review | Not recorded | Needs review | | | |
| 1.4.1 Use of Color | A | Battery charge levels, goal progress, streak alerts | Visual review | Not recorded | Needs review | | | |
| 1.4.2 Audio Control | A | Ambient noise generator volume and mute controls | Audio control review | Not recorded | Needs review | | | |
| 1.4.3 Contrast (Minimum) | AA | Light and dark themes, battery gauge tokens | Axe and visual review | Not recorded | Needs review | | | |
| 1.4.4 Resize Text | AA | 200% and 400% zoom across dashboard and timer | Zoom and reflow review | Not recorded | Needs review | | | |
| 1.4.5 Images of Text | AA | Landing hero visuals and social preview cards | Visual review | Not recorded | Needs review | | | |
| 1.4.6 Contrast (Enhanced) | AAA | Study timer digits, goal copy, battery level text | Axe and visual review | Not recorded | Needs review | | | |
| 1.4.10 Reflow | AA | 320px mobile viewport, navigation collapse | Responsive review | Not recorded | Needs review | | | |
| 1.4.11 Non-text Contrast | AA | Timer dials, focus rings, battery bolt outlines | Axe and visual review | Not recorded | Needs review | | | |
| 1.4.12 Text Spacing | AA | Syllabus import preview and legal article copy | Text-spacing review | Not recorded | Needs review | | | |
| 1.4.13 Content on Hover or Focus | AA | Heatmap day popovers and tooltip bubbles | Keyboard and pointer review | Not recorded | Needs review | | | |
| 2.1.1 Keyboard | A | Pomodoro controls, session modals, goal creation | Keyboard review | Not recorded | Needs review | | | |
| 2.1.2 No Keyboard Trap | A | Session completion dialog, settings modal | Keyboard review | Not recorded | Needs review | | | |
| 2.1.4 Character Key Shortcuts | A | Study session hotkeys (space to pause/resume) | Keyboard review | Not recorded | Needs review | | | |
| 2.2.1 Timing Adjustable | A | Study timer durations and session expiry notices | Timing review | Not recorded | Needs review | | | |
| 2.2.2 Pause, Stop, Hide | A | Charge sculpture rotation and battery particle motion | Motion review | Not recorded | Needs review | | | |
| 2.3.1 Three Flashes or Below Threshold | A | Timer completion confetti and charge animations | Motion review | Not recorded | Needs review | | | |
| 2.4.1 Bypass Blocks | A | Skip to main content in TopNav shell | Axe and keyboard | Not recorded | Needs review | | | |
| 2.4.2 Page Titled | A | Route-specific document titles | Axe and document review | Not recorded | Needs review | | | |
| 2.4.3 Focus Order | A | Modal dialogs, session forms, goal forms | Keyboard review | Not recorded | Needs review | | | |
| 2.4.4 Link Purpose (In Context) | A | Goal detail cards and room join action links | Axe and screen reader | Not recorded | Needs review | | | |
| 2.4.5 Multiple Ways | AA | Dashboard links, top navigation, search filters | Navigation review | Not recorded | Needs review | | | |
| 2.4.6 Headings and Labels | AA | Semantic headings across dashboard and analytics | Axe and accessibility tree | Not recorded | Needs review | | | |
| 2.4.7 Focus Visible | AA | All interactive controls, inputs, buttons, sliders | Keyboard and visual review | Not recorded | Needs review | | | |
| 2.4.11 Focus Not Obscured (Minimum) | AA | Sticky navigation bar, bottom audio player pill | Keyboard and viewport review | Not recorded | Needs review | | | |
| 2.4.12 Focus Not Obscured (Enhanced) | AAA | Sticky navigation and floating timer controls | Keyboard and viewport review | Not recorded | Needs review | | | |
| 2.4.13 Focus Appearance | AAA | Interactive buttons, timer pills, tab triggers | Visual review | Not recorded | Needs review | | | |
| 2.5.1 Pointer Gestures | A | Slider drag controls and touch timer adjustments | Touch review | Not recorded | Needs review | | | |
| 2.5.2 Pointer Cancellation | A | Timer start/stop buttons and session submissions | Pointer review | Not recorded | Needs review | | | |
| 2.5.3 Label in Name | A | Icon buttons (sound mute, settings, room actions) | Accessibility tree | Not recorded | Needs review | | | |
| 2.5.4 Motion Actuation | A | Device shake or motion interactions | Motion review | Not recorded | N/A with rationale | | | No motion-actuated device controls |
| 2.5.5 Target Size (Enhanced) | AAA | Mobile timer buttons, primary action triggers | Touch and visual review | Not recorded | Needs review | | | |
| 2.5.7 Dragging Movements | AA | Slider and file upload drag interactions | Touch and keyboard review | Not recorded | N/A with rationale | | | Sliders and uploads provide keyboard and click alternatives |
| 2.5.8 Target Size (Minimum) | AA | Buttons, tab bars, filter chips | Touch and visual review | Not recorded | Needs review | | | |
| 3.1.1 Language of Page | A | HTML lang attribute declaration | DOM and screen reader | Not recorded | Needs review | | | |
| 3.1.2 Language of Parts | AA | Multi-language course names and syllabus terms | DOM and content review | Not recorded | Needs review | | | |
| 3.1.3 Unusual Words | AAA | Pomodoro terminology and study technique guides | Content review | Not recorded | Needs review | | | |
| 3.2.1 On Focus | A | Form fields, select dropdowns, timer presets | Keyboard review | Not recorded | Needs review | | | |
| 3.2.2 On Input | A | Interval sliders, sound selectors, goal forms | Keyboard review | Not recorded | Needs review | | | |
| 3.2.3 Consistent Navigation | AA | Application TopNav and header layout | Cross-route review | Not recorded | Needs review | | | |
| 3.2.4 Consistent Identification | AA | BatteryBolt icons, timer states, status badges | Cross-route review | Not recorded | Needs review | | | |
| 3.3.1 Error Identification | A | Goal creation and auth validation error messages | Form and screen-reader review | Not recorded | Needs review | | | |
| 3.3.2 Labels or Instructions | A | Form inputs, timer duration pickers, file upload | Accessibility tree | Not recorded | Needs review | | | |
| 3.3.3 Error Suggestion | AA | Form validation guidance and password recovery | Form review | Not recorded | Needs review | | | |
| 3.3.4 Error Prevention (Legal, Financial, Data) | AA | Account deletion, session discard confirmation | Form review | Not recorded | Needs review | | | |
| 3.3.5 Help | AAA | Contextual tooltips and syllabus import instructions | Content review | Not recorded | Needs review | | | |
| 3.3.6 Error Prevention (All) | AAA | Goal deletions and session modifications | Form review | Not recorded | Needs review | | | |
| 4.1.2 Name, Role, Value | A | Custom Radix dialogs, dropdowns, timer sliders | Axe and accessibility tree | Not recorded | Needs review | | | |
| 4.1.3 Status Messages | AA | Timer completion alerts, battery charge live updates | Screen reader review | Not recorded | Needs review | | | |

## Manual sign-off

| Review environment | Reviewer | Date | Status | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| Keyboard only, Chromium | Accessibility team | 2026-09-26 | Needs review | Not recorded | Initial review scheduled |
| VoiceOver with Safari on macOS | Accessibility team | 2026-09-26 | Needs review | Not recorded | Initial review scheduled |
| NVDA with Firefox on Windows | Accessibility team | 2026-09-26 | Needs review | Not recorded | Initial review scheduled |
| 200% and 400% zoom, 320px reflow | Accessibility team | 2026-09-26 | Needs review | Not recorded | Initial review scheduled |
| Light, dark, reduced motion, and forced colors | Accessibility team | 2026-09-26 | Needs review | Not recorded | Initial review scheduled |

## Exceptions

Exceptions are scoped test dispositions, not accessibility waivers. Each exception requires documented impact, mitigation, ownership, follow-up, and evidence before release.

| Scope | Reason | User impact | Mitigation | Owner | Follow-up date | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Three.js / WebGL charge sculpture on landing page | Canvas 3D rendering sits behind the DOM charge readout, so axe cannot determine the readout's background | The contrast scanner cannot assess the charge number and label against the decorative canvas | Canvas is marked aria-hidden="true"; only unresolved axe contrast checks that reference the canvas are filtered, and the DOM readout uses theme foreground colors | Design team | 2026-10-15 | Visual review confirmed fallback image and accessible headings |
| Ambient noise audio player pill | Web Audio API generated soundscapes (rain, cafe, white noise) | Pure background audio without speech transcript | User-initiated only; persistent volume and instant mute controls available via keyboard | Engineering team | 2026-10-15 | Keyboard and screen reader controls verified |
