import { describe, expect, it } from "vitest";
import { evaluateAffixRoll, evaluateItemBase, itemPower, roundEvaluatedStat } from "../../../game/item/ItemEvaluation";
import { fixedItemInstance } from "../../../game/item/ItemComponents";

describe("item evaluation", () => {
  it("uses the locked item power curve", () => {
    expect(itemPower(1)).toBe(10);
    expect(itemPower(30)).toBe(Math.round(10 * 1.085 ** 29));
    expect(itemPower(0)).toBe(itemPower(1));
    expect(itemPower(99)).toBe(itemPower(30));
  });

  it("evaluates normalized endpoints and stat-specific rounding", () => {
    const tier = { minFactor: 0.1, maxFactor: 0.2 };
    expect(evaluateAffixRoll(tier, 0, 10)).toBeCloseTo(itemPower(10) * 0.1);
    expect(evaluateAffixRoll(tier, 10_000, 10)).toBeCloseTo(itemPower(10) * 0.2);
    expect(roundEvaluatedStat("armor", 12.6)).toBe(13);
    expect(roundEvaluatedStat("fireResist", 0.123456)).toBe(0.1235);
  });

  it("grows percentage affixes on a bounded linear curve", () => {
    const tier = { minFactor: 0.003, maxFactor: 0.006 };
    expect(evaluateAffixRoll(tier, 10_000, 1, "attackSpeed")).toBeCloseTo(0.06);
    expect(evaluateAffixRoll(tier, 10_000, 30, "attackSpeed")).toBeCloseTo(0.1644);
  });

  it("keeps a generated base roll stable across evaluation", () => {
    const item = fixedItemInstance(1, "item.base.sword");
    item.itemLevel = 10;
    item.baseRoll = 10_000;
    expect(evaluateItemBase(item)).toEqual({
      stat: "meleePower",
      value: Math.round(itemPower(10) * 1.1),
    });
  });
});
