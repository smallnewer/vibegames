import {
  normalizeAbilityChargeState,
  type AbilityLoadoutComponent,
} from "../ability/AbilityComponents";
import type { ActorComponent, HealthComponent, TransformComponent } from "../actor/ActorComponents";
import type { ActorIdentityComponent } from "../actor/ActorIdentity";
import type { BossStateComponent } from "../boss/BossComponents";
import type { AiActionDef } from "../content/ActorDefinitions";
import type { ContentRegistry } from "../content/ContentRegistry";
import type { Command } from "../core/Command";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { EntityId, World } from "../core/World";
import type { GroundNavigation } from "../ports/GroundNavigation";
import type { AiStateComponent } from "./AiComponents";
import { selectTarget, type TargetCandidate } from "./TargetSelection";

const TARGET_SWITCH_COOLDOWN = 0.6;

export class AiSystem {
  constructor(
    private readonly content: ContentRegistry,
    private readonly navigation: GroundNavigation,
  ) {}

  observe(world: World, events: readonly GameplayEvent[]): void {
    for (const event of events) {
      if (event.type !== "damage_applied") continue;
      const state = world.getComponent<AiStateComponent>("aiState", event.target);
      if (!state) continue;
      state.threat.set(event.source, (state.threat.get(event.source) ?? 0) + event.amount);
      if (state.threat.size <= 4) continue;
      const weakest = [...state.threat].sort((left, right) => (
        left[1] - right[1] || left[0] - right[0]
      ))[0];
      state.threat.delete(weakest[0]);
    }
  }

  // 决策先进入明确的预警状态；只有计时完成后才发出与玩家相同的 cast 命令。
  commands(
    world: World,
    players: readonly EntityId[],
    step: number,
    events: GameplayEvent[] = [],
  ): Command[] {
    const commands: Command[] = [];
    for (const entity of world.entitiesWith("aiState", "actorIdentity", "actor", "transform")) {
      const actor = world.getComponent<ActorComponent>("actor", entity)!;
      const identity = world.getComponent<ActorIdentityComponent>("actorIdentity", entity)!;
      const transform = world.getComponent<TransformComponent>("transform", entity)!;
      const state = world.getComponent<AiStateComponent>("aiState", entity)!;
      const definition = this.content.actor(identity.archetype);
      if (!definition.ai || actor.action === "dead") continue;
      if (actor.action === "hit") {
        this.cancelPending(state, entity, events);
        [state.moveX, state.moveZ] = [0, 0];
        continue;
      }
      const boss = world.getComponent<BossStateComponent>("bossState", entity);
      if (boss && state.phaseAbilityEpoch !== boss.abilityEpoch) {
        state.phaseAbilityEpoch = boss.abilityEpoch;
        state.phaseActionUses.clear();
      }

      state.targetSwitchLeft = Math.max(0, state.targetSwitchLeft - step);
      state.recoveryLeft = Math.max(0, state.recoveryLeft - step);
      if (
        state.pendingCast
        && boss
        && state.pendingCast.abilityEpoch !== boss.abilityEpoch
      ) {
        this.cancelPending(state, entity, events);
      }
      if (boss && boss.phaseEnterLeft > 0) {
        this.cancelPending(state, entity, events);
        [state.moveX, state.moveZ] = [0, 0];
        continue;
      }
      const homeDistance = Math.hypot(transform.x - state.homeX, transform.z - state.homeZ);
      if (homeDistance > definition.ai.leashRange) {
        this.cancelPending(state, entity, events);
        state.target = undefined;
        this.setPath(state, transform, state.homeX, state.homeZ);
        commands.push(...this.moveCommand(entity, state));
        continue;
      }

      if (state.pendingCast) {
        const targetAlive = this.isLivingTarget(world, state.pendingCast.target);
        if (!targetAlive) {
          this.cancelPending(state, entity, events);
        } else {
          state.pendingCast.timeLeft = Math.max(0, state.pendingCast.timeLeft - step);
          [state.moveX, state.moveZ] = [0, 0];
          if (state.pendingCast.timeLeft === 0) {
            const pending = state.pendingCast;
            state.pendingCast = undefined;
            state.recoveryLeft = pending.recoverySeconds;
            commands.push({
              type: "cast",
              actor: entity,
              slot: pending.slot,
              aimX: pending.targetX,
              aimZ: pending.targetZ,
            });
          }
          continue;
        }
      }

      state.thinkLeft = Math.max(0, state.thinkLeft - step);
      if (state.thinkLeft === 0) {
        state.thinkLeft = definition.ai.thinkSeconds;
        this.decide(world, players, entity, definition.ai.aggroRange);
      }

      const targetTransform = state.target === undefined
        ? undefined
        : world.getComponent<TransformComponent>("transform", state.target);
      if (targetTransform && state.recoveryLeft === 0) {
        const distance = Math.hypot(targetTransform.x - transform.x, targetTransform.z - transform.z);
        const action = this.availableAction(world, entity, distance, transform, targetTransform);
        if (action) {
          this.prepareCast(world, entity, state.target!, targetTransform, action, state, events);
          continue;
        }
        const actions = this.actionsFor(world, entity);
        const minRange = Math.min(...actions.map((value) => value.minRange));
        const maxRange = Math.max(...actions.map((value) => value.maxRange));
        if (distance < minRange) {
          this.setRetreat(state, transform, targetTransform);
        } else if (distance <= maxRange) {
          [state.moveX, state.moveZ] = [0, 0];
        }
      }
      commands.push(...this.moveCommand(entity, state));
    }
    return commands;
  }

  private decide(
    world: World,
    players: readonly EntityId[],
    entity: EntityId,
    aggroRange: number,
  ): void {
    const transform = world.getComponent<TransformComponent>("transform", entity)!;
    const state = world.getComponent<AiStateComponent>("aiState", entity)!;
    const candidates: TargetCandidate[] = players.flatMap((player) => {
      const target = world.getComponent<TransformComponent>("transform", player);
      if (!target || !this.isLivingTarget(world, player)) return [];
      const distance = Math.hypot(target.x - transform.x, target.z - transform.z);
      return distance <= aggroRange
        ? [{ id: player, distance, threat: state.threat.get(player) ?? 0 }]
        : [];
    });
    const previous = state.target;
    state.target = selectTarget(candidates, previous, state.targetSwitchLeft === 0);
    if (state.target !== previous && state.target !== undefined) {
      state.targetSwitchLeft = TARGET_SWITCH_COOLDOWN;
    }
    const target = state.target === undefined
      ? undefined
      : world.getComponent<TransformComponent>("transform", state.target);
    const homeDistance = Math.hypot(transform.x - state.homeX, transform.z - state.homeZ);
    if (target) this.setPath(state, transform, target.x, target.z);
    else if (homeDistance > 0.1) this.setPath(state, transform, state.homeX, state.homeZ);
    else [state.moveX, state.moveZ] = [0, 0];
  }

  private prepareCast(
    world: World,
    entity: EntityId,
    target: EntityId,
    targetTransform: TransformComponent,
    action: AiActionDef,
    state: AiStateComponent,
    events: GameplayEvent[],
  ): void {
    const loadout = world.getComponent<AbilityLoadoutComponent>("abilityLoadout", entity)!;
    const ability = loadout.slots[action.slot];
    if (!ability) return;
    [state.moveX, state.moveZ] = [0, 0];
    state.pendingCast = {
      slot: action.slot,
      ability,
      target,
      targetX: targetTransform.x,
      targetZ: targetTransform.z,
      timeLeft: action.telegraphSeconds,
      duration: action.telegraphSeconds,
      recoverySeconds: action.recoverySeconds,
      abilityEpoch: world.getComponent<BossStateComponent>("bossState", entity)?.abilityEpoch,
    };
    state.phaseActionUses.set(action.slot, (state.phaseActionUses.get(action.slot) ?? 0) + 1);
    events.push({
      type: "ability_telegraph_started",
      source: entity,
      ability,
      targetX: targetTransform.x,
      targetZ: targetTransform.z,
      duration: action.telegraphSeconds,
      shape: action.telegraph?.shape ?? "circle",
      damageType: action.telegraph?.damageType ?? "physical",
      radius: action.telegraph?.radius,
      angle: action.telegraph?.angle,
      length: action.telegraph?.length,
      width: action.telegraph?.width,
    });
  }

  private cancelPending(state: AiStateComponent, entity: EntityId, events: GameplayEvent[]): void {
    if (!state.pendingCast) return;
    events.push({
      type: "ability_telegraph_cancelled",
      source: entity,
      ability: state.pendingCast.ability,
    });
    state.pendingCast = undefined;
  }

  private availableAction(
    world: World,
    entity: EntityId,
    distance: number,
    source: TransformComponent,
    target: TransformComponent,
  ): AiActionDef | undefined {
    const loadout = world.getComponent<AbilityLoadoutComponent>("abilityLoadout", entity)!;
    const state = world.getComponent<AiStateComponent>("aiState", entity)!;
    return this.actionsFor(world, entity)
      .filter((action) => (
        distance >= action.minRange
        && distance <= action.maxRange
        && (
          action.maxUsesPerPhase === undefined
          || (state.phaseActionUses.get(action.slot) ?? 0) < action.maxUsesPerPhase
        )
        && normalizeAbilityChargeState(loadout.cooldowns[action.slot]).charges > 0
        && (!action.requiresLineOfSight || this.navigation.path(source, target).length > 0)
      ))
      .sort((left, right) => right.weight - left.weight || left.slot.localeCompare(right.slot))[0];
  }

  private actionsFor(world: World, entity: EntityId): readonly AiActionDef[] {
    const identity = world.getComponent<ActorIdentityComponent>("actorIdentity", entity)!;
    const definition = this.content.actor(identity.archetype);
    const boss = world.getComponent<BossStateComponent>("bossState", entity);
    return boss
      ? definition.boss?.phases[boss.phaseIndex]?.actions ?? []
      : definition.ai?.actions ?? [];
  }

  private isLivingTarget(world: World, target: EntityId): boolean {
    const actor = world.getComponent<ActorComponent>("actor", target);
    const health = world.getComponent<HealthComponent>("health", target);
    return actor !== undefined && health !== undefined && actor.action !== "dead" && health.current > 0;
  }

  private setPath(
    state: AiStateComponent,
    start: TransformComponent,
    x: number,
    z: number,
  ): void {
    const path = this.navigation.path(start, { x, z });
    const point = path[1] ?? path[0];
    if (!point) {
      [state.moveX, state.moveZ] = [0, 0];
      return;
    }
    const length = Math.hypot(point.x - start.x, point.z - start.z);
    [state.moveX, state.moveZ] = length > 0
      ? [(point.x - start.x) / length, (point.z - start.z) / length]
      : [0, 0];
  }

  private setRetreat(
    state: AiStateComponent,
    source: TransformComponent,
    target: TransformComponent,
  ): void {
    const length = Math.hypot(source.x - target.x, source.z - target.z);
    [state.moveX, state.moveZ] = length > 0
      ? [(source.x - target.x) / length, (source.z - target.z) / length]
      : [0, 0];
  }

  private moveCommand(entity: EntityId, state: AiStateComponent): Command[] {
    return state.moveX !== 0 || state.moveZ !== 0
      ? [{ type: "move", actor: entity, x: state.moveX, z: state.moveZ }]
      : [];
  }
}
