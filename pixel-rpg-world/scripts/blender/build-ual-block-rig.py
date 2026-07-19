"""用 UAL 原生骨架生成刚性方块人和稳定的右手武器挂点。"""

from pathlib import Path
import sys

import bpy
from mathutils import Matrix, Vector
import numpy as np


PRODUCTION_ACTIONS = {
    "Idle_Loop",
    "Sprint_Loop",
    "Roll",
    "Sword_Attack",
    "Sword_Attack_RM",
    "Spell_Simple_Enter",
    "Spell_Simple_Idle_Loop",
    "Spell_Simple_Shoot",
    "Spell_Simple_Exit",
    "Hit_Chest",
    "Death01",
}


def fail(message: str) -> None:
    raise RuntimeError(f"ual block rig: {message}")


def args_after_separator() -> list[str]:
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def material(name: str, color: tuple[float, float, float, float]):
    value = bpy.data.materials.new(name)
    value.diffuse_color = color
    value.use_nodes = True
    shader = value.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Metallic"].default_value = 0
    shader.inputs["Roughness"].default_value = 0.9
    return value


def add_rigid_box(
    armature,
    name: str,
    bone_name: str,
    center: Vector,
    size: tuple[float, float, float],
    recipe,
    direction: Vector | None = None,
):
    """方块全部顶点只归属一根骨头，动作中不会产生软体扭曲。"""
    if bone_name not in armature.data.bones:
        fail(f"missing bone {bone_name}")
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    box = bpy.context.object
    box.name = name
    box.dimensions = size
    if direction is not None and direction.length_squared > 0:
        box.rotation_mode = "QUATERNION"
        box.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
    box.data.materials.append(recipe)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    box.parent = armature
    group = box.vertex_groups.new(name=bone_name)
    group.add(range(len(box.data.vertices)), 1, "REPLACE")
    modifier = box.modifiers.new(name="UAL Armature", type="ARMATURE")
    modifier.object = armature
    return box


def add_bone_segment(
    armature,
    name: str,
    bone_name: str,
    width: float,
    depth: float,
    recipe,
    inset: float,
):
    bone = armature.data.bones[bone_name]
    direction = bone.tail_local - bone.head_local
    axis = direction.normalized()
    start = bone.head_local + axis * inset
    end = bone.tail_local - axis * inset
    return add_rigid_box(
        armature,
        name,
        bone_name,
        (start + end) * 0.5,
        (width, depth, (end - start).length),
        recipe,
        direction,
    )


def add_weapon_bone(armature) -> None:
    """武器挂点跟随右手；近砍动作会再离线烘焙成稳定挥砍平面。"""
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="EDIT")
    hand = armature.data.edit_bones["hand_r"]
    direction = (hand.tail - hand.head).normalized()
    socket = armature.data.edit_bones.new("socket.weapon.right")
    socket.head = hand.head.copy()
    socket.tail = socket.head + direction * 0.68
    socket.parent = hand
    socket.use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")


def bake_weapon_swing(armature, action) -> None:
    """右手锁住剑根，肩到手的方向负责生成稳定的平面剑尖。"""
    armature.animation_data.action = action
    frames = range(int(action.frame_range[0]), int(round(action.frame_range[1])) + 1)
    samples = []
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        hand = armature.pose.bones["hand_r"]
        shoulder = armature.pose.bones["upperarm_r"].head
        base = hand.head.copy()
        outward = (base - shoulder).normalized()
        samples.append((frame, base, base + outward * 0.68))

    # 剑根和剑尖共同拟合，保证整把剑都落在同一挥砍平面。
    points = np.asarray([tuple(point) for _, base, tip in samples for point in (base, tip)])
    _, _, basis = np.linalg.svd(points - points.mean(axis=0), full_matrices=False)
    normal = Vector(basis[-1]).normalized()
    socket = armature.pose.bones["socket.weapon.right"]
    socket.rotation_mode = "QUATERNION"

    for frame, base, tip in samples:
        raw_axis = (tip - base).normalized()
        blade_axis = (raw_axis - normal * raw_axis.dot(normal)).normalized()
        side_axis = blade_axis.cross(normal).normalized()
        transform = Matrix((side_axis, blade_axis, normal)).transposed().to_4x4()
        transform.translation = base

        bpy.context.scene.frame_set(frame)
        socket.matrix = transform
        socket.keyframe_insert("location", frame=frame, group=socket.name)
        socket.keyframe_insert("rotation_quaternion", frame=frame, group=socket.name)
        socket.keyframe_insert("scale", frame=frame, group=socket.name)

    # 逐帧采样配合线性插值，杜绝贝塞尔曲线造成剑的额外晃动。
    for layer in action.layers:
        for strip in layer.strips:
            for channel_bag in strip.channelbags:
                for curve in channel_bag.fcurves:
                    if f'pose.bones["{socket.name}"]' in curve.data_path:
                        for point in curve.keyframe_points:
                            point.interpolation = "LINEAR"


def add_weapon(armature, steel, blade):
    """剑网格完全归属武器骨骼，剑身局部 Y 轴就是剑尖方向。"""
    bone_name = "socket.weapon.right"
    bone = armature.data.bones[bone_name]
    direction = (bone.tail_local - bone.head_local).normalized()
    sword = add_rigid_box(
        armature,
        "block-sword",
        bone_name,
        bone.head_local + direction * 0.34,
        (0.08, 0.045, 0.68),
        blade,
        direction,
    )
    guard = add_rigid_box(
        armature,
        "block-sword-guard",
        bone_name,
        bone.head_local + direction * 0.035,
        (0.22, 0.065, 0.07),
        steel,
        direction,
    )
    return sword, guard


def main() -> None:
    args = args_after_separator()
    if len(args) not in (2, 3):
        fail("pass source GLB, output GLB and optional production mode")
    source_file = Path(args[0]).resolve()
    output_file = Path(args[1]).resolve()
    mode = args[2] if len(args) == 3 else "lab"
    if mode not in ("lab", "production"):
        fail(f"unknown mode {mode}")

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source_file))
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    if len(armatures) != 1:
        fail(f"expected one armature, got {len(armatures)}")
    armature = armatures[0]
    armature.name = "UAL_Block_Rig"

    action_names = PRODUCTION_ACTIONS if mode == "production" else {"Sword_Attack"}
    actions = []
    for name in action_names:
        action = bpy.data.actions.get(name)
        if action is None:
            fail(f"missing {name}")
        actions.append(action)
    if armature.animation_data is None:
        armature.animation_data_create()
    for track in list(armature.animation_data.nla_tracks):
        armature.animation_data.nla_tracks.remove(track)
    for other in list(bpy.data.actions):
        if other.name not in action_names:
            bpy.data.actions.remove(other)
    bpy.context.scene.render.fps = 24
    bpy.context.scene.frame_start = min(int(action.frame_range[0]) for action in actions)
    bpy.context.scene.frame_end = max(int(round(action.frame_range[1])) for action in actions)
    bpy.context.scene.frame_set(0)

    add_weapon_bone(armature)
    for action_name in ("Sword_Attack", "Sword_Attack_RM"):
        action = bpy.data.actions.get(action_name)
        if action is not None:
            bake_weapon_swing(armature, action)
    armature.animation_data.action = bpy.data.actions.get(
        "Idle_Loop" if mode == "production" else "Sword_Attack"
    )

    # 原模型只用于对照页；导出的方块资产不携带任何源网格。
    for obj in list(bpy.context.scene.objects):
        if obj.type == "MESH":
            bpy.data.objects.remove(obj, do_unlink=True)

    skin = material("block-skin", (0.67, 0.41, 0.29, 1))
    shirt = material("block-shirt", (0.05, 0.24, 0.34, 1))
    pants = material("block-pants", (0.025, 0.09, 0.14, 1))
    boots = material("block-boots", (0.18, 0.08, 0.04, 1))
    steel = material("block-steel", (0.32, 0.38, 0.42, 1))
    blade = material("block-blade", (0.72, 0.88, 0.93, 1))

    bones = armature.data.bones
    # 经典方块人比例：8 像素头、12 像素躯干，头约占总身高四分之一。
    add_rigid_box(armature, "block-head", "Head", Vector((0, -0.005, 1.72)), (0.48, 0.48, 0.48), skin)
    add_rigid_box(armature, "block-torso", "spine_03", Vector((0, 0.01, 1.20)), (0.52, 0.28, 0.62), shirt)

    for side in ("l", "r"):
        add_bone_segment(armature, f"block-upper-arm-{side}", f"upperarm_{side}", 0.22, 0.22, shirt, -0.015)
        add_bone_segment(armature, f"block-lower-arm-{side}", f"lowerarm_{side}", 0.22, 0.22, skin, -0.015)
        add_bone_segment(armature, f"block-upper-leg-{side}", f"thigh_{side}", 0.22, 0.22, pants, -0.02)
        add_bone_segment(armature, f"block-lower-leg-{side}", f"calf_{side}", 0.22, 0.22, pants, -0.02)
        foot = bones[f"foot_{side}"]
        add_rigid_box(
            armature,
            f"block-foot-{side}",
            f"foot_{side}",
            Vector((foot.head_local.x, foot.head_local.y - 0.07, 0.09)),
            (0.22, 0.28, 0.16),
            boots,
        )

    sword, guard = add_weapon(armature, steel, blade)

    output_file.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    for obj in bpy.context.scene.objects:
        if obj.name.startswith("block-"):
            obj.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(output_file),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_skins=True,
        export_morph=False,
        export_lights=False,
        export_cameras=False,
    )
    print(
        f"Generated {output_file.name}: armature={armature.name}, "
        f"mode={mode}, actions={len(actions)}"
    )


main()
