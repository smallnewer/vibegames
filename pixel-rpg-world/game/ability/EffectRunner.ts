import type {
  ActorComponent,
  HealthComponent,
  ProjectileComponent,
  TransformComponent,
} from "../actor/ActorComponents";
import type { StatsComponent } from "../actor/Stats";
import { RunRng } from "../balance/RunRng";
import type { ContentRegistry } from "../content/ContentRegistry";
import type { EffectNode, HealingValue } from "../content/Definitions";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { EntityId, World } from "../core/World";
import { applyDamage } from "../combat/Damage";
import type { GroundNavigation } from "../ports/GroundNavigation";
import type { StatusSystem } from "../status/StatusSystem";
import { selectChainTargets } from "./ChainTargeting";
import type { HazardSpawnRequest } from "./HazardComponents";
import type { SummonSpawnRequest } from "./SummonSystem";
import type { SkillRank } from "../progression/ProgressionComponents";

interface EffectState {
  targets: EntityId[];
}

export interface ScheduledEffect {
  seconds: number;
  node: EffectNode;
  targets: readonly EntityId[];
}

export interface EffectExecution {
  readonly skillId: string;
  readonly actionSequence: number;
  readonly skillRank?: SkillRank;
}

export interface EffectRuntime {
  spawnActor?(
    world: World,
    source: EntityId,
    archetype: string,
    x: number,
    z: number,
    events: GameplayEvent[],
  ): EntityId | undefined;
  spawnHazard?(
    world: World,
    request: HazardSpawnRequest,
    events: GameplayEvent[],
  ): EntityId | undefined;
  spawnSummon?(
    world: World,
    request: SummonSpawnRequest,
    events: GameplayEvent[],
  ): EntityId | undefined;
}

const OPEN_GROUND: GroundNavigation = {
  move: (_start, destination) => destination,
  path: (start, destination) => [start, destination],
  dispose() {},
};

export class EffectRunner {
  constructor(
    private readonly content: ContentRegistry,
    private readonly statuses: StatusSystem,
    private readonly navigation: GroundNavigation = OPEN_GROUND,
    private readonly rng: RunRng = RunRng.fromSeed(1),
    private readonly runtime: EffectRuntime = {},
  ) {}

  // 每次施法都有独立目标集，节点只能执行联合类型里的白名单动作。
  run(
    world: World,
    source: EntityId,
    aimX: number,
    aimZ: number,
    node: EffectNode,
    events: GameplayEvent[],
    initialTargets: readonly EntityId[] = [],
    execution: EffectExecution = {
      skillId: "ability.unknown",
      actionSequence: 0,
    },
  ): ScheduledEffect[] {
    const scheduled: ScheduledEffect[] = [];
    this.runNode(
      world,
      source,
      aimX,
      aimZ,
      node,
      { targets: [...initialTargets] },
      events,
      scheduled,
      execution,
    );
    return scheduled;
  }

  private runNode(
    world: World,
    source: EntityId,
    aimX: number,
    aimZ: number,
    node: EffectNode,
    state: EffectState,
    events: GameplayEvent[],
    scheduled: ScheduledEffect[],
    execution: EffectExecution,
  ): void {
    if (node.type === "sequence") {
      for (const child of node.children) {
        this.runNode(world, source, aimX, aimZ, child, state, events, scheduled, execution);
      }
      return;
    }
    if (node.type === "parallel") {
      for (const child of node.children) {
        this.runNode(
          world,
          source,
          aimX,
          aimZ,
          child,
          { targets: [...state.targets] },
          events,
          scheduled,
          execution,
        );
      }
      return;
    }
    if (node.type === "delay") {
      scheduled.push({ seconds: node.seconds, node: node.child, targets: [...state.targets] });
      return;
    }
    if (node.type === "if_targets") {
      const branch = state.targets.length > 0 ? node.then : node.otherwise;
      if (branch) this.runNode(world, source, aimX, aimZ, branch, state, events, scheduled, execution);
      return;
    }
    if (node.type === "select_self") {
      state.targets = [source];
      return;
    }
    if (node.type === "query_melee" || node.type === "query_cone") {
      state.targets = this.queryCone(world, source, node.range, node.frontDot);
      return;
    }
    if (node.type === "query_circle") {
      state.targets = this.queryCircle(world, source, aimX, aimZ, node.center, node.radius);
      return;
    }
    if (node.type === "query_line") {
      state.targets = this.queryLine(world, source, aimX, aimZ, node.length, node.width);
      return;
    }
    if (node.type === "chain_targets") {
      const candidates = state.targets.length > 0 ? state.targets : this.enemyTargets(world, source);
      state.targets = selectChainTargets(
        world,
        source,
        candidates,
        node.range,
        node.maxTargets,
      );
      return;
    }
    if (node.type === "damage") {
      for (const target of state.targets) {
        applyDamage(world, {
          ...node.value,
          source,
          target,
          skillId: execution.skillId,
          actionSequence: execution.actionSequence,
        }, this.rng, events);
      }
      return;
    }
    if (node.type === "heal") {
      this.heal(world, source, state.targets, this.resolveHealing(world, source, node.value), events);
      return;
    }
    if (node.type === "spawn_projectile") {
      this.spawnProjectile(world, source, aimX, aimZ, node, events, execution);
      return;
    }
    if (node.type === "apply_status") {
      for (const target of state.targets) {
        this.statuses.apply(world, target, node.status, node.stacks, events, {
          source,
          sourceSkillRank: execution.skillRank,
          durationAdd: node.durationAdd,
          periodicMagnitude: node.periodicMagnitude,
        });
      }
      return;
    }
    if (node.type === "remove_status") {
      for (const target of state.targets) this.statuses.remove(world, target, node.status, events);
      return;
    }
    if (node.type === "knockback") {
      this.knockback(world, source, state.targets, node.distance);
      return;
    }
    if (node.type === "teleport_forward") {
      this.teleportForward(world, source, aimX, aimZ, node.distance, events);
      return;
    }
    if (node.type === "summon_actor") {
      const origin = world.getComponent<TransformComponent>("transform", source);
      if (!origin || !this.runtime.spawnActor) return;
      for (let index = 0; index < node.count; index += 1) {
        const angle = index / node.count * Math.PI * 2;
        this.runtime.spawnActor(
          world,
          source,
          node.actor,
          origin.x + Math.cos(angle) * node.radius,
          origin.z + Math.sin(angle) * node.radius,
          events,
        );
      }
      return;
    }
    if (node.type === "spawn_hazard") {
      this.runtime.spawnHazard?.(world, {
        source,
        x: aimX,
        z: aimZ,
        radius: node.radius,
        duration: node.duration,
        interval: node.interval,
        child: node.child,
        visual: node.visual,
        relation: node.relation,
        skillId: execution.skillId,
        actionSequence: execution.actionSequence,
        skillRank: execution.skillRank,
      }, events);
      return;
    }
    if (node.type === "spawn_summon") {
      this.runtime.spawnSummon?.(world, {
        source,
        actor: node.actor,
        x: aimX,
        z: aimZ,
        duration: node.duration,
        maxOwned: node.maxOwned,
      }, events);
      return;
    }
    if (node.type === "repeat") {
      this.runNode(world, source, aimX, aimZ, node.child, state, events, scheduled, execution);
      for (let index = 1; index < node.count; index += 1) {
        scheduled.push({
          seconds: node.interval * index,
          node: node.child,
          targets: [...state.targets],
        });
      }
      return;
    }
    events.push({ type: "visual_emitted", actor: source, visual: node.visual, aimX, aimZ });
  }

  private queryCone(
    world: World,
    source: EntityId,
    range: number,
    frontDot: number,
  ): EntityId[] {
    const actor = world.getComponent<ActorComponent>("actor", source);
    const transform = world.getComponent<TransformComponent>("transform", source);
    if (!actor || !transform) return [];

    return this.enemyTargets(world, source).filter((target) => {
      const targetTransform = world.getComponent<TransformComponent>("transform", target)!;
      const dx = targetTransform.x - transform.x;
      const dz = targetTransform.z - transform.z;
      const distance = Math.hypot(dx, dz);
      const front = distance > 0
        ? dx / distance * transform.facingX + dz / distance * transform.facingZ
        : 1;
      return distance <= range && front >= frontDot;
    });
  }

  private queryCircle(
    world: World,
    source: EntityId,
    aimX: number,
    aimZ: number,
    center: "source" | "aim",
    radius: number,
  ): EntityId[] {
    const transform = world.getComponent<TransformComponent>("transform", source);
    if (!transform) return [];
    const x = center === "source" ? transform.x : aimX;
    const z = center === "source" ? transform.z : aimZ;
    return this.enemyTargets(world, source).filter((target) => {
      const value = world.getComponent<TransformComponent>("transform", target)!;
      return Math.hypot(value.x - x, value.z - z) <= radius;
    });
  }

  private queryLine(
    world: World,
    source: EntityId,
    aimX: number,
    aimZ: number,
    length: number,
    width: number,
  ): EntityId[] {
    const origin = world.getComponent<TransformComponent>("transform", source);
    if (!origin) return [];
    const aimDx = aimX - origin.x;
    const aimDz = aimZ - origin.z;
    const aimLength = Math.hypot(aimDx, aimDz);
    const directionX = aimLength > 0 ? aimDx / aimLength : origin.facingX;
    const directionZ = aimLength > 0 ? aimDz / aimLength : origin.facingZ;
    return this.enemyTargets(world, source).filter((target) => {
      const actor = world.getComponent<ActorComponent>("actor", target)!;
      const transform = world.getComponent<TransformComponent>("transform", target)!;
      const dx = transform.x - origin.x;
      const dz = transform.z - origin.z;
      const forward = dx * directionX + dz * directionZ;
      const sideways = Math.abs(dx * -directionZ + dz * directionX);
      return forward >= 0 && forward <= length && sideways <= width * 0.5 + actor.radius;
    });
  }

  private enemyTargets(world: World, source: EntityId): EntityId[] {
    const sourceActor = world.getComponent<ActorComponent>("actor", source);
    if (!sourceActor) return [];
    return world.entitiesWith("actor", "health", "transform").filter((target) => {
      if (target === source) return false;
      const actor = world.getComponent<ActorComponent>("actor", target)!;
      return actor.faction !== sourceActor.faction && actor.action !== "dead";
    });
  }

  private resolveHealing(world: World, source: EntityId, value: HealingValue): number {
    if (value.type === "flat") return Math.max(0, Math.round(value.amount));
    const stats = world.getComponent<StatsComponent>("stats", source);
    return Math.max(0, Math.round((stats?.final[value.stat] ?? 0) * value.scale));
  }

  private heal(
    world: World,
    source: EntityId,
    targets: readonly EntityId[],
    amount: number,
    events: GameplayEvent[],
  ): void {
    for (const target of targets) {
      const actor = world.getComponent<ActorComponent>("actor", target);
      const health = world.getComponent<HealthComponent>("health", target);
      if (!actor || !health || actor.action === "dead") continue;
      const before = health.current;
      health.current = Math.min(health.max, health.current + amount);
      const applied = health.current - before;
      if (applied > 0) events.push({ type: "healing_applied", source, target, amount: applied });
    }
  }

  private knockback(
    world: World,
    source: EntityId,
    targets: readonly EntityId[],
    distance: number,
  ): void {
    const origin = world.getComponent<TransformComponent>("transform", source);
    if (!origin) return;
    for (const target of targets) {
      const transform = world.getComponent<TransformComponent>("transform", target);
      if (!transform) continue;
      const length = Math.hypot(transform.x - origin.x, transform.z - origin.z);
      if (length === 0) continue;
      const moved = this.navigation.move(transform, {
        x: transform.x + (transform.x - origin.x) / length * distance,
        z: transform.z + (transform.z - origin.z) / length * distance,
      });
      transform.previousX = transform.x;
      transform.previousZ = transform.z;
      transform.x = moved.x;
      transform.z = moved.z;
    }
  }

  private teleportForward(
    world: World,
    source: EntityId,
    aimX: number,
    aimZ: number,
    distance: number,
    events: GameplayEvent[],
  ): void {
    const transform = world.getComponent<TransformComponent>("transform", source);
    if (!transform) return;
    const length = Math.hypot(aimX - transform.x, aimZ - transform.z);
    const x = length > 0 ? (aimX - transform.x) / length : transform.facingX;
    const z = length > 0 ? (aimZ - transform.z) / length : transform.facingZ;
    const moved = this.navigation.move(transform, {
      x: transform.x + x * distance,
      z: transform.z + z * distance,
    });
    transform.previousX = transform.x;
    transform.previousZ = transform.z;
    transform.x = moved.x;
    transform.z = moved.z;
    events.push({ type: "actor_teleported", actor: source, x: moved.x, z: moved.z });
  }

  private spawnProjectile(
    world: World,
    source: EntityId,
    aimX: number,
    aimZ: number,
    node: Extract<EffectNode, { type: "spawn_projectile" }>,
    events: GameplayEvent[],
    execution: EffectExecution,
  ): void {
    const actor = world.getComponent<ActorComponent>("actor", source);
    const transform = world.getComponent<TransformComponent>("transform", source);
    if (!actor || !transform) return;
    const length = Math.hypot(aimX - transform.x, aimZ - transform.z);
    const directionX = length > 0 ? (aimX - transform.x) / length : transform.facingX;
    const directionZ = length > 0 ? (aimZ - transform.z) / length : transform.facingZ;
    const projectile = world.createEntity();
    world.setComponent<ProjectileComponent>("projectile", projectile, {
      owner: source,
      faction: actor.faction,
      x: transform.x,
      z: transform.z,
      previousX: transform.x,
      previousZ: transform.z,
      velocityX: directionX * node.speed,
      velocityZ: directionZ * node.speed,
      radius: node.radius,
      damage: { ...node.value },
      skillId: execution.skillId,
      actionSequence: execution.actionSequence,
      lifeLeft: node.lifetime,
    });
    events.push({ type: "projectile_spawned", projectile, faction: actor.faction });
  }
}
