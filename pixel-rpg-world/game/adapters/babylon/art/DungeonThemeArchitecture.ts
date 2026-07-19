import type { Material } from "@babylonjs/core/Materials/material";
import type { DungeonSectionDef } from "../../../dungeon/DungeonDefinitions";
import type { ArtMaterialLibrary } from "./ArtMaterialLibrary";
import type { VoxelKit } from "./VoxelKit";

export const THEME_ARCHITECTURE_KEYS = [
  "ember_bastion",
  "frost_mine",
  "sunken_archive",
  "moss_sanctum",
  "storm_throne",
] as const;

export type ThemeArchitectureKey = (typeof THEME_ARCHITECTURE_KEYS)[number];

const THEME_KEYS: Readonly<Record<string, ThemeArchitectureKey>> = {
  "theme.ember_bastion": "ember_bastion",
  "theme.frost_mine": "frost_mine",
  "theme.sunken_archive": "sunken_archive",
  "theme.moss_sanctum": "moss_sanctum",
  "theme.storm_throne": "storm_throne",
};

export function themeArchitectureKey(themeId: string): ThemeArchitectureKey | undefined {
  return THEME_KEYS[themeId];
}

function addPost(
  kit: VoxelKit,
  material: Material,
  name: string,
  x: number,
  z: number,
  height: number,
): void {
  kit.box({ name: `${name}-base`, x, y: 0.18, z, width: 1.25, height: 0.36, depth: 1.25, material });
  kit.box({ name, x, y: height / 2, z, width: 0.72, height, depth: 0.72, material });
  kit.box({ name: `${name}-cap`, x, y: height + 0.1, z, width: 1.05, height: 0.3, depth: 1.05, material });
}

// 监城：厚重城垛、牢栏和审判高台。
function addEmber(kit: VoxelKit, art: ArtMaterialLibrary, section: DungeonSectionDef): void {
  for (const [x, z] of [[-7.8, -4.9], [-7.8, 4.9], [7.8, -4.9], [7.8, 4.9]] as const) {
    addPost(kit, art.roughBasalt, "ember-buttress", x, z, 3.6);
  }
  for (const x of [-6.6, -3.3, 0, 3.3, 6.6]) {
    kit.box({ name: "ember-merlon", x, y: 3.95, z: -5.3, width: 1.25, height: 0.85, depth: 0.7, material: art.carvedStone });
  }
  if (section.preset === "living_quarters") {
    for (const x of [-6.8, 6.8]) {
      for (const z of [-3.6, -2.8, -2, 2, 2.8, 3.6]) {
        kit.box({ name: "prison-bar", x, y: 1.45, z, width: 0.16, height: 2.9, depth: 0.16, material: art.agedMetal });
      }
      kit.box({ name: "prison-beam", x, y: 2.75, z: 0, width: 0.24, height: 0.22, depth: 8.2, material: art.agedMetal });
    }
  }
  if (section.preset === "stone_corridor") {
    for (const x of [-5.8, -2.9, 0, 2.9, 5.8]) {
      kit.box({ name: "armory-rack", x, y: 1.3, z: -4.75, width: 1.5, height: 2.2, depth: 0.35, material: art.darkWood });
      kit.box({ name: "armory-blade", x, y: 1.5, z: -4.5, width: 0.18, height: 1.7, depth: 0.12, material: art.agedMetal });
    }
  }
  if (section.preset === "training_arena") {
    for (const [x, z] of [[-6.8, -4.4], [6.8, -4.4], [-6.8, 4.4], [6.8, 4.4]] as const) {
      kit.box({ name: "drill-banner-post", x, y: 1.4, z, width: 0.25, height: 2.8, depth: 0.25, material: art.agedMetal });
      kit.box({ name: "drill-banner", x, y: 2, z, width: 1.4, height: 1.8, depth: 0.12, material: art.runeCrystal });
    }
  }
  if (section.preset === "workshop") {
    for (const x of [-6.4, 6.4]) {
      kit.box({ name: "forge-stack", x, y: 1.4, z: -4.1, width: 2.4, height: 2.8, depth: 1.7, material: art.roughBasalt });
      kit.box({ name: "forge-mouth", x, y: 0.8, z: -5, width: 1.25, height: 0.8, depth: 0.12, material: art.lava });
    }
  }
  if (section.preset === "boss_arena") {
    for (const x of [-6.4, 6.4]) addPost(kit, art.agedMetal, "judgement-standard", x, -4.5, 4.6);
    if (section.id.endsWith("boss_b")) {
      for (const [width, y, z] of [[7, 0.18, -4.1], [5.4, 0.48, -4.35], [3.8, 0.78, -4.6]] as const) {
        kit.box({ name: "judgement-dais", x: 0, y, z, width, height: 0.36, depth: 1.8, material: art.carvedStone });
      }
    }
  }
}

// 矿井：连续轨道、木支架、冰柱和升降笼。
function addFrost(kit: VoxelKit, art: ArtMaterialLibrary, section: DungeonSectionDef): void {
  for (const z of [-0.65, 0.65]) {
    kit.box({ name: "mine-rail", x: 0, y: 0.08, z, width: 15.6, height: 0.16, depth: 0.16, material: art.agedMetal });
  }
  for (const x of [-7, -4.7, -2.4, 0, 2.4, 4.7, 7]) {
    kit.box({ name: "rail-tie", x, y: 0.025, z: 0, width: 0.32, height: 0.05, depth: 2.25, material: art.darkWood });
  }
  for (const x of [-7.4, 7.4]) {
    for (const z of [-4.65, 4.65]) addPost(kit, art.darkWood, "mine-support", x, z, 3.3);
    kit.box({ name: "mine-crossbeam", x, y: 3.35, z: 0, width: 0.6, height: 0.45, depth: 9.8, material: art.darkWood });
  }
  for (const [x, z] of [[-6.3, -3.8], [6.1, 3.7]] as const) {
    kit.box({ name: "ice-spire-low", x, y: 0.45, z, width: 1.25, height: 0.9, depth: 1.25, material: art.runeCrystal });
    kit.box({ name: "ice-spire-high", x, y: 1.25, z, width: 0.72, height: 1.2, depth: 0.72, material: art.runeCrystal });
  }
  if (section.preset === "living_quarters") {
    for (const z of [-3.7, 3.7]) {
      kit.box({ name: "miner-bunk", x: -6.2, y: 0.6, z, width: 3, height: 0.5, depth: 1.35, material: art.darkWood });
      kit.box({ name: "miner-lockers", x: 6.6, y: 1.1, z, width: 1.2, height: 2.2, depth: 1.4, material: art.agedMetal });
    }
  }
  if (section.preset === "workshop") {
    for (const x of [-6.2, 6.2]) {
      kit.box({ name: "lift-cage-post", x, y: 1.7, z: -3.8, width: 0.3, height: 3.4, depth: 0.3, material: art.agedMetal });
      kit.box({ name: "lift-cage-beam", x, y: 3.3, z: -2.3, width: 0.4, height: 0.3, depth: 3.2, material: art.agedMetal });
    }
  }
  if (section.preset === "training_arena") {
    for (const [x, z] of [[-6.7, -4.2], [6.7, 4.2]] as const) {
      kit.box({ name: "ore-cart", x, y: 0.55, z, width: 2, height: 1.1, depth: 1.35, material: art.agedMetal });
      kit.box({ name: "ore-load", x, y: 1.25, z, width: 1.5, height: 0.45, depth: 0.9, material: art.runeCrystal });
    }
  }
  if (section.preset === "boss_arena" && section.id.endsWith("boss_b")) {
    for (const x of [-2.4, 2.4]) addPost(kit, art.darkWood, "bell-frame", x, -4.1, 4.7);
    kit.box({ name: "frost-bell", x: 0, y: 2.7, z: -4.1, width: 3, height: 2.4, depth: 2.4, material: art.agedMetal });
  }
}

// 书库：高书墙、贯穿水渠、石桥和铜泵。
function addTide(kit: VoxelKit, art: ArtMaterialLibrary, section: DungeonSectionDef): void {
  for (const z of [-4.9, 4.9]) {
    kit.box({ name: "archive-canal", x: 0, y: 0.03, z, width: 15.6, height: 0.06, depth: 0.8, material: art.lava });
    for (const x of [-7.2, -3.6, 0, 3.6, 7.2]) {
      kit.box({ name: "canal-coping", x, y: 0.2, z: z > 0 ? z - 0.58 : z + 0.58, width: 1.4, height: 0.4, depth: 0.32, material: art.carvedStone });
    }
  }
  for (const x of [-7.15, 7.15]) {
    kit.box({ name: "archive-shelf", x, y: 1.85, z: 0, width: 1.05, height: 3.7, depth: 8.6, material: art.darkWood });
    for (const z of [-3.2, -1.1, 1.1, 3.2]) {
      kit.box({ name: "archive-book-band", x: x > 0 ? x - 0.58 : x + 0.58, y: 1.8, z, width: 0.18, height: 2.5, depth: 1.35, material: art.runeCrystal });
    }
  }
  if (section.preset === "entry_hall" || section.preset === "stone_corridor") {
    kit.box({ name: "archive-bridge", x: 0, y: 0.16, z: 0, width: 6.4, height: 0.32, depth: 3.2, material: art.carvedStone });
  }
  if (section.preset === "training_arena") {
    for (const x of [-5.8, 0, 5.8]) addPost(kit, art.carvedStone, "reading-column", x, -4.35, 3.8);
  }
  if (section.preset === "workshop") {
    for (const x of [-5.3, 5.3]) {
      kit.box({ name: "pump-body", x, y: 1.2, z: 0, width: 2.2, height: 2.4, depth: 2.2, material: art.agedMetal });
      kit.box({ name: "pump-wheel-x", x, y: 2.3, z: -1.2, width: 3.4, height: 0.35, depth: 0.25, material: art.runeCrystal });
      kit.box({ name: "pump-wheel-y", x, y: 2.3, z: -1.2, width: 0.35, height: 3.4, depth: 0.25, material: art.runeCrystal });
    }
  }
  if (section.preset === "boss_arena") {
    for (const x of [-5.8, 0, 5.8]) {
      kit.box({ name: "forbidden-tome-plinth", x, y: 0.55, z: -4.1, width: 2.4, height: 1.1, depth: 1.8, material: art.carvedStone });
      kit.box({ name: "forbidden-tome", x, y: 1.22, z: -4.1, width: 1.45, height: 0.22, depth: 1.1, material: art.runeCrystal });
    }
  }
}

// 圣所：巨根、菌伞、种植台和层叠祭坛。
function addMoss(kit: VoxelKit, art: ArtMaterialLibrary, section: DungeonSectionDef): void {
  for (const [x, z, turn] of [[-7, -4.5, 0.35], [7, 4.5, 0.35], [-7, 4.5, -0.35], [7, -4.5, -0.35]] as const) {
    kit.box({ name: "sanctum-root", x, y: 1.4, z, width: 0.95, height: 3.7, depth: 0.95, rotationY: turn, material: art.darkWood });
    kit.box({ name: "sanctum-root-arm", x: x * 0.72, y: 2.5, z: z * 0.72, width: 3.2, height: 0.7, depth: 0.7, rotationY: turn, material: art.darkWood });
  }
  for (const [x, z, size] of [[-6.1, -3.5, 1.4], [6.3, 3.6, 1.7], [-6.4, 3.4, 1.1], [6.1, -3.7, 1.2]] as const) {
    kit.box({ name: "mushroom-stalk", x, y: 0.65, z, width: 0.48, height: 1.3, depth: 0.48, material: art.carvedStone });
    kit.box({ name: "mushroom-cap", x, y: 1.45, z, width: size, height: 0.5, depth: size, material: art.runeCrystal });
  }
  if (section.preset === "living_quarters") {
    for (const z of [-3.3, 3.3]) {
      kit.box({ name: "pilgrim-canopy", x: -5.8, y: 1.6, z, width: 3.3, height: 0.25, depth: 2.4, material: art.runeCrystal });
      kit.box({ name: "pilgrim-bed", x: -5.8, y: 0.35, z, width: 2.7, height: 0.5, depth: 1.2, material: art.darkWood });
    }
  }
  if (section.preset === "training_arena") {
    for (const z of [-4.2, 4.2]) {
      for (const x of [-5.4, 0, 5.4]) {
        kit.box({ name: "garden-bed", x, y: 0.35, z, width: 4.1, height: 0.7, depth: 1.25, material: art.roughBasalt });
        kit.box({ name: "garden-glow", x, y: 0.74, z, width: 3.4, height: 0.08, depth: 0.8, material: art.runeCrystal });
      }
    }
  }
  if (section.preset === "workshop") {
    for (const x of [-5.4, 0, 5.4]) {
      kit.box({ name: "spore-vat", x, y: 1.15, z: -3.8, width: 2.3, height: 2.3, depth: 2.3, material: art.roughBasalt });
      kit.box({ name: "spore-vat-glow", x, y: 1.9, z: -3.8, width: 1.7, height: 0.35, depth: 1.7, material: art.runeCrystal });
    }
  }
  if (section.preset === "boss_arena" && section.id.endsWith("boss_b")) {
    for (const [width, y, z] of [[8, 0.18, -3.7], [6.2, 0.55, -4.05], [4.2, 0.92, -4.4]] as const) {
      kit.box({ name: "mother-altar", x: 0, y, z, width, height: 0.36, depth: 2, material: art.roughBasalt });
    }
    kit.box({ name: "mother-cap", x: 0, y: 3.35, z: -4.5, width: 6.8, height: 0.8, depth: 3.4, material: art.runeCrystal });
  }
}

// 王台：悬桥栏杆、避雷柱、机括和高王座。
function addStorm(kit: VoxelKit, art: ArtMaterialLibrary, section: DungeonSectionDef): void {
  for (const z of [-5, 5]) {
    kit.box({ name: "sky-rail", x: 0, y: 1.05, z, width: 15.8, height: 0.22, depth: 0.22, material: art.agedMetal });
    for (const x of [-7.4, -4.9, -2.5, 0, 2.5, 4.9, 7.4]) {
      kit.box({ name: "sky-rail-post", x, y: 0.62, z, width: 0.22, height: 1.25, depth: 0.22, material: art.agedMetal });
    }
  }
  for (const [x, z] of [[-7.2, -4.4], [7.2, -4.4], [-7.2, 4.4], [7.2, 4.4]] as const) {
    addPost(kit, art.agedMetal, "lightning-obelisk", x, z, 4.6);
    kit.box({ name: "lightning-cap", x, y: 4.95, z, width: 0.34, height: 1, depth: 0.34, material: art.runeCrystal });
  }
  for (const x of [-6, -3, 0, 3, 6]) {
    kit.box({ name: "platform-underbeam", x, y: -0.7, z: 0, width: 0.45, height: 1, depth: 9.8, material: art.roughBasalt });
  }
  if (section.preset === "stone_corridor" || section.preset === "entry_hall") {
    kit.box({ name: "suspended-bridge", x: 0, y: 0.1, z: 0, width: 15.8, height: 0.2, depth: 4, material: art.darkWood });
    for (const x of [-6, -3, 0, 3, 6]) {
      kit.box({ name: "bridge-band", x, y: 0.24, z: 0, width: 0.24, height: 0.12, depth: 4.2, material: art.agedMetal });
    }
  }
  if (section.preset === "training_arena") {
    kit.box({ name: "storm-cross-x", x: 0, y: 0.04, z: 0, width: 12, height: 0.08, depth: 0.8, material: art.runeCrystal });
    kit.box({ name: "storm-cross-z", x: 0, y: 0.04, z: 0, width: 0.8, height: 0.08, depth: 8, material: art.runeCrystal });
  }
  if (section.preset === "workshop") {
    for (const x of [-5, 0, 5]) {
      kit.box({ name: "storm-engine", x, y: 1.25, z: -3.7, width: 2.4, height: 2.5, depth: 2.2, material: art.roughBasalt });
      kit.box({ name: "engine-core-x", x, y: 2.25, z: -4.85, width: 3.2, height: 0.3, depth: 0.2, material: art.runeCrystal });
      kit.box({ name: "engine-core-y", x, y: 2.25, z: -4.85, width: 0.3, height: 3.2, depth: 0.2, material: art.runeCrystal });
    }
  }
  if (section.preset === "boss_arena" && section.id.endsWith("boss_b")) {
    for (const [width, y, z] of [[8.4, 0.18, -3.7], [6.4, 0.55, -4.05], [4.4, 0.92, -4.4]] as const) {
      kit.box({ name: "throne-dais", x: 0, y, z, width, height: 0.38, depth: 2.1, material: art.carvedStone });
    }
    kit.box({ name: "storm-throne-back", x: 0, y: 2.75, z: -4.75, width: 3.2, height: 4.2, depth: 0.75, material: art.agedMetal });
    kit.box({ name: "storm-crown", x: 0, y: 5, z: -4.75, width: 5.2, height: 0.55, depth: 0.8, material: art.runeCrystal });
  }
}

export function addThemeArchitecture(
  kit: VoxelKit,
  art: ArtMaterialLibrary,
  section: DungeonSectionDef,
  themeId: string,
): boolean {
  const key = themeArchitectureKey(themeId);
  if (key === "ember_bastion") addEmber(kit, art, section);
  if (key === "frost_mine") addFrost(kit, art, section);
  if (key === "sunken_archive") addTide(kit, art, section);
  if (key === "moss_sanctum") addMoss(kit, art, section);
  if (key === "storm_throne") addStorm(kit, art, section);
  return Boolean(key);
}
