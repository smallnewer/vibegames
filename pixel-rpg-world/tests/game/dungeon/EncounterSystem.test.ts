import { describe, expect, it } from "vitest";
import type { ActorComponent, HealthComponent, TransformComponent } from "../../../game/actor/ActorComponents";
import { createStatBreakdown, type StatsComponent } from "../../../game/actor/Stats";
import { DungeonRegistry } from "../../../game/content/DungeonRegistry";
import { completeStatBlock } from "../../../game/content/Definitions";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import type { DungeonStateComponent, InteractableComponent } from "../../../game/dungeon/DungeonComponents";
import type { EncounterRuntimeComponent } from "../../../game/dungeon/EncounterComponents";
import { EncounterSystem } from "../../../game/dungeon/EncounterSystem";
import type { DropTableComponent } from "../../../game/item/ItemComponents";

const definition = new DungeonRegistry().get("dungeon.production_foundation");

function actor(world: World, faction: "hero" | "enemy", x: number, z: number) {
  const entity = world.createEntity();
  world.setComponent<ActorComponent>("actor", entity, {
    faction, action: "idle", actionLeft: 0, actionDuration: 0,
    moveX: 0, moveZ: 0, speed: 0, radius: 0.5,
    rollCooldownLeft: 0, invulnerableLeft: 0,
  });
  world.setComponent<TransformComponent>("transform", entity, {
    x, z, previousX: x, previousZ: z, facingX: 1, facingZ: 0,
  });
  return entity;
}

function fixture(encounterId: string, players: readonly [number, number][] = [[11, 12]]) {
  const world = new World();
  const dungeon = world.createEntity();
  world.setComponent<DungeonStateComponent>("dungeon", dungeon, {
    definition: definition.id, resources: {}, encounter: "idle", door: "locked", portalUses: 0,
  });
  for (const interaction of definition.interactions) {
    const entity = world.createEntity();
    world.setComponent<InteractableComponent>("interactable", entity, {
      definition: interaction.id,
      state: "idle",
    });
  }
  const runtimeEntity = world.createEntity();
  const runtime: EncounterRuntimeComponent = {
    definition: encounterId,
    state: "idle",
    waveIndex: 0,
    nextWaveIn: 0,
    members: [],
    partySizeAtStart: 1,
    baseLevel: 10,
  };
  world.setComponent<EncounterRuntimeComponent>("encounterRuntime", runtimeEntity, runtime);
  const playerEntities = players.map(([x, z]) => actor(world, "hero", x, z));
  const calls: { archetype: string; level: number; x: number; z: number; entity: number }[] = [];
  const system = new EncounterSystem(definition, {
    spawnActor(archetype, level, x, z) {
      const entity = actor(world, "enemy", x, z);
      world.setComponent<HealthComponent>("health", entity, { current: 100, max: 100 });
      const stats = completeStatBlock({ meleePower: 10, rangedPower: 10, skillPower: 10 });
      world.setComponent<StatsComponent>("stats", entity, {
        base: { ...stats }, final: { ...stats }, breakdown: createStatBreakdown(stats),
      });
      world.setComponent<DropTableComponent>("dropTable", entity, {
        sourceType: "minion", theme: "ember", level: 1, dropped: false,
      });
      calls.push({ archetype, level, x, z, entity });
      return entity;
    },
  });
  return { world, dungeon, runtime, playerEntities, calls, system };
}

describe("EncounterSystem", () => {
  it("triggers once, waits for living members, delays the next wave, and unlocks the door", () => {
    const value = fixture("encounter.refuge_gate");
    const events: GameplayEvent[] = [];
    value.system.update(value.world, value.dungeon, value.playerEntities, 0, events);
    expect(value.runtime.state).toBe("active");
    expect(value.calls).toHaveLength(4);
    expect(value.calls.map((call) => call.archetype)).toEqual([
      "enemy.ember_gaoler", "enemy.ember_gaoler", "enemy.ember_gaoler", "enemy.ember_gaoler",
    ]);
    const door = value.world.entitiesWith("interactable").find((entity) => (
      value.world.getComponent<InteractableComponent>("interactable", entity)!.definition
        === "interaction.door_refuge"
    ))!;
    expect(value.world.getComponent<InteractableComponent>("interactable", door)!.state).toBe("disabled");

    value.system.update(value.world, value.dungeon, value.playerEntities, 10, events);
    expect(value.calls).toHaveLength(4);
    for (const entity of value.runtime.members) {
      value.world.getComponent<ActorComponent>("actor", entity)!.action = "dead";
    }
    value.system.update(value.world, value.dungeon, value.playerEntities, 1, events);
    expect(value.calls).toHaveLength(4);
    value.system.update(value.world, value.dungeon, value.playerEntities, 0.25, events);
    expect(value.calls).toHaveLength(8);
    for (const entity of value.runtime.members) {
      value.world.getComponent<ActorComponent>("actor", entity)!.action = "dead";
    }
    value.system.update(value.world, value.dungeon, value.playerEntities, 0, events);
    expect(value.runtime.state).toBe("completed");
    expect(value.world.getComponent<InteractableComponent>("interactable", door)!.state).toBe("completed");
    expect(events.filter((event) => event.type === "encounter_started")).toHaveLength(1);
    expect(events.filter((event) => event.type === "encounter_completed")).toHaveLength(1);
  });

  it("locks 2P scaling at activation and keeps stable spawn order under the 30-enemy cap", () => {
    const value = fixture("encounter.armory_crossing", [[12, 0], [12.5, 0]]);
    value.system.update(value.world, value.dungeon, value.playerEntities, 0, []);
    expect(value.runtime.partySizeAtStart).toBe(2);
    expect(value.calls).toHaveLength(6);
    expect(value.world.entitiesWith("actor").filter((entity) => (
      value.world.getComponent<ActorComponent>("actor", entity)!.faction === "enemy"
    )).length).toBeLessThanOrEqual(30);
    const first = value.calls[0].entity;
    expect(value.world.getComponent<HealthComponent>("health", first)).toEqual({ current: 165, max: 165 });
    expect(value.world.getComponent<StatsComponent>("stats", first)!.base.meleePower).toBeCloseTo(10.8);
    expect(value.world.getComponent<DropTableComponent>("dropTable", first)!.level).toBe(10);

    actor(value.world, "hero", 12, 0);
    expect(value.runtime.partySizeAtStart).toBe(2);
  });
});
