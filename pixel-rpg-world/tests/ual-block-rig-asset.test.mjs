import assert from "node:assert/strict";
import test from "node:test";
import { inspectGlb } from "../scripts/compile-actor-visuals.mjs";

test("block rig keeps native U41 and required body/socket nodes", async () => {
  const asset = await inspectGlb(new URL(
    "../public/game-assets/rig-lab/ual-block-rig.glb",
    import.meta.url,
  ));
  assert.ok(asset.animations.includes("Sword_Attack"));
  for (const node of ["block-head", "block-torso", "socket.weapon.right", "block-sword"]) {
    assert.ok(asset.nodes.includes(node));
  }
  assert.ok(!asset.nodes.includes("block-hips"));
});
