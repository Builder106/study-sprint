# Original trailer music cue

Status: rendered from `music/cue.py` and in use. The trailer plays this cue.

## Composition

- Length: 50 s. Tempo: 120 BPM. Meter: 4/4, so one bar is 2 s and every
  picture beat in `scene/board.py` falls on a bar or a beat.
- Tonal center: A minor (Am, F, C, G), resolving to C(add9) on the end card.
- Idea: the pulse is the charge. It starts as a quarter-note tick, grows to
  eighths and then sixteenths as the battery fills, stops when the charge
  drains, and comes back on day two.
- Sound: a synth-bass pulse, a side-stick tick, a Rhodes arpeggio, a
  vibraphone, a soft square lead, a warm pad and a TR-808 kit. Everything comes
  from built-in LMMS sounds.

## Picture map

| Time | Picture beat | Music change |
| --- | --- | --- |
| 0.00-6.50 | The switch closes; current reaches the bolt, 12% | Tick and bass pulse from the first beat. The arpeggio and hats enter at 2 s, the kick at 4 s. |
| 6.50-8.00 | The switch opens and the bolt drains | Hats and kick drop out, then the arpeggio at 7 s. |
| 8.00-14.00 | The open gap | The stall. A pad, one low tick a bar, and a slow heartbeat kick in the bar from 10 s, the emptiest point. Two vibraphone notes (E4, A4) at 13.0 s lean toward day two. |
| 14.00-24.00 | The arc closes the gap; MON to SUN ignite, 44% | The pulse returns at 14 s. Eighths from 16 s, a clap and hats from 20 s, denser every bar. |
| 24.00-36.00 | The whole board and the readouts | The surge: four-on-the-floor kick, clap, sixteenth arpeggio, a vibraphone melody and a doubling square lead from 32 s. A clap build and a crash on 36.00 s. |
| 36.00-44.00 | The bolt at 100% | Release. Drums leave except a soft kick. A warm pad, a quiet arpeggio and a slow vibraphone line, moving through C, G and Am to a G chord before the end. |
| 44.00-50.00 | End card | Resolve to C(add9) on the bar line, hold, fade from 48.00 s. |

## Mix and export

`lmms-cue render` writes `cue.wav` (48 kHz), `cue.mp3` and `cue.report.json` at
-17 LUFS and -2 dBTP. A master limiter in `cue.py` keeps LMMS from clipping its
16-bit output and lets the loudness pass stay linear, so the stall stays
quieter than the surge. `preview-new-cue.mp4` is the trailer with this cue.

In use: `render.sh` mixes `music/cue.wav` with the electrical layer from
`scene/sfx.py` into `public/soundtrack.mp3`. The cue's own fade covers the
end; the composition adds no volume changes.
