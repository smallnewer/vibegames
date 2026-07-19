import Ajv2020 from "ajv/dist/2020.js";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultProjectDir = resolve(scriptDir, "..");
const schema = JSON.parse(await readFile(
  resolve(defaultProjectDir, "content-src/schema/actor-visuals.schema.json"),
  "utf8",
));
const validateSchema = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
const DEFAULT_PLAYBACK = Object.freeze({ layer: "full", exitAt: 1, blendSpeed: 0.08 });

function fail(message) {
  throw new Error(`actor visuals: ${message}`);
}

function projectPath(value) {
  return value instanceof URL ? fileURLToPath(value) : value;
}

function unique(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) fail(`duplicate ${label} ${value}`);
    seen.add(value);
  }
}

// 收集玩法会直接点名的片段，确保内容声明和资源文件不会悄悄脱节。
function referencedClips(visual) {
  const clips = [...Object.values(visual.animations), ...Object.keys(visual.animationEvents ?? {})];
  if (!visual.humanoidActions) return [...new Set(clips)];
  const { melee, bow, cast } = visual.humanoidActions;
  return [...new Set([...clips, ...melee, bow, cast.enter, cast.loop, cast.release, cast.exit])];
}

function inspectJson(json, byteLength) {
  const accessors = json.accessors ?? [];
  let triangles = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
      const count = accessors[accessorIndex]?.count ?? 0;
      const mode = primitive.mode ?? 4;
      triangles += mode === 4 ? Math.floor(count / 3) : mode === 5 || mode === 6
        ? Math.max(0, count - 2)
        : 0;
    }
  }
  const animations = (json.animations ?? []).map((animation, index) => ({
    name: animation.name ?? `#${index}`,
    // glTF 动画采样器的输入轴是秒，最大值就是片段原始时长。
    duration: Math.max(0, ...(animation.samplers ?? []).map((sampler) => (
      accessors[sampler.input]?.max?.[0] ?? 0
    ))),
  }));
  return {
    bytes: byteLength,
    triangles,
    maxBones: Math.max(0, ...(json.skins ?? []).map((skin) => skin.joints?.length ?? 0)),
    textures: (json.textures ?? []).length,
    animations: animations.map((animation) => animation.name),
    animationDurations: Object.fromEntries(
      animations.map((animation) => [animation.name, animation.duration]),
    ),
    nodes: (json.nodes ?? []).map((node) => node.name).filter(Boolean),
  };
}

// 直接读取 GLB JSON 块，不依赖渲染引擎，构建机也能审计资源。
export async function inspectGlb(source) {
  const bytes = await readFile(source);
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67) fail("invalid GLB magic");
  if (bytes.readUInt32LE(4) !== 2) fail("only GLB version 2 is supported");
  const jsonLength = bytes.readUInt32LE(12);
  if (bytes.readUInt32LE(16) !== 0x4e4f534a) fail("GLB has no leading JSON chunk");
  const json = JSON.parse(
    bytes.subarray(20, 20 + jsonLength).toString("utf8").replace(/\0+$/u, ""),
  );
  return inspectJson(json, bytes.length);
}

// 正式动作资产是内嵌缓冲区的 .gltf；两种容器走同一份预算审计。
export async function inspectActorAsset(source) {
  const bytes = await readFile(source);
  if (bytes.length >= 20 && bytes.readUInt32LE(0) === 0x46546c67) return inspectGlb(source);
  return inspectJson(JSON.parse(bytes.toString("utf8")), bytes.length);
}

export async function compileActorVisualManifest(source, projectDir = defaultProjectDir) {
  if (!validateSchema(source)) {
    const errors = validateSchema.errors.map((error) => (
      `${error.instancePath || "/"} ${error.message} ${JSON.stringify(error.params)}`
    )).join("; ");
    fail(errors);
  }
  unique(source.visuals.map((visual) => visual.id), "visual");
  const assetSources = new Map();
  for (const visual of source.visuals) {
    const existing = assetSources.get(visual.asset);
    if (existing && existing !== visual.url) fail(`asset ${visual.asset} changed source`);
    assetSources.set(visual.asset, visual.url);
  }

  const root = projectPath(projectDir);
  const sourceVisuals = [...source.visuals].sort((left, right) => left.id.localeCompare(right.id));
  const visuals = [];
  for (const visual of sourceVisuals) {
    if (!visual.url.startsWith("/game-assets/") || visual.url.includes("..")) {
      fail(`${visual.id} must use a local /game-assets/ URL`);
    }
    const filename = resolve(root, "public", visual.url.slice(1));
    const info = await inspectActorAsset(filename);
    const fileInfo = await stat(filename);
    if (!fileInfo.isFile()) fail(`${visual.id} does not resolve to a file`);
    const clips = referencedClips(visual);
    for (const clip of clips) {
      if (!info.animations.includes(clip)) fail(`${visual.id} is missing animation ${clip}`);
    }
    for (const [clip, events] of Object.entries(visual.animationEvents ?? {})) {
      for (let index = 1; index < events.length; index += 1) {
        if (events[index].at < events[index - 1].at) {
          fail(`${visual.id} animation events for ${clip} must be ordered by at`);
        }
      }
    }
    for (const [slot, socket] of Object.entries(visual.sockets)) {
      if (socket.node && !info.nodes.includes(socket.node)) {
        fail(`${visual.id} is missing ${slot} socket node ${socket.node}`);
      }
    }
    for (const [name, actual, maximum] of [
      ["bytes", info.bytes, visual.budget.maxBytes],
      ["triangles", info.triangles, visual.budget.maxTriangles],
      ["bones", info.maxBones, visual.budget.maxBones],
      ["textures", info.textures, visual.budget.maxTextures],
      ["animations", info.animations.length, visual.budget.maxAnimations],
    ]) {
      if (actual > maximum) fail(`${visual.id} ${name} ${actual} exceed budget ${maximum}`);
    }
    visuals.push({
      ...visual,
      animationDurations: Object.fromEntries(
        Object.entries(visual.animations).map(([action, clip]) => (
          [action, info.animationDurations[clip]]
        )),
      ),
      clipDurations: Object.fromEntries(
        clips.map((clip) => [clip, info.animationDurations[clip]]),
      ),
      // 每个片段自己声明退出点和分层方式；换资源时只改内容，不改播放器。
      playback: Object.fromEntries(
        Object.keys(visual.animations).map((action) => [
          action,
          { ...DEFAULT_PLAYBACK, ...visual.playback?.[action] },
        ]),
      ),
    });
  }

  const code = [
    "// 此文件由 npm run content:build 生成，请修改 content-src，不要手改。",
    'import type { ActorVisualDef } from "../ActorDefinitions";',
    "",
    `export const ACTOR_VISUAL_DATA = ${JSON.stringify(visuals, null, 2)} as const satisfies readonly ActorVisualDef[];`,
    "",
  ].join("\n");
  return { visuals, code };
}

export async function compileActorVisualFiles(projectDir = defaultProjectDir) {
  const root = projectPath(projectDir);
  const source = JSON.parse(await readFile(
    resolve(root, "content-src/actors/visuals.json"),
    "utf8",
  ));
  const result = await compileActorVisualManifest(source, root);
  const output = resolve(root, "game/content/generated/actorVisuals.ts");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, result.code);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await compileActorVisualFiles();
  console.log(`Compiled ${result.visuals.length} actor visuals.`);
}
