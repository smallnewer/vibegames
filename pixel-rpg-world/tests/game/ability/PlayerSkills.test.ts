import { describe, expect, it } from "vitest";
import { createAbilityChargeState, type AbilityLoadoutComponent } from "../../../game/ability/AbilityComponents";
import { AbilitySystem } from "../../../game/ability/AbilitySystem";
import { HazardSystem } from "../../../game/ability/HazardSystem";
import { SummonSystem } from "../../../game/ability/SummonSystem";
import type { ActorComponent, HealthComponent } from "../../../game/actor/ActorComponents";
import { ActorFactory } from "../../../game/actor/ActorFactory";
import { createCoreContent } from "../../../game/content/coreContent";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import type { ProgressionComponent } from "../../../game/progression/ProgressionComponents";
import type { StatusComponent } from "../../../game/status/StatusComponents";
import { StatusSystem } from "../../../game/status/StatusSystem";

function runtime() {
  const content = createCoreContent();
  const world = new World();
  const factory = new ActorFactory(content);
  const hero = factory.create(world, "hero.ember_runner", 0, 0, { playerSlot: 1 });
  const enemyA = factory.create(world, "enemy.ember_stalker", 1, 0);
  const enemyB = factory.create(world, "enemy.ember_stalker", 2, 0);
  const enemyC = factory.create(world, "enemy.ember_stalker", 3, 0);
  const statuses = new StatusSystem(content);
  const summons = new SummonSystem(factory);
  const runner: { abilities?: AbilitySystem } = {};
  const hazards = new HazardSystem({
    execute(runWorld, source, x, z, node, events, targets, execution) {
      runner.abilities!.executeEffect(runWorld, source, x, z, node, events, targets, execution);
    },
  });
  const abilities = new AbilitySystem(content, statuses, undefined, undefined, {
    spawnHazard: (runWorld, request, events) => hazards.spawn(runWorld, request, events),
    spawnSummon: (runWorld, request, events) => summons.spawn(runWorld, request, events),
  });
  runner.abilities = abilities;
  return { content, world, hero, enemies: [enemyA, enemyB, enemyC], abilities, hazards, summons };
}

function equip(
  world: World,
  hero: number,
  id: string,
  rank: 1 | 2 | 3 | 4 | 5 = 1,
): void {
  const loadout = world.getComponent<AbilityLoadoutComponent>("abilityLoadout", hero)!;
  loadout.slots.skill_left = id;
  loadout.cooldowns.skill_left = createAbilityChargeState();
  world.getComponent<ProgressionComponent>("progression", hero)!.skillRanks![id] = rank;
  world.getComponent<ActorComponent>("actor", hero)!.action = "idle";
}

describe("player skills through the shared runner", () => {
  it("chains storm damage without repeating a target", () => {
    const { world, hero, enemies, abilities } = runtime();
    equip(world, hero, "ability.storm_chain");
    const events: GameplayEvent[] = [];
    abilities.update(world, [{ type: "cast", actor: hero, slot: "skill_left", aimX: 3, aimZ: 0 }], 0, events);
    expect(events.filter((event) => event.type === "damage_applied")).toHaveLength(3);
    expect(new Set(events.filter((event) => event.type === "damage_applied").map((event) => (
      event.type === "damage_applied" ? event.target : 0
    ))).size).toBe(3);
    expect(enemies.map((enemy) => world.getComponent<HealthComponent>("health", enemy)!.current))
      .not.toEqual(enemies.map((enemy) => world.getComponent<HealthComponent>("health", enemy)!.max));
  });

  it("ticks poison trap and creates a hero-faction warding totem aura", () => {
    const { world, hero, enemies, abilities, hazards } = runtime();
    equip(world, hero, "ability.poison_trap");
    abilities.update(world, [{ type: "cast", actor: hero, slot: "skill_left", aimX: 1, aimZ: 0 }], 0, []);
    hazards.update(world, 0.01, []);
    expect(world.getComponent<StatusComponent>("statuses", enemies[0])!.values)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: "status.poisoned" })]));

    equip(world, hero, "ability.warding_totem");
    abilities.update(world, [{ type: "cast", actor: hero, slot: "skill_left", aimX: 0, aimZ: 0 }], 0, []);
    hazards.update(world, 0.01, []);
    const summon = world.entitiesWith("summon")[0];
    expect(world.getComponent<ActorComponent>("actor", summon)?.faction).toBe("hero");
    expect(world.getComponent<StatusComponent>("statuses", hero)!.values)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: "status.warding_totem" })]));
  });

  it("fires five volley projectiles from one authored repeat node", () => {
    const { world, hero, abilities } = runtime();
    equip(world, hero, "ability.hunter_volley");
    abilities.update(world, [{ type: "cast", actor: hero, slot: "skill_left", aimX: 4, aimZ: 0 }], 0, []);
    expect(world.entitiesWith("projectile")).toHaveLength(1);
    abilities.update(world, [], 0.5, []);
    expect(world.entitiesWith("projectile")).toHaveLength(5);
  });
});
