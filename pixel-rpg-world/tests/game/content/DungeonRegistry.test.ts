import { expect, it } from "vitest";
import { DungeonRegistry } from "../../../game/content/DungeonRegistry";
import { DUNGEON_PACK_DATA } from "../../../game/content/generated/dungeonPacks";

it("resolves frozen compiled dungeon packs", () => {
  const registry = new DungeonRegistry();

  expect(registry.get("dungeon.training_ground").name).toBe("晶体门训练场");
  expect(registry.get("dungeon.ice_room").name).toBe("霜镜密室");
  expect(registry.get("dungeon.lava_showcase").visual.profile).toBe("lava_fortress");
  expect(registry.get("dungeon.production_foundation")).toMatchObject({
    name: "余烬监城",
    lore: { boss: { name: "赫恩", title: "铁誓典狱长" } },
    visual: { profile: "voxel_dungeon" },
    map: { mode: "production" },
  });
  expect(registry.get("dungeon.production_foundation").map.sections).toHaveLength(10);
  expect(registry.get("dungeon.lava_showcase").map).toMatchObject({
    mode: "showcase",
    screenWidth: 18,
    screenDepth: 12,
  });
  expect(Object.isFrozen(registry.get("dungeon.ice_room").visual.enemy)).toBe(true);
});

it("rejects missing and duplicate dungeon IDs", () => {
  const registry = new DungeonRegistry();

  expect(() => registry.get("dungeon.missing")).toThrow("Unknown dungeon");
  expect(() => new DungeonRegistry([DUNGEON_PACK_DATA[0], DUNGEON_PACK_DATA[0]]))
    .toThrow("Duplicate dungeon");
});
