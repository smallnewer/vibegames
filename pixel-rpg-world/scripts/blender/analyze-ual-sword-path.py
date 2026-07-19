"""量化 U41 各手骨轴与当前剑尖轨迹的共面程度。"""

from pathlib import Path
import sys

import bpy
from mathutils import Vector
import numpy as np


def fit_plane(points):
    values = np.asarray(points)
    center = values.mean(axis=0)
    _, _, basis = np.linalg.svd(values - center, full_matrices=False)
    normal = basis[-1]
    distance = np.abs((values - center) @ normal)
    spread = np.linalg.norm(np.ptp(values, axis=0))
    return normal, float(np.sqrt(np.mean(distance ** 2))), float(distance.max()), spread


def main():
    if "--" not in sys.argv or len(sys.argv[sys.argv.index("--") + 1 :]) != 1:
        raise RuntimeError("pass block rig GLB")
    asset = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(asset))

    armature = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    action = bpy.data.actions.get("Sword_Attack")
    if armature.animation_data is None:
        armature.animation_data_create()
    armature.animation_data.action = action
    for track in armature.animation_data.nla_tracks:
        track.mute = True

    frames = range(int(action.frame_range[0]), int(action.frame_range[1]) + 1)
    socket = armature.pose.bones.get("socket.weapon.right")
    if socket is None:
        raise RuntimeError("missing socket.weapon.right")
    current_tips = []
    current_directions = []
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        base = armature.matrix_world @ socket.head
        direction = (armature.matrix_world.to_3x3() @ socket.matrix.to_3x3() @ Vector((0, 1, 0))).normalized()
        current_tips.append(tuple(base + direction * 0.68))
        current_directions.append(tuple(direction))
    normal, rms, maximum, spread = fit_plane(current_tips)
    out_angles = np.degrees(np.arcsin(np.clip(np.abs(np.asarray(current_directions) @ normal), 0, 1)))
    print(
        f"current sword: plane-rms={rms:.4f}, max-distance={maximum:.4f}, "
        f"relative={rms / max(spread, 1e-6):.4f}, max-blade-out={out_angles.max():.1f}deg"
    )

    results = []
    for hand_name in ("hand_l", "hand_r"):
        for axis_name, local_axis in (
            ("+X", Vector((1, 0, 0))),
            ("-X", Vector((-1, 0, 0))),
            ("+Y", Vector((0, 1, 0))),
            ("-Y", Vector((0, -1, 0))),
            ("+Z", Vector((0, 0, 1))),
            ("-Z", Vector((0, 0, -1))),
        ):
            tips = []
            directions = []
            for frame in frames:
                bpy.context.scene.frame_set(frame)
                pose = armature.pose.bones[hand_name]
                base = armature.matrix_world @ pose.tail
                direction = (armature.matrix_world.to_3x3() @ pose.matrix.to_3x3() @ local_axis).normalized()
                tips.append(tuple(base + direction * 0.68))
                directions.append(tuple(direction))
            normal, rms, maximum, spread = fit_plane(tips)
            out_angles = np.degrees(np.arcsin(np.clip(np.abs(np.asarray(directions) @ normal), 0, 1)))
            results.append((rms / max(spread, 1e-6), out_angles.max(), hand_name, axis_name, rms, maximum))

    for ratio, angle, hand, axis, rms, maximum in sorted(results):
        print(
            f"{hand} {axis}: plane-rms={rms:.4f}, max-distance={maximum:.4f}, "
            f"relative={ratio:.4f}, max-blade-out={angle:.1f}deg"
        )


main()
