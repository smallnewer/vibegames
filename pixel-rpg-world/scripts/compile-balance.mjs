import Ajv2020 from "ajv/dist/2020.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, "..");
const schema = JSON.parse(await readFile(
  resolve(projectDir, "content-src/schema/balance.schema.json"),
  "utf8",
));
const validateSchema = new Ajv2020({ allErrors: true, strict: true }).compile(schema);

function fail(filename, message) {
  throw new Error(`${filename}: ${message}`);
}

export function compileBalanceSource(source, filename = "v1.json") {
  const data = structuredClone(source);
  if (!validateSchema(data)) {
    const errors = validateSchema.errors.map((error) => (
      `${error.instancePath || "/"} ${error.message} ${JSON.stringify(error.params)}`
    )).join("; ");
    fail(filename, errors);
  }
  for (let index = 1; index < data.skillRankMultipliers.length; index += 1) {
    if (data.skillRankMultipliers[index] <= data.skillRankMultipliers[index - 1]) {
      fail(filename, "skill rank multipliers must be strictly increasing");
    }
  }
  const reinforcementLevels = new Set();
  for (const entry of data.reinforcement) {
    if (reinforcementLevels.has(entry.level)) {
      fail(filename, `duplicate reinforcement level ${entry.level}`);
    }
    reinforcementLevels.add(entry.level);
  }
  const rarityTotal = Object.values(data.rarityWeights).reduce((sum, value) => sum + value, 0);
  if (Math.abs(rarityTotal - 1) > 1e-6) {
    fail(filename, `rarity weights must sum to 1, received ${rarityTotal}`);
  }
  const code = [
    "// 此文件由 npm run content:build 生成，请修改 content-src，不要手改。",
    "",
    `export const BALANCE_DATA = ${JSON.stringify(data, null, 2)} as const;`,
    "",
  ].join("\n");
  return { data, code };
}

async function writeIfChanged(filename, content) {
  let current;
  try {
    current = await readFile(filename, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (current === content) return false;
  await mkdir(dirname(filename), { recursive: true });
  await writeFile(filename, content);
  return true;
}

export async function compileBalanceFiles(root = projectDir) {
  const filename = "v1.json";
  const source = JSON.parse(await readFile(resolve(root, "content-src/balance", filename), "utf8"));
  const result = compileBalanceSource(source, filename);
  const output = resolve(root, "game/content/generated/balance.ts");
  const changed = await writeIfChanged(output, result.code);
  return { ...result, changed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await compileBalanceFiles();
  console.log(`Compiled balance v${result.data.version}${result.changed ? "." : " (unchanged)."}`);
}
