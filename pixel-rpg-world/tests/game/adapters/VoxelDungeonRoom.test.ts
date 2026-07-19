import { expect, it } from "vitest";
import {
  isOpenZonePair,
  VOXEL_ROOM_METRICS,
  VOXEL_ROOM_MODULES,
} from "../../../game/adapters/babylon/art/VoxelDungeonRoom";
import type { DungeonSectionDef } from "../../../game/dungeon/DungeonDefinitions";

function room(
  id: string,
  preset: DungeonSectionDef["preset"],
  gridX: number,
  gridZ: number,
  zone = id,
): DungeonSectionDef {
  return { id, zone, name: zone, preset, gridX, gridZ, rotation: 0 };
}

it("keeps the formal room kit dense but bounded", () => {
  expect(VOXEL_ROOM_MODULES).toContain("furniture");
  expect(VOXEL_ROOM_MODULES).toContain("arena_mark");
  expect(VOXEL_ROOM_METRICS.moduleKinds).toBe(9);
  expect(VOXEL_ROOM_METRICS.depthLayers).toBe(3);
});

it("merges only adjacent sections in the same authored zone", () => {
  const training = room("section.training_a", "training_arena", 2, 0, "zone.training");
  expect(isOpenZonePair(
    training,
    room("section.training_b", "training_arena", 2, 1, "zone.training"),
  )).toBe(true);
  expect(isOpenZonePair(
    training,
    room("section.boss", "boss_arena", 2, 1, "zone.boss"),
  )).toBe(false);
  expect(isOpenZonePair(
    training,
    room("section.remote", "training_arena", 4, 0, "zone.training"),
  )).toBe(false);
});
