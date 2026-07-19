import { STAT_RULES } from "../actor/StatSystem";
import { BALANCE_DATA } from "../content/generated/balance";
import { createCoreContent } from "../content/coreContent";
import {
  STAT_NAMES,
  type EquipmentSlot,
  type StatName,
  type StatValues,
} from "../content/Definitions";
import type { HeroProgressSnapshot, ItemSnapshot } from "../core/GameSnapshot";
import { itemAffix } from "./ItemCatalog";
import {
  evaluateAffixRoll,
  evaluateItemBase,
  roundEvaluatedStat,
} from "./ItemEvaluation";
import type { ItemInstance } from "./ItemComponents";

export interface ItemStatContribution {
  readonly flat: StatValues;
  readonly percent: StatValues;
  readonly finalMultiplier: Partial<Record<StatName, number>>;
}

export interface EquipmentComparisonDelta {
  readonly stat: StatName;
  readonly before: number;
  readonly after: number;
  readonly value: number;
}

export interface EquipmentComparison {
  readonly slot: EquipmentSlot;
  readonly replacedItemId?: number;
  readonly deltas: readonly EquipmentComparisonDelta[];
}

const CONTENT = createCoreContent();
const PERCENT_STATS = new Set<StatName>([
  "fireResist",
  "iceResist",
  "poisonResist",
  "stormResist",
  "cooldownRecovery",
]);
const PRIORITY: readonly StatName[] = [
  "maxHealth",
  "meleePower",
  "rangedPower",
  "skillPower",
  "armor",
  "critRating",
  "critDamage",
  "attackSpeed",
  "cooldownRecovery",
  "fireResist",
  "iceResist",
  "poisonResist",
  "stormResist",
  "might",
  "finesse",
  "vitality",
  "resolve",
  "moveSpeed",
  "pickupRadius",
];

function itemInstance(item: ItemSnapshot): ItemInstance {
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

function add(target: StatValues, stat: StatName, value: number): void {
  target[stat] = (target[stat] ?? 0) + value;
}

export function evaluateItemContribution(item: ItemSnapshot): ItemStatContribution {
  const instance = itemInstance(item);
  const definition = CONTENT.item(item.definition);
  const multiplier = item.reinforce === 0
    ? 1
    : BALANCE_DATA.reinforcement[item.reinforce - 1].baseMultiplier;
  const generatedBase = evaluateItemBase(instance);
  const reinforcedStat = generatedBase?.stat
    ?? definition.reinforce?.stat
    ?? (definition.slot === "melee"
      ? "meleePower"
      : definition.slot === "ranged"
        ? "rangedPower"
        : "armor");
  const flat: StatValues = {};
  const percent: StatValues = { ...definition.modifiers.percent };
  const finalMultiplier: Partial<Record<StatName, number>> = {};

  if (generatedBase) add(flat, generatedBase.stat, generatedBase.value * multiplier);
  for (const [rawStat, rawValue] of Object.entries(definition.modifiers.flat ?? {})) {
    const stat = rawStat as StatName;
    add(flat, stat, rawValue * (stat === reinforcedStat ? multiplier : 1));
  }
  for (const [rawStat, rawValue] of Object.entries(definition.modifiers.final ?? {})) {
    finalMultiplier[rawStat as StatName] = 1 + rawValue;
  }
  for (const rolled of item.affixes) {
    const affix = itemAffix(rolled.definition);
    add(flat, affix.stat, roundEvaluatedStat(
      affix.stat,
      evaluateAffixRoll(affix.tiers[0], rolled.roll, item.itemLevel, affix.stat),
    ));
  }
  return { flat, percent, finalMultiplier };
}

function adjustedFinal(
  progress: HeroProgressSnapshot,
  stat: StatName,
  removed: ItemStatContribution,
  added: ItemStatContribution,
): number {
  const breakdown = progress.statBreakdown[stat];
  const flat = breakdown.flat - (removed.flat[stat] ?? 0) + (added.flat[stat] ?? 0);
  const percent = breakdown.percent
    - (removed.percent[stat] ?? 0)
    + (added.percent[stat] ?? 0);
  const removedMultiplier = removed.finalMultiplier[stat] ?? 1;
  const finalMultiplier = breakdown.finalMultiplier
    / removedMultiplier
    * (added.finalMultiplier[stat] ?? 1);
  const raw = (breakdown.base + flat) * (1 + percent) * finalMultiplier;
  const rule = STAT_RULES[stat];
  const clamped = Math.max(rule.min, Math.min(rule.max, raw));
  const scale = 10 ** rule.decimals;
  return Math.round(clamped * scale) / scale;
}

export function compareEquipment(
  progress: HeroProgressSnapshot,
  candidate: ItemSnapshot,
): EquipmentComparison {
  const replacedItemId = progress.equipment.slots[candidate.slot];
  if (replacedItemId === candidate.id) {
    return { slot: candidate.slot, replacedItemId, deltas: [] };
  }
  const replaced = progress.items.find((item) => item.id === replacedItemId);
  const removed = replaced
    ? evaluateItemContribution(replaced)
    : { flat: {}, percent: {}, finalMultiplier: {} };
  const added = evaluateItemContribution(candidate);
  const order = new Map(PRIORITY.map((stat, index) => [stat, index]));
  const deltas = STAT_NAMES.flatMap((stat): EquipmentComparisonDelta[] => {
    const before = progress.stats[stat];
    const after = adjustedFinal(progress, stat, removed, added);
    const value = after - before;
    if (Math.abs(value) < 1e-8) return [];
    if (PERCENT_STATS.has(stat) && Math.abs(value) < 0.0005) return [];
    return [{ stat, before, after, value }];
  }).sort((left, right) => (
    (order.get(left.stat) ?? 999) - (order.get(right.stat) ?? 999)
    || left.stat.localeCompare(right.stat)
  ));
  return { slot: candidate.slot, replacedItemId, deltas };
}
