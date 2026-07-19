import Ajv2020 from "ajv/dist/2020.js";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, "..");
const schema = JSON.parse(await readFile(
  resolve(projectDir, "content-src/schema/dungeon.schema.json"),
  "utf8",
));
const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
const validateSchema = ajv.compile(schema);

function fail(filename, message) {
  throw new Error(`${filename}: ${message}`);
}

function assertUnique(filename, values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value.id)) fail(filename, `duplicate ${label} id ${value.id}`);
    seen.add(value.id);
  }
}

// 正式像素房间的墙和门由拓扑推导，内容作者只摆额外障碍物。
function expandVoxelNavigation(source) {
  const pack = structuredClone(source);
  if (pack.visual.profile !== "voxel_dungeon") return pack;
  const sections = pack.map.sections;
  pack.map.navigation.walkable = sections.map((section) => ({
    id: `walkable.${section.id.slice("section.".length)}`,
    x: section.gridX * pack.map.screenWidth,
    z: section.gridZ * pack.map.screenDepth,
    width: pack.map.screenWidth,
    depth: pack.map.screenDepth,
  }));
  const walls = [];
  const directions = [
    ["west", -1, 0],
    ["east", 1, 0],
    ["north", 0, -1],
    ["south", 0, 1],
  ];
  const addWall = (section, side, suffix, offset, length) => {
    const alongZ = side === "west" || side === "east";
    const centerX = section.gridX * pack.map.screenWidth;
    const centerZ = section.gridZ * pack.map.screenDepth;
    walls.push({
      id: `blocker.wall_${section.id.slice("section.".length)}_${side}_${suffix}`,
      x: alongZ
        ? centerX + (side === "west" ? -8.72 : 8.72)
        : centerX + offset,
      z: alongZ
        ? centerZ + offset
        : centerZ + (side === "north" ? -5.72 : 5.72),
      width: alongZ ? 0.56 : length,
      depth: alongZ ? length : 0.56,
      height: 3.9,
    });
  };

  for (const section of sections) {
    for (const [side, dx, dz] of directions) {
      const neighbor = sections.find((candidate) => (
        candidate.gridX === section.gridX + dx && candidate.gridZ === section.gridZ + dz
      ));
      const openZone = neighbor && section.zone && neighbor.zone === section.zone;
      if (openZone) continue;
      if (neighbor && (side === "west" || side === "north")) continue;
      const length = side === "west" || side === "east"
        ? pack.map.screenDepth
        : pack.map.screenWidth;
      if (!neighbor) {
        addWall(section, side, "full", 0, length);
        continue;
      }
      const door = 4.6;
      const segment = (length - door) / 2;
      const offset = door / 2 + segment / 2;
      addWall(section, side, "a", -offset, segment);
      addWall(section, side, "b", offset, segment);
    }
  }
  // 正式地图不再保留旧房型手写碰撞，避免换主题后出现隐形墙。
  pack.map.navigation.blockers = walls;
  return pack;
}

function sectionNeighbors(sections, section) {
  return sections.filter((candidate) => (
    Math.abs(candidate.gridX - section.gridX) + Math.abs(candidate.gridZ - section.gridZ) === 1
  ));
}

function connectedCount(sections) {
  const pending = sections.length > 0 ? [sections[0]] : [];
  const visited = new Set();
  while (pending.length > 0) {
    const current = pending.pop();
    const key = `${current.gridX}:${current.gridZ}`;
    if (visited.has(key)) continue;
    visited.add(key);
    pending.push(...sectionNeighbors(sections, current));
  }
  return visited.size;
}

// 旋转和镜像后的同一形状使用同一个签名，避免五张图只是翻转摆放。
export function canonicalTopologySignature(sections) {
  const transforms = [
    ([x, z]) => [x, z],
    ([x, z]) => [x, -z],
    ([x, z]) => [-x, z],
    ([x, z]) => [-x, -z],
    ([x, z]) => [z, x],
    ([x, z]) => [z, -x],
    ([x, z]) => [-z, x],
    ([x, z]) => [-z, -x],
  ];
  return transforms.map((transform) => {
    const points = sections.map((section) => transform([section.gridX, section.gridZ]));
    const minX = Math.min(...points.map(([x]) => x));
    const minZ = Math.min(...points.map(([, z]) => z));
    return points
      .map(([x, z]) => `${x - minX}:${z - minZ}`)
      .sort()
      .join("|");
  }).sort()[0];
}

// 地图尺寸按镜头屏幕分区，正式内容不能退化成单房间 Demo。
function validateMap(filename, pack) {
  const { bounds, sections } = pack.map;
  if (bounds.minX >= bounds.maxX || bounds.minZ >= bounds.maxZ) {
    fail(filename, "map bounds min must be smaller than max");
  }
  if (pack.map.mode === "showcase" && sections.length !== 1) {
    fail(filename, "showcase maps require exactly 1 screen");
  }
  if (pack.map.mode === "production" && (sections.length < 5 || sections.length > 10)) {
    fail(filename, "production maps require 5 to 10 screens");
  }

  assertUnique(filename, sections, "section");
  const grids = new Set();
  for (const section of sections) {
    const grid = `${section.gridX}:${section.gridZ}`;
    if (grids.has(grid)) fail(filename, `duplicate section grid ${grid}`);
    grids.add(grid);

    const centerX = section.gridX * pack.map.screenWidth;
    const centerZ = section.gridZ * pack.map.screenDepth;
    const halfWidth = pack.map.screenWidth / 2;
    const halfDepth = pack.map.screenDepth / 2;
    if (
      centerX - halfWidth < bounds.minX
      || centerX + halfWidth > bounds.maxX
      || centerZ - halfDepth < bounds.minZ
      || centerZ + halfDepth > bounds.maxZ
    ) {
      fail(filename, `section ${section.id} falls outside map bounds`);
    }
  }

  for (const value of [
    ...pack.spawnPoints,
    ...(pack.encounterSpawns ?? []),
    ...pack.enemies,
    ...pack.interactions,
    ...pack.encounters.flatMap((encounter) => "trigger" in encounter ? [encounter.trigger] : []),
    ...pack.placements,
  ]) {
    if (
      value.x < bounds.minX
      || value.x > bounds.maxX
      || value.z < bounds.minZ
      || value.z > bounds.maxZ
    ) {
      fail(filename, `${value.id} falls outside map bounds`);
    }
  }

  const surfaces = pack.map.navigation.walkable;
  assertUnique(filename, surfaces, "walkable surface");
  assertUnique(filename, pack.map.navigation.blockers, "static blocker");
  for (const surface of [...surfaces, ...pack.map.navigation.blockers]) {
    if (
      surface.x - surface.width / 2 < bounds.minX
      || surface.x + surface.width / 2 > bounds.maxX
      || surface.z - surface.depth / 2 < bounds.minZ
      || surface.z + surface.depth / 2 > bounds.maxZ
    ) {
      fail(filename, `${surface.id} falls outside map bounds`);
    }
  }
  for (const spawn of pack.spawnPoints) {
    const covered = surfaces.some((surface) => (
      spawn.x >= surface.x - surface.width / 2
      && spawn.x <= surface.x + surface.width / 2
      && spawn.z >= surface.z - surface.depth / 2
      && spawn.z <= surface.z + surface.depth / 2
    ));
    if (!covered) fail(filename, `${spawn.id} is outside every walkable surface`);
  }

  // 正式像素地下城必须连成一张图，不能靠传送掩盖断开的房间。
  if (pack.visual.profile === "voxel_dungeon") {
    if (sections.length < 9) fail(filename, "voxel dungeon requires 9 to 10 sections");
    if (connectedCount(sections) !== sections.length) {
      fail(filename, "voxel dungeon sections must be connected");
    }

    const width = Math.max(...sections.map((section) => section.gridX))
      - Math.min(...sections.map((section) => section.gridX)) + 1;
    const depth = Math.max(...sections.map((section) => section.gridZ))
      - Math.min(...sections.map((section) => section.gridZ)) + 1;
    if (width < 3 || depth < 3) fail(filename, "voxel dungeon footprint requires at least 3x3 screens");

    const degrees = sections.map((section) => sectionNeighbors(sections, section).length);
    if (Math.max(...degrees) < 3) fail(filename, "voxel dungeon requires a branch junction");
    const edges = degrees.reduce((sum, degree) => sum + degree, 0) / 2;
    if (edges < sections.length) fail(filename, "voxel dungeon requires a loop");

    const required = [
      "entry_hall",
      "living_quarters",
      "stone_corridor",
      "training_arena",
      "workshop",
      "boss_arena",
    ];
    for (const preset of required) {
      if (!sections.some((section) => section.preset === preset)) {
        fail(filename, `voxel dungeon requires ${preset}`);
      }
    }
    for (const section of sections) {
      if (!section.zone || !section.name) {
        fail(filename, `section ${section.id} requires zone and name`);
      }
    }
    const zones = new Map();
    for (const section of sections) {
      const rooms = zones.get(section.zone) ?? [];
      rooms.push(section);
      zones.set(section.zone, rooms);
    }
    for (const [zone, rooms] of zones) {
      if (new Set(rooms.map((room) => room.name)).size !== 1) {
        fail(filename, `zone ${zone} must use one name`);
      }
      if (new Set(rooms.map((room) => room.preset)).size !== 1) {
        fail(filename, `zone ${zone} must use one preset`);
      }
      if (connectedCount(rooms) !== rooms.length) fail(filename, `zone ${zone} must be connected`);
    }
    const combatZones = [...zones.values()].filter((rooms) => rooms[0].preset === "training_arena");
    if (!combatZones.some((rooms) => rooms.length >= 3)) {
      fail(filename, "training_arena requires a connected 3-section zone");
    }
    const bossZones = [...zones.values()].filter((rooms) => rooms[0].preset === "boss_arena");
    if (!bossZones.some((rooms) => rooms.length >= 2)) {
      fail(filename, "boss_arena requires a connected 2-section zone");
    }
    if (!pack.visual.palette) fail(filename, "voxel dungeon requires visual.palette");
  }
}

// Schema 管结构，编译器补足跨引用和资源预算校验。
function validateReferences(filename, pack) {
  if (pack.decorations.length > 64) fail(filename, "exceeds 64 decorations");
  if (pack.interactions.length > 8) fail(filename, "exceeds 8 interactions");
  if (pack.enemies.length > 64) fail(filename, "exceeds 64 enemies");
  if (pack.placements.length > 128) fail(filename, "exceeds 128 placements");
  validateMap(filename, pack);
  for (const [values, label] of [
    [pack.spawnPoints, "spawn"],
    [pack.encounterSpawns ?? [], "encounter spawn"],
    [pack.enemies, "enemy"],
    [pack.encounters, "encounter"],
    [pack.interactions, "interaction"],
    [pack.assets, "asset"],
    [pack.placements, "placement"],
    [pack.decorations, "decoration"],
  ]) {
    assertUnique(filename, values, label);
  }
  assertUnique(filename, [...pack.spawnPoints, ...(pack.encounterSpawns ?? [])], "all spawn");

  const assets = new Map(pack.assets.map((asset) => [asset.id, asset]));
  const sections = new Set(pack.map.sections.map((section) => section.id));
  for (const asset of pack.assets) {
    if (!asset.url.startsWith("/game-assets/")) {
      fail(filename, `${asset.id} must use a local /game-assets/ URL`);
    }
  }
  for (const placement of pack.placements) {
    if (!assets.has(placement.asset)) {
      fail(filename, `${placement.id} references missing asset ${placement.asset}`);
    }
    if (!sections.has(placement.section)) {
      fail(filename, `${placement.id} references missing section ${placement.section}`);
    }
  }

  const enemies = new Map(pack.enemies.map((enemy) => [enemy.id, enemy]));
  const encounters = new Map(pack.encounters.map((encounter) => [encounter.id, encounter]));
  for (const enemy of pack.enemies) {
    if (!encounters.has(enemy.encounter)) {
      fail(filename, `enemy ${enemy.id} references missing encounter ${enemy.encounter}`);
    }
  }
  for (const encounter of pack.encounters) {
    if (!("members" in encounter)) continue;
    for (const member of encounter.members) {
      const enemy = enemies.get(member);
      if (!enemy) fail(filename, `encounter ${encounter.id} references missing ${member}`);
      if (enemy.encounter !== encounter.id) {
        fail(filename, `enemy ${member} belongs to ${enemy.encounter}, not ${encounter.id}`);
      }
    }
  }

  for (const kind of pack.run ? ["harvest", "portal"] : ["harvest", "encounter", "door", "portal"]) {
    const count = pack.interactions.filter((interaction) => interaction.kind === kind).length;
    if (count !== 1) fail(filename, `requires exactly one ${kind} interaction`);
  }
  const harvest = pack.interactions.find((interaction) => interaction.kind === "harvest");
  if (harvest.reward.resource !== pack.manifest.resource.id) {
    fail(filename, `harvest resource ${harvest.reward.resource} does not match manifest`);
  }
  const encounterTrigger = pack.interactions.find((interaction) => interaction.kind === "encounter");
  if (encounterTrigger && !encounters.has(encounterTrigger.encounter)) {
    fail(filename, `encounter trigger ${encounterTrigger.id} references missing ${encounterTrigger.encounter}`);
  }

  if (pack.run) validateRun(filename, pack, encounters);

  const runtimeMembers = pack.encounters.flatMap((encounter) => (
    "waves" in encounter ? encounter.waves.flatMap((wave) => wave.members) : []
  )).length;
  const drawItems = 1 + pack.decorations.length + pack.placements.length
    + Math.max(pack.enemies.length, runtimeMembers) * 3
    + pack.interactions.length * 3;
  const triangles = 2 + pack.decorations.length * 12
    + Math.max(pack.enemies.length, runtimeMembers) * 36
    + pack.interactions.length * 100;
  if (drawItems > pack.budgets.estimatedDrawItems) {
    fail(filename, `estimated draw items ${drawItems} exceed declared budget`);
  }
  if (triangles > pack.budgets.estimatedTriangles) {
    fail(filename, `estimated triangles ${triangles} exceed declared budget`);
  }
}

function validateRun(filename, pack, encounters) {
  const run = pack.run;
  const sections = new Map(pack.map.sections.map((section) => [section.id, section]));
  const interactions = new Map(pack.interactions.map((interaction) => [interaction.id, interaction]));
  const spawns = new Map((pack.encounterSpawns ?? []).map((spawn) => [spawn.id, spawn]));
  const runtimeEncounters = pack.encounters.filter((encounter) => "waves" in encounter);
  if (runtimeEncounters.length !== pack.encounters.length) {
    fail(filename, "gameplayVersion 1 cannot mix legacy encounters");
  }
  if (pack.enemies.length !== 0) fail(filename, "gameplayVersion 1 cannot pre-create enemies");
  if (!sections.has(run.entrySection)) fail(filename, `run entry section ${run.entrySection} is missing`);
  const boss = encounters.get(run.bossEncounter);
  if (!boss || !("waves" in boss) || boss.kind !== "boss") {
    fail(filename, `run Boss encounter ${run.bossEncounter} is missing`);
  }
  const portal = interactions.get(run.completionPortal);
  if (!portal || portal.kind !== "portal") {
    fail(filename, `completion portal ${run.completionPortal} is missing`);
  }
  if (pack.interactions.filter((interaction) => interaction.kind === "portal").length !== 1) {
    fail(filename, "gameplayVersion 1 requires exactly one completion portal");
  }
  if (run.levelBand.normal[0] > run.levelBand.normal[1] || run.levelBand.echo[0] > run.levelBand.echo[1]) {
    fail(filename, "run level bands must be ordered");
  }
  for (const [kind, expected] of [["normal", 3], ["elite", 1], ["boss", 1]]) {
    const count = runtimeEncounters.filter((encounter) => encounter.kind === kind).length;
    if (count !== expected) fail(filename, `gameplayVersion 1 requires ${expected} ${kind} encounter${expected === 1 ? "" : "s"}`);
  }

  const memberIds = new Set();
  let authoredMembers = 0;
  for (const encounter of runtimeEncounters) {
    const section = sections.get(encounter.trigger.section);
    if (!section) fail(filename, `encounter ${encounter.id} trigger section ${encounter.trigger.section} is missing`);
    if (!pointInsideSection(pack, section, encounter.trigger)) {
      fail(filename, `encounter ${encounter.id} trigger is outside section ${section.id}`);
    }
    for (const interactionId of encounter.lockInteractions) {
      if (!interactions.has(interactionId)) {
        fail(filename, `encounter ${encounter.id} lock interaction ${interactionId} is missing`);
      }
    }
    if (encounter.kind === "boss") {
      if (!encounter.checkpoint) fail(filename, `Boss encounter ${encounter.id} requires checkpoint`);
      if (encounter.bossPhases?.length !== 3) fail(filename, `Boss encounter ${encounter.id} requires three phases`);
    }
    for (const wave of encounter.waves) {
      if (wave.members.length === 0) fail(filename, `encounter ${encounter.id} wave has no members`);
      if (wave.members.length > 12) fail(filename, `encounter ${encounter.id} wave exceeds 12 members`);
      authoredMembers += wave.members.length;
      for (const member of wave.members) {
        if (memberIds.has(member.id)) fail(filename, `duplicate encounter member id ${member.id}`);
        memberIds.add(member.id);
        const spawn = spawns.get(member.spawn);
        if (!spawn) fail(filename, `encounter member ${member.id} references missing spawn ${member.spawn}`);
        if (!pointInsideSection(pack, section, spawn)) {
          fail(filename, `encounter member ${member.id} spawn is outside section ${section.id}`);
        }
      }
    }
  }
  if (authoredMembers > 30) fail(filename, `authored encounter members ${authoredMembers} exceed 30`);
}

function pointInsideSection(pack, section, point) {
  const centerX = section.gridX * pack.map.screenWidth;
  const centerZ = section.gridZ * pack.map.screenDepth;
  return point.x >= centerX - pack.map.screenWidth / 2
    && point.x <= centerX + pack.map.screenWidth / 2
    && point.z >= centerZ - pack.map.screenDepth / 2
    && point.z <= centerZ + pack.map.screenDepth / 2;
}

function sortedPack(source) {
  const pack = structuredClone(source);
  for (const key of [
    "spawnPoints",
    "encounterSpawns",
    "enemies",
    "encounters",
    "interactions",
    "assets",
    "placements",
    "decorations",
  ]) {
    if (pack[key]) pack[key].sort((left, right) => left.id.localeCompare(right.id));
  }
  for (const encounter of pack.encounters) {
    if ("members" in encounter) encounter.members.sort();
    else for (const wave of encounter.waves) wave.members.sort((left, right) => left.id.localeCompare(right.id));
  }
  pack.map.sections.sort((left, right) => left.id.localeCompare(right.id));
  pack.map.navigation.walkable.sort((left, right) => left.id.localeCompare(right.id));
  pack.map.navigation.blockers.sort((left, right) => left.id.localeCompare(right.id));
  return pack;
}

export function compileDungeonSources(sources) {
  const packs = [...sources]
    .sort((left, right) => left.filename.localeCompare(right.filename))
    .map(({ filename, value: source }) => {
      const value = expandVoxelNavigation(source);
      if (!validateSchema(value)) {
        const errors = validateSchema.errors.map((error) => (
          `${error.instancePath || "/"} ${error.message} ${JSON.stringify(error.params)}`
        )).join("; ");
        fail(filename, errors);
      }
      validateReferences(filename, value);
      return sortedPack(value);
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  assertUnique("dungeon sources", packs, "dungeon");
  const topologyOwners = new Map();
  for (const pack of packs.filter((candidate) => candidate.visual.profile === "voxel_dungeon")) {
    const signature = canonicalTopologySignature(pack.map.sections);
    const owner = topologyOwners.get(signature);
    if (owner) fail("dungeon sources", `${pack.id} duplicates topology of ${owner}`);
    topologyOwners.set(signature, pack.id);
  }
  const code = [
    "// 此文件由 npm run content:build 生成，请修改 content-src，不要手改。",
    'import { hydrateDungeonPack, type DungeonPackSource } from "../../dungeon/DungeonDefinitions";',
    "",
    `const DUNGEON_PACK_SOURCES = ${JSON.stringify(packs, null, 2)} as const satisfies readonly DungeonPackSource[];`,
    "",
    "export const DUNGEON_PACK_DATA = DUNGEON_PACK_SOURCES.map(hydrateDungeonPack);",
    "",
  ].join("\n");
  return { packs, code };
}

export async function compileDungeonFiles() {
  const sourceDir = resolve(projectDir, "content-src/dungeons");
  const filenames = (await readdir(sourceDir)).filter((name) => name.endsWith(".json")).sort();
  const sources = await Promise.all(filenames.map(async (filename) => ({
    filename,
    value: JSON.parse(await readFile(resolve(sourceDir, filename), "utf8")),
  })));
  const result = compileDungeonSources(sources);
  const output = resolve(projectDir, "game/content/generated/dungeonPacks.ts");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, result.code);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await compileDungeonFiles();
  console.log(`Compiled ${result.packs.length} dungeon packs.`);
}
