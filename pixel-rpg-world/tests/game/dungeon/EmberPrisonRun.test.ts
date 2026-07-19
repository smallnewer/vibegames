import { describe, expect, it } from "vitest";
import type { ActorComponent, HealthComponent, TransformComponent } from "../../../game/actor/ActorComponents";
import type { BossStateComponent } from "../../../game/boss/BossComponents";
import { DungeonRegistry } from "../../../game/content/DungeonRegistry";
import { GameSimulation } from "../../../game/core/GameSimulation";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import type { World } from "../../../game/core/World";
import type { EncounterMemberComponent } from "../../../game/dungeon/DungeonComponents";
import type { EncounterRuntimeComponent } from "../../../game/dungeon/EncounterComponents";
import { isRuntimeEncounter } from "../../../game/dungeon/DungeonDefinitions";
import type { InventoryComponent, LootComponent } from "../../../game/item/ItemComponents";
import type { PlayerSlotComponent } from "../../../game/player/PlayerSlot";

function simulationWorld(simulation: GameSimulation): World {
  return (simulation as unknown as { world: World }).world;
}

describe("Ember Prison vertical slice", () => {
  it.each([1, 2] as const)(
    "completes all encounters, Boss phases, and personal rewards with %i player(s)",
    (playerCount) => {
    const definition = new DungeonRegistry().get("dungeon.production_foundation");
    const simulation = new GameSimulation({
      dungeonId: definition.id,
      playerCount,
      runSeed: 0x1234_5678,
    });
    const world = simulationWorld(simulation);
    simulation.tick(1 / 60, []);
    expect(simulation.snapshot().run.phase).toBe("exploring");

    const route = [
      "encounter.refuge_gate",
      "encounter.armory_crossing",
      "encounter.forge_floor",
      "encounter.ember_champion",
    ] as const;
    for (const encounterId of route) {
      const encounter = definition.encounterById.get(encounterId)!;
      expect(isRuntimeEncounter(encounter)).toBe(true);
      if (!isRuntimeEncounter(encounter)) throw new Error(`Legacy encounter: ${encounterId}`);
      for (const player of simulation.players) {
        const transform = world.getComponent<TransformComponent>("transform", player)!;
        Object.assign(transform, {
          x: encounter.trigger.x,
          z: encounter.trigger.z,
          previousX: encounter.trigger.x,
          previousZ: encounter.trigger.z,
        });
      }
      const started = simulation.tick(1 / 60, []);
      expect(started).toContainEqual({ type: "encounter_started", encounter: encounterId });
      const door = simulation.snapshot().interactions.find((interaction) => (
        interaction.definition === encounter.lockInteractions[0]
      ));
      expect(door?.state).toBe("disabled");

      const runtimeEntity = world.entitiesWith("encounterRuntime").find((entity) => (
        world.getComponent<EncounterRuntimeComponent>("encounterRuntime", entity)!.definition
          === encounterId
      ))!;
      let completed = false;
      for (let tick = 0; tick < 80 && !completed; tick += 1) {
        const runtime = world.getComponent<EncounterRuntimeComponent>(
          "encounterRuntime",
          runtimeEntity,
        )!;
        for (const member of runtime.members) {
          const actor = world.getComponent<ActorComponent>("actor", member);
          const health = world.getComponent<HealthComponent>("health", member);
          if (actor && health && actor.action !== "dead") {
            actor.action = "dead";
            health.current = 0;
          }
        }
        const events = simulation.tick(0.1, []);
        completed = events.some((event) => (
          event.type === "encounter_completed" && event.encounter === encounterId
        ));
      }
      expect(completed).toBe(true);
      expect(simulation.snapshot().interactions.find((interaction) => (
        interaction.definition === encounter.lockInteractions[0]
      ))?.state).toBe("completed");
      expect(simulation.snapshot().run.phase).toBe("exploring");
    }

    const bossEncounter = definition.encounterById.get("encounter.warden_hearn")!;
    expect(isRuntimeEncounter(bossEncounter)).toBe(true);
    if (!isRuntimeEncounter(bossEncounter)) throw new Error("Legacy Boss encounter");
    for (const player of simulation.players) {
      const transform = world.getComponent<TransformComponent>("transform", player)!;
      Object.assign(transform, {
        x: bossEncounter.trigger.x,
        z: bossEncounter.trigger.z,
        previousX: bossEncounter.trigger.x,
        previousZ: bossEncounter.trigger.z,
      });
    }
    expect(simulation.tick(1 / 60, [])).toContainEqual({
      type: "checkpoint_activated",
      checkpoint: "checkpoint.warden_hearn",
    });
    expect(simulation.snapshot().run.phase).toBe("boss_intro");
    simulation.tick(0.4, []);
    simulation.tick(0.4, []);
    expect(simulation.snapshot().run.phase).toBe("boss_combat");

    const boss = world.entitiesWith("encounterMember").find((entity) => (
      world.getComponent<EncounterMemberComponent>("encounterMember", entity)?.member
        === "member.warden_hearn"
    ))!;
    const bossHealth = world.getComponent<HealthComponent>("health", boss)!;
    const phaseEvents: GameplayEvent[] = [];
    bossHealth.current = bossHealth.max * 0.65;
    phaseEvents.push(...simulation.tick(1 / 60, []));
    bossHealth.current = bossHealth.max * 0.3;
    phaseEvents.push(...simulation.tick(1 / 60, []));
    expect(phaseEvents.filter((event) => event.type === "boss_phase_started").map((event) => (
      event.type === "boss_phase_started" ? event.phaseId : ""
    ))).toEqual(["phase.burning_edict", "phase.last_lock"]);
    expect(world.getComponent<BossStateComponent>("bossState", boss)?.phaseIndex).toBe(2);

    bossHealth.current = 0;
    world.getComponent<ActorComponent>("actor", boss)!.action = "dead";
    const rewardEvents = simulation.tick(0.1, []);
    expect(rewardEvents).toContainEqual({
      type: "encounter_completed",
      encounter: "encounter.warden_hearn",
    });
    expect(simulation.snapshot().run.phase).toBe("reward");
    expect(simulation.snapshot().loot).toHaveLength(playerCount);

    for (const lootEntity of world.entitiesWith("loot")) {
      const loot = world.getComponent<LootComponent>("loot", lootEntity)!;
      const player = simulation.players.find((actor) => (
        world.getComponent<PlayerSlotComponent>("playerSlot", actor)?.slot === loot.owner
      ))!;
      const transform = world.getComponent<TransformComponent>("transform", player)!;
      transform.x = loot.x;
      transform.z = loot.z;
      transform.previousX = loot.x;
      transform.previousZ = loot.z;
    }
    const completedEvents = simulation.tick(1 / 60, []);
    expect(completedEvents).toContainEqual({
      type: "dungeon_completed",
      dungeon: definition.id,
      difficulty: "normal",
    });
    expect(simulation.snapshot().run).toMatchObject({
      phase: "completed",
      completedEncounters: [
        "encounter.refuge_gate",
        "encounter.armory_crossing",
        "encounter.forge_floor",
        "encounter.ember_champion",
        "encounter.warden_hearn",
      ],
      reward: { pendingPlayers: [], firstClear: true, unlockDungeon: "dungeon.frost_mine" },
    });
    expect(simulation.snapshot().interactions.find((interaction) => (
      interaction.definition === definition.run!.completionPortal
    ))?.state).toBe("active");
    for (const player of simulation.players) {
      const inventory = world.getComponent<InventoryComponent>("inventory", player)!;
      expect(inventory.items).toHaveLength(8);
      expect(inventory.materials["material.seal"]).toBeGreaterThanOrEqual(1);
    }
    const portalDefinition = definition.interactionById.get(definition.run!.completionPortal)!;
    const portal = simulation.snapshot().interactions.find((interaction) => (
      interaction.definition === portalDefinition.id
    ))!;
    const heroTransform = world.getComponent<TransformComponent>("transform", simulation.hero)!;
    Object.assign(heroTransform, {
      x: portalDefinition.x,
      z: portalDefinition.z,
      previousX: portalDefinition.x,
      previousZ: portalDefinition.z,
    });
    const exitEvents = simulation.tick(1 / 60, [{
      type: "interact",
      actor: simulation.hero,
      target: portal.id,
    }]);
    expect(exitEvents.some((event) => event.type === "actor_teleported")).toBe(true);
    expect(simulation.snapshot().dungeon.portalUses).toBe(1);
    },
  );
});
