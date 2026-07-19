import { expect, it } from "vitest";
import { DungeonRegistry } from "../../../game/content/DungeonRegistry";
import { DUNGEON_PACK_DATA } from "../../../game/content/generated/dungeonPacks";
import { GameSimulation } from "../../../game/core/GameSimulation";
import type { DungeonPack } from "../../../game/dungeon/DungeonDefinitions";

function tenScreenFixture(): DungeonPack {
  const source = DUNGEON_PACK_DATA.find((pack) => pack.id === "dungeon.lava_showcase")!;
  const pack = structuredClone(source) as unknown as DungeonPack;
  Object.assign(pack, { id: "fixture.ten_screen", name: "十屏容量夹具" });
  Object.assign(pack.map, {
    mode: "production",
    bounds: { minX: -9, maxX: 171, minZ: -6, maxZ: 6 },
    sections: Array.from({ length: 10 }, (_, index) => ({
      id: `section.fixture_${index}`,
      preset: "foundation_room" as const,
      gridX: index,
      gridZ: 0,
      rotation: 0 as const,
    })),
  });
  return pack;
}

it("moves beyond the old one-screen clamp inside a ten-screen dungeon", () => {
  const pack = tenScreenFixture();
  const simulation = new GameSimulation(
    { dungeonId: pack.id, benchmark: true },
    new DungeonRegistry([pack]),
  );

  for (let tick = 0; tick < 1_800; tick += 1) {
    simulation.tick(1 / 60, [{ type: "move", actor: simulation.hero, x: 1, z: 0 }]);
  }

  const hero = simulation.snapshot().actors.find((actor) => actor.id === simulation.hero)!;
  expect(hero.x).toBeGreaterThan(70);
  expect(hero.x).toBeLessThanOrEqual(171);
  expect(simulation.snapshot().dungeon.map.sections).toHaveLength(10);
});
