import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";

export interface RoomArtMetrics {
  readonly moduleKinds: number;
  readonly dressingCount: number;
  readonly lavaAreaCount: number;
  readonly depthLayers: number;
}

// 房间美术只管理表现，不参与碰撞和玩法判定。
export interface RoomArt {
  readonly root: TransformNode;
  readonly shadowCasters: readonly AbstractMesh[];
  readonly metrics: RoomArtMetrics;
  update(delta: number): void;
  dispose(): void;
}
