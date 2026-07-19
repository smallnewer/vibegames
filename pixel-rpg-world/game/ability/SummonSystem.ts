import type { ActorComponent } from "../actor/ActorComponents";
import type { ActorFactory } from "../actor/ActorFactory";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { EntityId, World } from "../core/World";

const MAX_SUMMONS = 8;

export interface SummonComponent {
  owner: EntityId;
  definition: string;
  timeLeft: number;
}

export interface SummonSpawnRequest {
  source: EntityId;
  actor: string;
  x: number;
  z: number;
  duration: number;
  maxOwned: number;
}

export class SummonSystem {
  constructor(private readonly factory: ActorFactory) {}

  spawn(
    world: World,
    request: SummonSpawnRequest,
    events: GameplayEvent[],
  ): EntityId | undefined {
    const owner = world.getComponent<ActorComponent>("actor", request.source);
    if (!owner || owner.action === "dead") return undefined;
    const owned = world.entitiesWith("summon").filter((entity) => {
      const summon = world.getComponent<SummonComponent>("summon", entity)!;
      return summon.owner === request.source && summon.definition === request.actor;
    });
    if (owned.length >= request.maxOwned) this.remove(world, owned[0], events);
    if (world.entitiesWith("summon").length >= MAX_SUMMONS) return undefined;

    const summon = this.factory.create(world, request.actor, request.x, request.z);
    const actor = world.getComponent<ActorComponent>("actor", summon)!;
    actor.faction = owner.faction;
    world.removeComponent("dropTable", summon);
    world.setComponent<SummonComponent>("summon", summon, {
      owner: request.source,
      definition: request.actor,
      timeLeft: request.duration,
    });
    events.push({ type: "actor_spawned", actor: summon, faction: actor.faction });
    events.push({ type: "summon_spawned", summon, owner: request.source, actor: request.actor });
    return summon;
  }

  update(world: World, step: number, events: GameplayEvent[]): void {
    for (const entity of [...world.entitiesWith("summon")]) {
      const summon = world.getComponent<SummonComponent>("summon", entity)!;
      const owner = world.getComponent<ActorComponent>("actor", summon.owner);
      summon.timeLeft -= step;
      if (!owner || owner.action === "dead" || summon.timeLeft <= 0) {
        this.remove(world, entity, events);
      }
    }
  }

  clear(world: World, events: GameplayEvent[]): void {
    for (const entity of [...world.entitiesWith("summon")]) this.remove(world, entity, events);
  }

  private remove(world: World, entity: EntityId, events: GameplayEvent[]): void {
    const summon = world.getComponent<SummonComponent>("summon", entity);
    if (!summon) return;
    world.destroyEntity(entity);
    events.push({ type: "summon_removed", summon: entity, owner: summon.owner });
  }
}
