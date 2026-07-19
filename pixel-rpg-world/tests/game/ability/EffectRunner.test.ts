import { describe, expect, it } from "vitest";
import { EffectRunner } from "../../../game/ability/EffectRunner";
import type { ActorComponent, HealthComponent, TransformComponent } from "../../../game/actor/ActorComponents";
import type { StatsComponent } from "../../../game/actor/Stats";
import { createCoreContent } from "../../../game/content/coreContent";
import { completeStatBlock } from "../../../game/content/Definitions";
import type { DamageSpec } from "../../../game/combat/DamagePacket";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import type { GroundNavigation } from "../../../game/ports/GroundNavigation";
import type { StatusComponent } from "../../../game/status/StatusComponents";
import { StatusSystem } from "../../../game/status/StatusSystem";

function actor(world: World, faction: "hero" | "enemy", x: number, z = 0) {
  const id = world.createEntity();
  world.setComponent<ActorComponent>("actor", id, {
    faction,
    action: "idle",
    actionLeft: 0,
    actionDuration: 0,
    moveX: 0,
    moveZ: 0,
    speed: 4,
    radius: 0.5,
    rollCooldownLeft: 0,
    invulnerableLeft: 0,
  });
  world.setComponent<TransformComponent>("transform", id, {
    x,
    z,
    previousX: x,
    previousZ: z,
    facingX: 1,
    facingZ: 0,
  });
  world.setComponent<HealthComponent>("health", id, { current: 60, max: 100 });
  world.setComponent<StatsComponent>("stats", id, {
    base: completeStatBlock({ maxHealth: 100, moveSpeed: 4, meleePower: 40, rangedPower: 30 }),
    final: completeStatBlock({ maxHealth: 100, moveSpeed: 4, meleePower: 40, rangedPower: 30 }),
    breakdown: {} as StatsComponent["breakdown"],
  });
  world.setComponent<StatusComponent>("statuses", id, { values: [] });
  return id;
}

function flatDamage(amount: number): DamageSpec {
  return {
    damageType: "physical",
    minBase: amount,
    maxBase: amount,
    scalingStat: "skillPower",
    coefficient: 0,
    canCrit: false,
    procCoefficient: 1,
  };
}

function makeRunner(navigation?: GroundNavigation) {
  const world = new World();
  const hero = actor(world, "hero", 0);
  const near = actor(world, "enemy", 1.5);
  const far = actor(world, "enemy", 4);
  const content = createCoreContent();
  return {
    world,
    hero,
    near,
    far,
    statuses: new StatusSystem(content),
    runner: new EffectRunner(content, new StatusSystem(content), navigation),
  };
}

describe("EffectRunner", () => {
  it("applies an elemental weapon status through the formal effect graph", () => {
    const { world, hero, near, runner } = makeRunner();
    const content = createCoreContent();
    const events: GameplayEvent[] = [];

    runner.run(
      world,
      hero,
      2,
      0,
      content.ability("ability.weapon.ember_blade").effect,
      events,
    );

    expect(world.getComponent<HealthComponent>("health", near)!.current).toBe(20);
    expect(world.getComponent<StatusComponent>("statuses", near)!.values)
      .toContainEqual({
        id: "status.burning",
        stacks: 1,
        duration: 3.5,
        timeLeft: 3.5,
        source: hero,
      });
    expect(content.status("status.burning").visual).toBe("vfx.status.burning");
  });

  it("selects circle/cone targets and keeps parallel target state isolated", () => {
    const { world, hero, near, far, runner } = makeRunner();
    const events: GameplayEvent[] = [];
    runner.run(world, hero, 5, 0, {
      type: "parallel",
      children: [
        {
          type: "sequence",
          children: [
            { type: "query_circle", center: "source", radius: 2 },
            { type: "damage", value: flatDamage(10) },
          ],
        },
        {
          type: "sequence",
          children: [
            { type: "select_self" },
            { type: "heal", value: { type: "flat", amount: 80 } },
          ],
        },
      ],
    }, events);

    expect(world.getComponent<HealthComponent>("health", near)!.current).toBe(50);
    expect(world.getComponent<HealthComponent>("health", far)!.current).toBe(60);
    expect(world.getComponent<HealthComponent>("health", hero)!.current).toBe(100);
    expect(events.filter((event) => event.type === "damage_applied")).toHaveLength(1);
    expect(events).toContainEqual({ type: "healing_applied", source: hero, target: hero, amount: 40 });
  });

  it("removes statuses and routes knockback/teleport through navigation", () => {
    const destinations: Array<{ x: number; z: number }> = [];
    const navigation: GroundNavigation = {
      move(_start, destination) {
        destinations.push(destination);
        return { x: Math.min(destination.x, 2), z: destination.z };
      },
      path: (start, destination) => [start, destination],
      dispose() {},
    };
    const { world, hero, near, runner, statuses } = makeRunner(navigation);
    statuses.apply(world, near, "status.battle_focus", 1, []);

    runner.run(world, hero, 10, 0, {
      type: "sequence",
      children: [
        { type: "query_cone", range: 2, frontDot: 0.5 },
        { type: "remove_status", status: "status.battle_focus" },
        { type: "knockback", distance: 2 },
        { type: "teleport_forward", distance: 4 },
      ],
    }, []);

    expect(world.getComponent<StatusComponent>("statuses", near)!.values).toEqual([]);
    expect(world.getComponent<TransformComponent>("transform", near)!.x).toBe(2);
    expect(world.getComponent<TransformComponent>("transform", hero)!.x).toBe(2);
    expect(destinations).toHaveLength(2);
  });

  it("returns delayed work without executing it immediately", () => {
    const { world, hero, near, runner } = makeRunner();
    const scheduled = runner.run(world, hero, 0, 0, {
      type: "sequence",
      children: [
        { type: "query_circle", center: "source", radius: 2 },
        {
          type: "delay",
          seconds: 0.25,
          child: { type: "damage", value: flatDamage(10) },
        },
      ],
    }, []);

    expect(world.getComponent<HealthComponent>("health", near)!.current).toBe(60);
    expect(scheduled).toEqual([{
      seconds: 0.25,
      node: { type: "damage", value: flatDamage(10) },
      targets: [near],
    }]);
  });

  it("routes authored summons through the bounded spawn port", () => {
    const { world, hero, statuses } = makeRunner();
    const content = createCoreContent();
    const spawns: Array<{ actor: string; x: number; z: number }> = [];
    const runner = new EffectRunner(content, statuses, undefined, undefined, {
      spawnActor(_world, _source, archetype, x, z) {
        spawns.push({ actor: archetype, x, z });
        return undefined;
      },
    });

    runner.run(world, hero, 0, 0, {
      type: "summon_actor",
      actor: "enemy.ember_gaoler",
      count: 2,
      radius: 2.5,
    }, []);

    expect(spawns).toEqual([
      { actor: "enemy.ember_gaoler", x: 2.5, z: 0 },
      { actor: "enemy.ember_gaoler", x: -2.5, z: expect.closeTo(0) },
    ]);
  });

  it("integrates line and chain targeting without repeated targets", () => {
    const { world, hero, near, far, runner } = makeRunner();
    const events: GameplayEvent[] = [];
    runner.run(world, hero, 5, 0, {
      type: "sequence",
      children: [
        { type: "query_line", length: 5, width: 1 },
        { type: "chain_targets", range: 3, maxTargets: 2 },
        { type: "damage", value: flatDamage(10) },
      ],
    }, events);

    expect(world.getComponent<HealthComponent>("health", near)!.current).toBe(50);
    expect(world.getComponent<HealthComponent>("health", far)!.current).toBe(50);
    expect(events.filter((event) => event.type === "damage_applied")).toHaveLength(2);
  });

  it("routes hazards and bounded summons and schedules repeated children", () => {
    const { world, hero, statuses } = makeRunner();
    const content = createCoreContent();
    const runtimeCalls: string[] = [];
    const runner = new EffectRunner(content, statuses, undefined, undefined, {
      spawnHazard(_world, request) {
        runtimeCalls.push(`hazard:${request.visual}`);
        return 50;
      },
      spawnSummon(_world, request) {
        runtimeCalls.push(`summon:${request.actor}`);
        return 51;
      },
    });
    const repeated = runner.run(world, hero, 2, 3, {
      type: "sequence",
      children: [
        {
          type: "spawn_hazard",
          radius: 2,
          duration: 4,
          interval: 0.5,
          visual: "vfx.hazard.fixture",
          child: { type: "damage", value: flatDamage(2) },
        },
        {
          type: "spawn_summon",
          actor: "enemy.ember_stalker",
          duration: 6,
          maxOwned: 1,
        },
        {
          type: "repeat",
          count: 3,
          interval: 0.1,
          child: { type: "emit_visual", visual: "vfx.repeat.fixture" },
        },
      ],
    }, [], [], { skillId: "ability.fixture", actionSequence: 2 });

    expect(runtimeCalls).toEqual([
      "hazard:vfx.hazard.fixture",
      "summon:enemy.ember_stalker",
    ]);
    expect(repeated).toEqual([
      expect.objectContaining({ seconds: 0.1 }),
      expect.objectContaining({ seconds: 0.2 }),
    ]);
  });
});
