import { Scene } from "@babylonjs/core/scene";
import { expect, it } from "vitest";
import "../../../game/adapters/babylon/art/ArtPostProcess";

it("registers the render pipeline manager on Babylon scenes", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    Scene.prototype,
    "postProcessRenderPipelineManager",
  );
  expect(typeof descriptor?.get).toBe("function");
});
