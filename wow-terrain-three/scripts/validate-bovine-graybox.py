"""Import the exported hero GLB and validate its graybox contract."""

from pathlib import Path

import bpy
from mathutils import Vector


ROOT_DIR = Path(__file__).resolve().parents[1]
GLB_PATH = ROOT_DIR / "public" / "models" / "bovine-hero-graybox.glb"
REQUIRED_PREFIXES = (
    "Head_Main",
    "Face_Muzzle",
    "Body_Torso",
    "Arm_L",
    "Arm_R",
    "Hand_L",
    "Hand_R",
    "Leg_L",
    "Leg_R",
    "Hoof_L",
    "Hoof_R",
    "Horn_L",
    "Horn_R",
    "Ear_L",
    "Ear_R",
    "Mane_",
    "Cloth_Vest",
    "Cloth_Waist",
    "Gear_Belt",
    "Gear_Bracer_L",
    "Gear_Bracer_R",
)


def main() -> None:
    """Check names, scale and ground alignment after a real GLB round trip."""
    assert GLB_PATH.exists() and GLB_PATH.stat().st_size > 0, f"Missing GLB: {GLB_PATH}"
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(GLB_PATH))

    objects = list(bpy.context.scene.objects)
    meshes = [obj for obj in objects if obj.type == "MESH"]
    names = {obj.name for obj in objects}
    missing = [prefix for prefix in REQUIRED_PREFIXES if not any(name.startswith(prefix) for name in names)]
    assert not missing, f"Missing required parts: {missing}"
    assert len(meshes) >= 30, f"Expected at least 30 meshes, got {len(meshes)}"

    points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    minimum = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
    maximum = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
    dimensions = maximum - minimum
    assert 1.4 <= dimensions.x <= 2.8, f"Unexpected width: {dimensions.x:.3f}"
    assert 2.2 <= dimensions.z <= 3.2, f"Unexpected height: {dimensions.z:.3f}"
    assert -0.03 <= minimum.z <= 0.03, f"Feet are not grounded: {minimum.z:.3f}"
    print(
        "GRAYBOX_VALID"
        f" meshes={len(meshes)}"
        f" width={dimensions.x:.3f}"
        f" height={dimensions.z:.3f}"
        f" depth={dimensions.y:.3f}"
        f" floor={minimum.z:.3f}"
    )


if __name__ == "__main__":
    main()
