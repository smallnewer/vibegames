import {
  createAbilityChargeState,
  type AbilityLoadoutComponent,
} from "../ability/AbilityComponents";
import type { AiStateComponent } from "../ai/AiComponents";
import type {
  ActorComponent,
  HealthComponent,
  TransformComponent,
} from "../actor/ActorComponents";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { EntityId, World } from "../core/World";
import type { DownedComponent } from "../party/DownedComponents";
import type { StatusComponent } from "../status/StatusComponents";
import type { DungeonStateComponent, InteractableComponent } from "./DungeonComponents";
import type { EncounterRuntimeComponent } from "./EncounterComponents";
import type { DungeonPack, InteractionState } from "./DungeonDefinitions";
import type { DungeonRunComponent } from "./DungeonRunComponents";

const INITIAL_INTRO_SECONDS = 0.8;
const RESET_INTRO_SECONDS = 1.5;
const SLOT_OFFSETS = [-1.5, -0.5, 0.5, 1.5] as const;

export interface CheckpointStateComponent {
  id: string;
  encounter: string;
  completedEncounters: string[];
  interactionStates: { definition: string; state: InteractionState }[];
  introLeft: number;
  resetCount: number;
}

export class CheckpointSystem {
  constructor(private readonly definition: DungeonPack) {}

  update(
    world: World,
    dungeon: EntityId,
    players: readonly EntityId[],
    step: number,
    facts: readonly GameplayEvent[],
    events: GameplayEvent[],
  ): void {
    let startedIntro = false;
    for (const event of facts) {
      if (event.type === "checkpoint_activated") {
        startedIntro = this.capture(world, dungeon, event.checkpoint);
      }
    }
    for (const event of facts) {
      if (event.type !== "party_wiped") continue;
      const checkpoint = world.getComponent<CheckpointStateComponent>("checkpointState", dungeon);
      if (!checkpoint) continue;
      this.reset(world, dungeon, players, checkpoint, events);
      startedIntro = true;
    }

    const checkpoint = world.getComponent<CheckpointStateComponent>("checkpointState", dungeon);
    const run = world.getComponent<DungeonRunComponent>("dungeonRun", dungeon);
    if (!checkpoint || !run || run.phase !== "boss_intro" || startedIntro) return;
    checkpoint.introLeft = Math.max(0, checkpoint.introLeft - step);
    if (checkpoint.introLeft === 0) {
      events.push({ type: "boss_intro_completed", encounter: checkpoint.encounter });
    }
  }

  private capture(world: World, dungeon: EntityId, id: string): boolean {
    const run = world.getComponent<DungeonRunComponent>("dungeonRun", dungeon);
    if (!run?.activeEncounter) return false;
    world.setComponent<CheckpointStateComponent>("checkpointState", dungeon, {
      id,
      encounter: run.activeEncounter,
      completedEncounters: [...run.completedEncounters],
      interactionStates: world.entitiesWith("interactable").map((entity) => {
        const interaction = world.getComponent<InteractableComponent>("interactable", entity)!;
        return { definition: interaction.definition, state: interaction.state };
      }),
      introLeft: INITIAL_INTRO_SECONDS,
      resetCount: 0,
    });
    return true;
  }

  private reset(
    world: World,
    dungeon: EntityId,
    players: readonly EntityId[],
    checkpoint: CheckpointStateComponent,
    events: GameplayEvent[],
  ): void {
    for (const projectile of world.entitiesWith("projectile")) world.destroyEntity(projectile);
    for (const enemy of world.entitiesWith("actor")) {
      if (world.getComponent<ActorComponent>("actor", enemy)?.faction === "enemy") {
        world.destroyEntity(enemy);
      }
    }

    const encounter = this.definition.encounterById.get(checkpoint.encounter);
    if (!encounter || !("waves" in encounter)) return;
    const runtimeEntity = world.entitiesWith("encounterRuntime").find((entity) => (
      world.getComponent<EncounterRuntimeComponent>("encounterRuntime", entity)!.definition
        === checkpoint.encounter
    ));
    if (runtimeEntity !== undefined) {
      const runtime = world.getComponent<EncounterRuntimeComponent>("encounterRuntime", runtimeEntity)!;
      runtime.state = "active";
      runtime.waveIndex = 0;
      runtime.nextWaveIn = encounter.waves[0].delay;
      runtime.members = [];
      runtime.partySizeAtStart = Math.max(1, Math.min(4, players.length)) as 1 | 2 | 3 | 4;
    }

    players.forEach((player, index) => {
      const transform = world.getComponent<TransformComponent>("transform", player)!;
      const actor = world.getComponent<ActorComponent>("actor", player)!;
      const health = world.getComponent<HealthComponent>("health", player)!;
      transform.x = encounter.trigger.x + SLOT_OFFSETS[index];
      transform.z = encounter.trigger.z;
      transform.previousX = transform.x;
      transform.previousZ = transform.z;
      health.current = health.max;
      actor.action = "idle";
      actor.actionLeft = 0;
      actor.actionDuration = 0;
      actor.actionMotion = undefined;
      actor.invulnerableLeft = 0;
      const downed = world.getComponent<DownedComponent>("downed", player);
      if (downed) {
        downed.state = "alive";
        downed.timeLeft = 0;
        downed.reviveProgress = 0;
        downed.revivedBy = undefined;
      }
      const statuses = world.getComponent<StatusComponent>("statuses", player);
      if (statuses) statuses.values = [];
      const loadout = world.getComponent<AbilityLoadoutComponent>("abilityLoadout", player);
      if (loadout) {
        for (const slot of Object.keys(loadout.cooldowns) as (keyof typeof loadout.cooldowns)[]) {
          loadout.cooldowns[slot] = createAbilityChargeState();
        }
      }
      const ai = world.getComponent<AiStateComponent>("aiState", player);
      if (ai) {
        ai.target = undefined;
        ai.pendingCast = undefined;
        ai.threat.clear();
      }
    });

    for (const saved of checkpoint.interactionStates) {
      const entity = world.entitiesWith("interactable").find((candidate) => (
        world.getComponent<InteractableComponent>("interactable", candidate)!.definition
          === saved.definition
      ));
      if (entity === undefined) continue;
      const interaction = world.getComponent<InteractableComponent>("interactable", entity)!;
      if (interaction.state === saved.state) continue;
      interaction.state = saved.state;
      events.push({ type: "interaction_changed", target: entity, state: saved.state });
    }

    const run = world.getComponent<DungeonRunComponent>("dungeonRun", dungeon)!;
    const from = run.phase;
    run.phase = "boss_intro";
    run.activeEncounter = checkpoint.encounter;
    run.completedEncounters = [...checkpoint.completedEncounters];
    run.claimedRewardPlayers = [];
    if (from !== run.phase) events.push({ type: "dungeon_phase_changed", from, to: run.phase });
    const dungeonState = world.getComponent<DungeonStateComponent>("dungeon", dungeon);
    if (dungeonState) {
      dungeonState.encounter = "active";
      dungeonState.door = "locked";
    }
    checkpoint.introLeft = RESET_INTRO_SECONDS;
    checkpoint.resetCount += 1;
    events.push({
      type: "checkpoint_reset",
      checkpoint: checkpoint.id,
      encounter: checkpoint.encounter,
    });
  }
}
