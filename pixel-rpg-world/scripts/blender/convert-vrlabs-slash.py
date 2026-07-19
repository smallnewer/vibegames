import sys
from pathlib import Path

import bpy
import io_scene_fbx.import_fbx as fbx_importer


# 把上游 FBX 收敛成浏览器只需要的单网格 GLB。
def main() -> None:
    separator = sys.argv.index("--")
    source = Path(sys.argv[separator + 1]).resolve()
    target = Path(sys.argv[separator + 2]).resolve()

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    # Blender 5.1 导入旧 FBX 灯光会报错；本资产只需要网格，直接跳过灯光。
    fbx_importer.blen_read_light = lambda *args, **kwargs: None
    bpy.ops.import_scene.fbx(filepath=str(source))

    meshes = [item for item in bpy.context.scene.objects if item.type == "MESH"]
    if len(meshes) != 1:
        raise RuntimeError(f"Expected one slash mesh, got {len(meshes)}")

    slash = meshes[0]
    slash.name = "slash-circle"
    bpy.ops.object.select_all(action="DESELECT")
    slash.select_set(True)
    bpy.context.view_layer.objects.active = slash
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    target.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(target),
        export_format="GLB",
        use_selection=True,
    )


main()
