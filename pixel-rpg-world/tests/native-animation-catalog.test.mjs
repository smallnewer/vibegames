import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ACTION_LIBRARIES } from "../app/animation-lab/actionCatalog.ts";

// 读取 GLB 的 JSON 块，确保页面清单与真实动作一一对应。
async function readAnimationNames(url) {
  const file = new URL(`../public${url}`, import.meta.url);
  const bytes = await readFile(file);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, `${url} is not GLB`);
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(
    bytes.subarray(20, 20 + jsonLength).toString("utf8").replace(/\0+$/u, ""),
  );
  return json.animations.map((animation) => animation.name);
}

test("catalog exposes every native clip and requested combat categories", async () => {
  assert.equal(ACTION_LIBRARIES.length, 2);
  assert.equal(ACTION_LIBRARIES.flatMap((library) => library.actions).length, 75);

  for (const library of ACTION_LIBRARIES) {
    assert.deepEqual(
      library.actions.map((action) => action.name),
      await readAnimationNames(library.url),
      `${library.id} catalog differs from GLB`,
    );
  }

  const actions = ACTION_LIBRARIES.flatMap((library) => library.actions);
  const count = (category) => actions.filter((action) => action.category === category).length;
  assert.ok(count("melee") >= 8);
  assert.ok(count("bow") >= 1);
  assert.ok(count("gun") >= 10);
  assert.ok(count("magic") >= 4);
  for (const category of ["melee", "bow", "gun", "magic"]) {
    assert.ok(actions.some((action) => action.category === category && action.featured));
  }
});
