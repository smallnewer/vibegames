import { describe, expect, it } from "vitest";
import { armorMitigation, critChance } from "../../../game/combat/CombatRatings";

describe("combat ratings", () => {
  it("uses the locked armor curve and cap at attacker level 10", () => {
    expect(armorMitigation(0, 10)).toBe(0);
    expect(armorMitigation(100, 10)).toBeCloseTo(100 / 370);
    expect(armorMitigation(1_000, 10)).toBe(0.65);
  });

  it("uses the locked critical curve", () => {
    expect(critChance(0, 10)).toBe(0.05);
    expect(critChance(200, 10)).toBe(0.25);
    expect(() => critChance(Number.NaN, 10)).toThrow(/finite/i);
    expect(() => armorMitigation(10, Number.POSITIVE_INFINITY)).toThrow(/finite/i);
  });
});
