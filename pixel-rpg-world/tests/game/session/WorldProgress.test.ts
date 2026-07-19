import { describe, expect, it } from "vitest";
import {
  WORLD_ROUTE,
  applyDungeonClear,
  canEnterWorldNode,
  createDefaultWorldProgress,
  worldRouteNodes,
} from "../../../game/session/WorldProgress";
import { GameSessionController } from "../../../game/host/GameSessionController";

describe("WorldProgress", () => {
  it("starts with only ember prison unlocked and exposes five fixed route nodes", () => {
    const progress = createDefaultWorldProgress();
    expect(progress.unlockedDungeons).toEqual(["dungeon.production_foundation"]);
    expect(worldRouteNodes(progress)).toHaveLength(5);
    expect(worldRouteNodes(progress).filter((node) => node.unlocked).map((node) => node.id))
      .toEqual([WORLD_ROUTE[0]]);
  });

  it("unlocks each next node on first normal clear and Echo after all five", () => {
    let progress = createDefaultWorldProgress();
    for (let index = 0; index < WORLD_ROUTE.length; index += 1) {
      progress = applyDungeonClear(progress, WORLD_ROUTE[index], "normal");
      expect(progress.clearedNormal).toContain(WORLD_ROUTE[index]);
      if (WORLD_ROUTE[index + 1]) expect(progress.unlockedDungeons).toContain(WORLD_ROUTE[index + 1]);
    }
    expect(progress.echoUnlocked).toBe(true);
  });

  it("keeps repeat clears idempotent and debug access unable to mutate saved unlocks", () => {
    const start = createDefaultWorldProgress();
    const once = applyDungeonClear(start, WORLD_ROUTE[0], "normal");
    const twice = applyDungeonClear(once, WORLD_ROUTE[0], "normal");
    expect(twice).toEqual(once);
    expect(canEnterWorldNode(start, WORLD_ROUTE[4], { debugOverride: true })).toBe(true);
    expect(start).toEqual(createDefaultWorldProgress());

    const session = new GameSessionController();
    session.load(start);
    session.enterDungeon(WORLD_ROUTE[4], "normal", { debugOverride: true });
    expect(session.completeDungeon(WORLD_ROUTE[4], "normal").progress).toEqual(start);
  });
});
