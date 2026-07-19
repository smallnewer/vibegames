import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targetFile = resolve(projectDir, process.argv[2] ?? "");
const outputFile = resolve(projectDir, "public/game-assets/actors/humanoid-combat.gltf");

// KayKit 是直臂低模骨架；同一源关节驱动目标连续骨链，保留原动作轮廓。
const KAYKIT_BONE_MAP = [
  ["Body", "pelvis"],
  ["Body", "spine_01"],
  ["Body", "spine_02"],
  ["Body", "spine_03"],
  ["Body", "neck_01"],
  ["Head", "Head"],
  ["armLeft", "clavicle_l"],
  ["armLeft", "upperarm_l"],
  ["armLeft", "lowerarm_l"],
  ["handSlotLeft", "hand_l"],
  ["armRight", "clavicle_r"],
  ["armRight", "upperarm_r"],
  ["armRight", "lowerarm_r"],
  ["handSlotRight", "hand_r"],
];

const SOURCES = {
  kaykit: {
    file: resolve(projectDir, "public/game-assets/action-lab/kaykit-character-animations-v1.2.glb"),
    bones: KAYKIT_BONE_MAP,
  },
};

const CLIPS = [
  ["kaykit", "Shoot(2h)Bow", "Library_Bow_Shoot"],
];

function fail(message) {
  throw new Error(`retarget animation: ${message}`);
}

if (!process.argv[2]) fail("pass the generated UAL target glTF");

function multiply(left, right) {
  const [lx, ly, lz, lw] = left;
  const [rx, ry, rz, rw] = right;
  return normalize([
    lw * rx + lx * rw + ly * rz - lz * ry,
    lw * ry - lx * rz + ly * rw + lz * rx,
    lw * rz + lx * ry - ly * rx + lz * rw,
    lw * rw - lx * rx - ly * ry - lz * rz,
  ]);
}

function inverse(value) {
  return [-value[0], -value[1], -value[2], value[3]];
}

function normalize(value) {
  const length = Math.hypot(...value);
  return value.map((part) => part / length);
}

function parentsOf(nodes) {
  const parents = Array(nodes.length).fill(-1);
  nodes.forEach((node, parent) => {
    for (const child of node.children ?? []) parents[child] = parent;
  });
  return parents;
}

function depthOf(index, parents) {
  let depth = 0;
  while (parents[index] >= 0) {
    index = parents[index];
    depth += 1;
  }
  return depth;
}

function restRotations(nodes, parents) {
  const result = new Map();
  const visit = (index) => {
    const cached = result.get(index);
    if (cached) return cached;
    const local = nodes[index].rotation ?? [0, 0, 0, 1];
    const parent = parents[index];
    const global = parent < 0 ? local : multiply(visit(parent), local);
    result.set(index, global);
    return global;
  };
  nodes.forEach((_, index) => visit(index));
  return result;
}

function parseGlb(bytes) {
  // 动作源是 GLB；这里只读取 JSON 和动画二进制块。
  if (bytes.readUInt32LE(0) !== 0x46546c67) fail("source is not GLB");
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8").replace(/\0+$/u, ""));
  const binaryHeader = 20 + ((jsonLength + 3) & ~3);
  const binaryLength = bytes.readUInt32LE(binaryHeader);
  return {
    json,
    binary: bytes.subarray(binaryHeader + 8, binaryHeader + 8 + binaryLength),
  };
}

function readFloatAccessor(json, binary, index) {
  const accessor = json.accessors[index];
  if (accessor.componentType !== 5126) fail(`accessor ${index} is not float`);
  const size = accessor.type === "SCALAR" ? 1 : accessor.type === "VEC4" ? 4 : 3;
  const view = json.bufferViews[accessor.bufferView];
  const stride = view.byteStride ?? size * 4;
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  return Array.from({ length: accessor.count }, (_, row) => (
    Array.from({ length: size }, (_, column) => binary.readFloatLE(start + row * stride + column * 4))
  ));
}

function appendFloatAccessor(json, chunks, values, type, min, max) {
  const data = Buffer.alloc(values.length * values[0].length * 4);
  let offset = 0;
  for (const row of values) {
    for (const value of row) {
      data.writeFloatLE(value, offset);
      offset += 4;
    }
  }
  const byteOffset = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const bufferView = json.bufferViews.push({ buffer: 0, byteOffset, byteLength: data.length }) - 1;
  chunks.push(data);
  return json.accessors.push({
    bufferView,
    componentType: 5126,
    count: values.length,
    type,
    ...(min ? { min } : {}),
    ...(max ? { max } : {}),
  }) - 1;
}

function mapBones(source, target, bones) {
  const sourceIndex = new Map(source.nodes.map((node, index) => [node.name, index]));
  const targetIndex = new Map(target.nodes.map((node, index) => [node.name, index]));
  const targetParents = parentsOf(target.nodes);
  return bones.map(([sourceName, targetName]) => {
    const from = sourceIndex.get(sourceName);
    const to = targetIndex.get(targetName);
    if (from === undefined || to === undefined) fail(`missing bone ${sourceName} -> ${targetName}`);
    return { from, to, sourceName, targetName };
  }).sort((left, right) => depthOf(left.to, targetParents) - depthOf(right.to, targetParents));
}

function retargetClip(target, chunks, source, bones, sourceClip, outputClip) {
  const animation = source.json.animations.find((value) => value.name === sourceClip);
  if (!animation) fail(`missing ${sourceClip}`);

  const sourceParents = parentsOf(source.json.nodes);
  const targetParents = parentsOf(target.nodes);
  const sourceRest = restRotations(source.json.nodes, sourceParents);
  const targetRest = restRotations(target.nodes, targetParents);
  const mapped = mapBones(source.json, target, bones);
  const rotationChannels = new Map();
  let times;
  for (const channel of animation.channels) {
    if (channel.target.path !== "rotation") continue;
    const sampler = animation.samplers[channel.sampler];
    const channelTimes = readFloatAccessor(source.json, source.binary, sampler.input)
      .map(([value]) => value);
    if (!times) times = channelTimes;
    if (
      times.length !== channelTimes.length
      || times.some((value, index) => Math.abs(value - channelTimes[index]) > 1e-6)
    ) {
      fail(`${sourceClip} channels do not share one fixed timeline`);
    }
    rotationChannels.set(
      channel.target.node,
      readFloatAccessor(source.json, source.binary, sampler.output),
    );
  }
  if (!times) fail(`${sourceClip} has no rotation timeline`);

  const outputByTarget = new Map(mapped.map(({ to }) => [to, []]));
  for (let frame = 0; frame < times.length; frame += 1) {
    const sourceGlobal = new Map();
    const sourcePose = (index) => {
      const cached = sourceGlobal.get(index);
      if (cached) return cached;
      const local = rotationChannels.get(index)?.[frame]
        ?? source.json.nodes[index].rotation
        ?? [0, 0, 0, 1];
      const parent = sourceParents[index];
      const global = parent < 0 ? local : multiply(sourcePose(parent), local);
      sourceGlobal.set(index, global);
      return global;
    };
    const targetGlobal = new Map();
    for (const bone of mapped) {
      // 源骨骼相对静止姿势的世界旋转差，离线套到目标静止姿势。
      const delta = multiply(sourcePose(bone.from), inverse(sourceRest.get(bone.from)));
      const desiredGlobal = multiply(delta, targetRest.get(bone.to));
      const parent = targetParents[bone.to];
      const parentGlobal = targetGlobal.get(parent) ?? targetRest.get(parent) ?? [0, 0, 0, 1];
      let local = multiply(inverse(parentGlobal), desiredGlobal);
      const previous = outputByTarget.get(bone.to).at(-1);
      if (previous && local.reduce((sum, value, index) => sum + value * previous[index], 0) < 0) {
        local = local.map((value) => -value);
      }
      outputByTarget.get(bone.to).push(local);
      targetGlobal.set(bone.to, desiredGlobal);
    }
  }

  const timeAccessor = appendFloatAccessor(
    target,
    chunks,
    times.map((value) => [value]),
    "SCALAR",
    [times[0]],
    [times.at(-1)],
  );
  const samplers = [];
  const channels = [];
  for (const bone of mapped) {
    const output = appendFloatAccessor(target, chunks, outputByTarget.get(bone.to), "VEC4");
    const sampler = samplers.push({ input: timeAccessor, output, interpolation: "LINEAR" }) - 1;
    channels.push({ sampler, target: { node: bone.to, path: "rotation" } });
  }
  target.animations = target.animations.filter((value) => value.name !== outputClip);
  target.animations.push({ name: outputClip, samplers, channels });
  return { frames: times.length, bones: mapped.length };
}

const sources = Object.fromEntries(await Promise.all(Object.entries(SOURCES).map(
  async ([id, definition]) => [id, {
    ...definition,
    data: parseGlb(await readFile(definition.file)),
  }],
)));
const targetBytes = await readFile(targetFile);
const targetGlb = parseGlb(targetBytes);
const target = targetGlb.json;
const originalBuffer = targetGlb.binary;
// 新采样器追加到 UAL 模型缓冲区，保留它的原生动作与武器挂点。
const chunks = [originalBuffer, Buffer.alloc((4 - originalBuffer.length % 4) % 4)];

for (const [sourceId, sourceClip, outputClip] of CLIPS) {
  const source = sources[sourceId];
  if (!source) fail(`unknown source ${sourceId}`);
  const result = retargetClip(
    target,
    chunks,
    source.data,
    source.bones,
    sourceClip,
    outputClip,
  );
  console.log(`Retargeted ${sourceClip} to ${outputClip}: ${result.frames} frames, ${result.bones} bones.`);
}

const buffer = Buffer.concat(chunks);
target.buffers[0] = {
  byteLength: buffer.length,
  uri: `data:application/octet-stream;base64,${buffer.toString("base64")}`,
};
await writeFile(outputFile, `${JSON.stringify(target, null, 2)}\n`);
