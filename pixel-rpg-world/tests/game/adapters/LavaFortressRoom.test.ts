import { expect, it } from "vitest";
import {
  LAVA_ROOM_METRICS,
  LAVA_ROOM_MODULES,
} from "../../../game/adapters/babylon/art/LavaFortressRoom";

it("locks a dense three-layer authored lava room", () => {
  expect(LAVA_ROOM_METRICS).toMatchObject({
    moduleKinds: 8,
    lavaAreaCount: 2,
    depthLayers: 3,
  });
  expect(LAVA_ROOM_METRICS.dressingCount).toBeGreaterThanOrEqual(20);
  expect(new Set(LAVA_ROOM_MODULES)).toEqual(new Set([
    "floor",
    "stair",
    "bridge",
    "wall",
    "arch",
    "pillar",
    "parapet",
    "door_frame",
  ]));
});
