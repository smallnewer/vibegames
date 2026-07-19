import type { Command } from "../core/Command";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { World } from "../core/World";
import type { EquipmentComponent, InventoryComponent, MaterialId } from "./ItemComponents";
import { reinforcedScrapRecovery, reinforcementQuote } from "./ForgeQuote";

const SALVAGE_SCRAP = {
  normal: 1,
  magic: 2,
  rare: 5,
  unique: 12,
} as const;

export class ForgeSystem {
  update(world: World, commands: readonly Command[], events: GameplayEvent[]): void {
    for (const command of commands) {
      if (command.type === "toggle_favorite") {
        this.toggleFavorite(world, command.actor, command.item, events);
      }
      if (command.type === "reinforce_item") this.reinforce(world, command.actor, command.item, events);
      if (command.type === "salvage_item") this.salvage(world, command.actor, command.item, events);
    }
  }

  private toggleFavorite(
    world: World,
    actor: number,
    itemId: number,
    events: GameplayEvent[],
  ): void {
    const item = world.getComponent<InventoryComponent>("inventory", actor)?.items
      .find((entry) => entry.id === itemId);
    if (item) {
      item.favorite = !item.favorite;
      events.push({ type: "item_favorite_changed", actor, item: itemId, favorite: item.favorite });
    }
  }

  private reinforce(world: World, actor: number, itemId: number, events: GameplayEvent[]): void {
    const inventory = world.getComponent<InventoryComponent>("inventory", actor);
    const item = inventory?.items.find((entry) => entry.id === itemId);
    if (!inventory || !item) return;
    const quote = reinforcementQuote(item, inventory.materials);
    if (!quote.allowed) {
      events.push({ type: "forge_rejected", actor, item: itemId, reason: quote.reason! });
      return;
    }
    for (const [material, amount] of Object.entries(quote.cost) as [MaterialId, number][]) {
      inventory.materials[material] -= amount;
    }
    item.reinforce = quote.to as typeof item.reinforce;
    events.push({ type: "item_reinforced", actor, item: itemId, level: item.reinforce });
  }

  private salvage(world: World, actor: number, itemId: number, events: GameplayEvent[]): void {
    const inventory = world.getComponent<InventoryComponent>("inventory", actor);
    const equipment = world.getComponent<EquipmentComponent>("equipment", actor);
    const index = inventory?.items.findIndex((entry) => entry.id === itemId) ?? -1;
    const item = index >= 0 ? inventory!.items[index] : undefined;
    const reason = !item
      ? "missing_item"
      : item.favorite
        ? "favorite"
        : Object.values(equipment ?? {}).includes(itemId)
          ? "equipped"
          : undefined;
    if (reason) {
      events.push({ type: "forge_rejected", actor, item: itemId, reason });
      return;
    }
    const scrap = SALVAGE_SCRAP[item!.rarity] + reinforcedScrapRecovery(item!);
    inventory!.items.splice(index, 1);
    inventory!.materials["material.scrap"] += scrap;
    events.push({ type: "item_salvaged", actor, item: itemId, scrap });
  }
}
