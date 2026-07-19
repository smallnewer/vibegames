import type { StatName } from "../content/Definitions";
import { itemBaseForDefinition } from "./ItemCatalog";
import type { ItemInstance } from "./ItemComponents";

export function itemPower(level: number): number {
  if (!Number.isFinite(level)) throw new Error(`item level must be finite: ${level}`);
  const clamped = Math.max(1, Math.min(30, Math.round(level)));
  return Math.round(10 * 1.085 ** (clamped - 1));
}

export function evaluateAffixRoll(
  tier: Readonly<{ minFactor: number; maxFactor: number }>,
  roll: number,
  level: number,
  stat?: StatName,
): number {
  if (!Number.isInteger(roll) || roll < 0 || roll > 10_000) {
    throw new Error(`affix roll must be an integer from 0 to 10000: ${roll}`);
  }
  if (!Number.isFinite(tier.minFactor) || !Number.isFinite(tier.maxFactor)) {
    throw new Error("affix tier factors must be finite");
  }
  if (tier.minFactor > tier.maxFactor) throw new Error("affix tier min exceeds max");
  const scale = stat !== undefined && FRACTIONAL_STATS.has(stat)
    ? percentageAffixPower(level)
    : itemPower(level);
  return (tier.minFactor + (tier.maxFactor - tier.minFactor) * roll / 10_000) * scale;
}

// Flat ratings can follow the exponential item-power curve. Percentages need a
// gentler curve so one late-game affix remains meaningful without reaching a cap.
export function percentageAffixPower(level: number): number {
  if (!Number.isFinite(level)) throw new Error(`item level must be finite: ${level}`);
  const clamped = Math.max(1, Math.min(30, Math.round(level)));
  return 10 + (clamped - 1) * 0.6;
}

export function evaluateItemBase(item: ItemInstance): Readonly<{ stat: StatName; value: number }> | undefined {
  const base = itemBaseForDefinition(item.definition);
  if (!base) return undefined;
  if (!Number.isInteger(item.baseRoll) || item.baseRoll < 0 || item.baseRoll > 10_000) {
    throw new Error(`base roll must be an integer from 0 to 10000: ${item.baseRoll}`);
  }
  const factor = base.baseMin + (base.baseMax - base.baseMin) * item.baseRoll / 10_000;
  return { stat: base.coreStat, value: roundEvaluatedStat(base.coreStat, itemPower(item.itemLevel) * factor) };
}

const FRACTIONAL_STATS = new Set<StatName>([
  "fireResist", "iceResist", "poisonResist", "stormResist",
  "critDamage", "attackSpeed", "cooldownRecovery", "moveSpeed",
]);

export function roundEvaluatedStat(stat: StatName, value: number): number {
  const scale = FRACTIONAL_STATS.has(stat) ? 10_000 : 1;
  return Math.round(value * scale) / scale;
}
