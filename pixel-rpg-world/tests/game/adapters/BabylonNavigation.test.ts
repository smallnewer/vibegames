import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it } from "vitest";
import { BabylonNavigation } from "../../../game/adapters/babylon/BabylonNavigation";
import type { DungeonNavigationDef } from "../../../game/dungeon/DungeonDefinitions";
import { DUNGEON_PACK_DATA } from "../../../game/content/generated/dungeonPacks";

const ROOM_WITH_WALL: DungeonNavigationDef = {
  walkable: [{ id: "walkable.room", x: 0, z: 0, width: 12, depth: 10 }],
  blockers: [{ id: "blocker.wall", x: 0, z: 0, width: 1.2, depth: 6, height: 3 }],
};

describe("BabylonNavigation", () => {
  it("builds a real Recast path around a static wall", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const navigation = await BabylonNavigation.create(scene, ROOM_WITH_WALL);

    const path = navigation.path({ x: -4, z: 0 }, { x: 4, z: 0 });
    expect(path.length).toBeGreaterThan(2);
    expect(path.some((point) => Math.abs(point.z) > 3)).toBe(true);

    navigation.dispose();
    engine.dispose();
  }, 20_000);

  it("keeps repeated ground movement outside the blocker", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const navigation = await BabylonNavigation.create(scene, ROOM_WITH_WALL);
    let position = { x: -2, z: 0 };

    for (let step = 0; step < 240; step += 1) {
      position = navigation.move(position, { x: position.x + 0.05, z: position.z });
    }

    expect(position.x).toBeLessThan(-0.5);
    expect(position.z).toBeCloseTo(0, 1);
    navigation.dispose();
    engine.dispose();
  }, 20_000);

  it("connects the formal entrance to the boss arena through authored doors", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const pack = DUNGEON_PACK_DATA.find((value) => (
      value.id === "dungeon.production_foundation"
    ))!;
    const navigation = await BabylonNavigation.create(scene, pack.map.navigation);

    const path = navigation.path({ x: -6, z: 12 }, { x: 72, z: 6 });
    // 新监城会经过庭院回路，终点可达才是这里的契约。
    expect(path.length).toBeGreaterThan(1);
    expect(path.at(-1)?.x).toBeGreaterThan(68);
    expect(path.at(-1)?.z).toBeGreaterThan(3);

    navigation.dispose();
    engine.dispose();
  }, 20_000);
});
