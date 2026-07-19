import { expect, it } from "vitest";
import { samplePose } from "../../../game/adapters/babylon/art/CharacterAnimator";

it("keeps melee, roll, and death silhouettes distinct", () => {
  expect(samplePose("melee", 0.15).rightArmPitch).toBeLessThan(-1);
  expect(samplePose("roll", 0.5).squash).toBeLessThan(1);
  expect(samplePose("dead", 1).bodyPitch).toBeGreaterThan(1);
});

it("interpolates action phases without invalid values", () => {
  for (const action of ["idle", "run", "roll", "melee", "ranged", "skill", "hit", "dead"] as const) {
    for (const phase of [0, 0.25, 0.5, 0.75, 1]) {
      expect(Object.values(samplePose(action, phase)).every(Number.isFinite)).toBe(true);
    }
  }
});
