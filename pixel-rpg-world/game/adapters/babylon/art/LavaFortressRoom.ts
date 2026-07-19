import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { DungeonSectionDef } from "../../../dungeon/DungeonDefinitions";
import type { ArtMaterialLibrary } from "./ArtMaterialLibrary";
import type { RoomArt, RoomArtMetrics } from "./RoomArt";
import { VoxelKit } from "./VoxelKit";

export const LAVA_ROOM_MODULES = [
  "floor",
  "stair",
  "bridge",
  "wall",
  "arch",
  "pillar",
  "parapet",
  "door_frame",
] as const;

export const LAVA_ROOM_METRICS: RoomArtMetrics = {
  moduleKinds: LAVA_ROOM_MODULES.length,
  dressingCount: 64,
  lavaAreaCount: 2,
  depthLayers: 3,
};

type Kit = VoxelKit;
type Art = ArtMaterialLibrary;

function addFloor(kit: Kit, art: Art): void {
  // 左右平台夹住狭长主桥，熔岩从桥两侧露出。
  kit.box({ name: "left-floor", x: -6.6, y: -0.35, z: 0, width: 4.8, height: 0.7, depth: 8.8, material: art.carvedStone });
  kit.box({ name: "right-floor", x: 6.6, y: -0.35, z: 0, width: 4.8, height: 0.7, depth: 8.8, material: art.carvedStone });
  kit.box({ name: "bridge", x: 0, y: -0.28, z: 0, width: 8.6, height: 0.56, depth: 3.2, material: art.roughBasalt });
  for (let x = -3.5; x <= 3.5; x += 1) {
    kit.box({ name: "bridge-rib", x, y: 0.035, z: 0, width: 0.12, height: 0.07, depth: 3.28, material: art.agedMetal });
  }
  for (const x of [-2.7, 0, 2.7]) {
    kit.box({ name: "bridge-support", x, y: -1.35, z: 0, width: 0.72, height: 2.7, depth: 2.45, material: art.roughBasalt });
    kit.box({ name: "bridge-support-cap", x, y: -0.18, z: 0, width: 1.2, height: 0.28, depth: 2.9, material: art.carvedStone });
  }
  for (const x of [-2.8, -1.4, 0, 1.4, 2.8]) {
    kit.box({ name: "bridge-rune", x, y: 0.075, z: 0, width: 0.42, height: 0.05, depth: 0.42, rotationY: Math.PI / 4, material: art.runeCrystal });
  }
  kit.box({ name: "lava-north", x: 0, y: -0.72, z: 3.68, width: 18, height: 0.12, depth: 3.25, material: art.lava });
  kit.box({ name: "lava-south", x: 0, y: -0.72, z: -3.68, width: 18, height: 0.12, depth: 3.25, material: art.lava });
}

function addArchitecture(kit: Kit, art: Art): void {
  // 背景墙分段并做破损轮廓，避免一整块平墙。
  for (let index = 0; index < 9; index += 1) {
    const height = [3.8, 4.6, 4.2, 5.2, 4.8, 5.4, 4.1, 4.7, 3.9][index];
    kit.box({ name: "back-wall", x: -8 + index * 2, y: height / 2 - 0.15, z: 5.55, width: 1.92, height, depth: 0.72, material: index % 3 === 0 ? art.roughBasalt : art.carvedStone });
  }
  kit.box({ name: "left-side-wall", x: -8.72, y: 1.45, z: 2.7, width: 0.58, height: 3.6, depth: 5.2, material: art.roughBasalt });
  kit.box({ name: "right-side-wall", x: 8.72, y: 1.45, z: 2.7, width: 0.58, height: 3.6, depth: 5.2, material: art.roughBasalt });
  kit.box({ name: "lava-fall-left", x: -5.55, y: 1.4, z: 5.12, width: 0.86, height: 3.2, depth: 0.16, material: art.lava });
  kit.box({ name: "lava-fall-right", x: 5.55, y: 1.1, z: 5.1, width: 0.72, height: 2.6, depth: 0.16, material: art.lava });
  for (const x of [-5.55, 5.55]) {
    kit.box({ name: "lava-fall-lip", x, y: 3.05, z: 5.02, width: 1.25, height: 0.32, depth: 0.55, material: art.carvedStone });
  }

  for (const x of [-7.2, -3.6, 0, 3.6, 7.2]) {
    kit.box({ name: "pillar-base", x, y: 0.24, z: 4.75, width: 1.25, height: 0.48, depth: 1.25, material: art.carvedStone });
    kit.box({ name: "pillar", x, y: 2.05, z: 4.75, width: 0.82, height: 3.65, depth: 0.82, material: art.roughBasalt });
    kit.box({ name: "pillar-cap", x, y: 3.96, z: 4.75, width: 1.18, height: 0.28, depth: 1.18, material: art.carvedStone });
  }

  // 中央高拱门构成画面焦点，三层方块轮廓保持像素感。
  for (const x of [-1.85, 1.85]) {
    kit.box({ name: "arch-leg", x, y: 2.15, z: 4.32, width: 0.8, height: 4.3, depth: 1.15, material: art.carvedStone });
    kit.box({ name: "arch-step", x: x * 0.82, y: 4.05, z: 4.32, width: 0.92, height: 0.75, depth: 1.15, material: art.carvedStone });
  }
  kit.box({ name: "arch-crown", x: 0, y: 4.55, z: 4.32, width: 3.45, height: 0.72, depth: 1.15, material: art.carvedStone });
  kit.box({ name: "gate", x: 0, y: 1.75, z: 4.18, width: 2.8, height: 3.5, depth: 0.2, material: art.agedMetal });
  for (let x = -1.15; x <= 1.15; x += 0.46) {
    kit.box({ name: "gate-bar", x, y: 1.75, z: 4.02, width: 0.11, height: 3.45, depth: 0.12, material: art.runeCrystal });
  }
}

function addEdgesAndStairs(kit: Kit, art: Art): void {
  for (const z of [-1.88, 1.88]) {
    for (let x = -3.8; x <= 3.8; x += 1.25) {
      kit.box({ name: "bridge-parapet", x, y: 0.34, z, width: 0.78, height: 0.68, depth: 0.34, material: art.carvedStone });
    }
  }
  for (const x of [-8.25, 8.25]) {
    for (let z = -3.6; z <= 3.6; z += 1.2) {
      kit.box({ name: "platform-parapet", x, y: 0.43, z, width: 0.38, height: 0.86, depth: 0.76, material: art.roughBasalt });
    }
  }
  for (let step = 0; step < 4; step += 1) {
    kit.box({ name: "altar-stair", x: 6.55 - step * 0.48, y: step * 0.12, z: 3.45, width: 0.52, height: 0.24 + step * 0.24, depth: 2.1, material: art.carvedStone });
  }
  kit.box({ name: "altar", x: 7.05, y: 0.32, z: 3.45, width: 1.75, height: 0.64, depth: 2.3, material: art.roughBasalt });
  kit.box({ name: "altar-rune", x: 7.05, y: 0.68, z: 3.45, width: 0.92, height: 0.08, depth: 1.3, material: art.runeCrystal });
}

function addDressing(kit: Kit, art: Art): void {
  // 火盆、锁链、木箱、碎石和尖桩负责把结构变成“住过人的地下城”。
  for (const [x, z] of [[-6.5, 3.5], [-3.6, 1.65], [3.6, 1.65], [6.4, -3.35]] as const) {
    kit.box({ name: "brazier-post", x, y: 0.65, z, width: 0.22, height: 1.3, depth: 0.22, material: art.agedMetal });
    kit.box({ name: "brazier-bowl", x, y: 1.32, z, width: 0.72, height: 0.18, depth: 0.72, material: art.agedMetal });
    kit.box({ name: "brazier-fire", x, y: 1.57, z, width: 0.36, height: 0.5, depth: 0.36, material: art.runeCrystal });
  }
  for (const x of [-4.92, 4.92]) {
    for (let link = 0; link < 7; link += 1) {
      kit.box({
        name: "hanging-chain",
        x: x + (link % 2 === 0 ? -0.08 : 0.08),
        y: 4.7 - link * 0.48,
        z: 4.98,
        width: link % 2 === 0 ? 0.32 : 0.12,
        height: 0.32,
        depth: link % 2 === 0 ? 0.12 : 0.32,
        material: art.agedMetal,
      });
    }
  }
  for (const [x, y, z, size] of [
    [-7.5, 0.26, -3.35, 0.55], [-7.05, 0.18, -3.7, 0.38], [-4.3, 0.22, 3.05, 0.45],
    [4.4, 0.16, -3.1, 0.32], [7.35, 0.24, -2.8, 0.5], [6.8, 0.14, -2.42, 0.3],
  ] as const) {
    kit.box({ name: "rubble", x, y, z, width: size, height: size, depth: size, rotationY: x * 0.31, material: art.roughBasalt });
  }
  for (const [x, z, size] of [[-7.15, -2.25, 0.9], [-6.25, -2.55, 0.72], [6.25, 2.18, 0.82]] as const) {
    kit.box({ name: "crate", x, y: size / 2, z, width: size, height: size, depth: size, rotationY: x * 0.08, material: art.darkWood });
    kit.box({ name: "crate-band", x, y: size / 2, z: z - size * 0.51, width: size * 0.16, height: size * 0.84, depth: 0.04, material: art.agedMetal });
  }
  for (const x of [-2.75, 2.75]) {
    kit.box({ name: "lava-spike", x, y: -0.05, z: -4.05, width: 0.42, height: 1.35, depth: 0.42, rotationY: Math.PI / 4, material: art.roughBasalt });
  }
}

// 构建单屏熔岩房间；正式地图会按 section 复用并只激活邻近房间。
export function createLavaFortressRoom(
  scene: Scene,
  art: ArtMaterialLibrary,
  section: DungeonSectionDef,
): RoomArt {
  const root = new TransformNode(`room-${section.id}`, scene);
  const kit = new VoxelKit(scene);
  addFloor(kit, art);
  addArchitecture(kit, art);
  addEdgesAndStairs(kit, art);
  addDressing(kit, art);
  const meshes = kit.finish(`room-${section.id}`);
  for (const mesh of meshes) mesh.parent = root;
  root.position.set(section.gridX * 18, 0, section.gridZ * 12);
  root.rotation.y = section.rotation * Math.PI / 180;

  return {
    root,
    shadowCasters: meshes,
    metrics: LAVA_ROOM_METRICS,
    update: () => {},
    dispose: () => root.dispose(false, false),
  };
}
