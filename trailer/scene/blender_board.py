"""Build, animate and render the trailer's circuit board in Blender.

Run on a machine with a GPU (EEVEE):

    Blender -b --factory-startup -P scene/blender_board.py -- OUT [options]

Options:
    --stills 3.0,12.5     render single frames at these times into OUT/stills
    --frames 0-1499       render this frame range into OUT/frames as JPEG
    --percent 50          resolution percentage (default 100)
    --samples 16          EEVEE samples (default 16)
    --save                also save OUT/board.blend

Every run rewrites js/camera-data.js with the camera's view-projection matrix
for each frame, so the HyperFrames overlay can place current, arcs and sparks
on the rendered board.
"""

import json
import math
import random
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import board as B  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1:]
OUT = Path(args[0]).resolve()
OUT.mkdir(parents=True, exist_ok=True)


def option(name, default=None):
    return args[args.index(name) + 1] if name in args else default


FONT_PATH = HERE.parent / "public" / "fonts" / "JetBrainsMono.ttf"
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = B.FPS
scene.frame_start, scene.frame_end = 0, B.FRAMES - 1


# --- Materials ------------------------------------------------------------------
def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def principled(name, color, metallic=0.0, roughness=0.5, coat=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Coat Weight"].default_value = coat
    bsdf.inputs["Coat Roughness"].default_value = 0.22
    return mat


def solder_mask():
    mat = principled("Solder mask", (0.008, 0.011, 0.008), 0.0, 0.5, coat=0.28)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 38.0
    noise.inputs["Detail"].default_value = 6.0
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.035
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], nodes["Principled BSDF"].inputs["Normal"])
    return mat


MASK = solder_mask()
COPPER = principled("Copper under mask", (0.022, 0.032, 0.016), 0.4, 0.36, coat=0.28)
TIN = principled("Tinned pad", (0.50, 0.52, 0.50), 1.0, 0.28)
SILK = principled("Silkscreen", (0.52, 0.53, 0.50), 0.0, 0.7)
EPOXY = principled("Epoxy package", (0.012, 0.012, 0.013), 0.0, 0.5)
HOLE = principled("Drill hole", (0.0, 0.0, 0.0), 0.0, 0.9)
METAL = principled("Brushed titanium", (0.31, 0.35, 0.32), 0.85, 0.22)
GRAPHITE = principled("Graphite seam", (0.017, 0.022, 0.015), 0.4, 0.32)


def face_material():
    """Lime enamel that fills from the bottom with the study charge."""
    mat = principled("Charge face", (0.035, 0.045, 0.025), 0.3, 0.23)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes["Principled BSDF"]
    coord = nodes.new("ShaderNodeTexCoord")
    xyz = nodes.new("ShaderNodeSeparateXYZ")
    links.new(coord.outputs["Object"], xyz.inputs["Vector"])
    level = nodes.new("ShaderNodeValue")
    level.name = "Fill level"
    colour = nodes.new("ShaderNodeRGB")
    colour.name = "Fill colour"
    glow = nodes.new("ShaderNodeValue")
    glow.name = "Glow"
    band_gain = nodes.new("ShaderNodeValue")
    band_gain.name = "Band"

    def math_node(op, a, b=None):
        node = nodes.new("ShaderNodeMath")
        node.operation = op
        for index, value in enumerate([a, b]):
            if value is None:
                continue
            if isinstance(value, (int, float)):
                node.inputs[index].default_value = value
            else:
                links.new(value, node.inputs[index])
        return node.outputs[0]

    lower = math_node("SUBTRACT", level.outputs[0], 0.025)
    upper = math_node("ADD", level.outputs[0], 0.025)
    remap = nodes.new("ShaderNodeMapRange")
    remap.interpolation_type = "SMOOTHSTEP"
    links.new(xyz.outputs["Z"], remap.inputs["Value"])
    links.new(lower, remap.inputs["From Min"])
    links.new(upper, remap.inputs["From Max"])
    remap.inputs["To Min"].default_value = 1.0
    remap.inputs["To Max"].default_value = 0.0
    filled = remap.outputs["Result"]
    distance = math_node("ABSOLUTE", math_node("SUBTRACT", xyz.outputs["Z"], level.outputs[0]))
    band = math_node("MULTIPLY", math_node("SUBTRACT", 1.0, math_node("MINIMUM", math_node("DIVIDE", distance, 0.11), 1.0)),
                     band_gain.outputs[0])
    mix = nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    links.new(filled, mix.inputs["Factor"])
    mix.inputs["A"].default_value = (0.035, 0.045, 0.025, 1)
    links.new(colour.outputs[0], mix.inputs["B"])
    links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
    links.new(colour.outputs[0], bsdf.inputs["Emission Color"])
    strength = math_node("ADD", math_node("MULTIPLY", filled, glow.outputs[0]), band)
    links.new(strength, bsdf.inputs["Emission Strength"])
    return mat


FACE = face_material()


# --- Geometry helpers ---------------------------------------------------------------
def new_object(name, mesh, material):
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def box(bm, center, size, angle=0.0):
    matrix = Matrix.Translation(Vector(center)) @ Matrix.Rotation(angle, 4, "Z") @ Matrix.Diagonal((*size, 1))
    bmesh.ops.create_cube(bm, size=1.0, matrix=matrix)


def disc(bm, center, radius, height, segments=24):
    matrix = Matrix.Translation(Vector((center[0], center[1], center[2] + height / 2)))
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=radius, radius2=radius, depth=height,
                          matrix=matrix)


def finish(bm, name, material, smooth=False):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = new_object(name, mesh, material)
    if smooth:
        for poly in obj.data.polygons:
            poly.use_smooth = True
    return obj


def ribbon(bm, points, width, height, z=0.0):
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        length = math.hypot(x1 - x0, y1 - y0)
        if length < 1e-6:
            continue
        box(bm, ((x0 + x1) / 2, (y0 + y1) / 2, z + height / 2), (length, width, height), math.atan2(y1 - y0, x1 - x0))
    for x, y in points:
        disc(bm, (x, y, z), width / 2, height, 16)


BOARD_OBJECTS = []


def board_part(obj):
    BOARD_OBJECTS.append(obj)
    return obj


# Board substrate.
bm = bmesh.new()
box(bm, (0, 3, -0.8), (96, 70, 1.6))
board_part(finish(bm, "Board", MASK))

# Copper traces under the mask, plus the stubs from day pads to their column.
bm = bmesh.new()
for trace in B.TRACES:
    ribbon(bm, trace["points"], B.TRACE_W, 0.014)
for pad in B.grid_pads():
    ribbon(bm, [(pad["x"] + 0.35, pad["y"]), (pad["x"] + 0.7, pad["y"])], B.TRACE_W * 0.8, 0.014)
board_part(finish(bm, "Traces", COPPER))

# Tinned pads.
bm = bmesh.new()
holes = bmesh.new()
for x in B.WEEK_X:
    disc(bm, (x, B.WEEK_ROW_Y, 0), 0.62, 0.03, 32)
    disc(holes, (x, B.WEEK_ROW_Y, 0), 0.24, 0.034, 24)
for pad in B.grid_pads():
    box(bm, (pad["x"], pad["y"], 0.015), (0.72, 0.72, 0.03))
disc(bm, (B.SOCKET[0], B.SOCKET[1], 0), 0.5, 0.03, 32)
disc(holes, (B.SOCKET[0], B.SOCKET[1], 0), 0.2, 0.034, 24)
for x, y in [(-26, -16), (26, -16), (-26, 22), (26, 22)]:
    disc(bm, (x, y, 0), 1.3, 0.02, 40)
    disc(holes, (x, y, 0), 0.8, 0.024, 40)
rng = random.Random(7)


def near_trace(x, y, margin):
    for trace in B.TRACES:
        for (x0, y0), (x1, y1) in zip(trace["points"], trace["points"][1:]):
            dx, dy = x1 - x0, y1 - y0
            u = max(0.0, min(1.0, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy or 1)))
            if math.hypot(x - (x0 + u * dx), y - (y0 + u * dy)) < margin:
                return True
    return False


vias = 0
while vias < 140:
    x, y = rng.uniform(-30, 30), rng.uniform(-14, 20)
    zx0, zx1, zy0, zy1 = B.READOUT_ZONE
    busy = (abs(y - B.WEEK_ROW_Y) < 2.0 and abs(x) < 10.5) or (4 < y < 18.5 and abs(x) < 12.5) or (zx0 < x < zx1 and zy0 < y < zy1)
    if busy or near_trace(x, y, 0.7) or math.hypot(x, y) < 2.4:
        continue
    disc(bm, (x, y, 0), 0.16, 0.02, 12)
    disc(holes, (x, y, 0), 0.07, 0.024, 10)
    vias += 1
board_part(finish(bm, "Pads", TIN))
board_part(finish(holes, "Holes", HOLE))

# Focus timer chip.
bm = bmesh.new()
cx, cy = B.CHIP["center"]
sx, sy = B.CHIP["size"]
box(bm, (cx, cy, 0.22), (sx, sy, 0.4))
board_part(finish(bm, "Chip", EPOXY))
bm = bmesh.new()
for k in range(8):
    offset = -sx / 2 + 0.3 + k * (sx - 0.6) / 7
    for px, py, angle in [(cx + offset, cy - sy / 2 - 0.2, 0), (cx + offset, cy + sy / 2 + 0.2, 0),
                          (cx - sx / 2 - 0.2, cy + offset, math.pi / 2), (cx + sx / 2 + 0.2, cy + offset, math.pi / 2)]:
        box(bm, (px, py, 0.04), (0.18, 0.5, 0.06), angle)

# Small passives so the board reads as a real board.
for x, y, angle in [(-16.0, -3.6, 0), (-13.0, 2.6, math.pi / 2), (-19.0, 2.4, 0), (-5.2, 1.1, 0), (-5.2, -1.1, 0),
                    (2.2, 1.0, math.pi / 2), (-3.0, 1.4, 0), (-22.0, 4.0, 0), (-14.5, -3.4, math.pi / 2)]:
    box(bm, (x - 0.42 * math.cos(angle), y - 0.42 * math.sin(angle), 0.1), (0.22, 0.6, 0.2), angle)
    box(bm, (x + 0.42 * math.cos(angle), y + 0.42 * math.sin(angle), 0.1), (0.22, 0.6, 0.2), angle)
board_part(finish(bm, "Leads", TIN))
bm = bmesh.new()
for x, y, angle in [(-16.0, -3.6, 0), (-13.0, 2.6, math.pi / 2), (-19.0, 2.4, 0), (-5.2, 1.1, 0), (-5.2, -1.1, 0),
                    (2.2, 1.0, math.pi / 2), (-3.0, 1.4, 0), (-22.0, 4.0, 0), (-14.5, -3.4, math.pi / 2)]:
    box(bm, (x, y, 0.11), (0.66, 0.62, 0.2), angle)
board_part(finish(bm, "Passives", EPOXY))

# Switch posts and lever.
bm = bmesh.new()
for x, y in [B.SWITCH_A, B.SWITCH_B]:
    disc(bm, (x, y, 0), 0.26, 0.13, 64)
board_part(finish(bm, "Switch posts", TIN))
pivot = bpy.data.objects.new("Lever pivot", None)
scene.collection.objects.link(pivot)
pivot.location = (B.SWITCH_A[0], 0.0, 0.15)
board_part(pivot)
bm = bmesh.new()
gap = B.SWITCH_B[0] - B.SWITCH_A[0]
box(bm, (gap / 2 + 0.05, 0, 0.03), (gap + 0.4, 0.2, 0.06))
lever = board_part(finish(bm, "Lever", TIN))
lever.parent = pivot


# Silkscreen.
font = bpy.data.fonts.load(str(FONT_PATH))
for index, label in enumerate(B.LABELS):
    curve = bpy.data.curves.new(f"Label {index}", "FONT")
    curve.body = label["text"]
    curve.font = font
    curve.size = label["size"]
    curve.materials.append(SILK)
    obj = bpy.data.objects.new(f"Label {index}", curve)
    obj.location = (label["x"], label["y"], 0.016)
    scene.collection.objects.link(obj)
    board_part(obj)
curve = bpy.data.curves.new("Chip mark", "FONT")
curve.body = "25:00"
curve.font = font
curve.size = 0.6
curve.align_x = "CENTER"
curve.materials.append(principled("Laser mark", (0.09, 0.09, 0.09), 0.0, 0.6))
obj = bpy.data.objects.new("Chip mark", curve)
obj.location = (cx, cy + 0.65, 0.425)
scene.collection.objects.link(obj)
board_part(obj)


# The bolt, built exactly like design/charge-sculpture.py.
def bolt(name, scale, front, back, surface):
    points = B.outline_local(scale)
    vertices = [(x, y, z) for y in [front, back] for x, z in points]
    n = len(points)
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, n * 2))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    editable = bmesh.new()
    editable.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(editable, faces=list(editable.faces))
    editable.to_mesh(mesh)
    editable.free()
    obj = new_object(name, mesh, surface)
    obj.location = (0, 0, B.BOLT_Z)
    bevel = obj.modifiers.new("Machined edge", "BEVEL")
    bevel.width = 0.055
    bevel.segments = 5
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


bolt("Titanium casing", B.CASING_SCALE, *B.CASING_Y, METAL)
bolt("Dark inset", B.INSET_SCALE, *B.INSET_Y, GRAPHITE)
bolt("Lime charge face", B.FACE_SCALE, *B.FACE_Y, FACE)


# --- Lights ---------------------------------------------------------------------
def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def light(name, kind, location, color, size=1.0, target=(0, 0, 0)):
    data = bpy.data.lights.new(name, kind)
    data.color = color
    if kind == "AREA":
        data.shape = "DISK"
        data.size = size
    else:
        data.shadow_soft_size = size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    point_at(obj, target)
    return data


KEY = light("Key", "AREA", (-8, -10, 12), (1, 1, 1), 7)
RIM = light("Rim", "AREA", (5, 7, 6), (0.91, 1, 0.8), 3, (0, 0, 2))
TOP = light("Top", "AREA", (0, 2, 24), (0.95, 1, 0.95), 46)
SOCKET_LIGHT = light("Socket glow", "POINT", (B.SOCKET[0], -0.35, 0.45), (0.8, 1, 0.1), 0.15)
FACE_LIGHT = light("Face glow", "POINT", (0, -1.7, B.BOLT_Z), (0.8, 1, 0.1), 0.6)
STALL = light("Stall", "SPOT", (B.SWITCH_A[0] - 0.6, -1.8, 3.2), (0.75, 0.85, 1.0), 0.4,
              (B.SWITCH_A[0] + 0.4, 0, 0.1))
bpy.data.objects["Stall"].data.spot_size = math.radians(38)
bpy.data.objects["Stall"].data.spot_blend = 0.6
END_KEY = light("End key", "AREA", (-10, -22, 14), (1, 1, 1), 10, (0, 0, 2))
END_RIM = light("End rim", "AREA", (6, 8, 7), (0.9, 1, 0.8), 3, (0, 0, 2))

world = bpy.data.worlds.new("Night")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.006, 0.0075, 0.006, 1)
BG = world.node_tree.nodes["Background"].inputs["Strength"]
scene.world = world

# --- Camera ---------------------------------------------------------------------------
camera_data = bpy.data.cameras.new("Camera")
camera_data.sensor_fit = "HORIZONTAL"
camera_data.sensor_width = 36.0
camera_data.clip_start = 0.05
camera_data.clip_end = 400.0
camera_data.dof.use_dof = True
camera = bpy.data.objects.new("Camera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera


# --- Animation ------------------------------------------------------------------
def charge_rgb(pct):
    stops = [(0, (239, 68, 68)), (50, (245, 158, 11)), (100, (204, 255, 0))]
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        if pct <= p1:
            u = (pct - p0) / (p1 - p0)
            return tuple(srgb_to_linear((a + (b - a) * u) / 255) for a, b in zip(c0, c1))
    return tuple(srgb_to_linear(c / 255) for c in stops[-1][1])


nodes = FACE.node_tree.nodes
fill_level = nodes["Fill level"].outputs[0]
fill_colour = nodes["Fill colour"].outputs[0]
glow = nodes["Glow"].outputs[0]
band = nodes["Band"].outputs[0]


def key(owner, path, frame):
    owner.keyframe_insert(path, frame=frame)


for frame in range(B.FRAMES):
    t = frame / B.FPS
    shot = B.camera_at(t)
    camera.location = shot["loc"]
    camera.rotation_euler = (Vector(shot["target"]) - Vector(shot["loc"])).to_track_quat("-Z", "Y").to_euler()
    camera_data.lens = shot["lens"]
    camera_data.dof.focus_distance = shot["focus"]
    camera_data.dof.aperture_fstop = shot["fstop"]
    for owner, path in [(camera, "location"), (camera, "rotation_euler"), (camera_data, "lens"),
                        (camera_data.dof, "focus_distance"), (camera_data.dof, "aperture_fstop")]:
        key(owner, path, frame)

    charge = B.charge_at(t)
    pulse = B.pulse_at(t)
    colour = charge_rgb(charge)
    fill_level.default_value = -B.FACE_HALF_HEIGHT - 0.06 + (2 * B.FACE_HALF_HEIGHT + 0.12) * charge / 100
    fill_colour.default_value = (*colour, 1)
    glow.default_value = (0.6 + 2.6 * charge / 100) * pulse
    band.default_value = 0.0 if charge < 0.5 or charge > 99.5 else 3.0
    for socket in [fill_level, fill_colour, glow, band]:
        key(socket, "default_value", frame)

    pivot.rotation_euler = (0, -math.radians(B.lever_at(t)), 0)
    key(pivot, "rotation_euler", frame)

    mood = B.mood_at(t)
    end = 1.0 if t >= B.T_END else 0.0
    KEY.energy = 650 * mood
    RIM.energy = 1400 * mood
    TOP.energy = 700 * mood
    SOCKET_LIGHT.energy = 0 if end else 60 * min(B.total_flow_at(t), 2.5)
    FACE_LIGHT.color = colour
    FACE_LIGHT.energy = 90 * charge / 100 * pulse
    STALL.energy = 1600 * B.keys_at(t, [(B.T_STALL - 0.01, 0.0), (B.T_STALL, 1.0), (B.T_RECONNECT, 1.0),
                                        (B.T_WEEK - 0.01, 0.4), (B.T_WEEK, 0.0)])
    BG.default_value = 0.0 if end else 0.5
    END_KEY.energy = 2400 * end
    END_RIM.energy = 2200 * end
    for data in [KEY, RIM, TOP, SOCKET_LIGHT, FACE_LIGHT, END_KEY, END_RIM, STALL]:
        key(data, "energy", frame)
    key(BG, "default_value", frame)
    key(FACE_LIGHT, "color", frame)

end_frame = round(B.T_END * B.FPS)
for obj in BOARD_OBJECTS:
    obj.hide_render = False
    obj.keyframe_insert("hide_render", frame=end_frame - 1)
    obj.hide_render = True
    obj.keyframe_insert("hide_render", frame=end_frame)


def linearize(owner):
    animation = owner.animation_data
    if animation and animation.action:
        for curve in getattr(animation.action, "fcurves", []):
            for point in curve.keyframe_points:
                point.interpolation = "LINEAR"


for owner in [camera, camera_data, pivot, FACE.node_tree, KEY, RIM, TOP, SOCKET_LIGHT, FACE_LIGHT, END_KEY, END_RIM]:
    try:
        linearize(owner)
    except AttributeError:
        pass  # Slotted actions expose curves per channel bag; per-frame keys make this a refinement only.

# --- Camera export ------------------------------------------------------------------------
depsgraph = bpy.context.evaluated_depsgraph_get()
matrices = []
for frame in range(B.FRAMES):
    scene.frame_set(frame)
    projection = camera.calc_matrix_camera(depsgraph, x=B.WIDTH, y=B.HEIGHT)
    view_projection = projection @ camera.matrix_world.inverted()
    matrices.append([round(view_projection[r][c], 6) for r in range(4) for c in range(4)])
(HERE.parent / "js" / "camera-data.js").write_text(
    "// Generated by scene/blender_board.py. Row-major view-projection per frame.\n"
    f"export const CAMERA = {json.dumps({'width': B.WIDTH, 'height': B.HEIGHT, 'fps': B.FPS, 'frames': matrices}, separators=(',', ':'))};\n")

# Check the export against Blender's own projection on a few frames.
from bpy_extras.object_utils import world_to_camera_view  # noqa: E402

for frame in [0, 300, 700, 1100, 1250, 1400]:
    scene.frame_set(frame)
    point = Vector((B.TIP[0], B.TIP[1], B.TIP[2]))
    ndc = world_to_camera_view(scene, camera, point)
    m = Matrix([matrices[frame][r * 4:(r + 1) * 4] for r in range(4)])
    clip = m @ point.to_4d()
    mine = ((clip.x / clip.w + 1) / 2, (clip.y / clip.w + 1) / 2)
    assert abs(mine[0] - ndc.x) < 1e-3 and abs(mine[1] - ndc.y) < 1e-3, (frame, mine, tuple(ndc))
print("CAMERA_EXPORT_OK", len(matrices))

# --- Render settings ---------------------------------------------------------------------
scene.render.engine = "BLENDER_EEVEE"
scene.eevee.taa_render_samples = int(option("--samples", 16))
scene.eevee.use_raytracing = "--no-raytrace" not in args
scene.render.resolution_x, scene.render.resolution_y = B.WIDTH, B.HEIGHT
scene.render.resolution_percentage = int(option("--percent", 100))
scene.view_settings.view_transform = "AgX"
try:
    scene.view_settings.look = "AgX - Medium High Contrast"
except TypeError:
    pass

comp = bpy.data.node_groups.new("Bloom", "CompositorNodeTree")
scene.compositing_node_group = comp
layers = comp.nodes.new("CompositorNodeRLayers")
glare = comp.nodes.new("CompositorNodeGlare")
for name, value in [("Type", "Bloom"), ("Quality", option("--glare", "Medium"))]:
    if name in glare.inputs:
        glare.inputs[name].default_value = value
for name, value in [("Threshold", 0.85), ("Strength", 0.55), ("Size", 0.6)]:
    if name in glare.inputs:
        glare.inputs[name].default_value = value
comp.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
output = comp.nodes.new("NodeGroupOutput")
comp.links.new(layers.outputs["Image"], glare.inputs["Image"])
comp.links.new(glare.outputs["Image"], output.inputs[0])

if "--save" in args:
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "board.blend"))

stills = option("--stills")
if stills:
    (OUT / "stills").mkdir(exist_ok=True)
    scene.render.image_settings.file_format = "PNG"
    for value in stills.split(","):
        frame = round(float(value) * B.FPS)
        scene.frame_set(frame)
        scene.render.filepath = str(OUT / "stills" / f"t{float(value):05.2f}.png")
        bpy.ops.render.render(write_still=True)
        print("STILL", scene.render.filepath)

frames = option("--frames")
if frames:
    first, last = (int(v) for v in frames.split("-"))
    (OUT / "frames").mkdir(exist_ok=True)
    scene.frame_start, scene.frame_end = first, last
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 94
    scene.render.filepath = str(OUT / "frames" / "####")
    scene.render.use_overwrite = False  # a restarted render resumes after the last saved frame
    bpy.ops.render.render(animation=True)
    print("FRAMES_DONE", first, last)
