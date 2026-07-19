import { describe, expect, it } from "vitest";
import {
  DEFAULT_PARTY_CAMERA,
  updatePartyCamera,
  type PartyCameraState,
} from "../../../game/adapters/babylon/PartyCameraController";

const empty: PartyCameraState = {
  targetX: 0,
  targetZ: 0,
  radius: 13,
  initialized: false,
};

describe("PartyCameraController", () => {
  it("frames the midpoint and expands zoom as two players separate", () => {
    const close = updatePartyCamera(empty, [
      { x: -1, z: 0, previousX: -1, previousZ: 0 },
      { x: 1, z: 0, previousX: 1, previousZ: 0 },
    ], 1 / 60, DEFAULT_PARTY_CAMERA);
    const far = updatePartyCamera({ ...close, initialized: false }, [
      { x: -6, z: -2, previousX: -6, previousZ: -2 },
      { x: 6, z: 2, previousX: 6, previousZ: 2 },
    ], 1 / 60, DEFAULT_PARTY_CAMERA);

    expect(close.targetX).toBe(0);
    expect(close.targetZ).toBe(0);
    expect(far.radius).toBeGreaterThan(close.radius);
    expect(far.radius).toBeLessThanOrEqual(DEFAULT_PARTY_CAMERA.maxRadius);
  });

  it("keeps tiny center changes inside the dead zone", () => {
    const initialized = { ...empty, initialized: true };
    const next = updatePartyCamera(initialized, [
      { x: 0.15, z: -0.1, previousX: 0.15, previousZ: -0.1 },
    ], 1 / 60, DEFAULT_PARTY_CAMERA);
    expect(next.targetX).toBe(0);
    expect(next.targetZ).toBe(0);
  });

  it("is nearly frame-rate independent over the same elapsed time", () => {
    const members = [{ x: 8, z: 4, previousX: 8, previousZ: 4 }];
    let sixty = { ...empty, initialized: true };
    for (let index = 0; index < 60; index += 1) {
      sixty = updatePartyCamera(sixty, members, 1 / 60, DEFAULT_PARTY_CAMERA);
    }
    let thirty = { ...empty, initialized: true };
    for (let index = 0; index < 30; index += 1) {
      thirty = updatePartyCamera(thirty, members, 1 / 30, DEFAULT_PARTY_CAMERA);
    }
    expect(thirty.targetX).toBeCloseTo(sixty.targetX, 4);
    expect(thirty.targetZ).toBeCloseTo(sixty.targetZ, 4);
    expect(thirty.radius).toBeCloseTo(sixty.radius, 4);
  });
});
