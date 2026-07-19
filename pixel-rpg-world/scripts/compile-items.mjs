import Ajv2020 from "ajv/dist/2020.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, "..");
const schema = JSON.parse(await readFile(resolve(projectDir, "content-src/schema/items.schema.json"), "utf8"));
const validateSchema = new Ajv2020({ allErrors: true, strict: true }).compile(schema);

function fail(message) {
  throw new Error(`item catalog: ${message}`);
}

function unique(values, label, key = "id") {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value[key])) fail(`duplicate ${label} ${value[key]}`);
    seen.add(value[key]);
  }
}

export function compileItemCatalog(source) {
  const data = structuredClone(source);
  if (!validateSchema(data)) {
    const errors = validateSchema.errors.map((error) => (
      `${error.instancePath || "/"} ${error.message} ${JSON.stringify(error.params)}`
    )).join("; ");
    fail(errors);
  }
  unique(data.bases, "base");
  unique(data.affixes, "affix");
  unique(data.affixes, "affix group", "group");
  unique(data.uniques, "unique");
  for (const affix of data.affixes) {
    for (const tier of affix.tiers) {
      if (tier.minFactor > tier.maxFactor) fail(`${affix.id} minFactor exceeds maxFactor`);
    }
  }
  const bases = new Map(data.bases.map((base) => [base.id, base]));
  const affixes = new Map(data.affixes.map((affix) => [affix.id, affix]));
  for (const uniqueItem of data.uniques) {
    const base = bases.get(uniqueItem.base);
    if (!base) fail(`${uniqueItem.id} references missing base ${uniqueItem.base}`);
    for (const affixId of uniqueItem.affixes) {
      const affix = affixes.get(affixId);
      if (!affix) fail(`${uniqueItem.id} references missing affix ${affixId}`);
      if (!affix.slots.includes(base.slot)) {
        fail(`${uniqueItem.id} affix ${affixId} is illegal for slot ${base.slot}`);
      }
    }
  }
  data.bases.sort((a, b) => a.id.localeCompare(b.id));
  data.affixes.sort((a, b) => a.id.localeCompare(b.id));
  data.uniques.sort((a, b) => a.id.localeCompare(b.id));
  const code = [
    "// 此文件由 npm run content:build 生成，请修改 content-src，不要手改。",
    "",
    `export const ITEM_CATALOG_DATA = ${JSON.stringify(data, null, 2)} as const;`,
    "",
  ].join("\n");
  return { data, code };
}

async function readJson(filename) {
  return JSON.parse(await readFile(filename, "utf8"));
}

export async function compileItemFiles(root = projectDir) {
  const [bases, affixes, uniques] = await Promise.all([
    readJson(resolve(root, "content-src/items/bases.json")),
    readJson(resolve(root, "content-src/items/affixes.json")),
    readJson(resolve(root, "content-src/items/uniques.json")),
  ]);
  const result = compileItemCatalog({
    schemaVersion: 1,
    bases: bases.bases,
    affixes: affixes.affixes,
    uniques: uniques.uniques,
  });
  const output = resolve(root, "game/content/generated/items.ts");
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
  const result = await compileItemFiles();
  console.log(`Compiled ${result.data.bases.length} bases, ${result.data.affixes.length} affixes, ${result.data.uniques.length} uniques.`);
}
