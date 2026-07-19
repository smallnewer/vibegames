import { describe, expect, it } from "vitest";
import type { TransformComponent } from "../../../game/actor/ActorComponents";
import { RunRng } from "../../../game/balance/RunRng";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import { DropSystem } from "../../../game/item/DropSystem";
import type { DropTableComponent, LootComponent } from "../../../game/item/ItemComponents";
import type { PlayerSlotComponent, PlayerSlotId } from "../../../game/player/PlayerSlot";

function player(world: World, slot: PlayerSlotId) {
  const actor = world.createEntity();
  world.setComponent<PlayerSlotComponent>("playerSlot", actor, { slot });
  return actor;
}

describe("DropSystem", () => {
  it("gives every active player one owned Boss magic-or-better item exactly once", () => {
    const world = new World();
    player(world, 1);
    player(world, 2);
    const boss = world.createEntity();
    world.setComponent<TransformComponent>("transform", boss, {
      x: 3, z: 0, previousX: 3, previousZ: 0, facingX: -1, facingZ: 0,
    });
    world.setComponent<DropTableComponent>("dropTable", boss, {
      sourceType: "boss", theme: "ember", level: 10, dropped: false,
    });
    const events: GameplayEvent[] = [{ type: "actor_died", actor: boss }];
    const system = new DropSystem(RunRng.fromSeed(12));
    system.update(world, events);

    const loot = world.entitiesWith("loot").map((id) => (
      world.getComponent<LootComponent>("loot", id)!
    ));
    const equipment = loot.filter((entry) => entry.grant.type === "item");
    expect(equipment.map((entry) => entry.owner).sort()).toEqual([1, 2]);
    expect(equipment.every((entry) => (
      entry.grant.type === "item" && ["magic", "rare", "unique"].includes(entry.grant.item.rarity)
    ))).toBe(true);
    expect(loot.filter((entry) => entry.grant.type === "material" && entry.owner === 1).length)
      .toBeGreaterThanOrEqual(2);

    const count = loot.length;
    system.update(world, events);
    expect(world.entitiesWith("loot")).toHaveLength(count);
  });

  it("round-robins non-Boss equipment while granting elite materials to both players", () => {
    const world = new World();
    player(world, 1);
    player(world, 2);
    const expectedOwner = new Map<number, PlayerSlotId>();
    const events: GameplayEvent[] = [];
    for (let index = 0; index < 12; index += 1) {
      const elite = world.createEntity();
      expectedOwner.set(elite, (index % 2 + 1) as PlayerSlotId);
      world.setComponent<TransformComponent>("transform", elite, {
        x: index, z: 0, previousX: index, previousZ: 0, facingX: -1, facingZ: 0,
      });
      world.setComponent<DropTableComponent>("dropTable", elite, {
        sourceType: "elite", theme: "ember", level: 10, dropped: false,
      });
      events.push({ type: "actor_died", actor: elite });
    }

    new DropSystem(RunRng.fromSeed(3)).update(world, events);
    const loot = world.entitiesWith("loot").map((id) => world.getComponent<LootComponent>("loot", id)!);
    const equipment = loot.filter((entry) => entry.grant.type === "item");
    expect(equipment.length).toBeGreaterThan(0);
    expect(equipment.every((entry) => entry.owner === expectedOwner.get(entry.source))).toBe(true);
    for (const source of expectedOwner.keys()) {
      const materialOwners = loot
        .filter((entry) => entry.source === source && entry.grant.type === "material")
        .map((entry) => entry.owner);
      expect(materialOwners).toEqual(expect.arrayContaining([1, 2]));
    }
  });
});
