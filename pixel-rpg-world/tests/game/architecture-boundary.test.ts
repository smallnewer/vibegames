import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "game");
const allowed = join(root, "adapters", "babylon");

// 递归收集玩法目录中的 TypeScript 源文件。
function sourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((name) => {
    const file = join(dir, name);
    return statSync(file).isDirectory()
      ? sourceFiles(file)
      : /\.tsx?$/.test(file) ? [file] : [];
  });
}

describe("engine boundary", () => {
  it("keeps Babylon imports inside its adapter", () => {
    const offenders = sourceFiles(root)
      .filter((file) => !file.startsWith(allowed))
      .filter((file) => readFileSync(file, "utf8").includes("@babylonjs/"))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("keeps gameplay domains free of React and browser device APIs", () => {
    const pureDomains = [
      "ability",
      "actor",
      "balance",
      "combat",
      "content",
      "core",
      "dungeon",
      "item",
      "player",
      "progression",
      "save",
      "status",
      "ui",
    ].map((name) => join(root, name));
    const forbidden = /(?:@babylonjs\/|from\s+["']react|\btypeof\s+(?:window|document|navigator)\b|\b(?:window|document|navigator|indexedDB)\s*(?:\.|\[|\())/;
    const offenders = pureDomains
      .flatMap((directory) => sourceFiles(directory))
      .filter((file) => forbidden.test(readFileSync(file, "utf8")))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("keeps dungeon gameplay free of renderer and theme branches", () => {
    const forbidden = /#[0-9a-fA-F]{6}|@babylonjs\/|\.json["']|dungeon\.ice_room/;
    const offenders = [join(root, "core"), join(root, "dungeon")]
      .flatMap((directory) => sourceFiles(directory))
      .filter((file) => forbidden.test(readFileSync(file, "utf8")))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("keeps deterministic gameplay free of Math.random", () => {
    const deterministicDomains = ["balance", "combat", "item", "dungeon", "ability"]
      .map((name) => join(root, name));
    const offenders = deterministicDomains
      .flatMap((directory) => sourceFiles(directory))
      .filter((file) => /Math\.random\s*\(/.test(readFileSync(file, "utf8")))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it("keeps Node content compiler dependencies out of browser sources", () => {
    const forbidden = /node:(?:fs|path)|from\s+["']ajv|dungeon\.schema\.json/;
    const app = join(process.cwd(), "app");
    const offenders = [...sourceFiles(root), ...sourceFiles(app)]
      .filter((file) => forbidden.test(readFileSync(file, "utf8")))
      .map((file) => relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });
});
