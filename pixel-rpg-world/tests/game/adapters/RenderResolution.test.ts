import { expect, it } from "vitest";
import {
  MAX_RENDER_PIXELS,
  renderHardwareScaling,
} from "../../../game/adapters/babylon/RenderResolution";

it("keeps small viewports native and caps large combat viewports near 960x540", () => {
  expect(MAX_RENDER_PIXELS).toBe(960 * 540);
  expect(renderHardwareScaling(455, 626)).toBe(1);
  expect(renderHardwareScaling(1280, 720)).toBeCloseTo(4 / 3);
  expect(renderHardwareScaling(1920, 1080)).toBeCloseTo(2);
});

