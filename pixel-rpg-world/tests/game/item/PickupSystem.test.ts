import { expect, it } from "vitest";
import type { ActorComponent, TransformComponent } from "../../../game/actor/ActorComponents";
import { createStatBreakdown, type StatsComponent } from "../../../game/actor/Stats";
import { DEFAULT_STAT_BLOCK } from "../../../game/content/Definitions";
import { World } from "../../../game/core/World";
import { emptyMaterialWallet, fixedItemInstance, type InventoryComponent, type LootComponent } from "../../../game/item/ItemComponents";
import { PickupSystem } from "../../../game/item/PickupSystem";
import type { PlayerSlotComponent, PlayerSlotId } from "../../../game/player/PlayerSlot";

function addPlayer(world: World, slot: PlayerSlotId, x: number, pickupRadius = 1.4) {
  const actor = world.createEntity();
  world.setComponent<ActorComponent>("actor", actor, {
    faction: "hero", action: "idle", actionLeft: 0, actionDuration: 0,
    moveX: 0, moveZ: 0, speed: 4.2, radius: 0.45, rollCooldownLeft: 0, invulnerableLeft: 0,
  });
  world.setComponent<TransformComponent>("transform", actor, {
    x, z: 0, previousX: x, previousZ: 0, facingX: 1, facingZ: 0,
  });
  const stats = { ...DEFAULT_STAT_BLOCK, pickupRadius };
  world.setComponent<StatsComponent>("stats", actor, {
    base: stats, final: stats, breakdown: createStatBreakdown(stats),
  });
  world.setComponent<PlayerSlotComponent>("playerSlot", actor, { slot });
  world.setComponent<InventoryComponent>("inventory", actor, {
    nextItemId: 1, items: [], recovery: [], materials: emptyMaterialWallet(),
  });
  return actor;
}

it("allows only the owner to auto-pick an owned drop", () => {
  const world = new World();
  const playerOne = addPlayer(world, 1, -0.5);
  const playerTwo = addPlayer(world, 2, 0.5);
  const loot = world.createEntity();
  world.setComponent<LootComponent>("loot", loot, {
    owner: 2,
    grant: { type: "material", material: "material.scrap", amount: 1 },
    source: 99, x: 0, z: 0,
  });
  expect(new PickupSystem().commands(world, [playerOne, playerTwo])).toEqual([
    { type: "pickup", actor: playerTwo, loot },
  ]);
});

it("uses final pickup radius for the owner", () => {
  const world = new World();
  const player = addPlayer(world, 1, 0, 2.2);
  const loot = world.createEntity();
  world.setComponent<LootComponent>("loot", loot, {
    owner: 1,
    grant: { type: "item", item: fixedItemInstance(0, "item.ember_coat", "magic") },
    source: 99, x: 2, z: 0,
  });
  expect(new PickupSystem().commands(world, [player])).toEqual([
    { type: "pickup", actor: player, loot },
  ]);
});
