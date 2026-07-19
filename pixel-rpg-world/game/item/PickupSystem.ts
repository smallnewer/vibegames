import type { ActorComponent, TransformComponent } from "../actor/ActorComponents";
import type { StatsComponent } from "../actor/Stats";
import type { Command } from "../core/Command";
import type { EntityId, World } from "../core/World";
import type { PlayerSlotComponent } from "../player/PlayerSlot";
import type { InventoryComponent, LootComponent } from "./ItemComponents";

interface PickupCandidate {
  readonly actor: EntityId;
  readonly slot: number;
  readonly distance: number;
}

export class PickupSystem {
  // 每个掉落只选一个最近玩家；槽位和实体编号负责打破完全相同的距离。
  commands(world: World, players: readonly EntityId[]): Command[] {
    const commands: Command[] = [];
    const lootIds = [...world.entitiesWith("loot")].sort((left, right) => left - right);
    for (const lootId of lootIds) {
      const loot = world.getComponent<LootComponent>("loot", lootId)!;
      const candidates = players
        .map((actor) => this.candidate(world, actor, loot))
        .filter((value): value is PickupCandidate => value !== undefined)
        .sort((left, right) => (
          left.distance - right.distance
          || left.slot - right.slot
          || left.actor - right.actor
        ));
      const winner = candidates[0];
      if (winner) commands.push({ type: "pickup", actor: winner.actor, loot: lootId });
    }
    return commands;
  }

  private candidate(
    world: World,
    actorId: EntityId,
    loot: LootComponent,
  ): PickupCandidate | undefined {
    const actor = world.getComponent<ActorComponent>("actor", actorId);
    const transform = world.getComponent<TransformComponent>("transform", actorId);
    const stats = world.getComponent<StatsComponent>("stats", actorId);
    const player = world.getComponent<PlayerSlotComponent>("playerSlot", actorId);
    const inventory = world.getComponent<InventoryComponent>("inventory", actorId);
    if (!actor || !transform || !stats || !player || !inventory || actor.action === "dead") {
      return undefined;
    }
    if (player.slot !== loot.owner) return undefined;
    const distance = Math.hypot(transform.x - loot.x, transform.z - loot.z);
    if (distance > stats.final.pickupRadius) return undefined;
    return { actor: actorId, slot: player.slot, distance };
  }
}
