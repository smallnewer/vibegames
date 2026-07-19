import type { RunRng, WeightedEntry } from "../balance/RunRng";
import type { ItemRarity } from "../content/Definitions";
import type { EntityId } from "../core/World";
import type { PlayerSlotId } from "../player/PlayerSlot";
import { ITEM_BASES, UNIQUE_ITEMS } from "./ItemCatalog";
import type { LootGrant, MaterialId } from "./ItemComponents";
import { rollItem } from "./ItemRoller";

export interface LootTableDef {
  readonly id: "minion" | "elite" | "boss";
  readonly equipmentChance: number;
  readonly rarities: readonly WeightedEntry<ItemRarity>[];
  readonly scrap: readonly [number, number];
  readonly scrapChance: number;
  readonly essence: readonly [number, number];
  readonly essenceChance: number;
  readonly sealChance: number;
  readonly personalGuarantee: boolean;
}

const TABLES: Readonly<Record<LootTableDef["id"], LootTableDef>> = {
  minion: {
    id: "minion", equipmentChance: 0.07,
    rarities: [
      { value: "normal", weight: 0.68 }, { value: "magic", weight: 0.26 },
      { value: "rare", weight: 0.055 }, { value: "unique", weight: 0.005 },
    ],
    scrap: [1, 2], scrapChance: 0.35, essence: [0, 0], essenceChance: 0,
    sealChance: 0, personalGuarantee: false,
  },
  elite: {
    id: "elite", equipmentChance: 0.35,
    rarities: [
      { value: "normal", weight: 0.38 }, { value: "magic", weight: 0.45 },
      { value: "rare", weight: 0.16 }, { value: "unique", weight: 0.01 },
    ],
    scrap: [2, 4], scrapChance: 1, essence: [1, 1], essenceChance: 0.4,
    sealChance: 0, personalGuarantee: false,
  },
  boss: {
    id: "boss", equipmentChance: 1,
    rarities: [
      { value: "magic", weight: 0.64 }, { value: "rare", weight: 0.32 },
      { value: "unique", weight: 0.04 },
    ],
    scrap: [6, 10], scrapChance: 1, essence: [2, 4], essenceChance: 1,
    sealChance: 0.35, personalGuarantee: true,
  },
};

const ESSENCE_BY_THEME = {
  ember: "material.ember_essence",
  frost: "material.frost_essence",
  tide: "material.tide_essence",
  spore: "material.spore_essence",
  storm: "material.storm_essence",
} as const satisfies Record<string, MaterialId>;

export interface LootContext {
  readonly owner: PlayerSlotId;
  readonly source: EntityId;
  readonly itemLevel: number;
  readonly theme: keyof typeof ESSENCE_BY_THEME;
  readonly sequence: number;
  readonly rng: RunRng;
}

export function lootTable(id: LootTableDef["id"]): LootTableDef {
  return TABLES[id];
}

export function rollLoot(table: LootTableDef, context: LootContext): LootGrant[] {
  const rng = context.rng.fork(`loot:${table.id}:${context.source}:${context.owner}:${context.sequence}`);
  const grants: LootGrant[] = [];
  if (rng.chance(table.equipmentChance)) {
    const rarity = rng.weighted(table.rarities);
    const base = rng.weighted(ITEM_BASES.map((value) => ({ value, weight: 1 })));
    if (rarity === "unique") {
      const dungeonByTheme = {
        ember: "dungeon.production_foundation",
        frost: "dungeon.frost_mine",
        tide: "dungeon.sunken_library",
        spore: "dungeon.moss_sanctum",
        storm: "dungeon.storm_throne",
      } as const;
      const pool = UNIQUE_ITEMS.filter((entry) => entry.dungeon === dungeonByTheme[context.theme]);
      const unique = rng.weighted(pool.map((value) => ({ value, weight: 1 })));
      grants.push({
        type: "item",
        item: rollItem(unique.id, context.itemLevel, rarity, 0, rng, context.theme),
      });
    } else {
      grants.push({
        type: "item",
        item: rollItem(base.id, context.itemLevel, rarity, 0, rng, context.theme),
      });
    }
  }
  if (rng.chance(table.scrapChance)) {
    grants.push({
      type: "material",
      material: "material.scrap",
      amount: rng.intInclusive(table.scrap[0], table.scrap[1]),
    });
  }
  if (rng.chance(table.essenceChance)) {
    grants.push({
      type: "material",
      material: ESSENCE_BY_THEME[context.theme],
      amount: rng.intInclusive(table.essence[0], table.essence[1]),
    });
  }
  if (rng.chance(table.sealChance)) {
    grants.push({ type: "material", material: "material.seal", amount: 1 });
  }
  return grants;
}
