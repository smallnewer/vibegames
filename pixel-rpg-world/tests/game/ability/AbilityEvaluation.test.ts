import { describe, expect, it } from "vitest";
import {
  evaluateAbility,
  type EvaluatedAbility,
} from "../../../game/ability/AbilityEvaluation";
import {
  completeStatBlock,
  type AbilityDef,
} from "../../../game/content/Definitions";

const definition: AbilityDef = {
  id: "ability.fixture",
  name: "Fixture Nova",
  slot: "active",
  tags: ["area"],
  cooldown: 6,
  charges: 1,
  action: "skill",
  actionTime: 0.5,
  telegraphSeconds: 0.25,
  icon: "icon.skill.burst",
  visual: "vfx.fixture",
  effect: {
    type: "sequence",
    children: [
      { type: "query_circle", center: "source", radius: 2 },
      {
        type: "damage",
        value: {
          damageType: "fire",
          minBase: 10,
          maxBase: 20,
          scalingStat: "skillPower",
          coefficient: 1,
          canCrit: true,
          procCoefficient: 1,
        },
      },
    ],
  },
  rankBonuses: [
    { rank: 3, radiusAdd: 0.3 },
    { rank: 5, targetCountAdd: 2, charges: 2 },
  ],
};

const stats = completeStatBlock({ skillPower: 100, cooldownRecovery: 0.2 });

describe("evaluateAbility", () => {
  it("resolves combat and UI numbers from the same rank-safe definition", () => {
    const rank1 = evaluateAbility(definition, 1, stats);
    expect(rank1).toMatchObject({
      id: "ability.fixture",
      rank: 1,
      cooldown: 5,
      charges: 1,
      damage: { min: 110, max: 120, type: "fire" },
      radius: 2,
      damageMultiplier: 1,
    } satisfies Partial<EvaluatedAbility>);

    const rank3 = evaluateAbility(definition, 3, stats);
    expect(rank3.damage).toEqual({ min: 138, max: 150, type: "fire" });
    expect(rank3.radius).toBeCloseTo(2.3);
    expect(rank3.damageMultiplier).toBe(1.25);

    const rank5 = evaluateAbility(definition, 5, stats);
    expect(rank5.charges).toBe(2);
    expect(rank5.maxTargets).toBe(2);
  });

  it.each([0, 1.5, 6])("rejects invalid rank %s", (rank) => {
    expect(() => evaluateAbility(definition, rank as 1, stats)).toThrow(/rank.*1.*5/i);
  });
});
