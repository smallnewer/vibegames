import { describe, expect, it } from "vitest";
import type { ActorComponent } from "../../../game/actor/ActorComponents";
import { ActorFactory } from "../../../game/actor/ActorFactory";
import { SummonSystem } from "../../../game/ability/SummonSystem";
import { createCoreContent } from "../../../game/content/coreContent";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";

describe("SummonSystem", () => {
  it("inherits owner faction, has no drops, and replaces the oldest same-owner summon", () => {
    const content = createCoreContent();
    const world = new World();
    const factory = new ActorFactory(content);
    const owner = factory.create(world, "hero.ember_runner", 0, 0, { playerSlot: 1 });
    const system = new SummonSystem(factory);
    const events: GameplayEvent[] = [];
    const spawn = () => system.spawn(world, {
      source: owner,
      actor: "enemy.ember_stalker",
      x: 1,
      z: 0,
      duration: 4,
      maxOwned: 2,
    }, events);
    const first = spawn()!;
    const second = spawn()!;
    const third = spawn()!;

    expect(world.hasEntity(first)).toBe(false);
    expect(world.entitiesWith("summon")).toEqual([second, third]);
    expect(world.getComponent<ActorComponent>("actor", third)?.faction).toBe("hero");
    expect(world.getComponent("dropTable", third)).toBeUndefined();
    expect(events.filter((event) => event.type === "summon_spawned")).toHaveLength(3);
    expect(events.filter((event) => event.type === "summon_removed")).toHaveLength(1);
  });

  it("cleans up at lifetime, owner death, and reset with a global cap of eight", () => {
    const content = createCoreContent();
    const world = new World();
    const factory = new ActorFactory(content);
    const owners = Array.from({ length: 5 }, (_, index) => (
      factory.create(world, "hero.ember_runner", index, 0, { playerSlot: 1 })
    ));
    const system = new SummonSystem(factory);
    const events: GameplayEvent[] = [];
    for (let index = 0; index < 8; index += 1) {
      expect(system.spawn(world, {
        source: owners[Math.floor(index / 2)],
        actor: "enemy.ember_stalker",
        x: index,
        z: 0,
        duration: index === 0 ? 0.1 : 4,
        maxOwned: 2,
      }, events)).toBeDefined();
    }
    expect(system.spawn(world, {
      source: owners[4],
      actor: "enemy.ember_stalker",
      x: 9,
      z: 0,
      duration: 4,
      maxOwned: 2,
    }, events)).toBeUndefined();

    system.update(world, 0.1, events);
    expect(world.entitiesWith("summon")).toHaveLength(7);
    world.getComponent<ActorComponent>("actor", owners[1])!.action = "dead";
    system.update(world, 0.01, events);
    expect(world.entitiesWith("summon")).toHaveLength(5);
    system.clear(world, events);
    expect(world.entitiesWith("summon")).toHaveLength(0);
  });
});
