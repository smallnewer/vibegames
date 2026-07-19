import { expect, it } from "vitest";
import type { ActorComponent, HealthComponent } from "../../../game/actor/ActorComponents";
import { StatSystem } from "../../../game/actor/StatSystem";
import { createStatBreakdown, type StatsComponent } from "../../../game/actor/Stats";
import { DEFAULT_STAT_BLOCK } from "../../../game/content/Definitions";
import { createCoreContent } from "../../../game/content/coreContent";
import { World } from "../../../game/core/World";
import {
  emptyMaterialWallet,
  fixedItemInstance,
  type EquipmentComponent,
  type InventoryComponent,
} from "../../../game/item/ItemComponents";
import type { StatusComponent } from "../../../game/status/StatusComponents";
import type { AbilityLoadoutComponent } from "../../../game/ability/AbilityComponents";
import type { ProgressionComponent } from "../../../game/progression/ProgressionComponents";

it("calculates base, equipment, reinforcement, then authored status bonuses", () => {
  const world = new World();
  const hero = world.createEntity();
  world.setComponent<ActorComponent>("actor", hero, {
    faction: "hero",
    action: "idle",
    actionLeft: 0,
    actionDuration: 0,
    moveX: 0,
    moveZ: 0,
    speed: 0,
    radius: 0.45,
    rollCooldownLeft: 0,
    invulnerableLeft: 0,
  });
  world.setComponent<HealthComponent>("health", hero, { current: 100, max: 100 });
  const base = { ...DEFAULT_STAT_BLOCK, maxHealth: 100, moveSpeed: 4.2 };
  world.setComponent<StatsComponent>("stats", hero, {
    base,
    final: { ...base },
    breakdown: createStatBreakdown(base),
  });
  world.setComponent<InventoryComponent>("inventory", hero, {
    nextItemId: 4,
    materials: emptyMaterialWallet(),
    recovery: [],
    items: [
      { ...fixedItemInstance(1, "item.ember_blade", "unique"), reinforce: 1 },
      fixedItemInstance(2, "item.hunter_bow"),
      { ...fixedItemInstance(3, "item.ember_coat"), reinforce: 1 },
    ],
  });
  world.setComponent<EquipmentComponent>("equipment", hero, {
    melee: 1,
    ranged: 2,
    chest: 3,
  });
  world.setComponent<StatusComponent>("statuses", hero, {
    values: [{ id: "status.battle_focus", stacks: 1, duration: 4, timeLeft: 4 }],
  });
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
    passives: { passive_1: "passive.ember_guard", passive_2: undefined },
  });

  new StatSystem(createCoreContent()).update(world);

  expect(world.getComponent<StatsComponent>("stats", hero)!.final).toMatchObject({
    maxHealth: 138,
    moveSpeed: 4.41,
    meleePower: 52,
    rangedPower: 30,
    armor: 22,
    attackSpeed: 1.28,
    cooldownRecovery: 0,
    pickupRadius: 1.4,
  });
  expect(world.getComponent<StatsComponent>("stats", hero)!.breakdown.moveSpeed)
    .toMatchObject({ base: 4.2, finalMultiplier: 1.05, value: 4.41 });
  expect(world.getComponent<ActorComponent>("actor", hero)!.speed).toBe(4.41);
});

it("derives primary stats and preserves the current health ratio", () => {
  const world = new World();
  const hero = world.createEntity();
  const base = { ...DEFAULT_STAT_BLOCK, maxHealth: 100, moveSpeed: 4.2 };
  world.setComponent<StatsComponent>("stats", hero, {
    base,
    final: { ...base },
    breakdown: createStatBreakdown(base),
  });
  world.setComponent<HealthComponent>("health", hero, { current: 50, max: 100 });
  world.setComponent<ProgressionComponent>("progression", hero, {
    level: 1,
    experience: 0,
    unspentAttributes: 0,
    unspentSkills: 1,
    allocated: { might: 10, finesse: 10, vitality: 10, resolve: 10 },
  });

  new StatSystem(createCoreContent()).update(world);
  const stats = world.getComponent<StatsComponent>("stats", hero)!.final;
  expect(stats.maxHealth).toBe(114);
  expect(stats.meleePower).toBe(8);
  expect(stats.rangedPower).toBe(8);
  expect(stats.skillPower).toBe(8);
  expect(stats.armor).toBe(3);
  expect(world.getComponent<HealthComponent>("health", hero)).toEqual({ current: 57, max: 114 });
});
