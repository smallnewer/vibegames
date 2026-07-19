import { expect, it } from "vitest";
import {
  ART_MATERIAL_KEYS,
  ArtMaterialLibrary,
  DEFAULT_DUNGEON_PALETTE,
} from "../../../game/adapters/babylon/art/ArtMaterialLibrary";
import {
  PIXEL_TEXTURE_SIZE,
  pixelPattern,
} from "../../../game/adapters/babylon/art/PixelTextureFactory";

it("locks the six authored material families and pixel density", () => {
  expect(ART_MATERIAL_KEYS).toEqual([
    "carvedStone",
    "roughBasalt",
    "agedMetal",
    "darkWood",
    "runeCrystal",
    "lava",
  ]);
  expect(PIXEL_TEXTURE_SIZE).toBe(32);
  expect(typeof ArtMaterialLibrary).toBe("function");
  expect(DEFAULT_DUNGEON_PALETTE.hazard.light).toBe("#ffd34d");
});

it("generates deterministic pixel instructions", () => {
  const first = pixelPattern({
    id: "stone",
    seed: 17,
    base: "#30272a",
    dark: "#171316",
    light: "#564247",
    pattern: "brick",
  });
  const second = pixelPattern({
    id: "stone",
    seed: 17,
    base: "#30272a",
    dark: "#171316",
    light: "#564247",
    pattern: "brick",
  });

  expect(first).toEqual(second);
  expect(first.length).toBeGreaterThan(80);
  expect(new Set(first.map((pixel) => pixel.color)).size).toBeGreaterThanOrEqual(3);
});
