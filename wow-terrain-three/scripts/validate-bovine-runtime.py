"""Round-trip validation for the colored, rigged bovine runtime GLB."""

from pathlib import Path

import bpy
from mathutils import Vector


ROOT_DIR = Path(__file__).resolve().parents[1]
GLB_PATH = ROOT_DIR / "public" / "models" / "bovine-hero-runtime.glb"
REQUIRED_BONES = {
    "Root",
    "Pelvis",
    "Spine",
    "Head",
    "UpperArm.L",
    "UpperArm.R",
    "Forearm.L",
    "Forearm.R",
    "Hand.L",
    "Hand.R",
    "Thigh.L",
    "Thigh.R",
    "Foot.L",
    "Foot.R",
    "Socket_Hand_L",
    "Socket_Hand_R",
    "Socket_Back",
    "Socket_Head",
}
REQUIRED_ACTIONS = {"Idle", "Run", "Attack"}


def main() -> None:
    """Import a clean GLB and verify runtime structure, materials and clips."""
    assert GLB_PATH.exists() and GLB_PATH.stat().st_size > 0, f"Missing GLB: {GLB_PATH}"
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    bpy.ops.import_scene.gltf(filepath=str(GLB_PATH))

    objects = list(bpy.context.scene.objects)
    meshes = [
        obj
        for obj in objects
        if obj.type == "MESH" and all(collection.name != "glTF_not_exported" for collection in obj.users_collection)
    ]
    armatures = [obj for obj in objects if obj.type == "ARMATURE"]
    assert len(meshes) >= 60, f"Expected at least 60 meshes, got {len(meshes)}"
    assert len(armatures) == 1, f"Expected one armature, got {len(armatures)}"

    bone_names = {bone.name for bone in armatures[0].data.bones}
    missing_bones = REQUIRED_BONES - bone_names
    assert not missing_bones, f"Missing bones: {sorted(missing_bones)}"

    material_names = {material.name for material in bpy.data.materials}
    assert len(material_names) >= 9, f"Expected role materials, got {sorted(material_names)}"
    assert len(bpy.data.images) >= 7, f"Expected embedded textures, got {len(bpy.data.images)}"

    action_names = {action.name.split("|")[-1] for action in bpy.data.actions}
    missing_actions = REQUIRED_ACTIONS - action_names
    assert not missing_actions, f"Missing actions: {sorted(missing_actions)} from {sorted(action_names)}"

    points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    minimum = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
    maximum = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
    dimensions = maximum - minimum
    assert 1.4 <= dimensions.x <= 2.8, f"Unexpected width: {dimensions.x:.3f}"
    assert 2.2 <= dimensions.z <= 3.2, f"Unexpected height: {dimensions.z:.3f}"
    assert -0.03 <= minimum.z <= 0.03, f"Feet are not grounded: {minimum.z:.3f}"

    print(
        "BOVINE_RUNTIME_VALID"
        f" meshes={len(meshes)}"
        f" bones={len(bone_names)}"
        f" materials={len(material_names)}"
        f" images={len(bpy.data.images)}"
        f" actions={','.join(sorted(action_names))}"
        f" size={dimensions.x:.3f}x{dimensions.y:.3f}x{dimensions.z:.3f}"
    )


if __name__ == "__main__":
    main()
