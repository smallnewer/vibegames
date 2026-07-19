import type { RunRng } from "../balance/RunRng";
import type { ItemRarity } from "../content/Definitions";
import { ITEM_AFFIXES, UNIQUE_ITEMS, itemAffix, itemBase } from "./ItemCatalog";
import type { ItemInstance, ItemTheme, RolledAffix } from "./ItemComponents";

function randomAffixes(
  baseId: string,
  count: number,
  rarity: "magic" | "rare",
  rng: RunRng,
): RolledAffix[] {
  const base = itemBase(baseId);
  const compatible = ITEM_AFFIXES.filter((affix) => affix.slots.includes(base.slot));
  const selected: RolledAffix[] = [];
  const groups = new Set<string>();
  const kinds = new Set<string>();
  const choose = (candidates: typeof compatible) => {
    if (candidates.length === 0) throw new Error(`not enough affixes for ${baseId}`);
    const definition = rng.weighted(candidates.map((value) => ({ value, weight: 1 })));
    groups.add(definition.group);
    kinds.add(definition.kind);
    selected.push({ definition: definition.id, roll: rng.intInclusive(0, 10_000) });
  };
  const core = compatible.filter((affix) => affix.core);
  choose(core.length > 0 ? core : compatible);
  while (selected.length < count) {
    choose(compatible.filter((affix) => (
      !groups.has(affix.group)
      && (rarity !== "magic" || !kinds.has(affix.kind))
    )));
  }
  return selected;
}

export function rollItem(
  definition: string,
  itemLevel: number,
  rarity: ItemRarity,
  id: number,
  rng: RunRng,
  theme?: ItemTheme,
): ItemInstance {
  const level = Math.max(1, Math.min(30, Math.round(itemLevel)));
  let affixes: RolledAffix[] = [];
  if (rarity === "magic") affixes = randomAffixes(definition, rng.intInclusive(1, 2), rarity, rng);
  if (rarity === "rare") affixes = randomAffixes(definition, rng.intInclusive(3, 4), rarity, rng);
  if (rarity === "unique") {
    const unique = UNIQUE_ITEMS.find((entry) => entry.id === definition);
    if (!unique) throw new Error(`Unknown unique item: ${definition}`);
    affixes = unique.affixes.map((affixId) => {
      itemAffix(affixId);
      return { definition: affixId, roll: 7_500 };
    });
  } else {
    itemBase(definition);
  }
  return {
    id,
    definition,
    itemLevel: level,
    baseRoll: rarity === "unique" ? 7_500 : rng.intInclusive(0, 10_000),
    theme: theme ?? defaultTheme(definition),
    rarity,
    affixes,
    reinforce: 0,
    favorite: false,
  };
}

function defaultTheme(definition: string): ItemTheme {
  const unique = UNIQUE_ITEMS.find((entry) => entry.id === definition);
  if (unique) {
    if (unique.dungeon.includes("frost")) return "frost";
    if (unique.dungeon.includes("sunken")) return "tide";
    if (unique.dungeon.includes("moss")) return "spore";
    if (unique.dungeon.includes("storm")) return "storm";
    return "ember";
  }
  const base = itemBase(definition);
  const theme = base.theme.replace("theme.", "");
  return theme === "neutral" ? "ember" : theme as ItemTheme;
}
