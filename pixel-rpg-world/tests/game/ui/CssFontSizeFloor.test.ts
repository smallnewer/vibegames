import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cssFiles = [
  "app/globals.css",
  "app/game-ui/hud.css",
  "app/game-ui/menu/menu.css",
  "app/game-ui/world-route.css",
];

describe("formal game UI font-size floor", () => {
  it.each(cssFiles)("keeps authored pixel fonts in %s at 12px or larger", (file) => {
    const css = readFileSync(file, "utf8");
    const sizes = [
      ...css.matchAll(/font-size:\s*([0-9.]+)px/g),
      ...css.matchAll(/font:\s*([0-9.]+)px(?:\s|\/)/g),
    ].map((match) => Number(match[1]));

    expect(sizes.length).toBeGreaterThan(0);
    expect(sizes.filter((size) => size < 12)).toEqual([]);
  });
});
