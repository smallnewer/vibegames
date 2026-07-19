import {
  createAbilityChargeState,
  type AbilityLoadoutComponent,
} from "../ability/AbilityComponents";
import type { TransformComponent } from "../actor/ActorComponents";
import type { StatsComponent } from "../actor/Stats";
import type { ContentRegistry } from "../content/ContentRegistry";
import type { EquipmentSlot } from "../content/Definitions";
import type { Command } from "../core/Command";
import type { GameplayEvent } from "../core/GameplayEvent";
import type { EntityId, World } from "../core/World";
import type { ProgressionComponent } from "../progression/ProgressionComponents";
import type {
  AbilityBookComponent,
  EquipmentComponent,
  InventoryComponent,
  LootComponent,
} from "./ItemComponents";
import { lootNotice } from "./LootNotice";

export class InventorySystem {
  constructor(private readonly content: ContentRegistry) {}

  // 背包变更只接受明确命令，UI 和渲染层不能直接改组件。
  update(
    world: World,
    commands: readonly Command[],
    events: GameplayEvent[],
    options: Readonly<{ allowLoadoutChanges?: boolean }> = {},
  ): void {
    for (const command of commands) {
      if (command.type === "pickup") this.pickup(world, command.actor, command.loot, events);
      if (command.type === "equip_item") {
        this.equipItem(world, command.actor, command.item, command.slot, events);
      }
      if (command.type === "equip_ability") {
        if (options.allowLoadoutChanges !== false) {
          this.equipAbility(world, command.actor, command.ability, command.slot, events);
        }
      }
      if (command.type === "equip_passive") {
        if (options.allowLoadoutChanges !== false) {
          this.equipPassive(world, command.actor, command.passive, command.slot, events);
        }
      }
      if (command.type === "recover_item") {
        this.recoverItem(world, command.actor, command.item, events);
      }
    }
  }

  private pickup(world: World, actorId: EntityId, lootId: EntityId, events: GameplayEvent[]): void {
    const transform = world.getComponent<TransformComponent>("transform", actorId);
    const inventory = world.getComponent<InventoryComponent>("inventory", actorId);
    const loot = world.getComponent<LootComponent>("loot", lootId);
    const stats = world.getComponent<StatsComponent>("stats", actorId);
    if (!transform || !inventory || !loot) return;
    const player = world.getComponent<import("../player/PlayerSlot").PlayerSlotComponent>(
      "playerSlot",
      actorId,
    );
    if (!player || player.slot !== loot.owner) return;
    if (
      Math.hypot(transform.x - loot.x, transform.z - loot.z)
      > (stats?.final.pickupRadius ?? 1.4)
    ) return;

    if (loot.grant.type === "item") {
      const itemId = inventory.nextItemId;
      const item = { ...loot.grant.item, id: itemId, affixes: [...loot.grant.item.affixes] };
      if (inventory.items.length < 30) inventory.items.push(item);
      else if (inventory.recovery.length < 12) inventory.recovery.push(item);
      else {
        events.push({ type: "inventory_full", actor: actorId, loot: lootId });
        return;
      }
      inventory.nextItemId += 1;
    }
    if (loot.grant.type === "ability") {
      const definition = this.content.findAbility(loot.grant.ability)
        ?? this.content.findPassive(loot.grant.ability);
      if (!definition) return;
      const book = world.getComponent<AbilityBookComponent>("abilityBook", actorId);
      if (!book) return;
      if (!book.unlocked.includes(loot.grant.ability)) {
        book.unlocked.push(loot.grant.ability);
        book.unlocked.sort();
      }
    }
    if (loot.grant.type === "material") {
      inventory.materials[loot.grant.material] += loot.grant.amount;
    }

    const notice = lootNotice(this.content, loot.grant);
    world.destroyEntity(lootId);
    events.push({
      type: "loot_picked_up",
      actor: actorId,
      loot: lootId,
      ...notice,
    });
  }

  private equipItem(
    world: World,
    actorId: EntityId,
    itemId: number,
    slot: EquipmentSlot,
    events: GameplayEvent[],
  ): void {
    const inventory = world.getComponent<InventoryComponent>("inventory", actorId);
    const equipment = world.getComponent<EquipmentComponent>("equipment", actorId);
    const loadout = world.getComponent<AbilityLoadoutComponent>("abilityLoadout", actorId);
    const instance = inventory?.items.find((item) => item.id === itemId);
    if (!inventory || !equipment || !instance) return;
    const definition = this.content.item(instance.definition);
    if (definition.slot !== slot) return;
    const progression = world.getComponent<ProgressionComponent>("progression", actorId);
    if (progression && instance.itemLevel > progression.level + 2) return;

    if (slot === "melee" || slot === "ranged") {
      if (!loadout || !definition.ability) return;
      loadout.slots[slot] = definition.ability;
      loadout.cooldowns[slot] = createAbilityChargeState();
    }
    equipment[slot] = itemId;
    events.push({
      type: "item_equipped",
      actor: actorId,
      item: itemId,
      definition: definition.id,
      slot,
    });
  }

  private recoverItem(
    world: World,
    actorId: EntityId,
    itemId: number,
    events: GameplayEvent[],
  ): void {
    const inventory = world.getComponent<InventoryComponent>("inventory", actorId);
    if (!inventory || inventory.items.length >= 30) return;
    const index = inventory.recovery.findIndex((item) => item.id === itemId);
    if (index < 0) return;
    const [item] = inventory.recovery.splice(index, 1);
    inventory.items.push(item);
    events.push({ type: "item_recovered", actor: actorId, item: itemId });
  }

  private equipAbility(
    world: World,
    actorId: EntityId,
    abilityId: string,
    slot: "skill_up" | "skill_right" | "skill_down" | "skill_left",
    events: GameplayEvent[],
  ): void {
    const book = world.getComponent<AbilityBookComponent>("abilityBook", actorId);
    const loadout = world.getComponent<AbilityLoadoutComponent>("abilityLoadout", actorId);
    if (!book || !loadout || !book.unlocked.includes(abilityId)) return;
    const definition = this.content.findAbility(abilityId);
    if (!definition || definition.slot !== "active") return;

    for (const active of ["skill_up", "skill_right", "skill_down", "skill_left"] as const) {
      if (loadout.slots[active] === abilityId) {
        loadout.slots[active] = undefined;
        loadout.cooldowns[active] = createAbilityChargeState();
      }
    }
    loadout.slots[slot] = abilityId;
    loadout.cooldowns[slot] = createAbilityChargeState();
    events.push({ type: "ability_equipped", actor: actorId, ability: abilityId, slot });
  }

  private equipPassive(
    world: World,
    actorId: EntityId,
    passiveId: string,
    slot: "passive_1" | "passive_2",
    events: GameplayEvent[],
  ): void {
    const book = world.getComponent<AbilityBookComponent>("abilityBook", actorId);
    const loadout = world.getComponent<AbilityLoadoutComponent>("abilityLoadout", actorId);
    if (!book || !loadout || !book.unlocked.includes(passiveId)) return;
    if (!this.content.findPassive(passiveId)) return;

    for (const passive of ["passive_1", "passive_2"] as const) {
      if (loadout.passives[passive] === passiveId) loadout.passives[passive] = undefined;
    }
    loadout.passives[slot] = passiveId;
    events.push({ type: "passive_equipped", actor: actorId, passive: passiveId, slot });
  }

}
