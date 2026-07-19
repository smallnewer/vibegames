import type { ActorComponent, TransformComponent } from "../actor/ActorComponents";
import type { EffectNode } from "../content/Definitions";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { EntityId, World } from "../core/World";
import type { HazardComponent, HazardSpawnRequest } from "./HazardComponents";
import type { EffectExecution } from "./EffectRunner";

const MAX_HAZARDS = 32;

export interface HazardEffectExecutor {
  execute(
    world: World,
    source: EntityId,
    x: number,
    z: number,
    node: EffectNode,
    events: GameplayEvent[],
    targets: readonly EntityId[],
    execution: EffectExecution,
  ): void;
}

export class HazardSystem {
  constructor(private readonly executor: HazardEffectExecutor) {}

  spawn(
    world: World,
    request: HazardSpawnRequest,
    events: GameplayEvent[],
  ): EntityId | undefined {
    if (world.entitiesWith("hazard").length >= MAX_HAZARDS) return undefined;
    const actor = world.getComponent<ActorComponent>("actor", request.source);
    if (!actor || actor.action === "dead") return undefined;
    const hazard = world.createEntity();
    world.setComponent<HazardComponent>("hazard", hazard, {
      owner: request.source,
      faction: actor.faction,
      x: request.x,
      z: request.z,
      radius: request.radius,
      timeLeft: request.duration,
      interval: request.interval,
      tickLeft: 0,
      child: request.child,
      visual: request.visual,
      relation: request.relation ?? "enemy",
      skillId: request.skillId,
      actionSequence: request.actionSequence,
      skillRank: request.skillRank,
    });
    events.push({
      type: "hazard_spawned",
      hazard,
      visual: request.visual,
      x: request.x,
      z: request.z,
      radius: request.radius,
    });
    return hazard;
  }

  update(world: World, step: number, events: GameplayEvent[]): void {
    for (const entity of [...world.entitiesWith("hazard")]) {
      const hazard = world.getComponent<HazardComponent>("hazard", entity)!;
      const owner = world.getComponent<ActorComponent>("actor", hazard.owner);
      if (!owner || owner.action === "dead") {
        this.remove(world, entity, hazard.owner, events);
        continue;
      }

      const activeStep = Math.min(step, hazard.timeLeft);
      hazard.tickLeft -= activeStep;
      while (hazard.tickLeft <= 0 && hazard.timeLeft > 0) {
        const targets = this.targets(world, hazard);
        this.executor.execute(
          world,
          hazard.owner,
          hazard.x,
          hazard.z,
          hazard.child,
          events,
          targets,
          {
            skillId: hazard.skillId,
            actionSequence: hazard.actionSequence,
            skillRank: hazard.skillRank,
          },
        );
        hazard.tickLeft += hazard.interval;
      }
      hazard.timeLeft -= step;
      if (hazard.timeLeft <= 0) this.remove(world, entity, hazard.owner, events);
    }
  }

  clear(world: World, events: GameplayEvent[]): void {
    for (const entity of [...world.entitiesWith("hazard")]) {
      const owner = world.getComponent<HazardComponent>("hazard", entity)!.owner;
      this.remove(world, entity, owner, events);
    }
  }

  private targets(world: World, hazard: HazardComponent): EntityId[] {
    return world.entitiesWith("actor", "transform", "health").filter((entity) => {
      const actor = world.getComponent<ActorComponent>("actor", entity)!;
      const transform = world.getComponent<TransformComponent>("transform", entity)!;
      const relationMatches = hazard.relation === "ally"
        ? actor.faction === hazard.faction
        : actor.faction !== hazard.faction;
      return relationMatches
        && actor.action !== "dead"
        && Math.hypot(transform.x - hazard.x, transform.z - hazard.z) <= hazard.radius;
    });
  }

  private remove(
    world: World,
    entity: EntityId,
    _owner: EntityId,
    events: GameplayEvent[],
  ): void {
    if (!world.hasEntity(entity)) return;
    world.destroyEntity(entity);
    events.push({ type: "hazard_removed", hazard: entity });
  }
}
