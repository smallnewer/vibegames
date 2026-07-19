import { describe, expect, it } from "vitest";
import { RunRng } from "../../../game/balance/RunRng";
import { itemAffix } from "../../../game/item/ItemCatalog";
import { rollItem } from "../../../game/item/ItemRoller";

describe("rollItem", () => {
  it("is byte-stable for a fixed seed", () => {
    const first = rollItem("item.base.sword", 12, "rare", 44, RunRng.fromSeed(123));
    const second = rollItem("item.base.sword", 12, "rare", 44, RunRng.fromSeed(123));
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.affixes.length).toBeGreaterThanOrEqual(3);
    expect(first.affixes.length).toBeLessThanOrEqual(4);
    expect(new Set(first.affixes.map((entry) => itemAffix(entry.definition).group)).size)
      .toBe(first.affixes.length);
    expect(first.affixes.some((entry) => itemAffix(entry.definition).core)).toBe(true);
  });

  it("respects rarity counts and magic prefix/suffix exclusion", () => {
    expect(rollItem("item.base.chest", 5, "normal", 1, RunRng.fromSeed(1)).affixes).toEqual([]);
    const magic = rollItem("item.base.chest", 5, "magic", 2, RunRng.fromSeed(8));
    expect(magic.affixes.length).toBeGreaterThanOrEqual(1);
    expect(magic.affixes.length).toBeLessThanOrEqual(2);
    expect(new Set(magic.affixes.map((entry) => itemAffix(entry.definition).kind)).size)
      .toBe(magic.affixes.length);
    expect(rollItem(
      "item.unique.hearns_oathblade", 20, "unique", 3, RunRng.fromSeed(1),
    ).affixes).toHaveLength(4);
  });
});
