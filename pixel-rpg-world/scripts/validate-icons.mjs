import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
export const DEFAULT_MANIFEST = path.join(ROOT, "public/game-assets/icons/icon-manifest.json");

export const MASTER_ICON_IDS = [
  "icon.weapon.sword", "icon.weapon.longblade", "icon.weapon.axe",
  "icon.weapon.bow", "icon.weapon.crossbow", "icon.weapon.focus",
  "icon.armor.head", "icon.armor.chest", "icon.armor.wrists",
  "icon.armor.legs", "icon.armor.feet",
  "icon.generic.unknown",
  "icon.skill.burst", "icon.skill.movement", "icon.skill.buff",
  "icon.skill.shield", "icon.skill.projectile", "icon.skill.control",
  "icon.skill.trap", "icon.skill.totem",
  "icon.material.scrap", "icon.material.essence", "icon.material.seal",
  "icon.generic.passive",
];

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateIconData(data) {
  ensure(data?.schemaVersion === 1, "icon manifest schemaVersion must be 1");
  ensure(Array.isArray(data.entries), "icon manifest entries must be an array");
  ensure(data.entries.length <= 24, "icon manifest cannot contain more than 24 master icons");
  ensure(data.entries.length === MASTER_ICON_IDS.length, "icon manifest must freeze exactly 24 master icons");
  const ids = data.entries.map((entry) => entry.id);
  const paths = data.entries.map((entry) => entry.path);
  ensure(new Set(ids).size === ids.length, "icon manifest contains duplicate IDs");
  ensure(new Set(paths).size === paths.length, "icon manifest contains duplicate paths");
  ensure(ids.includes(data.fallback), "icon manifest fallback must reference a master icon");
  ensure(ids.join("\n") === MASTER_ICON_IDS.join("\n"), "icon manifest order does not match the frozen 6x4 sheet");
  for (const entry of data.entries) {
    ensure(typeof entry.label === "string" && entry.label.length > 0, `${entry.id} is missing a label`);
    ensure(typeof entry.path === "string" && entry.path.endsWith(".png"), `${entry.id} must use a PNG path`);
    ensure(typeof entry.tintable === "boolean", `${entry.id} must declare tintable`);
  }
  ensure(data.sheet?.columns === 6 && data.sheet?.rows === 4, "icon sheet must be 6 columns by 4 rows");
  ensure(/^#[0-9a-f]{6}$/i.test(data.sheet?.background ?? ""), "icon sheet needs a removable hex background");
  for (const [contentId, tint] of Object.entries(data.contentTints ?? {})) {
    ensure(/^#[0-9a-f]{6}$/i.test(tint), `${contentId} has an invalid tint`);
  }
  return data;
}

async function contentIconReferences() {
  const [bases, abilities] = await Promise.all([
    readFile(path.join(ROOT, "content-src/items/bases.json"), "utf8").then(JSON.parse),
    readFile(path.join(ROOT, "content-src/abilities/player.json"), "utf8").then(JSON.parse),
  ]);
  return new Set([
    ...bases.bases.map((base) => base.iconFamily),
    ...abilities.abilities.map((ability) => ability.icon),
    "icon.material.scrap", "icon.material.essence", "icon.material.seal",
    "icon.generic.unknown", "icon.generic.passive",
  ]);
}

export async function validateIconManifest(manifestPath = DEFAULT_MANIFEST) {
  const data = validateIconData(JSON.parse(await readFile(manifestPath, "utf8")));
  const directory = path.dirname(manifestPath);
  const entryIds = new Set(data.entries.map((entry) => entry.id));
  for (const required of await contentIconReferences()) {
    ensure(entryIds.has(required), `content icon has no manifest entry: ${required}`);
  }
  for (const entry of data.entries) {
    const metadata = await sharp(path.join(directory, entry.path)).metadata();
    ensure(metadata.format === "png", `${entry.id} is not a PNG`);
    ensure(metadata.width === 64 && metadata.height === 64, `${entry.id} must be 64x64`);
    ensure(metadata.hasAlpha === true, `${entry.id} must include alpha`);
  }
  const sheet = await sharp(path.join(directory, data.sheet.source)).metadata();
  ensure(sheet.width % data.sheet.columns === 0, "source sheet width does not divide into integer cells");
  ensure(sheet.height % data.sheet.rows === 0, "source sheet height does not divide into integer cells");
  ensure(sheet.width / data.sheet.columns === sheet.height / data.sheet.rows, "source sheet cells must be square");
  await sharp(path.join(directory, data.sheet.contactSheet)).metadata();
  await readFile(path.join(directory, data.sheet.prompt), "utf8");
  return data;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  validateIconManifest(process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_MANIFEST)
    .then((data) => console.log(`Validated ${data.entries.length} master icons.`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
