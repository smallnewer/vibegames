import { BALANCE_DATA } from "../content/generated/balance";
import type { StatValues } from "../content/Definitions";
import { evaluateItemBase, itemPower } from "./ItemEvaluation";
import { MATERIAL_IDS, type ItemInstance, type MaterialId } from "./ItemComponents";

export type MaterialWallet = Readonly<Record<MaterialId, number>>;

export interface ReinforcementQuote {
  readonly allowed: boolean;
  readonly reason?: "max_level" | "missing_scrap" | "missing_essence" | "missing_seal";
  readonly from: number;
  readonly to: number;
  readonly currentBaseMultiplier: number;
  readonly nextBaseMultiplier: number;
  readonly cost: MaterialWallet;
  readonly statDelta: StatValues;
  readonly baseStat: Readonly<{
    stat: keyof StatValues;
    current: number;
    next: number;
  }>;
}

function essenceFor(item: ItemInstance): MaterialId {
  return `material.${item.theme}_essence` as MaterialId;
}

function emptyCost(): Record<MaterialId, number> {
  return Object.fromEntries(MATERIAL_IDS.map((id) => [id, 0])) as Record<MaterialId, number>;
}

function currentMultiplier(level: number): number {
  if (level === 0) return 1;
  return BALANCE_DATA.reinforcement[level - 1].baseMultiplier;
}

function baseStat(item: ItemInstance): Readonly<{ stat: keyof StatValues; value: number }> {
  const generated = evaluateItemBase(item);
  if (generated) return generated;
  if (item.definition.includes("bow")) return { stat: "rangedPower", value: 30 };
  if (item.definition.includes("blade") || item.definition.includes("sword")) {
    return { stat: "meleePower", value: item.definition.includes("ember") ? 48 : 40 };
  }
  return { stat: "armor", value: itemPower(item.itemLevel) };
}

export function reinforcementQuote(
  item: ItemInstance,
  wallet: MaterialWallet,
): ReinforcementQuote {
  const from = item.reinforce;
  const currentBaseMultiplier = currentMultiplier(from);
  const base = baseStat(item);
  if (from >= 5) {
    return {
      allowed: false,
      reason: "max_level",
      from,
      to: from,
      currentBaseMultiplier,
      nextBaseMultiplier: currentBaseMultiplier,
      cost: emptyCost(),
      statDelta: {},
      baseStat: {
        stat: base.stat,
        current: base.value * currentBaseMultiplier,
        next: base.value * currentBaseMultiplier,
      },
    };
  }
  const target = BALANCE_DATA.reinforcement[from];
  const cost = emptyCost();
  cost["material.scrap"] = target.scrap;
  cost[essenceFor(item)] = target.essence;
  cost["material.seal"] = target.seal;
  const reason = wallet["material.scrap"] < target.scrap
    ? "missing_scrap"
    : wallet[essenceFor(item)] < target.essence
      ? "missing_essence"
      : wallet["material.seal"] < target.seal
        ? "missing_seal"
        : undefined;
  return {
    allowed: reason === undefined,
    reason,
    from,
    to: from + 1,
    currentBaseMultiplier,
    nextBaseMultiplier: target.baseMultiplier,
    cost,
    statDelta: {
      [base.stat]: Math.round(base.value * (target.baseMultiplier - currentBaseMultiplier) * 10_000)
        / 10_000,
    },
    baseStat: {
      stat: base.stat,
      current: Math.round(base.value * currentBaseMultiplier * 10_000) / 10_000,
      next: Math.round(base.value * target.baseMultiplier * 10_000) / 10_000,
    },
  };
}

export function reinforcedScrapRecovery(item: ItemInstance): number {
  const spent = BALANCE_DATA.reinforcement
    .slice(0, item.reinforce)
    .reduce((sum, entry) => sum + entry.scrap, 0);
  return Math.floor(spent * 0.4);
}
