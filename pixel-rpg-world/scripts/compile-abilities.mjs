import Ajv2020 from "ajv/dist/2020.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, "..");
const schema = JSON.parse(await readFile(
  resolve(projectDir, "content-src/schema/abilities.schema.json"),
  "utf8",
));
const validateSchema = new Ajv2020({ allErrors: true, strict: true }).compile(schema);

function fail(filename, message) {
  throw new Error(`${filename}: ${message}`);
}

function schemaErrors() {
  return validateSchema.errors.map((error) => (
    `${error.instancePath || "/"} ${error.message} ${JSON.stringify(error.params)}`
  )).join("; ");
}

export function compileAbilitySources(sources) {
  const catalogs = sources.map(({ filename, value }) => {
    const data = structuredClone(value);
    for (const ability of data?.abilities ?? []) {
      if (!Array.isArray(ability?.rankBonuses)) continue;
      const ranks = new Set();
      for (const bonus of ability.rankBonuses) {
        if (ranks.has(bonus?.rank)) {
          fail(filename, `${ability.id ?? "unknown ability"} duplicate rank bonus ${bonus?.rank}`);
        }
        ranks.add(bonus?.rank);
      }
    }
    if (!validateSchema(data)) fail(filename, schemaErrors());
    return { filename, data };
  });
  for (const kind of ["player", "enemy"]) {
    const count = catalogs.filter((catalog) => catalog.data.kind === kind).length;
    if (count !== 1) fail("ability catalogs", `requires exactly one ${kind} catalog`);
  }
  const all = catalogs.flatMap((catalog) => catalog.data.abilities.map((ability) => ({
    filename: catalog.filename,
    kind: catalog.data.kind,
    ability,
  })));
  const ids = new Set();
  for (const { filename, ability } of all) {
    if (ids.has(ability.id)) fail(filename, `duplicate ability id ${ability.id}`);
    ids.add(ability.id);
    if (ability.telegraphSeconds > ability.actionTime) {
      fail(filename, `${ability.id} telegraph exceeds action time`);
    }
    const bonusRanks = new Set();
    for (const bonus of ability.rankBonuses) {
      if (bonusRanks.has(bonus.rank)) fail(filename, `${ability.id} duplicate rank bonus ${bonus.rank}`);
      bonusRanks.add(bonus.rank);
    }
  }
  const player = all.filter((entry) => entry.kind === "player").map((entry) => entry.ability)
    .sort((left, right) => left.id.localeCompare(right.id));
  const enemies = all.filter((entry) => entry.kind === "enemy").map((entry) => entry.ability)
    .sort((left, right) => left.id.localeCompare(right.id));
  if (player.length !== 12) fail("player.json", "requires exactly 12 player active skills");
  if (player.some((ability) => ability.slot !== "active")) {
    fail("player.json", "player catalog may contain active skills only");
  }
  const definitions = [...player, ...enemies];
  const code = [
    "// 此文件由 npm run content:build 生成，请修改 content-src，不要手改。",
    "import type { AbilityDef } from \"../Definitions\";",
    "",
    `export const ABILITY_DATA = ${JSON.stringify(definitions, null, 2)} as const satisfies readonly AbilityDef[];`,
    `export const PLAYER_ABILITY_IDS = ${JSON.stringify(player.map((ability) => ability.id), null, 2)} as const;`,
    `export const ENEMY_ABILITY_IDS = ${JSON.stringify(enemies.map((ability) => ability.id), null, 2)} as const;`,
    "",
  ].join("\n");
  return { player, enemies, code };
}

async function readJson(filename) {
  return JSON.parse(await readFile(filename, "utf8"));
}

export async function compileAbilityFiles(root = projectDir) {
  const filenames = ["player.json", "enemies.json"];
  const sources = await Promise.all(filenames.map(async (filename) => ({
    filename,
    value: await readJson(resolve(root, "content-src/abilities", filename)),
  })));
  const result = compileAbilitySources(sources);
  const output = resolve(root, "game/content/generated/abilities.ts");
  let current;
  try {
    current = await readFile(output, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (current !== result.code) {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, result.code);
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await compileAbilityFiles();
  console.log(`Compiled ${result.player.length} player and ${result.enemies.length} enemy abilities.`);
}
