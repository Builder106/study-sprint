"""StudySprint trailer cue (The Interval), composed from ORIGINAL-CUE.md.

Render with `lmms-cue render music/cue.py` (see SankofaForge/lmms-cue).
120 BPM in 4/4, so one bar is 2 s and the 50 s trailer is 25 bars.
Key: A minor, resolving to C major on the end card.
"""

from lmms_cue import Song, effect, reverb, sf2

BPM = 120
song = Song(bpm=BPM, length=50.0, fade_out=(48.0, 50.0),
            master_fx=[
                reverb(size=0.7, color=7000, wet=0.2),
                # A limiter keeps the surge's peaks down so the render's loudness
                # normalisation stays linear and the quiet stall stays quiet.
                effect("compressor", "CompressorControls", threshold=-17, ratio=20, attack=0.5,
                       release=120, knee=2, lookahead=1, lookaheadLength=5, peakmode=1, limiter=1),
            ])


def at(seconds: float, grid: float = 1.0) -> float:
    """Beat nearest a picture time, on a grid of `grid` beats."""
    return round(song.beat(seconds) / grid) * grid


# GM drum keys on the TR-808 kit.
KICK, SIDE_STICK, CLAP, HAT, OPEN_HAT, CRASH = 36, 37, 39, 42, 46, 49

drums = song.track("Drums", sf2(25, bank=128, gain=3), volume=90)
pulse = song.track("Pulse bass", sf2(38, gain=3), volume=80)
arp = song.track("Arp", sf2(4, gain=3), volume=58, pan=-20)
vibes = song.track("Vibraphone", sf2(11, gain=3), volume=70, pan=20)
lead = song.track("Square lead", sf2(80, gain=2), volume=38, pan=25)
pad = song.track("Pad", sf2(89, gain=3), volume=60)

# Picture beats, in seconds: B1 0, B2 6.5, B3 14, B4 24, B5 35.5, B6 43.
# Bar n (0-based) starts at 2n seconds, so B3 is bar 7 and B4 is bar 12.
PROG = ["Am", "F", "C", "G"]
ROOT = {"Am": "A2", "F": "F2", "C": "C3", "G": "G2"}
PAD = {"Am": ["A2", "E3", "C4"], "F": ["F2", "C3", "A3"], "C": ["C3", "G3", "E4"],
       "G": ["G2", "D3", "B3"]}
ARP = {"Am": ["A3", "C4", "E4", "A4"], "F": ["F3", "A3", "C4", "F4"],
       "C": ["C4", "E4", "G4", "C5"], "G": ["G3", "B3", "D4", "G4"]}
MELODY = {"Am": ["E5", "C5", "A4"], "F": ["C5", "A4", "F4"], "C": ["G5", "E5", "C5"],
          "G": ["D5", "B4", "G4"]}


def chord_of(bar: int) -> str:
    if bar == 21:
        return "G"  # lead into the C of the end card
    return PROG[bar % 4]


def shift(note: str, octaves: int) -> str:
    return note[:-1] + str(int(note[-1]) + octaves)


STALL_START, STALL_END = at(8.0), at(14.0)  # bars 4-6: the grid drains to empty
SURGE = at(24.0)  # B4
RELEASE = at(36.0)  # B5
END_CARD = at(44.0)  # resolve here
END_BEAT = song.beat(50.0)

TOTAL_STEPS = int(song.beat(50.0) * 4)

for i in range(TOTAL_STEPS):
    b = i / 4
    t = b * 0.5
    bar = int(b // 4)
    chord = chord_of(bar)
    root = ROOT[chord]
    step = i % 16
    on_beat = i % 4 == 0
    eighth = i % 2 == 0
    off_eighth = i % 4 == 2
    arp_note = ARP[chord][(i // 2) % 4]

    if b < at(6.5):
        # B1, One session: a quarter-note pulse grows to eighths as the charge climbs.
        if on_beat:
            drums.note(b, 0.1, SIDE_STICK, 60)
            pulse.note(b, 0.4, root, 62 + 3 * min(bar, 3))
        if bar >= 1 and eighth:
            arp.note(b, 0.4, arp_note, 36 + 7 * bar)
        if bar >= 2 and on_beat:
            drums.note(b, 0.2, KICK, 64)
        if bar >= 1 and off_eighth:
            drums.note(b, 0.1, HAT, 40)

    elif b < STALL_START:
        # B2 begins: the charge drains. Elements drop out one at a time.
        if on_beat and int(b) % 2 == 0:
            drums.note(b, 0.1, SIDE_STICK, 46)
            pulse.note(b, 1.2, root, 50)
        if b < at(7.0) and eighth:
            arp.note(b, 0.4, arp_note, 36)

    elif b < STALL_END:
        # "Most people stop here.": one low tick a bar and the pad, then a slow heartbeat.
        if step == 0:
            drums.note(b, 0.1, SIDE_STICK, 36)
        if bar == 5 and step in (0, 8):
            drums.note(b, 0.3, KICK, 34)

    elif b < SURGE:
        # B3: day two. The pulse comes back and gets denser every two bars.
        phase = bar - 7  # 0..4
        if on_beat:
            drums.note(b, 0.1, SIDE_STICK, 52)
            pulse.note(b, 0.4 if phase >= 1 else 1.0, root, 56 + 3 * phase)
            if phase >= 0:
                drums.note(b, 0.2, KICK, 58 + 4 * phase)
        if phase >= 1 and off_eighth:
            pulse.note(b, 0.4, root, 52 + 3 * phase)
        if phase >= 1 and eighth:
            arp.note(b, 0.4, arp_note, 36 + 3 * phase)
        if phase >= 3:
            if not eighth:
                arp.note(b, 0.2, arp_note, 42)
            if off_eighth:
                drums.note(b, 0.1, HAT, 44)
            if step in (4, 12):
                drums.note(b, 0.2, CLAP, 56)

    elif b < RELEASE:
        # B4: the metric surge. Full groove, sixteenth arpeggio, melody on top.
        late = bar >= 16
        if on_beat:
            drums.note(b, 0.2, KICK, 92 + (8 if late else 0))
        if step in (4, 12):
            drums.note(b, 0.3, CLAP, 82)
        if eighth:
            drums.note(b, 0.1, HAT, 50 if on_beat else 40)
            pulse.note(b, 0.45, root if i % 8 != 6 else shift(root, 1), 74)
        elif i % 2 == 1:
            drums.note(b, 0.08, HAT, 28)
        arp.note(b, 0.2, arp_note, 60 + (8 if late else 0))
        if step == 14:
            drums.note(b, 0.3, OPEN_HAT, 52)
        if late and eighth:
            lead.note(b, 0.4, shift(arp_note, 1), 54)

    elif b < END_CARD:
        # B5: release. The meter is full and pulsing; drums leave except a soft kick.
        if on_beat:
            pulse.note(b, 0.5, root, 62)
            drums.note(b, 0.1, SIDE_STICK, 44)
        if step in (0, 8):
            drums.note(b, 0.25, KICK, 46)
        if eighth:
            arp.note(b, 0.5, arp_note, 52)

# Pad: under the intro bars, the stall (the only warmth there), the release and end card.
for bar in range(0, 25):
    start = bar * 4
    chord = chord_of(bar)
    if bar < 2:
        pad.chord(start, 4, PAD[chord], 34)
    elif 2 <= bar < 4:
        pad.chord(start, 4, PAD[chord], 40)
    elif 4 <= bar < 7:
        pad.chord(start, 4, PAD[chord], 50 + (12 if bar == 6 else 0))
    elif 7 <= bar < 12:
        pad.chord(start, 4, PAD[chord], 36 + 3 * (bar - 7))
    elif 12 <= bar < 18:
        pad.chord(start, 4, PAD[chord], 52)
    elif 18 <= bar < 22:
        pad.chord(start, 4, PAD[chord], 66)

# Vibraphone: a rising Am triad answered in the stall (13.25 s), then the melody in the surge.
vibes.chord(at(13.0), 1, ["E4"], 56)
vibes.chord(at(13.5), 2, ["A4"], 60)
for bar in range(12, 18):
    start = bar * 4
    notes = MELODY[chord_of(bar)]
    vibes.note(start, 1, notes[0], 66 + 2 * (bar - 12))
    vibes.note(start + 1.5, 0.5, notes[1], 62 + 2 * (bar - 12))
    vibes.note(start + 2, 2, notes[2], 66 + 2 * (bar - 12))

# B5: the melody opens out in long notes.
for bar, notes in [(18, ["E5", "G5"]), (19, ["D5", "B4"]), (20, ["C5", "E5"]), (21, ["D5", "G5"])]:
    start = bar * 4
    vibes.note(start, 2, notes[0], 66)
    vibes.note(start + 2, 2, notes[1], 62)

# Peak of the surge: a snare-less build in the last bar, then the crash on the release.
for step in range(8):
    drums.note(RELEASE - 2 + step * 0.25, 0.2, CLAP, 50 + step * 9)
drums.note(RELEASE, 2, CRASH, 100)

# End card: resolve to C(add9) on the bar line, hold to the fade at 48 s.
drums.note(END_CARD, 0.3, KICK, 70)
pulse.note(END_CARD, END_BEAT - END_CARD, "C2", 78)
pad.chord(END_CARD, END_BEAT - END_CARD, ["C3", "G3", "E4", "D4"], 80)
vibes.note(END_CARD, 4, "E5", 82)
vibes.note(END_CARD + 2, 4, "G5", 78)
vibes.note(END_CARD + 4, 8, "C6", 72)
arp.chord(END_CARD, 8, ["G4", "C5"], 44)
for step, note in enumerate(["C4", "E4", "G4", "D5", "G4", "E4", "C4", "D4"]):
    arp.note(END_CARD + 8 + step, 1, note, 46)
