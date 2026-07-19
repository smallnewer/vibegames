import type { GameplayEvent } from "../core/GameplayEvent";
import type { EntityId, World } from "../core/World";
import type { PlayerSlotId } from "../player/PlayerSlot";
import type { DungeonObjectiveSnapshot, DungeonRunComponent, DungeonRunPhase } from "./DungeonRunComponents";
import { isRuntimeEncounter, type DungeonPack, type EncounterDef } from "./DungeonDefinitions";

export class DungeonRunSystem {
  constructor(private readonly definition: DungeonPack) {}

  update(
    world: World,
    dungeon: EntityId,
    events: GameplayEvent[],
    activePlayers: readonly PlayerSlotId[],
  ): void {
    const run = world.getComponent<DungeonRunComponent>("dungeonRun", dungeon);
    if (!run || run.phase === "completed") return;
    if (run.phase === "entering") this.transition(run, "exploring", events);

    const facts = [...events];
    for (const event of facts) {
      if (event.type === "encounter_started") this.startEncounter(run, event.encounter, events);
      if (event.type === "encounter_completed") this.completeEncounter(run, event.encounter, events);
      if (event.type === "elite_reward_claimed" && run.phase === "elite_reward") {
        this.transition(run, "exploring", events);
      }
      if (event.type === "boss_intro_completed" && run.phase === "boss_intro") {
        this.transition(run, "boss_combat", events);
      }
      if (event.type === "dungeon_reward_claimed" && run.phase === "reward") {
        if (!run.claimedRewardPlayers.includes(event.player)) {
          run.claimedRewardPlayers.push(event.player);
          run.claimedRewardPlayers.sort((left, right) => left - right);
        }
      }
      if (event.type === "dungeon_reward_settled" && run.phase === "reward") {
        const allClaimed = activePlayers.every((slot) => run.claimedRewardPlayers.includes(slot));
        const bossCompleted = this.definition.run !== undefined
          && run.completedEncounters.includes(this.definition.run.bossEncounter);
        if (allClaimed && bossCompleted) {
          this.transition(run, "completed", events);
          events.push({
            type: "dungeon_completed",
            dungeon: run.definition,
            difficulty: run.difficulty,
          });
        }
      }
      if (event.type === "party_wiped" && run.phase !== "party_wipe") {
        this.transition(run, "party_wipe", events);
      }
    }
  }

  objective(run: DungeonRunComponent): DungeonObjectiveSnapshot {
    const total = this.definition.encounters.filter(isRuntimeEncounter).length;
    const current = run.completedEncounters.length;
    const encounter = run.activeEncounter
      ? this.runtimeEncounter(run.activeEncounter)
      : undefined;
    const values: Record<DungeonRunPhase, readonly [string, string]> = {
      entering: ["objective.enter", `进入${this.definition.name}`],
      exploring: ["objective.explore", `寻找下一场遭遇（${current}/${total}）`],
      encounter: ["objective.encounter", `清除${encounter?.id ?? "当前遭遇"}`],
      elite_reward: ["objective.elite_reward", "领取精英战利品"],
      boss_intro: ["objective.boss_intro", `迎战${this.definition.lore.boss.name}`],
      boss_combat: ["objective.boss", `击败${this.definition.lore.boss.name}`],
      reward: ["objective.reward", "领取个人 Boss 奖励"],
      completed: ["objective.completed", "地下城已完成"],
      party_wipe: ["objective.party_wipe", "队伍覆灭，返回检查点"],
    };
    const [id, text] = values[run.phase];
    return { id, current, total, text };
  }

  private startEncounter(
    run: DungeonRunComponent,
    encounterId: string,
    events: GameplayEvent[],
  ): void {
    if (run.phase !== "exploring" || run.completedEncounters.includes(encounterId)) return;
    const encounter = this.runtimeEncounter(encounterId);
    if (!encounter) return;
    run.activeEncounter = encounterId;
    if (encounter.kind === "boss") {
      if (this.definition.run?.bossEncounter !== encounterId) return;
      run.checkpoint = encounter.checkpoint;
      this.transition(run, "boss_intro", events);
      if (encounter.checkpoint) events.push({ type: "checkpoint_activated", checkpoint: encounter.checkpoint });
      return;
    }
    this.transition(run, "encounter", events);
  }

  private completeEncounter(
    run: DungeonRunComponent,
    encounterId: string,
    events: GameplayEvent[],
  ): void {
    if (run.activeEncounter !== encounterId) return;
    const encounter = this.runtimeEncounter(encounterId);
    if (!encounter) return;
    const legal = encounter.kind === "boss"
      ? run.phase === "boss_combat"
      : run.phase === "encounter";
    if (!legal) return;
    if (!run.completedEncounters.includes(encounterId)) {
      run.completedEncounters.push(encounterId);
    }
    run.activeEncounter = undefined;
    this.transition(
      run,
      encounter.kind === "boss" ? "reward" : encounter.kind === "elite" ? "elite_reward" : "exploring",
      events,
    );
  }

  private runtimeEncounter(id: string): EncounterDef | undefined {
    const encounter = this.definition.encounterById.get(id);
    return encounter && isRuntimeEncounter(encounter) ? encounter : undefined;
  }

  private transition(
    run: DungeonRunComponent,
    to: DungeonRunPhase,
    events: GameplayEvent[],
  ): void {
    if (run.phase === to) return;
    const from = run.phase;
    run.phase = to;
    events.push({ type: "dungeon_phase_changed", from, to });
  }
}
