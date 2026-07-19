import type { ActorComponent, HealthComponent, TransformComponent } from "../actor/ActorComponents";
import type { StatsComponent } from "../actor/Stats";
import { BALANCE_DATA } from "../content/generated/balance";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { EntityId, World } from "../core/World";
import type { DropTableComponent } from "../item/ItemComponents";
import type { DungeonStateComponent, EncounterMemberComponent, InteractableComponent } from "./DungeonComponents";
import type { EncounterRuntimeComponent } from "./EncounterComponents";
import { isRuntimeEncounter, type DungeonPack, type EncounterDef } from "./DungeonDefinitions";

export interface EncounterSpawner {
  spawnActor(archetype: string, level: number, x: number, z: number): EntityId;
}

export class EncounterSystem {
  constructor(
    private readonly definition: DungeonPack,
    private readonly spawner: EncounterSpawner,
  ) {}

  update(
    world: World,
    dungeonId: EntityId,
    players: readonly EntityId[],
    step: number,
    events: GameplayEvent[],
  ): void {
    for (const entity of world.entitiesWith("encounterRuntime")) {
      const runtime = world.getComponent<EncounterRuntimeComponent>("encounterRuntime", entity)!;
      const encounter = this.runtimeDefinition(runtime.definition);
      if (!encounter || runtime.state === "completed") continue;
      if (runtime.state === "idle" && this.triggered(world, players, encounter)) {
        this.activate(world, dungeonId, runtime, encounter, players, events);
      }
      if (runtime.state !== "active") continue;
      if (this.livingMembers(world, runtime).length > 0) continue;

      if (runtime.waveIndex < encounter.waves.length) {
        runtime.nextWaveIn = Math.max(0, runtime.nextWaveIn - step);
        if (runtime.nextWaveIn > 0) continue;
        if (this.liveEnemyCount(world) + encounter.waves[runtime.waveIndex].members.length > 30) continue;
        this.spawnWave(world, runtime, encounter, events);
        continue;
      }
      this.complete(world, dungeonId, runtime, encounter, events);
    }
  }

  private activate(
    world: World,
    dungeonId: EntityId,
    runtime: EncounterRuntimeComponent,
    encounter: EncounterDef,
    players: readonly EntityId[],
    events: GameplayEvent[],
  ): void {
    runtime.state = "active";
    runtime.waveIndex = 0;
    runtime.nextWaveIn = encounter.waves[0].delay;
    runtime.partySizeAtStart = Math.max(1, Math.min(4, players.length)) as 1 | 2 | 3 | 4;
    this.setLocks(world, encounter, "disabled", events);
    const dungeon = world.getComponent<DungeonStateComponent>("dungeon", dungeonId);
    if (dungeon) {
      dungeon.encounter = "active";
      dungeon.door = "locked";
    }
    events.push({ type: "encounter_started", encounter: encounter.id });
  }

  private spawnWave(
    world: World,
    runtime: EncounterRuntimeComponent,
    encounter: EncounterDef,
    events: GameplayEvent[],
  ): void {
    const wave = encounter.waves[runtime.waveIndex];
    const healthScale = BALANCE_DATA.partyHealth[runtime.partySizeAtStart - 1];
    const damageScale = BALANCE_DATA.partyDamage[runtime.partySizeAtStart - 1];
    for (const member of wave.members) {
      const spawn = this.definition.spawnById.get(member.spawn)!;
      const level = Math.max(1, Math.min(30, runtime.baseLevel + member.levelOffset));
      const actor = this.spawner.spawnActor(member.actor, level, spawn.x, spawn.z);
      world.setComponent<EncounterMemberComponent>("encounterMember", actor, {
        encounter: encounter.id,
        member: member.id,
        eliteAffix: member.eliteAffix,
      });
      const health = world.getComponent<HealthComponent>("health", actor);
      if (health) {
        health.max = Math.max(1, Math.round(health.max * healthScale));
        health.current = health.max;
      }
      const stats = world.getComponent<StatsComponent>("stats", actor);
      if (stats) {
        for (const stat of ["meleePower", "rangedPower", "skillPower"] as const) {
          stats.base[stat] *= damageScale;
          stats.final[stat] *= damageScale;
        }
      }
      const drop = world.getComponent<DropTableComponent>("dropTable", actor);
      if (drop) {
        drop.level = level;
        if (encounter.kind === "elite") drop.sourceType = "elite";
        if (encounter.kind === "boss") drop.sourceType = "boss";
      }
      runtime.members.push(actor);
      events.push({ type: "actor_spawned", actor, faction: "enemy" });
    }
    runtime.waveIndex += 1;
    runtime.nextWaveIn = runtime.waveIndex < encounter.waves.length
      ? encounter.waves[runtime.waveIndex].delay
      : 0;
  }

  private complete(
    world: World,
    dungeonId: EntityId,
    runtime: EncounterRuntimeComponent,
    encounter: EncounterDef,
    events: GameplayEvent[],
  ): void {
    runtime.state = "completed";
    this.setLocks(world, encounter, "completed", events);
    const dungeon = world.getComponent<DungeonStateComponent>("dungeon", dungeonId);
    if (dungeon) {
      dungeon.encounter = "completed";
      dungeon.door = "open";
    }
    events.push({ type: "encounter_completed", encounter: encounter.id });
    if (encounter.kind === "elite") {
      events.push({ type: "elite_reward_claimed", encounter: encounter.id });
    }
  }

  private triggered(world: World, players: readonly EntityId[], encounter: EncounterDef): boolean {
    return players.some((player) => {
      const actor = world.getComponent<ActorComponent>("actor", player);
      const transform = world.getComponent<TransformComponent>("transform", player);
      return actor?.action !== "dead"
        && transform !== undefined
        && Math.hypot(transform.x - encounter.trigger.x, transform.z - encounter.trigger.z)
          <= encounter.trigger.radius;
    });
  }

  private livingMembers(world: World, runtime: EncounterRuntimeComponent): EntityId[] {
    return runtime.members.filter((entity) => (
      world.hasEntity(entity)
      && world.getComponent<ActorComponent>("actor", entity)?.action !== "dead"
    ));
  }

  private liveEnemyCount(world: World): number {
    return world.entitiesWith("actor").filter((entity) => {
      const actor = world.getComponent<ActorComponent>("actor", entity)!;
      return actor.faction === "enemy" && actor.action !== "dead";
    }).length;
  }

  private setLocks(
    world: World,
    encounter: EncounterDef,
    state: "disabled" | "completed",
    events: GameplayEvent[],
  ): void {
    for (const interactionId of encounter.lockInteractions) {
      const entity = world.entitiesWith("interactable").find((candidate) => (
        world.getComponent<InteractableComponent>("interactable", candidate)!.definition === interactionId
      ));
      if (entity === undefined) continue;
      world.getComponent<InteractableComponent>("interactable", entity)!.state = state;
      events.push({ type: "interaction_changed", target: entity, state });
    }
  }

  private runtimeDefinition(id: string): EncounterDef | undefined {
    const encounter = this.definition.encounterById.get(id);
    return encounter && isRuntimeEncounter(encounter) ? encounter : undefined;
  }
}
