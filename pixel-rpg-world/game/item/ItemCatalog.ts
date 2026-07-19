import { ITEM_CATALOG_DATA } from "../content/generated/items";
import type { EquipmentSlot, StatName } from "../content/Definitions";

export interface ItemBaseDef {
  readonly id: string;
  readonly slot: EquipmentSlot;
  readonly iconFamily: string;
  readonly visual: string;
  readonly theme: string;
  readonly coreStat: StatName;
  readonly baseMin: number;
  readonly baseMax: number;
  readonly affixTags: readonly string[];
}

export interface AffixDef {
  readonly id: string;
  readonly group: string;
  readonly kind: "prefix" | "suffix";
  readonly slots: readonly EquipmentSlot[];
  readonly stat: StatName;
  readonly core: boolean;
  readonly tiers: readonly { readonly minFactor: number; readonly maxFactor: number }[];
}

export interface UniqueItemDef {
  readonly id: string;
  readonly base: string;
  readonly dungeon: string;
  readonly affixes: readonly string[];
}

export const ITEM_BASES = ITEM_CATALOG_DATA.bases as readonly ItemBaseDef[];
export const ITEM_AFFIXES = ITEM_CATALOG_DATA.affixes as readonly AffixDef[];
export const UNIQUE_ITEMS = ITEM_CATALOG_DATA.uniques as readonly UniqueItemDef[];

export function itemBase(id: string): ItemBaseDef {
  const value = ITEM_BASES.find((entry) => entry.id === id);
  if (!value) throw new Error(`Unknown item base: ${id}`);
  return value;
}

export function itemBaseForDefinition(id: string): ItemBaseDef | undefined {
  const unique = UNIQUE_ITEMS.find((entry) => entry.id === id);
  return ITEM_BASES.find((entry) => entry.id === (unique?.base ?? id));
}

export function itemAffix(id: string): AffixDef {
  const value = ITEM_AFFIXES.find((entry) => entry.id === id);
  if (!value) throw new Error(`Unknown item affix: ${id}`);
  return value;
}
