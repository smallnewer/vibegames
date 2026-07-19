import { describe, expect, it } from "vitest";
import { selectChainTargets } from "../../../game/ability/ChainTargeting";
import type { TransformComponent } from "../../../game/actor/ActorComponents";
import { World } from "../../../game/core/World";

function point(world: World, x: number, z = 0): number {
  const entity = world.createEntity();
  world.setComponent<TransformComponent>("transform", entity, {
    x,
    z,
    previousX: x,
    previousZ: z,
    facingX: 1,
    facingZ: 0,
  });
  return entity;
}

describe("selectChainTargets", () => {
  it("walks nearest from the previous hit, breaks ties by entity ID, and never repeats", () => {
    const world = new World();
    const source = point(world, 0);
    const first = point(world, 1);
    const lowerTieId = point(world, 2, 1);
    const higherTieId = point(world, 2, -1);
    const far = point(world, 4, -1);

    expect(selectChainTargets(
      world,
      source,
      [higherTieId, far, first, lowerTieId, first, source],
      2.1,
      4,
    )).toEqual([first, lowerTieId, higherTieId, far]);
  });

  it("stops when the next hop is outside range", () => {
    const world = new World();
    const source = point(world, 0);
    const near = point(world, 1);
    const disconnected = point(world, 4);
    expect(selectChainTargets(world, source, [disconnected, near], 1.5, 6)).toEqual([near]);
  });
});
