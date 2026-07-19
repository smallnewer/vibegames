import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the terrain demo shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>暮光河谷 · Three\.js 地形实验<\/title>/i);
  assert.match(html, /暮光河谷/);
  assert.match(html, /程序化地形/);
  assert.match(html, /同屏双人/);
  assert.match(html, /P1 · WASD · 空格/);
  assert.match(html, /G30/);
  assert.match(html, /连接 G30 手柄/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/);
});

test("keeps the requested rendering techniques in the scene", async () => {
  const [scene, page, layout, globals, packageJson] = await Promise.all([
    readFile(new URL("../app/TerrainScene.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(scene, /function terrainHeight/);
  assert.match(scene, /AI 只负责统一画风/);
  assert.match(scene, /terrain-grass\.png/);
  assert.match(scene, /terrain-road\.png/);
  assert.match(scene, /terrain-rock\.png/);
  assert.match(scene, /THREE\.RepeatWrapping/);
  assert.match(scene, /GROUND_LIGHT_COLOR/);
  assert.match(scene, /float wrappedSun/);
  assert.match(scene, /石板路软过渡/);
  assert.match(scene, /THREE\.NeutralToneMapping/);
  assert.match(scene, /MeshLambertMaterial\(\{ color: 0xffffff/);
  assert.doesNotMatch(globals, /rgba\(11, 15, 13, 0\.28\)/);
  assert.equal(scene.match(/#include <tonemapping_fragment>/g)?.length, 3);
  assert.equal(scene.match(/#include <colorspace_fragment>/g)?.length, 3);
  assert.match(scene, /float broadReflection/);
  assert.match(scene, /vec3 reflectedGround/);
  assert.match(scene, /vec3 detailNormal/);
  assert.match(scene, /float surfaceHeight/);
  assert.match(scene, /toneMappingExposure = 1\.06/);
  assert.match(scene, /vec3 artisticGround/);
  assert.match(scene, /float reflectionStrength/);
  assert.match(scene, /WALK_EYE_HEIGHT = 2\.25/);
  assert.match(scene, /float sunGlint/);
  assert.match(scene, /两组方向不同的流动波纹/);
  assert.match(scene, /new OrbitControls/);
  assert.match(scene, /GLTFLoader/);
  assert.match(scene, /SkeletonUtils/);
  assert.match(scene, /bovine-hero-runtime\.glb/);
  assert.match(scene, /type ViewMode = "orbit" \| "walk" \| "party"/);
  assert.match(scene, /PARTY_MAX_DISTANCE = 28/);
  assert.match(scene, /KeyW/);
  assert.match(scene, /ArrowUp/);
  assert.match(scene, /Space/);
  assert.match(scene, /Enter/);
  assert.match(scene, /import \{ connectG30 \} from "\.\/g30-webhid\.js"/);
  assert.match(scene, /g30StateRef/);
  assert.match(scene, /movementFromG30/);
  assert.match(scene, /previousG30ARef/);
  assert.match(scene, /rightStick/);
  assert.match(scene, /updatePartyCamera/);
  assert.match(scene, /AnimationMixer/);
  assert.match(globals, /world__players/);
  assert.match(globals, /world__controller/);
  assert.match(scene, /function roadCenter/);
  assert.match(scene, /requestPointerLock/);
  assert.match(scene, /handleLookPointerDown/);
  assert.match(scene, /setPointerCapture/);
  assert.match(scene, /float waveLines/);
  assert.match(scene, /uniform sampler2D uWaterMap/);
  assert.match(scene, /water-surface\.png/);
  assert.match(scene, /vec3 paintedWater/);
  assert.match(scene, /treeLimit \* 4/);
  assert.match(scene, /IcosahedronGeometry/);
  assert.match(scene, /crownCount/);
  assert.doesNotMatch(scene, /new THREE\.ConeGeometry\(1\.25, 4\.8/);
  assert.doesNotMatch(scene, /float detail = valueNoise\(p \* 0\.72\)/);
  assert.doesNotMatch(scene, /step\(0\.53, valueNoise\(p \* 1\.9\)\)/);
  assert.doesNotMatch(scene, /0xffc978/);
  assert.match(page, /<TerrainScene \/>/);
  assert.match(layout, /title:\s*"暮光河谷 · Three\.js 地形实验"/);
  assert.match(packageJson, /"three":/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
