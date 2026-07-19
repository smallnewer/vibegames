import { expect, it } from "vitest";
import type { AbilityLoadoutComponent } from "../../../game/ability/AbilityComponents";
import type { ActorComponent, TransformComponent } from "../../../game/actor/ActorComponents";
import { createCoreContent } from "../../../game/content/coreContent";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import type {
  AbilityBookComponent,
  EquipmentComponent,
  InventoryComponent,
  LootComponent,
  LootGrant,
} from "../../../game/item/ItemComponents";
import { InventorySystem } from "../../../game/item/InventorySystem";
import { emptyMaterialWallet, fixedItemInstance } from "../../../game/item/ItemComponents";
import type { PlayerSlotComponent } from "../../../game/player/PlayerSlot";
import type { ProgressionComponent } from "../../../game/progression/ProgressionComponents";

function makeInventory() {
  const world = new World();
  const hero = world.createEntity();
  world.setComponent<ActorComponent>("actor", hero, {
    faction: "hero",
    action: "idle",
    actionLeft: 0,
    actionDuration: 0,
    moveX: 0,
    moveZ: 0,
    speed: 4.2,
    radius: 0.45,
    rollCooldownLeft: 0,
    invulnerableLeft: 0,
  });
  world.setComponent<TransformComponent>("transform", hero, {
    x: 0,
    z: 0,
    previousX: 0,
    previousZ: 0,
    facingX: 1,
    facingZ: 0,
  });
  world.setComponent<InventoryComponent>("inventory", hero, {
    nextItemId: 3,
    recovery: [],
    materials: emptyMaterialWallet(),
    items: [
      fixedItemInstance(1, "item.rust_blade"),
      fixedItemInstance(2, "item.hunter_bow"),
    ],
  });
  world.setComponent<PlayerSlotComponent>("playerSlot", hero, { slot: 1 });
  world.setComponent<EquipmentComponent>("equipment", hero, { melee: 1, ranged: 2 });
  world.setComponent<AbilityBookComponent>("abilityBook", hero, { unlocked: [] });
  world.setComponent<AbilityLoadoutComponent>("abilityLoadout", hero, {
    slots: {
      melee: "ability.basic_melee",
      ranged: "ability.basic_ranged",
      skill_up: undefined,
      skill_right: undefined,
      skill_down: undefined,
      skill_left: undefined,
    },
    cooldowns: { melee: 0, ranged: 0, skill_up: 0, skill_right: 0, skill_down: 0, skill_left: 0 },
    passives: { passive_1: undefined, passive_2: undefined },
  });
  return { world, hero };
}

function addLoot(world: World, grant: LootGrant, x = 0.5) {
  const loot = world.createEntity();
  world.setComponent<LootComponent>("loot", loot, { owner: 1, grant, source: 99, x, z: 0 });
  return loot;
}

it("picks up, equips, reinforces, and loads deterministic rewards", () => {
  const { world, hero } = makeInventory();
  const events: GameplayEvent[] = [];
  const system = new InventorySystem(createCoreContent());

  const bladeLoot = addLoot(world, {
    type: "item",
    item: fixedItemInstance(0, "item.ember_blade", "unique"),
  });
  system.update(world, [{ type: "pickup", actor: hero, loot: bladeLoot }], events);
  expect(world.getComponent<InventoryComponent>("inventory", hero)!.items.at(-1)).toEqual({
    id: 3,
    definition: "item.ember_blade",
    itemLevel: 1,
    baseRoll: 5_000,
    theme: "ember",
    rarity: "unique",
    affixes: [],
    reinforce: 0,
    favorite: false,
  });
  expect(events).toContainEqual({
    type: "loot_picked_up",
    actor: hero,
    loot: bladeLoot,
    kind: "item",
    label: createCoreContent().item("item.ember_blade").name,
    amount: 1,
  });

  system.update(world, [{ type: "equip_item", actor: hero, item: 3, slot: "melee" }], events);
  expect(world.getComponent<EquipmentComponent>("equipment", hero)!.melee).toBe(3);

  const dustLoot = addLoot(world, { type: "material", material: "material.scrap", amount: 2 });
  system.update(world, [{ type: "pickup", actor: hero, loot: dustLoot }], events);
  expect(world.getComponent<InventoryComponent>("inventory", hero)!.materials["material.scrap"])
    .toBe(2);
  expect(events).toContainEqual({
    type: "loot_picked_up",
    actor: hero,
    loot: dustLoot,
    kind: "material",
    label: "装备碎片",
    amount: 2,
  });

  const abilityLoot = addLoot(world, { type: "ability", ability: "ability.battle_focus" });
  system.update(world, [{ type: "pickup", actor: hero, loot: abilityLoot }], events);
  system.update(world, [{
    type: "equip_ability",
    actor: hero,
    ability: "ability.battle_focus",
    slot: "skill_up",
  }], events);
  expect(world.getComponent<AbilityBookComponent>("abilityBook", hero)!.unlocked).toEqual([
    "ability.battle_focus",
  ]);
  expect(world.getComponent<AbilityLoadoutComponent>("abilityLoadout", hero)!.slots.skill_up)
    .toBe("ability.battle_focus");
  expect(events).toContainEqual({
    type: "loot_picked_up",
    actor: hero,
    loot: abilityLoot,
    kind: "ability",
    label: createCoreContent().findAbility("ability.battle_focus")!.name,
    amount: 1,
  });
});

it("does not auto-equip collision pickups", () => {
  const { world, hero } = makeInventory();
  const events: GameplayEvent[] = [];
  const loot = addLoot(world, {
    type: "item",
    item: fixedItemInstance(0, "item.ember_coat", "magic"),
  });

  new InventorySystem(createCoreContent()).update(
    world,
    [{ type: "pickup", actor: hero, loot }],
    events,
  );

  expect(world.getComponent<EquipmentComponent>("equipment", hero)!.chest).toBeUndefined();
  expect(world.hasEntity(loot)).toBe(false);
  expect(events.some((event) => event.type === "item_equipped")).toBe(false);
});

it("uses the 12-slot recovery box and leaves loot in the world when both stores are full", () => {
  const { world, hero } = makeInventory();
  const inventory = world.getComponent<InventoryComponent>("inventory", hero)!;
  for (let id = 3; id <= 30; id += 1) inventory.items.push(fixedItemInstance(id, "item.base.head"));
  inventory.nextItemId = 31;
  const system = new InventorySystem(createCoreContent());
  const events: GameplayEvent[] = [];
  const recoveryLoot = addLoot(world, {
    type: "item",
    item: fixedItemInstance(0, "item.base.chest", "magic"),
  });

  system.update(world, [{ type: "pickup", actor: hero, loot: recoveryLoot }], events);
  expect(inventory.items).toHaveLength(30);
  expect(inventory.recovery).toHaveLength(1);
  expect(world.hasEntity(recoveryLoot)).toBe(false);

  for (let id = 32; id <= 42; id += 1) {
    inventory.recovery.push(fixedItemInstance(id, "item.base.feet"));
  }
  const blockedLoot = addLoot(world, {
    type: "item",
    item: fixedItemInstance(0, "item.base.wrists", "rare"),
  });
  system.update(world, [{ type: "pickup", actor: hero, loot: blockedLoot }], events);

  expect(inventory.recovery).toHaveLength(12);
  expect(inventory.nextItemId).toBe(32);
  expect(world.hasEntity(blockedLoot)).toBe(true);
  expect(events).toContainEqual({ type: "inventory_full", actor: hero, loot: blockedLoot });
});

it("rejects invalid range, slot, unlock, material, and reinforcement cap", () => {
  const { world, hero } = makeInventory();
  const events: GameplayEvent[] = [];
  const system = new InventorySystem(createCoreContent());
  const farLoot = addLoot(world, {
    type: "item", item: fixedItemInstance(0, "item.ember_blade", "unique"),
  }, 2);

  system.update(world, [{ type: "pickup", actor: hero, loot: farLoot }], events);
  system.update(world, [{ type: "equip_item", actor: hero, item: 1, slot: "ranged" }], events);
  system.update(world, [{
    type: "equip_ability",
    actor: hero,
    ability: "ability.battle_focus",
    slot: "skill_up",
  }], events);
  system.update(world, [{ type: "reinforce_item", actor: hero, item: 1 }], events);

  expect(world.hasEntity(farLoot)).toBe(true);
  expect(world.getComponent<EquipmentComponent>("equipment", hero)).toEqual({ melee: 1, ranged: 2 });
  expect(world.getComponent<AbilityLoadoutComponent>("abilityLoadout", hero)!.slots.skill_up)
    .toBeUndefined();
  expect(events).toEqual([]);
});

it("equips active and passive skills only into compatible independent slots", () => {
  const { world, hero } = makeInventory();
  const system = new InventorySystem(createCoreContent());
  const book = world.getComponent<AbilityBookComponent>("abilityBook", hero)!;
  book.unlocked.push(
    "ability.battle_focus",
    "ability.ember_nova",
    "passive.ember_guard",
  );

  system.update(world, [
    {
      type: "equip_ability",
      actor: hero,
      ability: "ability.battle_focus",
      slot: "skill_right",
    },
    {
      type: "equip_ability",
      actor: hero,
      ability: "ability.ember_nova",
      slot: "skill_down",
    },
    {
      type: "equip_passive",
      actor: hero,
      passive: "passive.ember_guard",
      slot: "passive_1",
    },
  ], []);
  const loadout = world.getComponent<AbilityLoadoutComponent>("abilityLoadout", hero)!;
  expect(loadout.slots.skill_up).toBeUndefined();
  expect(loadout.slots.skill_right).toBe("ability.battle_focus");
  expect(loadout.slots.skill_down).toBe("ability.ember_nova");
  expect(loadout.passives.passive_1).toBe("passive.ember_guard");

  system.update(world, [
    {
      type: "equip_ability",
      actor: hero,
      ability: "passive.ember_guard",
      slot: "skill_up",
    },
    {
      type: "equip_passive",
      actor: hero,
      passive: "ability.battle_focus",
      slot: "passive_2",
    },
  ], []);
  expect(loadout.slots.skill_up).toBeUndefined();
  expect(loadout.passives.passive_2).toBeUndefined();
});

it("revalidates item level and recovers an item only when the main inventory has space", () => {
  const { world, hero } = makeInventory();
  const inventory = world.getComponent<InventoryComponent>("inventory", hero)!;
  const high = fixedItemInstance(40, "item.base.longblade");
  high.itemLevel = 7;
  inventory.items.push(high);
  inventory.recovery.push(fixedItemInstance(41, "item.base.head"));
  world.setComponent<ProgressionComponent>("progression", hero, {
    level: 4,
    experience: 0,
    unspentAttributes: 0,
    unspentSkills: 0,
    allocated: { might: 10, finesse: 10, vitality: 10, resolve: 10 },
  });
  const system = new InventorySystem(createCoreContent());

  system.update(world, [{ type: "equip_item", actor: hero, item: 40, slot: "melee" }], []);
  expect(world.getComponent<EquipmentComponent>("equipment", hero)!.melee).toBe(1);

  const events: GameplayEvent[] = [];
  system.update(world, [{ type: "recover_item", actor: hero, item: 41 }], events);
  expect(inventory.items.at(-1)?.id).toBe(41);
  expect(inventory.recovery).toEqual([]);
  expect(events).toContainEqual({ type: "item_recovered", actor: hero, item: 41 });

  while (inventory.items.length < 30) {
    inventory.items.push(fixedItemInstance(100 + inventory.items.length, "item.base.feet"));
  }
  inventory.recovery.push(fixedItemInstance(42, "item.base.head"));
  system.update(world, [{ type: "recover_item", actor: hero, item: 42 }], events);
  expect(inventory.recovery[0].id).toBe(42);
});

it("keeps directional loadouts duplicate-free and rejects changes while combat is active", () => {
  const { world, hero } = makeInventory();
  const book = world.getComponent<AbilityBookComponent>("abilityBook", hero)!;
  book.unlocked.push("ability.battle_focus", "ability.ember_nova");
  const system = new InventorySystem(createCoreContent());
  system.update(world, [{
    type: "equip_ability",
    actor: hero,
    ability: "ability.battle_focus",
    slot: "skill_up",
  }], []);
  system.update(world, [{
    type: "equip_ability",
    actor: hero,
    ability: "ability.battle_focus",
    slot: "skill_left",
  }], []);
  const loadout = world.getComponent<AbilityLoadoutComponent>("abilityLoadout", hero)!;
  expect(Object.values(loadout.slots).filter((id) => id === "ability.battle_focus"))
    .toHaveLength(1);
  expect(loadout.slots.skill_left).toBe("ability.battle_focus");

  system.update(world, [{
    type: "equip_ability",
    actor: hero,
    ability: "ability.ember_nova",
    slot: "skill_right",
  }], [], { allowLoadoutChanges: false });
  expect(loadout.slots.skill_right).toBeUndefined();
});
