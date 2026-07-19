"""离线渲染 U41 原模型与方块绑定模型的关键帧。"""

from pathlib import Path
import sys

import bpy
from mathutils import Vector


def args_after_separator() -> list[str]:
    if "--" not in sys.argv:
        return []
    return sys.argv[sys.argv.index("--") + 1 :]


def import_asset(path: Path):
    before = set(bpy.context.scene.objects)
    before_actions = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects = set(bpy.context.scene.objects) - before
    actions = set(bpy.data.actions) - before_actions
    armature = next(obj for obj in objects if obj.type == "ARMATURE")
    return objects, actions, armature


def activate_action(armature, actions) -> None:
    action = next(value for value in actions if value.name.startswith("Sword_Attack"))
    if armature.animation_data is None:
        armature.animation_data_create()
    for track in armature.animation_data.nla_tracks:
        track.mute = True
    armature.animation_data.action = action


def move_roots(objects, x: float) -> None:
    for obj in objects:
        if obj.parent is None:
            obj.location.x += x


def look_at(camera, target: Vector) -> None:
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()


def main() -> None:
    args = args_after_separator()
    if len(args) != 3:
        raise RuntimeError("pass source GLB, block GLB, and output directory")
    source_file, block_file, output_dir = map(lambda value: Path(value).resolve(), args)
    output_dir.mkdir(parents=True, exist_ok=True)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    source_objects, source_actions, source_armature = import_asset(source_file)
    block_objects, block_actions, block_armature = import_asset(block_file)
    activate_action(source_armature, source_actions)
    activate_action(block_armature, block_actions)
    move_roots(source_objects, -1.15)
    move_roots(block_objects, 1.15)

    bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, -0.01))
    ground = bpy.context.object
    ground_material = bpy.data.materials.new("proof-ground")
    ground_material.diffuse_color = (0.055, 0.06, 0.07, 1)
    ground.data.materials.append(ground_material)

    bpy.ops.object.light_add(type="AREA", location=(-3, -4, 6))
    key = bpy.context.object
    key.data.energy = 900
    key.data.shape = "DISK"
    key.data.size = 5
    look_at(key, Vector((0, 0, 1)))
    bpy.ops.object.light_add(type="AREA", location=(4, 1, 4))
    fill = bpy.context.object
    fill.data.energy = 550
    fill.data.size = 4
    look_at(fill, Vector((0, 0, 1)))

    bpy.ops.object.camera_add(location=(0, -6.2, 1.65))
    camera = bpy.context.object
    camera.data.lens = 46
    look_at(camera, Vector((0, 0, 1.05)))
    bpy.context.scene.camera = camera

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.018, 0.022, 0.03)

    for frame in (0, 8, 18, 28, 36):
        scene.frame_set(frame)
        scene.render.filepath = str(output_dir / f"ual-block-rig-frame-{frame:02}.png")
        bpy.ops.render.render(write_still=True)
        print(f"Rendered frame {frame}: {scene.render.filepath}")


main()
