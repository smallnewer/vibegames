import { describe, expect, it } from "vitest";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import { combatFeedback } from "../../../game/host/CombatFeedback";

const damage = (
  overrides: Partial<Extract<GameplayEvent, { type: "damage_applied" }>> = {},
): Extract<GameplayEvent, { type: "damage_applied" }> => ({
  type: "damage_applied",
  source: 1,
  target: 2,
  amount: 10,
  damageType: "physical",
  critical: false,
  skillId: "ability.test",
  ...overrides,
});

describe("combatFeedback", () => {
  it("grades normal, critical, and killing hero hits", () => {
    expect(combatFeedback([damage()], [1])).toEqual({
      hitStopSeconds: 0.025,
      cameraImpulse: 0.035,
    });
    expect(combatFeedback([damage({ critical: true })], [1])).toEqual({
      hitStopSeconds: 0.04,
      cameraImpulse: 0.07,
    });
    expect(combatFeedback([damage(), { type: "actor_died", actor: 2 }], [1])).toEqual({
      hitStopSeconds: 0.055,
      cameraImpulse: 0.1,
    });
  });

  it("adds camera-only feedback when a hero takes damage", () => {
    expect(combatFeedback([damage({ source: 2, target: 1 })], [1])).toEqual({
      hitStopSeconds: 0,
      cameraImpulse: 0.055,
    });
  });

  it("takes per-frame maxima instead of accumulating area hits", () => {
    expect(combatFeedback([
      damage(),
      damage({ target: 3 }),
      damage({ target: 4, critical: true }),
    ], [1])).toEqual({ hitStopSeconds: 0.04, cameraImpulse: 0.07 });
  });
});
