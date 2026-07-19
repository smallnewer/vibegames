import type { ActorComponent, HealthComponent } from "../actor/ActorComponents";
import type { ActorIdentityComponent } from "../actor/ActorIdentity";
import type { StatsComponent } from "../actor/Stats";
import type { ContentRegistry } from "../content/ContentRegistry";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { World } from "../core/World";
import type { BossStateComponent } from "./BossComponents";

export class BossSystem {
  constructor(private readonly content: ContentRegistry) {}

  // 阶段只允许向前推进；脚本顺序就是 Boss 行为顺序。
  update(world: World, events: GameplayEvent[], step = 0): void {
    for (const entity of world.entitiesWith(
      "bossState",
      "actorIdentity",
      "actor",
      "health",
      "stats",
    )) {
      const identity = world.getComponent<ActorIdentityComponent>("actorIdentity", entity)!;
      const definition = this.content.actor(identity.archetype);
      const phases = definition.boss?.phases;
      if (!phases) continue;
      const actor = world.getComponent<ActorComponent>("actor", entity)!;
      const health = world.getComponent<HealthComponent>("health", entity)!;
      const stats = world.getComponent<StatsComponent>("stats", entity)!;
      const state = world.getComponent<BossStateComponent>("bossState", entity)!;
      state.phaseEnterLeft = Math.max(0, state.phaseEnterLeft - step);
      const ratio = health.max > 0 ? health.current / health.max : 0;
      let next = state.phaseIndex;
      for (let index = state.phaseIndex + 1; index < phases.length; index += 1) {
        if (ratio <= phases[index].startsAtHealthRatio) next = index;
      }
      while (state.phaseIndex < next) {
        state.phaseIndex += 1;
        const phase = phases[state.phaseIndex];
        if (phase.clearPendingEffects) state.abilityEpoch += 1;
        state.phaseEnterLeft = phase.enterDuration;
        state.enteredPhases.push(phase.id);
        actor.invulnerableLeft = Math.max(actor.invulnerableLeft, phase.enterDuration);
        actor.action = "idle";
        actor.actionLeft = 0;
        actor.actionDuration = 0;
        actor.actionMotion = undefined;
        events.push({
          type: "boss_phase_started",
          actor: entity,
          phaseId: phase.id,
          phaseName: phase.name,
          index: state.phaseIndex,
          duration: phase.enterDuration,
          visual: phase.enterVisual,
        });
      }
      actor.speed = stats.final.moveSpeed * phases[state.phaseIndex].speedMultiplier;
    }
  }
}
