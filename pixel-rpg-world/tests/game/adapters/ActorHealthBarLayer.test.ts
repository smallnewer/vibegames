import { describe, expect, it } from "vitest";
import {
  DAMAGED_BAR_TICKS,
  healthBarPresentation,
  selectHealthBarActors,
  type HealthBarActor,
} from "../../../game/adapters/babylon/ActorHealthBarLayer";

function actor(overrides: Partial<HealthBarActor> = {}): HealthBarActor {
  return {
    id: 1,
    archetype: "enemy.ember_stalker",
    action: "idle",
    health: 70,
    maxHealth: 100,
    healthBar: "minion",
    engaged: false,
    x: 0,
    z: 0,
    ...overrides,
  };
}

describe("enemy health-bar visibility", () => {
  it("shows every living onscreen minion even before engagement", () => {
    expect(healthBarPresentation(actor(), 500)).toEqual({
      actor: 1,
      style: "minion",
      ratio: 0.7,
    });
    expect(healthBarPresentation(actor({ healthBar: "none", engaged: true }), 500)).toBeUndefined();
    expect(healthBarPresentation(actor({ engaged: true }), 500)).toEqual({
      actor: 1,
      style: "minion",
      ratio: 0.7,
    });
    expect(healthBarPresentation(actor({ lastDamagedTick: 500 }), 500 + DAMAGED_BAR_TICKS))
      .toBeDefined();
    expect(healthBarPresentation(actor({ lastDamagedTick: 500 }), 501 + DAMAGED_BAR_TICKS))
      .toBeDefined();
  });

  it("keeps living elites visible and rejects dead or offscreen actors", () => {
    expect(healthBarPresentation(actor({ healthBar: "elite" }), 10)?.style).toBe("elite");
    expect(healthBarPresentation(actor({ healthBar: "elite", action: "dead" }), 10))
      .toBeUndefined();
    expect(healthBarPresentation(actor({ healthBar: "elite" }), 10, false)).toBeUndefined();
  });

  it("caps the pool at 30 and gives elite, engaged, then damaged actors priority", () => {
    const actors = Array.from({ length: 40 }, (_, index) => actor({
      id: index + 1,
      healthBar: index === 39 ? "elite" : "minion",
      engaged: index < 4,
      lastDamagedTick: index >= 4 ? index : undefined,
    }));
    const selected = selectHealthBarActors(actors, 40, () => true, 30);
    expect(selected).toHaveLength(30);
    expect(selected[0]).toMatchObject({ actor: 40, style: "elite" });
    expect(selected.slice(1, 5).map((value) => value.actor)).toEqual([1, 2, 3, 4]);
  });

  it("recomputes ratio and style for every selected actor so reused slots cannot leak state", () => {
    expect(healthBarPresentation(actor({ id: 7, health: 20, healthBar: "elite" }), 0))
      .toEqual({ actor: 7, style: "elite", ratio: 0.2 });
    expect(healthBarPresentation(actor({ id: 8, health: 90, engaged: true }), 0))
      .toEqual({ actor: 8, style: "minion", ratio: 0.9 });
  });
});
