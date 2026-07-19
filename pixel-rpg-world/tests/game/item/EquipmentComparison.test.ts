import { describe, expect, it } from "vitest";
import type { ItemSnapshot } from "../../../game/core/GameSnapshot";
import { GameSimulation } from "../../../game/core/GameSimulation";
import {
  compareEquipment,
  evaluateItemContribution,
} from "../../../game/item/EquipmentComparison";

function candidate(overrides: Partial<ItemSnapshot> = {}): ItemSnapshot {
  const original = new GameSimulation({ runSeed: 2 }).snapshot().progress.items[0];
  return {
    ...original,
    id: 99,
    definition: "item.base.longblade",
    name: "Longblade",
    slot: "melee",
    itemLevel: 30,
    baseRoll: 10_000,
    equipped: false,
    affixes: [],
    ...overrides,
  };
}

describe("EquipmentComparison", () => {
  it("compares an unequipped weapon to the currently equipped matching slot", () => {
    const progress = new GameSimulation({ runSeed: 2 }).snapshot().progress;
    const result = compareEquipment(progress, candidate());
    expect(result.slot).toBe("melee");
    expect(result.replacedItemId).toBe(progress.equipment.slots.melee);
    expect(result.deltas.find((delta) => delta.stat === "meleePower")?.value).toBeGreaterThan(0);
  });

  it("returns no change for the equipped item and uses the ranged slot for bows", () => {
    const progress = new GameSimulation({ runSeed: 2 }).snapshot().progress;
    const equipped = progress.items.find((item) => item.id === progress.equipment.slots.melee)!;
    expect(compareEquipment(progress, equipped).deltas).toEqual([]);

    const bow = candidate({ definition: "item.base.bow", slot: "ranged" });
    expect(compareEquipment(progress, bow)).toMatchObject({
      slot: "ranged",
      replacedItemId: progress.equipment.slots.ranged,
    });
  });

  it("omits capped resistance and never models current-health ratio changes", () => {
    const source = new GameSimulation({ runSeed: 2 }).snapshot().progress;
    const progress = {
      ...source,
      stats: { ...source.stats, fireResist: 0.75 },
      statBreakdown: {
        ...source.statBreakdown,
        fireResist: {
          ...source.statBreakdown.fireResist,
          base: 0.75,
          flat: 0,
          value: 0.75,
        },
      },
    };
    const helm = candidate({
      definition: "item.base.head",
      slot: "head",
      affixes: [{ definition: "affix.resist_fire", roll: 10_000 }],
    });
    const result = compareEquipment(progress, helm);
    expect(result.deltas.some((delta) => delta.stat === "fireResist")).toBe(false);
    expect(result.deltas.some((delta) => (delta.stat as string) === "health")).toBe(false);
  });

  it("reinforcement changes only base contribution while affixes stay unchanged", () => {
    const base = candidate({
      reinforce: 0,
      affixes: [{ definition: "affix.offense_crit", roll: 7_000 }],
    });
    const reinforced = { ...base, reinforce: 3 as const };
    const normalContribution = evaluateItemContribution(base);
    const reinforcedContribution = evaluateItemContribution(reinforced);
    expect(reinforcedContribution.flat.meleePower).toBeGreaterThan(
      normalContribution.flat.meleePower ?? 0,
    );
    expect(reinforcedContribution.flat.critRating).toBe(normalContribution.flat.critRating);
  });
});
