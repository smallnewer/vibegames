import { expect, it } from "vitest";
import { PerformanceMonitor } from "../../../game/host/PerformanceMonitor";

it("calculates bounded P95 and CPU/GPU averages", () => {
  const monitor = new PerformanceMonitor(4, 0);
  for (let index = 1; index <= 5; index += 1) {
    monitor.add({
      frameIntervalMs: index * 10,
      workloadMs: index * 4,
      logicMs: index,
      visualSyncMs: index * 0.75,
      sceneRenderMs: index * 1.25,
      renderMs: index * 2,
      diagnosticsMs: index / 10,
      gpuMs: index === 5 ? 5 : undefined,
      gpuMainPassMs: index >= 4 ? index / 2 : undefined,
    });
  }

  expect(monitor.summary()).toEqual({
    samples: 4,
    frameP95: 50,
    frameP99: 50,
    workloadP95: 20,
    workloadP99: 20,
    logicMs: 3.5,
    logicP95: 5,
    visualSyncMs: 2.625,
    visualSyncP95: 3.75,
    sceneRenderMs: 4.375,
    sceneRenderP95: 6.25,
    renderMs: 7,
    renderP95: 10,
    diagnosticsMs: 0.35,
    gpuMs: 5,
    gpuP95: 5,
    gpuMainPassMs: 2.25,
    gpuMainPassP95: 2.5,
    overBudgetRate: 0.25,
    heapGrowthBytes: undefined,
  });
});

it("starts heap growth after warm-up and handles unavailable metrics", () => {
  const monitor = new PerformanceMonitor(10, 30);
  monitor.add({
    frameIntervalMs: 20,
    workloadMs: 4,
    logicMs: 1,
    visualSyncMs: 0.75,
    sceneRenderMs: 1.25,
    renderMs: 2,
    diagnosticsMs: 1,
    heapBytes: 100,
  });
  monitor.add({
    frameIntervalMs: 20,
    workloadMs: 4,
    logicMs: 1,
    visualSyncMs: 0.75,
    sceneRenderMs: 1.25,
    renderMs: 2,
    diagnosticsMs: 1,
    heapBytes: 110,
  });
  monitor.add({
    frameIntervalMs: 20,
    workloadMs: 4,
    logicMs: 1,
    visualSyncMs: 0.75,
    sceneRenderMs: 1.25,
    renderMs: 2,
    diagnosticsMs: 1,
    heapBytes: 130,
  });
  expect(monitor.summary()).toMatchObject({
    heapGrowthBytes: 20,
    gpuMs: undefined,
    gpuMainPassMs: undefined,
  });

  const unavailable = new PerformanceMonitor();
  unavailable.add({
    frameIntervalMs: 16,
    workloadMs: 3,
    logicMs: 1,
    visualSyncMs: 0.75,
    sceneRenderMs: 1.25,
    renderMs: 2,
    diagnosticsMs: 0,
  });
  expect(unavailable.summary()).toMatchObject({
    heapGrowthBytes: undefined,
    gpuMs: undefined,
    gpuMainPassMs: undefined,
  });
});
