import { describe, expect, it } from "vitest";
import { World } from "../../../game/core/World";

describe("World", () => {
  it("creates stable entity IDs and removes their components", () => {
    const world = new World();
    const actor = world.createEntity();

    world.setComponent("health", actor, { current: 10, max: 10 });
    expect(world.getComponent<{ current: number }>("health", actor)?.current).toBe(10);

    world.destroyEntity(actor);
    expect(world.hasEntity(actor)).toBe(false);
    expect(world.getComponent("health", actor)).toBeUndefined();
  });

  it("queries only live entities containing every requested component", () => {
    const world = new World();
    const hero = world.createEntity();
    const prop = world.createEntity();

    world.setComponent("transform", hero, { x: 0, z: 0 });
    world.setComponent("health", hero, { current: 100, max: 100 });
    world.setComponent("transform", prop, { x: 2, z: 2 });

    expect(world.entitiesWith("transform", "health")).toEqual([hero]);
  });
});
