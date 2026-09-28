"""Render the landing sculpture with Blender on the remote build host."""

import os
import sys

import bpy
import bmesh
from mathutils import Vector

output = sys.argv[sys.argv.index("--") + 1]
os.makedirs(output, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)


def material(name, color, metallic, roughness):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*color, 1)
    result.use_nodes = True
    bsdf = result.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return result


lime = material("Electric lime enamel", (0.60, 0.94, 0.002), 0.3, 0.23)
metal = material("Brushed titanium", (0.31, 0.35, 0.32), 0.85, 0.22)
black = material("Graphite seam", (0.017, 0.022, 0.015), 0.4, 0.32)
outline = [(69, 21), (36, 66), (58.5, 66), (51, 99), (84, 54), (61.5, 54)]


def bolt(name, scale, front, back, surface):
    points = [((x - 60) / 24 * scale, (60 - z) / 24 * scale) for x, z in outline]
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
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(surface)
    bevel = obj.modifiers.new("Machined edge", "BEVEL")
    bevel.width = 0.055
    bevel.segments = 5
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


bolt("Titanium casing", 1.08, -0.06, 0.32, metal)
bolt("Dark inset", 1.02, -0.14, -0.04, black)
bolt("Lime charge face", 0.96, -0.23, -0.12, lime)


def point_at(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


def light(name, location, power, size, color):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.shape = "DISK"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    point_at(obj, (0, 0, 0))


light("Softbox", (-3, -5, 6), 650, 5, (1, 1, 1))
light("Edge light", (4, 2, 4), 950, 3, (0.91, 1, 0.8))
light("Front bounce", (1, -4, -1), 180, 4, (1, 1, 1))
if "--empty-only" not in sys.argv:
    # Export the three material surfaces for the interactive browser scene.
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(output, "charge-sculpture.glb"),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
    )
    if "--export-only" in sys.argv:
        sys.exit(0)

scene = bpy.context.scene
scene.world.color = (0.35, 0.35, 0.35)
camera_data = bpy.data.cameras.new("Camera")
camera = bpy.data.objects.new("Camera", camera_data)
bpy.context.collection.objects.link(camera)
scene.camera = camera
camera_data.type = "ORTHO"
camera_data.ortho_scale = 4.5
camera.location = (3.2, -8, 2.6)
point_at(camera, (0, 0, 0))
scene.render.engine = "CYCLES"
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 800
scene.render.resolution_y = 960
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "AgX"
if "--empty-only" in sys.argv:
    empty = (0.035, 0.045, 0.025)
    lime.diffuse_color = (*empty, 1)
    lime.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (*empty, 1)
    scene.render.filepath = os.path.join(output, "charge-sculpture-empty.png")
else:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(output, "charge-sculpture.blend"))
    scene.render.filepath = os.path.join(output, "charge-sculpture.png")
bpy.ops.render.render(write_still=True)
