import { expect, it } from "vitest";
import { PERFORMANCE_BUDGETS } from "../../../game/host/PerformanceBudgets";
import { ACTOR_VISUAL_DATA } from "../../../game/content/generated/actorVisuals";

it("locks the 4P/30E performance and diagnostics budgets", () => {
  expect(PERFORMANCE_BUDGETS).toMatchObject({
    targetFps: 60,
    workloadP95Ms: 12,
    workloadP99Ms: 16,
    logicP95Ms: 3,
    renderP95Ms: 6,
    gpuP95Ms: 8,
    stressPlayers: 4,
    stressEnemies: 30,
    stressProjectiles: 64,
    stressVfx: 48,
    maxStressDrawCalls: 120,
    maxRenderPixels: 960 * 540,
    diagnosticsHz: 4,
  });
});

it("caps full skeleton animation slots so mob counts degrade to the batched voxel path", () => {
  const byId = new Map(ACTOR_VISUAL_DATA.map((visual) => [visual.id, visual]));
  expect(byId.get("visual.actor.ember_minion")?.lod.maxAnimatedInstances).toBeLessThanOrEqual(4);
  expect(byId.get("visual.actor.ember_sentinel")?.lod.maxAnimatedInstances).toBeLessThanOrEqual(4);
  expect(byId.get("visual.actor.ember_boss")?.lod.maxAnimatedInstances).toBe(1);
  expect(byId.get("visual.actor.fox")?.lod.maxAnimatedInstances).toBeLessThanOrEqual(4);
});
