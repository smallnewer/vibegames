import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type {
  DungeonSectionDef,
  DungeonSectionPreset,
} from "../../../dungeon/DungeonDefinitions";
import type { ArtMaterialLibrary } from "./ArtMaterialLibrary";
import type { RoomArt, RoomArtMetrics } from "./RoomArt";
import { addThemeArchitecture } from "./DungeonThemeArchitecture";
import { VoxelKit } from "./VoxelKit";

export const VOXEL_ROOM_MODULES = [
  "floor",
  "wall",
  "doorway",
  "arch",
  "pillar",
  "torch",
  "furniture",
  "arena_mark",
  "theme_architecture",
] as const;

export const VOXEL_ROOM_METRICS: RoomArtMetrics = {
  moduleKinds: VOXEL_ROOM_MODULES.length,
  dressingCount: 28,
  lavaAreaCount: 0,
  depthLayers: 3,
};

type Kit = VoxelKit;
type Art = ArtMaterialLibrary;
type Side = "west" | "east" | "north" | "south";

interface Connection {
  readonly side: Side;
  readonly neighbor?: DungeonSectionDef;
}

export function isOpenZonePair(
  left: DungeonSectionDef,
  right: DungeonSectionDef | undefined,
): boolean {
  return Boolean(left.zone)
    && right?.zone === left.zone
    && Math.abs(left.gridX - right.gridX) + Math.abs(left.gridZ - right.gridZ) === 1;
}

function connections(
  section: DungeonSectionDef,
  sections: readonly DungeonSectionDef[],
): readonly Connection[] {
  const directions = [
    ["west", -1, 0],
    ["east", 1, 0],
    ["north", 0, -1],
    ["south", 0, 1],
  ] as const;
  return directions.map(([side, dx, dz]) => ({
    side,
    neighbor: sections.find((candidate) => (
      candidate.gridX === section.gridX + dx && candidate.gridZ === section.gridZ + dz
    )),
  }));
}

function addWallSegment(kit: Kit, art: Art, side: Side, offset: number, length: number): void {
  const alongZ = side === "west" || side === "east";
  kit.box({
    name: "boundary-wall",
    x: alongZ ? (side === "west" ? -8.72 : 8.72) : offset,
    y: 1.65,
    z: alongZ ? offset : (side === "north" ? -5.72 : 5.72),
    width: alongZ ? 0.56 : length,
    height: 3.9,
    depth: alongZ ? length : 0.56,
    material: art.roughBasalt,
  });
}

// 相邻同类竞技场完全拆墙，其他连接只留一扇宽门。
function addBoundaries(
  kit: Kit,
  art: Art,
  section: DungeonSectionDef,
  sections: readonly DungeonSectionDef[],
): void {
  for (const connection of connections(section, sections)) {
    const fullOpen = isOpenZonePair(section, connection.neighbor);
    if (fullOpen) continue;
    // 内部墙只由西/北侧房间生成一次，避免两间房在边界叠两层墙。
    if (connection.neighbor && ["west", "north"].includes(connection.side)) continue;
    const length = connection.side === "west" || connection.side === "east" ? 12 : 18;
    if (!connection.neighbor) {
      addWallSegment(kit, art, connection.side, 0, length);
      continue;
    }
    const door = 4.6;
    const segment = (length - door) / 2;
    const offset = door / 2 + segment / 2;
    addWallSegment(kit, art, connection.side, -offset, segment);
    addWallSegment(kit, art, connection.side, offset, segment);
    const alongZ = connection.side === "west" || connection.side === "east";
    kit.box({
      name: "doorway-crown",
      x: alongZ ? (connection.side === "west" ? -8.7 : 8.7) : 0,
      y: 3.28,
      z: alongZ ? 0 : (connection.side === "north" ? -5.7 : 5.7),
      width: alongZ ? 0.72 : door + 0.5,
      height: 0.58,
      depth: alongZ ? door + 0.5 : 0.72,
      material: art.carvedStone,
    });
  }
}

function addShell(kit: Kit, art: Art): void {
  kit.box({
    name: "room-floor",
    x: 0,
    y: -0.28,
    z: 0,
    width: 17.6,
    height: 0.56,
    depth: 11.6,
    material: art.carvedStone,
  });
}

function addEntry(kit: Kit, art: Art): void {
  kit.box({ name: "entry-carpet", x: 0, y: 0.025, z: 0, width: 4.2, height: 0.05, depth: 8.6, material: art.runeCrystal });
  for (const x of [-3.5, 3.5]) {
    kit.box({ name: "entry-banner", x, y: 2.25, z: -5.35, width: 1.4, height: 2.7, depth: 0.12, material: art.runeCrystal });
    kit.box({ name: "entry-bench", x, y: 0.38, z: 3.7, width: 2.6, height: 0.55, depth: 0.75, material: art.darkWood });
  }
}

function addLiving(kit: Kit, art: Art): void {
  for (const [x, z] of [[-6.6, -3.9], [-6.6, 3.9], [6.6, -3.9], [6.6, 3.9]] as const) {
    kit.box({ name: "bed-frame", x, y: 0.28, z, width: 2.6, height: 0.42, depth: 1.25, material: art.darkWood });
    kit.box({ name: "bed-roll", x, y: 0.54, z, width: 2.15, height: 0.18, depth: 1.05, material: art.runeCrystal });
  }
  for (const z of [-2.2, 2.2]) {
    kit.box({ name: "mess-table", x: 0, y: 0.55, z, width: 3.4, height: 0.28, depth: 1.25, material: art.darkWood });
    for (const x of [-1.4, 1.4]) {
      kit.box({ name: "table-leg", x, y: 0.25, z, width: 0.22, height: 0.5, depth: 0.22, material: art.agedMetal });
    }
  }
}

function addCorridor(kit: Kit, art: Art): void {
  for (const x of [-5.8, -2.9, 0, 2.9, 5.8]) {
    kit.box({ name: "corridor-rib", x, y: 0.06, z: 0, width: 0.18, height: 0.12, depth: 8.2, material: art.agedMetal });
    for (const z of [-4.25, 4.25]) {
      kit.box({ name: "corridor-column", x, y: 1.35, z, width: 0.7, height: 2.7, depth: 0.7, material: art.roughBasalt });
    }
  }
}

function addTraining(kit: Kit, art: Art): void {
  // 中央保持净空，只在外围放武器架和训练假人。
  for (const x of [-6.5, 0, 6.5]) {
    for (const z of [-4.8, 4.8]) {
      kit.box({ name: "arena-rune", x, y: 0.04, z, width: 1.1, height: 0.08, depth: 0.26, material: art.runeCrystal });
    }
  }
  for (const [x, z] of [[-6.8, -3.7], [6.8, 3.7]] as const) {
    kit.box({ name: "dummy-post", x, y: 0.85, z, width: 0.28, height: 1.7, depth: 0.28, material: art.darkWood });
    kit.box({ name: "dummy-body", x, y: 1.25, z, width: 1.1, height: 0.65, depth: 0.42, material: art.roughBasalt });
    kit.box({ name: "weapon-rack", x: -x, y: 0.9, z, width: 1.8, height: 1.8, depth: 0.3, material: art.agedMetal });
  }
}

function addWorkshop(kit: Kit, art: Art): void {
  for (const x of [-6.7, 6.7]) {
    kit.box({ name: "furnace", x, y: 1.05, z: -3.7, width: 2.1, height: 2.1, depth: 1.7, material: art.roughBasalt });
    kit.box({ name: "furnace-mouth", x, y: 0.9, z: -4.58, width: 1.05, height: 0.8, depth: 0.08, material: art.lava });
    kit.box({ name: "workbench", x, y: 0.62, z: 3.6, width: 2.8, height: 0.35, depth: 1.25, material: art.darkWood });
  }
  for (const z of [-1.4, 1.4]) {
    kit.box({ name: "anvil-base", x: 0, y: 0.35, z, width: 0.65, height: 0.7, depth: 0.65, material: art.agedMetal });
    kit.box({ name: "anvil-top", x: 0, y: 0.8, z, width: 1.45, height: 0.28, depth: 0.65, material: art.agedMetal });
  }
}

function addBossArena(kit: Kit, art: Art): void {
  for (const [x, z] of [[-6.2, -4.4], [0, -4.4], [6.2, -4.4], [-6.2, 4.4], [0, 4.4], [6.2, 4.4]] as const) {
    kit.box({ name: "boss-rune", x, y: 0.04, z, width: 1.6, height: 0.08, depth: 0.32, material: art.runeCrystal });
  }
  for (const x of [-7.2, 7.2]) {
    kit.box({ name: "boss-standard", x, y: 1.45, z: 0, width: 0.35, height: 2.9, depth: 0.35, material: art.agedMetal });
    kit.box({ name: "boss-banner", x, y: 2.05, z: 0, width: 1.35, height: 2.1, depth: 0.12, material: art.runeCrystal });
  }
}

function addPreset(kit: Kit, art: Art, preset: DungeonSectionPreset): void {
  if (preset === "entry_hall") addEntry(kit, art);
  if (preset === "living_quarters") addLiving(kit, art);
  if (preset === "stone_corridor") addCorridor(kit, art);
  if (preset === "training_arena") addTraining(kit, art);
  if (preset === "workshop") addWorkshop(kit, art);
  if (preset === "boss_arena") addBossArena(kit, art);
}

// 正式地图房间由语义预设组合；玩法碰撞仍完全读取 navigation 数据。
export function createVoxelDungeonRoom(
  scene: Scene,
  art: ArtMaterialLibrary,
  section: DungeonSectionDef,
  sections: readonly DungeonSectionDef[],
  themeId: string,
): RoomArt {
  const root = new TransformNode(`room-${section.id}`, scene);
  const kit = new VoxelKit(scene);
  addShell(kit, art);
  addBoundaries(kit, art, section, sections);
  if (!addThemeArchitecture(kit, art, section, themeId)) addPreset(kit, art, section.preset);
  const meshes = kit.finish(`room-${section.id}`);
  for (const mesh of meshes) mesh.parent = root;
  root.position.set(section.gridX * 18, 0, section.gridZ * 12);
  return {
    root,
    shadowCasters: meshes,
    metrics: VOXEL_ROOM_METRICS,
    update: () => {},
    dispose: () => root.dispose(false, false),
  };
}
