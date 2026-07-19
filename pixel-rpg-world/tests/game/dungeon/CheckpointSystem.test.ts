import { describe, expect, it } from "vitest";
import type { AbilityLoadoutComponent } from "../../../game/ability/AbilityComponents";
import type { ActorComponent, HealthComponent, TransformComponent } from "../../../game/actor/ActorComponents";
import { ActorFactory } from "../../../game/actor/ActorFactory";
import { DungeonRegistry } from "../../../game/content/DungeonRegistry";
import { createCoreContent } from "../../../game/content/coreContent";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { World } from "../../../game/core/World";
import type { CheckpointStateComponent } from "../../../game/dungeon/CheckpointSystem";
import { CheckpointSystem } from "../../../game/dungeon/CheckpointSystem";
import type { DungeonStateComponent, InteractableComponent } from "../../../game/dungeon/DungeonComponents";
import type { EncounterRuntimeComponent } from "../../../game/dungeon/EncounterComponents";
import type { DungeonRunComponent } from "../../../game/dungeon/DungeonRunComponents";
import type { DownedComponent } from "../../../game/party/DownedComponents";
import type { StatusComponent } from "../../../game/status/StatusComponents";

describe("CheckpointSystem", () => {
  it("restores the Boss checkpoint without rolling back permanent run progress", () => {
    const definition = new DungeonRegistry().get("dungeon.production_foundation");
    const content = createCoreContent();
    const factory = new ActorFactory(content);
    const world = new World();
    const players = [
      factory.create(world, "hero.ember_runner", 65, 0, { playerSlot: 1 }),
      factory.create(world, "hero.ember_runner", 66, 0, { playerSlot: 2 }),
    ];
    const enemy = factory.create(world, "enemy.ember_stalker", 70, 0);
    const dungeon = world.createEntity();
    world.setComponent<DungeonStateComponent>("dungeon", dungeon, {
      definition: definition.id,
      resources: { ember_crystal: 2 },
      encounter: "active",
      door: "locked",
      portalUses: 0,
    });
    world.setComponent<DungeonRunComponent>("dungeonRun", dungeon, {
      definition: definition.id,
      phase: "boss_intro",
      activeEncounter: "encounter.warden_hearn",
      completedEncounters: [
        "encounter.refuge_gate",
        "encounter.armory_crossing",
        "encounter.forge_floor",
        "encounter.ember_champion",
      ],
      checkpoint: "checkpoint.warden_hearn",
      claimedRewardPlayers: [],
      runSeed: 123,
      difficulty: "normal",
    });
    const runtimeEntity = world.createEntity();
    world.setComponent<EncounterRuntimeComponent>("encounterRuntime", runtimeEntity, {
      definition: "encounter.warden_hearn",
      state: "active",
      waveIndex: 1,
      nextWaveIn: 0,
      members: [enemy],
      partySizeAtStart: 2,
      baseLevel: 4,
    });
    const door = world.createEntity();
    world.setComponent<InteractableComponent>("interactable", door, {
      definition: "interaction.door_boss",
      state: "disabled",
    });
    const system = new CheckpointSystem(definition);

    system.update(world, dungeon, players, 0, [
      { type: "checkpoint_activated", checkpoint: "checkpoint.warden_hearn" },
    ], []);
    expect(world.getComponent<CheckpointStateComponent>("checkpointState", dungeon)).toMatchObject({
      id: "checkpoint.warden_hearn",
      encounter: "encounter.warden_hearn",
      introLeft: 0.8,
    });

    const projectile = world.createEntity();
    world.setComponent("projectile", projectile, {});
    world.getComponent<InteractableComponent>("interactable", door)!.state = "completed";
    for (const player of players) {
      world.getComponent<HealthComponent>("health", player)!.current = 0;
      world.getComponent<ActorComponent>("actor", player)!.action = "dead";
      const life = world.getComponent<DownedComponent>("downed", player)!;
      life.state = "dead";
      world.getComponent<StatusComponent>("statuses", player)!.values = [{
        id: "status.battle_focus",
        stacks: 1,
        duration: 4,
        timeLeft: 3,
      }];
      world.getComponent<AbilityLoadoutComponent>("abilityLoadout", player)!.cooldowns.melee = {
        charges: 0,
        recharge: [2],
      };
    }

    const events: GameplayEvent[] = [];
    system.update(world, dungeon, players, 0, [{ type: "party_wiped" }], events);
    const run = world.getComponent<DungeonRunComponent>("dungeonRun", dungeon)!;
    const runtime = world.getComponent<EncounterRuntimeComponent>("encounterRuntime", runtimeEntity)!;
    expect(world.hasEntity(enemy)).toBe(false);
    expect(world.hasEntity(projectile)).toBe(false);
    expect(runtime).toMatchObject({ state: "active", waveIndex: 0, members: [] });
    expect(run).toMatchObject({
      phase: "boss_intro",
      activeEncounter: "encounter.warden_hearn",
      completedEncounters: [
        "encounter.refuge_gate",
        "encounter.armory_crossing",
        "encounter.forge_floor",
        "encounter.ember_champion",
      ],
    });
    expect(world.getComponent<InteractableComponent>("interactable", door)?.state).toBe("disabled");
    expect(players.map((player) => world.getComponent<TransformComponent>("transform", player)?.x))
      .toEqual([63.5, 64.5]);
    for (const player of players) {
      const health = world.getComponent<HealthComponent>("health", player)!;
      expect(health.current).toBe(health.max);
      expect(world.getComponent<DownedComponent>("downed", player)?.state).toBe("alive");
      expect(world.getComponent<StatusComponent>("statuses", player)?.values).toEqual([]);
      expect(world.getComponent<AbilityLoadoutComponent>("abilityLoadout", player)?.cooldowns.melee)
        .toEqual({ charges: 1, recharge: [] });
    }
    expect(events).toContainEqual({
      type: "checkpoint_reset",
      checkpoint: "checkpoint.warden_hearn",
      encounter: "encounter.warden_hearn",
    });

    const intro: GameplayEvent[] = [];
    system.update(world, dungeon, players, 1.5, [], intro);
    expect(intro).toContainEqual({
      type: "boss_intro_completed",
      encounter: "encounter.warden_hearn",
    });
  });
});
