import { PERFORMANCE_BUDGETS } from "./PerformanceBudgets";

export interface PerformanceSample {
  frameIntervalMs: number;
  workloadMs: number;
  logicMs: number;
  visualSyncMs: number;
  sceneRenderMs: number;
  renderMs: number;
  diagnosticsMs: number;
  gpuMs?: number;
  gpuMainPassMs?: number;
  heapBytes?: number;
}

export interface PerformanceSummary {
  samples: number;
  frameP95: number;
  frameP99: number;
  workloadP95: number;
  workloadP99: number;
  logicMs: number;
  logicP95: number;
  visualSyncMs: number;
  visualSyncP95: number;
  sceneRenderMs: number;
  sceneRenderP95: number;
  renderMs: number;
  renderP95: number;
  diagnosticsMs: number;
  gpuMs?: number;
  gpuP95?: number;
  gpuMainPassMs?: number;
  gpuMainPassP95?: number;
  overBudgetRate: number;
  heapGrowthBytes?: number;
}

function average(values: readonly number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((total, value) => total + value, 0) / values.length;
}

function percentile(values: readonly number[], ratio: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * ratio) - 1);
  return sorted[index];
}

export class PerformanceMonitor {
  private readonly values: PerformanceSample[] = [];
  private writeIndex = 0;
  private elapsedMs = 0;
  private heapBaseline?: number;
  private currentHeap?: number;

  constructor(
    private readonly limit = PERFORMANCE_BUDGETS.sampleWindow,
    private readonly heapWarmupMs = 30_000,
  ) {}

  // 固定容量环形窗口避免运行到上限后每帧 Array.shift 搬移数据。
  add(sample: PerformanceSample): void {
    this.elapsedMs += sample.frameIntervalMs;
    if (sample.heapBytes !== undefined) {
      if (this.heapBaseline === undefined && this.elapsedMs >= this.heapWarmupMs) {
        this.heapBaseline = sample.heapBytes;
      }
      this.currentHeap = sample.heapBytes;
    }
    if (this.values.length < this.limit) {
      this.values.push(sample);
      return;
    }
    this.values[this.writeIndex] = sample;
    this.writeIndex = (this.writeIndex + 1) % this.limit;
  }

  summary(): PerformanceSummary {
    if (this.values.length === 0) {
      return {
        samples: 0,
        frameP95: 0,
        frameP99: 0,
        workloadP95: 0,
        workloadP99: 0,
        logicMs: 0,
        logicP95: 0,
        visualSyncMs: 0,
        visualSyncP95: 0,
        sceneRenderMs: 0,
        sceneRenderP95: 0,
        renderMs: 0,
        renderP95: 0,
        diagnosticsMs: 0,
        overBudgetRate: 0,
      };
    }
    const frameIntervals = this.values.map((sample) => sample.frameIntervalMs);
    const workloads = this.values.map((sample) => sample.workloadMs);
    const logic = this.values.map((sample) => sample.logicMs);
    const visualSync = this.values.map((sample) => sample.visualSyncMs);
    const sceneRender = this.values.map((sample) => sample.sceneRenderMs);
    const render = this.values.map((sample) => sample.renderMs);
    const diagnostics = this.values.map((sample) => sample.diagnosticsMs);
    const gpu = this.values.flatMap((sample) => (
      sample.gpuMs === undefined ? [] : [sample.gpuMs]
    ));
    const gpuMainPass = this.values.flatMap((sample) => (
      sample.gpuMainPassMs === undefined ? [] : [sample.gpuMainPassMs]
    ));
    return {
      samples: this.values.length,
      frameP95: percentile(frameIntervals, 0.95),
      frameP99: percentile(frameIntervals, 0.99),
      workloadP95: percentile(workloads, 0.95),
      workloadP99: percentile(workloads, 0.99),
      logicMs: average(logic),
      logicP95: percentile(logic, 0.95),
      visualSyncMs: average(visualSync),
      visualSyncP95: percentile(visualSync, 0.95),
      sceneRenderMs: average(sceneRender),
      sceneRenderP95: percentile(sceneRender, 0.95),
      renderMs: average(render),
      renderP95: percentile(render, 0.95),
      diagnosticsMs: average(diagnostics),
      gpuMs: gpu.length > 0 ? average(gpu) : undefined,
      gpuP95: gpu.length > 0 ? percentile(gpu, 0.95) : undefined,
      gpuMainPassMs: gpuMainPass.length > 0 ? average(gpuMainPass) : undefined,
      gpuMainPassP95: gpuMainPass.length > 0
        ? percentile(gpuMainPass, 0.95)
        : undefined,
      overBudgetRate: workloads.filter((value) => (
        value > PERFORMANCE_BUDGETS.frameBudgetMs
      )).length / workloads.length,
      heapGrowthBytes: this.heapBaseline !== undefined && this.currentHeap !== undefined
        ? this.currentHeap - this.heapBaseline
        : undefined,
    };
  }
}
