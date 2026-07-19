import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// 选片页必须使用原生动作库，禁止先重定向再让用户判断动作质量。
test("animation lab browses native combat libraries", async () => {
  const lab = await readFile(
    new URL("../app/animation-lab/AnimationLab.tsx", import.meta.url),
    "utf8",
  );
  assert.match(lab, /ACTION_LIBRARIES/);
  assert.match(lab, /大幅近战/);
  assert.match(lab, /弓箭/);
  assert.match(lab, /枪械/);
  assert.match(lab, /远程施法/);
  assert.match(lab, /0\.5x/);
  assert.match(lab, /全部 75 个原生动作/);
  assert.doesNotMatch(lab, /createHumanoidSkin/);
});
