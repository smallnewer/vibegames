import assert from "node:assert/strict";
import test from "node:test";

test("renders the production effects acceptance lab", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(
    new Request("http://localhost/effects-lab", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /近战武器与状态特效验收台/);
  assert.match(html, /铁背刀/);
  assert.match(html, /天陨雷锤/);
  assert.match(html, /冰冻减速/);
  assert.match(html, /放大/);
  assert.match(html, /旧版占位/);
  assert.match(html, /V2 返工/);
  assert.match(html, /样板：U41 刀光 · 着火 · 中毒/);
  assert.match(html, /data-testid="effects-lab-canvas"/);
});
