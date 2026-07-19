import { describe, expect, it } from "vitest";
import type { AbilityLoadoutComponent } from "../../../game/ability/AbilityComponents";
import {
  createAbilityChargeState,
  createAbilityChargeStates,
  normalizeAbilitySlots,
} from "../../../game/ability/AbilityComponents";
import { AbilitySystem } from "../../../game/ability/AbilitySystem";
import type {
  ActorComponent,
  HealthComponent,
  ProjectileComponent,
  TransformComponent,
} from "../../../game/actor/ActorComponents";
import { ActorFactory } from "../../../game/actor/ActorFactory";
import type { StatsComponent } from "../../../game/actor/Stats";
import type { BossStateComponent } from "../../../game/boss/BossComponents";
import { BossSystem } from "../../../game/boss/BossSystem";
import { createCoreContent } from "../../../game/content/coreContent";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import type { StatusComponent } from "../../../game/status/StatusComponents";
import { StatusSystem } from "../../../game/status/StatusSystem";
import type { ProgressionComponent } from "../../../game/progression/ProgressionComponents";

function addActor(world: World, faction: "hero" | "enemy", x: number, health: number) {
  const entity = world.createEntity();
  world.setComponent<ActorComponent>("actor", entity, {
    faction,
    action: "idle",
    actionLeft: 0,
    actionDuration: 0,
    moveX: 0,
    moveZ: 0,
    speed: faction === "hero" ? 4.2 : 0,
    radius: faction === "hero" ? 0.45 : 0.6,
    rollCooldownLeft: 0,
    invulnerableLeft: 0,
  });
  world.setComponent<TransformComponent>("transform", entity, {
    x,
    z: 0,
    previousX: x,
    previousZ: 0,
    facingX: faction === "hero" ? 1 : -1,
    facingZ: 0,
  });
  world.setComponent<HealthComponent>("health", entity, { current: health, max: health });
  world.setComponent<StatsComponent>("stats", entity, {
    base: {
      maxHealth: health,
      moveSpeed: faction === "hero" ? 4.2 : 0,
      meleePower: faction === "hero" ? 40 : 0,
      rangedPower: faction === "hero" ? 30 : 20,
    },
    final: {
      maxHealth: health,
      moveSpeed: faction === "hero" ? 4.2 : 0,
      meleePower: faction === "hero" ? 40 : 0,
      rangedPower: faction === "hero" ? 30 : 20,
    },
  });
  world.setComponent<StatusComponent>("statuses", entity, { values: [] });
  world.setComponent<AbilityLoadoutComponent>("abilityLoadout", entity, {
    slots: faction === "hero"
      ? {
          melee: "ability.basic_melee",
          ranged: "ability.basic_ranged",
          skill_up: "ability.battle_focus",
          skill_right: "ability.ember_nova",
          skill_down: "ability.shadow_step",
          skill_left: "ability.molten_guard",
        }
      : {
          melee: undefined,
          ranged: "ability.crystal_shot",
          skill_up: undefined,
          skill_right: undefined,
          skill_down: undefined,
          skill_left: undefined,
        },
    cooldowns: createAbilityChargeStates(),
    passives: { passive_1: undefined, passive_2: undefined },
  });
  return entity;
}

function makeAbilityWorld(enemyX = 1.2) {
  const world = new World();
  const hero = addActor(world, "hero", 0, 100);
  const enemy = addActor(world, "enemy", enemyX, 80);
  const content = createCoreContent();
  const statuses = new StatusSystem(content);
  return { world, hero, enemy, content, system: new AbilitySystem(content, statuses) };
}

describe("AbilitySystem", () => {
  it("maps the deprecated three-slot in-memory shape once into directional slots", () => {
    expect(normalizeAbilitySlots({
      ability_1: "ability.battle_focus",
      ability_2: "ability.ember_nova",
      ability_3: "ability.shadow_step",
    })).toEqual({
      melee: undefined,
      ranged: undefined,
      skill_up: "ability.battle_focus",
      skill_right: "ability.ember_nova",
      skill_down: "ability.shadow_step",
      skill_left: undefined,
    });
  });

  it("uses final melee stats, facing, range, and slot cooldown", () => {
    const { world, hero, enemy, system } = makeAbilityWorld();
    const events: GameplayEvent[] = [];
    system.update(world, [{
      type: "cast",
      actor: hero,
      slot: "melee",
      aimX: 1.2,
      aimZ: 0,
    }], 1 / 60, events);

    expect(world.getComponent<HealthComponent>("health", enemy)!.current).toBe(80);
    expect(world.getComponent<AbilityLoadoutComponent>("abilityLoadout", hero)!.cooldowns.melee)
      .toEqual({ charges: 0, recharge: [0.45] });
    expect(events.some((event) => event.type === "action_started")).toBe(true);
    expect(world.getComponent<ActorComponent>("actor", hero)!.actionDuration).toBe(0.45);
    expect(world.getComponent<ActorComponent>("actor", hero)!.actionMotion?.distance).toBe(0.55);

    system.update(world, [], 0.15, events);
    expect(world.getComponent<HealthComponent>("health", enemy)!.current).toBe(80);
    system.update(world, [], 0.004, events);
    expect(world.getComponent<HealthComponent>("health", enemy)!.current).toBe(40);
    expect(events.some((event) => event.type === "ability_impact")).toBe(true);
  });

  it("uses attack speed for weapon timing and additive cooldown recovery", () => {
    const { world, hero, system } = makeAbilityWorld();
    const stats = world.getComponent<StatsComponent>("stats", hero)!;
    stats.final.attackSpeed = 2;
    stats.final.cooldownRecovery = 0.5;

    system.update(world, [{
      type: "cast",
      actor: hero,
      slot: "melee",
      aimX: 1,
      aimZ: 0,
    }], 0, []);
    const actor = world.getComponent<ActorComponent>("actor", hero)!;
    const loadout = world.getComponent<AbilityLoadoutComponent>("abilityLoadout", hero)!;
    expect(actor.actionDuration).toBeCloseTo(0.225);
    expect(loadout.cooldowns.melee.charges).toBe(0);
    expect(loadout.cooldowns.melee.recharge[0]).toBeCloseTo(0.225);

    system.update(world, [], 0.1, []);
    expect(loadout.cooldowns.melee.recharge[0]).toBeCloseTo(0.075);
  });

  it("uses the same effect path for hero, turret, and self Buff skills", () => {
    const { world, hero, enemy, system } = makeAbilityWorld(3);
    const events: GameplayEvent[] = [];
    system.update(world, [
      { type: "cast", actor: hero, slot: "ranged", aimX: 3, aimZ: 0 },
      { type: "cast", actor: enemy, slot: "ranged", aimX: 0, aimZ: 0 },
    ], 1 / 60, events);
    world.getComponent<ActorComponent>("actor", hero)!.action = "idle";
    system.update(world, [
      { type: "cast", actor: hero, slot: "skill_up", aimX: 0, aimZ: 0 },
    ], 1 / 60, events);

    const shots = world.entitiesWith("projectile").map((entity) => (
      world.getComponent<ProjectileComponent>("projectile", entity)!
    ));
    expect(shots.map((shot) => shot.damage)).toEqual([
      expect.objectContaining({ scalingStat: "rangedPower", coefficient: 1 }),
      expect.objectContaining({ minBase: 20, maxBase: 20, coefficient: 0 }),
    ]);
    expect(world.getComponent<StatusComponent>("statuses", hero)!.values[0].id)
      .toBe("status.battle_focus");
  });

  it("rejects dead, rolling, hit, missing-slot, and cooling-down casts", () => {
    const { world, hero, system } = makeAbilityWorld();
    const actor = world.getComponent<ActorComponent>("actor", hero)!;
    const loadout = world.getComponent<AbilityLoadoutComponent>("abilityLoadout", hero)!;
    const casts = [{
      type: "cast" as const,
      actor: hero,
      slot: "melee" as const,
      aimX: 1,
      aimZ: 0,
    }];

    for (const action of ["dead", "roll", "hit"] as const) {
      actor.action = action;
      system.update(world, casts, 0, []);
      expect(world.entitiesWith("projectile")).toHaveLength(0);
    }
    actor.action = "idle";
    loadout.slots.melee = undefined;
    system.update(world, casts, 0, []);
    loadout.slots.melee = "ability.basic_melee";
    loadout.cooldowns.melee = { charges: 0, recharge: [1] };
    system.update(world, casts, 0, []);
    expect(loadout.cooldowns.melee).toEqual({ charges: 0, recharge: [1] });
  });

  it("keeps all four active skill cooldowns independent", () => {
    const { world, hero, system } = makeAbilityWorld();
    const actor = world.getComponent<ActorComponent>("actor", hero)!;
    const loadout = world.getComponent<AbilityLoadoutComponent>("abilityLoadout", hero)!;

    system.update(world, [{
      type: "cast",
      actor: hero,
      slot: "skill_up",
      aimX: 1,
      aimZ: 0,
    }], 0, []);
    expect(loadout.cooldowns.skill_up.charges).toBe(0);
    expect(loadout.cooldowns.skill_right.charges).toBe(1);
    expect(loadout.cooldowns.skill_down.charges).toBe(1);
    expect(loadout.cooldowns.skill_left.charges).toBe(1);

    actor.action = "idle";
    system.update(world, [{
      type: "cast",
      actor: hero,
      slot: "skill_right",
      aimX: 1,
      aimZ: 0,
    }], 0, []);
    expect(loadout.cooldowns.skill_up.charges).toBe(0);
    expect(loadout.cooldowns.skill_right.charges).toBe(0);
    expect(loadout.cooldowns.skill_down.charges).toBe(1);
    expect(loadout.cooldowns.skill_left.charges).toBe(1);
  });

  it("spends two charges immediately and restores them sequentially with recovery", () => {
    const { world, hero, system } = makeAbilityWorld();
    const actor = world.getComponent<ActorComponent>("actor", hero)!;
    const loadout = world.getComponent<AbilityLoadoutComponent>("abilityLoadout", hero)!;
    loadout.slots.skill_left = "ability.gale_dash";
    loadout.cooldowns = createAbilityChargeStates();
    world.setComponent<ProgressionComponent>("progression", hero, {
      level: 1,
      experience: 0,
      unspentAttributes: 0,
      unspentSkills: 0,
      allocated: { might: 10, finesse: 10, vitality: 10, resolve: 10 },
      skillRanks: { "ability.gale_dash": 5 },
    });
    const cast = () => system.update(world, [{
      type: "cast" as const,
      actor: hero,
      slot: "skill_left" as const,
      aimX: 4,
      aimZ: 0,
    }], 0, []);

    cast();
    actor.action = "idle";
    cast();
    expect(loadout.cooldowns.skill_left).toEqual({ charges: 0, recharge: [4.5, 9] });
    actor.action = "idle";
    const actionSequence = loadout.actionSequence;
    cast();
    expect(loadout.actionSequence).toBe(actionSequence);

    world.getComponent<StatsComponent>("stats", hero)!.final.cooldownRecovery = 0.5;
    system.update(world, [], 3, []);
    expect(loadout.cooldowns.skill_left).toEqual({ charges: 1, recharge: [4.5] });
    system.update(world, [], 3, []);
    expect(loadout.cooldowns.skill_left).toEqual({ charges: 2, recharge: [] });
  });

  it("uses the shared active-skill rank evaluator in combat damage", () => {
    const { world, hero, enemy, system } = makeAbilityWorld();
    world.setComponent<ProgressionComponent>("progression", hero, {
      level: 1,
      experience: 0,
      unspentAttributes: 0,
      unspentSkills: 0,
      allocated: { might: 10, finesse: 10, vitality: 10, resolve: 10 },
      skillRanks: { "ability.ember_nova": 2 },
    });
    system.update(world, [{
      type: "cast",
      actor: hero,
      slot: "skill_right",
      aimX: 1,
      aimZ: 0,
    }], 0, []);
    system.update(world, [], 0.18, []);
    expect(world.getComponent<HealthComponent>("health", enemy)!.current).toBe(52);
  });

  it("executes delayed effects on the fixed tick and cancels them after source death", () => {
    const first = makeAbilityWorld();
    first.system.update(first.world, [{
      type: "cast",
      actor: first.hero,
      slot: "skill_right",
      aimX: first.enemy,
      aimZ: 0,
    }], 0, []);
    expect(first.system.pendingCount).toBe(1);
    expect(first.world.getComponent<HealthComponent>("health", first.enemy)!.current).toBe(80);
    first.system.update(first.world, [], 0.17, []);
    expect(first.world.getComponent<HealthComponent>("health", first.enemy)!.current).toBe(80);
    first.system.update(first.world, [], 0.01, []);
    expect(first.world.getComponent<HealthComponent>("health", first.enemy)!.current).toBe(55);

    const cancelled = makeAbilityWorld();
    cancelled.system.update(cancelled.world, [{
      type: "cast",
      actor: cancelled.hero,
      slot: "skill_right",
      aimX: 1,
      aimZ: 0,
    }], 0, []);
    cancelled.world.getComponent<ActorComponent>("actor", cancelled.hero)!.action = "dead";
    cancelled.system.update(cancelled.world, [], 0.2, []);
    expect(cancelled.world.getComponent<HealthComponent>("health", cancelled.enemy)!.current).toBe(80);
    expect(cancelled.system.pendingCount).toBe(0);
  });

  it("cancels a normal enemy delayed impact when stagger interrupts the attack", () => {
    const { world, hero, enemy, system } = makeAbilityWorld();
    const loadout = world.getComponent<AbilityLoadoutComponent>("abilityLoadout", enemy)!;
    loadout.slots.melee = "ability.basic_melee";
    system.update(world, [{
      type: "cast",
      actor: enemy,
      slot: "melee",
      aimX: 0,
      aimZ: 0,
    }], 0, []);
    expect(system.pendingCount).toBe(1);

    world.getComponent<ActorComponent>("actor", enemy)!.action = "hit";
    system.update(world, [], 0.2, []);

    expect(system.pendingCount).toBe(0);
    expect(world.getComponent<HealthComponent>("health", hero)!.current).toBe(100);
  });

  it("cancels a Boss delayed effect at phase entry and blocks entry casts", () => {
    const content = createCoreContent();
    const world = new World();
    const factory = new ActorFactory(content);
    const boss = factory.create(world, "boss.ember_colossus", 0, 0);
    const hero = factory.create(world, "hero.ember_runner", 1, 0, { playerSlot: 1 });
    const abilities = new AbilitySystem(content, new StatusSystem(content));
    const phases = new BossSystem(content);
    const bossState = world.getComponent<BossStateComponent>("bossState", boss)!;
    bossState.phaseEnterLeft = 0;

    abilities.update(world, [{
      type: "cast",
      actor: boss,
      slot: "skill_up",
      aimX: 1,
      aimZ: 0,
    }], 0, []);
    expect(abilities.pendingCount).toBe(1);
    const heroHealth = world.getComponent<HealthComponent>("health", hero)!;
    const before = heroHealth.current;

    const bossHealth = world.getComponent<HealthComponent>("health", boss)!;
    bossHealth.current = bossHealth.max * 0.65;
    phases.update(world, []);
    expect(bossState.abilityEpoch).toBe(1);
    abilities.update(world, [], 0.31, []);
    expect(abilities.pendingCount).toBe(0);
    expect(heroHealth.current).toBe(before);

    const events: GameplayEvent[] = [];
    world.getComponent<AbilityLoadoutComponent>("abilityLoadout", boss)!.cooldowns.melee =
      createAbilityChargeState();
    abilities.update(world, [{
      type: "cast",
      actor: boss,
      slot: "melee",
      aimX: 1,
      aimZ: 0,
    }], 0, events);
    expect(events.some((event) => event.type === "ability_cast")).toBe(false);
  });

  it("caps pending effect tasks at 64", () => {
    const { world, hero, content } = makeAbilityWorld();
    content.registerAbility({
      id: "ability.delay_storm",
      name: "Delay Storm",
      slot: "active",
      cooldown: 1,
      action: "skill",
      actionTime: 0.2,
      visual: "vfx.delay_storm",
      effect: {
        type: "parallel",
        children: Array.from({ length: 70 }, () => ({
          type: "delay" as const,
          seconds: 1,
          child: { type: "select_self" as const },
        })),
      },
    });
    content.validate();
    world.getComponent<AbilityLoadoutComponent>("abilityLoadout", hero)!.slots.skill_down =
      "ability.delay_storm";
    const system = new AbilitySystem(content, new StatusSystem(content));

    system.update(world, [{
      type: "cast",
      actor: hero,
      slot: "skill_down",
      aimX: 1,
      aimZ: 0,
    }], 0, []);
    expect(system.pendingCount).toBe(64);
  });
});
