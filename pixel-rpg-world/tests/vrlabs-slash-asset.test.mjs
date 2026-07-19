import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { inspectGlb } from "../scripts/compile-actor-visuals.mjs";

const root = new URL(
  "../public/game-assets/rig-lab/vrlabs-weapon-slash/",
  import.meta.url,
);

test("licensed VRLabs slash mesh is web ready", async () => {
  const mesh = await inspectGlb(new URL("circle.glb", root));
  assert.ok(mesh.nodes.includes("slash-circle"));
  assert.ok((await stat(new URL("circle-atlas.png", root))).size > 100_000);
  assert.match(await readFile(new URL("LICENSE.txt", root), "utf8"), /MIT License/);
  assert.match(await readFile(new URL("README.md", root), "utf8"), /822f0a8/);
});

test("slash shader uses native WGSL on WebGPU", async () => {
  const source = await readFile(new URL("../app/rig-lab/VrlabsSlash.ts", import.meta.url), "utf8");
  assert.match(source, /engine\.isWebGPU/);
  assert.match(source, /ShaderLanguage\.WGSL/);
  assert.match(source, /fragmentOutputs\.color/);
});
