import { BALANCE_DATA } from "../content/generated/balance";
import { EQUIPMENT_SLOTS, type EquipmentSlot, type ItemRarity, type StatName } from "../content/Definitions";
import type { GameSnapshot, ItemSnapshot } from "../core/GameSnapshot";
import { compareEquipment, type EquipmentComparison } from "../item/EquipmentComparison";
import { itemAffix, itemBaseForDefinition } from "../item/ItemCatalog";
import { evaluateAffixRoll, evaluateItemBase, roundEvaluatedStat } from "../item/ItemEvaluation";
import type { ItemInstance } from "../item/ItemComponents";
import type { PlayerSlotId } from "../player/PlayerSlot";

export type InventorySortMode = "newest" | "slot" | "rarity" | "item_level";
export type InventoryView = "items" | "recovery";

export interface InventoryPageOptions {
  readonly view: InventoryView;
  readonly sort: InventorySortMode;
  readonly focusId: string;
  readonly compareItemId?: number;
}

export interface InventoryCellModel {
  readonly index: number;
  readonly focusId: string;
  readonly enabled: boolean;
  readonly item?: ItemSnapshot;
  readonly icon?: string;
}

export interface InventoryAffixModel {
  readonly id: string;
  readonly stat: StatName;
  readonly value: number;
}

export interface InventoryItemDetails {
  readonly id: number;
  readonly name: string;
  readonly slot: EquipmentSlot;
  readonly icon: string;
  readonly rarity: ItemRarity;
  readonly itemLevel: number;
  readonly requiredLevel: number;
  readonly reinforce: number;
  readonly favorite: boolean;
  readonly equipped: boolean;
  readonly inRecovery: boolean;
  readonly canEquip: boolean;
  readonly equipReason?: string;
  readonly canSalvage: boolean;
  readonly base?: { readonly stat: StatName; readonly value: number };
  readonly affixes: readonly InventoryAffixModel[];
  readonly comparison: EquipmentComparison;
}

export interface InventoryPageModel {
  readonly view: InventoryView;
  readonly sort: InventorySortMode;
  readonly cells: readonly InventoryCellModel[];
  readonly recoveryCells: readonly InventoryCellModel[];
  readonly equipment: readonly {
    slot: EquipmentSlot;
    name: string;
    itemId?: number;
    icon?: string;
  }[];
  readonly selected?: InventoryItemDetails;
  readonly compareActive: boolean;
  readonly mainCount: number;
  readonly mainCapacity: 30;
  readonly recoveryCount: number;
  readonly recoveryCapacity: 12;
}

const RARITY_ORDER: Record<ItemRarity, number> = {
  unique: 0,
  rare: 1,
  magic: 2,
  normal: 3,
};

function asInstance(item: ItemSnapshot): ItemInstance {
  return {
    id: item.id,
    definition: item.definition,
    itemLevel: item.itemLevel,
    baseRoll: item.baseRoll,
    theme: item.theme,
    rarity: item.rarity,
    affixes: item.affixes.map((affix) => ({ ...affix })),
    reinforce: item.reinforce,
    favorite: item.favorite,
  };
}

function sortItems(items: readonly ItemSnapshot[], mode: InventorySortMode): ItemSnapshot[] {
  const storageOrder = new Map(items.map((item, index) => [item.id, index]));
  return [...items].sort((left, right) => {
    if (mode === "newest") return storageOrder.get(right.id)! - storageOrder.get(left.id)!;
    if (mode === "slot") {
      return EQUIPMENT_SLOTS.indexOf(left.slot) - EQUIPMENT_SLOTS.indexOf(right.slot)
        || RARITY_ORDER[left.rarity] - RARITY_ORDER[right.rarity]
        || right.itemLevel - left.itemLevel
        || left.id - right.id;
    }
    if (mode === "rarity") {
      return RARITY_ORDER[left.rarity] - RARITY_ORDER[right.rarity]
        || right.itemLevel - left.itemLevel
        || left.id - right.id;
    }
    return right.itemLevel - left.itemLevel
      || RARITY_ORDER[left.rarity] - RARITY_ORDER[right.rarity]
      || left.id - right.id;
  });
}

function makeCells(
  items: readonly ItemSnapshot[],
  capacity: number,
  prefix: "inventory" | "recovery",
): InventoryCellModel[] {
  return Array.from({ length: capacity }, (_, index) => {
    const item = items[index];
    return {
      index,
      focusId: item ? `${prefix}:item:${item.id}` : `${prefix}:empty:${index}`,
      enabled: item !== undefined,
      item,
      icon: item ? itemBaseForDefinition(item.definition)?.iconFamily : undefined,
    };
  });
}

function details(
  item: ItemSnapshot,
  inRecovery: boolean,
  level: number,
  progress: GameSnapshot["progress"],
): InventoryItemDetails {
  const requiredLevel = Math.max(1, item.itemLevel - 2);
  const base = evaluateItemBase(asInstance(item));
  const multiplier = item.reinforce === 0
    ? 1
    : BALANCE_DATA.reinforcement[item.reinforce - 1].baseMultiplier;
  const canEquip = !inRecovery && !item.equipped && level >= requiredLevel;
  const equipReason = inRecovery
    ? "先移回背包"
    : item.equipped
      ? "已装备"
      : level < requiredLevel
        ? `需要角色等级 ${requiredLevel}`
        : undefined;
  return {
    id: item.id,
    name: item.name,
    slot: item.slot,
    icon: itemBaseForDefinition(item.definition)?.iconFamily ?? "icon.unknown",
    rarity: item.rarity,
    itemLevel: item.itemLevel,
    requiredLevel,
    reinforce: item.reinforce,
    favorite: item.favorite,
    equipped: item.equipped,
    inRecovery,
    canEquip,
    equipReason,
    canSalvage: !inRecovery && !item.favorite && !item.equipped,
    base: base ? { stat: base.stat, value: base.value * multiplier } : undefined,
    affixes: item.affixes.map((rolled) => {
      const affix = itemAffix(rolled.definition);
      return {
        id: affix.id,
        stat: affix.stat,
        value: roundEvaluatedStat(
          affix.stat,
          evaluateAffixRoll(affix.tiers[0], rolled.roll, item.itemLevel, affix.stat),
        ),
      };
    }),
    comparison: compareEquipment(progress, item),
  };
}

export function buildInventoryPageModel(
  snapshot: GameSnapshot,
  slot: PlayerSlotId,
  options: InventoryPageOptions,
): InventoryPageModel {
  const player = snapshot.players.find((candidate) => candidate.slot === slot)
    ?? snapshot.players[0];
  if (!player) throw new Error("inventory page requires at least one player");
  const { progress } = player;
  const main = sortItems(progress.items, options.sort);
  const recovery = sortItems(progress.recovery, options.sort);
  const cells = makeCells(main, 30, "inventory");
  const recoveryCells = makeCells(recovery, 12, "recovery");
  const selectedMain = cells.find((cell) => cell.focusId === options.focusId)?.item;
  const selectedRecovery = recoveryCells.find((cell) => cell.focusId === options.focusId)?.item;
  const salvageItemId = options.focusId.startsWith("inventory:salvage:")
    ? Number(options.focusId.slice("inventory:salvage:".length))
    : undefined;
  const selectedSalvage = Number.isInteger(salvageItemId)
    ? progress.items.find((item) => item.id === salvageItemId)
    : undefined;
  const selectedItem = selectedMain ?? selectedRecovery ?? selectedSalvage;
  return {
    view: options.view,
    sort: options.sort,
    cells,
    recoveryCells,
    equipment: EQUIPMENT_SLOTS.map((equipmentSlot) => {
      const itemId = progress.equipment.slots[equipmentSlot];
      const item = progress.items.find((candidate) => candidate.id === itemId);
      return {
        slot: equipmentSlot,
        name: progress.equipment.names[equipmentSlot],
        itemId,
        icon: item ? itemBaseForDefinition(item.definition)?.iconFamily : undefined,
      };
    }),
    selected: selectedItem
      ? details(selectedItem, selectedRecovery !== undefined, progress.level, progress)
      : undefined,
    compareActive: selectedItem?.id === options.compareItemId,
    mainCount: progress.items.length,
    mainCapacity: 30,
    recoveryCount: progress.recovery.length,
    recoveryCapacity: 12,
  };
}
