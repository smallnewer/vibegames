import type { EquipmentSlot, ItemRarity } from "../content/Definitions";

export interface RolledAffix {
  readonly definition: string;
  readonly roll: number;
}

export const ITEM_THEMES = ["ember", "frost", "tide", "spore", "storm"] as const;
export type ItemTheme = typeof ITEM_THEMES[number];

export interface ItemInstance {
  id: number;
  definition: string;
  itemLevel: number;
  baseRoll: number;
  theme: ItemTheme;
  rarity: ItemRarity;
  affixes: RolledAffix[];
  reinforce: 0 | 1 | 2 | 3 | 4 | 5;
  favorite: boolean;
}

export function fixedItemInstance(
  id: number,
  definition: string,
  rarity: ItemRarity = "normal",
  theme: ItemTheme = "ember",
): ItemInstance {
  return {
    id,
    definition,
    itemLevel: 1,
    baseRoll: 5_000,
    theme,
    rarity,
    affixes: [],
    reinforce: 0,
    favorite: false,
  };
}

export interface InventoryComponent {
  nextItemId: number;
  items: ItemInstance[];
  recovery: ItemInstance[];
  materials: Record<MaterialId, number>;
}

export const MATERIAL_IDS = [
  "material.scrap",
  "material.ember_essence",
  "material.frost_essence",
  "material.tide_essence",
  "material.spore_essence",
  "material.storm_essence",
  "material.seal",
] as const;
export type MaterialId = typeof MATERIAL_IDS[number];

export function emptyMaterialWallet(): Record<MaterialId, number> {
  return Object.fromEntries(MATERIAL_IDS.map((id) => [id, 0])) as Record<MaterialId, number>;
}

export type EquipmentComponent = Partial<Record<EquipmentSlot, number>>;

export interface AbilityBookComponent {
  unlocked: string[];
}

export type LootGrant =
  | { type: "item"; item: ItemInstance }
  | { type: "ability"; ability: string }
  | { type: "material"; material: MaterialId; amount: number };

export interface LootComponent {
  readonly owner: import("../player/PlayerSlot").PlayerSlotId;
  readonly grant: LootGrant;
  readonly source: import("../core/World").EntityId;
  readonly x: number;
  readonly z: number;
}

export interface DropTableComponent {
  sourceType: "minion" | "elite" | "boss";
  theme: "ember" | "frost" | "tide" | "spore" | "storm";
  level: number;
  dropped: boolean;
}
