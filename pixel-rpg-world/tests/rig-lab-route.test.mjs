import assert from "node:assert/strict";
import test from "node:test";

async function renderRigLab() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/rig-lab", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the U41 block-rig comparison lab", async () => {
  const response = await renderRigLab();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /UAL 原模型/);
  assert.match(html, /方块绑定模型/);
  assert.match(html, /当前肩→手修正/);
  assert.match(html, /原模型 hand_r 挂剑/);
  assert.match(html, /Sword_Attack ·/);
  assert.match(html, /固定握持 90°/);
  assert.match(html, /VRLabs MIT/);
  assert.match(html, /FBX Mesh \+ Babylon Shader/);
  assert.doesNotMatch(html, /预制半月斩/);
  assert.doesNotMatch(html, /真实剑尖轨迹刀光/);
  assert.doesNotMatch(html, />70<!-- -->°</);
  assert.doesNotMatch(html, />130<!-- -->°</);
  assert.match(html, /data-active="true"[^>]*>1/);
  assert.match(html, /data-testid="rig-lab-canvas"/);
});
