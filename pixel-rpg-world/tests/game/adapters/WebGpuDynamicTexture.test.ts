import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import { expect, it } from "vitest";
import "../../../game/adapters/babylon/art/PixelTextureFactory";

it("registers dynamic textures on the WebGPU engine", () => {
  expect(typeof WebGPUEngine.prototype.createDynamicTexture).toBe("function");
});
