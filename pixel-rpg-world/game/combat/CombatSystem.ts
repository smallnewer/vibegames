import type { AbilityLoadoutComponent } from "../ability/AbilityComponents";
import type { ActorComponent, TransformComponent } from "../actor/ActorComponents";
import type { Command } from "../core/Command";
import type { EntityId, World } from "../core/World";

export class CombatSystem {
  // 敌人只产出施法意图；冷却、伤害和弹道全部交给 AbilitySystem。
  commands(world: World, players: readonly EntityId[]): Command[] {
    const livingPlayers = players.filter((player) => {
      const actor = world.getComponent<ActorComponent>("actor", player);
      return actor?.faction === "hero"
        && actor.action !== "dead"
        && world.getComponent<TransformComponent>("transform", player) !== undefined;
    });
    if (livingPlayers.length === 0) return [];

    return world.entitiesWith("actor", "transform", "abilityLoadout").flatMap((enemy) => {
      const actor = world.getComponent<ActorComponent>("actor", enemy)!;
      const transform = world.getComponent<TransformComponent>("transform", enemy)!;
      const loadout = world.getComponent<AbilityLoadoutComponent>("abilityLoadout", enemy)!;
      if (actor.faction !== "enemy" || actor.action === "dead" || !loadout.slots.ranged) return [];
      const target = [...livingPlayers].sort((left, right) => {
        const leftTransform = world.getComponent<TransformComponent>("transform", left)!;
        const rightTransform = world.getComponent<TransformComponent>("transform", right)!;
        return Math.hypot(leftTransform.x - transform.x, leftTransform.z - transform.z)
          - Math.hypot(rightTransform.x - transform.x, rightTransform.z - transform.z)
          || left - right;
      })[0];
      const targetTransform = world.getComponent<TransformComponent>("transform", target)!;
      return [{
        type: "cast" as const,
        actor: enemy,
        slot: "ranged" as const,
        aimX: targetTransform.x,
        aimZ: targetTransform.z,
      }];
    });
  }
}
