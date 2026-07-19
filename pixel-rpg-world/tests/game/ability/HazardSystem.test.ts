import { describe, expect, it } from "vitest";
import { HazardSystem } from "../../../game/ability/HazardSystem";
import type {
  ActorComponent,
  HealthComponent,
  TransformComponent,
} from "../../../game/actor/ActorComponents";
import type { EffectNode } from "../../../game/content/Definitions";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import { ActorFactory } from "../../../game/actor/ActorFactory";
import { EffectRunner } from "../../../game/ability/EffectRunner";
import { RunRng } from "../../../game/balance/RunRng";
import { createCoreContent } from "../../../game/content/coreContent";
import type { DropTableComponent } from "../../../game/item/ItemComponents";
import { DropSystem } from "../../../game/item/DropSystem";
import { StatusSystem } from "../../../game/status/StatusSystem";

function actor(world: World, faction: "hero" | "enemy", x: number): number {
  const entity = world.createEntity();
  world.setComponent<ActorComponent>("actor", entity, {
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
  world.setComponent<TransformComponent>("transform", entity, {
    x,
    z: 0,
    previousX: x,
    previousZ: 0,
    facingX: 1,
    facingZ: 0,
  });
  world.setComponent<HealthComponent>("health", entity, { current: 100, max: 100 });
  return entity;
}

const child: EffectNode = {
  type: "damage",
  value: {
    damageType: "poison",
    minBase: 5,
    maxBase: 5,
    scalingStat: "skillPower",
    coefficient: 0,
    canCrit: false,
    procCoefficient: 0.25,
  },
};

describe("HazardSystem", () => {
  it("ticks deterministically, filters factions, and supplies each target once per interval", () => {
    const world = new World();
    const owner = actor(world, "hero", 0);
    const enemy = actor(world, "enemy", 1);
    actor(world, "hero", 1.2);
    actor(world, "enemy", 4);
    const executions: number[][] = [];
    const system = new HazardSystem({
      execute(_world, _source, _x, _z, _node, _events, targets) {
        executions.push([...targets]);
      },
    });
    const events: GameplayEvent[] = [];
    const hazard = system.spawn(world, {
      source: owner,
      x: 0,
      z: 0,
      radius: 2,
      duration: 0.8,
      interval: 0.25,
      child,
      visual: "vfx.hazard.poison",
      skillId: "ability.fixture",
      actionSequence: 1,
    }, events);

    expect(hazard).toBeDefined();
    expect(events).toContainEqual(expect.objectContaining({ type: "hazard_spawned", hazard }));
    system.update(world, 0.1, events);
    system.update(world, 0.1, events);
    system.update(world, 0.05, events);
    expect(executions).toEqual([[enemy], [enemy]]);

    system.update(world, 0.55, events);
    expect(world.hasEntity(hazard!)).toBe(false);
    expect(executions).toHaveLength(4);
    expect(events.filter((event) => event.type === "hazard_removed")).toHaveLength(1);
  });

  it("caps hazards at 32 and cleans them when the owner dies or the dungeon resets", () => {
    const world = new World();
    const owner = actor(world, "hero", 0);
    const system = new HazardSystem({ execute() {} });
    const events: GameplayEvent[] = [];
    const request = {
      source: owner,
      x: 0,
      z: 0,
      radius: 1,
      duration: 2,
      interval: 0.25,
      child,
      visual: "vfx.hazard.poison",
      skillId: "ability.fixture",
      actionSequence: 1,
    } as const;
    for (let index = 0; index < 32; index += 1) {
      expect(system.spawn(world, request, events)).toBeDefined();
    }
    expect(system.spawn(world, request, events)).toBeUndefined();
    world.getComponent<ActorComponent>("actor", owner)!.action = "dead";
    system.update(world, 0.01, events);
    expect(world.entitiesWith("hazard")).toHaveLength(0);

    world.getComponent<ActorComponent>("actor", owner)!.action = "idle";
    system.spawn(world, request, events);
    system.clear(world, events);
    expect(world.entitiesWith("hazard")).toHaveLength(0);
  });

  it("lets a hazard kill produce exactly one drop batch in the same simulation tick", () => {
    const content = createCoreContent();
    const world = new World();
    const factory = new ActorFactory(content);
    const hero = factory.create(world, "hero.ember_runner", 0, 0, { playerSlot: 1 });
    const enemy = factory.create(world, "enemy.ember_stalker", 1, 0);
    world.getComponent<HealthComponent>("health", enemy)!.current = 5;
    world.setComponent<DropTableComponent>("dropTable", enemy, {
      sourceType: "elite",
      theme: "ember",
      level: 1,
      dropped: false,
    });
    const events: GameplayEvent[] = [];
    const runner = new EffectRunner(
      content,
      new StatusSystem(content),
      undefined,
      RunRng.fromSeed(7),
    );
    const hazards = new HazardSystem({
      execute(runWorld, source, x, z, node, runEvents, targets, execution) {
        runner.run(runWorld, source, x, z, node, runEvents, targets, execution);
      },
    });
    hazards.spawn(world, {
      source: hero,
      x: 1,
      z: 0,
      radius: 1,
      duration: 1,
      interval: 0.25,
      child,
      visual: "vfx.hazard.poison",
      skillId: "ability.fixture",
      actionSequence: 1,
    }, events);
    hazards.update(world, 1 / 60, events);
    const drops = new DropSystem(RunRng.fromSeed(7));
    drops.update(world, events);
    const firstBatch = events.filter((event) => event.type === "loot_spawned").length;
    expect(events.filter((event) => event.type === "actor_died")).toHaveLength(1);
    expect(firstBatch).toBeGreaterThan(0);

    drops.update(world, events);
    expect(events.filter((event) => event.type === "loot_spawned")).toHaveLength(firstBatch);
  });
});
