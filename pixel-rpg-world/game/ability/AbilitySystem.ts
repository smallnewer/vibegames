import type { ActorComponent, TransformComponent } from "../actor/ActorComponents";
import type { StatsComponent } from "../actor/Stats";
import type { BossStateComponent } from "../boss/BossComponents";
import type { ContentRegistry } from "../content/ContentRegistry";
import type { AbilitySlot, EffectNode } from "../content/Definitions";
import type { Command } from "../core/Command";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { EntityId, World } from "../core/World";
import type { GroundNavigation } from "../ports/GroundNavigation";
import type { StatusSystem } from "../status/StatusSystem";
import {
  advanceAbilityChargeState,
  normalizeAbilityChargeState,
  spendAbilityCharge,
  syncAbilityChargeCapacity,
  type AbilityLoadoutComponent,
} from "./AbilityComponents";
import { EffectRunner, type EffectRuntime, type ScheduledEffect } from "./EffectRunner";
import { RunRng } from "../balance/RunRng";
import type { ProgressionComponent, SkillRank } from "../progression/ProgressionComponents";
import { evaluateAbilityRank } from "./SkillRanks";

const CAST_SLOTS: readonly AbilitySlot[] = [
  "melee",
  "ranged",
  "skill_up",
  "skill_right",
  "skill_down",
  "skill_left",
];
const PENDING_LIMIT = 64;

interface PendingEffect {
  source: EntityId;
  aimX: number;
  aimZ: number;
  timeLeft: number;
  node: EffectNode;
  targets: readonly EntityId[];
  skillId: string;
  actionSequence: number;
  skillRank?: SkillRank;
  abilityEpoch?: number;
  impact?: {
    readonly ability: string;
    readonly visual: string;
  };
}

export class AbilitySystem {
  private readonly effects: EffectRunner;
  private pending: PendingEffect[] = [];

  constructor(
    private readonly content: ContentRegistry,
    statuses: StatusSystem,
    navigation?: GroundNavigation,
    rng: RunRng = RunRng.fromSeed(1),
    runtime?: EffectRuntime,
  ) {
    this.effects = new EffectRunner(content, statuses, navigation, rng, runtime);
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  executeEffect(
    world: World,
    source: EntityId,
    aimX: number,
    aimZ: number,
    node: EffectNode,
    events: GameplayEvent[],
    targets: readonly EntityId[],
    execution: Readonly<{ skillId: string; actionSequence: number; skillRank?: SkillRank }>,
  ): void {
    const scheduled = this.effects.run(
      world,
      source,
      aimX,
      aimZ,
      node,
      events,
      targets,
      execution,
    );
    this.schedule(
      source,
      aimX,
      aimZ,
      execution.skillId,
      execution.actionSequence,
      scheduled,
      undefined,
      execution.skillRank,
    );
  }

  // 玩家、怪物、武器和主动技能共享同一套施法校验、冷却和延迟队列。
  update(
    world: World,
    commands: readonly Command[],
    step: number,
    events: GameplayEvent[],
    canAdvanceCooldown: (entity: number) => boolean = () => true,
  ): void {
    this.updatePending(world, step, events);
    for (const entity of world.entitiesWith("abilityLoadout")) {
      const loadout = world.getComponent<AbilityLoadoutComponent>("abilityLoadout", entity)!;
      const stats = world.getComponent<StatsComponent>("stats", entity);
      const elapsed = canAdvanceCooldown(entity)
        ? step * (1 + (stats?.final.cooldownRecovery ?? 0))
        : 0;
      for (const slot of CAST_SLOTS) {
        const state = normalizeAbilityChargeState(loadout.cooldowns[slot]);
        loadout.cooldowns[slot] = state;
        const abilityId = loadout.slots[slot];
        const baseDefinition = abilityId ? this.content.findAbility(abilityId) : undefined;
        const progression = world.getComponent<ProgressionComponent>("progression", entity);
        const rank = baseDefinition?.slot === "active"
          ? progression?.skillRanks?.[abilityId!] ?? 1
          : 1;
        const capacity = baseDefinition ? evaluateAbilityRank(baseDefinition, rank).charges : 1;
        syncAbilityChargeCapacity(state, capacity);
        advanceAbilityChargeState(state, elapsed);
      }
    }

    for (const command of commands) {
      if (command.type !== "cast") continue;
      const actor = world.getComponent<ActorComponent>("actor", command.actor);
      const transform = world.getComponent<TransformComponent>("transform", command.actor);
      const loadout = world.getComponent<AbilityLoadoutComponent>("abilityLoadout", command.actor);
      const stats = world.getComponent<StatsComponent>("stats", command.actor);
      const boss = world.getComponent<BossStateComponent>("bossState", command.actor);
      if (!actor || !transform || !loadout) continue;
      if (boss && boss.phaseEnterLeft > 0) continue;
      if (!["idle", "run"].includes(actor.action)) continue;
      const chargeState = normalizeAbilityChargeState(loadout.cooldowns[command.slot]);
      loadout.cooldowns[command.slot] = chargeState;
      if (chargeState.charges <= 0) continue;
      const abilityId = loadout.slots[command.slot];
      if (!abilityId) continue;
      const baseDefinition = this.content.ability(abilityId);
      const progression = world.getComponent<ProgressionComponent>("progression", command.actor);
      const rank = baseDefinition.slot === "active"
        ? progression?.skillRanks?.[abilityId] ?? 1
        : 1;
      const definition = evaluateAbilityRank(baseDefinition, rank);
      const validSlot = command.slot === "melee" || command.slot === "ranged"
        ? definition.slot === command.slot
        : definition.slot === "active";
      if (!validSlot) continue;
      const actionSequence = (loadout.actionSequence ?? 0) + 1;
      loadout.actionSequence = actionSequence;

      const weaponAction = command.slot === "melee" || command.slot === "ranged";
      const attackSpeed = weaponAction ? stats?.final.attackSpeed ?? 1 : 1;
      const actionTime = definition.actionTime / attackSpeed;
      const length = Math.hypot(command.aimX - transform.x, command.aimZ - transform.z);
      if (length > 0) {
        transform.facingX = (command.aimX - transform.x) / length;
        transform.facingZ = (command.aimZ - transform.z) / length;
      }
      actor.action = definition.action;
      actor.actionLeft = actionTime;
      actor.actionDuration = actionTime;
      actor.actionMotion = definition.timeline?.motion
        ? { ...definition.timeline.motion, appliedDistance: 0 }
        : undefined;
      if (!spendAbilityCharge(chargeState, definition.cooldown / attackSpeed)) continue;
      events.push({ type: "action_started", actor: command.actor, action: definition.action });
      events.push({
        type: "ability_cast",
        actor: command.actor,
        ability: definition.id,
        visual: definition.visual,
        aimX: command.aimX,
        aimZ: command.aimZ,
      });
      // 命中、伤害和特效统一跟随技能时间轴，不写死在播放器里。
      const impactDelay = actionTime * (definition.timeline?.impactAt ?? 0);
      if (impactDelay > 0) {
        if (this.pending.length < PENDING_LIMIT) {
          this.pending.push({
            source: command.actor,
            aimX: command.aimX,
            aimZ: command.aimZ,
            timeLeft: impactDelay,
            node: definition.effect,
            targets: [],
            skillId: definition.id,
            actionSequence,
            skillRank: rank,
            abilityEpoch: boss?.abilityEpoch,
            impact: { ability: definition.id, visual: definition.visual },
          });
        }
      } else {
        this.runImpact(
          world,
          command.actor,
          command.aimX,
          command.aimZ,
          definition.id,
          definition.visual,
          definition.effect,
          actionSequence,
          rank,
          boss?.abilityEpoch,
          events,
        );
      }
    }
  }

  private updatePending(world: World, step: number, events: GameplayEvent[]): void {
    const due: PendingEffect[] = [];
    const waiting: PendingEffect[] = [];
    for (const effect of this.pending) {
      const boss = world.getComponent<BossStateComponent>("bossState", effect.source);
      const actor = world.getComponent<ActorComponent>("actor", effect.source);
      if (actor?.faction === "enemy" && actor.action === "hit" && !boss) continue;
      if (effect.abilityEpoch !== undefined && boss?.abilityEpoch !== effect.abilityEpoch) continue;
      effect.timeLeft -= step;
      if (effect.timeLeft <= 0) due.push(effect);
      else waiting.push(effect);
    }
    this.pending = waiting;

    for (const effect of due) {
      const actor = world.getComponent<ActorComponent>("actor", effect.source);
      if (!actor || actor.action === "dead") continue;
      if (effect.impact) {
        events.push({
          type: "ability_impact",
          actor: effect.source,
          ability: effect.impact.ability,
          visual: effect.impact.visual,
          aimX: effect.aimX,
          aimZ: effect.aimZ,
        });
      }
      const nested = this.effects.run(
        world,
        effect.source,
        effect.aimX,
        effect.aimZ,
        effect.node,
        events,
        effect.targets,
        {
          skillId: effect.skillId,
          actionSequence: effect.actionSequence,
          skillRank: effect.skillRank,
        },
      );
      this.schedule(
        effect.source,
        effect.aimX,
        effect.aimZ,
        effect.skillId,
        effect.actionSequence,
        nested,
        effect.abilityEpoch,
        effect.skillRank,
      );
    }
  }

  private runImpact(
    world: World,
    source: EntityId,
    aimX: number,
    aimZ: number,
    ability: string,
    visual: string,
    node: EffectNode,
    actionSequence: number,
    skillRank: SkillRank,
    abilityEpoch: number | undefined,
    events: GameplayEvent[],
  ): void {
    events.push({ type: "ability_impact", actor: source, ability, visual, aimX, aimZ });
    const scheduled = this.effects.run(
      world,
      source,
      aimX,
      aimZ,
      node,
      events,
      [],
      { skillId: ability, actionSequence, skillRank },
    );
    this.schedule(
      source,
      aimX,
      aimZ,
      ability,
      actionSequence,
      scheduled,
      abilityEpoch,
      skillRank,
    );
  }

  private schedule(
    source: EntityId,
    aimX: number,
    aimZ: number,
    skillId: string,
    actionSequence: number,
    effects: readonly ScheduledEffect[],
    abilityEpoch?: number,
    skillRank?: SkillRank,
  ): void {
    for (const effect of effects) {
      if (this.pending.length >= PENDING_LIMIT) return;
      this.pending.push({
        source,
        aimX,
        aimZ,
        timeLeft: effect.seconds,
        node: effect.node,
        targets: effect.targets,
        skillId,
        actionSequence,
        skillRank,
        abilityEpoch,
      });
    }
  }
}
