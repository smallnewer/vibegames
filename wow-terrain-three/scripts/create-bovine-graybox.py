"""Build, export and render the approved two-heads-tall bovine hero graybox."""

from math import radians
import os
from pathlib import Path
import sys

import bpy
from mathutils import Vector


ROOT_DIR = Path(__file__).resolve().parents[1]
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from png_metadata import strip_png_metadata


BUILD_MODE = os.environ.get("BOVINE_BUILD_MODE", "graybox")
if BUILD_MODE not in {"graybox", "runtime"}:
    raise ValueError(f"Unsupported BOVINE_BUILD_MODE: {BUILD_MODE}")
ASSET_STEM = "bovine-hero-graybox" if BUILD_MODE == "graybox" else "bovine-hero-runtime"
BLEND_PATH = ROOT_DIR / "assets" / "characters" / f"{ASSET_STEM}.blend"
GLB_PATH = ROOT_DIR / "public" / "models" / f"{ASSET_STEM}.glb"
PREVIEW_DIR = ROOT_DIR / "assets" / "characters" / "previews"
TEXTURE_DIR = ROOT_DIR / "public" / "textures" / "characters" / "bovine-hero"


def clear_scene() -> None:
    """Remove Blender's default scene so generation stays reproducible."""
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for data in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for item in list(data):
            if item.users == 0:
                data.remove(item)


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    roughness: float = 0.82,
    texture_name: str | None = None,
):
    """Create one neutral gray material used to separate major forms."""
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    shader = next((node for node in material.node_tree.nodes if node.type == "BSDF_PRINCIPLED"), None)
    if shader is None:
        shader = material.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
        output = next((node for node in material.node_tree.nodes if node.type == "OUTPUT_MATERIAL"), None)
        if output is None:
            output = material.node_tree.nodes.new("ShaderNodeOutputMaterial")
        material.node_tree.links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = roughness
    if texture_name:
        texture_path = TEXTURE_DIR / texture_name
        if not texture_path.exists():
            raise FileNotFoundError(f"Missing runtime texture: {texture_path}")
        image = bpy.data.images.load(str(texture_path), check_existing=True)
        image.colorspace_settings.name = "sRGB"
        texture = material.node_tree.nodes.new("ShaderNodeTexImage")
        texture.image = image
        texture.extension = "REPEAT"
        texture.interpolation = "Linear"
        material.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    return material


def finish_mesh(obj, name: str, material, parent, smooth: bool = True):
    """Name, shade, materialize and parent a generated mesh."""
    obj.name = name
    if smooth:
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    obj.data.materials.append(material)
    obj.parent = parent
    return obj


def add_ellipsoid(name, location, scale, material, parent, rotation=(0, 0, 0), segments=20, rings=12):
    """Add a low-detail ellipsoid for soft cartoon anatomy."""
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_mesh(obj, name, material, parent)


def add_ico(name, location, scale, material, parent, rotation=(0, 0, 0)):
    """Add a faceted ellipsoid for the chunky mane."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_mesh(obj, name, material, parent, smooth=False)


def add_cylinder(name, location, radius, depth, material, parent, scale_xy=(1, 1), rotation=(0, 0, 0)):
    """Add a simple ring or cuff around a short limb."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.scale = (scale_xy[0], scale_xy[1], 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_mesh(obj, name, material, parent)


def add_box(name, location, scale, material, parent, bevel=0.05, rotation=(0, 0, 0)):
    """Add a softly beveled box for belts and buckles."""
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("SoftEdge", "BEVEL")
    modifier.width = bevel
    modifier.segments = 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    return finish_mesh(obj, name, material, parent)


def add_wedge(name, location, width_top, width_bottom, height, depth, material, parent, back=False):
    """Add a flat tapered cloth panel with actual thickness."""
    top_z = height / 2
    bottom_z = -height / 2
    front_y = -depth / 2
    back_y = depth / 2
    vertices = [
        (-width_top / 2, front_y, top_z),
        (width_top / 2, front_y, top_z),
        (width_bottom / 2, front_y, bottom_z),
        (-width_bottom / 2, front_y, bottom_z),
        (-width_top / 2, back_y, top_z),
        (width_top / 2, back_y, top_z),
        (width_bottom / 2, back_y, bottom_z),
        (-width_bottom / 2, back_y, bottom_z),
    ]
    faces = [
        (0, 1, 2, 3),
        (4, 7, 6, 5),
        (0, 4, 5, 1),
        (3, 2, 6, 7),
        (1, 5, 6, 2),
        (0, 3, 7, 4),
    ]
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    if back:
        obj.rotation_euler.z = radians(180)
    return finish_mesh(obj, name, material, parent, smooth=False)


def add_tapered_segment(name, start, end, radius_start, radius_end, material, parent):
    """Join two points with a tapered low-poly horn segment."""
    start_point = Vector(start)
    end_point = Vector(end)
    direction = end_point - start_point
    middle = (start_point + end_point) * 0.5
    bpy.ops.mesh.primitive_cone_add(
        vertices=12,
        radius1=radius_start,
        radius2=radius_end,
        depth=direction.length,
        location=middle,
    )
    obj = bpy.context.object
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_mesh(obj, name, material, parent)


def add_horn(side: int, material, parent) -> None:
    """Build one curved horn from three clean tapered segments."""
    label = "L" if side < 0 else "R"
    points = [
        (side * 0.58, -0.01, 2.48),
        (side * 0.82, -0.04, 2.58),
        (side * 0.99, -0.06, 2.77),
        (side * 0.96, -0.08, 2.96),
    ]
    radii = [(0.15, 0.125), (0.125, 0.085), (0.085, 0.025)]
    for index, (start, end) in enumerate(zip(points, points[1:]), start=1):
        add_tapered_segment(
            f"Horn_{label}_{index:02d}",
            start,
            end,
            radii[index - 1][0],
            radii[index - 1][1],
            material,
            parent,
        )


def build_hero():
    """Construct the approved compact bovine silhouette from named parts."""
    root = bpy.data.objects.new("BovineHero_Graybox", None)
    bpy.context.collection.objects.link(root)

    runtime = BUILD_MODE == "runtime"
    texture = (lambda name: name if runtime else None)
    body = make_material("Fur" if runtime else "Gray_Body", (0.58, 0.31, 0.13, 1) if runtime else (0.43, 0.45, 0.47, 1), texture_name=texture("fur.png"))
    muzzle = make_material("Muzzle" if runtime else "Gray_Muzzle", (0.78, 0.58, 0.32, 1) if runtime else (0.62, 0.64, 0.65, 1), texture_name=texture("muzzle.png"))
    vest = make_material("LeatherDark" if runtime else "Gray_Cloth", (0.13, 0.075, 0.04, 1) if runtime else (0.16, 0.17, 0.18, 1), texture_name=texture("leather.png"))
    leather = make_material("Leather" if runtime else "Gray_ClothMid", (0.24, 0.12, 0.055, 1) if runtime else (0.28, 0.3, 0.31, 1), texture_name=texture("leather.png"))
    teal = make_material("ClothTeal" if runtime else "Gray_ClothMid_Cloth", (0.09, 0.29, 0.28, 1) if runtime else (0.28, 0.3, 0.31, 1), texture_name=texture("cloth-teal.png"))
    mane = make_material("Mane" if runtime else "Gray_Mane", (0.095, 0.045, 0.022, 1) if runtime else (0.09, 0.1, 0.11, 1), texture_name=texture("mane.png"))
    horn = make_material("Horn" if runtime else "Gray_Horn", (0.79, 0.65, 0.39, 1) if runtime else (0.7, 0.7, 0.67, 1), texture_name=texture("horn.png"))
    hoof = make_material("Hoof" if runtime else "Gray_Hoof", (0.10, 0.075, 0.055, 1) if runtime else (0.11, 0.12, 0.13, 1), texture_name=texture("hoof.png"))
    eye = make_material("Eye" if runtime else "Gray_Eye", (0.91, 0.88, 0.78, 1) if runtime else (0.88, 0.89, 0.89, 1), 0.55)
    dark = make_material("Dark" if runtime else "Gray_Dark", (0.018, 0.012, 0.009, 1) if runtime else (0.035, 0.04, 0.045, 1), 0.55)
    metal = make_material("Metal" if runtime else "Gray_Metal", (0.57, 0.34, 0.09, 1) if runtime else (0.7, 0.7, 0.67, 1), 0.48)

    # The mane-to-chin height and chin-to-hoof height are intentionally similar.
    add_ellipsoid("Body_Torso", (0, 0.02, 1.27), (0.76, 0.46, 0.55), body, root)
    add_ellipsoid("Body_Belly", (0, 0.04, 0.95), (0.62, 0.4, 0.38), body, root)
    add_ellipsoid("Cloth_Vest", (0, 0.015, 1.33), (0.785, 0.475, 0.50), vest, root)
    add_wedge("Cloth_ChestOpening", (0, -0.476, 1.54), 0.38, 0.08, 0.44, 0.025, muzzle, root)

    # Oversized head and muzzle carry most of the approved silhouette.
    add_ellipsoid("Head_Main", (0, -0.04, 2.12), (0.72, 0.56, 0.73), body, root, segments=24, rings=16)
    add_ellipsoid("Face_Muzzle", (0, -0.53, 1.86), (0.61, 0.39, 0.43), muzzle, root, segments=24, rings=14)
    add_ellipsoid("Face_Nose", (0, -0.86, 1.98), (0.43, 0.10, 0.22), muzzle, root, segments=20, rings=12)
    if runtime:
        add_ellipsoid("Face_Mouth", (0, -0.91, 1.69), (0.34, 0.025, 0.035), dark, root, segments=18, rings=8)

    for side in (-1, 1):
        label = "L" if side < 0 else "R"
        add_ellipsoid(f"Ear_{label}", (side * 0.71, -0.02, 2.24), (0.30, 0.10, 0.15), body, root, rotation=(0, side * radians(15), side * radians(8)))
        add_horn(side, horn, root)

        # Eyes, pupils and brows keep the graybox readable as the chosen character.
        add_ellipsoid(f"Eye_{label}", (side * 0.245, -0.57, 2.27), (0.15, 0.055, 0.17), eye, root, segments=20, rings=12)
        add_ellipsoid(f"Pupil_{label}", (side * 0.245, -0.63, 2.27), (0.065, 0.025, 0.085), dark, root, segments=16, rings=10)
        add_ellipsoid(f"Brow_{label}", (side * 0.255, -0.60, 2.48), (0.22, 0.035, 0.055), mane, root, rotation=(0, 0, side * radians(12)), segments=16, rings=8)
        add_ellipsoid(f"Nostril_{label}", (side * 0.22, -0.955, 2.03), (0.085, 0.025, 0.07), dark, root, segments=14, rings=8)

    # Chunky faceted clumps explain the mane without committing to final topology.
    mane_parts = [
        ("Mane_Top", (0, 0.02, 2.78), (0.26, 0.22, 0.32), (0, 0, 0)),
        ("Mane_Back", (0, 0.43, 2.30), (0.43, 0.24, 0.56), (radians(-8), 0, 0)),
        ("Mane_L", (-0.39, 0.26, 2.36), (0.27, 0.2, 0.43), (radians(-10), radians(-8), radians(-12))),
        ("Mane_R", (0.39, 0.26, 2.36), (0.27, 0.2, 0.43), (radians(-10), radians(8), radians(12))),
        ("Mane_Lower", (0, 0.43, 1.93), (0.34, 0.22, 0.40), (radians(-12), 0, 0)),
    ]
    for name, location, scale, rotation in mane_parts:
        add_ico(name, location, scale, mane, root, rotation)

    # Short thick arms end in deliberately oversized hands.
    for side in (-1, 1):
        label = "L" if side < 0 else "R"
        add_ellipsoid(f"Arm_{label}_Upper", (side * 0.79, -0.005, 1.40), (0.28, 0.29, 0.40), body, root, rotation=(0, side * radians(7), side * radians(8)))
        add_ellipsoid(f"Arm_{label}_Lower", (side * 0.91, -0.045, 1.04), (0.25, 0.25, 0.34), body, root, rotation=(0, side * radians(9), side * radians(5)))
        add_cylinder(f"Gear_Bracer_{label}", (side * 0.91, -0.045, 1.08), 0.275, 0.28, vest, root, scale_xy=(1, 0.92))
        add_ellipsoid(f"Hand_{label}", (side * 0.94, -0.09, 0.72), (0.29, 0.25, 0.31), body, root, rotation=(0, side * radians(10), 0))
        add_ellipsoid(f"Hand_{label}_Thumb", (side * 0.77, -0.28, 0.73), (0.10, 0.11, 0.17), body, root, rotation=(radians(18), side * radians(18), 0), segments=16, rings=10)
        if runtime:
            for finger_index in (-1, 0, 1):
                add_ellipsoid(
                    f"Hand_{label}_Finger_{finger_index + 2}",
                    (side * 0.94 + finger_index * 0.075, -0.27, 0.62),
                    (0.065, 0.085, 0.12),
                    body,
                    root,
                    segments=14,
                    rings=8,
                )

    # Very short legs and split hooves keep the lower half to roughly half the body unit.
    for side in (-1, 1):
        label = "L" if side < 0 else "R"
        x = side * 0.38
        add_ellipsoid(f"Leg_{label}", (x, 0.02, 0.56), (0.29, 0.31, 0.36), body, root)
        add_cylinder(f"Gear_AnkleWrap_{label}", (x, -0.015, 0.36), 0.29, 0.18, teal, root, scale_xy=(1, 1.04))
        add_ellipsoid(f"Hoof_{label}_Outer", (x + side * 0.12, -0.13, 0.17), (0.18, 0.29, 0.17), hoof, root, rotation=(0, side * radians(7), 0), segments=18, rings=10)
        add_ellipsoid(f"Hoof_{label}_Inner", (x - side * 0.10, -0.14, 0.17), (0.17, 0.28, 0.17), hoof, root, rotation=(0, -side * radians(5), 0), segments=18, rings=10)

    # Belt and cloth are separate future equipment replacement points.
    add_box("Gear_Belt", (0, -0.43, 1.02), (0.72, 0.08, 0.085), leather, root, bevel=0.035)
    add_box("Gear_Belt_Back", (0, 0.39, 1.02), (0.69, 0.06, 0.085), leather, root, bevel=0.035)
    add_box("Gear_Belt_L", (-0.70, -0.02, 1.02), (0.06, 0.36, 0.085), leather, root, bevel=0.03)
    add_box("Gear_Belt_R", (0.70, -0.02, 1.02), (0.06, 0.36, 0.085), leather, root, bevel=0.03)
    add_box("Gear_Buckle", (0, -0.53, 1.02), (0.15, 0.055, 0.13), metal, root, bevel=0.025)
    add_box("Gear_Pouch", (0.42, -0.53, 0.92), (0.19, 0.10, 0.22), leather, root, bevel=0.045)
    add_wedge("Cloth_Waist", (0, -0.48, 0.69), 0.54, 0.32, 0.60, 0.055, teal, root)
    add_wedge("Cloth_Waist_Back", (0, 0.44, 0.70), 0.50, 0.28, 0.56, 0.05, teal, root, back=True)

    return root


def add_edit_bone(bones, name, head, tail, parent_name=None, deform=True):
    """Create one named edit bone with a stable parent contract."""
    bone = bones.new(name)
    bone.head = head
    bone.tail = tail
    bone.use_deform = deform
    if parent_name:
        bone.parent = bones.get(parent_name)
    return bone


def bone_for_part(name: str) -> str:
    """Map each modular mesh to the rigid bone that owns it."""
    if name.startswith(("Head_", "Face_", "Eye_", "Pupil_", "Brow_", "Nostril_", "Ear_", "Horn_", "Mane_")):
        return "Head"
    if name.startswith(("Body_Torso", "Cloth_Vest", "Cloth_ChestOpening")):
        return "Spine"
    if name.startswith(("Body_Belly", "Gear_Belt", "Gear_Buckle", "Gear_Pouch", "Cloth_Waist")):
        return "Pelvis"
    for label in ("L", "R"):
        if name.startswith(f"Arm_{label}_Upper"):
            return f"UpperArm.{label}"
        if name.startswith((f"Arm_{label}_Lower", f"Gear_Bracer_{label}")):
            return f"Forearm.{label}"
        if name.startswith(f"Hand_{label}"):
            return f"Hand.{label}"
        if name.startswith(f"Leg_{label}"):
            return f"Thigh.{label}"
        if name.startswith((f"Hoof_{label}", f"Gear_AnkleWrap_{label}")):
            return f"Foot.{label}"
    return "Pelvis"


def build_runtime_rig(root):
    """Add a compact rigid-part skeleton and reusable equipment sockets."""
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    rig = bpy.context.object
    rig.name = "BovineHero_Rig"
    rig.data.name = "BovineHero_RigData"
    rig.show_in_front = True
    bones = rig.data.edit_bones
    bones.remove(bones[0])

    add_edit_bone(bones, "Root", (0, 0, 0.02), (0, 0, 0.30), deform=False)
    add_edit_bone(bones, "Pelvis", (0, 0, 0.48), (0, 0, 1.02), "Root")
    add_edit_bone(bones, "Spine", (0, 0, 1.02), (0, 0, 1.56), "Pelvis")
    add_edit_bone(bones, "Head", (0, 0, 1.56), (0, 0, 2.42), "Spine")

    for side in (-1, 1):
        label = "L" if side < 0 else "R"
        add_edit_bone(bones, f"UpperArm.{label}", (side * 0.61, 0, 1.56), (side * 0.83, 0, 1.23), "Spine")
        add_edit_bone(bones, f"Forearm.{label}", (side * 0.83, 0, 1.23), (side * 0.92, -0.02, 0.88), f"UpperArm.{label}")
        add_edit_bone(bones, f"Hand.{label}", (side * 0.92, -0.02, 0.88), (side * 0.94, -0.08, 0.60), f"Forearm.{label}")
        add_edit_bone(bones, f"Thigh.{label}", (side * 0.36, 0, 0.94), (side * 0.38, 0, 0.52), "Pelvis")
        add_edit_bone(bones, f"Foot.{label}", (side * 0.38, 0, 0.52), (side * 0.38, -0.18, 0.16), f"Thigh.{label}")
        add_edit_bone(
            bones,
            f"Socket_Hand_{label}",
            (side * 0.94, -0.18, 0.70),
            (side * 0.94, -0.42, 0.70),
            f"Hand.{label}",
            deform=False,
        )

    add_edit_bone(bones, "Socket_Back", (0, 0.34, 1.46), (0, 0.68, 1.46), "Spine", deform=False)
    add_edit_bone(bones, "Socket_Head", (0, 0, 2.67), (0, 0, 2.94), "Head", deform=False)
    bpy.ops.object.mode_set(mode="OBJECT")

    # Bone parenting keeps the toy-like modular forms crisp and avoids bad automatic weights.
    rig.parent = root
    for obj in list(root.children):
        if obj == rig or obj.type != "MESH":
            continue
        world_matrix = obj.matrix_world.copy()
        obj.parent = rig
        obj.parent_type = "BONE"
        obj.parent_bone = bone_for_part(obj.name)
        obj.matrix_world = world_matrix

    return rig


def reset_pose(rig) -> None:
    """Reset animated bones before writing one complete key pose."""
    for pose_bone in rig.pose.bones:
        pose_bone.rotation_mode = "XYZ"
        pose_bone.rotation_euler = (0, 0, 0)
        pose_bone.location = (0, 0, 0)
        pose_bone.scale = (1, 1, 1)


def key_pose(rig, frame, rotations=None, locations=None) -> None:
    """Write one full pose so clips interpolate without inherited leftovers."""
    reset_pose(rig)
    rotations = rotations or {}
    locations = locations or {}
    for bone_name, rotation in rotations.items():
        rig.pose.bones[bone_name].rotation_euler = rotation
    for bone_name, location in locations.items():
        rig.pose.bones[bone_name].location = location
    for pose_bone in rig.pose.bones:
        pose_bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=pose_bone.name)
        pose_bone.keyframe_insert(data_path="location", frame=frame, group=pose_bone.name)


def make_action(rig, name, poses) -> None:
    """Create one named in-place action compatible with Three.AnimationMixer."""
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = action
    for frame, rotations, locations in poses:
        key_pose(rig, frame, rotations, locations)
    rig.animation_data.action = None


def build_runtime_actions(rig) -> None:
    """Author the three minimum clips needed to begin RPG controls."""
    idle = [
        (0, {"Head": (0, 0, radians(-2)), "UpperArm.L": (0, 0, radians(-4)), "UpperArm.R": (0, 0, radians(4))}, {"Spine": (0, 0, 0)}),
        (20, {"Head": (radians(2), 0, radians(3)), "UpperArm.L": (radians(2), 0, radians(-3)), "UpperArm.R": (radians(-2), 0, radians(3))}, {"Spine": (0, 0, 0.025)}),
        (40, {"Head": (0, 0, radians(-2)), "UpperArm.L": (0, 0, radians(-4)), "UpperArm.R": (0, 0, radians(4))}, {"Spine": (0, 0, 0)}),
    ]
    run = [
        (0, {"UpperArm.L": (radians(-28), 0, 0), "UpperArm.R": (radians(28), 0, 0), "Thigh.L": (radians(34), 0, 0), "Thigh.R": (radians(-34), 0, 0)}, {"Pelvis": (0, 0, 0)}),
        (6, {"UpperArm.L": (0, 0, 0), "UpperArm.R": (0, 0, 0), "Thigh.L": (0, 0, 0), "Thigh.R": (0, 0, 0)}, {"Pelvis": (0, 0, 0.045)}),
        (12, {"UpperArm.L": (radians(28), 0, 0), "UpperArm.R": (radians(-28), 0, 0), "Thigh.L": (radians(-34), 0, 0), "Thigh.R": (radians(34), 0, 0)}, {"Pelvis": (0, 0, 0)}),
        (18, {"UpperArm.L": (0, 0, 0), "UpperArm.R": (0, 0, 0), "Thigh.L": (0, 0, 0), "Thigh.R": (0, 0, 0)}, {"Pelvis": (0, 0, 0.045)}),
        (24, {"UpperArm.L": (radians(-28), 0, 0), "UpperArm.R": (radians(28), 0, 0), "Thigh.L": (radians(34), 0, 0), "Thigh.R": (radians(-34), 0, 0)}, {"Pelvis": (0, 0, 0)}),
    ]
    attack = [
        (0, {"UpperArm.R": (0, 0, 0), "Forearm.R": (0, 0, 0), "Spine": (0, 0, 0)}, {}),
        (5, {"UpperArm.R": (radians(-95), 0, radians(-18)), "Forearm.R": (radians(-38), 0, 0), "Spine": (0, 0, radians(-8))}, {}),
        (10, {"UpperArm.R": (radians(58), 0, radians(12)), "Forearm.R": (radians(25), 0, 0), "Spine": (radians(5), 0, radians(12))}, {}),
        (14, {"UpperArm.R": (radians(42), 0, radians(8)), "Forearm.R": (radians(12), 0, 0), "Spine": (radians(3), 0, radians(7))}, {}),
        (18, {"UpperArm.R": (0, 0, 0), "Forearm.R": (0, 0, 0), "Spine": (0, 0, 0)}, {}),
    ]
    make_action(rig, "Idle", idle)
    make_action(rig, "Run", run)
    make_action(rig, "Attack", attack)
    rig.animation_data.action = bpy.data.actions.get("Idle")
    bpy.context.scene.frame_set(0)


def look_at(obj, target=(0, 0, 1.43)) -> None:
    """Point a camera or light at the middle of the compact hero."""
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def setup_preview_scene():
    """Create neutral studio lighting and a fixed orthographic camera."""
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_percentage = 100
    scene.render.use_stamp = False
    scene.view_settings.look = "AgX - Medium High Contrast"

    world = scene.world or bpy.data.worlds.new("PreviewWorld")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.62, 0.64, 0.66, 1)
    background.inputs["Strength"].default_value = 0.72

    ground_material = make_material("Preview_Ground", (0.38, 0.4, 0.42, 1))
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.012))
    ground = bpy.context.object
    ground.name = "PreviewGround"
    ground.data.materials.append(ground_material)

    bpy.ops.object.camera_add(location=(0, -7, 1.45))
    camera = bpy.context.object
    camera.name = "PreviewCamera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 3.45
    camera.data.lens = 52
    look_at(camera)
    scene.camera = camera

    lights = [
        ("KeyLight", (-4.5, -4.5, 6.5), 900, 4.5),
        ("FillLight", (4.0, -2.5, 4.0), 560, 3.8),
        ("RimLight", (0.0, 4.0, 5.5), 720, 3.2),
    ]
    for name, location, power, size in lights:
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = power
        light.data.shape = "DISK"
        light.data.size = size
        look_at(light)

    return camera


def export_hero(root) -> None:
    """Export only the hero hierarchy, leaving preview helpers out of the GLB."""
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for child in root.children_recursive:
        child.select_set(True)
    bpy.context.view_layer.objects.active = root
    export_options = {
        "filepath": str(GLB_PATH),
        "export_format": "GLB",
        "use_selection": True,
        "export_yup": True,
    }
    if BUILD_MODE == "runtime":
        export_options.update(
            {
                "export_animations": True,
                "export_animation_mode": "ACTIONS",
                "export_anim_slide_to_zero": True,
                "export_force_sampling": True,
            }
        )
    bpy.ops.export_scene.gltf(
        **export_options,
    )


def render_previews(camera) -> None:
    """Render four fixed angles for the graybox approval sheet."""
    views = {
        "front": (0, -7, 1.45),
        "side": (7, 0, 1.45),
        "back": (0, 7, 1.45),
        "three-quarter": (5, -5, 1.45),
    }
    for name, location in views.items():
        camera.location = location
        look_at(camera)
        preview_path = PREVIEW_DIR / f"{ASSET_STEM}-{name}.png"
        bpy.context.scene.render.filepath = str(preview_path)
        bpy.ops.render.render(write_still=True)
        strip_png_metadata(preview_path)


def main() -> None:
    """Generate every editable, runtime and preview graybox artifact."""
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    clear_scene()
    root = build_hero()
    if BUILD_MODE == "runtime":
        rig = build_runtime_rig(root)
        build_runtime_actions(rig)
    camera = setup_preview_scene()
    export_hero(root)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    render_previews(camera)
    print(f"BOVINE_CREATED mode={BUILD_MODE} blend={BLEND_PATH} glb={GLB_PATH}")


if __name__ == "__main__":
    main()
