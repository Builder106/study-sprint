"""Single source for the trailer's circuit board, timing and camera.

Blender (`scene/blender_board.py`) imports this module to build and animate the
board. Running it directly writes `js/scene-data.js` for the HyperFrames overlay
and `scene/scene.json` for the sound layer, so the picture, the light and the
sound all read the same layout and times.

Units are Blender metres. The board lies in the XY plane at z = 0, +Y points
away from the hero camera and the bolt stands upright at the origin facing -Y.
The cue is 120 BPM, so a bar is 2 s.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

FPS = 30
DURATION = 50.0
FRAMES = int(DURATION * FPS)
WIDTH, HEIGHT = 1920, 1080

# --- The bolt -------------------------------------------------------------
# Same outline and scales as design/charge-sculpture.py, lifted so the lower
# tip hovers over the charge socket.
OUTLINE = [(69, 21), (36, 66), (58.5, 66), (51, 99), (84, 54), (61.5, 54)]
BOLT_Z = 1.95
CASING_SCALE, INSET_SCALE, FACE_SCALE = 1.08, 1.02, 0.96
CASING_Y = (-0.06, 0.32)
INSET_Y = (-0.14, -0.04)
FACE_Y = (-0.23, -0.12)


def outline_local(scale: float) -> list[tuple[float, float]]:
    return [((x - 60) / 24 * scale, (60 - z) / 24 * scale) for x, z in OUTLINE]


CASING = outline_local(CASING_SCALE)
FACE_HALF_HEIGHT = 39 / 24 * FACE_SCALE
TIP = (CASING[3][0], 0.0, BOLT_Z + CASING[3][1])
SOCKET = (TIP[0], 0.0)

# --- Board layout ------------------------------------------------------------
TRACE_W = 0.16
CHIP = {"center": (-16.0, 0.0), "size": (3.0, 3.0), "label": "U1 FOCUS"}
SWITCH_A = (-9.4, 0.0)
SWITCH_B = (-8.5, 0.0)
WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
WEEK_ROW_Y = -6.0
WEEK_X = [-9.0 + 3.0 * i for i in range(7)]
GRID_COLS, GRID_ROWS = 8, 7
GRID_X = [-10.5 + 3.0 * c for c in range(GRID_COLS)]
GRID_Y = [5.0 + 1.9 * r for r in range(GRID_ROWS)]
SPINE_Y = 3.0
DAYS_ABOVE_EMPTY = 52  # seeded demo account, see JOURNAL 2026-10-19
STATS = {"hours": 173, "sessions": 93, "days": DAYS_ABOVE_EMPTY}


def week_trace(i: int) -> list[tuple[float, float]]:
    """Terminal i to the socket: north, east or west, 45 degrees, north."""
    x = WEEK_X[i]
    lane = SOCKET[0] + (i - 3) * 0.3
    if i == 3:
        return [(x, WEEK_ROW_Y + 0.6), (x, -2.4), (lane, -2.0), (lane, -0.55)]
    # Far terminals turn later, so no vertical crosses another horizontal.
    turn_y = -3.0 - 0.45 * (3 - abs(i - 3))
    d = 0.6
    sign = 1 if x < lane else -1
    return [
        (x, WEEK_ROW_Y + 0.6),
        (x, turn_y),
        (lane - sign * d, turn_y),
        (lane, turn_y + d),
        (lane, -1.2),
        (SOCKET[0] + (i - 3) * 0.08, -0.55),
    ]


def grid_column_trace(c: int) -> list[tuple[float, float]]:
    x = GRID_X[c] + 0.7
    return [(x, GRID_Y[-1]), (x, SPINE_Y + 0.6), (x - 0.6 if x > 0 else x + 0.6, SPINE_Y)]


def spine_traces() -> list[list[tuple[float, float]]]:
    west = [(GRID_X[0] + 1.3, SPINE_Y), (SOCKET[0] - 0.9, SPINE_Y), (SOCKET[0], SPINE_Y - 0.9), (SOCKET[0], 0.55)]
    east = [(GRID_X[-1] + 0.1, SPINE_Y), (SOCKET[0] + 0.9, SPINE_Y), (SOCKET[0], SPINE_Y - 0.9)]
    return [west, east]


def grid_pads() -> list[dict]:
    """Day pads in study order: week by week, Monday first."""
    pads = []
    for c in range(GRID_COLS):
        for r in range(GRID_ROWS):
            pads.append({"x": GRID_X[c], "y": GRID_Y[GRID_ROWS - 1 - r], "col": c, "row": r})
    for index, pad in enumerate(pads):
        pad["lit"] = index < DAYS_ABOVE_EMPTY
        pad["index"] = index
    return pads


TRACES = (
    [{"id": "session-in", "points": [(CHIP["center"][0] + 1.6, 0.0), SWITCH_A], "group": "session"},
     {"id": "session-out", "points": [SWITCH_B, (SOCKET[0] - 0.55, 0.0)], "group": "session"}]
    + [{"id": f"week-{i}", "points": week_trace(i), "group": "week", "day": i} for i in range(7)]
    + [{"id": f"col-{c}", "points": grid_column_trace(c), "group": "grid", "col": c} for c in range(GRID_COLS)]
    + [{"id": f"spine-{k}", "points": p, "group": "spine"} for k, p in enumerate(spine_traces())]
)

LABELS = [
    {"text": "U1  FOCUS", "x": CHIP["center"][0] - 1.5, "y": -2.3, "size": 0.42},
    {"text": "SW1", "x": SWITCH_A[0] - 0.2, "y": -1.0, "size": 0.38},
    {"text": "J1  CHARGE", "x": SOCKET[0] + 0.9, "y": -0.95, "size": 0.34},
    {"text": "+20/DAY MAX   -8/DAY IDLE", "x": 2.2, "y": -1.7, "size": 0.3},
    {"text": "STUDYSPRINT  REV 2", "x": -24.0, "y": -14.0, "size": 0.55},
] + [
    {"text": day, "x": WEEK_X[i] - 0.45, "y": WEEK_ROW_Y - 1.25, "size": 0.42} for i, day in enumerate(WEEKDAYS)
] + [
    {"text": f"W{c + 1}", "x": GRID_X[c] - 0.3, "y": GRID_Y[-1] + 1.1, "size": 0.36} for c in range(GRID_COLS)
]

# Readouts sit in the board's free east wing, lit only during the surge.
READOUT_ZONE = (12.5, 24.0, -8.0, 4.0)
READOUTS = [
    {"id": "hours", "x": 11.6, "y": 1.2, "size": 2.0, "label": "HOURS STUDIED"},
    {"id": "sessions", "x": 11.6, "y": -2.6, "size": 2.0, "label": "SESSIONS"},
    {"id": "days", "x": 11.6, "y": -6.4, "size": 2.0, "label": "DAYS ABOVE EMPTY"},
]

# --- Timing --------------------------------------------------------------------
T_SESSION_ON = 1.0
T_CURRENT_AT_TIP = 4.4
T_TIMER_END = 6.2
T_SWITCH_OPEN = 6.5
T_DEAD = 7.9
T_STALL = 8.0
T_TRY = (13.0, 13.5)
T_RECONNECT = 14.0
T_WEEK = 15.0
T_DAYS = [16.0, 17.0, 18.0, 19.0, 20.0, 21.0, 22.0]
T_SURGE = 24.0
T_GRID_START, T_GRID_END = 24.5, 34.0
T_CRASH = 36.0
T_END = 44.0


def lerp(a, b, u):
    return a + (b - a) * u


def clamp01(u):
    return max(0.0, min(1.0, u))


def smooth(u):
    u = clamp01(u)
    return u * u * (3 - 2 * u)


def ease_in_out_sine(u):
    return -(math.cos(math.pi * clamp01(u)) - 1) / 2


def keys_at(t: float, keys: list[tuple[float, float]]) -> float:
    if t <= keys[0][0]:
        return keys[0][1]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t <= t1:
            return v0 if t1 == t0 else lerp(v0, v1, smooth((t - t0) / (t1 - t0)))
    return keys[-1][1]


def grid_pad_time(index: int) -> float:
    return T_GRID_START + (T_GRID_END - T_GRID_START) * index / (DAYS_ABOVE_EMPTY - 1)


# The app's model: one session from empty nets +12, idle days drain it, and
# steady study refills it. Day two adds a partial session per terminal.
CHARGE_KEYS = (
    [(0.0, 0.0), (T_CURRENT_AT_TIP, 0.0), (T_TIMER_END, 12.0), (T_SWITCH_OPEN, 12.0), (T_DEAD, 0.0),
     (T_RECONNECT + 0.5, 0.0)]
    + [k for i, t in enumerate(T_DAYS) for k in ((t + 0.15, 6.0 * i + 2.0), (t + 0.85, 6.0 * (i + 1) + 2.0))]
    + [(T_GRID_START, 44.0), (T_CRASH - 0.3, 100.0), (DURATION, 100.0)]
)


def charge_at(t: float) -> float:
    return keys_at(t, CHARGE_KEYS)


def pulse_at(t: float) -> float:
    """The app's 2 s pulse above 80%, on the bar line."""
    if charge_at(t) < 80:
        return 1.0
    return 0.86 + 0.14 * math.cos(2 * math.pi * (t - T_CRASH) / 2)


def lever_at(t: float) -> float:
    """Switch lever angle in degrees: 0 is closed, 38 is open."""
    open_angle = 38.0
    if t < T_SESSION_ON - 0.25:
        return open_angle
    if t < T_SESSION_ON:
        return open_angle * (1 - ((t - (T_SESSION_ON - 0.25)) / 0.25) ** 2)
    if t < T_SWITCH_OPEN:
        return 0.0
    if t < T_SWITCH_OPEN + 0.35:
        return open_angle * smooth((t - T_SWITCH_OPEN) / 0.35)
    if t < T_RECONNECT:
        return open_angle
    if t < T_RECONNECT + 0.12:
        return open_angle * (1 - ((t - T_RECONNECT) / 0.12) ** 2)
    return 0.0


def session_flow_at(t: float) -> float:
    """How much current the session circuit carries, 0 to 1."""
    if t < T_SESSION_ON:
        return 0.0
    if t < T_SWITCH_OPEN:
        return 1.0
    if t < T_DEAD:
        u = (t - T_SWITCH_OPEN) / (T_DEAD - T_SWITCH_OPEN)
        flicker = 0.5 + 0.5 * math.sin(97 * t) * math.sin(41 * t)
        return max(0.0, (1 - u) ** 1.6 * (0.55 + 0.45 * flicker))
    if t < T_RECONNECT:
        return 0.0
    return 1.0 if t < T_END else 0.0


def total_flow_at(t: float) -> float:
    """All current reaching the socket, used for the socket light and hum."""
    # The first session's current only reaches the socket at T_CURRENT_AT_TIP.
    arrival = smooth((t - (T_CURRENT_AT_TIP - 0.3)) / 0.3) if t < T_RECONNECT else 1.0
    flow = session_flow_at(t) * arrival
    flow += sum(0.25 * smooth((t - d) / 0.6) for d in T_DAYS)
    if t >= T_GRID_START:
        flow += 1.6 * smooth((t - T_GRID_START) / (T_GRID_END - T_GRID_START))
    if t >= T_END:
        return 0.0
    return flow


# --- Camera ------------------------------------------------------------------------
def look(loc, target, lens, focus, fstop):
    return {"loc": loc, "target": target, "lens": lens, "focus": focus, "fstop": fstop}


def dist(a, b):
    return math.dist(a, b)


def keys3(t: float, keys: list) -> tuple:
    return tuple(keys_at(t, [(k[0], k[1][i]) for k in keys]) for i in range(3))


SHOT_A = [(0.0, (-10.5, -2.3, 2.8), (-8.95, 0.0, 0.12)),
          (1.6, (-10.0, -1.7, 2.05), (-8.95, 0.0, 0.12)),
          (3.0, (-8.4, -4.0, 1.25), (-4.6, 0.0, 0.35)),
          (4.6, (-4.7, -6.5, 1.45), (-0.4, 0.0, 1.5)),
          (8.0, (-3.9, -7.1, 1.8), (-0.3, 0.0, 1.75))]


def camera_at(t: float) -> dict:
    v3 = lambda a, b, u: tuple(lerp(x, y, u) for x, y in zip(a, b))
    bolt = (0.0, 0.0, BOLT_Z)
    switch = (lerp(SWITCH_A[0], SWITCH_B[0], 0.5), 0.0, 0.2)
    if t < T_STALL:
        # A: overhead on the switch as it closes, then follow the current to the bolt.
        loc = keys3(t, [(k[0], k[1]) for k in SHOT_A])
        target = keys3(t, [(k[0], k[2]) for k in SHOT_A])
        lens = keys_at(t, [(1.6, 34.0), (4.6, 32.0)])
        return look(loc, target, lens, dist(loc, target), keys_at(t, [(1.6, 2.2), (4.6, 3.2)]))
    if t < T_WEEK:
        # B: the open gap in profile, low and close.
        u = ease_in_out_sine((t - T_STALL) / (T_WEEK - T_STALL))
        loc = v3((-9.55, -3.5, 0.7), (-9.2, -2.55, 0.5), u)
        target = (switch[0] + 0.05, 0.0, 0.24)
        return look(loc, target, 45.0, dist(loc, target), 2.0)
    if t < T_SURGE:
        # C: tracking the weekday terminals as they ignite.
        tx = max(-12.5, min(12.5, -9.0 + 3.0 * (t - T_DAYS[0])))
        loc = (tx - 2.0, -12.2, 2.6)
        target = (tx + 0.4, -4.2, 0.85)
        return look(loc, target, 34.0, dist(loc, (tx, WEEK_ROW_Y, 0.0)), 4.0)
    if t < T_CRASH:
        # D: crane over the board, pushing in harder as the clap builds.
        u = (t - T_SURGE) / (T_CRASH - T_SURGE)
        u = 0.7 * u + 0.3 * u ** 3
        loc = v3((2.0, -27.0, 20.0), (0.6, -15.0, 8.8), u)
        target = v3((2.0, 2.5, 0.0), (0.2, 0.6, 1.6), u)
        return look(loc, target, 30.0, dist(loc, bolt), 11.0)
    if t < T_END:
        # E: the full bolt, orbiting slowly at its own height.
        u = (t - T_CRASH) / (T_END - T_CRASH)
        angle = math.radians(lerp(-114.0, -72.0, ease_in_out_sine(u)))
        radius = lerp(15.5, 13.6, u)
        height = lerp(1.2, 2.1, u)
        loc = (radius * math.cos(angle), radius * math.sin(angle), height)
        return look(loc, (0.0, 0.0, 1.9), 55.0, radius, 3.2)
    # F: end card. The board is hidden; the bolt sits above the wordmark.
    u = (t - T_END) / (DURATION - T_END)
    angle = math.radians(lerp(-97.0, -84.0, ease_in_out_sine(u)))
    loc = (40.0 * math.cos(angle), 40.0 * math.sin(angle), -1.6)
    return look(loc, (0.0, 0.0, -1.6), 58.0, 40.0, 16.0)


def mood_at(t: float) -> float:
    """Ambient light multiplier: the stall is the darkest point."""
    return keys_at(t, [(0, 0.8), (T_SWITCH_OPEN, 0.8), (T_STALL, 0.38), (T_RECONNECT, 0.38),
                       (T_RECONNECT + 0.6, 0.85), (T_SURGE, 1.0), (T_CRASH, 1.15), (T_END - 0.01, 1.0),
                       (T_END, 0.0), (DURATION, 0.0)])


# --- Arcs and sparks ------------------------------------------------------------
def schedule() -> dict:
    rng = random.Random(20261105)
    arcs = []
    # The socket arc carries current up into the tip whenever the circuit is closed.
    arcs.append({"kind": "tip", "start": T_CURRENT_AT_TIP, "end": T_SWITCH_OPEN + 0.5, "gain": 0.7})
    arcs.append({"kind": "tip", "start": T_RECONNECT + 0.35, "end": T_END, "gain": 1.0})
    # Two sparks try the gap with the vibraphone, then one arc closes it.
    arcs.append({"kind": "gap-try", "start": T_TRY[0], "end": T_TRY[0] + 0.16, "gain": 0.45, "reach": 0.45})
    arcs.append({"kind": "gap-try", "start": T_TRY[1], "end": T_TRY[1] + 0.2, "gain": 0.6, "reach": 0.7})
    arcs.append({"kind": "gap", "start": T_RECONNECT - 0.06, "end": T_RECONNECT + 0.32, "gain": 1.6})
    for i, t in enumerate(T_DAYS):
        arcs.append({"kind": "terminal", "start": t, "end": t + 0.22, "gain": 0.8, "day": i})
    # The surge climbs onto the casing in the last two bars.
    t = T_CRASH - 4.0
    while t < T_CRASH - 0.1:
        span = rng.uniform(0.12, 0.22)
        arcs.append({"kind": "casing", "start": round(t, 3), "end": round(t + span, 3), "gain": 0.7,
                     "seed": rng.randrange(1 << 30)})
        t += lerp(0.55, 0.12, (t - (T_CRASH - 4.0)) / 4.0)
    for k in range(9):
        arcs.append({"kind": "storm", "start": T_CRASH + 0.02 * k, "end": T_CRASH + 0.5 + 0.05 * k, "gain": 1.4,
                     "seed": rng.randrange(1 << 30)})
    # Full charge: arcs crawl along the casing, like the landing page idle.
    t = T_CRASH + 1.1
    while t < DURATION - 1.5:
        if not (T_END - 0.6 < t < T_END + 1.4):
            span = rng.uniform(0.18, 0.34)
            arcs.append({"kind": "casing", "start": round(t, 3), "end": round(t + span, 3), "gain": 0.55,
                         "seed": rng.randrange(1 << 30)})
        t += rng.uniform(0.55, 1.1)
    bursts = [{"at": "switch", "t": T_SESSION_ON, "n": 14, "gain": 0.6},
              {"at": "gap", "t": T_RECONNECT, "n": 40, "gain": 1.4}]
    bursts += [{"at": f"week-{i}", "t": t, "n": 16, "gain": 0.7} for i, t in enumerate(T_DAYS)]
    bursts += [{"at": "tip", "t": T_CRASH, "n": 70, "gain": 1.6}]
    return {"arcs": arcs, "bursts": bursts}


SCHEDULE = schedule()

CAPTIONS = [
    {"text": "Every focused minute charges the bolt.", "start": 1.4, "end": 6.3},
    {"text": "Step away and it drains.", "start": 6.7, "end": 9.4},
    {"text": "Most people never close the circuit again.", "start": 9.8, "end": 13.7},
    {"text": "Come back tomorrow and close it.", "start": 15.2, "end": 19.4},
    {"text": "Every day you study feeds the same charge.", "start": 19.9, "end": 23.6},
    {"text": "Stay above empty and it never goes dark.", "start": 37.0, "end": 43.4},
]


def scene_data() -> dict:
    return {
        "fps": FPS, "duration": DURATION, "width": WIDTH, "height": HEIGHT,
        "bolt": {"z": BOLT_Z, "casing": CASING, "casingY": CASING_Y, "faceY": FACE_Y, "tip": TIP},
        "socket": SOCKET, "switchA": SWITCH_A, "switchB": SWITCH_B, "chip": CHIP,
        "weekX": WEEK_X, "weekRowY": WEEK_ROW_Y, "weekdays": WEEKDAYS,
        "traces": TRACES, "traceWidth": TRACE_W,
        "gridPads": [dict(p, t=grid_pad_time(p["index"]) if p["lit"] else None) for p in grid_pads()],
        "readouts": READOUTS, "stats": STATS,
        "times": {"sessionOn": T_SESSION_ON, "currentAtTip": T_CURRENT_AT_TIP, "timerEnd": T_TIMER_END, "switchOpen": T_SWITCH_OPEN,
                  "dead": T_DEAD, "stall": T_STALL, "reconnect": T_RECONNECT, "week": T_WEEK,
                  "days": T_DAYS, "surge": T_SURGE, "gridStart": T_GRID_START, "gridEnd": T_GRID_END,
                  "crash": T_CRASH, "end": T_END},
        "charge": CHARGE_KEYS,
        "captions": CAPTIONS,
        **SCHEDULE,
    }


def main() -> None:
    here = Path(__file__).resolve().parent
    data = scene_data()
    data["flow"] = [round(total_flow_at(f / FPS), 4) for f in range(FRAMES)]
    data["sessionFlow"] = [round(session_flow_at(f / FPS), 4) for f in range(FRAMES)]
    text = json.dumps(data, separators=(",", ":"))
    (here / "scene.json").write_text(text + "\n")
    (here.parent / "js" / "scene-data.js").write_text(
        "// Generated by scene/board.py. Do not edit by hand.\nexport const SCENE = " + text + ";\n")
    print(f"{len(TRACES)} traces, {len(data['arcs'])} arcs, {len(data['bursts'])} bursts")


if __name__ == "__main__":
    main()
