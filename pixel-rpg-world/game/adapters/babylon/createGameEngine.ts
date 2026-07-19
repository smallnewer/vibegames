import { Engine } from "@babylonjs/core/Engines/engine";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";

export type GameEngine = Engine | WebGPUEngine;
export type EnginePreference = "auto" | "webgl2";

export interface EngineResult {
  engine: GameEngine;
  backend: "webgpu" | "webgl2";
}

// 优先使用 WebGPU，不支持或初始化失败时退回 WebGL2。
export async function createGameEngine(
  canvas: HTMLCanvasElement,
  preference: EnginePreference = "auto",
  diagnosticsEnabled = false,
): Promise<EngineResult> {
  if (preference === "auto" && (await WebGPUEngine.IsSupportedAsync)) {
    const engine = new WebGPUEngine(canvas, {
      antialias: true,
      adaptToDeviceRatio: false,
      enableAllFeatures: true,
      powerPreference: "high-performance",
    });
    try {
      await engine.initAsync();
      engine.enableGPUTimingMeasurements = diagnosticsEnabled;
      return { engine, backend: "webgpu" };
    } catch {
      // 驱动初始化失败也必须退回 WebGL2，不能让游戏停在黑屏。
      engine.dispose();
    }
  }

  const engine = new Engine(
    canvas,
    true,
    {
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
      stencil: true,
    },
    false,
  );
  return { engine, backend: "webgl2" };
}
