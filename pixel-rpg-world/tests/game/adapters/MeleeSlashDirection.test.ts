import { describe, expect, it } from "vitest";
import { meleeSlashDirection } from "../../../game/adapters/babylon/art/MeleeSlashDirection";

describe("meleeSlashDirection", () => {
  it("follows the animated weapon anchor instead of the actor root facing", () => {
    expect(meleeSlashDirection(
      { x: 4, z: 2 },
      { x: 3, z: 2 },
      { x: 1, z: 0 },
    )).toEqual({ x: -1, z: 0 });
  });

  it("falls back to the actor facing when the anchor has no horizontal offset", () => {
    expect(meleeSlashDirection(
      { x: 4, z: 2 },
      { x: 4, z: 2 },
      { x: 0, z: -1 },
    )).toEqual({ x: 0, z: -1 });
  });
});
