import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it } from "vitest";
import {
  CombatTelegraphLayer,
  TELEGRAPH_POOL_LIMITS,
  telegraphGeometry,
} from "../../../game/adapters/babylon/art/CombatTelegraphLayer";
import type { GameplayEvent } from "../../../game/core/GameplayEvent";
import type { GameSnapshot } from "../../../game/core/GameSnapshot";

type Telegraph = Extract<GameplayEvent, { type: "ability_telegraph_started" }>;

function event(overrides: Partial<Telegraph> = {}): Telegraph {
  return {
    type: "ability_telegraph_started",
    source: 1,
    ability: "ability.test",
    targetX: 0,
    targetZ: 4,
    duration: 1,
    shape: "circle",
    damageType: "fire",
    radius: 2,
    ...overrides,
  };
}

function snapshot(count = 1): GameSnapshot {
  return {
    actors: Array.from({ length: count }, (_, index) => ({
      id: index + 1,
      x: 0,
      z: 0,
    })),
  } as unknown as GameSnapshot;
}

describe("CombatTelegraphLayer", () => {
  it("computes circle, line, and cone transforms with clamped opacity", () => {
    expect(telegraphGeometry(event(), 0, 0, -1)).toEqual({
      x: 0,
      z: 4,
      rotationY: 0,
      width: 4,
      depth: 4,
      opacity: 0,
    });
    expect(telegraphGeometry(event({
      shape: "line",
      radius: undefined,
      length: 8,
      width: 0.6,
      targetZ: 10,
    }), 0, 0, 2)).toEqual({
      x: 0,
      z: 4,
      rotationY: 0,
      width: 0.6,
      depth: 8,
      opacity: 1,
    });
    const cone = telegraphGeometry(event({
      shape: "cone",
      radius: undefined,
      length: 6,
      angle: 90,
      targetX: 10,
      targetZ: 0,
    }), 0, 0, 0.5);
    expect(cone).toMatchObject({
      x: 3,
      z: 0,
      rotationY: Math.PI / 2,
      depth: 6,
      opacity: 0.5,
    });
    expect(cone.width).toBeCloseTo(12);
  });

  it("reuses damage materials and returns meshes on cancel, impact, and death", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const layer = new CombatTelegraphLayer(scene);

    layer.sync(snapshot(), [event()]);
    layer.update(0.5);
    expect(layer.activeCount).toBe(1);
    expect(layer.materialCount).toBe(1);
    layer.sync(snapshot(), [{
      type: "ability_telegraph_cancelled",
      source: 1,
      ability: "ability.test",
    }]);
    expect(layer.activeCount).toBe(0);
    expect(layer.pooledCount("circle")).toBe(1);

    layer.sync(snapshot(), [event({ ability: "ability.second" })]);
    expect(layer.pooledCount("circle")).toBe(0);
    expect(layer.materialCount).toBe(1);
    layer.sync(snapshot(), [{
      type: "ability_impact",
      actor: 1,
      ability: "ability.second",
      visual: "vfx.test",
      aimX: 0,
      aimZ: 4,
    }]);
    expect(layer.pooledCount("circle")).toBe(1);

    layer.sync(snapshot(), [event({ ability: "ability.third" })]);
    layer.sync(snapshot(), [{ type: "actor_died", actor: 1 }]);
    expect(layer.activeCount).toBe(0);

    layer.dispose();
    scene.dispose();
    engine.dispose();
  });

  it("enforces bounded pools under a telegraph burst", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const layer = new CombatTelegraphLayer(scene);
    const events = Array.from({ length: 20 }, (_, index) => event({
      source: index + 1,
      ability: `ability.test_${index}`,
    }));

    layer.sync(snapshot(20), events);
    expect(layer.activeCount).toBe(TELEGRAPH_POOL_LIMITS.circle);

    layer.dispose();
    scene.dispose();
    engine.dispose();
  });
});
