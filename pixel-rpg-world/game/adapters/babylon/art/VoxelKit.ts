import type { Material } from "@babylonjs/core/Materials/material";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";

export interface VoxelBox {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly material: Material;
  readonly rotationY?: number;
}

// 同材质方块合成一个网格，房间细节增加时不线性增加 draw call。
export class VoxelKit {
  private readonly groups = new Map<Material, Mesh[]>();

  constructor(private readonly scene: Scene) {}

  box(value: VoxelBox): void {
    const mesh = MeshBuilder.CreateBox(
      value.name,
      { width: value.width, height: value.height, depth: value.depth },
      this.scene,
    );
    mesh.position.set(value.x, value.y, value.z);
    mesh.rotation.y = value.rotationY ?? 0;
    mesh.material = value.material;
    const group = this.groups.get(value.material) ?? [];
    group.push(mesh);
    this.groups.set(value.material, group);
  }

  finish(name: string): Mesh[] {
    const meshes: Mesh[] = [];
    let groupIndex = 0;
    for (const group of this.groups.values()) {
      const merged = group.length === 1
        ? group[0]
        : Mesh.MergeMeshes(group, true, true);
      if (!merged) continue;
      merged.name = `${name}-${groupIndex}`;
      merged.receiveShadows = true;
      meshes.push(merged);
      groupIndex += 1;
    }
    this.groups.clear();
    return meshes;
  }
}
