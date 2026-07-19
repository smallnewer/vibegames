import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { DEFAULT_MANIFEST, MASTER_ICON_IDS, validateIconData, validateIconManifest } from "../scripts/validate-icons.mjs";

async function manifest() {
  return JSON.parse(await readFile(DEFAULT_MANIFEST, "utf8"));
}

test("freezes one ordered 6x4 sheet with no more than 24 master families", async () => {
  const data = validateIconData(await manifest());
  assert.equal(data.entries.length, 24);
  assert.deepEqual(data.entries.map((entry) => entry.id), MASTER_ICON_IDS);
});

test("rejects duplicate IDs, paths, excess families and a missing fallback", async () => {
  const source = await manifest();
  assert.throws(() => validateIconData({ ...source, entries: [...source.entries, source.entries[0]] }), /more than 24/);
  assert.throws(() => validateIconData({ ...source, entries: source.entries.map((entry, index) => index === 1 ? { ...entry, id: source.entries[0].id } : entry) }), /duplicate IDs/);
  assert.throws(() => validateIconData({ ...source, entries: source.entries.map((entry, index) => index === 1 ? { ...entry, path: source.entries[0].path } : entry) }), /duplicate paths/);
  assert.throws(() => validateIconData({ ...source, fallback: "icon.missing" }), /fallback/);
});

test("validates all real 64x64 alpha masters and content references", async () => {
  const data = await validateIconManifest();
  assert.equal(data.entries.length, 24);
});
