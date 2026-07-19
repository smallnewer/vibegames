import type { TransformComponent } from "../actor/ActorComponents";
import type { Command } from "../core/Command";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { EntityId, World } from "../core/World";
import type { DungeonStateComponent, InteractableComponent } from "./DungeonComponents";
import type { DungeonPack, InteractionDef } from "./DungeonDefinitions";
import type { DungeonRunComponent } from "./DungeonRunComponents";

export class InteractionSystem {
  private readonly interactions = new Map<string, InteractionDef>();

  constructor(private readonly definition: DungeonPack) {
    for (const interaction of definition.interactions) {
      this.interactions.set(interaction.id, interaction);
    }
  }

  // 核心重新校验目标、距离和地下城条件，不能信任输入层。
  update(
    world: World,
    dungeonId: EntityId,
    commands: readonly Command[],
    events: GameplayEvent[],
  ): void {
    const dungeon = world.getComponent<DungeonStateComponent>("dungeon", dungeonId);
    if (!dungeon) return;
    for (const command of commands) {
      if (command.type !== "interact") continue;
      const transform = world.getComponent<TransformComponent>("transform", command.actor);
      const target = world.getComponent<InteractableComponent>("interactable", command.target);
      const definition = target ? this.interactions.get(target.definition) : undefined;
      if (!transform || !target || !definition || definition.trigger !== "interact") continue;
      if (Math.hypot(transform.x - definition.x, transform.z - definition.z) > definition.radius) {
        continue;
      }
      if (this.definition.run && definition.kind === "door") {
        continue;
      }
      if (this.definition.run && definition.kind === "portal") {
        const run = world.getComponent<DungeonRunComponent>("dungeonRun", dungeonId);
        if (run?.phase !== "completed" || target.state !== "active") continue;
      }

      if (definition.kind === "harvest") {
        if (target.state !== "idle") continue;
        target.state = "completed";
        dungeon.resources[definition.reward.resource] =
          (dungeon.resources[definition.reward.resource] ?? 0) + definition.reward.amount;
        events.push({ type: "interaction_changed", target: command.target, state: "completed" });
        events.push({
          type: "resource_collected",
          actor: command.actor,
          resource: definition.reward.resource,
          amount: definition.reward.amount,
        });
      }

      if (definition.kind === "door") {
        if (target.state === "completed" || dungeon.encounter !== "completed") continue;
        target.state = "completed";
        dungeon.door = "open";
        events.push({ type: "interaction_changed", target: command.target, state: "completed" });
        events.push({ type: "door_opened", target: command.target });
      }

      if (definition.kind === "portal") {
        if (dungeon.door !== "open") continue;
        if (target.state === "idle") {
          target.state = "active";
          events.push({ type: "interaction_changed", target: command.target, state: "active" });
        }
        transform.x = definition.destination.x;
        transform.z = definition.destination.z;
        transform.previousX = transform.x;
        transform.previousZ = transform.z;
        dungeon.portalUses += 1;
        events.push({
          type: "actor_teleported",
          actor: command.actor,
          x: transform.x,
          z: transform.z,
        });
      }
    }
  }
}
