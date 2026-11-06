# Closed Circuit

The 50-second StudySprint trailer. It tells the charge model as a circuit: one
focused session sends current down a trace into the bolt, stepping away opens
the switch and the bolt drains, and coming back the next day closes it again.
By the end the whole board runs and the bolt sits at full charge.

The bolt is the landing page's sculpture (`design/charge-sculpture.py`) standing
on a circuit board rendered in Blender. The current, arcs, sparks and readouts
are drawn on a canvas over that render with the same camera, and the music is
`music/cue.py` with a synthesized electrical layer mixed under it.

## Picture map

| Time | Picture | Cue |
| --- | --- | --- |
| 0.0-6.5 | The switch closes, current runs to the bolt, the face fills to 12% | Pulse and arpeggio build |
| 6.5-8.0 | The switch opens, the picture browns out, the bolt drains to empty | Elements drop out |
| 8.0-14.0 | The open gap in a cold spot; two sparks try it at 13.0 and 13.5 s | The stall and the two vibraphone notes |
| 14.0-24.0 | An arc closes the gap, then MON to SUN ignite one beat apart | The pulse returns and gets denser |
| 24.0-36.0 | Crane over the board: 52 day pads light, readouts count up, arcs climb the casing | The surge; crash on 36.0 s |
| 36.0-44.0 | The bolt at 100%, pulsing on the bar, arcs crawling over its rim | Release |
| 44.0-50.0 | End card: an arc from the bolt powers "Charge up." left to right | Resolve and fade |

The readouts use the seeded demo account's totals (173 hours, 93 sessions, 52
days above empty). The charge curve follows the app's rules: one session from
empty nets 12%, idle days drain it, steady study refills it.

## Files

- `scene/board.py` is the single source for the board layout, shot list,
  charge curve, arc schedule and captions. Running it writes `scene/scene.json`
  and `js/scene-data.js`.
- `scene/blender_board.py` builds and animates the board, renders it, and
  writes `js/camera-data.js` (one view-projection matrix per frame).
- `scene/sfx.py` synthesizes the hum, crackle, clacks and zaps from
  `scene/scene.json`.
- `js/fx.js` draws the electrical layer; `js/composition.js` adds captions, the
  end card and the timeline.
- `mix-audio.sh` mixes `public/soundtrack.mp3` and runs the tests (build VM).
- `render.sh` renders the trailer with HyperFrames on the Mac GPU.

## Rebuilding

Blender and HyperFrames both need a GPU, so they run on the Mac. Render the
board and encode it:

```sh
python3 scene/board.py
OUT="$HOME/Library/Caches/blender-renders/study-sprint-trailer"
caffeinate -dimsu Blender -b --factory-startup -P scene/blender_board.py -- "$OUT" --glare Low --frames 0-1499
ffmpeg -framerate 30 -i "$OUT/frames/%04d.jpg" -c:v libx264 -crf 16 -preset slow -g 30 -keyint_min 30 -pix_fmt yuv420p -movflags +faststart public/board.mp4
```

Keep the one-second keyframe interval: HyperFrames seeks the board video every
frame, and sparse keyframes make it freeze or miss frames.

`--stills 3.0,11.0` renders single frames for look checks. A restarted render
skips frames it has already saved. Run `bash mix-audio.sh` on the build VM to mix
the soundtrack and run the tests, then `bash render.sh` on the Mac. The trailer
lands in `~/Library/Caches/hyperframes-renders/study-sprint/` unless `OUT` is
set.

Fonts are Inter and JetBrains Mono under the SIL Open Font License; the license
texts are in `public/fonts/`.
