"""Electrical sound layer for the trailer, rendered from scene/scene.json.

    python3 scene/sfx.py OUT.wav

Every sound is synthesized here from seeded noise and sine partials, timed to
the same arcs, switch moves and current as the picture. Standard library only.
"""

import json
import math
import random
import struct
import sys
import wave
from pathlib import Path

RATE = 48000
HERE = Path(__file__).resolve().parent
SCENE = json.loads((HERE / "scene.json").read_text())
T = SCENE["times"]
N = int(SCENE["duration"] * RATE)
out = [0.0] * N
rng = random.Random(1105)


def add(start, samples, gain=1.0):
    first = int(start * RATE)
    for index, value in enumerate(samples):
        position = first + index
        if 0 <= position < N:
            out[position] += value * gain


def envelope(length, attack, decay):
    n = int(length * RATE)
    return [min(1.0, i / max(1, attack * RATE)) * math.exp(-i / (decay * RATE)) for i in range(n)]


def noise(length, colour=0.0):
    """White noise, low-passed by `colour` (0 = white, 0.95 = dark)."""
    value = 0.0
    samples = []
    for _ in range(int(length * RATE)):
        value = colour * value + (1 - colour) * rng.uniform(-1, 1)
        samples.append(value)
    return samples


def highpass(samples, amount=0.97):
    previous_in = previous_out = 0.0
    result = []
    for value in samples:
        previous_out = amount * (previous_out + value - previous_in)
        previous_in = value
        result.append(previous_out)
    return result


def sweep(length, f0, f1, decay):
    phase = 0.0
    samples = []
    n = int(length * RATE)
    for i in range(n):
        u = i / n
        frequency = f0 * (f1 / f0) ** u
        phase += 2 * math.pi * frequency / RATE
        samples.append(math.sin(phase) * math.exp(-i / (decay * RATE)))
    return samples


def clack(at, gain=1.0):
    """Metal lever landing on its post."""
    n = int(0.06 * RATE)
    body = [math.sin(2 * math.pi * 2300 * i / RATE) * math.exp(-i / (0.012 * RATE)) for i in range(n)]
    thump = [math.sin(2 * math.pi * 170 * i / RATE) * math.exp(-i / (0.03 * RATE)) for i in range(n)]
    tick = [v * math.exp(-i / (0.002 * RATE)) for i, v in enumerate(noise(0.06))]
    add(at, [0.35 * a + 0.5 * b + 0.6 * c for a, b, c in zip(body, thump, tick)], gain)


def crackle(start, end, gain, rate=380.0):
    """Arc crackle: dense random snaps over a hiss bed."""
    length = end - start
    if length <= 0:
        return
    bed = highpass(noise(length, 0.2), 0.985)
    add(start, [v * 0.18 * (0.6 + 0.4 * math.sin(i / 900)) for i, v in enumerate(bed)], gain)
    t = start
    while t < end:
        t += rng.expovariate(rate * gain)
        snap_length = rng.uniform(0.0015, 0.006)
        snap = highpass(noise(snap_length, 0.1), 0.95)
        add(t, [v * math.exp(-i / (0.0012 * RATE)) for i, v in enumerate(snap)], gain * rng.uniform(0.3, 1.0))


def zap(at, length, gain, f0=1400, f1=90):
    burst = highpass(noise(length, 0.05), 0.9)
    env = envelope(length, 0.001, length / 3)
    add(at, [b * e for b, e in zip(burst, env)], 0.8 * gain)
    add(at, sweep(length * 1.6, f0, f1, length / 2.2), 0.45 * gain)


def boom(at, gain):
    add(at, sweep(0.9, 120, 38, 0.28), 0.9 * gain)


# Mains hum that follows the current reaching the socket.
flow = SCENE["flow"]
fps = SCENE["fps"]
phase = 0.0
smoothed = 0.0
for i in range(N):
    t = i / RATE
    frame = min(len(flow) - 1, int(t * fps))
    target = min(flow[frame], 2.5) / 2.5
    smoothed += (target - smoothed) * 0.0008
    if smoothed < 1e-4:
        continue
    phase += 2 * math.pi * 60 / RATE
    tone = (math.sin(phase) + 0.6 * math.sin(2 * phase) + 0.35 * math.sin(3 * phase) + 0.2 * math.sin(5 * phase)
            + 0.12 * math.sin(7 * phase))
    out[i] += 0.08 * smoothed * tone

# Switch moves.
clack(T["sessionOn"], 0.9)
clack(T["switchOpen"], 0.5)
add(T["switchOpen"], sweep(1.4, 420, 38, 0.6), 0.22)
clack(T["reconnect"] + 0.12, 1.0)

# Arcs.
for arc in SCENE["arcs"]:
    kind = arc["kind"]
    gain = arc["gain"]
    if kind == "tip":
        crackle(arc["start"], arc["end"], 0.3 * gain, rate=180)
    elif kind == "gap-try":
        crackle(arc["start"], arc["end"], 0.6 * gain)
    elif kind == "gap":
        zap(arc["start"], 0.4, 1.0)
        crackle(arc["start"], arc["end"] + 0.2, 1.0)
        boom(arc["start"], 0.8)
    elif kind == "terminal":
        zap(arc["start"], 0.12, 0.35, 2400, 300)
        crackle(arc["start"], arc["end"], 0.45)
    elif kind == "storm":
        crackle(arc["start"], arc["end"], 0.5)
    elif kind == "casing":
        crackle(arc["start"], arc["end"], 0.35 * gain)

zap(T["crash"], 0.7, 1.2, 2000, 60)
boom(T["crash"], 1.0)

# End card: the tagline powers up with a rising whine and lands on a snap.
wipe_start, wipe_end = T["end"] + 1.0, T["end"] + 1.9
n = int((wipe_end - wipe_start) * RATE)
phase = 0.0
whine = []
for i in range(n):
    u = i / n
    phase += 2 * math.pi * (300 * (8 ** u)) / RATE
    whine.append(math.sin(phase) * (u ** 1.5) * 0.5)
add(wipe_start, whine, 0.35)
crackle(T["end"] + 0.85, T["end"] + 1.05, 0.6)
zap(wipe_end, 0.25, 0.6, 2600, 400)

# Fixed gain with a soft clip, so one loud crash does not push everything else
# under the music.
GAIN = 1.15
peak = max(abs(v) for v in out) or 1.0
scale = GAIN
target = Path(sys.argv[1])
with wave.open(str(target), "wb") as handle:
    handle.setnchannels(1)
    handle.setsampwidth(2)
    handle.setframerate(RATE)
    handle.writeframes(b"".join(struct.pack("<h", int(0.89 * math.tanh(v * scale) * 32767)) for v in out))
print(f"SFX_DONE peak={peak:.3f} scale={scale:.3f} -> {target}")
