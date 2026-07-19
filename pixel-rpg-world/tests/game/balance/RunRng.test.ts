import { describe, expect, it } from "vitest";
import { RunRng } from "../../../game/balance/RunRng";

describe("RunRng", () => {
  it("locks the xorshift32 sequence", () => {
    const rng = RunRng.fromSeed(0x12345678);
    expect(Array.from({ length: 5 }, () => rng.uint32())).toEqual([
      2274908837, 358294691, 1210119364, 2176035992, 1882851208,
    ]);
  });

  it("forks by root seed and label independently of parent call order", () => {
    const first = RunRng.fromSeed(99);
    const damageA = first.fork("damage:4:7:12").uint32();
    first.uint32();
    first.uint32();
    const lootA = first.fork("loot:boss.ember_colossus:3").uint32();
    const second = RunRng.fromSeed(99);
    const lootB = second.fork("loot:boss.ember_colossus:3").uint32();
    const damageB = second.fork("damage:4:7:12").uint32();
    expect({ damageA, lootA }).toEqual({ damageA: damageB, lootA: lootB });
  });

  it("uses inclusive integer bounds and clamps chance", () => {
    const rng = RunRng.fromSeed(7);
    const values = Array.from({ length: 200 }, () => rng.intInclusive(2, 4));
    expect(new Set(values)).toEqual(new Set([2, 3, 4]));
    expect(rng.chance(-1)).toBe(false);
    expect(rng.chance(2)).toBe(true);
  });

  it("rejects invalid weighted tables", () => {
    const rng = RunRng.fromSeed(1);
    expect(() => rng.weighted([])).toThrow(/empty/i);
    expect(() => rng.weighted([{ value: "x", weight: 0 }])).toThrow(/positive/i);
    expect(() => rng.weighted([{ value: "x", weight: -1 }])).toThrow(/weight/i);
    expect(() => rng.weighted([{ value: "x", weight: Number.NaN }])).toThrow(/weight/i);
  });
});
